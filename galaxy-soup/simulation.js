// Physics Simulation - Streamer Disk
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
        this.position = new Vector2(x, y); // x = horizontal, y = depth (into screen)
        this.velocity = new Vector2(0, 0);
        this.acceleration = new Vector2(0, 0);
        this.z = z; // z = vertical (up/down from disk plane)
        this.zVelocity = 0; // Velocity in z direction
        this.mass = 1;
        this.radius = 3;
        this.color = this.generateColor();
        this.trail = []; // Store previous positions for trail effect
        this.maxTrailLength = 25;
        this.age = 0;
        this.maxAge = 1500; // Frames before natural decay
        
        // Simple properties for tracking
        this.helixId = -1; // Which helix emission pattern this came from
    }
    
    generateColor() {
        // Generate colors based on z-position (above/below disk)
        if (this.z > 0) {
            return `hsl(${40 + Math.random() * 80}, 85%, 65%)`; // Warm colors for above
        } else {
            return `hsl(${180 + Math.random() * 80}, 85%, 65%)`; // Cool colors for below
        }
    }
    
    applyForce(force) {
        // F = ma, so a = F/m
        this.acceleration = this.acceleration.add(force.multiply(1 / this.mass));
    }
    
    update(deltaTime = 1) {
        // Store current position for trail (including z coordinate)
        this.trail.push({ x: this.position.x, y: this.position.y, z: this.z });
        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }
        
        // All balls now use normal physics motion (straight line + attractions)
        this.velocity = this.velocity.add(this.acceleration.multiply(deltaTime));
        this.position = this.position.add(this.velocity.multiply(deltaTime));
        this.z += this.zVelocity * deltaTime;
        
        // Add slight damping to prevent infinite acceleration
        this.velocity = this.velocity.multiply(0.998);
        this.zVelocity *= 0.998;
        
        // Reset acceleration for next frame
        this.acceleration = new Vector2(0, 0);
        
        this.age++;
    }
    
    render(ctx, centerX, centerY) {
        // Side view: x = horizontal, y = depth, z = vertical
        // Apply perspective based on depth (y coordinate)
        const perspective = 800; // Perspective strength
        const depthScale = perspective / (perspective + this.position.y);
        
        // Calculate screen position for side view
        const screenX = centerX + this.position.x * depthScale;
        const screenZ = centerY - this.z * depthScale; // Invert Z for proper up/down
        
        // Calculate size based on depth
        const ballSize = this.radius * depthScale;
        
        // Draw trail with perspective
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = Math.max(1, depthScale);
        ctx.beginPath();
        for (let i = 1; i < this.trail.length; i++) {
            const prev = this.trail[i - 1];
            const curr = this.trail[i];
            
            const prevDepthScale = perspective / (perspective + prev.y);
            const currDepthScale = perspective / (perspective + curr.y);
            
            const prevScreenX = centerX + prev.x * prevDepthScale;
            const prevScreenZ = centerY - prev.z * prevDepthScale;
            const currScreenX = centerX + curr.x * currDepthScale;
            const currScreenZ = centerY - curr.z * currDepthScale;
            
            if (i === 1) {
                ctx.moveTo(prevScreenX, prevScreenZ);
            }
            ctx.lineTo(currScreenX, currScreenZ);
        }
        ctx.stroke();
        
        // Draw ball
        ctx.globalAlpha = Math.max(0.3, depthScale); // Fade with distance
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(screenX, screenZ, ballSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Add glow effect
        ctx.globalAlpha = Math.max(0.2, depthScale * 0.5);
        ctx.beginPath();
        ctx.arc(screenX, screenZ, ballSize * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
    
    // Calculate attraction force to another ball (3D distance)
    attractTo(other) {
        const dx = other.position.x - this.position.x;
        const dy = other.position.y - this.position.y;
        const dz = other.z - this.z;
        const distance3D = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const minDistance = 8; // Prevent division by zero and extreme forces
        
        if (distance3D < minDistance) return new Vector2(0, 0);
        
        // Gravitational-like force: F = G * m1 * m2 / r^2
        const G = 20; // Reduced for slower, more graceful motion
        const forceMagnitude = G * this.mass * other.mass / (distance3D * distance3D);
        
        // Get direction vector from this ball to other ball (only x,y components for 2D force)
        const distance2D = this.position.distance(other.position);
        if (distance2D === 0) return new Vector2(0, 0);
        
        const direction = other.position.subtract(this.position).normalize();
        
        return direction.multiply(forceMagnitude);
    }
    
    // Check if this ball should be strongly attracted to another (when very close in 3D)
    shouldAttract(other) {
        const dx = other.position.x - this.position.x;
        const dy = other.position.y - this.position.y;
        const dz = other.z - this.z;
        const distance3D = Math.sqrt(dx * dx + dy * dy + dz * dz);
        return distance3D < 25; // Attraction threshold
    }
}

class Disk {
    constructor(x, y) {
        this.position = new Vector2(x, y);
        this.radius = 25;
        this.isActive = false;
        this.emissionTimer = 0;
        this.emissionDuration = 800; // Longer duration for multiple helixes
        this.spiralAngle = 0;
        this.spiralSpeed = 0.12; // Slightly faster for more dynamic emission
        this.emissionRate = 1; // One ball at a time for clear helix pattern
        this.streamers = []; // Array to track different streamers
        this.nextStreamerIndex = 0;
        this.pulsePhase = 0; // For visual pulsing effect
        
        // Multiple emission points and helix configurations
        this.emissionPoints = [];
        this.helixConfigs = [];
        this.activeHelixes = 0;
        this.maxHelixes = 16; // More concurrent helixes for denser pattern
        this.helixStartInterval = 20; // Much faster activation - new helix every 20 frames
    }
    
    activate() {
        this.isActive = true;
        this.emissionTimer = 0;
        this.spiralAngle = 0;
        this.pulsePhase = 0;
        this.activeHelixes = 0;
        this.generateEmissionPoints();
    }
    
    generateEmissionPoints() {
        this.emissionPoints = [];
        this.helixConfigs = [];
        
        // Generate multiple random points on both sides of the disk
        for (let i = 0; i < this.maxHelixes; i++) {
            // Random point within disk radius
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * this.radius * 0.8; // Don't go all the way to edge
            
            const emissionPoint = {
                x: Math.cos(angle) * radius,
                y: 0, // Always at disk plane initially
                z: 0, // Always at disk plane initially
                side: i < this.maxHelixes / 2 ? 1 : -1, // Half above, half below disk
                startTime: i * this.helixStartInterval, // Stagger start times
                isActive: false
            };
            
            // Generate random helix configuration
            const helixConfig = {
                // Random axis direction (always pointing away from disk)
                axisX: (Math.random() - 0.5) * 1.2, // More randomness in X
                axisY: 0.6 + Math.random() * 0.8, // Still mostly outward but more variation
                axisZ: emissionPoint.side * (0.4 + Math.random() * 0.8), // Away from disk plane
                
                helixRadius: 5 + Math.random() * 12, // Much smaller helix radius (5-17 instead of 15-40)
                helixPitch: 0.15 + Math.random() * 0.25, // Faster spiral for more visible pattern
                speed: 0.8 + Math.random() * 0.4, // Faster emission speed
                color: emissionPoint.side > 0 ? 'warm' : 'cool', // Color coding by side
                angle: 0 // Current angle in the helix
            };
            
            // Normalize the axis vector
            const axisLength = Math.sqrt(
                helixConfig.axisX * helixConfig.axisX +
                helixConfig.axisY * helixConfig.axisY +
                helixConfig.axisZ * helixConfig.axisZ
            );
            helixConfig.axisX /= axisLength;
            helixConfig.axisY /= axisLength;
            helixConfig.axisZ /= axisLength;
            
            this.emissionPoints.push(emissionPoint);
            this.helixConfigs.push(helixConfig);
        }
    }
    
    update() {
        if (this.isActive && this.emissionTimer < this.emissionDuration) {
            this.emissionTimer++;
            this.spiralAngle += this.spiralSpeed;
            this.pulsePhase += 0.1;
        } else if (this.emissionTimer >= this.emissionDuration) {
            this.isActive = false;
        }
        
        // Continue pulsing for visual effect even when inactive
        if (!this.isActive) {
            this.pulsePhase += 0.05;
        }
    }
    
    // Emit balls in multiple helical patterns from various disk surface points
    emitBalls() {
        if (!this.isActive || this.emissionTimer >= this.emissionDuration) {
            return [];
        }
        
        const newBalls = [];
        
        // Check each emission point to see if it should start or continue emitting
        for (let i = 0; i < this.emissionPoints.length; i++) {
            const emissionPoint = this.emissionPoints[i];
            const helixConfig = this.helixConfigs[i];
            
            // Activate emission point when its time comes
            if (!emissionPoint.isActive && this.emissionTimer >= emissionPoint.startTime) {
                emissionPoint.isActive = true;
                emissionPoint.helixAngle = 0;
                this.activeHelixes++;
            }
            
            // Emit from active points
            if (emissionPoint.isActive && this.emissionTimer % 3 === (i % 3)) { // Faster emission
                // Calculate current emission point on the helical pattern
                helixConfig.angle += helixConfig.helixPitch;
                
                // Create two perpendicular vectors to the helix axis for the spiral
                let perpX1, perpY1, perpZ1, perpX2, perpY2, perpZ2;
                
                // Find a vector that's not parallel to the axis
                if (Math.abs(helixConfig.axisX) < 0.9) {
                    perpX1 = 0; perpY1 = helixConfig.axisZ; perpZ1 = -helixConfig.axisY;
                } else {
                    perpX1 = helixConfig.axisZ; perpY1 = 0; perpZ1 = -helixConfig.axisX;
                }
                
                // Normalize first perpendicular vector
                let perpLen1 = Math.sqrt(perpX1*perpX1 + perpY1*perpY1 + perpZ1*perpZ1);
                if (perpLen1 > 0) {
                    perpX1 /= perpLen1; perpY1 /= perpLen1; perpZ1 /= perpLen1;
                }
                
                // Second perpendicular vector (cross product of axis and first perp)
                perpX2 = helixConfig.axisY * perpZ1 - helixConfig.axisZ * perpY1;
                perpY2 = helixConfig.axisZ * perpX1 - helixConfig.axisX * perpZ1;
                perpZ2 = helixConfig.axisX * perpY1 - helixConfig.axisY * perpX1;
                
                // Calculate helical emission point
                const helixOffsetX = Math.cos(helixConfig.angle) * perpX1 + Math.sin(helixConfig.angle) * perpX2;
                const helixOffsetY = Math.cos(helixConfig.angle) * perpY1 + Math.sin(helixConfig.angle) * perpY2;
                const helixOffsetZ = Math.cos(helixConfig.angle) * perpZ1 + Math.sin(helixConfig.angle) * perpZ2;
                
                // Create ball at helical emission point
                const ball = new Ball(
                    emissionPoint.x + helixOffsetX * helixConfig.helixRadius,
                    emissionPoint.y + helixOffsetY * helixConfig.helixRadius,
                    emissionPoint.z + helixOffsetZ * helixConfig.helixRadius
                );
                
                // Ball travels in straight line away from disk center
                // Calculate direction from disk center to current emission point
                const emissionX = emissionPoint.x + helixOffsetX * helixConfig.helixRadius;
                const emissionY = emissionPoint.y + helixOffsetY * helixConfig.helixRadius;
                const emissionZ = emissionPoint.z + helixOffsetZ * helixConfig.helixRadius;
                
                // Direction vector from disk center (0,0,0) to emission point
                const dirLength = Math.sqrt(emissionX*emissionX + emissionY*emissionY + emissionZ*emissionZ);
                if (dirLength > 0) {
                    ball.velocity = new Vector2(
                        (emissionX / dirLength) * helixConfig.speed,
                        (emissionY / dirLength) * helixConfig.speed
                    );
                    ball.zVelocity = (emissionZ / dirLength) * helixConfig.speed;
                } else {
                    // Fallback if at exact center
                    ball.velocity = new Vector2(helixConfig.axisX * helixConfig.speed, helixConfig.axisY * helixConfig.speed);
                    ball.zVelocity = helixConfig.axisZ * helixConfig.speed;
                }
                
                // Ball just travels in straight line - no special helix motion
                ball.isHelixBall = false;
                ball.helixId = i; // Track which helix this belongs to for coloring
                
                // Set color based on which side of disk
                if (helixConfig.color === 'warm') {
                    ball.color = `hsl(${30 + Math.random() * 90}, 85%, 65%)`;
                } else {
                    ball.color = `hsl(${180 + Math.random() * 100}, 85%, 65%)`;
                }
                
                newBalls.push(ball);
            }
        }
        
        return newBalls;
    }
    
    render(ctx, centerX, centerY) {
        // Side view: render disk as an edge-on ellipse
        const screenX = centerX + this.position.x;
        const screenY = centerY + this.position.y; // This is now depth, but disk stays at origin
        
        // Draw disk edge-on (very thin ellipse)
        const pulseScale = 1 + Math.sin(this.pulsePhase) * 0.1;
        const diskWidth = this.radius * pulseScale;
        const diskHeight = 4; // Very thin when viewed from side
        
        // Outer glow
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = this.isActive ? '#ff6600' : '#333366';
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, diskWidth * 1.5, diskHeight * 2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Main disk
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = this.isActive ? '#ff8833' : '#556699';
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, diskWidth, diskHeight, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner core line
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = this.isActive ? '#ffaa66' : '#7788bb';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX - diskWidth * 0.8, centerY);
        ctx.lineTo(centerX + diskWidth * 0.8, centerY);
        ctx.stroke();
        
        // Emission indicators when active (show active emission points)
        if (this.isActive) {
            ctx.globalAlpha = 0.8;
            
            // Draw active emission points and their helical patterns
            for (let i = 0; i < this.emissionPoints.length; i++) {
                const point = this.emissionPoints[i];
                const config = this.helixConfigs[i];
                
                if (point.isActive) {
                    // Draw base emission point
                    const pointX = centerX + point.x;
                    const pointY = centerY; // Keep at disk plane for cleaner look
                    
                    ctx.fillStyle = config.color === 'warm' ? '#ffaa44' : '#44aaff';
                    ctx.globalAlpha = 0.6;
                    ctx.beginPath();
                    ctx.arc(pointX, pointY, 2, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Draw small circle showing helical radius
                    ctx.strokeStyle = config.color === 'warm' ? '#ffcc66' : '#66ccff';
                    ctx.lineWidth = 1;
                    ctx.globalAlpha = 0.3;
                    ctx.beginPath();
                    ctx.arc(pointX, pointY, config.helixRadius, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }
        }
        
        ctx.globalAlpha = 1.0;
    }
}

class PhysicsSimulation {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.centerX = canvas.width / 2;
        this.centerY = canvas.height / 2;
        
        this.disk = new Disk(0, 0); // At origin
        this.balls = [];
        this.isRunning = false;
        this.isPaused = false;
        this.frameCount = 0;
        
        // Physics parameters
        this.attractionStrength = 1.0;
        this.maxBalls = 400; // Prevent performance issues
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        const startBtn = document.getElementById('startBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        const resetBtn = document.getElementById('resetBtn');
        
        startBtn.addEventListener('click', () => this.start());
        pauseBtn.addEventListener('click', () => this.togglePause());
        resetBtn.addEventListener('click', () => this.reset());
    }
    
    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.isPaused = false;
            this.disk.activate();
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
        this.disk = new Disk(0, 0);
        this.frameCount = 0;
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        document.getElementById('pauseBtn').textContent = 'Pause';
        this.render();
    }
    
    updatePhysics() {
        // Update disk
        this.disk.update();
        
        // Emit new balls from disk
        const newBalls = this.disk.emitBalls();
        this.balls.push(...newBalls);
        
        // Limit total number of balls for performance
        if (this.balls.length > this.maxBalls) {
            this.balls = this.balls.slice(-this.maxBalls);
        }
        
        // Calculate forces between balls
        for (let i = 0; i < this.balls.length; i++) {
            const ballA = this.balls[i];
            
            for (let j = i + 1; j < this.balls.length; j++) {
                const ballB = this.balls[j];
                
                // Calculate attraction force
                const force = ballA.attractTo(ballB);
                
                // Apply force to both balls (Newton's third law)
                ballA.applyForce(force);
                ballB.applyForce(force.multiply(-1));
                
                // If balls are very close, increase attraction
                if (ballA.shouldAttract(ballB)) {
                    const strongForce = force.multiply(2.0);
                    ballA.applyForce(strongForce);
                    ballB.applyForce(strongForce.multiply(-1));
                }
            }
        }
        
        // Update all balls
        for (let i = this.balls.length - 1; i >= 0; i--) {
            const ball = this.balls[i];
            ball.update();
            
            // Remove balls that are too old or too far away
            const distanceFromCenter = ball.position.magnitude();
            if (ball.age > ball.maxAge || distanceFromCenter > 1000) {
                this.balls.splice(i, 1);
            }
        }
        
        this.frameCount++;
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#001122';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw coordinate system for side view (subtle)
        this.ctx.strokeStyle = '#003344';
        this.ctx.lineWidth = 1;
        this.ctx.globalAlpha = 0.4;
        
        // Horizontal line (x-axis: left-right)
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.centerY);
        this.ctx.lineTo(this.canvas.width, this.centerY);
        this.ctx.stroke();
        
        // Vertical line (z-axis: up-down)
        this.ctx.beginPath();
        this.ctx.moveTo(this.centerX, 0);
        this.ctx.lineTo(this.centerX, this.canvas.height);
        this.ctx.stroke();
        
        // Depth reference lines (y-axis: into/out of screen)
        this.ctx.globalAlpha = 0.2;
        for (let i = 1; i <= 3; i++) {
            const offset = i * 50;
            this.ctx.beginPath();
            this.ctx.moveTo(this.centerX - offset, this.centerY - offset * 0.3);
            this.ctx.lineTo(this.centerX + offset, this.centerY - offset * 0.3);
            this.ctx.stroke();
        }
        
        this.ctx.globalAlpha = 1.0;
        
        // Render all balls
        for (const ball of this.balls) {
            ball.render(this.ctx, this.centerX, this.centerY);
        }
        
        // Render disk last (on top)
        this.disk.render(this.ctx, this.centerX, this.centerY);
        
        // Draw info
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '14px Arial';
        this.ctx.fillText(`Balls: ${this.balls.length}`, 10, 20);
        this.ctx.fillText(`Frame: ${this.frameCount}`, 10, 40);
        
        if (this.disk.isActive) {
            const remaining = Math.max(0, this.disk.emissionDuration - this.disk.emissionTimer);
            this.ctx.fillText(`Emission time remaining: ${Math.ceil(remaining / 60)}s`, 10, 60);
            this.ctx.fillText(`Active helixes: ${this.disk.activeHelixes}/${this.disk.maxHelixes}`, 10, 80);
        }
    }
    
    gameLoop() {
        if (this.isRunning && !this.isPaused) {
            this.updatePhysics();
            this.render();
            requestAnimationFrame(() => this.gameLoop());
        } else if (this.isRunning && this.isPaused) {
            // Still render when paused, just don't update physics
            this.render();
        }
    }
}

// Initialize simulation when page loads
window.addEventListener('load', () => {
    const canvas = document.getElementById('canvas');
    const simulation = new PhysicsSimulation(canvas);
    simulation.render(); // Initial render
});