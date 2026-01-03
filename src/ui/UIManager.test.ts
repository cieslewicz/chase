/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { UIManager } from './UIManager';
import { Game } from '../game/Game';

// Mock Game
const mockCanvas = document.createElement('canvas');
const mockGame = new Game(mockCanvas);

describe('UIManager', () => {
    let ui: UIManager;

    beforeEach(() => {
        // Mock document body addEventListener
        document.body.addEventListener = vi.fn();

        // Mock UI elements that UIManager expects
        document.body.innerHTML = `
            <div id="start-screen">
                <p class="instructions"></p>
            </div>
            <div id="game-over-screen"></div>
            <div id="settings-screen"></div>
            <div id="pause-screen"></div>
            <div id="score"></div>
            <div id="time"></div>
            <div id="final-score"></div>
            <div id="high-score-display"></div>
        `;

        ui = new UIManager(mockGame);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should setup global listeners correctly', () => {
        ui.setupGlobalListeners();

        // Check calls to document.body.addEventListener
        const calls = (document.body.addEventListener as any).mock.calls;

        // Verify touchmove is blocked (for scrolling)
        const touchMoveCall = calls.find((c: any) => c[0] === 'touchmove');
        expect(touchMoveCall).toBeDefined();
        if (touchMoveCall) {
            expect(touchMoveCall[2]).toEqual({ passive: false });
        }

        // Verify contextmenu is blocked
        const contextMenuCall = calls.find((c: any) => c[0] === 'contextmenu');
        expect(contextMenuCall).toBeDefined();

        // Verify touchstart is NOT blocked (this is the key fix for buttons)
        const touchStartCall = calls.find((c: any) => c[0] === 'touchstart');
        expect(touchStartCall).toBeUndefined();
    });

    it('should default to Easy difficulty on mobile', () => {
        // Mock Touch Environment
        Object.defineProperty(window, 'ontouchstart', {
            writable: true,
            value: true
        });

        // Mock Select Element
        const diffSelect = document.createElement('select');
        diffSelect.id = 'difficulty-select';
        diffSelect.innerHTML = `
            <option value="5">Easy</option>
            <option value="10" selected>Medium</option>
            <option value="20">Hard</option>
        `;
        document.body.appendChild(diffSelect);

        const inputSelect = document.createElement('select');
        inputSelect.id = 'input-select';
        inputSelect.innerHTML = `
            <option value="keyboard">Keyboard</option>
            <option value="mouse">Mouse</option>
        `;
        document.body.appendChild(inputSelect);

        ui.checkMobile();

        expect(diffSelect.value).toBe("5"); // Should change to Easy

        // Check inputs restricted
        const restrictedSelect = document.getElementById('input-select') as HTMLSelectElement;
        expect(restrictedSelect.options.length).toBe(1);
        expect(restrictedSelect.value).toBe('touch');

        // Check instructions
        const instructions = document.querySelector('.instructions') as HTMLElement;
        expect(instructions.innerHTML).toContain('Drag to move');
        expect(instructions.innerHTML).not.toContain('change controls');
    });
});
