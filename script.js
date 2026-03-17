// Хранилища данных для каждого блока
const data = {
  1: new Map(), // Map<название показателя, значение>
  2: new Map()
};

const tables = {
  1: document.querySelector('#table1 tbody'),
  2: document.querySelector('#table2 tbody')
};

const pasteZones = document.querySelectorAll('.paste-zone');
const clearButtons = document.querySelectorAll('.btn-clear');
const matchesList = document.getElementById('matches-list');

// ────────────────────────────────────────────────
//  Вспомогательные функции
// ────────────────────────────────────────────────

function normalizeKey(key) {
  return key.trim().toLowerCase().replace(/\s+/g, ' ');
}

function updateCommonMatches() {
  const common = [];

  for (const [key1, val1] of data[1]) {
    if (data[2].has(key1) && data[2].get(key1) === val1) {
      common.push({ key: key1, value: val1 });
    }
  }

  // Сортируем для красоты (по названию)
  common.sort((a, b) => a.key.localeCompare(b.key, 'ru'));

  matchesList.innerHTML = '';
  if (common.length === 0) return;

  const items = common.map(item => {
    const span = document.createElement('span');
    span.innerHTML = `<strong>${item.key}</strong> = ${item.value}`;
    return span;
  });

  matchesList.append(...items);
}

function highlightMatches(column) {
  const tbody = tables[column];
  const other = column === 1 ? 2 : 1;

  tbody.querySelectorAll('tr').forEach(tr => {
    const keyCell = tr.cells[0];
    if (!keyCell) return;

    const key = normalizeKey(keyCell.textContent);
    tr.classList.remove('highlight');

    if (data[other].has(key) && data[other].get(key) === data[column].get(key)) {
      tr.classList.add('highlight');
    }
  });
}

function renderTable(column) {
  const tbody = tables[column];
  tbody.innerHTML = '';

  // Сортируем по названию показателя
  const sorted = [...data[column].entries()].sort((a,b) => a[0].localeCompare(b[0], 'ru'));

  for (const [key, value] of sorted) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${key}</td>
      <td>${value}</td>
    `;
    tbody.appendChild(tr);
  }

  highlightMatches(column);
  updateCommonMatches();
}

function clearColumn(column) {
  data[column].clear();
  renderTable(column);
  // второй блок тоже обновляем подсветку
  const other = column === 1 ? 2 : 1;
  highlightMatches(other);
  updateCommonMatches();
}

function processPastedText(text, column) {
  const lines = text.split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l !== '');  // убираем пустые строки

  let i = 0;
  while (i < lines.length) {
    // Минимально нужно 6 строк на блок (название + повтор + значение + 3 колонки)
    if (i + 5 >= lines.length) break;

    const name1 = lines[i];
    const name2 = lines[i + 1];
    const valueStr = lines[i + 2];

    // Проверяем, что третья строка — похоже на число (с точкой или запятой)
    const valueClean = valueStr.replace(',', '.');
    if (!/^-?\d+(\.\d+)?$/.test(valueClean)) {
      // если не число — пропускаем весь блок или пытаемся сдвинуться
      i++;
      continue;
    }

    // Берём название из ПЕРВОЙ строки (можно потом нормализовать)
    let displayName = name1.trim();

    // Если первая строка пустая/короткая — берём вторую (редкий случай)
    if (displayName.length < 2 && name2.length > 2) {
      displayName = name2.trim();
    }

    const value = valueClean;

    // Нормализуем ключ для проверки дубликатов (регистр и лишние пробелы не важны)
    const normKey = normalizeKey(displayName);

    // Добавляем, только если такого показателя ещё нет в этом блоке
    if (!data[column].has(normKey)) {
      data[column].set(normKey, value);
    }

    // Пропускаем 6 строк (1 блок)
    i += 6;
  }

  renderTable(column);
}

// ────────────────────────────────────────────────
//  События
// ────────────────────────────────────────────────

pasteZones.forEach(zone => {
  const col = zone.dataset.column;

  zone.addEventListener('paste', e => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text');
    processPastedText(text, col);
  });

  // Подсветка при фокусе
  zone.addEventListener('focusin', () => zone.classList.add('active'));
  zone.addEventListener('focusout', () => zone.classList.remove('active'));

  // Можно также сделать клик → фокус
  zone.addEventListener('click', () => zone.focus());
});

clearButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const col = btn.dataset.clear;
    if (confirm(`Очистить блок ${col}?`)) {
      clearColumn(col);
    }
  });
});

// Чтобы можно было сразу вставить при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
  pasteZones.forEach(z => z.setAttribute('tabindex', '0'));
});