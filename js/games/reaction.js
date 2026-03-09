import { audio } from '../audio.js';
import { showToast } from '../ui.js';
import { addStat, stats, checkAchievements } from '../stats.js';

const state = {
  startTime: 0,
  isWaiting: false,
  isReady: false,
  times: [],
  bestTime: null,
  timeoutId: null
};

function getElements() {
  return {
    area: document.getElementById('reactionArea'),
    inner: document.getElementById('reactionInner'),
    text: document.getElementById('reactionText')
  };
}

function clearPendingStart() {
  if (state.timeoutId) {
    clearTimeout(state.timeoutId);
    state.timeoutId = null;
  }
}

function setAreaTone(inner, tone) {
  inner.classList.remove(
    'bg-primary/20',
    'dark:bg-primary/30',
    'bg-red-500/20',
    'dark:bg-red-500/30',
    'bg-green-500',
    'dark:bg-green-500'
  );

  if (tone === 'waiting') {
    inner.classList.add('bg-red-500/20', 'dark:bg-red-500/30');
    return;
  }

  if (tone === 'ready') {
    inner.classList.add('bg-green-500', 'dark:bg-green-500');
    return;
  }

  inner.classList.add('bg-primary/20', 'dark:bg-primary/30');
}

function setIdleMessage(message = 'Clique na caixa para comecar') {
  const { area, inner, text } = getElements();
  area.dataset.state = 'idle';
  setAreaTone(inner, 'idle');
  text.innerHTML = `
    <span class="material-symbols-outlined text-primary text-6xl mb-4 opacity-50">touch_app</span>
    <p class="text-4xl md:text-5xl font-black tracking-tighter text-primary">INICIAR</p>
    <p class="mt-4 text-lg font-medium text-slate-600 dark:text-slate-300">${message}</p>
  `;
}

function updateUI() {
  const last = state.times[state.times.length - 1] || 0;
  const average = state.times.length
    ? Math.round(state.times.reduce((sum, value) => sum + value, 0) / state.times.length)
    : 0;

  document.getElementById('reactionTime').innerHTML = `${last}<span class="text-base font-normal text-slate-400">ms</span>`;
  document.getElementById('reactionAverage').innerHTML = `${average}<span class="text-base font-normal text-slate-400">ms</span>`;
  document.getElementById('reactionBest').innerHTML = state.bestTime
    ? `${state.bestTime}<span class="text-base font-normal text-primary/60">ms</span>`
    : '-';
}

function startTest() {
  const { area, inner, text } = getElements();

  clearPendingStart();
  state.isWaiting = true;
  state.isReady = false;
  area.dataset.state = 'waiting';
  setAreaTone(inner, 'waiting');

  text.innerHTML = `
    <span class="material-symbols-outlined text-red-500 text-6xl mb-4 opacity-70">hourglass_empty</span>
    <p class="text-3xl md:text-5xl font-black tracking-tighter text-red-500">AGUARDE...</p>
    <p class="mt-4 text-lg font-medium text-slate-600 dark:text-slate-300">Espere o painel ficar verde</p>
  `;

  const delay = Math.random() * 4000 + 2000;
  state.timeoutId = setTimeout(() => {
    if (!state.isWaiting) return;

    state.timeoutId = null;
    state.isReady = true;
    area.dataset.state = 'ready';
    setAreaTone(inner, 'ready');
    text.innerHTML = `
      <span class="material-symbols-outlined text-white text-6xl mb-4">bolt</span>
      <p class="text-4xl md:text-6xl font-black tracking-tighter text-white">CLIQUE AGORA!</p>
    `;
    state.startTime = Date.now();
    audio.play('beep');
  }, delay);

  audio.play('click');
}

function handleClick() {
  const { area, inner, text } = getElements();

  if (!state.isWaiting && !state.isReady) {
    startTest();
    return;
  }

  if (state.isWaiting && !state.isReady) {
    clearPendingStart();
    state.isWaiting = false;
    state.isReady = false;
    area.dataset.state = 'idle';
    setAreaTone(inner, 'idle');
    text.innerHTML = `
      <span class="material-symbols-outlined text-primary text-6xl mb-4 opacity-50">error</span>
      <p class="text-3xl md:text-5xl font-black tracking-tighter text-primary">MUITO CEDO!</p>
      <p class="mt-4 text-lg font-medium text-slate-600 dark:text-slate-300">Clique na caixa para tentar novamente</p>
    `;
    audio.play('error');
    return;
  }

  if (!state.isReady) return;

  const reactionTime = Date.now() - state.startTime;
  state.times.push(reactionTime);
  state.isWaiting = false;
  state.isReady = false;
  state.timeoutId = null;

  if (!state.bestTime || reactionTime < state.bestTime) {
    state.bestTime = reactionTime;
  }

  area.dataset.state = 'idle';
  setAreaTone(inner, 'idle');
  text.innerHTML = `
    <span class="material-symbols-outlined text-primary text-6xl mb-4 opacity-50">timer</span>
    <p class="text-4xl md:text-6xl font-black tracking-tighter text-primary">${reactionTime}ms</p>
    <p class="mt-4 text-lg font-medium text-slate-600 dark:text-slate-300">Clique na caixa para tentar novamente</p>
  `;

  updateUI();
  addStat('reaction', true, reactionTime);
  checkAchievements('reaction', reactionTime);
  audio.play('success');

  if (reactionTime < 150) {
    showToast('Super-humano. Reflexos extraordinarios.', 'success');
  } else if (reactionTime < 200) {
    showToast('Reflexos de relampago.', 'success');
  } else if (reactionTime < 300) {
    showToast('Otimo tempo de reacao.', 'success');
  }
}

function resetStats() {
  clearPendingStart();
  state.isWaiting = false;
  state.isReady = false;
  state.times = [];
  state.bestTime = null;
  updateUI();
  setIdleMessage();
  audio.play('click');
  showToast('Estatisticas zeradas.', 'success');
}

export function initReactionTime() {
  const { area } = getElements();
  area.addEventListener('click', handleClick);
  document.getElementById('reactionReset').addEventListener('click', event => {
    event.stopPropagation();
    resetStats();
  });

  state.bestTime = stats.games.reaction?.bestTime || null;
  updateUI();
  setIdleMessage();
}
