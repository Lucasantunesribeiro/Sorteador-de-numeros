import { audio } from '../audio.js';
import { showToast } from '../ui.js';
import { addStat, stats, checkAchievements } from '../stats.js';

const COLORS = [
  { id: 'red',    hex: '#ef4444', label: 'Vermelho' },
  { id: 'blue',   hex: '#3b82f6', label: 'Azul'     },
  { id: 'green',  hex: '#10b981', label: 'Verde'    },
  { id: 'yellow', hex: '#f59e0b', label: 'Amarelo'  },
  { id: 'purple', hex: '#8b5cf6', label: 'Roxo'     },
  { id: 'orange', hex: '#f97316', label: 'Laranja'  }
];

const MAX_TURNS = 10;
const CODE_LEN  = 4;

const state = {
  secret:       [],
  currentGuess: [null, null, null, null],
  history:      [],
  turn:         1,
  active:       false,
  selectedSlot: 0
};

function _colorByid(id) {
  return COLORS.find(c => c.id === id);
}

function _evaluate(guess, secret) {
  let blacks = 0, whites = 0;
  const s = [...secret], g = [...guess];
  for (let i = 0; i < CODE_LEN; i++) {
    if (g[i] === s[i]) { blacks++; s[i] = null; g[i] = null; }
  }
  for (let i = 0; i < CODE_LEN; i++) {
    if (g[i] === null) continue;
    const idx = s.indexOf(g[i]);
    if (idx !== -1) { whites++; s[idx] = null; }
  }
  return { blacks, whites };
}

function newGame() {
  state.secret       = Array.from({ length: CODE_LEN }, () => COLORS[Math.floor(Math.random() * COLORS.length)].id);
  state.currentGuess = [null, null, null, null];
  state.history      = [];
  state.turn         = 1;
  state.active       = true;
  state.selectedSlot = 0;

  const best = stats.games.mastermind?.bestTurns;
  document.getElementById('mmTurn').textContent = state.turn;
  document.getElementById('mmBest').textContent = best ?? '-';
  document.getElementById('mmWins').textContent = stats.games.mastermind?.won ?? 0;

  _renderBoard();
  _renderCurrentGuess();
  _buildPalette();
  _updateSubmitBtn();

  audio.play('click');
}

function _buildPalette() {
  const palette = document.getElementById('mmPalette');
  palette.innerHTML = '';
  COLORS.forEach(color => {
    const btn = document.createElement('button');
    btn.className     = 'mm-color-btn';
    btn.title         = color.label;
    btn.dataset.color = color.id;
    btn.style.setProperty('--peg-color', color.hex);
    btn.addEventListener('click', () => _selectColor(color.id));
    palette.appendChild(btn);
  });
}

function _selectColor(colorId) {
  if (!state.active) return;

  // Find next empty slot, or overwrite selectedSlot
  let slot = state.currentGuess.indexOf(null);
  if (slot === -1) slot = state.selectedSlot;

  state.currentGuess[slot] = colorId;
  state.selectedSlot = Math.min(slot + 1, CODE_LEN - 1);

  _renderCurrentGuess();
  _updateSubmitBtn();
  audio.play('peg');
}

function _clearSlot(slotIndex) {
  if (!state.active) return;
  state.currentGuess[slotIndex] = null;
  state.selectedSlot = slotIndex;
  _renderCurrentGuess();
  _updateSubmitBtn();
  audio.play('click');
}

function _renderCurrentGuess() {
  const slots = document.querySelectorAll('.mm-peg-slot');
  slots.forEach((slot, i) => {
    const colorId = state.currentGuess[i];
    if (colorId) {
      const c = _colorByid(colorId);
      slot.style.setProperty('--peg-color', c.hex);
      slot.classList.add('filled');
      slot.dataset.color = colorId;
    } else {
      slot.style.removeProperty('--peg-color');
      slot.classList.remove('filled');
      delete slot.dataset.color;
    }
    slot.classList.toggle('active-slot', i === state.selectedSlot && state.active);
  });
}

function _updateSubmitBtn() {
  const btn = document.getElementById('mmSubmit');
  if (!btn) return;
  btn.disabled = !state.active || state.currentGuess.includes(null);
}

function _submitGuess() {
  if (!state.active || state.currentGuess.includes(null)) return;

  const guess    = [...state.currentGuess];
  const feedback = _evaluate(guess, state.secret);

  state.history.push({ guess, feedback });
  _renderBoard();

  if (feedback.blacks === CODE_LEN) {
    // Win!
    state.active = false;
    audio.playWin();
    addStat('mastermind', true, state.turn);
    checkAchievements('mastermind', state.turn);
    _revealSecret(true);
    showToast(`Voce decifrou o codigo em ${state.turn} turnos!`, 'success', 4000);
    document.getElementById('mmTurn').textContent = '✓';
    return;
  }

  if (state.turn >= MAX_TURNS) {
    state.active = false;
    audio.play('error');
    addStat('mastermind', false);
    _revealSecret(false);
    showToast('Game Over! O codigo foi revelado.', 'error', 4000);
    return;
  }

  state.turn++;
  state.currentGuess = [null, null, null, null];
  state.selectedSlot = 0;
  document.getElementById('mmTurn').textContent = state.turn;
  _renderCurrentGuess();
  _updateSubmitBtn();
  audio.play('flip');
}

function _renderBoard() {
  const board = document.getElementById('mmBoard');
  board.innerHTML = '';

  // Render history (oldest first)
  state.history.forEach(({ guess, feedback }, idx) => {
    const row = document.createElement('div');
    row.className = 'mm-row mm-row-done';
    row.innerHTML = `
      <span class="mm-turn-num">${idx + 1}</span>
      <div class="mm-pegs">
        ${guess.map(id => {
          const c = _colorByid(id);
          return `<div class="mm-peg" style="--peg-color:${c.hex}" title="${c.label}"></div>`;
        }).join('')}
      </div>
      <div class="mm-feedback">
        ${Array.from({ length: feedback.blacks }, () => '<div class="mm-fb-peg black"></div>').join('')}
        ${Array.from({ length: feedback.whites }, () => '<div class="mm-fb-peg white"></div>').join('')}
        ${Array.from({ length: CODE_LEN - feedback.blacks - feedback.whites }, () => '<div class="mm-fb-peg empty"></div>').join('')}
      </div>
    `;
    board.appendChild(row);
  });

  // Scroll to bottom
  board.scrollTop = board.scrollHeight;
}

function _revealSecret(won) {
  const secretEl = document.getElementById('mmSecretReveal');
  if (!secretEl) return;

  secretEl.innerHTML = `
    <div class="mm-secret-row ${won ? 'won' : 'lost'}">
      <span class="mm-secret-label">${won ? 'Parabens!' : 'Codigo era:'}</span>
      <div class="mm-pegs">
        ${state.secret.map(id => {
          const c = _colorByid(id);
          return `<div class="mm-peg" style="--peg-color:${c.hex}" title="${c.label}"></div>`;
        }).join('')}
      </div>
    </div>
  `;
  secretEl.style.display = 'block';
}

export function initMastermind() {
  document.getElementById('mmSubmit').addEventListener('click', _submitGuess);
  document.getElementById('mmNewGame').addEventListener('click', () => {
    document.getElementById('mmSecretReveal').style.display = 'none';
    newGame();
  });

  // Allow clicking slots to clear them
  document.querySelectorAll('.mm-peg-slot').forEach((slot, i) => {
    slot.addEventListener('click', () => _clearSlot(i));
  });

  newGame();
}
