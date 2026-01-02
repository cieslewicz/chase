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
        global.window = {
            innerWidth: 800,
            innerHeight: 600,
            addEventListener: vi.fn(),
            AudioContext: vi.fn().mockImplementation(() => ({
                createOscillator: () => ({ connect: vi.fn(), start: vi.fn(), stop: vi.fn(), frequency: { value: 0 } }),
                createGain: () => ({ connect: vi.fn(), gain: { exponentialRampToValueAtTime: vi.fn() } }),
                destination: {}
            })),
            localStorage: { getItem: () => null, setItem: vi.fn() }
        } as any;

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
        game.mouseX = 500;
        game.mouseY = 300;

        const initialX = game.player!.x;
        game.update(0.1);

        expect(game.player!.x).toBeGreaterThan(initialX);
        expect(game.player!.vx).toBeGreaterThan(0);
    });
});
