import { audio } from '../audio.js';
import { showToast } from '../ui.js';
import { addStat, stats, checkAchievements } from '../stats.js';

const ALL_COLORS = [
  { id: 'red', hex: 'hsl(0, 100%, 61%)', label: 'Vermelho' },
  { id: 'blue', hex: 'hsl(211, 100%, 50%)', label: 'Azul' },
  { id: 'green', hex: 'hsl(142, 70%, 50%)', label: 'Verde' },
  { id: 'yellow', hex: 'hsl(48, 100%, 50%)', label: 'Amarelo' },
  { id: 'purple', hex: 'hsl(262, 70%, 65%)', label: 'Roxo' },
  { id: 'orange', hex: 'hsl(24, 100%, 50%)', label: 'Laranja' },
  { id: 'cyan', hex: 'hsl(180, 100%, 45%)', label: 'Ciano' },
  { id: 'pink', hex: 'hsl(330, 100%, 65%)', label: 'Rosa' }
];

const state = {
  mode: 'player_guess', // 'player_guess' or 'pc_guess'
  pegs: 4,
  colorsCount: 6,
  activeColors: [],
  secret: [],
  currentGuess: [],
  history: [],
  turn: 1,
  maxTurns: 10,
  isPlaying: false,
  allPossibleCodes: [] // Used for AI
};

// --- Initialization ---

export function initMastermind() {
  // Settings Listeners
  const applyBtn = document.getElementById('mmApplySettings');
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      applyMastermindSettings();
      audio.play('click');
    });
  }

  // Palette Interaction
  const palette = document.getElementById('mmPalette');
  if (palette) {
    palette.addEventListener('click', (e) => {
      const peg = e.target.closest('.color-peg');
      if (peg && state.isPlaying) {
        const colorIdx = parseInt(peg.dataset.colorIdx);
        const colorId = state.activeColors[colorIdx].id;

        if (state.mode === 'player_guess') {
          addPegToGuess(colorId);
        } else if (state.mode === 'pc_guess' && document.getElementById('mmSetupSecret').style.display !== 'none') {
          addPegToSetup(colorId);
        }
      }
    });
  }

  // Controls
  const submitBtn = document.getElementById('mmSubmit');
  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      if (state.mode === 'player_guess') submitPlayerGuess();
      else if (state.mode === 'pc_guess') submitPCSetup();
    });
  }

  const newGameBtn = document.getElementById('mmNewGame');
  if (newGameBtn) {
    newGameBtn.addEventListener('click', () => {
      newMastermindGame();
      audio.play('click');
    });
  }

  const confirmSetupBtn = document.getElementById('mmConfirmSetup');
  if (confirmSetupBtn) {
    confirmSetupBtn.addEventListener('click', () => {
      startPCDecipher();
    });
  }

  // Allow clicking current row slots to remove color
  document.getElementById('mmCurrentRow').addEventListener('click', (e) => {
    const slot = e.target.closest('.color-peg');
    if (slot && !slot.classList.contains('empty') && state.isPlaying && state.mode === 'player_guess') {
      const index = Array.from(slot.parentNode.children).indexOf(slot);
      state.currentGuess[index] = null;
      renderCurrentRow();
      audio.play('click');
    }
  });

  document.getElementById('mmSetupRow').addEventListener('click', (e) => {
    const slot = e.target.closest('.color-peg');
    if (slot && !slot.classList.contains('empty') && state.mode === 'pc_guess') {
      const index = Array.from(slot.parentNode.children).indexOf(slot);
      state.secret[index] = null;
      renderSetupRow();
      audio.play('click');
    }
  });

  // Start with default settings
  applyMastermindSettings(true);
}

// --- Logic Functions ---

function applyMastermindSettings(isInitial = false) {
  state.mode = document.getElementById('mmMode').value;
  state.pegs = parseInt(document.getElementById('mmPegs').value) || 4;
  state.colorsCount = parseInt(document.getElementById('mmColors').value) || 6;
  state.activeColors = ALL_COLORS.slice(0, state.colorsCount);
  state.maxTurns = state.pegs + (state.colorsCount - 4) + 6; // Balance turns based on difficulty

  document.getElementById('mmMaxTurns').textContent = state.maxTurns;

  // Update Best Score display
  const best = stats.games.mastermind?.bestTurns || '-';
  document.getElementById('mmBest').textContent = best;
  document.getElementById('mmWins').textContent = stats.games.mastermind?.won || 0;

  newMastermindGame();
  if (!isInitial) {
    showToast('Configurações Aplicadas', 'success');
  }
}

