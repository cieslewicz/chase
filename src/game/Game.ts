import { Player, BadGuy, Apple, Obstacle } from './Entities';

export class Game {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;

    player: Player | null = null;
    badGuy: BadGuy | null = null;
    apples: Apple[] = [];
    obstacles: Obstacle[] = [];

    score: number = 0;
    time: number = 60;
    highScore: number = 0;

    isRunning: boolean = false;
    isPaused: boolean = false;
    lastTime: number = 0;

    mouseX: number = 0;
    mouseY: number = 0;

    isDragging: boolean = false;
    dragOffsetX: number = 0;
    dragOffsetY: number = 0;

    keys = {
        up: false,
        down: false,
        left: false,
        right: false
    };

    settings = {
        audio: true,
        difficulty: 10,
        inputType: 'keyboard'
    };

    onGameOver: (score: number) => void = () => { };
    onScoreUpdate: (score: number) => void = () => { };
    onTimeUpdate: (time: number) => void = () => { };
    onPause: (isPaused: boolean) => void = () => { };

    audioCtx: AudioContext | null = null;

    appleTimer: number = 0;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.highScore = parseInt(localStorage.getItem('highScore') || '0');

        this.resizeCallback = this.resize.bind(this);
        window.addEventListener('resize', this.resizeCallback);
        this.resize();

        this.bindInput();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    // Cleanup if needed (though singleton-ish here)
    resizeCallback: () => void;

