import { audio } from '../audio.js';
import { showToast } from '../ui.js';

const history = [];

function _generate() {
  const min = parseInt(document.getElementById('rngMin').value, 10) || 1;
  const max = parseInt(document.getElementById('rngMax').value, 10) || 100;

  if (min >= max) {
    showToast('O minimo deve ser menor que o maximo!', 'error');
    return;
  }

  const result = Math.floor(Math.random() * (max - min + 1)) + min;
  const display = document.getElementById('rngResult');

  display.classList.remove('bounce');
  void display.offsetWidth; // reflow para reiniciar animacao
  display.classList.add('bounce');
  display.textContent = result;

  history.unshift({ number: result, range: `${min}–${max}`, time: new Date().toLocaleTimeString('pt-BR') });
  if (history.length > 10) history.pop();

  _renderHistory();
  audio.play('success');
}

function _renderHistory() {
  const el = document.getElementById('rngHistory');
  if (history.length === 0) {
    el.innerHTML = '<p class="empty-state">Nenhum numero gerado ainda</p>';
    return;
  }
  el.innerHTML = history.map((item, i) => `
    <div class="rng-history-item ${i === 0 ? 'rng-history-new' : ''}">
      <span class="rng-history-number">${item.number}</span>
      <span class="rng-history-meta">${item.range} &bull; ${item.time}</span>
    </div>
  `).join('');
}

export function initRNG() {
  document.getElementById('rngGenerate').addEventListener('click', _generate);
  document.getElementById('rngMin').addEventListener('keypress', e => { if (e.key === 'Enter') _generate(); });
  document.getElementById('rngMax').addEventListener('keypress', e => { if (e.key === 'Enter') _generate(); });
}
