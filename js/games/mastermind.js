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

const FEEDBACK_BY_SLOT_MIN = 4;
const FEEDBACK_COLUMNS = 2;

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
      const peg = e.target.closest('.mm-peg');
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
    const slot = e.target.closest('.mm-peg');
    if (slot && !slot.classList.contains('mm-peg-empty') && state.isPlaying && state.mode === 'player_guess') {
      const index = Array.from(slot.parentNode.children).indexOf(slot);
      state.currentGuess[index] = null;
      renderCurrentRow();
      audio.play('click');
    }
  });

  document.getElementById('mmSetupRow').addEventListener('click', (e) => {
    const slot = e.target.closest('.mm-peg');
    if (slot && !slot.classList.contains('mm-peg-empty') && state.mode === 'pc_guess') {
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
  // If game is in progress, ask for confirmation before resetting
  if (!isInitial && state.isPlaying && state.turn > 1) {
    if (!confirm('Um jogo está em andamento. Deseja aplicar novas configurações e reiniciar?')) {
      return;
    }
  }

  const pegsInput = document.getElementById('mmPegs');
  const colorsInput = document.getElementById('mmColors');
  const maxColors = ALL_COLORS.length;

  state.mode = document.getElementById('mmMode').value;
  state.pegs = Math.min(Math.max(parseInt(pegsInput.value, 10) || 4, 4), maxColors);
  state.colorsCount = Math.min(Math.max(parseInt(colorsInput.value, 10) || 6, 4), maxColors);

  if (state.pegs > state.colorsCount) {
    state.pegs = state.colorsCount;
    if (!isInitial) {
      showToast('Pinos ajustados para evitar repeticao de cor.', 'warning');
    }
  }

  pegsInput.max = String(maxColors);
  colorsInput.max = String(maxColors);
  pegsInput.value = String(state.pegs);
  colorsInput.value = String(state.colorsCount);

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

export function generateSecretCode(len, colors) {
  const ids = colors.map(color => color.id);
  return pickUniqueColors(len, ids);
}

function pickUniqueColors(len, colorIds) {
  if (len > colorIds.length) {
    throw new Error(`Nao ha cores suficientes para gerar ${len} pinos sem repeticao.`);
  }

  const shuffled = [...colorIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, len);
}

function renderPalette() {
  const palette = document.getElementById('mmPalette');
  palette.innerHTML = '';
  state.activeColors.forEach((color, i) => {
    const peg = document.createElement('div');
    peg.className = 'mm-peg interactive';
    peg.style.setProperty('--peg-color', color.hex);
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
      peg.className = 'mm-peg filled';
      peg.style.setProperty('--peg-color', color.hex);
    } else {
      peg.className = 'mm-peg mm-peg-empty';
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
  // Prevent duplicate colors in the same guess
  if (state.currentGuess.includes(colorId)) {
    audio.play('error');
    return;
  }
  const firstEmpty = state.currentGuess.indexOf(null);
  if (firstEmpty !== -1) {
    state.currentGuess[firstEmpty] = colorId;
    renderCurrentRow();
    audio.play('peg');
  }
}

function addPegToSetup(colorId) {
  // Prevent duplicate colors in the secret code setup
  if (state.secret.includes(colorId)) {
    audio.play('error');
    return;
  }
  const firstEmpty = state.secret.indexOf(null);
  if (firstEmpty !== -1) {
    state.secret[firstEmpty] = colorId;
    renderSetupRow();
    audio.play('peg');
  }
}

export function evaluateGuess(guess, secret) {
  let greens = 0;
  let whites = 0;
  const slots = Array(guess.length).fill('empty');
  const remainingSecretCounts = new Map();

  // Primeiro, contabiliza acertos exatos e guarda cores restantes da senha.
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === secret[i]) {
      greens++;
      slots[i] = 'green';
    } else {
      const current = remainingSecretCounts.get(secret[i]) || 0;
      remainingSecretCounts.set(secret[i], current + 1);
    }
  }

  // Depois, avalia cada peça por posicao (1-2 / 3-4 / ...).
  for (let i = 0; i < guess.length; i++) {
    if (slots[i] === 'green' || guess[i] == null) continue;

    const count = remainingSecretCounts.get(guess[i]) || 0;
    if (count > 0) {
      whites++;
      slots[i] = 'white';
      remainingSecretCounts.set(guess[i], count - 1);
    }
  }

  return { greens, whites, slots };
}

function submitPlayerGuess() {
  if (state.currentGuess.includes(null)) return;

  const feedback = evaluateGuess(state.currentGuess, state.secret);
  state.history.push({
    guess: [...state.currentGuess],
    feedback: feedback
  });

  renderBoardRow(state.turn, state.currentGuess, feedback);

  if (feedback.greens === state.pegs) {
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
    html += `<div class="mm-peg filled" style="--peg-color: ${color.hex}"></div>`;
  });
  html += `</div>`;

  // Feedback
  const feedbackSlots = Array.isArray(feedback.slots) ? feedback.slots : [];
  const displaySlots = Math.max(guess.length, FEEDBACK_BY_SLOT_MIN);

  html += `<div class="mm-feedback-grid" style="--mm-feedback-columns:${FEEDBACK_COLUMNS};" aria-label="Dicas por posicao">`;
  for (let i = 0; i < displaySlots; i++) {
    const slotStatus = feedbackSlots[i] || 'empty';
    html += `<div class="mm-fb-peg ${slotStatus}" title="Peca ${i + 1}"></div>`;
  }
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
    peg.className = 'mm-peg filled';
    peg.style.setProperty('--peg-color', color.hex);
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

export function generateAllCombinations(len, colorIds) {
  const results = [];
  if (len > colorIds.length) return results;

  function backtrack(current, used) {
    if (current.length === len) {
      results.push([...current]);
      return;
    }

    for (let i = 0; i < colorIds.length; i++) {
      if (used[i]) continue;
      used[i] = true;
      current.push(colorIds[i]);
      backtrack(current, used);
      current.pop();
      used[i] = false;
    }
  }

  backtrack([], Array(colorIds.length).fill(false));
  return results;
}

function runPCDecipherTurn() {
  if (!state.isPlaying) return;

  // AI logic: take a guess from possible codes
  // Minimax simplified (Knuth's algorithm would be too heavy for large pegs, using a heuristic)
  const randomIdx = Math.floor(Math.random() * state.allPossibleCodes.length);
  const guess = state.allPossibleCodes[randomIdx] || pickUniqueColors(state.pegs, state.activeColors.map(c => c.id));

  const feedback = evaluateGuess(guess, state.secret);

  state.history.push({ guess, feedback });

  setTimeout(() => {
    renderBoardRow(state.turn, guess, feedback);
    audio.play('peg');

    if (feedback.greens === state.pegs) {
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
        if (arraysEqual(c, guess)) return false;
        const f = evaluateGuess(guess, c);
        return f.greens === feedback.greens && f.whites === feedback.whites;
      });

      state.turn++;
      document.getElementById('mmTurn').textContent = state.turn;
      runPCDecipherTurn();
    }
  }, 1200);
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
