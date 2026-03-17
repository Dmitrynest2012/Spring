// Хранилища данных для каждого блока
const data = {
  1: new Map(), // Map<нормализованное название из 1-го столбца, значение как строка из 3-го столбца>
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
  if (!key) return '';
  return key
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^а-яёa-z0-9\s()\-.,]/gi, '')
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/ в крови$/i, '')
    .replace(/ \(.*$/i, '')
    .trim();
}

function normalizeValueForDisplay(val) {
  return (val || '').trim();
}

function valuesAreEqual(a, b) {
  if (!a || !b) return false;
  const normA = normalizeValueForDisplay(a);
  const normB = normalizeValueForDisplay(b);
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

  // Если второй блок пуст — никакой подсветки
  if (data[other].size === 0) {
    tbody.querySelectorAll('tr').forEach(tr => tr.classList.remove('highlight'));
    return;
  }

  tbody.querySelectorAll('tr').forEach(tr => {
    const keyCell = tr.cells[0];
    if (!keyCell) return;

    const key = normalizeKey(keyCell.textContent);
    tr.classList.remove('highlight');

    if (data[other].has(key)) {
      const valThis  = data[column].get(key);
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
  const other = column === 1 ? 2 : 1;
  highlightMatches(other);
  updateCommonMatches();
}

function processPastedText(text, column) {
  const lines = text.split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  let i = 0;
  while (i < lines.length - 2) {
    const s1 = lines[i];           // предполагаемое название (столбец 1)
    const s2 = lines[i + 1];       // лабораторное имя (столбец 2)
    const s3 = lines[i + 2];       // значение (столбец 3)

    // Критерий «пара названий»: s2 содержит s1 или наоборот, или они почти равны после очистки
    const clean1 = s1.toLowerCase().replace(/\s+/g, ' ').trim();
    const clean2 = s2.toLowerCase().replace(/\s+/g, ' ').trim();

    const isNamePair =
      (clean1.length > 4 && clean2.length > 4) &&
      (clean2.includes(clean1) || clean1.includes(clean2) ||
       clean1.replace(/[^а-яёa-z0-9 ]/gi, '') === clean2.replace(/[^а-яёa-z0-9 ]/gi, ''));

    // Значение должно выглядеть как число/диапазон/текст-результат, но НЕ как оценка
    const isLikelyValue =
      s3.length > 0 &&
      s3.length < 30 &&
      !/^(optimal|high|higher|low|lower|critical|повышен|понижен|норм|реф|grade)$/i.test(s3.trim()) &&
      (
        /^[<≥>≤~]?\s*-?\d+[.,]?\d*/.test(s3) ||
        s3.includes('<') || s3.includes('>') ||
        s3.toLowerCase().includes('отриц') ||
        s3.toLowerCase().includes('следы') ||
        (s3.length < 15 && /[0-9.,]/.test(s3))
      );

    if (isNamePair && isLikelyValue) {
      // Берём название из первой строки (обычно более «красивое»)
      const name = s1;
      const value = s3;

      const normKey = normalizeKey(name);

      if (normKey.length >= 4 && !data[column].has(normKey)) {
        data[column].set(normKey, value);
      }

      // Прыгаем далеко вперёд — типичный блок 6 строк
      i += 6;
      continue;
    }

    // Если не нашлось — сдвигаемся минимально, чтобы поймать сдвинутые блоки
    i += 1;
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