import { audio } from './audio.js';
import { saveSettings } from './storage.js';

export function showToast(message, type = 'success', duration = 3000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);
  const remove = () => toast.classList.add('toast-out');
  const cleanup = () => toast.remove();
  setTimeout(remove, duration);
  setTimeout(cleanup, duration + 400);
  toast.addEventListener('click', () => { remove(); setTimeout(cleanup, 400); });
}

export function showGame(gameId, onShow) {
  document.querySelectorAll('#app-content > section.game-section').forEach(section => {
    const isCurrent = section.id === gameId;
    section.classList.toggle('hidden', !isCurrent);
    section.classList.toggle('active', isCurrent);
  });

  window.scrollTo({ top: 0, behavior: 'auto' });

  if (typeof onShow === 'function') onShow(gameId);
}

export function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  document.documentElement.setAttribute('data-theme', theme);
  
  const btn = document.getElementById('themeToggle');
  if (btn) {
    const icon = btn.querySelector('.material-symbols-outlined');
    if (icon) {
      icon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
    } else {
      btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
  }
}

export function toggleTheme(settings) {
  settings.theme = settings.theme === 'dark' ? 'light' : 'dark';
  applyTheme(settings.theme);
  saveSettings(settings);
  audio.play('click');
}

export function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.();
  }
}
