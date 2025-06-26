// Wait for the DOM to be fully loaded before running scripts
document.addEventListener('DOMContentLoaded', () => {

    /**
     * ------------------------------------------------------------------------
     * PART 1: Three.js Particle Effect for the Hero Section (No Change)
     * ------------------------------------------------------------------------
     */
    (() => {
        if (typeof THREE === 'undefined') {
            return;
        }
        const container = document.getElementById('particle-container');
        if (!container) return;

        let scene, camera, renderer, particleSystem;
        const originalPositions = [];
        const particleVelocities = [];
        const mouse = { position: new THREE.Vector3(), previousPosition: new THREE.Vector3(), speed: 0 };
        const config = { particleCount: 20000, clusterSize: 15, baseMouseRadius: 1.5, baseRepelForce: 0.1, speedMultiplier: 40.0, explosionThreshold: 0.8, returnForce: 0.01, damping: 0.95 };

        function init() {
            scene = new THREE.Scene();
            const rect = container.getBoundingClientRect();
            camera = new THREE.PerspectiveCamera(75, rect.width / rect.height, 0.1, 1000);
            camera.position.z = 20;
            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setSize(rect.width, rect.height);
            renderer.setClearColor(0x000000, 0);
            container.innerHTML = ''; 
            container.appendChild(renderer.domElement);
            const particlesGeometry = new THREE.BufferGeometry();
            const positions = new Float32Array(config.particleCount * 3);
            const colors = new Float32Array(config.particleCount * 3);
            const color = new THREE.Color();
            const sphereRadius = config.clusterSize / 2;
            for (let i = 0; i < config.particleCount; i++) {
                const r = sphereRadius * Math.cbrt(Math.random());
                const theta = Math.random() * 2 * Math.PI;
                const phi = Math.acos((2 * Math.random()) - 1);
                const x = r * Math.sin(phi) * Math.cos(theta);
                const y = r * Math.sin(phi) * Math.sin(theta);
                const z = r * Math.cos(phi);
                positions[i * 3] = x;
                positions[i * 3 + 1] = y;
                positions[i * 3 + 2] = z;
                originalPositions.push(x, y, z);
                particleVelocities.push(0, 0, 0);
                const distanceFromCenter = Math.sqrt(x*x + y*y + z*z);
                const colorIntensity = 1.0 - (distanceFromCenter / sphereRadius);
                color.setHSL(0.85 + Math.random() * 0.1, 0.9, 0.6 * colorIntensity); 
                colors[i * 3] = color.r;
                colors[i * 3 + 1] = color.g;
                colors[i * 3 + 2] = color.b;
            }
            particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            const particleMaterial = new THREE.PointsMaterial({ size: 0.1, vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.9, sizeAttenuation: true });
            particleSystem = new THREE.Points(particlesGeometry, particleMaterial);
            particleSystem.position.x = 9;
            if (window.innerWidth <= 768) {
                particleSystem.position.x = 0;
                particleSystem.position.y = -6;
            } else {
                particleSystem.position.x = 9;
                particleSystem.position.y = 0;
            }
            scene.add(particleSystem);
            window.addEventListener('resize', onWindowResize);
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('touchmove', onTouchMove, { passive: false });
        }
        function onWindowResize() {
            const rect = container.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                camera.aspect = rect.width / rect.height;
                camera.updateProjectionMatrix();
                renderer.setSize(rect.width, rect.height);
            }
            if (window.innerWidth <= 768) {
                particleSystem.position.x = 0;
                particleSystem.position.y = -6;
            } else {
                particleSystem.position.x = 9;
                particleSystem.position.y = 0;
            }
        }
        function updateMousePosition(clientX, clientY) {
            const vec = new THREE.Vector3();
            vec.set((clientX / window.innerWidth) * 2 - 1, - (clientY / window.innerHeight) * 2 + 1, 0.5);
            vec.unproject(camera);
            vec.sub(camera.position).normalize();
            const distance = -camera.position.z / vec.z;
            mouse.position.copy(camera.position).add(vec.multiplyScalar(distance));
            mouse.position.sub(particleSystem.position);
        }
        function onMouseMove(event) { updateMousePosition(event.clientX, event.clientY); }
        function onTouchMove(event) { if (event.touches && event.touches.length > 0) { updateMousePosition(event.touches[0].clientX, event.touches[0].clientY); } }
        function animate() {
            requestAnimationFrame(animate);
            const speed = mouse.position.distanceTo(mouse.previousPosition);
            mouse.speed = mouse.speed * 0.8 + speed * 0.2;
            mouse.previousPosition.copy(mouse.position);
            let dynamicMouseRadius = config.baseMouseRadius + mouse.speed * config.speedMultiplier;
            let dynamicRepelForce = config.baseRepelForce + mouse.speed * 0.2;
            if (mouse.speed > config.explosionThreshold) {
                dynamicMouseRadius = config.clusterSize * 2;
                dynamicRepelForce = 1.0;
            }
            const positions = particleSystem.geometry.attributes.position.array;
            for (let i = 0; i < config.particleCount; i++) {
                const i3 = i * 3;
                const currentPos = new THREE.Vector3(positions[i3], positions[i3 + 1], positions[i3 + 2]);
                const originalPos = new THREE.Vector3(originalPositions[i3], originalPositions[i3+1], originalPositions[i3+2]);
                let velocity = new THREE.Vector3(particleVelocities[i3], particleVelocities[i3+1], particleVelocities[i3+2]);
                const returnVec = new THREE.Vector3().subVectors(originalPos, currentPos).multiplyScalar(config.returnForce);
                velocity.add(returnVec);
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
    })();

    /**
     * ------------------------------------------------------------------------
     * PART 2: FAQ Chat Functionality [UPDATED]
     * ------------------------------------------------------------------------
     */
    (() => {
        // Select all the chat "turns", each containing a question and an answer.
        const chatTurns = document.querySelectorAll('.chat-turn');
        if (!chatTurns.length) return;

        chatTurns.forEach(turn => {
            const questionBubble = turn.querySelector('.chat-bubble.question');
            
            if (questionBubble) {
                // Add a click listener to the question bubble.
                questionBubble.addEventListener('click', () => {
                    // When clicked, toggle the 'active' class on the parent .chat-turn container.
                    // The CSS will handle showing/hiding the answer bubble based on this class.
                    turn.classList.toggle('active');
                });
            }
        });
    })();
    
    
    /**
     * ------------------------------------------------------------------------
     * PART 3: Canvas 动态网格背景 (No Change)
     * ------------------------------------------------------------------------
     */
    (() => {
        const canvas = document.getElementById('interactive-grid-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        let width, height, gridSize, mouseX, mouseY;
        let particles = [];
        
        const config = {
            gridSize: 60,
            particleSize: 7,
            mouseEffectRadius: 180,
            trailFadeAlpha: 0.05,
            lineColor: 'rgba(255, 255, 255, 0.02)',
            shapeColors: ['#FFB7C5', '#C3AED6', '#a7d8de'],
            maxBrightness: 0.05,
            changeThreshold: 0.99
        };

        function setup() {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
            gridSize = config.gridSize;
            
            particles = [];
            for (let x = 0; x < width + gridSize; x += gridSize) {
                for (let y = 0; y < height + gridSize; y += gridSize) {
                    particles.push({
                        x: x,
                        y: y,
                        type: Math.random() > 0.5 ? 'star' : 'moon',
                        color: config.shapeColors[Math.floor(Math.random() * config.shapeColors.length)],
                        size: config.particleSize * (0.8 + Math.random() * 0.4)
                    });
                }
            }
        }

        function drawStar(x, y, size, color, opacity) {
            ctx.save();
            ctx.fillStyle = color;
            ctx.globalAlpha = opacity;
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                ctx.lineTo(x + size * Math.cos((18 + i * 72) * Math.PI / 180), y + size * Math.sin((18 + i * 72) * Math.PI / 180));
                ctx.lineTo(x + (size / 2) * Math.cos((54 + i * 72) * Math.PI / 180), y + (size / 2) * Math.sin((54 + i * 72) * Math.PI / 180));
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        function drawMoon(x, y, size, color, opacity) {
            ctx.save();
            ctx.fillStyle = color;
            ctx.globalAlpha = opacity;
            ctx.beginPath();
            ctx.arc(x, y, size, 0.5 * Math.PI, 1.5 * Math.PI, false);
            ctx.arc(x + size * 0.5, y, size * 0.7, 1.5 * Math.PI, 0.5 * Math.PI, true);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        function animate() {
            ctx.fillStyle = `rgba(0, 0, 0, ${config.trailFadeAlpha})`;
            ctx.fillRect(0, 0, width, height);
            
            particles.forEach(p => {
                let opacity = 0;
                if (mouseX !== undefined) {
                    const distanceFromMouse = Math.sqrt(Math.pow(p.x - mouseX, 2) + Math.pow(p.y - mouseY, 2));
                    
                    if (distanceFromMouse < config.mouseEffectRadius) {
                        const distanceRatio = distanceFromMouse / config.mouseEffectRadius;
                        opacity = config.maxBrightness * (1 - Math.pow(distanceRatio, 2));
                    }
                }
                
                if (opacity > 0.01) {
                    if (Math.random() > config.changeThreshold) {
                       p.type = p.type === 'star' ? 'moon' : 'star';
                    }

                    if (p.type === 'star') {
                        drawStar(p.x, p.y, p.size, p.color, opacity);
                    } else {
                        drawMoon(p.x, p.y, p.size, p.color, opacity);
                    }
                }
            });

            requestAnimationFrame(animate);
        }

        window.addEventListener('resize', setup);
        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });
         document.addEventListener('mouseleave', () => {
            mouseX = undefined;
            mouseY = undefined;
        });

        setup();
        animate();
    })();

    /**
     * ------------------------------------------------------------------------
     * PART 4: Companion Section Sprite Animation (No Change)
     * ------------------------------------------------------------------------
     */
    (() => {
        const companionSection = document.getElementById('companion');
        if (!companionSection) return;

        const canvas = document.getElementById('companion-canvas');
        const ctx = canvas.getContext('2d');
        const contentContainer = companionSection.querySelector('.companion-content');
        const title = contentContainer.querySelector('.section-heading');
        const subtitle = contentContainer.querySelector('.section-subheading');
        const ctaButton = contentContainer.querySelector('.button-cta');

        let width, height, centerX, centerY;
        
        function resizeCanvas() {
            width = canvas.width = companionSection.offsetWidth;
            height = canvas.height = companionSection.offsetHeight;
            centerX = width / 2;
            centerY = height / 2;
            initSprites(); 
        }

        window.addEventListener('resize', resizeCanvas);

        const mouse = { x: 0, y: 0 };

        window.addEventListener('mousemove', (event) => {
            const rect = companionSection.getBoundingClientRect();
            mouse.x = event.clientX - rect.left;
            mouse.y = event.clientY - rect.top;

            const offsetX = (mouse.x - centerX) / centerX;
            const offsetY = (mouse.y - centerY) / centerY;
            
            const titleStrength = 15;
            const subtitleStrength = 10;
            const buttonStrength = 5;

            title.style.transform = `translate(${offsetX * titleStrength}px, ${offsetY * titleStrength}px)`;
            subtitle.style.transform = `translate(${offsetX * subtitleStrength}px, ${offsetY * subtitleStrength}px)`;
            
            const baseTransform = `translate(${offsetX * buttonStrength}px, ${offsetY * buttonStrength}px)`;
            ctaButton.style.transform = baseTransform;
            
            ctaButton.onmouseenter = () => ctaButton.style.transform = `${baseTransform} translateY(-2px)`;
            ctaButton.onmouseleave = () => ctaButton.style.transform = baseTransform;
        });

        class Sprite {
            constructor(x, y, radius, color) {
                this.x = x;
                this.y = y;
                this.baseX = x;
                this.baseY = y;
                this.radius = radius;
                this.color = color;
                this.angle = Math.atan2(centerY - this.y, centerX - this.x);
                this.targetAngle = this.angle;
                this.glow = 15;
            }

            update() {
                const dxMouse = mouse.x - this.x;
                const dyMouse = mouse.y - this.y;
                this.targetAngle = Math.atan2(dyMouse, dxMouse);

                let angleDifference = this.targetAngle - this.angle;
                while (angleDifference < -Math.PI) angleDifference += 2 * Math.PI;
                while (angleDifference > Math.PI) angleDifference -= 2 * Math.PI;
                this.angle += angleDifference * 0.08;

                const distMouseToCenter = Math.hypot(mouse.x - centerX, mouse.y - centerY);
                const attractionForce = 1 - Math.min(distMouseToCenter / (width/3.5), 1); 
                
                const dxBase = this.baseX - this.x;
                const dyBase = this.baseY - this.y;
                const dxCenter = centerX - this.x;
                const dyCenter = centerY - this.y;

                this.x += dxBase * 0.05 + dxCenter * 0.02 * attractionForce;
                this.y += dyBase * 0.05 + dyCenter * 0.02 * attractionForce;

                const distToMouse = Math.hypot(this.x - mouse.x, this.y - mouse.y);
                if (distToMouse < 80) {
                    this.glow = 45;
                } else {
                    this.glow -= (this.glow - 15) * 0.05; 
                }
            }

            draw() {
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.angle);
                ctx.shadowColor = this.color;
                ctx.shadowBlur = this.glow;
                ctx.beginPath();
                ctx.moveTo(this.radius * 0.8, 0);
                ctx.lineTo(-this.radius * 0.7, -this.radius * 0.6);
                ctx.lineTo(-this.radius * 0.7, this.radius * 0.6);
                ctx.closePath();
                ctx.fillStyle = this.color;
                ctx.fill();
                ctx.beginPath();
                ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.fill();
                ctx.beginPath();
                ctx.arc(0, 0, this.radius * 0.6, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.fill();
                ctx.restore();
            }
        }

        let sprites = [];
        // [MODIFIED] Colors changed to a warm palette
        const colors = ['#FFC300', '#FF5733', '#C70039', '#F9D423', '#F8A51B', '#E87A00', '#FF8D1A'];

        function initSprites() {
            sprites = [];
            const numberOfSprites = 15;
            const circleRadius = Math.min(width, height) * 0.30;

            for (let i = 0; i < numberOfSprites; i++) {
                const angle = (i / numberOfSprites) * Math.PI * 2;
                const x = centerX + Math.cos(angle) * circleRadius;
                const y = centerY + Math.sin(angle) * circleRadius;
                const spriteRadius = 8 + Math.random() * 6;
                const color = colors[i % colors.length];
                sprites.push(new Sprite(x, y, spriteRadius, color));
            }
        }

        function animate() {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(0, 0, width, height);

            sprites.forEach(sprite => {
                sprite.update();
                sprite.draw();
            });

            requestAnimationFrame(animate);
        }

        resizeCanvas();
        animate();
    })();
});