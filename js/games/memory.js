import { audio } from '../audio.js';
import { showToast } from '../ui.js';
import { addStat, checkAchievements } from '../stats.js';

const ICONS = ['favorite', 'eco', 'bolt', 'pets', 'music_note', 'star'];
const TOTAL_PAIRS = ICONS.length;

const state = {
  cards: [],
  flippedCards: [],
  matchedPairs: 0,
  moves: 0,
  startTime: 0,
  timer: null,
  lockBoard: false
};

function newGame() {
  state.flippedCards = [];
  state.matchedPairs = 0;
  state.moves = 0;
  state.lockBoard = false;
  state.startTime = Date.now();
  state.cards = [...ICONS, ...ICONS].sort(() => Math.random() - 0.5);

  document.getElementById('memoryMoves').textContent = '0';
  document.getElementById('memoryTime').textContent = '00:00';
  document.getElementById('memoryPairs').textContent = `0/${TOTAL_PAIRS}`;

  buildGrid();

  if (state.timer) clearInterval(state.timer);
  state.timer = setInterval(() => {
    const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
    const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const ss = String(elapsed % 60).padStart(2, '0');
    document.getElementById('memoryTime').textContent = `${mm}:${ss}`;
  }, 1000);

  audio.play('click');
}

function buildGrid() {
  const grid = document.getElementById('memoryGrid');
  grid.innerHTML = '';

  state.cards.forEach(symbol => {
    const card = document.createElement('div');
    card.className = 'memory-card bg-transparent';
    card.dataset.symbol = symbol;
    card.innerHTML = `
      <div class="card-face card-back">
        <span class="material-symbols-outlined text-4xl">question_mark</span>
      </div>
      <div class="card-face card-front">
        <span class="material-symbols-outlined text-4xl sm:text-5xl">${symbol}</span>
      </div>
    `;
    card.addEventListener('click', () => flip(card));
    grid.appendChild(card);
  });
}

function flip(card) {
  if (
    state.lockBoard ||
    card.classList.contains('flipped') ||
    card.classList.contains('matched')
  ) {
    return;
  }

  card.classList.add('flipped');
  state.flippedCards.push(card);
  audio.play('flip');

  if (state.flippedCards.length === 2) {
    state.moves++;
    document.getElementById('memoryMoves').textContent = state.moves;
    state.lockBoard = true;
    setTimeout(checkMatch, 650);
  }
}

function checkMatch() {
  const [firstCard, secondCard] = state.flippedCards;

  if (firstCard.dataset.symbol === secondCard.dataset.symbol) {
    firstCard.classList.add('matched');
    secondCard.classList.add('matched');
    state.matchedPairs++;
    document.getElementById('memoryPairs').textContent = `${state.matchedPairs}/${TOTAL_PAIRS}`;
    audio.play('match');

    if (state.matchedPairs === TOTAL_PAIRS) {
      clearInterval(state.timer);
      const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
      audio.playWin();
      addStat('memory', true, { moves: state.moves, time: elapsed });
      checkAchievements('memory', { moves: state.moves, time: elapsed });
      showToast(`Voce venceu em ${state.moves} movimentos e ${elapsed}s!`, 'success', 4000);
    }
  } else {
    firstCard.classList.add('shake');
    secondCard.classList.add('shake');

    setTimeout(() => {
      firstCard.classList.remove('flipped', 'shake');
      secondCard.classList.remove('flipped', 'shake');
    }, 850);

    audio.play('error');
  }

  state.flippedCards = [];
  state.lockBoard = false;
}

function showHint() {
  if (state.matchedPairs >= TOTAL_PAIRS - 2) {
    showToast('Quase la. Agora vai sem dica.', 'warning');
    return;
  }

  document.querySelectorAll('.memory-card:not(.matched)').forEach(card => {
    card.classList.add('flipped');
  });

  setTimeout(() => {
    document.querySelectorAll('.memory-card:not(.matched)').forEach(card => {
      if (!state.flippedCards.includes(card)) {
        card.classList.remove('flipped');
      }
    });
  }, 900);

  audio.play('click');
  showToast('Dica usada. As cartas foram reveladas por um instante.', 'warning');
}

export function initMemoryGame() {
  document.getElementById('memoryNewGame').addEventListener('click', newGame);
  document.getElementById('memoryHint').addEventListener('click', showHint);
  newGame();
}
