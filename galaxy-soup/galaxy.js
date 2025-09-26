// Galactic Disk Simulation - Spinning 5-Armed Galaxy
class Vector2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    
    add(v) {
        return new Vector2(this.x + v.x, this.y + v.y);
    }
    
    subtract(v) {
        return new Vector2(this.x - v.x, this.y - v.y);
    }
    
    multiply(scalar) {
        return new Vector2(this.x * scalar, this.y * scalar);
    }
    
    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    
    normalize() {
        const mag = this.magnitude();
        if (mag === 0) return new Vector2(0, 0);
        return new Vector2(this.x / mag, this.y / mag);
    }
    
    distance(v) {
        return this.subtract(v).magnitude();
    }
}

class Ball {
    constructor(x, y, z = 0) {
        this.position = new Vector2(x, y);
        this.velocity = new Vector2(0, 0);
        this.acceleration = new Vector2(0, 0);
        this.z = z;
        this.zVelocity = 0;
        this.mass = 1;
        this.radius = 1.2; // Even smaller balls
        this.color = this.generateColor();
        this.trail = [];
        this.maxTrailLength = 8; // Shorter trails for better performance
        this.armId = -1; // Which arm this ball came from
    }
    
    generateColor() {
        // Galaxy colors - mix of blues, purples, and whites
        const hue = 200 + Math.random() * 80; // Blue to purple range
        const saturation = 60 + Math.random() * 40;
        const lightness = 60 + Math.random() * 30;
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }
    
    applyForce(force) {
        this.acceleration = this.acceleration.add(force.multiply(1 / this.mass));
    }
    
    update(deltaTime = 1) {
        // Store current position for trail
        this.trail.push({ x: this.position.x, y: this.position.y, z: this.z });
        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }
        
        // Update physics
        this.velocity = this.velocity.add(this.acceleration.multiply(deltaTime));
        this.position = this.position.add(this.velocity.multiply(deltaTime));
        this.z += this.zVelocity * deltaTime;
        
        // Light damping
        this.velocity = this.velocity.multiply(0.999);
        this.zVelocity *= 0.999;
        
