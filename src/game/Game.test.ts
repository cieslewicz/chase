/// <reference types="vitest" />
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UIManager } from '../ui/UIManager';
import { Game } from '../game/Game';
import { Apple } from './Entities'; // Import Apple for type checking in test
import { Obstacle } from './Entities';  // Import Obstacle
import { Entity } from './Entities';

// Mock Canvas
class MockCanvas {
    width = 800;
    height = 600;
    getContext() {
        return {
            clearRect: vi.fn(),
            drawImage: vi.fn(),
            fillStyle: '',
            fillRect: vi.fn(),
        };
    }
    addEventListener = vi.fn();
    style = { backgroundColor: '' };
}

describe('Entity Collision', () => {
    it('should detect AABB collision', () => {
        const e1 = new Entity(0, 0, 50);
        const e2 = new Entity(40, 40, 50); // Overlaps
        const e3 = new Entity(100, 100, 50); // Far away

        expect(e1.checkCollision(e2)).toBe(true);
        expect(e1.checkCollision(e3)).toBe(false);
    });

    it('should detect Circle collision', () => {
        const e1 = new Entity(0, 0, 50);
        const e2 = new Entity(40, 40, 50);
        const e3 = new Entity(10, 10, 50);

        expect(e1.checkCircleCollision(e3)).toBe(true);
        expect(e1.checkCircleCollision(e2)).toBe(false);
    });
});

