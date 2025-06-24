// --- Three.js 粒子切割效果 ---
let scene, camera, renderer, particleSystem;
const container = document.getElementById('particle-container');

const originalPositions = [];
const particleVelocities = [];

// 鼠标状态，增加速度跟踪
const mouse = {
    position: new THREE.Vector3(),
    previousPosition: new THREE.Vector3(),
    speed: 0
};

// 物理效果参数
const config = {
    particleCount: 20000,
    clusterSize: 15,    // 粒子云团的大小
    baseMouseRadius: 1.5, // 基础“刀口”大小
    baseRepelForce: 0.1, // 基础排斥力
    speedMultiplier: 40.0, // 速度对“刀口”大小的影响乘数
    explosionThreshold: 0.8, // 触发“爆炸”的速度阈值
    returnForce: 0.01,  // 归位力
    damping: 0.95       // 阻尼/摩擦力
};

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 20;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const particlesGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(config.particleCount * 3);
    const colors = new Float32Array(config.particleCount * 3);
    const color = new THREE.Color();

    for (let i = 0; i < config.particleCount; i++) {
        const x = (Math.random() - 0.5) * config.clusterSize;
        const y = (Math.random() - 0.5) * config.clusterSize;
        const z = (Math.random() - 0.5) * config.clusterSize;

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        originalPositions.push(x, y, z);
        particleVelocities.push(0, 0, 0);
        
        const distanceFromCenter = Math.sqrt(x*x + y*y + z*z);
        const colorIntensity = 1.0 - (distanceFromCenter / (config.clusterSize * 0.7));
        
        // ** MODIFIED **: 设置为粉红色调 (HSL中, 0.9左右是粉色)
        color.setHSL(0.9, 0.9, 0.6 * colorIntensity);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMaterial = new THREE.PointsMaterial({
        size: 0.1,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.9,
        sizeAttenuation: true
    });

    particleSystem = new THREE.Points(particlesGeometry, particleMaterial);
    particleSystem.position.x = 10;
    scene.add(particleSystem);

    window.addEventListener('resize', onWindowResize);
    container.addEventListener('mousemove', onMouseMove);

    // 添加触摸事件监听，实现手机端手指跟随粒子效果
    container.addEventListener('touchmove', function(event) {
        if (event.touches && event.touches.length > 0) {
            const touch = event.touches[0];
            const vec = new THREE.Vector3();
            vec.set(
                (touch.clientX / window.innerWidth) * 2 - 1,
                - (touch.clientY / window.innerHeight) * 2 + 1,
                0.5
            );
            vec.unproject(camera);
            vec.sub(camera.position).normalize();
            const distance = -camera.position.z / vec.z;
            mouse.position.copy(camera.position).add(vec.multiplyScalar(distance));
            mouse.position.sub(particleSystem.position);
        }
    }, { passive: false });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseMove(event) {
    const vec = new THREE.Vector3();
    vec.set(
        (event.clientX / window.innerWidth) * 2 - 1,
        - (event.clientY / window.innerHeight) * 2 + 1,
        0.5
    );
    vec.unproject(camera);
    vec.sub(camera.position).normalize();
    const distance = -camera.position.z / vec.z;
    mouse.position.copy(camera.position).add(vec.multiplyScalar(distance));
    mouse.position.sub(particleSystem.position);
}

function animate() {
    requestAnimationFrame(animate);
    
    // ** MODIFIED **: 计算鼠标速度
    const speed = mouse.position.distanceTo(mouse.previousPosition);
    // 使用平滑的指数移动平均来稳定速度值
    mouse.speed = mouse.speed * 0.8 + speed * 0.2;
    mouse.previousPosition.copy(mouse.position);

    // ** MODIFIED **: 根据速度动态计算排斥半径和力
    let dynamicMouseRadius = config.baseMouseRadius + mouse.speed * config.speedMultiplier;
    let dynamicRepelForce = config.baseRepelForce + mouse.speed * 0.2;

    // 如果达到爆炸阈值，则半径和力剧增
    if (mouse.speed > config.explosionThreshold) {
        dynamicMouseRadius = config.clusterSize * 2; // 影响整个云团
        dynamicRepelForce = 1.0; // 极大的排斥力
    }

    const positions = particleSystem.geometry.attributes.position.array;
    
    for (let i = 0; i < config.particleCount; i++) {
        const i3 = i * 3;
        
        const currentPos = new THREE.Vector3(positions[i3], positions[i3 + 1], positions[i3 + 2]);
        const originalPos = new THREE.Vector3(originalPositions[i3], originalPositions[i3+1], originalPositions[i3+2]);
        let velocity = new THREE.Vector3(particleVelocities[i3], particleVelocities[i3+1], particleVelocities[i3+2]);

        const returnVec = new THREE.Vector3().subVectors(originalPos, currentPos).multiplyScalar(config.returnForce);
        velocity.add(returnVec);

        // ** MODIFIED **: 使用动态计算的半径和力
        const distToMouse = currentPos.distanceTo(mouse.position);
        if (distToMouse < dynamicMouseRadius) {
            const repelVec = new THREE.Vector3().subVectors(currentPos, mouse.position).normalize();
            const repelStrength = (dynamicMouseRadius - distToMouse) / dynamicMouseRadius;
            repelVec.multiplyScalar(repelStrength * dynamicRepelForce);
            velocity.add(repelVec);
        }
        
        velocity.multiplyScalar(config.damping);

        particleVelocities[i3] = velocity.x;
        particleVelocities[i3+1] = velocity.y;
        particleVelocities[i3+2] = velocity.z;

        positions[i3] += velocity.x;
        positions[i3+1] += velocity.y;
        positions[i3+2] += velocity.z;
    }

    particleSystem.geometry.attributes.position.needsUpdate = true;
    
    particleSystem.rotation.y += 0.0005;
    particleSystem.rotation.x += 0.0002;

    renderer.render(scene, camera);
}

init();
animate();