    bindInput() {
        window.addEventListener('keydown', (e) => {
            switch (e.code) {
                case 'ArrowUp': case 'KeyW': this.keys.up = true; break;
                case 'ArrowDown': case 'KeyS': this.keys.down = true; break;
                case 'ArrowLeft': case 'KeyA': this.keys.left = true; break;
                case 'ArrowRight': case 'KeyD': this.keys.right = true; break;
                case 'Escape': case 'KeyP': this.togglePause(); break;
            }
        });

        window.addEventListener('keyup', (e) => {
            switch (e.code) {
                case 'ArrowUp': case 'KeyW': this.keys.up = false; break;
                case 'ArrowDown': case 'KeyS': this.keys.down = false; break;
                case 'ArrowLeft': case 'KeyA': this.keys.left = false; break;
                case 'ArrowRight': case 'KeyD': this.keys.right = false; break;
            }
        });

        // Mouse movement
        // Mouse movement
        const updateMouse = (x: number, y: number) => {
            if (!this.player || !this.isRunning || this.isPaused) return;
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = x - rect.left;
            this.mouseY = y - rect.top;
        };

        this.canvas.addEventListener('mousemove', (e) => updateMouse(e.clientX, e.clientY));

        // Touch movement
        // Touch Start - Grab Logic
        this.canvas.addEventListener('touchstart', (e) => {
            if (e.cancelable) e.preventDefault();
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const tx = touch.clientX - rect.left;
            const ty = touch.clientY - rect.top;

            updateMouse(tx, ty);

            // Check if grabbing player
            if (this.player && this.settings.inputType === 'touch') {
                const dist = Math.hypot(tx - (this.player.x + this.player.width / 2), ty - (this.player.y + this.player.height / 2));
                // Generous grab radius (80px)
                if (dist < 80) {
                    this.isDragging = true;
                    this.dragOffsetX = this.player.x - tx;
                    this.dragOffsetY = this.player.y - ty;
                }
            }
        }, { passive: false });

        // Touch End - Release
        this.canvas.addEventListener('touchend', (e) => {
            if (e.cancelable) e.preventDefault();
            this.isDragging = false;
        });

        this.canvas.addEventListener('touchmove', (e) => {
            if (e.cancelable) e.preventDefault();
            // Only update mouse pos, logic happens in update()
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = touch.clientX - rect.left;
            this.mouseY = touch.clientY - rect.top;
        }, { passive: false });

        // Prevent context menu on long press
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            return false;
        });

        // Force style just in case CSS fails somehow
        this.canvas.style.touchAction = 'none';
    }

    start(charType: string, settings: { audio: boolean; difficulty: number; inputType: string }) {
        this.settings = settings;
        this.canvas.focus(); // Ensure focus for keyboard input
        if (this.settings.audio && !this.audioCtx) {
            this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        this.player = new Player(this.canvas.width / 2, this.canvas.height / 2, charType);

        this.apples = [];
        this.obstacles = [];
        this.generateObstacles(this.settings.difficulty);

        // Spawn Bad Guy safely AFTER obstacles
        this.badGuy = new BadGuy(0, 0);
        this.spawnBadGuySafe();

        this.score = 0;
        this.time = 60;

        this.isRunning = true;
        this.isPaused = false;
        this.lastTime = performance.now();
        this.appleTimer = 0;

        this.updateLevel(); // Reset background color
        this.updateUI();
        this.loop(this.lastTime);
    }

    isValidSpawn(x: number, y: number, radius: number): boolean {
        // Check Canvas Bounds (with margin)
        if (x < radius || x > this.canvas.width - radius || y < radius || y > this.canvas.height - radius) return false;

        // Check Obstacles
        // Create a temp Circle object for collision check
        // We reuse the 'checkCircleCollision' or logic from entities
        // Simplified: check distance to nearest point of rectangle?
        // Reuse Entity method logic basically.
        // Let's just create a temp object if we want or implement logic here.
        // Since Obstacles have 'checkCollision' against a generic entity with x,y,width,height:
        const tempEntity = { x: x - radius, y: y - radius, width: radius * 2, height: radius * 2, radius: radius };

        for (const obs of this.obstacles) {
            // Player/BadGuy/Apple are conceptually circles or have 'radius' roughly
            // Obstacle checkCollision expects {x, y, width, height}
            // Apples use checkCollision (AABB mostly? No, they are circular logic often manually done)
            // Obstacle.checkCollision takes 'entity'
            if (obs.checkCollision(tempEntity as any)) {
                return false;
            }
        }
        return true;
    }

    spawnBadGuySafe() {
        if (!this.badGuy) return;
        let valid = false;
        let attempts = 0;
        while (!valid && attempts < 50) {
            // Try sides
            if (Math.random() > 0.5) {
                this.badGuy.x = this.canvas.width - 100;
                this.badGuy.y = Math.random() * this.canvas.height;
            } else {
                this.badGuy.x = 100;
                this.badGuy.y = Math.random() * this.canvas.height;
            }

            // Should also be far from player
            const dist = Math.hypot(this.badGuy.x - this.player!.x, this.badGuy.y - this.player!.y);
            if (dist > 300 && this.isValidSpawn(this.badGuy.x, this.badGuy.y, 40)) { // 40 approx badguy size
                valid = true;
            }
            attempts++;
        }
    }

    togglePause() {
        if (!this.isRunning) return;
        this.isPaused = !this.isPaused;
        this.onPause(this.isPaused);
    }

    updateSettings(newSettings: Partial<typeof this.settings>) {
        this.settings = { ...this.settings, ...newSettings };
        if (this.settings.audio && !this.audioCtx) {
            this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
    }

    generateObstacles(count: number) {
        for (let i = 0; i < count; i++) {
            let attempts = 0;
            let valid = false;
            let obs: Obstacle | null = null;

            while (!valid && attempts < 50) {
                const x = Math.random() * (this.canvas.width - 60);
                const y = Math.random() * (this.canvas.height - 60);
                obs = new Obstacle(x, y);

                // Check distance from player start
                const p = new Player(this.canvas.width / 2, this.canvas.height / 2, 'circle');
                if (obs.checkCircleCollision(p)) {
                    attempts++;
                    continue; // Too close to player start
                }

                // Check overlap with other obstacles
                let overlap = false;
                for (const other of this.obstacles) {
                    if (obs.checkCircleCollision(other)) {
                        overlap = true;
                        break;
                    }
                }
                if (!overlap) valid = true;
                attempts++;
            }
            if (obs && valid) this.obstacles.push(obs);
        }
    }

    spawnApple() {
        let valid = false;
        let attempts = 0;
        while (!valid && attempts < 20) {
            const x = Math.random() * (this.canvas.width - 40);
            const y = Math.random() * (this.canvas.height - 40);

            if (this.isValidSpawn(x, y, 20)) {
                // Determine Apple Type
                let type: 'standard' | 'golden' | 'green' = 'standard';
                const rand = Math.random();

                // Logic for Golden Apple: Time < 20s
                if (this.time < 20 && rand < 0.2) {
                    type = 'golden';
                }
                // Logic for Green Apple: Bad Guy Speed > 80% of Player Speed (approx 200)
                // Base speed is 80, +5 per score. Score 24 => 200 speed.
                else if (this.badGuy && this.player && this.badGuy.speed > (this.player.speed * 0.8)) {
                    // Logic: Less likely as score gets very high? 
                    // Let's keep it simple: small chance if fast
                    if (rand < 0.1) {
                        type = 'green';
                    }
                }

                this.apples.push(new Apple(x, y, type));
                valid = true;
            }
            attempts++;
        }
    }

    loop(timestamp: number) {
        if (!this.isRunning) return;

        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        if (!this.isPaused) {
            this.update(dt);
            this.draw();
        }

        requestAnimationFrame(this.loop.bind(this));
    }

    update(dt: number) {
        // Timer
        this.time -= dt;
        if (this.time <= 0) {
            this.time = 0;
            this.gameOver();
            return;
        }
        this.onTimeUpdate(Math.ceil(this.time));

        // Apple Spawning (roughly every 2s)
        this.appleTimer += dt;
        if (this.appleTimer > 2) {
            this.appleTimer = 0;
            // 50% chance to spawn or just spawn? Desc says "roughly every 2 seconds"
            this.spawnApple();
        }

        if (!this.player || !this.badGuy) return;

        // Movement
        const oldPx = this.player.x;
        const oldPy = this.player.y;

        if (this.settings.inputType === 'mouse') {
            this.player.moveTowards(this.mouseX, this.mouseY, dt);
        } else if (this.settings.inputType === 'touch') {
            if (this.isDragging) {
                this.player.x = this.mouseX + this.dragOffsetX;
                this.player.y = this.mouseY + this.dragOffsetY;
            }
        } else {
            this.player.move(this.keys, dt);
        }
        this.player.handleScreenBounds(this.canvas.width, this.canvas.height);

        // Player vs Obstacles (Slide)
        for (const obs of this.obstacles) {
            if (this.player.checkCollision(obs)) {
                // Revert to old position (simple block)
                // For direct drag, this feels "sticky" but safe
                this.player.x = oldPx;
                this.player.y = oldPy; // Revert both immediately for strict block
            }
        }

        // BadGuy Movement
        const oldBx = this.badGuy.x;
        const oldBy = this.badGuy.y;

        this.badGuy.update(this.player, dt, this.score);

        // BadGuy vs Obstacles
        for (const obs of this.obstacles) {
            if (this.badGuy.checkCollision(obs)) {
                this.badGuy.x = oldBx;
                if (this.badGuy.checkCollision(obs)) this.badGuy.y = oldBy;
            }
        }

        // Player vs BadGuy
        if (this.player.checkCircleCollision(this.badGuy)) {
            this.gameOver();
            return;
        }

        // Player vs Apples
        for (let i = this.apples.length - 1; i >= 0; i--) {
            if (this.player.checkCircleCollision(this.apples[i])) {
                this.eatApple(i);
            }
        }
    }

    eatApple(index: number) {
        const apple = this.apples[index];
        this.apples.splice(index, 1);

        // Effects based on Type
        if (apple.type === 'golden') {
            this.time += 15;
            this.playSound(660, 0.2); // Higher pitch for powerup
        } else if (apple.type === 'green') {
            if (this.badGuy) {
                this.badGuy.speedMultiplier *= 0.5; // Halve speed logic
                // Maybe ensure it doesn't get too slow? Or just let it be.
            }
            this.playSound(220, 0.2); // Lower pitch "freeze" sound?
            // Still adds score? Request implied power-ups. Usually power-ups are separate or additive.
            // Let's assume they give points too, or maybe not? 
            // "continued to increase... but from a slower speed"
            // Let's add 1 point still to keep "collect more apples" mechanic consistent.
            this.score += 1;
        } else {
            // Standard
            this.score += 1;
            this.time += 1; // Standard adds 1s
            this.playSound(440, 0.1);
        }

        this.onScoreUpdate(this.score);
        this.updateLevel();
    }

    // Level background colors
    levelColors = [
        '#51cf66', // Level 1 (0-9): Green
        '#4dabf7', // Level 2 (10-19): Blue
        '#cc5de8', // Level 3 (20-29): Grape
        '#ff922b', // Level 4 (30-39): Orange
        '#fa5252', // Level 5 (40-49): Red
        '#fcc419', // Level 6 (50-59): Yellow
    ];

    updateLevel() {
        const levelIndex = Math.floor(this.score / 10) % this.levelColors.length;
        this.canvas.style.backgroundColor = this.levelColors[levelIndex];
    }

    playSound(freq: number, duration: number) {
        if (!this.settings.audio || !this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.frequency.value = freq;
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.00001, this.audioCtx.currentTime + duration);
        osc.stop(this.audioCtx.currentTime + duration);
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Obstacles
        for (const obs of this.obstacles) obs.draw(this.ctx);

        // Draw Apples
        for (const a of this.apples) a.draw(this.ctx);

        // Draw Entities
        this.player?.draw(this.ctx);
        this.badGuy?.draw(this.ctx);
    }

    updateUI() {
        this.onScoreUpdate(this.score);
        this.onTimeUpdate(Math.ceil(this.time));
    }

    gameOver() {
        this.isRunning = false;
        this.playSound(150, 0.5); // Sad tone
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('highScore', this.highScore.toString());
        }
        this.onGameOver(this.score);
    }
}
