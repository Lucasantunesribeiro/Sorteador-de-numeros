import { audio } from '../audio.js';
import { showToast } from '../ui.js';
import { addStat, stats, checkAchievements } from '../stats.js';

const state = {
  target: 0,
  attempts: 0,
  maxAttempts: 10,
  min: 1,
  max: 100,
  lowerBound: 1,
  upperBound: 100,
  lastGuess: null,
  active: false
};

function getCard() {
  return document.querySelector('#number-guess .game-card');
}

function setHint(title, description, icon, toneClasses) {
  const container = document.getElementById('guessHintContainer');
  const iconWrap = document.getElementById('guessHintIconContainer');
  const iconEl = document.getElementById('guessHintIcon');

  container.style.display = 'block';
  document.getElementById('guessHintTitle').textContent = title;
  document.getElementById('guessHintDesc').textContent = description;
  iconEl.textContent = icon;
  iconWrap.className = `inline-flex items-center justify-center mb-4 size-16 rounded-full transition-colors duration-300 ${toneClasses}`;
}

function updateRangeLabel() {
  document.getElementById('guessRange').textContent = `${state.lowerBound} - ${state.upperBound}`;
}

function updateLastGuessLabel() {
  const lastGuess = document.getElementById('guessLast');
  if (lastGuess) {
    lastGuess.textContent = state.lastGuess == null ? '--' : String(state.lastGuess);
  }
}

function applyTemperature(guess) {
  const range = state.max - state.min;
  const distance = Math.abs(guess - state.target);
  const proximity = 1 - distance / range;
  const card = getCard();

  if (!card) return;

  let hue = 210;
  let saturation = 78;
  if (proximity >= 0.9) {
    hue = 4;
    saturation = 92;
  } else if (proximity >= 0.75) {
    hue = 20;
  } else if (proximity >= 0.55) {
    hue = 40;
  } else if (proximity >= 0.4) {
    hue = 180;
  }

  const intensity = Math.max(0, (proximity - 0.32) / 0.68);
  card.style.backgroundColor = `hsla(${hue}, ${saturation}%, 50%, ${intensity.toFixed(2)})`;
}

function resetTemperature() {
  const card = getCard();
  if (card) {
    card.style.backgroundColor = 'transparent';
  }
}

function updateBest() {
  const best = stats.games.numberGuess.bestAttempts;
  document.getElementById('guessBest').textContent = best || '-';
}

function newGame() {
  state.target = Math.floor(Math.random() * (state.max - state.min + 1)) + state.min;
  state.attempts = 0;
  state.lowerBound = state.min;
  state.upperBound = state.max;
  state.lastGuess = null;
  state.active = true;

  resetTemperature();
  document.getElementById('guessInput').value = '';
  document.getElementById('guessAttempts').textContent = `0 / ${state.maxAttempts}`;
  document.getElementById('guessProgress').style.width = '0%';

  updateRangeLabel();
  updateLastGuessLabel();
  updateBest();
  setHint(
    'Adivinhe o numero',
    `Estou pensando em um numero entre ${state.min} e ${state.max}.`,
    'numbers',
    'bg-primary/10 dark:bg-primary/20 text-primary'
  );

  audio.play('click');
}

function submitGuess() {
  if (!state.active) return;

  const guess = parseInt(document.getElementById('guessInput').value, 10);
  if (Number.isNaN(guess) || guess < state.min || guess > state.max) {
    showToast(`Digite um numero entre ${state.min} e ${state.max}.`, 'error');
    return;
  }

  state.attempts++;
  state.lastGuess = guess;

  document.getElementById('guessAttempts').textContent = `${state.attempts} / ${state.maxAttempts}`;
  document.getElementById('guessProgress').style.width = `${(state.attempts / state.maxAttempts) * 100}%`;
  updateLastGuessLabel();
  applyTemperature(guess);

  if (guess === state.target) {
    state.lowerBound = guess;
    state.upperBound = guess;
    updateRangeLabel();

    setHint(
      'Correto!',
      `Voce encontrou ${state.target} em ${state.attempts} tentativas.`,
      'emoji_events',
      'bg-emerald-500/15 text-emerald-500'
    );

    state.active = false;
    audio.playWin();
    addStat('numberGuess', true, state.attempts);
    checkAchievements('numberGuess', state.attempts);
    updateBest();
    resetTemperature();
    document.getElementById('guessInput').value = '';
    return;
  }

  if (guess < state.target) {
    state.lowerBound = Math.max(state.lowerBound, guess + 1);
  } else {
    state.upperBound = Math.min(state.upperBound, guess - 1);
  }
  updateRangeLabel();

  if (state.attempts >= state.maxAttempts) {
    setHint(
      'Fim de jogo',
      `O numero certo era ${state.target}.`,
      'cancel',
      'bg-red-500/15 text-red-500'
    );

    state.active = false;
    audio.play('error');
    addStat('numberGuess', false);
    document.getElementById('guessInput').value = '';
    resetTemperature();
    return;
  }

  const proximity = 1 - Math.abs(guess - state.target) / (state.max - state.min);
  const guessIsLow = guess < state.target;

  let description = `A faixa agora vai de ${state.lowerBound} a ${state.upperBound}.`;
  let toneClasses = 'bg-blue-500/15 text-blue-500';
  let icon = guessIsLow ? 'keyboard_double_arrow_up' : 'keyboard_double_arrow_down';

  if (proximity >= 0.82) {
    description = `Muito perto. Tente um numero ${guessIsLow ? 'maior' : 'menor'}.`;
    toneClasses = 'bg-red-500/15 text-red-500';
    icon = guessIsLow ? 'keyboard_arrow_up' : 'keyboard_arrow_down';
  } else if (proximity >= 0.62) {
    description = `Voce esquentou. Tente um numero ${guessIsLow ? 'maior' : 'menor'}.`;
    toneClasses = 'bg-amber-500/15 text-amber-500';
    icon = guessIsLow ? 'keyboard_arrow_up' : 'keyboard_arrow_down';
  }

  setHint(
    guessIsLow ? 'Maior!' : 'Menor!',
    description,
    icon,
    toneClasses
  );

  audio.play('click');
  document.getElementById('guessInput').value = '';
}

export function initNumberGuess() {
  document.getElementById('guessSubmit').addEventListener('click', submitGuess);
  document.getElementById('guessInput').addEventListener('keypress', event => {
    if (event.key === 'Enter') submitGuess();
  });
  document.getElementById('guessNewGame').addEventListener('click', newGame);

  updateBest();
  newGame();
}
