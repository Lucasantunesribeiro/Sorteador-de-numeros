import { audio } from './audio.js';
import { saveSettings } from './storage.js';

export function showToast(message, type = 'success', duration = 3000) {
  const container = document.getElementById('toastContainer');
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
  document.querySelectorAll('.game-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.game === gameId);
  });
  document.querySelectorAll('.game-section').forEach(section => {
    section.classList.toggle('active', section.id === gameId);
  });
  if (typeof onShow === 'function') onShow(gameId);
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
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
