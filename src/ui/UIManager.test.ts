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
            <div id="start-screen"></div>
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
});
