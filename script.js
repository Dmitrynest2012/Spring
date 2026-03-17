// Хранилища данных для каждого блока
const data = {
  1: new Map(), // Map<нормализованное_название, значение_как_строка>
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
  return key
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^а-яёa-z0-9\s()\-.,]/gi, '')
    .replace(/ \(.*?\)/g, '');   // убираем часто повторяющиеся пояснения в скобках
}

function normalizeValueForDisplay(val) {
  return val.trim();
}

function valuesAreEqual(a, b) {
  if (!a || !b) return false;
  const normA = a.trim().replace(/\s+/g, ' ');
  const normB = b.trim().replace(/\s+/g, ' ');
  return normA === normB;
}

function updateCommonMatches() {
  const common = [];

  for (const [key, val1] of data[1]) {
    if (data[2].has(key) && valuesAreEqual(val1, data[2].get(key))) {
      common.push({ key, value: val1 });
    }
  }

  common.sort((a, b) => a.key.localeCompare(b.key, 'ru-RU'));

  matchesList.innerHTML = '';
  if (common.length === 0) {
    matchesList.innerHTML = '<em>— пока нет совпадений —</em>';
    return;
  }

  common.forEach(item => {
    const span = document.createElement('div');
    span.innerHTML = `<strong>${item.key}</strong> = ${normalizeValueForDisplay(item.value)}`;
    matchesList.appendChild(span);
  });
}

function highlightMatches(column) {
  const tbody = tables[column];
  const other = column === 1 ? 2 : 1;

  // Если противоположный блок пуст — снимаем всю подсветку
  if (data[other].size === 0) {
    tbody.querySelectorAll('tr.highlight').forEach(tr => tr.classList.remove('highlight'));
    return;
  }

  tbody.querySelectorAll('tr').forEach(tr => {
    const keyCell = tr.cells[0];
    if (!keyCell) return;

    const key = normalizeKey(keyCell.textContent);
    tr.classList.remove('highlight');

    if (data[other].has(key) && valuesAreEqual(
      data[column].get(key),
      data[other].get(key)
    )) {
      tr.classList.add('highlight');
    }
  });
}

function renderTable(column) {
  const tbody = tables[column];
  tbody.innerHTML = '';

  const sorted = [...data[column].entries()].sort((a, b) =>
    a[0].localeCompare(b[0], 'ru-RU')
  );

  for (const [normKey, value] of sorted) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${normKey}</td>
      <td>${normalizeValueForDisplay(value)}</td>
    `;
    tbody.appendChild(tr);
  }

  highlightMatches(column);
  updateCommonMatches();
}

function clearColumn(column) {
  data[column].clear();
  renderTable(column);
  // обновляем подсветку второго блока
  const other = column === 1 ? 2 : 1;
  highlightMatches(other);
  updateCommonMatches();
}

function processPastedText(text, column) {
  const lines = text.split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  let i = 0;
  while (i < lines.length) {
    let name = lines[i];

    // Пропускаем явный мусор / заголовки / оценки
    if (
      !name ||
      name.length < 3 ||
      /^(левая|правая|реф|референс|норма|grade|left|right|optimal|high|higher|low|повышен|понижен|возраст|пол|ед|ед\.|мкмоль|ммоль|г\/л|нг\/мл)$/i.test(name) ||
      /^\d{1,3}$/.test(name) ||
      name.includes('-----') ||
      name.includes('====')
    ) {
      i++;
      continue;
    }

    i++;

    // Пропускаем повтор названия или короткие строки
    while (i < lines.length && (
      lines[i] === name ||
      lines[i].length < 3 ||
      lines[i].startsWith('(') ||
      lines[i].match(/^\d+\s*[a-zа-я]?$/i)
    )) {
      i++;
    }

    if (i >= lines.length) break;

    let value = lines[i];

    // Если выглядит как оценка / статус — это не значение → пропускаем блок
    if (
      /^(optimal|high|higher|low|норм|реф|повышен|понижен|следы|не опред|отриц|полож)$/i.test(value) ||
      value.length < 1 ||
      value.match(/^\s*[<>]?\s*\d+(\.\d+)?\s*$/) === null &&
      !value.match(/^[<>]?\s*-?\d+(\.\d+)?/) &&
      !value.match(/^\d+(\.\d+)?/) &&
      !value.includes('.') && !value.includes(',')
    ) {
      i++;
      continue;
    }

    const normKey = normalizeKey(name);

    if (normKey && normKey.length > 3 && !data[column].has(normKey)) {
      data[column].set(normKey, value);
    }

    // Пропускаем остаток предполагаемого блока (обычно 3–6 строк)
    i += 3;   // значение взяли → минимум left, right, grade
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
    if (text.trim()) {
      processPastedText(text, col);
    }
  });

  zone.addEventListener('focusin', () => zone.classList.add('active'));
  zone.addEventListener('focusout', () => zone.classList.remove('active'));

  zone.setAttribute('tabindex', '0');
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

document.addEventListener('DOMContentLoaded', () => {
  pasteZones.forEach(z => z.setAttribute('tabindex', '0'));
  // начальная отрисовка пустых таблиц
  renderTable(1);
  renderTable(2);
});