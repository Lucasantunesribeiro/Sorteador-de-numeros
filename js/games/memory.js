import { audio } from '../audio.js';
import { showToast } from '../ui.js';
import { addStat, checkAchievements } from '../stats.js';

const EMOJIS = ['🎮', '🎯', '🎲', '🃏', '🎭', '🎪', '🎨', '🎬'];

const state = {
  cards: [], flippedCards: [], matchedPairs: 0,
  moves: 0, startTime: 0, timer: null, lockBoard: false
};

function newGame() {
  state.flippedCards  = [];
  state.matchedPairs  = 0;
  state.moves         = 0;
  state.lockBoard     = false;
  state.startTime     = Date.now();
  state.cards         = [...EMOJIS, ...EMOJIS].sort(() => Math.random() - 0.5);

  document.getElementById('memoryMoves').textContent = '0';
  document.getElementById('memoryTime').textContent  = '00:00';
  document.getElementById('memoryPairs').textContent = '0/8';

  _buildGrid();

  if (state.timer) clearInterval(state.timer);
  state.timer = setInterval(() => {
    const elapsed  = Math.floor((Date.now() - state.startTime) / 1000);
    const mm       = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const ss       = String(elapsed % 60).padStart(2, '0');
    document.getElementById('memoryTime').textContent = `${mm}:${ss}`;
  }, 1000);

  audio.play('click');
}

function _buildGrid() {
  const grid = document.getElementById('memoryGrid');
  grid.innerHTML = '';
  state.cards.forEach((symbol, index) => {
    const card = document.createElement('div');
    card.className = 'memory-card';
    card.dataset.symbol = symbol;
    card.innerHTML = `
      <div class="card-face card-back"></div>
      <div class="card-face card-front">${symbol}</div>
    `;
    card.addEventListener('click', () => _flip(card));
    grid.appendChild(card);
  });
}

function _flip(card) {
  if (state.lockBoard || card.classList.contains('flipped') ||
      card.classList.contains('matched')) return;

  card.classList.add('flipped');
  state.flippedCards.push(card);
  audio.play('flip');

  if (state.flippedCards.length === 2) {
    state.moves++;
    document.getElementById('memoryMoves').textContent = state.moves;
    state.lockBoard = true;
    setTimeout(_checkMatch, 650);
  }
}

function _checkMatch() {
  const [a, b] = state.flippedCards;

  if (a.dataset.symbol === b.dataset.symbol) {
    a.classList.add('matched');
    b.classList.add('matched');
    state.matchedPairs++;
    document.getElementById('memoryPairs').textContent = `${state.matchedPairs}/8`;
    audio.play('match');

    if (state.matchedPairs === 8) {
      clearInterval(state.timer);
      const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
      audio.playWin();
      addStat('memory', true, { moves: state.moves, time: elapsed });
      checkAchievements('memory', { moves: state.moves, time: elapsed });
      showToast(`Voce venceu em ${state.moves} movimentos e ${elapsed}s!`, 'success', 4000);
    }
  } else {
    a.classList.add('shake');
    b.classList.add('shake');
    setTimeout(() => {
      a.classList.remove('flipped', 'shake');
      b.classList.remove('flipped', 'shake');
    }, 850);
    audio.play('error');
  }

  state.flippedCards = [];
  state.lockBoard    = false;
}

function _showHint() {
  if (state.matchedPairs >= 6) {
    showToast('Quase la! Sem dica necessaria.', 'warning');
    return;
  }
  document.querySelectorAll('.memory-card:not(.matched)').forEach(c => c.classList.add('flipped'));
  setTimeout(() => {
    document.querySelectorAll('.memory-card:not(.matched)').forEach(c => {
      if (!state.flippedCards.includes(c)) c.classList.remove('flipped');
    });
  }, 900);
  audio.play('click');
  showToast('Dica usada! Cartas reveladas brevemente.', 'warning');
}

export function initMemoryGame() {
  document.getElementById('memoryNewGame').addEventListener('click', newGame);
  document.getElementById('memoryHint').addEventListener('click', _showHint);
  newGame();
}
