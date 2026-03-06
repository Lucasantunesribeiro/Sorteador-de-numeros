import { audio } from '../audio.js';
import { showToast } from '../ui.js';
import { addStat, stats, checkAchievements } from '../stats.js';

const state = {
  startTime:  0,
  isWaiting:  false,
  isReady:    false,
  times:      [],
  bestTime:   null,
  _timeout:   null
};

function _getElements() {
  return {
    area: document.getElementById('reactionArea'),
    text: document.getElementById('reactionText')
  };
}

function startTest() {
  const { area, text } = _getElements();
  state.isWaiting = true;
  state.isReady   = false;

  area.dataset.state = 'waiting';
  text.innerHTML = '<h3>Aguarde...</h3><p>Clique quando ficar verde!</p>';

  const delay = Math.random() * 4000 + 2000;

  state._timeout = setTimeout(() => {
    if (!state.isWaiting) return;
    state.isReady = true;
    area.dataset.state = 'ready';
    text.innerHTML = '<h3>AGORA!</h3>';
    state.startTime = Date.now();
    audio.play('beep');
  }, delay);

  audio.play('click');
}

function _handleClick() {
  const { area, text } = _getElements();

  if (state.isWaiting && !state.isReady) {
    clearTimeout(state._timeout);
    state.isWaiting = false;
    area.dataset.state = 'idle';
    text.innerHTML = '<h3>Cedo demais!</h3><p>Clique em "Iniciar" para tentar novamente</p>';
    audio.play('error');
    return;
  }

  if (!state.isReady) return;

  const reactionTime = Date.now() - state.startTime;
  state.times.push(reactionTime);
  state.isWaiting = false;
  state.isReady   = false;

  if (!state.bestTime || reactionTime < state.bestTime) {
    state.bestTime = reactionTime;
  }

  area.dataset.state = 'idle';
  text.innerHTML = `<h3>${reactionTime}ms</h3><p>Clique em "Iniciar" para tentar novamente</p>`;

  _updateUI();
  addStat('reaction', true, reactionTime);
  checkAchievements('reaction', reactionTime);
  audio.play('success');

  if (reactionTime < 150)      showToast('Super-Humano! Reflexos extraordinarios!', 'success');
  else if (reactionTime < 200) showToast('Reflexos de relampago!', 'success');
  else if (reactionTime < 300) showToast('Otimo tempo de reacao!', 'success');
}

function _resetStats() {
  state.times    = [];
  state.bestTime = null;
  _updateUI();
  audio.play('click');
  showToast('Estatisticas zeradas!', 'success');
}

function _updateUI() {
  const last    = state.times[state.times.length - 1] || 0;
  const avg     = state.times.length
    ? Math.round(state.times.reduce((a, b) => a + b, 0) / state.times.length)
    : 0;

  document.getElementById('reactionTime').textContent    = `${last}ms`;
  document.getElementById('reactionAverage').textContent = `${avg}ms`;
  document.getElementById('reactionBest').textContent    = state.bestTime ? `${state.bestTime}ms` : '-';
}

export function initReactionTime() {
  const { area } = _getElements();

  area.addEventListener('click', _handleClick);
  document.getElementById('reactionStart').addEventListener('click', startTest);
  document.getElementById('reactionReset').addEventListener('click', _resetStats);

  state.bestTime = stats.games.reaction?.bestTime || null;
  _updateUI();
}
