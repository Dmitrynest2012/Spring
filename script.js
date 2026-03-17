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
    .replace(/[^а-яёa-z0-9\s()\-.,]/gi, ''); // убираем странные символы, оставляем осмысленное
}

function normalizeValueForDisplay(val) {
  return val.trim(); // можно добавить дополнительные замены, если нужно
}

function valuesAreEqual(valA, valB) {
  // Сравниваем строки после приведения к одному виду
  const a = valA.trim().replace(/\s+/g, ' ');
  const b = valB.trim().replace(/\s+/g, ' ');
  return a === b;
}

function updateCommonMatches() {
  const common = [];

  for (const [key, val1] of data[1]) {
    if (data[2].has(key)) {
      const val2 = data[2].get(key);
      if (valuesAreEqual(val1, val2)) {
        common.push({ key, value: val1 });
      }
    }
  }

  // Сортируем по названию
  common.sort((a, b) => a.key.localeCompare(b.key, 'ru'));

  matchesList.innerHTML = '';
  if (common.length === 0) {
    matchesList.textContent = '';
    return;
  }

  const fragments = common.map(item => {
    const span = document.createElement('span');
    span.innerHTML = `<strong>${item.key}</strong> = ${normalizeValueForDisplay(item.value)}`;
    return span;
  });

  matchesList.append(...fragments);
}

function highlightMatches(column) {
  const tbody = tables[column];
  const other = column === 1 ? 2 : 1;

  tbody.querySelectorAll('tr').forEach(tr => {
    const keyCell = tr.cells[0];
    if (!keyCell) return;

    const key = normalizeKey(keyCell.textContent);
    tr.classList.remove('highlight');

    if (data[other].has(key)) {
      const valThis = data[column].get(key);
      const valOther = data[other].get(key);
      if (valuesAreEqual(valThis, valOther)) {
        tr.classList.add('highlight');
      }
    }
  });
}

function renderTable(column) {
  const tbody = tables[column];
  tbody.innerHTML = '';

  // Сортируем по названию показателя
  const sorted = [...data[column].entries()].sort((a, b) =>
    a[0].localeCompare(b[0], 'ru')
  );

  for (const [normKey, value] of sorted) {
    // В таблице показываем оригинальное название (берём первое вхождение или можно хранить отдельно)
    // Здесь для простоты используем normKey как отображаемое (можно улучшить)
    const displayName = normKey; // ← можно хранить оригинальное название отдельно, если важно

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${displayName}</td>
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
    .filter(l => l !== '');

  let i = 0;
  while (i + 5 < lines.length) {           // минимум 6 строк на показатель
    const name1 = lines[i];
    // const name2 = lines[i + 1];         // игнорируем вторую строку (лаб-нейм)
    const valueStr = lines[i + 2];

    // Пропускаем, если значение выглядит как заголовок/мусор
    if (/^(левая|правая|реф|норма|grade|left|right|optimal|high|higher|низкий|повышен)$/i.test(valueStr)) {
      i += 1;
      continue;
    }

    // Значение оставляем как есть — строка
    const value = valueStr;

    // Берём название из первой строки
    let displayName = name1.trim();

    // Защита от совсем пустых/мусорных названий
    if (displayName.length < 2 || /^\d/.test(displayName)) {
      i += 1;
      continue;
    }

    const normKey = normalizeKey(displayName);

    // Добавляем только если такого показателя ещё нет
    if (!data[column].has(normKey)) {
      data[column].set(normKey, value);
    }

    // Переходим к следующему блоку (6 строк)
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
    if (text.trim()) {
      processPastedText(text, col);
    }
  });

  // Подсветка зоны при фокусе
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

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
  pasteZones.forEach(z => z.setAttribute('tabindex', '0'));
});