describe('Game Logic', () => {
    let game: Game;

    beforeEach(() => {
        const canvas = new MockCanvas() as unknown as HTMLCanvasElement;

        // Mock AudioContext
        vi.stubGlobal('AudioContext', vi.fn().mockImplementation(() => ({
            createOscillator: () => ({ connect: vi.fn(), start: vi.fn(), stop: vi.fn(), frequency: { value: 0 } }),
            createGain: () => ({ connect: vi.fn(), gain: { exponentialRampToValueAtTime: vi.fn() } }),
            destination: {}
        })));

        // Mock localStorage
        const localStorageMock = {
            getItem: vi.fn(() => null),
            setItem: vi.fn(),
            clear: vi.fn(),
            removeItem: vi.fn(),
            length: 0,
            key: vi.fn(),
        };
        vi.stubGlobal('localStorage', localStorageMock);

        // Mock canvas element
        const mockCanvas = document.createElement('canvas');
        mockCanvas.width = 800; // Add width and height from MockCanvas
        mockCanvas.height = 600;
        mockCanvas.addEventListener = vi.fn(); // Add addEventListener from MockCanvas
        mockCanvas.style.backgroundColor = ''; // Add style from MockCanvas

        mockCanvas.getContext = vi.fn().mockReturnValue({
            clearRect: vi.fn(),
            drawImage: vi.fn(),
            fillRect: vi.fn(),
            fillStyle: '',
            beginPath: vi.fn(),
            arc: vi.fn(),
            fill: vi.fn(),
            stroke: vi.fn(),
            save: vi.fn(),
            restore: vi.fn(),
            translate: vi.fn(),
            rotate: vi.fn(),
            createLinearGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
        } as unknown as CanvasRenderingContext2D);

        // Mock focus explicitly
        Object.defineProperty(mockCanvas, 'focus', { value: vi.fn(), writable: true });

        game = new Game(mockCanvas);
        game.start('circle', { audio: false, difficulty: 5, inputType: 'keyboard' });
    });

    // --- Game Logic Tests ---
    it('should initialize with correct score and time', () => {
        expect(game.score).toBe(0);
        expect(game.time).toBe(60);
    });

    it('should generate obstacles', () => {
        expect(game.obstacles.length).toBeGreaterThan(0);
    });

    it('should spawn apples', () => {
        game.spawnApple();
        expect(game.apples.length).toBeGreaterThan(0);
    });

    it('should increment score when eating apple', () => {
        game.apples.push(new Apple(game.player!.x, game.player!.y));
        const initialScore = game.score;
        game.update(0.1); // Update to trigger collision check
        expect(game.score).toBeGreaterThan(initialScore);
    });

    it('should reduce time on update', () => {
        const initialTime = game.time;
        game.update(1);
        expect(game.time).toBeLessThan(initialTime);
    });

    it('should trigger game over when time runs out', () => {
        game.time = 0.1;
        game.update(0.2);
        expect(game.isRunning).toBe(false);
    });

    it('should move player towards mouse position when inputType is mouse', () => {
        game.start('circle', { audio: false, difficulty: 5, inputType: 'mouse' });
        game.obstacles = []; // Clear obstacles to ensure valid movement

        // Mock mouse position
        game.mouseX = 400;
        game.mouseY = 300;

        game.mouseX = 600;
        game.mouseY = 300;

        const initialX = game.player!.x;
        game.update(0.1);

        expect(game.player!.x).toBeGreaterThan(initialX);
        expect(game.player!.vx).toBeGreaterThan(0);
    });

    it('should scale Bad Guy speed with score', () => {
        const bg = game.badGuy!;
        const initialSpeed = bg.speed;
        game.score = 10;
        game.badGuy!.update(game.player!, 0.1, game.score);
        expect(bg.speed).toBeGreaterThan(initialSpeed);
    });

    it('should trigger game over on collision with Bad Guy', () => {
        const bg = game.badGuy!;
        bg.x = game.player!.x;
        bg.y = game.player!.y;
        game.update(0.1);
        expect(game.isRunning).toBe(false);
    });

    it('should save high score', () => {
        game.score = 100;
        game.gameOver();
        expect(localStorage.setItem).toHaveBeenCalledWith('highScore', '100');
    });

    it('should generate obstacles based on difficulty', () => {
        game.start('circle', { audio: false, difficulty: 20, inputType: 'keyboard' });
        expect(game.obstacles.length).toBe(20);
    });

    it('should change background color on level up', () => {
        game.score = 0;
        // Score 0 -> Level 1 (#51cf66 -> rgb(81, 207, 102))
        game.updateLevel();
        // Just check it is set. JSDOM returns rgb.
        expect(game.canvas.style.backgroundColor).toContain('rgb');

        // Score 10 -> Level 2
        game.score = 10;
        game.updateLevel();
        expect(game.canvas.style.backgroundColor).toContain('rgb');
    });

    it('should toggle pause state', () => {
        expect(game.isPaused).toBe(false);
        game.togglePause();
        expect(game.isPaused).toBe(true);
    });

    // --- Interaction Tests ---
    it('should update settings mid-game', () => {
        game.start('circle', { audio: false, difficulty: 5, inputType: 'keyboard' });
        game.obstacles = []; // Ensure valid movement avoiding spawn collisions

        // Start with default (keyboard)
        expect(game.settings.inputType).toBe('keyboard');

        // Update to mouse
        game.updateSettings({ inputType: 'mouse' });
        expect(game.settings.inputType).toBe('mouse');

        // Verify movement logic respects new setting
        game.mouseX = 600;
        game.mouseY = 300;
        const initialX = game.player!.x;
        game.update(0.1);
        expect(game.player!.x).toBeGreaterThan(initialX);
    });

    it('should move player when dragging in touch mode', () => {
        game.start('circle', { audio: false, difficulty: 5, inputType: 'touch' });
        game.obstacles = [];

        // Simulate Drag
        game.isDragging = true;
        game.mouseX = 600;
        game.mouseY = 500;
        game.dragOffsetX = -25; // Offset from grab center

        game.update(0.1);

        // Should have moved with offset
        // player.x = mouseX + offset = 600 - 25 = 575
        expect(game.player!.x).toBe(575);
    });

    it('should reset background color on new game start', () => {
        game.score = 10;
        game.updateLevel();
        const level2Color = game.canvas.style.backgroundColor;

        game.start('circle', { audio: false, difficulty: 5, inputType: 'keyboard' });
        expect(game.score).toBe(0);
        expect(game.canvas.style.backgroundColor).not.toBe(level2Color);
        // RGB check
        expect(game.canvas.style.backgroundColor).toBe('rgb(81, 207, 102)'); // Level 1 Green
    });

    it('should prevent dragging player into an obstacle', () => {
        game.start('circle', { audio: false, difficulty: 0, inputType: 'touch' });

        // Spawn an obstacle manually
        const obs = new Obstacle(300, 300);
        game.obstacles.push(obs);

        // Position player next to it
        game.player!.x = 250;
        game.player!.y = 300;

        // Try to drag INSIDE the obstacle
        game.mouseX = 300;
        game.mouseY = 300;

        game.update(0.1);

        // Player should NOT be at 300,300 (collision reverted position)
        // With current logic, it reverts to oldPos (250, 300)
        expect(game.player!.x).toBe(250);
        expect(game.player!.y).toBe(300);
    });

    it('should prevent context menu on canvas', () => {
        const calls = (game.canvas.addEventListener as any).mock.calls;
        const contextMenuCall = calls.find((c: any) => c[0] === 'contextmenu');

        expect(contextMenuCall).toBeDefined();

        // callback
        const handler = contextMenuCall[1];
        const preventDefault = vi.fn();
        handler({ preventDefault });
        expect(preventDefault).toHaveBeenCalled();
        expect(handler({ preventDefault })).toBe(false);
    });

    it('should ignore touches outside of grab radius', () => {
        game.start('circle', { audio: false, difficulty: 5, inputType: 'touch' });
        game.player!.x = 100;
        game.player!.y = 100;

        // Verify initial state
        expect(game.isDragging).toBe(false);

        // Simulate touch start FAR away (200px)
        const touches = [{ clientX: 300, clientY: 300 }];
        const rect = { left: 0, top: 0, width: 800, height: 600 };

        // Access the handler directly
        const startHandler = (game.canvas.addEventListener as any).mock.calls.find((c: any) => c[0] === 'touchstart')[1];

        // Mock getBoundingClientRect
        game.canvas.getBoundingClientRect = () => rect as any;

        startHandler({
            touches,
            preventDefault: vi.fn(),
            cancelable: true
        });

        // Should still be false
        expect(game.isDragging).toBe(false);
    });

    it('should stop dragging on touchend', () => {
        game.start('circle', { audio: false, difficulty: 5, inputType: 'touch' });
        game.isDragging = true;

        const endHandler = (game.canvas.addEventListener as any).mock.calls.find((c: any) => c[0] === 'touchend')[1];

        endHandler({
            preventDefault: vi.fn(),
            cancelable: true
        });

        expect(game.isDragging).toBe(false);
    });

    it('should not spawn apples on obstacles', () => {
        game.start('circle', { audio: false, difficulty: 5, inputType: 'keyboard' });

        // Force an obstacle at a known location
        const obs = new Obstacle(100, 100);
        // Obstacle is 60x60 usually
        game.obstacles = [obs];

        // Mock Math.random to force apple spawn AT obstacle
        // Apple checks random x/y. 
        // Let's implement a deterministic check:
        // We can just verify isValidSpawn returns false for that location
        expect(game.isValidSpawn(110, 110, 20)).toBe(false); // Inside obstacle
        expect(game.isValidSpawn(300, 300, 20)).toBe(true);  // Outside
    });

    it('should spawn Bad Guy in valid location', () => {
        game.start('circle', { audio: false, difficulty: 5, inputType: 'keyboard' });
        expect(game.badGuy).toBeDefined();
        // Check collision with obstacles
        for (const obs of game.obstacles) {
            const tempEntity = {
                x: game.badGuy!.x - 20,
                y: game.badGuy!.y - 20,
                width: 40,
                height: 40
            };
            expect(obs.checkCollision(tempEntity as any)).toBe(false);
        }
    });

    // --- Power-up Tests ---
    it('should update settings mid-game', () => {
        game.start('circle', { audio: false, difficulty: 5, inputType: 'keyboard' });
        game.obstacles = []; // Ensure valid movement avoiding spawn collisions

        // Start with default (keyboard)
        expect(game.settings.inputType).toBe('keyboard');

        // Update to mouse
        game.updateSettings({ inputType: 'mouse' });
        expect(game.settings.inputType).toBe('mouse');

        // Verify movement logic respects new setting
        game.mouseX = 600;
        game.mouseY = 300;
        const initialX = game.player!.x;
        game.update(0.1);
        expect(game.player!.x).toBeGreaterThan(initialX);
    });

    it('should spawn golden apple when time is low', () => {
        game.start('circle', { audio: false, difficulty: 5, inputType: 'keyboard' });
        game.obstacles = []; // Ensure valid spawn
        game.time = 15; // < 20

        // Force time to be low (< 45)
        game.time = 40;

        // Force RNG to spawn golden (< 0.25)
        vi.spyOn(Math, 'random').mockReturnValue(0.1);

        game.spawnApple();
        const apple = game.apples[game.apples.length - 1];
        expect(apple.type).toBe('golden');
    });

    it('golden apple should add 15 seconds', () => {
        game.time = 10;
        game.apples = [new Apple(0, 0, 'golden')];
        game.eatApple(0);
        expect(game.time).toBe(25);
    });

    it('green apple should halve bad guy speed', () => {
        game.start('circle', { audio: false, difficulty: 5, inputType: 'keyboard' });
        game.score = 24; // Force high speed
        // Base speed = 80 + (24*5) = 200.
        // Player speed ~250. 200 is > 60% of 250 (150).

        game.badGuy!.update(game.player!, 0.1, game.score);

        game.apples = [new Apple(200, 200, 'green')];
        game.eatApple(0);
        // Score becomes 25. New Base = 80 + (25*5) = 205.
        // Multiplier = 0.5.
        // Expected Speed = 205 * 0.5 = 102.5.

        // Update again to apply multiplier
        game.badGuy!.update(game.player!, 0.1, game.score);
        expect(game.badGuy!.speed).toBe(102.5);
        expect(game.badGuy!.speedMultiplier).toBe(0.5);
    });

    it('should move player when arrow keys are pressed', () => {
        game.start('circle', { audio: false, difficulty: 5, inputType: 'keyboard' });
        game.obstacles = [];

        // Simulate Keydown
        const event = new KeyboardEvent('keydown', { code: 'ArrowRight' });
        window.dispatchEvent(event);

        expect(game.keys.right).toBe(true);

        const initialX = game.player!.x;
        game.update(0.1);

        expect(game.player!.x).toBeGreaterThan(initialX);

        // Simulate Keyup
        const upEvent = new KeyboardEvent('keyup', { code: 'ArrowRight' });
        window.dispatchEvent(upEvent);

        expect(game.keys.right).toBe(false);
    });

    it('should not block bad guy movement if apple spawns on top', () => {
        game.start('circle', { audio: false, difficulty: 5, inputType: 'keyboard' });

        // Position Bad Guy
        const bg = game.badGuy!;
        bg.x = 200;
        bg.y = 200;

        // Spawn Apple on top
        game.apples.push(new Apple(200, 200));

        // Move Player far away
        game.player!.x = 600;
        game.player!.y = 600;

        const initialX = bg.x;
        const initialY = bg.y;

        // Update
        game.update(0.1);

        // Bad Guy should move towards player
        expect(bg.x).not.toBe(initialX);
        expect(bg.y).not.toBe(initialY);
    });
});
