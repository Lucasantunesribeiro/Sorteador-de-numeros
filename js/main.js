import { audio } from './audio.js';
import { loadSettings } from './storage.js';
import { showGame, applyTheme, toggleTheme, toggleFullscreen } from './ui.js';
import { updateSidebarStats, updateDashboard } from './stats.js';
import { initNumberGuess } from './games/number-guess.js';
import { initMemoryGame } from './games/memory.js';
import { initRNG } from './games/rng.js';
import { initOddEven } from './games/odd-even.js';
import { initReactionTime } from './games/reaction.js';
import { initMastermind } from './games/mastermind.js';

const settings = loadSettings();

function _navigate(gameId) {
  showGame(gameId, id => {
    if (id === 'dashboard') updateDashboard();
  });
  audio.play('click');
}

function _setupNav() {
  document.querySelectorAll('.game-btn').forEach(btn => {
    btn.addEventListener('click', () => _navigate(btn.dataset.game));
  });

  document.getElementById('soundToggle').addEventListener('click', () => {
    settings.soundEnabled = audio.toggle();
    const btn = document.getElementById('soundToggle');
    btn.textContent = settings.soundEnabled ? '🔊' : '🔇';
    // persist
    import('./storage.js').then(({ saveSettings }) => saveSettings(settings));
  });

  document.getElementById('themeToggle').addEventListener('click', () => {
    toggleTheme(settings);
  });

  document.getElementById('fullscreenToggle').addEventListener('click', toggleFullscreen);

  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 't') { e.preventDefault(); toggleTheme(settings); }
      if (e.key === 's') { e.preventDefault(); document.getElementById('soundToggle').click(); }
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  audio.init();
  audio.enabled = settings.soundEnabled;

  applyTheme(settings.theme);
  document.getElementById('soundToggle').textContent = settings.soundEnabled ? '🔊' : '🔇';

  _setupNav();

  initNumberGuess();
  initMemoryGame();
  initRNG();
  initOddEven();
  initReactionTime();
  initMastermind();

  updateSidebarStats();
  _navigate('dashboard');

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
});
