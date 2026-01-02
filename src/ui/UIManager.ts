import { Game } from '../game/Game';

export class UIManager {
    game: Game;

    startScreen: HTMLElement;
    gameOverScreen: HTMLElement;
    settingsScreen: HTMLElement;

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
        document.getElementById('btn-settings')?.addEventListener('click', () => this.showSettings());
        document.getElementById('btn-restart')?.addEventListener('click', () => this.restartGame());
        document.getElementById('btn-home')?.addEventListener('click', () => this.showStartScreen());
        document.getElementById('btn-settings-back')?.addEventListener('click', () => this.hideSettings());
    }

    startGame() {
        this.startScreen.classList.add('hidden');
        this.gameOverScreen.classList.add('hidden');

        const audioEnabled = (document.getElementById('audio-toggle') as HTMLInputElement).checked;
        const difficulty = parseInt((document.getElementById('difficulty-select') as HTMLInputElement).value);

        this.game.start(this.selectedChar, { audio: audioEnabled, difficulty });
    }

    showSettings() {
        this.settingsScreen.classList.remove('hidden');
    }

    hideSettings() {
        this.settingsScreen.classList.add('hidden');
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
