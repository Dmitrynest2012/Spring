// Хранилища данных для каждого блока
const data = {
  1: new Map(), // Map<нормализованное_название_из_первого_столбца, значение_как_строка>
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
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/ в крови$/i, '')
    .trim();
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
    const div = document.createElement('div');
    div.innerHTML = `<strong>${item.key}</strong> = ${normalizeValueForDisplay(item.value)}`;
    matchesList.appendChild(div);
  });
}

function highlightMatches(column) {
  const tbody = tables[column];
  const other = column === 1 ? 2 : 1;

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
    // Показываем название так, как оно пришло из первого столбца (нормализованное)
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
  const other = column === 1 ? 2 : 1;
  highlightMatches(other);
  updateCommonMatches();
}

function processPastedText(text, column) {
  const lines = text.split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);  // убираем пустые строки

  let i = 0;
  while (i + 2 < lines.length) {
    const potentialName    = lines[i];     // столбец 1 — берём отсюда название
    const potentialLabName = lines[i + 1]; // столбец 2 — игнорируем полностью
    const potentialValue   = lines[i + 2]; // столбец 3 — берём отсюда значение

    // Проверяем, похоже ли на начало показателя
    if (
      potentialName.length > 4 &&                          // разумная длина названия
      !/^(optimal|high|higher|low|норм|реф|left|right)$/i.test(potentialName) &&
      // значение выглядит как число / < > / короткий текст
      (
        /^[<≥>≤~-]?\s*\d+[.,]?\d*/.test(potentialValue) ||
        potentialValue.length < 20 && (
          potentialValue.includes('.') ||
          potentialValue.includes(',') ||
          potentialValue.includes('<') ||
          potentialValue.includes('>') ||
          /[0-9]/.test(potentialValue) ||
          potentialValue.toLowerCase().includes('отриц') ||
          potentialValue.toLowerCase().includes('следы')
        )
      )
    ) {
      const name = potentialName;
      const value = potentialValue;

      const normKey = normalizeKey(name);

      if (normKey.length >= 4 && !data[column].has(normKey)) {
        data[column].set(normKey, value);
      }

      // Перепрыгиваем типичный блок (6 строк)
      i += 6;
      continue;
    }

    // Если не подошло — идём дальше по одной строке
    i++;
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
  renderTable(1);
  renderTable(2);
});