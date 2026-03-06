import { audio } from '../audio.js';
import { showToast } from '../ui.js';
import { addStat, stats, checkAchievements } from '../stats.js';

const state = {
  target: 0, attempts: 0, maxAttempts: 10,
  min: 1, max: 100, active: false
};

function _getCard() {
  return document.querySelector('#number-guess .game-card');
}

function _applyTemperature(guess) {
  const range    = state.max - state.min;
  const distance = Math.abs(guess - state.target);
  const proximity = 1 - (distance / range); // 0=far, 1=exact

  const card = _getCard();
  if (!card) return;

  let hue, saturation = 80;
  if (proximity < 0.4) {
    hue = 210; // icy blue
  } else if (proximity < 0.6) {
    hue = 180; // cyan
  } else if (proximity < 0.75) {
    hue = 40;  // warm yellow
  } else if (proximity < 0.9) {
    hue = 20;  // orange
  } else {
    hue = 4;   // fiery red
    saturation = 90;
  }

  const intensity = Math.max(0, (proximity - 0.35) / 0.65);
  card.style.setProperty('--temp-hue', hue);
  card.style.setProperty('--temp-sat', `${saturation}%`);
  card.style.setProperty('--temp-alpha', intensity.toFixed(2));
}

function _resetTemperature() {
  const card = _getCard();
  if (card) {
    card.style.setProperty('--temp-alpha', '0');
  }
}

function newGame() {
  state.target   = Math.floor(Math.random() * (state.max - state.min + 1)) + state.min;
  state.attempts = 0;
  state.active   = true;

  _resetTemperature();
  document.getElementById('guessInput').value         = '';
  document.getElementById('guessHint').style.display  = 'none';
  document.getElementById('guessAttempts').textContent = '0';
  document.getElementById('guessProgress').style.width = '0%';
  document.getElementById('guessRange').textContent   = `${state.min}-${state.max}`;

  audio.play('click');
}

function _submitGuess() {
  if (!state.active) return;

  const guess = parseInt(document.getElementById('guessInput').value, 10);
  if (isNaN(guess) || guess < state.min || guess > state.max) {
    showToast(`Digite um numero entre ${state.min} e ${state.max}!`, 'error');
    return;
  }

  state.attempts++;
  document.getElementById('guessAttempts').textContent  = state.attempts;
  document.getElementById('guessProgress').style.width  = `${(state.attempts / state.maxAttempts) * 100}%`;

  const hint = document.getElementById('guessHint');
  hint.style.display = 'block';

  _applyTemperature(guess);

  if (guess === state.target) {
    hint.textContent = `Correto! Voce encontrou ${state.target} em ${state.attempts} tentativas!`;
    hint.className   = 'hint correct';
    state.active     = false;
    audio.playWin();
    addStat('numberGuess', true, state.attempts);
    checkAchievements('numberGuess', state.attempts);
    _resetTemperature();
    return;
  }

  if (state.attempts >= state.maxAttempts) {
    hint.textContent = `Game Over! O numero era ${state.target}`;
    hint.className   = 'hint too-high';
    state.active     = false;
    audio.play('error');
    addStat('numberGuess', false);
    document.getElementById('guessInput').value = '';
    return;
  }

  const range     = state.max - state.min;
  const proximity = 1 - Math.abs(guess - state.target) / range;
  const higher    = guess > state.target;

  let emoji, text;
  if (proximity > 0.88)      { emoji = '🔥🔥'; text = higher ? 'Quente demais! Um pouco menor.' : 'Quente demais! Um pouco maior.'; }
  else if (proximity > 0.72) { emoji = '♨️';  text = higher ? 'Quente! Tente menor.'           : 'Quente! Tente maior.';          }
  else if (proximity > 0.50) { emoji = '😐';  text = higher ? 'Morno. Vai menor.'              : 'Morno. Vai maior.';             }
  else                        { emoji = '🧊';  text = higher ? 'Frio! Muito alto.'              : 'Frio! Muito baixo.';            }

  hint.textContent = `${emoji} ${text}`;
  hint.className   = `hint ${higher ? 'too-high' : 'too-low'}`;

  audio.play('click');
  document.getElementById('guessInput').value = '';
}

export function initNumberGuess() {
  document.getElementById('guessSubmit').addEventListener('click', _submitGuess);
  document.getElementById('guessInput').addEventListener('keypress', e => {
    if (e.key === 'Enter') _submitGuess();
  });
  document.getElementById('guessNewGame').addEventListener('click', newGame);

  const best = stats.games.numberGuess.bestAttempts;
  if (best) document.getElementById('guessBest').textContent = best;

  newGame();
}
