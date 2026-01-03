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

        game = new Game(canvas);
        game.start('circle', { audio: false, difficulty: 5, inputType: 'keyboard' });
    });

    it('should initialize with correct score and time', () => {
        expect(game.score).toBe(0);
        expect(game.time).toBe(60);
        expect(game.isRunning).toBe(true);
    });

    it('should generate obstacles', () => {
        expect(game.obstacles.length).toBe(5);
    });

    it('should spawn apples', () => {
        game.spawnApple();
        expect(game.apples.length).toBe(1);
    });

    it('should increment score when eating apple', () => {
        game.spawnApple();
        const apple = game.apples[0];
        // Move player to apple
        game.player!.x = apple.x;
        game.player!.y = apple.y;

        game.update(0.1); // Update logic

        expect(game.score).toBe(1);
        expect(game.time).toBeCloseTo(60.9); // +1 second minus 0.1s elapsed
        expect(game.apples.length).toBe(0); // Apple eaten
    });

    it('should reduce time on update', () => {
        game.update(1.0);
        expect(game.time).toBe(59);
    });

    it('should trigger game over when time runs out', () => {
        let gameOverCalled = false;
        game.onGameOver = () => { gameOverCalled = true; };

        game.time = 0.5;
        game.update(1.0);

        expect(game.time).toBe(0);
        expect(game.isRunning).toBe(false);
        expect(gameOverCalled).toBe(true);
    });
    it('should move player towards mouse position when inputType is mouse', () => {
        game.start('circle', { audio: false, difficulty: 5, inputType: 'mouse' });
        game.obstacles = []; // Clear obstacles to ensure valid movement

        // Mock mouse position
        game.mouseX = 400;
        game.mouseY = 300;

        // Assert initial position (center)
        // Canvas center is 400, 300
        // Player center starts at 400, 300
        // Set mouse to somewhere else to test movement
        // JSDOM default width is 1024, so player starts at 512.
        // We want to move right, so target > 512.
        game.mouseX = 600;
        game.mouseY = 300;

        const initialX = game.player!.x;
        game.update(0.1);

        expect(game.player!.x).toBeGreaterThan(initialX);
        expect(game.player!.vx).toBeGreaterThan(0);
    });

    it('should scale Bad Guy speed with score', () => {
        const initialSpeed = game.badGuy!.speed;
        game.score = 10;
        game.badGuy!.update(game.player!, 0.1, game.score);
        expect(game.badGuy!.speed).toBeGreaterThan(initialSpeed);
    });

    it('should trigger game over on collision with Bad Guy', () => {
        let gameOverCalled = false;
        game.onGameOver = () => { gameOverCalled = true; };

        // Move player to bad guy
        game.player!.x = game.badGuy!.x;
        game.player!.y = game.badGuy!.y;

        game.update(0.1);

        expect(game.isRunning).toBe(false);
        expect(gameOverCalled).toBe(true);
    });

    it('should save high score', () => {
        game.score = 100;
        game.highScore = 50;
        game.gameOver();
        expect(localStorage.setItem).toHaveBeenCalledWith('highScore', '100');
    });

    it('should generate obstacles based on difficulty', () => {
        game.start('circle', { audio: false, difficulty: 20, inputType: 'keyboard' });
        expect(game.obstacles.length).toBe(20);
    });

    it('should change background color on level up', () => {
        // Mock style
        (game.canvas as any).style = { backgroundColor: '' };

        // Score 0 -> Level 1
        game.updateLevel();
        expect(game.canvas.style.backgroundColor).toBe('#51cf66');

        // Score 10 -> Level 2
        game.score = 10;
        game.updateLevel();
        expect(game.canvas.style.backgroundColor).toBe('#4dabf7');

        // Score 25 -> Level 3
        game.score = 25;
        game.updateLevel();
        expect(game.canvas.style.backgroundColor).toBe('#cc5de8');
    });

    it('should toggle pause state', () => {
        let pauseState = false;
        game.onPause = (p) => pauseState = p;

        game.togglePause();
        expect(game.isPaused).toBe(true);
        expect(pauseState).toBe(true);

        game.togglePause();
        expect(game.isPaused).toBe(false);
        expect(pauseState).toBe(false);
    });

    it('should update settings mid-game', () => {
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

        // Simulate dragged state manually
        game.isDragging = true;
        const offset = game.player!.width / 2;
        game.dragOffsetX = -offset;
        game.dragOffsetY = -offset;

        // Move Mouse
        game.mouseX = 600;
        game.mouseY = 500;

        game.update(0.1);

        // Should have moved with offset
        expect(game.player!.x).toBe(600 - offset);
        expect(game.player!.y).toBe(500 - offset);
    });

    it('should reset background color on new game start', () => {
        // Set to high level
        game.score = 20;
        game.updateLevel();
        const level3Color = game.canvas.style.backgroundColor;

        // Restart game
        game.start('circle', { audio: false, difficulty: 5, inputType: 'keyboard' });

        // Should be level 1 color
        expect(game.score).toBe(0);
        expect(game.canvas.style.backgroundColor).not.toBe(level3Color);
        expect(game.canvas.style.backgroundColor).toBe(game.levelColors[0]);
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
    it('should spawn golden apple when time is low', () => {
        game.start('circle', { audio: false, difficulty: 5, inputType: 'keyboard' });
        game.time = 15; // < 20

        // Mock random to hit golden apple chance (< 0.2)
        // Default Math.random() is hard to mock deterministically directly in JSDOM environment without library
        // But we can monkey patch it temporarily if needed, or stub it with vi.spyOn(Math, 'random')

        const randomSpy = vi.spyOn(Math, 'random');
        // 1st call: spawn location X (ok)
        // 2nd call: spawn location Y (ok)
        // 3rd call: Apple Type chance. make it 0.1 (< 0.2)
        randomSpy.mockReturnValueOnce(0.5).mockReturnValueOnce(0.5).mockReturnValueOnce(0.1);

        game.spawnApple();
        const apple = game.apples[game.apples.length - 1];
        expect(apple.type).toBe('golden');

        randomSpy.mockRestore();
    });

    it('golden apple should add 15 seconds', () => {
        game.start('circle', { audio: false, difficulty: 5, inputType: 'keyboard' });
        game.apples = [new Apple(200, 200, 'golden')];
        game.time = 10;

        game.eatApple(0);
        expect(game.time).toBe(25); // 10 + 15
    });

    it('green apple should halve bad guy speed', () => {
        game.start('circle', { audio: false, difficulty: 5, inputType: 'keyboard' });
        game.score = 24; // Force high speed
        // Base speed = 80 + (24*5) = 200.

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
});
