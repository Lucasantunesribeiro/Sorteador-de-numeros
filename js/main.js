import { audio } from './audio.js';
import { loadSettings } from './storage.js';
import { showGame, applyTheme, toggleTheme, toggleFullscreen } from './ui.js';
import { updateSidebarStats, updateDashboard, stats } from './stats.js?v=1.0.1';
import { initNumberGuess } from './games/number-guess.js';
import { initMemoryGame } from './games/memory.js';
import { initRNG } from './games/rng.js';
import { init2048 } from './games/game-2048.js?v=1.0.1';
import { initSudoku } from './games/sudoku.js?v=1.1.0';
import { initLightsOut } from './games/lights-out.js';
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

  document.addEventListener('click', e => {
    if (e.target.closest('.back-btn')) {
      _navigate('dashboard');
    }
  });

  const soundToggle = document.getElementById('soundToggle');
  if (soundToggle) {
    soundToggle.addEventListener('click', () => {
      settings.soundEnabled = audio.toggle();
      const icon = soundToggle.querySelector('.material-symbols-outlined');
      if (icon) {
        icon.textContent = settings.soundEnabled ? 'volume_up' : 'volume_off';
      } else {
        soundToggle.textContent = settings.soundEnabled ? 'volume_up' : 'volume_off';
      }
      import('./storage.js').then(({ saveSettings }) => saveSettings(settings));
    });
  }

  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      toggleTheme(settings);
    });
  }

  const fullscreenToggle = document.getElementById('fullscreenToggle');
  if (fullscreenToggle) {
    fullscreenToggle.addEventListener('click', toggleFullscreen);
  }

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
  
  const soundBtn = document.getElementById('soundToggle');
  if (soundBtn) {
    const soundIcon = soundBtn.querySelector('.material-symbols-outlined');
    if (soundIcon) {
      soundIcon.textContent = settings.soundEnabled ? 'volume_up' : 'volume_off';
    } else {
      soundBtn.textContent = settings.soundEnabled ? 'volume_up' : 'volume_off';
    }
  }

  _setupNav();

  initNumberGuess();
  initMemoryGame();
  initRNG();
  init2048();
  initSudoku();
  initLightsOut();
  initOddEven();
  initReactionTime();
  initMastermind();

  // Ensure DOM is fully painted before initial navigation and stats update
  requestAnimationFrame(() => {
    updateDashboard();
    _navigate('dashboard');
  });

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
});
