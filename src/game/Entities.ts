export class Entity {
    x: number;
    y: number;
    width: number;
    height: number;
    image: HTMLImageElement | null = null;
    vx: number = 0;
    vy: number = 0;

    constructor(x: number, y: number, size: number, imageSrc?: string) {
        this.x = x;
        this.y = y;
        this.width = size;
        this.height = size;
        if (imageSrc) {
            this.image = new Image();
            this.image.src = imageSrc;
        }
    }

    draw(ctx: CanvasRenderingContext2D) {
        if (this.image && this.image.complete) {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = 'white';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }

    getBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            cx: this.x + this.width / 2,
            cy: this.y + this.height / 2,
            radius: this.width / 2
        };
    }

    // Simple AABB Collision
    checkCollision(other: Entity): boolean {
        return (
            this.x < other.x + other.width &&
            this.x + this.width > other.x &&
            this.y < other.y + other.height &&
            this.y + this.height > other.y
        );
    }

    // Circular Collision (better for shapes)
    checkCircleCollision(other: Entity): boolean {
        const b1 = this.getBounds();
        const b2 = other.getBounds();
        const dist = Math.sqrt((b1.cx - b2.cx) ** 2 + (b1.cy - b2.cy) ** 2);
        return dist < b1.radius + b2.radius;
    }
}

export class Player extends Entity {
    speed: number = 250; // pixels per second

    constructor(x: number, y: number, charType: string) {
        super(x, y, 50, `assets/player_${charType}.svg`);
    }

    move(directions: { up: boolean; down: boolean; left: boolean; right: boolean }, dt: number) {
        this.vx = 0;
        this.vy = 0;
        if (directions.up) this.vy -= this.speed;
        if (directions.down) this.vy += this.speed;
        if (directions.left) this.vx -= this.speed;
        if (directions.right) this.vx += this.speed;

        // Normalize diagonal movement
        if (this.vx !== 0 && this.vy !== 0) {
            const factor = 1 / Math.sqrt(2);
            this.vx *= factor;
            this.vy *= factor;
        }

        this.x += this.vx * dt;
        this.y += this.vy * dt;
    }

    moveTowards(targetX: number, targetY: number, dt: number) {
        // Calculate center of player
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;

        const dx = targetX - cx;
        const dy = targetY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Stop jittering when close
        if (dist < 5) {
            this.vx = 0;
            this.vy = 0;
            return;
        }

        this.vx = (dx / dist) * this.speed;
        this.vy = (dy / dist) * this.speed;

        this.x += this.vx * dt;
        this.y += this.vy * dt;
    }

    handleScreenBounds(width: number, height: number) {
        this.x = Math.max(0, Math.min(width - this.width, this.x));
        this.y = Math.max(0, Math.min(height - this.height, this.y));
    }
}

export class BadGuy extends Entity {
    baseSpeed: number = 80;
    speed: number;
    speedMultiplier: number = 1.0;

    constructor(x: number, y: number) {
        super(x, y, 50, 'assets/bad_guy.svg');
        this.speed = this.baseSpeed;
    }

    update(player: Player, dt: number, score: number) {
        // Speed increases with score
        this.speed = (this.baseSpeed + (score * 5)) * this.speedMultiplier;

        const pBounds = player.getBounds();
        const mBounds = this.getBounds();

        const dx = pBounds.cx - mBounds.cx;
        const dy = pBounds.cy - mBounds.cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0) {
            this.vx = (dx / dist) * this.speed;
            this.vy = (dy / dist) * this.speed;
        }

        this.x += this.vx * dt;
        this.y += this.vy * dt;
    }
}

export type AppleType = 'standard' | 'golden' | 'green';

export class Apple extends Entity {
    type: AppleType;

    constructor(x: number, y: number, type: AppleType = 'standard') {
        let src = 'assets/apple.svg'; // Standard
        if (type === 'golden') src = 'assets/apple_golden.svg';
        if (type === 'green') src = 'assets/apple_green.svg';

        super(x, y, 40, src);
        this.type = type;
    }
}

export class Obstacle extends Entity {
    constructor(x: number, y: number) {
        super(x, y, 60, 'assets/obstacle_rock.svg'); // Relative path
    }
}
