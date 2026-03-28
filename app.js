const STORAGE_KEY = 'caseRouletteConfigV1';
const TOTAL_CASES = 16;

function makeSvgPlaceholder(text, bg = '#1b2434', accent = '#ffb347') {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${bg}" />
          <stop offset="100%" stop-color="#0e1624" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" rx="24" fill="url(#g)"/>
      <rect x="20" y="20" width="360" height="260" rx="18" fill="none" stroke="rgba(255,255,255,0.12)"/>
      <circle cx="320" cy="68" r="26" fill="${accent}" opacity="0.22"/>
      <text x="200" y="150" text-anchor="middle" dominant-baseline="middle" fill="#ecf2ff" font-family="Arial, sans-serif" font-size="30" font-weight="700">${text}</text>
      <text x="200" y="190" text-anchor="middle" dominant-baseline="middle" fill="#9fb0d1" font-family="Arial, sans-serif" font-size="16">Case Item</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const defaultImage = (text) => makeSvgPlaceholder(text);

const defaultItems = [
  { name: 'Blue Steel', image: 'assets/demo-blue.svg', weight: 45, rarity: 'mil-spec' },
  { name: 'Night Ops', image: 'assets/demo-purple.svg', weight: 30, rarity: 'restricted' },
  { name: 'Crimson Web', image: 'assets/demo-pink.svg', weight: 18, rarity: 'classified' },
  { name: 'Golden Relic', image: 'assets/demo-gold.svg', weight: 7, rarity: 'rare' },
];

const makeInitialConfig = () => ({
  cases: Array.from({ length: TOTAL_CASES }, (_, i) => ({
    id: i + 1,
    name: `Кейс ${String(i + 1).padStart(2, '0')}`,
    items: structuredClone(defaultItems),
  })),
});

let appState = loadConfig();
let selectedCaseId = 1;
let currentSpinCaseId = 1;

const casesGrid = document.getElementById('casesGrid');
const caseSelector = document.getElementById('caseSelector');
const itemsEditor = document.getElementById('itemsEditor');
const addItemBtn = document.getElementById('addItemBtn');
const saveConfigBtn = document.getElementById('saveConfigBtn');
const resetBtn = document.getElementById('resetBtn');
const importConfigBtn = document.getElementById('importConfigBtn');
const configInput = document.getElementById('configInput');
const rouletteModal = document.getElementById('rouletteModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const closeModalBackdrop = document.getElementById('closeModalBackdrop');
const rouletteTrack = document.getElementById('rouletteTrack');
const resultCard = document.getElementById('resultCard');
const modalTitle = document.getElementById('modalTitle');
const spinAgainBtn = document.getElementById('spinAgainBtn');

init();

function init() {
  renderCaseSelector();
  renderCasesGrid();
  renderEditor();
  bindEvents();
}

function bindEvents() {
  caseSelector.addEventListener('change', (event) => {
    selectedCaseId = Number(event.target.value);
    renderEditor();
  });

  addItemBtn.addEventListener('click', () => {
    const currentCase = getCaseById(selectedCaseId);
    currentCase.items.push({
      name: 'Новый предмет',
      image: defaultImage('New Item'),
      weight: 1,
      rarity: 'consumer',
    });
    persistAndRender();
  });

  saveConfigBtn.addEventListener('click', downloadConfig);

  resetBtn.addEventListener('click', () => {
    if (!confirm('Сбросить все кейсы к дефолтному состоянию?')) return;
    appState = makeInitialConfig();
    selectedCaseId = 1;
    persistAndRender();
  });

  importConfigBtn.addEventListener('click', () => configInput.click());
  configInput.addEventListener('change', importConfig);

  closeModalBtn.addEventListener('click', closeModal);
  closeModalBackdrop.addEventListener('click', closeModal);
  spinAgainBtn.addEventListener('click', () => openCase(currentSpinCaseId));
}

function renderCaseSelector() {
  caseSelector.innerHTML = '';
  appState.cases.forEach((caseData) => {
    const option = document.createElement('option');
    option.value = caseData.id;
    option.textContent = `${caseData.id}. ${caseData.name}`;
    if (caseData.id === selectedCaseId) option.selected = true;
    caseSelector.appendChild(option);
  });
}

function renderCasesGrid() {
  casesGrid.innerHTML = '';
  const template = document.getElementById('caseCardTemplate');

  appState.cases.forEach((caseData) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.querySelector('.case-name').textContent = caseData.name;
    node.querySelector('.case-count').textContent = `${caseData.items.length} предметов`;
    node.addEventListener('click', () => openCase(caseData.id));
    casesGrid.appendChild(node);
  });
}

function renderEditor() {
  const currentCase = getCaseById(selectedCaseId);
  itemsEditor.innerHTML = '';

  currentCase.items.forEach((item, index) => {
    const template = document.getElementById('editorItemTemplate');
    const node = template.content.firstElementChild.cloneNode(true);

    const fields = node.querySelectorAll('[data-field]');
    fields.forEach((field) => {
      const key = field.dataset.field;
      field.value = item[key];
      field.addEventListener('input', (event) => {
        let value = event.target.value;
        if (key === 'weight') value = Math.max(1, Number(value) || 1);
        currentCase.items[index][key] = value;
        saveConfig();
        renderCasesGrid();
      });
    });

    node.querySelector('.remove-item-btn').addEventListener('click', () => {
      currentCase.items.splice(index, 1);
      if (!currentCase.items.length) {
        currentCase.items.push({
          name: 'Пустой слот',
          image: defaultImage('Empty Slot'),
          weight: 1,
          rarity: 'consumer',
        });
      }
      persistAndRender();
    });

    itemsEditor.appendChild(node);
  });
}

function openCase(caseId) {
  currentSpinCaseId = caseId;
  const caseData = getCaseById(caseId);
  modalTitle.textContent = `${caseData.name} — открытие`;
  rouletteModal.classList.remove('hidden');
  rouletteModal.setAttribute('aria-hidden', 'false');
  resultCard.classList.add('hidden');
  runSpin(caseData);
}

function closeModal() {
  rouletteModal.classList.add('hidden');
  rouletteModal.setAttribute('aria-hidden', 'true');
}

function runSpin(caseData) {
  rouletteTrack.innerHTML = '';
  rouletteTrack.style.transition = 'none';
  rouletteTrack.style.transform = 'translateX(0px)';

  const winningItem = pickWeighted(caseData.items);
  const trackItems = [];
  const totalSlots = 46;
  const winnerIndex = 38;

  for (let i = 0; i < totalSlots; i += 1) {
    if (i === winnerIndex) {
      trackItems.push(winningItem);
    } else {
      trackItems.push(caseData.items[Math.floor(Math.random() * caseData.items.length)]);
    }
  }

  trackItems.forEach((item) => {
    rouletteTrack.appendChild(createRouletteCard(item));
  });

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const itemWidth = 190;
      const wrapperWidth = rouletteTrack.parentElement.clientWidth;
      const targetOffset = (winnerIndex * itemWidth) - (wrapperWidth / 2) + (itemWidth / 2) + randomInt(-24, 24);
      rouletteTrack.style.transition = 'transform 5.6s cubic-bezier(0.08, 0.8, 0.16, 1)';
      rouletteTrack.style.transform = `translateX(-${targetOffset}px)`;
    });
  });

  window.clearTimeout(runSpin.timeoutId);
  runSpin.timeoutId = window.setTimeout(() => showResult(winningItem), 5900);
}

