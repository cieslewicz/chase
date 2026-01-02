import './style.css'
import { Game } from './game/Game'
import { UIManager } from './ui/UIManager'

// HTML Structure
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="hud">
    <div id="score">Score: 0</div>
    <div id="time">Time: 60</div>
  </div>
  <canvas id="gameCanvas"></canvas>
  
  <div id="start-screen" class="screen">
    <h1>Chase</h1>
    <h2 class="subtitle">Choose a character</h2>
    <div class="character-select">
      <div class="char-option selected" data-char="circle">
        <img src="assets/player_circle.svg" alt="Circle" />
      </div>
      <div class="char-option" data-char="square">
        <img src="assets/player_square.svg" alt="Square" />
      </div>
      <div class="char-option" data-char="triangle">
        <img src="assets/player_triangle.svg" alt="Triangle" />
      </div>
      <div class="char-option" data-char="star">
        <img src="assets/player_star.svg" alt="Star" />
      </div>
    </div>
    <button id="btn-start">Start Game</button>
    <button id="btn-settings">Settings</button>
    <p class="instructions">
      Control your character with the arrow keys to eat as many apples as you can and avoid the bad guy.
      <br>
      You can switch to mouse control in the Settings menu.
    </p>
  </div>

  <div id="game-over-screen" class="screen hidden">
    <h1>Game Over</h1>
    <h2 id="final-score">Score: 0</h2>
    <h3 id="high-score-display">High Score: 0</h3>
    <button id="btn-restart">Play Again</button>
    <button id="btn-home">Main Menu</button>
  </div>
  
  <div id="pause-screen" class="screen hidden">
    <h1>Paused</h1>
    <button id="btn-resume">Continue</button>
    <button id="btn-pause-settings">Settings</button>
    <button id="btn-quit">Quit</button>
  </div>

  <div id="settings-screen" class="screen hidden">
    <h1>Settings</h1>
    <div class="setting-row">
      <label for="audio-toggle">Sound Effects</label>
      <input type="checkbox" id="audio-toggle" checked />
    </div>
    <div class="setting-row">
      <label for="difficulty-select">Difficulty (Obstacles)</label>
      <select id="difficulty-select">
        <option value="5">Easy (5)</option>
        <option value="10" selected>Medium (10)</option>
        <option value="20">Hard (20)</option>
      </select>
    </div>
    <div class="setting-row">
      <label for="input-select">Controls</label>
      <select id="input-select">
        <option value="keyboard" selected>Keyboard (Arrows/WASD)</option>
        <option value="mouse">Mouse (Follow Cursor)</option>
      </select>
    </div>
    <button id="btn-settings-back">Back</button>
  </div>
`

// Initialize Game
const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const game = new Game(canvas);
const ui = new UIManager(game);

ui.init();
