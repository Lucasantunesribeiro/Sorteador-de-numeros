import { audio } from '../audio.js';
import { showToast } from '../ui.js';

const history = [];

function renderHistory() {
  const container = document.getElementById('rngHistory');
  if (history.length === 0) {
    container.innerHTML = '<div class="min-w-[84px] sm:min-w-0 sm:col-span-full text-center text-slate-500 text-sm">Nenhum numero gerado ainda</div>';
    return;
  }

  container.innerHTML = history.map((item, index) => `
    <div class="min-w-[84px] sm:min-w-0 rounded-xl border p-4 flex shrink-0 flex-col items-center justify-center gap-1 transition-colors ${
      index === 0
        ? 'border-primary bg-primary/5 dark:bg-primary/10 ring-2 ring-primary/20'
        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40'
    }">
      <span class="text-2xl font-bold text-slate-800 dark:text-slate-200">${item.number}</span>
      <span class="text-[10px] text-slate-400 uppercase font-bold text-center" title="Faixa: ${item.range}">${item.time}</span>
    </div>
  `).join('');
}

function generate() {
  const min = parseInt(document.getElementById('rngMin').value, 10) || 1;
  const max = parseInt(document.getElementById('rngMax').value, 10) || 100;

  if (min >= max) {
    showToast('O minimo deve ser menor que o maximo.', 'error');
    return;
  }

  const result = Math.floor(Math.random() * (max - min + 1)) + min;
  const display = document.getElementById('rngResult');

  display.classList.remove('bounce');
  void display.offsetWidth;
  display.classList.add('bounce');
  display.textContent = result;

  history.unshift({
    number: result,
    range: `${min}-${max}`,
    time: new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  });

  if (history.length > 10) {
    history.pop();
  }

  renderHistory();
  audio.play('success');
}

export function initRNG() {
  document.getElementById('rngGenerate').addEventListener('click', generate);
  document.getElementById('rngMin').addEventListener('keypress', event => {
    if (event.key === 'Enter') generate();
  });
  document.getElementById('rngMax').addEventListener('keypress', event => {
    if (event.key === 'Enter') generate();
  });
  document.getElementById('rngClear').addEventListener('click', () => {
    history.length = 0;
    renderHistory();
  });

  renderHistory();
}