function showResult(item) {
  resultCard.classList.remove('hidden');
  resultCard.innerHTML = `
    <div class="result-card-inner">
      <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" onerror="this.src='${defaultImage('No Image')}'" />
      <div>
        <div class="item-rarity">Выпал предмет</div>
        <h3>${escapeHtml(item.name)}</h3>
        <p class="item-rarity">Редкость: ${escapeHtml(item.rarity)}</p>
        <p class="subtitle">Вес в конфиге: ${Number(item.weight) || 1}</p>
      </div>
    </div>
  `;
}

function createRouletteCard(item) {
  const card = document.createElement('div');
  card.className = `roulette-item rarity-${normalizeRarity(item.rarity)}`;
  card.innerHTML = `
    <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" onerror="this.src='${defaultImage('No Image')}'" />
    <div class="item-name">${escapeHtml(item.name)}</div>
    <div class="item-rarity">${escapeHtml(item.rarity)}</div>
  `;
  return card;
}

function pickWeighted(items) {
  const expanded = items.map((item) => ({
    ...item,
    weight: Math.max(1, Number(item.weight) || 1),
  }));
  const totalWeight = expanded.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;

  for (const item of expanded) {
    random -= item.weight;
    if (random <= 0) return item;
  }
  return expanded[expanded.length - 1];
}

function getCaseById(caseId) {
  return appState.cases.find((item) => item.id === caseId);
}

function saveConfig() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

function loadConfig() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return makeInitialConfig();
  try {
    const parsed = JSON.parse(stored);
    if (!parsed?.cases?.length) return makeInitialConfig();
    return parsed;
  } catch {
    return makeInitialConfig();
  }
}

function persistAndRender() {
  saveConfig();
  renderCaseSelector();
  renderCasesGrid();
  renderEditor();
}

function downloadConfig() {
  const blob = new Blob([JSON.stringify(appState, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'config.json';
  link.click();
  URL.revokeObjectURL(url);
}

function importConfig(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed?.cases || !Array.isArray(parsed.cases)) throw new Error('Bad format');
      appState = parsed;
      selectedCaseId = parsed.cases[0]?.id || 1;
      persistAndRender();
      alert('Конфиг успешно импортирован.');
    } catch {
      alert('Не удалось прочитать config.json');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function normalizeRarity(rarity) {
  const allowed = ['consumer', 'industrial', 'mil-spec', 'restricted', 'classified', 'covert', 'rare'];
  return allowed.includes(rarity) ? rarity : 'consumer';
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