function newMastermindGame() {
  state.isPlaying = true;
  state.turn = 1;
  state.history = [];
  state.currentGuess = Array(state.pegs).fill(null);
  state.secret = [];

  document.getElementById('mmTurn').textContent = state.turn;
  document.getElementById('mmBoard').innerHTML = '';
  document.getElementById('mmSecretReveal').style.display = 'none';

  renderPalette();

  if (state.mode === 'player_guess') {
    state.secret = generateSecretCode(state.pegs, state.activeColors);
    document.getElementById('mmSetupSecret').style.display = 'none';
    document.getElementById('mmControlsArea').style.display = 'flex';
    renderCurrentRow();
  } else {
    state.secret = Array(state.pegs).fill(null);
    document.getElementById('mmSetupSecret').style.display = 'block';
    document.getElementById('mmControlsArea').style.display = 'none';
    renderSetupRow();
  }
}

function generateSecretCode(len, colors) {
  const code = [];
  for (let i = 0; i < len; i++) {
    code.push(colors[Math.floor(Math.random() * colors.length)].id);
  }
  return code;
}

function renderPalette() {
  const palette = document.getElementById('mmPalette');
  palette.innerHTML = '';
  state.activeColors.forEach((color, i) => {
    const peg = document.createElement('div');
    peg.className = 'color-peg interactive';
    peg.style.backgroundColor = color.hex;
    peg.dataset.colorIdx = i;
    peg.title = color.label;
    palette.appendChild(peg);
  });
}

function renderRow(containerId, colors, isStatic = false) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  colors.forEach(colorId => {
    const peg = document.createElement('div');
    if (colorId) {
      const color = ALL_COLORS.find(c => c.id === colorId);
      peg.className = 'color-peg';
      peg.style.backgroundColor = color.hex;
    } else {
      peg.className = 'color-peg empty';
    }
    container.appendChild(peg);
  });
}

function renderCurrentRow() {
  renderRow('mmCurrentRow', state.currentGuess);
  const btn = document.getElementById('mmSubmit');
  btn.disabled = state.currentGuess.includes(null);
}

function renderSetupRow() {
  renderRow('mmSetupRow', state.secret);
  const btn = document.getElementById('mmConfirmSetup');
  btn.disabled = state.secret.includes(null);
}

function addPegToGuess(colorId) {
  const firstEmpty = state.currentGuess.indexOf(null);
  if (firstEmpty !== -1) {
    state.currentGuess[firstEmpty] = colorId;
    renderCurrentRow();
    audio.play('peg');
  }
}

function addPegToSetup(colorId) {
  const firstEmpty = state.secret.indexOf(null);
  if (firstEmpty !== -1) {
    state.secret[firstEmpty] = colorId;
    renderSetupRow();
    audio.play('peg');
  }
}

function evaluateGuess(guess, secret) {
  let blacks = 0; // Correct color, correct position
  let whites = 0; // Correct color, wrong position

  const secretCopy = [...secret];
  const guessCopy = [...guess];

  // Check for blacks
  for (let i = 0; i < guessCopy.length; i++) {
    if (guessCopy[i] === secretCopy[i]) {
      blacks++;
      secretCopy[i] = null;
      guessCopy[i] = null;
    }
  }

  // Check for whites
  for (let i = 0; i < guessCopy.length; i++) {
    if (guessCopy[i] === null) continue;
    const idx = secretCopy.indexOf(guessCopy[i]);
    if (idx !== -1) {
      whites++;
      secretCopy[idx] = null;
    }
  }

  return { blacks, whites };
}

function submitPlayerGuess() {
  if (state.currentGuess.includes(null)) return;

  const feedback = evaluateGuess(state.currentGuess, state.secret);
  state.history.push({
    guess: [...state.currentGuess],
    feedback: feedback
  });

  renderBoardRow(state.turn, state.currentGuess, feedback);

  if (feedback.blacks === state.pegs) {
    endMastermindGame(true);
  } else if (state.turn >= state.maxTurns) {
    endMastermindGame(false);
  } else {
    state.turn++;
    state.currentGuess = Array(state.pegs).fill(null);
    document.getElementById('mmTurn').textContent = state.turn;
    renderCurrentRow();
    audio.play('flip');
  }
}

function renderBoardRow(turnNum, guess, feedback) {
  const board = document.getElementById('mmBoard');
  const row = document.createElement('div');
  row.className = 'mm-row mm-history-row';

  let html = `<span class="mm-turn-label">${turnNum}</span>`;

  // Pegs
  html += `<div class="mm-pegs">`;
  guess.forEach(colorId => {
    const color = ALL_COLORS.find(c => c.id === colorId);
    html += `<div class="color-peg" style="background-color: ${color.hex}"></div>`;
  });
  html += `</div>`;

  // Feedback
  html += `<div class="mm-feedback-grid">`;
  for (let i = 0; i < feedback.blacks; i++) html += `<div class="mm-fb-peg black"></div>`;
  for (let i = 0; i < feedback.whites; i++) html += `<div class="mm-fb-peg white"></div>`;
  const remaining = state.pegs - feedback.blacks - feedback.whites;
  for (let i = 0; i < remaining; i++) html += `<div class="mm-fb-peg empty"></div>`;
  html += `</div>`;

  row.innerHTML = html;
  board.appendChild(row);
  board.scrollTop = board.scrollHeight;
}