        // Reset acceleration
        this.acceleration = new Vector2(0, 0);
    }
    
    render(ctx, centerX, centerY, viewTilt = 0) {
        // Edge-on view perspective rendering with tilt
        const tiltRadians = viewTilt * Math.PI / 180;
        
        // Apply tilt transformation to position
        const tiltedY = this.position.y * Math.cos(tiltRadians) - this.z * Math.sin(tiltRadians);
        const tiltedZ = this.position.y * Math.sin(tiltRadians) + this.z * Math.cos(tiltRadians);
        
        const perspective = 600;
        const depthScale = perspective / (perspective + tiltedY);
        
        const screenX = centerX + this.position.x * depthScale;
        const screenZ = centerY - tiltedZ * depthScale;
        const ballSize = this.radius * depthScale;
        
        // Draw trail with tilt
        ctx.globalAlpha = Math.max(0.2, depthScale * 0.4);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = Math.max(0.5, depthScale);
        ctx.beginPath();
        for (let i = 1; i < this.trail.length; i++) {
            const prev = this.trail[i - 1];
            const curr = this.trail[i];
            
            // Apply tilt to trail points
            const prevTiltedY = prev.y * Math.cos(tiltRadians) - prev.z * Math.sin(tiltRadians);
            const prevTiltedZ = prev.y * Math.sin(tiltRadians) + prev.z * Math.cos(tiltRadians);
            const currTiltedY = curr.y * Math.cos(tiltRadians) - curr.z * Math.sin(tiltRadians);
            const currTiltedZ = curr.y * Math.sin(tiltRadians) + curr.z * Math.cos(tiltRadians);
            
            const prevDepthScale = perspective / (perspective + prevTiltedY);
            const currDepthScale = perspective / (perspective + currTiltedY);
            
            const prevScreenX = centerX + prev.x * prevDepthScale;
            const prevScreenZ = centerY - prevTiltedZ * prevDepthScale;
            const currScreenX = centerX + curr.x * currDepthScale;
            const currScreenZ = centerY - currTiltedZ * currDepthScale;
            
            if (i === 1) {
                ctx.moveTo(prevScreenX, prevScreenZ);
            }
            ctx.lineTo(currScreenX, currScreenZ);
        }
        ctx.stroke();
        
        // Draw ball
        ctx.globalAlpha = Math.max(0.4, depthScale);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(screenX, screenZ, ballSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Glow effect
        ctx.globalAlpha = Math.max(0.2, depthScale * 0.4);
        ctx.beginPath();
        ctx.arc(screenX, screenZ, ballSize * 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
    
    // Calculate weak attraction to another ball
    attractTo(other, ballGravity) {
        const distance = this.position.distance(other.position);
        const minDistance = 8;
        
        if (distance < minDistance) return new Vector2(0, 0);
        
        // Dynamic gravitational force between ejected particles
        const G = ballGravity; // Controlled by slider
        const forceMagnitude = G * this.mass * other.mass / (distance * distance);
        
        const direction = other.position.subtract(this.position).normalize();
        return direction.multiply(forceMagnitude);
    }
}

class GalacticDisk {
    constructor(x, y, numArms = 2, emissionPointsPerArm = 30, armWidthMultiplier = 1.0, bulgeRadius = 60, bulgeHeight = 15) {
        this.position = new Vector2(x, y);
        this.rotation = 0;
        this.rotationSpeed = 0.01; // Slow clockwise rotation
        this.isActive = false;
        this.centerRadius = 15;
        
        // Dynamic arms configuration
        this.numArms = 2; // Fixed to 2 arms
        this.emissionPointsPerArm = emissionPointsPerArm;
        this.armWidthMultiplier = armWidthMultiplier;
        this.bulgeRadius = bulgeRadius;
        this.bulgeHeight = bulgeHeight;
        this.arms = [];
        this.emissionPoints = [];
        
        this.generateArms();
        
        this.frameCount = 0;
        this.pulsePhase = 0;
    }
    
    generateArms() {
        this.arms = [];
        this.emissionPoints = [];
        
        const armAngleStep = (Math.PI * 2) / this.numArms;
        
        // Generate arms for visual display (wider arms)
        for (let armIndex = 0; armIndex < this.numArms; armIndex++) {
            const baseAngle = armIndex * armAngleStep;
            const arm = {
                baseAngle: baseAngle,
                segments: [],
                emissionPoints: []
            };
            
            // Create curved arm segments (galaxy spiral shape) - wider arms
            const numSegments = 20;
            const maxRadius = 120;
            
            for (let i = 0; i < numSegments; i++) {
                const t = i / (numSegments - 1); // 0 to 1
                const radius = this.centerRadius + t * maxRadius;
                
                // Spiral curve - arms curve backward from rotation direction
                const spiralOffset = -t * 1.2; // Negative for trailing arms
                const segmentAngle = baseAngle + spiralOffset;
                
                const segment = {
                    x: Math.cos(segmentAngle) * radius,
                    y: Math.sin(segmentAngle) * radius,
                    radius: (12 - t * 8) * this.armWidthMultiplier, // Much wider arms possible
                    angle: segmentAngle,
                    distanceFromCenter: radius
                };
                
                arm.segments.push(segment);
            }
            
            this.arms.push(arm);
        }
        
        // Generate bulge emission points (particles only emit from bulge, not arms)
        const totalBulgePoints = this.emissionPointsPerArm * this.numArms; // Same total count as before
        const bulgeRadialLayers = 3; // Create layers within the bulge
        
        for (let layer = 0; layer < bulgeRadialLayers; layer++) {
            const layerRadius = (layer + 1) * (this.bulgeRadius / bulgeRadialLayers);
            const pointsInLayer = Math.ceil(totalBulgePoints / bulgeRadialLayers);
            
            for (let i = 0; i < pointsInLayer; i++) {
                const angle = (i / pointsInLayer) * Math.PI * 2;
                const radiusVariation = layerRadius + (Math.random() - 0.5) * layerRadius * 0.3;
                
                for (let side = -1; side <= 1; side += 2) { // Both sides of disk
                    const emissionPoint = {
                        armIndex: 0, // All from bulge (not specific to an arm)
                        segmentIndex: layer,
                        x: Math.cos(angle) * radiusVariation,
                        y: Math.sin(angle) * radiusVariation,
                        z: (Math.random() - 0.5) * this.bulgeHeight * 0.5, // Start within bulge height
                        side: side, // +1 for above disk, -1 for below
                        isActive: false,
                        activationTime: Math.random() * 40 + 20, // Faster activation for bulge
                        lastEmission: 0,
                        bulgePoint: true // Mark as bulge emission point
                    };
                    
                    this.emissionPoints.push(emissionPoint);
                }
            }
        }
    }
    
    activate() {
        this.isActive = true;
        this.frameCount = 0;
        this.pulsePhase = 0;
    }
    
    update() {
        if (this.isActive) {
            this.rotation += this.rotationSpeed;
            this.frameCount++;
            this.pulsePhase += 0.05;
            
            // Check for emission point activations
            for (let point of this.emissionPoints) {
                if (!point.isActive && this.frameCount >= point.activationTime) {
                    point.isActive = true;
                }
            }
        }
    }
    
    // Emit balls from random active points in bulge
    emitBalls(baseVelocity, centripetalForce, emissionRate, decayRate, simulationFrameCount = 0) {
        if (!this.isActive) return [];
        
        const newBalls = [];
        
        for (let point of this.emissionPoints) {
            if (!point.isActive || !point.bulgePoint) continue; // Only emit from bulge points
            
            // Dynamic emission timing
            const fullEmissionTime = 2400; // Full emission for 2 minutes at 20fps (120 seconds)
            const decayEndTime = fullEmissionTime + decayRate; // Dynamic decay period
            const simulationEndTime = decayEndTime + 100; // Continue 5 more seconds after emission stops (at 20fps)
            let timeFactor;
            
            if (simulationFrameCount < fullEmissionTime) {
                // Full emission rate for first portion
                timeFactor = 1.0;
            } else if (simulationFrameCount < decayEndTime) {
                // Logarithmic decay period
                const decayTime = simulationFrameCount - fullEmissionTime;
                const maxDecayTime = decayEndTime - fullEmissionTime;
                const decayProgress = decayTime / maxDecayTime; // 0 to 1
                timeFactor = Math.max(0.05, Math.log(1 + (1 - decayProgress) * (Math.E - 1)) / Math.E); // Logarithmic from 1.0 to 0.05
            } else if (simulationFrameCount < simulationEndTime) {
                // No emission for final 5 seconds, just physics
                timeFactor = 0.0;
            } else {
                // Stop simulation completely
                this.isRunning = false;
                return [];
            }
            
            const emissionChance = emissionRate * timeFactor; // Dynamic emission rate
            const minEmissionDelay = timeFactor > 0 ? Math.floor(15 / timeFactor) : Infinity;
            
            // Random emission chance with decay
            if (Math.random() < emissionChance && this.frameCount - point.lastEmission > minEmissionDelay) {
                point.lastEmission = this.frameCount;
                
                // Calculate rotated emission position
                const rotatedX = point.x * Math.cos(this.rotation) - point.y * Math.sin(this.rotation);
                const rotatedY = point.x * Math.sin(this.rotation) + point.y * Math.cos(this.rotation);
                
                // Dynamic ejection velocity
                const escapeSpeed = baseVelocity + Math.random() * 3.0; // Base velocity from slider + random variation
                
                // Calculate centripetal effect based on distance from center and rotation speed
                const distanceFromCenter = Math.sqrt(rotatedX * rotatedX + rotatedY * rotatedY);
                const rotationalSpeed = this.rotationSpeed * distanceFromCenter; // Tangential velocity
                
                // Direction away from disk center (radial outward)
                const radialAngle = Math.atan2(rotatedY, rotatedX);
                const centripitalDeflection = rotationalSpeed * centripetalForce; // Dynamic centripetal force from slider
                
                // Base radial velocity with centripetal deflection
                const baseVx = Math.cos(radialAngle) * centripitalDeflection;
                const baseVy = Math.sin(radialAngle) * centripitalDeflection;
                
                // Emit just a pair of balls in randomized directions
                for (let i = 0; i < 2; i++) {
                    const ball = new Ball(rotatedX, rotatedY, point.z);
                    ball.armId = point.armIndex;
                    
                    // Randomized direction in 3D space
                    const randomAngle = Math.random() * Math.PI * 2; // Random horizontal angle
                    const randomElevation = (Math.random() - 0.5) * Math.PI; // Random vertical angle (-π/2 to π/2)
                    
                    // Convert spherical to cartesian coordinates
                    const randomVx = escapeSpeed * Math.cos(randomElevation) * Math.cos(randomAngle);
                    const randomVy = escapeSpeed * Math.cos(randomElevation) * Math.sin(randomAngle);
                    const randomVz = escapeSpeed * Math.sin(randomElevation);
                    
                    // Combine random direction with centripetal effect
                    ball.velocity = new Vector2(baseVx + randomVx * 0.5, baseVy + randomVy * 0.5);
                    ball.zVelocity = randomVz;
                    
                    // Color based on direction - use the elevation angle for hue variation
                    const elevationHue = ((randomElevation + Math.PI/2) / Math.PI) * 60 + 200; // Blue to cyan range
                    const brightness = 60 + Math.abs(randomVz) * 20; // Brighter for faster Z movement
                    ball.color = `hsl(${elevationHue}, 70%, ${Math.min(brightness, 80)}%)`; 
                    
                    newBalls.push(ball);
                }
            }
        }
        
        return newBalls;
    }
    
    render(ctx, centerX, centerY, viewTilt = 0) {
        // Draw the spinning galactic disk edge-on with tilt
        ctx.save();
        ctx.translate(centerX, centerY);
        
        const tiltRadians = viewTilt * Math.PI / 180;
        
        // Draw central core as thin ellipse (edge-on view, affected by tilt)
        const pulseScale = 1 + Math.sin(this.pulsePhase) * 0.15;
        const coreWidth = this.centerRadius * pulseScale;
        const coreHeight = 4 * Math.abs(Math.cos(tiltRadians)); // Height changes with tilt
        
        // Core glow
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = '#ffaa44';
        ctx.beginPath();
        ctx.ellipse(0, 0, coreWidth * 1.5, coreHeight * 2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Core
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = '#ffcc66';
        ctx.beginPath();
        ctx.ellipse(0, 0, coreWidth, coreHeight, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw arms as thin lines (edge-on view)
        for (let arm of this.arms) {
            ctx.strokeStyle = '#4466aa';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.7;
            
            ctx.beginPath();
            for (let i = 0; i < arm.segments.length; i++) {
                const segment = arm.segments[i];
                // Apply rotation (only X coordinate visible in edge-on view)
                const rotatedX = segment.x * Math.cos(this.rotation) - segment.y * Math.sin(this.rotation);
                
                if (i === 0) {
                    ctx.moveTo(rotatedX, -2);
                    ctx.lineTo(rotatedX, 2);
                } else {
                    ctx.moveTo(rotatedX, -2);
                    ctx.lineTo(rotatedX, 2);
                }
            }
            ctx.stroke();
            
            // Draw arm thickness as small vertical lines - thicker near center
            ctx.globalAlpha = 0.4;
            for (let segment of arm.segments) {
                const rotatedX = segment.x * Math.cos(this.rotation) - segment.y * Math.sin(this.rotation);
                
                // Calculate thickness factor based on distance from center
                const centerDistance = segment.distanceFromCenter;
                const maxDistance = 120; // Same as maxRadius in arm generation
                const distanceFactor = 1.0 - (centerDistance / maxDistance); // 1.0 at center, 0.0 at edge
                const zThickness = (1.0 + distanceFactor * 3.0) * Math.abs(Math.cos(tiltRadians)); // Apply tilt to thickness
                
                ctx.strokeStyle = '#3355aa';
                ctx.lineWidth = Math.max(1, segment.radius * 0.3);
                ctx.beginPath();
                ctx.moveTo(rotatedX, -segment.radius * 0.2 * zThickness);
                ctx.lineTo(rotatedX, segment.radius * 0.2 * zThickness);
                ctx.stroke();
            }
        }
        
        // Draw galactic bulge (visible bulge structure)
        const bulgeWidth = this.bulgeRadius * 2;
        const bulgeHeightVisible = this.bulgeHeight * Math.abs(Math.cos(tiltRadians)); // Height affected by tilt
        
        // Bulge outer glow
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#ffaa44';
        ctx.beginPath();
        ctx.ellipse(0, 0, bulgeWidth * 1.2, bulgeHeightVisible * 1.5, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Main bulge
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = '#ffcc66';
        ctx.beginPath();
        ctx.ellipse(0, 0, bulgeWidth, bulgeHeightVisible, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner bulge core
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = '#ffdd88';
        ctx.beginPath();
        ctx.ellipse(0, 0, bulgeWidth * 0.6, bulgeHeightVisible * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw active emission points as small dots in the bulge
        if (this.isActive) {
            ctx.globalAlpha = 0.8;
            for (let point of this.emissionPoints) {
                if (point.isActive && point.bulgePoint) {
                    const rotatedX = point.x * Math.cos(this.rotation) - point.y * Math.sin(this.rotation);
                    const rotatedY = point.x * Math.sin(this.rotation) + point.y * Math.cos(this.rotation);
                    const tiltedY = rotatedY * Math.cos(tiltRadians) - point.z * Math.sin(tiltRadians);
                    
                    ctx.fillStyle = point.side > 0 ? '#ff8888' : '#88ff88';
                    ctx.beginPath();
                    ctx.arc(rotatedX, tiltedY, 1.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        
        ctx.restore();
        ctx.globalAlpha = 1.0;
    }
    
    // Calculate attraction force from arm to ball (weak)
    attractBall(ball, diskGravity) {
        let totalForce = new Vector2(0, 0);
        
        for (let arm of this.arms) {
            for (let segment of arm.segments) {
                // Calculate rotated segment position
                const rotatedX = segment.x * Math.cos(this.rotation) - segment.y * Math.sin(this.rotation);
                const rotatedY = segment.x * Math.sin(this.rotation) + segment.y * Math.cos(this.rotation);
                
                const segmentPos = new Vector2(rotatedX, rotatedY);
                const distance = ball.position.distance(segmentPos);
                
                if (distance < segment.radius * 3 && distance > 5) {
                    // Dynamic attraction to arm
                    const forceMagnitude = diskGravity / (distance * distance);
                    const direction = segmentPos.subtract(ball.position).normalize();
                    totalForce = totalForce.add(direction.multiply(forceMagnitude));
                }
            }
        }
        
        return totalForce;
    }
}

class GalaxySimulation {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.centerX = canvas.width / 2;
        this.centerY = canvas.height / 2;
        
        // Physics parameters (will be controlled by sliders)
        this.baseVelocity = 6.0;
        this.centripetalForce = 6.0;
        this.diskGravity = 18.0;
        this.ballGravity = 7.0;
        this.numArms = 2; // Fixed to 2 arms
        this.emissionPointsPerArm = 30;
        this.initialEmissionRate = 0.045;
        this.emissionDecayRate = 1200;
        this.maxBalls = 2000; // Higher limit for more complex interactions
        this.viewTilt = 0; // Viewing angle tilt in degrees
        this.armWidthMultiplier = 1.0; // Arm width scaling factor
        this.bulgeRadius = 60; // Radius of galactic bulge
        this.bulgeHeight = 15; // Height of galactic bulge above/below disk
        
        this.galaxy = new GalacticDisk(0, 0, this.numArms, this.emissionPointsPerArm, this.armWidthMultiplier, this.bulgeRadius, this.bulgeHeight);
        this.balls = [];
        this.isRunning = false;
        this.isPaused = false;
        this.frameCount = 0;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        const startBtn = document.getElementById('startBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        const resetBtn = document.getElementById('resetBtn');
        
        startBtn.addEventListener('click', () => this.start());
        pauseBtn.addEventListener('click', () => this.togglePause());
        resetBtn.addEventListener('click', () => this.reset());
        
        // Physics control sliders
        const velocitySlider = document.getElementById('velocitySlider');
        const centripetalSlider = document.getElementById('centripetalSlider');
        const diskGravitySlider = document.getElementById('diskGravitySlider');
        const ballGravitySlider = document.getElementById('ballGravitySlider');
        const viewTiltSlider = document.getElementById('viewTiltSlider');
        const emissionPointsSlider = document.getElementById('emissionPointsSlider');
        const emissionRateSlider = document.getElementById('emissionRateSlider');
        const decayRateSlider = document.getElementById('decayRateSlider');
        const maxParticlesSlider = document.getElementById('maxParticlesSlider');
        const bulgeRadiusSlider = document.getElementById('bulgeRadiusSlider');
        const bulgeHeightSlider = document.getElementById('bulgeHeightSlider');
        
        velocitySlider.addEventListener('input', (e) => {
            this.baseVelocity = parseFloat(e.target.value);
            document.getElementById('velocityValue').textContent = this.baseVelocity.toFixed(1);
        });
        
        centripetalSlider.addEventListener('input', (e) => {
            this.centripetalForce = parseFloat(e.target.value);
            document.getElementById('centripetalValue').textContent = this.centripetalForce.toFixed(1);
        });
        
        diskGravitySlider.addEventListener('input', (e) => {
            this.diskGravity = parseFloat(e.target.value);
            document.getElementById('diskGravityValue').textContent = this.diskGravity.toFixed(0);
        });
        
        ballGravitySlider.addEventListener('input', (e) => {
            this.ballGravity = parseFloat(e.target.value);
            document.getElementById('ballGravityValue').textContent = this.ballGravity.toFixed(1);
        });
        
        viewTiltSlider.addEventListener('input', (e) => {
            this.viewTilt = parseInt(e.target.value);
            document.getElementById('viewTiltValue').textContent = this.viewTilt + '°';
        });
        
        emissionPointsSlider.addEventListener('input', (e) => {
            this.emissionPointsPerArm = parseInt(e.target.value);
            document.getElementById('emissionPointsValue').textContent = this.emissionPointsPerArm.toString();
            // Regenerate galaxy when emission points change
            this.regenerateGalaxy();
        });
        
        emissionRateSlider.addEventListener('input', (e) => {
            this.initialEmissionRate = parseFloat(e.target.value);
            document.getElementById('emissionRateValue').textContent = this.initialEmissionRate.toFixed(3);
        });
        
        decayRateSlider.addEventListener('input', (e) => {
            this.emissionDecayRate = parseInt(e.target.value);
            document.getElementById('decayRateValue').textContent = this.emissionDecayRate.toString();
        });
        
        maxParticlesSlider.addEventListener('input', (e) => {
            this.maxBalls = parseInt(e.target.value);
            document.getElementById('maxParticlesValue').textContent = this.maxBalls.toString();
        });
        
        // Bulge control sliders
        bulgeRadiusSlider.addEventListener('input', (e) => {
            this.bulgeRadius = parseInt(e.target.value);
            document.getElementById('bulgeRadiusValue').textContent = this.bulgeRadius.toString();
            this.regenerateGalaxy();
        });
        
        bulgeHeightSlider.addEventListener('input', (e) => {
            this.bulgeHeight = parseInt(e.target.value);
            document.getElementById('bulgeHeightValue').textContent = this.bulgeHeight.toString();
            this.regenerateGalaxy();
        });
    }
    
    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.isPaused = false;
            this.galaxy.activate();
            document.getElementById('startBtn').disabled = true;
            document.getElementById('pauseBtn').disabled = false;
            document.getElementById('pauseBtn').textContent = 'Pause';
            this.gameLoop();
        }
    }
    
    togglePause() {
        this.isPaused = !this.isPaused;
        const pauseBtn = document.getElementById('pauseBtn');
        pauseBtn.textContent = this.isPaused ? 'Resume' : 'Pause';
        
        if (!this.isPaused) {
            this.gameLoop();
        }
    }
    
    reset() {
        this.isRunning = false;
        this.isPaused = false;
        this.balls = [];
        this.galaxy = new GalacticDisk(0, 0, this.numArms, this.emissionPointsPerArm, this.armWidthMultiplier, this.bulgeRadius, this.bulgeHeight);
        this.frameCount = 0;
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        document.getElementById('pauseBtn').textContent = 'Pause';
        this.render();
    }
    
    regenerateGalaxy() {
        const wasRunning = this.isRunning;
        this.reset();
        if (wasRunning) {
            // Restart if it was running
            setTimeout(() => this.start(), 100);
        }
    }
    
    updatePhysics() {
        // Update galaxy
        this.galaxy.update();
        
        // Emit new balls from galaxy bulge
        const newBalls = this.galaxy.emitBalls(this.baseVelocity, this.centripetalForce, this.initialEmissionRate, this.emissionDecayRate, this.frameCount);
        this.balls.push(...newBalls);
        
        // Limit ball count
        if (this.balls.length > this.maxBalls) {
            this.balls = this.balls.slice(-this.maxBalls);
        }
        
        // Apply forces to balls
        for (let i = 0; i < this.balls.length; i++) {
            const ball = this.balls[i];
            
            // Dynamic attraction to other balls
            for (let j = i + 1; j < this.balls.length; j++) {
                const other = this.balls[j];
                const force = ball.attractTo(other, this.ballGravity);
                
                ball.applyForce(force);
                other.applyForce(force.multiply(-1));
            }
            
            // Dynamic attraction to galaxy arms
            const armForce = this.galaxy.attractBall(ball, this.diskGravity);
            ball.applyForce(armForce);
        }
        
        // Update all balls
        for (let i = this.balls.length - 1; i >= 0; i--) {
            const ball = this.balls[i];
            ball.update();
            
            // Remove only balls that are far off-screen
            const distanceFromCenter = ball.position.magnitude();
            if (distanceFromCenter > 1200) { // Increased distance threshold
                this.balls.splice(i, 1);
            }
        }
        
        this.frameCount++;
    }
    
    render() {
        // Clear canvas with space background
        this.ctx.fillStyle = '#000811';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw subtle coordinate system
        this.ctx.strokeStyle = '#112244';
        this.ctx.lineWidth = 1;
        this.ctx.globalAlpha = 0.3;
        
        // Horizontal line
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.centerY);
        this.ctx.lineTo(this.canvas.width, this.centerY);
        this.ctx.stroke();
        
        // Vertical line
        this.ctx.beginPath();
        this.ctx.moveTo(this.centerX, 0);
        this.ctx.lineTo(this.centerX, this.canvas.height);
        this.ctx.stroke();
        
        this.ctx.globalAlpha = 1.0;
        
        // Render all balls first (behind galaxy)
        for (const ball of this.balls) {
            ball.render(this.ctx, this.centerX, this.centerY, this.viewTilt);
        }
        
        // Render galaxy on top
        this.galaxy.render(this.ctx, this.centerX, this.centerY, this.viewTilt);
        
        // Draw info
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '14px Arial';
        this.ctx.fillText(`Particles: ${this.balls.length}`, 10, 20);
        this.ctx.fillText(`Galaxy Rotation: ${(this.galaxy.rotation * 180 / Math.PI).toFixed(1)}°`, 10, 40);
        this.ctx.fillText(`Frame: ${this.frameCount}`, 10, 60);
        
        if (this.galaxy.isActive) {
            const activePoints = this.galaxy.emissionPoints.filter(p => p.isActive).length;
            const totalPoints = this.galaxy.emissionPoints.length;
            this.ctx.fillText(`Active Emission Points: ${activePoints}/${totalPoints}`, 10, 80);
        }
        
        // Draw face-on view of galaxy in bottom right corner
        this.renderFaceOnView();
    }
    
    renderFaceOnView() {
        const viewSize = 120; // Size of the face-on view
        const viewX = this.canvas.width - viewSize - 20; // 20px margin from right
        const viewY = this.canvas.height - viewSize - 20; // 20px margin from bottom
        const viewCenterX = viewX + viewSize / 2;
        const viewCenterY = viewY + viewSize / 2;
        const scale = 0.4; // Scale down the galaxy for the mini view
        
        // Draw background circle for the view
        this.ctx.save();
        this.ctx.fillStyle = '#001122';
        this.ctx.strokeStyle = '#334455';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(viewCenterX, viewCenterY, viewSize / 2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
        
        // Draw galaxy arms from face-on perspective
        this.ctx.globalAlpha = 0.8;
        for (let arm of this.galaxy.arms) {
            for (let i = 0; i < arm.segments.length; i++) {
                const segment = arm.segments[i];
                
                // Apply rotation and scaling for face-on view
                const rotatedX = segment.x * Math.cos(this.galaxy.rotation) - segment.y * Math.sin(this.galaxy.rotation);
                const rotatedY = segment.x * Math.sin(this.galaxy.rotation) + segment.y * Math.cos(this.galaxy.rotation);
                
                const screenX = viewCenterX + rotatedX * scale;
                const screenY = viewCenterY + rotatedY * scale;
                const segmentRadius = segment.radius * scale;
                
                // Color gradient from center to edge
                const centerDistance = Math.sqrt(rotatedX * rotatedX + rotatedY * rotatedY);
                const maxDistance = 120;
                const brightness = Math.max(0.3, 1.0 - centerDistance / maxDistance);
                
                this.ctx.fillStyle = `rgba(100, 150, 255, ${brightness})`;
                this.ctx.beginPath();
                this.ctx.arc(screenX, screenY, segmentRadius, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        
        // Draw center
        this.ctx.fillStyle = '#ffaa44';
        this.ctx.beginPath();
        this.ctx.arc(viewCenterX, viewCenterY, 3, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Add label
        this.ctx.globalAlpha = 1.0;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Face-on View', viewCenterX, viewY - 8);
        this.ctx.textAlign = 'left'; // Reset text alignment
        
        this.ctx.restore();
    }
    
    gameLoop() {
        if (this.isRunning && !this.isPaused) {
            this.updatePhysics();
            this.render();
            // Slow down frame rate by adding delay
            setTimeout(() => {
                requestAnimationFrame(() => this.gameLoop());
            }, 50); // ~20 FPS for smoother longer simulation
        } else if (this.isRunning && this.isPaused) {
            this.render();
        }
    }
}

// Initialize simulation when page loads
window.addEventListener('load', () => {
    const canvas = document.getElementById('canvas');
    const simulation = new GalaxySimulation(canvas);
    simulation.render(); // Initial render
});