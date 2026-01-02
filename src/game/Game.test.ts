/// <reference types="vitest" />
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Game } from './Game';
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

    it('should move player directly to mouse position when inputType is touch', () => {
        game.start('circle', { audio: false, difficulty: 5, inputType: 'touch' });

        // Mock Input
        game.mouseX = 500;
        game.mouseY = 400;

        game.update(0.1);

        // Should be at mouse position (minus radius/offset)
        const offset = game.player!.width / 2;
        expect(game.player!.x).toBe(500 - offset);
        expect(game.player!.y).toBe(400 - offset);
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
});
