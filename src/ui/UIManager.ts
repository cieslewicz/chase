import { Game } from '../game/Game';

export class UIManager {
    game: Game;

    startScreen: HTMLElement;
    gameOverScreen: HTMLElement;
    settingsScreen: HTMLElement;
    pauseScreen: HTMLElement;

    scoreEl: HTMLElement;
    timeEl: HTMLElement;
    finalScoreEl: HTMLElement;
    highScoreDisplayEl: HTMLElement;

    selectedChar: string = 'circle';

    constructor(game: Game) {
        this.game = game;

        // Screens
        this.startScreen = document.getElementById('start-screen')!;
        this.gameOverScreen = document.getElementById('game-over-screen')!;
        this.settingsScreen = document.getElementById('settings-screen')!;
        this.pauseScreen = document.getElementById('pause-screen')!;

        // HUD
        this.scoreEl = document.getElementById('score')!;
        this.timeEl = document.getElementById('time')!;

        // Game Over Elements
        this.finalScoreEl = document.getElementById('final-score')!;
        this.highScoreDisplayEl = document.getElementById('high-score-display')!;

        // Bind Game Callbacks
        this.game.onScoreUpdate = (s) => this.scoreEl.innerText = `Score: ${s}`;
        this.game.onTimeUpdate = (t) => this.timeEl.innerText = `Time: ${t}`;
        this.game.onGameOver = (s) => this.showGameOver(s);
        this.game.onPause = (p) => this.togglePauseScreen(p);
    }

    init() {
        // Character Selection
        const charOptions = document.querySelectorAll('.char-option');
        charOptions.forEach(opt => {
            opt.addEventListener('click', () => {
                charOptions.forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                this.selectedChar = (opt as HTMLElement).dataset.char || 'circle';
            });
        });

        // Buttons
        document.getElementById('btn-start')?.addEventListener('click', () => this.startGame());
        document.getElementById('btn-settings')?.addEventListener('click', () => this.showSettings(false));
        document.getElementById('btn-restart')?.addEventListener('click', () => this.restartGame());
        document.getElementById('btn-home')?.addEventListener('click', () => this.showStartScreen());
        document.getElementById('btn-settings-back')?.addEventListener('click', () => this.hideSettings());

        // Pause Buttons
        document.getElementById('btn-resume')?.addEventListener('click', () => this.game.togglePause()); // Resume
        document.getElementById('btn-pause-settings')?.addEventListener('click', () => this.showSettings(true));
        document.getElementById('btn-quit')?.addEventListener('click', () => this.quitGame());

        this.checkMobile();
        this.setupGlobalListeners();
    }

    setupGlobalListeners() {
        // Global Prevention of Scrolling on Mobile
        const preventDefault = (e: Event) => e.preventDefault();
        // Only block touchmove to prevent scrolling, allow touchstart for buttons
        document.body.addEventListener('touchmove', preventDefault, { passive: false });
        document.body.addEventListener('contextmenu', preventDefault);
    }

    checkMobile() {
        const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const instructions = document.querySelector('.instructions');
        const inputSelect = document.getElementById('input-select') as HTMLSelectElement;

        if (isTouch) {
            // Update Text
            if (instructions) {
                instructions.innerHTML = `
                    Drag your character with your finger to eat apples and avoid the bad guy.
                    <br>
                    You can change controls in the Settings menu.
                `;
            }
            // Add Touch Option and Select it
            if (inputSelect) {
                // Check if already exists
                if (!inputSelect.querySelector('option[value="touch"]')) {
                    const opt = document.createElement('option');
                    opt.value = 'touch';
                    opt.textContent = 'Touch (Drag)';
                    inputSelect.appendChild(opt);
                }
                inputSelect.value = 'touch';
            }
        }
    }

    getSettings() {
        const audioEnabled = (document.getElementById('audio-toggle') as HTMLInputElement).checked;
        const difficulty = parseInt((document.getElementById('difficulty-select') as HTMLInputElement).value);
        const inputType = (document.getElementById('input-select') as HTMLInputElement).value;
        return { audio: audioEnabled, difficulty, inputType };
    }

    startGame() {
        this.startScreen.classList.add('hidden');
        this.gameOverScreen.classList.add('hidden');

        this.game.start(this.selectedChar, this.getSettings());
    }

    showSettings(isInGame: boolean) {
        this.settingsScreen.classList.remove('hidden');
        // Disable difficulty if in game
        const diffSelect = document.getElementById('difficulty-select') as HTMLSelectElement;
        diffSelect.disabled = isInGame;
        if (isInGame) {
            this.pauseScreen.classList.add('hidden'); // Hide pause behind settings
        }
    }

    hideSettings() {
        this.settingsScreen.classList.add('hidden');

        // Apply settings immediately
        this.game.updateSettings(this.getSettings());

        if (this.game.isPaused && this.game.isRunning) {
            this.pauseScreen.classList.remove('hidden'); // Show pause again
        }
    }

    togglePauseScreen(isPaused: boolean) {
        if (isPaused) {
            this.pauseScreen.classList.remove('hidden');
        } else {
            this.pauseScreen.classList.add('hidden');
            this.settingsScreen.classList.add('hidden'); // Ensure settings also closed
        }
    }

    quitGame() {
        this.game.isRunning = false; // Stop game loop logic
        this.game.isPaused = false;
        this.pauseScreen.classList.add('hidden');
        this.showStartScreen();
    }

    showGameOver(score: number) {
        this.finalScoreEl.innerText = `Score: ${score}`;
        this.highScoreDisplayEl.innerText = `High Score: ${this.game.highScore}`;
        this.gameOverScreen.classList.remove('hidden');
    }

    restartGame() {
        this.startGame();
    }

    showStartScreen() {
        this.gameOverScreen.classList.add('hidden');
        this.startScreen.classList.remove('hidden');
        this.game.isRunning = false;
    }
}