function endMastermindGame(win) {
  state.isPlaying = false;
  document.getElementById('mmSubmit').disabled = true;

  // Reveal Secret
  const secretRow = document.getElementById('mmSecretRow');
  secretRow.innerHTML = '';
  state.secret.forEach(colorId => {
    const color = ALL_COLORS.find(c => c.id === colorId);
    const peg = document.createElement('div');
    peg.className = 'color-peg';
    peg.style.backgroundColor = color.hex;
    secretRow.appendChild(peg);
  });
  document.getElementById('mmSecretReveal').style.display = 'block';

  if (win) {
    audio.playWin();
    showToast('CÓDIGO DECIFRADO! Você é um mestre.', 'success', 5000);
    addStat('mastermind', true, state.turn);
    checkAchievements('mastermind', state.turn);
  } else {
    audio.play('error');
    showToast('SISTEMA BLOQUEADO. A senha venceu.', 'error', 5000);
    addStat('mastermind', false);
  }

  // Update UI Stats
  document.getElementById('mmWins').textContent = stats.games.mastermind.won;
  document.getElementById('mmBest').textContent = stats.games.mastermind.bestTurns || '-';
}

// --- PC Decipher AI ---

function submitPCSetup() {
  if (state.secret.includes(null)) return;
  document.getElementById('mmSetupSecret').style.display = 'none';
  startPCDecipher();
}

function startPCDecipher() {
  state.isPlaying = true;
  state.turn = 1;
  state.history = [];
  document.getElementById('mmSetupSecret').style.display = 'none';
  document.getElementById('mmControlsArea').style.display = 'none';

  // Generate all possible combinations for the AI
  state.allPossibleCodes = generateAllCombinations(state.pegs, state.activeColors.map(c => c.id));

  runPCDecipherTurn();
}

function generateAllCombinations(len, colorIds) {
  const results = [];
  function backtrack(current) {
    if (current.length === len) {
      results.push([...current]);
      return;
    }
    for (const cId of colorIds) {
      current.push(cId);
      backtrack(current);
      current.pop();
    }
  }
  if (len <= 5) { // Limitation for performance
    backtrack([]);
  } else {
    // For >5 pegs, AI will be more "stochastic" or simpler (YAGNI for now, let's keep it simple)
    // Just provide a few random combinations to avoid crashing
    for (let i = 0; i < 5000; i++) {
      const code = [];
      for (let j = 0; j < len; j++) code.push(colorIds[Math.floor(Math.random() * colorIds.length)]);
      results.push(code);
    }
  }
  return results;
}

function runPCDecipherTurn() {
  if (!state.isPlaying) return;

  // AI logic: take a guess from possible codes
  // Minimax simplified (Knuth's algorithm would be too heavy for large pegs, using a heuristic)
  let guess;
  if (state.turn === 1) {
    // Initial guess (balanced)
    guess = [];
    const ids = state.activeColors.map(c => c.id);
    for (let i = 0; i < state.pegs; i++) guess.push(ids[Math.floor(i / (state.pegs / 2)) % ids.length]);
  } else {
    guess = state.allPossibleCodes[Math.floor(Math.random() * state.allPossibleCodes.length)];
  }

  const feedback = evaluateGuess(guess, state.secret);

  state.history.push({ guess, feedback });

  setTimeout(() => {
    renderBoardRow(state.turn, guess, feedback);
    audio.play('peg');

    if (feedback.blacks === state.pegs) {
      audio.play('error');
      showToast(`O PC decifrou seu código em ${state.turn} turnos!`, 'error');
      state.isPlaying = false;
    } else if (state.turn >= state.maxTurns) {
      audio.playWin();
      showToast('O PC falhou em decifrar seu código!', 'success');
      state.isPlaying = false;
    } else {
      // Filter possible codes
      state.allPossibleCodes = state.allPossibleCodes.filter(c => {
        const f = evaluateGuess(guess, c);
        return f.blacks === feedback.blacks && f.whites === feedback.whites;
      });

      state.turn++;
      document.getElementById('mmTurn').textContent = state.turn;
      runPCDecipherTurn();
    }
  }, 1200);
}
