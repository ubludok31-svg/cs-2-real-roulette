const STORAGE_KEY = 'caseRouletteConfigV4';
const LEGACY_STORAGE_KEYS = ['caseRouletteConfigV3', 'caseRouletteConfigV2', 'caseRouletteConfigV1'];
const TOTAL_CASES = 16;

function makeSvgPlaceholder(text, bg = '#1b2434', accent = '#ffb347') {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${bg}" />
          <stop offset="100%" stop-color="#0e1624" />
        </linearGradient>
      </defs>
      <rect width="800" height="600" fill="url(#g)" />
      <rect x="40" y="40" width="720" height="520" rx="36" fill="none" stroke="${accent}" stroke-opacity="0.35" stroke-width="8" />
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="54" fill="#ffffff">${text}</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function defaultImage(text) {
  return makeSvgPlaceholder(text);
}

const rarityLabelMap = {
  consumer: 'Белая',
  industrial: 'Голубая',
  'mil-spec': 'Синяя',
  restricted: 'Фиолетовая',
  classified: 'Розовая',
  covert: 'Красная',
  rare: 'Золотая',
};

const defaultItems = [
  { name: 'Blue Steel', image: 'assets/demo-blue.svg', weight: 45, rarity: 'mil-spec' },
  { name: 'Night Ops', image: 'assets/demo-purple.svg', weight: 30, rarity: 'restricted' },
  { name: 'Crimson Web', image: 'assets/demo-pink.svg', weight: 18, rarity: 'classified' },
  { name: 'Golden Relic', image: 'assets/demo-gold.svg', weight: 7, rarity: 'rare' },
];

function makeInitialConfig() {
  return {
    cases: Array.from({ length: TOTAL_CASES }, (_, index) => ({
      id: index + 1,
      name: `Кейс ${String(index + 1).padStart(2, '0')}`,
      opened: false,
      lastWon: null,
      items: structuredClone(defaultItems),
    })),
  };
}

function normalizeItem(item, fallbackIndex = 0) {
  return {
    name: item?.name || `Предмет ${fallbackIndex + 1}`,
    image: item?.image || defaultImage(`Item ${fallbackIndex + 1}`),
    weight: Math.max(1, Number(item?.weight) || 1),
    rarity: normalizeRarity(item?.rarity),
  };
}

function normalizeCase(rawCase, fallbackId) {
  const fallbackName = `Кейс ${String(fallbackId).padStart(2, '0')}`;
  const rawItems = Array.isArray(rawCase?.items) && rawCase.items.length ? rawCase.items : structuredClone(defaultItems);

  return {
    id: Number(rawCase?.id) || fallbackId,
    name: rawCase?.name || fallbackName,
    opened: false,
    lastWon: null,
    items: rawItems.map((item, index) => normalizeItem(item, index)),
  };
}

function normalizeAppState(rawState) {
  const base = makeInitialConfig();
  const sourceCases = Array.isArray(rawState?.cases) ? rawState.cases : [];

  base.cases = base.cases.map((fallbackCase, index) => {
    const found = sourceCases.find((item) => Number(item?.id) === fallbackCase.id) || sourceCases[index];
    return normalizeCase(found || fallbackCase, index + 1);
  });

  return base;
}

function serializeConfig(state) {
  return {
    cases: state.cases.map((caseData, index) => ({
      id: Number(caseData.id) || index + 1,
      name: caseData.name || `Кейс ${String(index + 1).padStart(2, '0')}`,
      opened: false,
      lastWon: null,
      items: caseData.items.map((item, itemIndex) => normalizeItem(item, itemIndex)),
    })),
  };
}

let appState = loadConfig();
let selectedCaseId = 1;
let currentSpinCaseId = 1;
let isSpinning = false;

const casesGrid = document.getElementById('casesGrid');
const caseSelector = document.getElementById('caseSelector');
const itemsEditor = document.getElementById('itemsEditor');
const addItemBtn = document.getElementById('addItemBtn');
const copyCaseToAllBtn = document.getElementById('copyCaseToAllBtn');
const saveConfigBtn = document.getElementById('saveConfigBtn');
const resetBtn = document.getElementById('resetBtn');
const resetOpenedBtn = document.getElementById('resetOpenedBtn');
const importConfigBtn = document.getElementById('importConfigBtn');
const configInput = document.getElementById('configInput');
const rouletteModal = document.getElementById('rouletteModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const closeRouletteBackdrop = document.getElementById('closeRouletteBackdrop');
const rouletteTrack = document.getElementById('rouletteTrack');
const resultCard = document.getElementById('resultCard');
const modalTitle = document.getElementById('modalTitle');
const modalHint = document.getElementById('modalHint');
const resultCloseBtn = document.getElementById('resultCloseBtn');
const openAdminBtn = document.getElementById('openAdminBtn');
const adminModal = document.getElementById('adminModal');
const closeAdminBtn = document.getElementById('closeAdminBtn');
const closeAdminBackdrop = document.getElementById('closeAdminBackdrop');

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

  copyCaseToAllBtn.addEventListener('click', copySelectedCaseToAll);

  resetOpenedBtn.addEventListener('click', () => {
    if (!confirm('Сделать все кейсы снова закрытыми?')) return;
    appState.cases.forEach((caseData) => {
      caseData.opened = false;
      caseData.lastWon = null;
    });
    renderCasesGrid();
  });

  resetBtn.addEventListener('click', () => {
    if (!confirm('Сбросить все кейсы и предметы к дефолтному состоянию?')) return;
    appState = makeInitialConfig();
    selectedCaseId = 1;
    persistAndRender();
  });

  importConfigBtn.addEventListener('click', () => configInput.click());
  configInput.addEventListener('change', importConfig);

  openAdminBtn.addEventListener('click', openAdminModal);
  closeAdminBtn.addEventListener('click', closeAdminModal);
  closeAdminBackdrop.addEventListener('click', closeAdminModal);

  closeModalBtn.addEventListener('click', closeRouletteModal);
  closeRouletteBackdrop.addEventListener('click', closeRouletteModal);
  resultCloseBtn.addEventListener('click', closeRouletteModal);
}

function openAdminModal() {
  adminModal.classList.remove('hidden');
  adminModal.setAttribute('aria-hidden', 'false');
}

function closeAdminModal() {
  adminModal.classList.add('hidden');
  adminModal.setAttribute('aria-hidden', 'true');
}

function openRouletteModal() {
  rouletteModal.classList.remove('hidden');
  rouletteModal.setAttribute('aria-hidden', 'false');
}

function closeRouletteModal() {
  if (isSpinning) return;
  rouletteModal.classList.add('hidden');
  rouletteModal.setAttribute('aria-hidden', 'true');
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
    const badge = node.querySelector('.case-badge');
    const meta = node.querySelector('.case-meta');

    node.querySelector('.case-name').textContent = caseData.name;

    if (caseData.opened) {
      node.classList.add('is-opened');
      badge.textContent = 'ОТКРЫТ';
      meta.innerHTML = caseData.lastWon
        ? `Выпал:<br><strong>${escapeHtml(caseData.lastWon.name)}</strong>`
        : 'Кейс уже открыт';
    } else {
      badge.textContent = 'ЗАКРЫТ';
      meta.textContent = `${caseData.items.length} предметов внутри`;
    }

    node.addEventListener('click', () => {
      if (caseData.opened) {
        showOpenedCase(caseData);
        return;
      }
      openCase(caseData.id);
    });

    casesGrid.appendChild(node);
  });
}

function renderEditor() {
  const currentCase = getCaseById(selectedCaseId);
  itemsEditor.innerHTML = '';

  currentCase.items.forEach((item, index) => {
    const template = document.getElementById('editorItemTemplate');
    const node = template.content.firstElementChild.cloneNode(true);

    node.querySelectorAll('[data-field]').forEach((field) => {
      const key = field.dataset.field;
      if (key === 'file') {
        field.addEventListener('change', async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;

          try {
            const dataUrl = await fileToDataUrl(file);
            currentCase.items[index].image = dataUrl;
            persistAndRender(false);
          } catch {
            alert('Не удалось прочитать файл. Попробуй другой JPG/JPEG.');
          }
        });
        return;
      }

      field.value = item[key];
      field.addEventListener('input', (event) => {
        let value = event.target.value;
        if (key === 'weight') value = Math.max(1, Number(value) || 1);
        if (key === 'rarity') value = normalizeRarity(value);
        currentCase.items[index][key] = value;
        persistAndRender(false);
      });
    });

    const preview = node.querySelector('.preview-thumb');
    setArtBackground(preview, item.image);

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

function showOpenedCase(caseData) {
  openRouletteModal();
  rouletteTrack.innerHTML = '';
  rouletteTrack.style.transition = 'none';
  rouletteTrack.style.transform = 'translateX(0px)';
  modalTitle.textContent = `${caseData.name} — уже открыт`;
  modalHint.textContent = 'Этот кейс уже открыт и останется открытым до обновления страницы.';
  showResult(caseData.lastWon || normalizeItem(caseData.items[0], 0), true);
}

function copySelectedCaseToAll() {
  const sourceCase = getCaseById(selectedCaseId);
  if (!sourceCase) return;

  if (!confirm(`Скопировать предметы из кейса "${sourceCase.name}" во все 16 кейсов?`)) return;

  const clonedItems = sourceCase.items.map((item, index) => normalizeItem(structuredClone(item), index));

  appState.cases.forEach((caseData) => {
    caseData.items = clonedItems.map((item, index) => normalizeItem(structuredClone(item), index));
  });

  persistAndRender();
  alert('Содержимое выбранного кейса скопировано во все кейсы.');
}

function openCase(caseId) {
  const caseData = getCaseById(caseId);
  currentSpinCaseId = caseId;
  modalTitle.textContent = `${caseData.name} — открытие`;
  modalHint.textContent = 'Предмет выбирается случайно из наполнения этого кейса. Открытые кейсы держатся до обновления страницы.';
  resultCard.classList.add('hidden');
  openRouletteModal();
  runSpin(caseData);
}

function runSpin(caseData) {
  rouletteTrack.innerHTML = '';
  rouletteTrack.style.transition = 'none';
  rouletteTrack.style.transform = 'translateX(0px)';
  resultCard.classList.add('hidden');
  isSpinning = true;

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
  runSpin.timeoutId = window.setTimeout(() => {
    markCaseOpened(currentSpinCaseId, winningItem);
    isSpinning = false;
    showResult(winningItem, false);
  }, 5900);
}

function showResult(item, alreadyOpened) {
  resultCard.classList.remove('hidden');
  resultCard.innerHTML = `
    <div class="result-card-inner">
      <div class="result-art"></div>
      <div>
        <div class="item-rarity">${alreadyOpened ? 'Кейс уже был открыт' : 'Выпал предмет'}</div>
        <h3>${escapeHtml(item.name)}</h3>
        <p class="item-rarity">Редкость: ${escapeHtml(rarityLabelMap[normalizeRarity(item.rarity)] || item.rarity)}</p>
      </div>
    </div>
  `;

  const art = resultCard.querySelector('.result-art');
  setArtBackground(art, item.image);
}

function createRouletteCard(item) {
  const card = document.createElement('div');
  card.className = `roulette-item rarity-${normalizeRarity(item.rarity)}`;
  card.innerHTML = `
    <div class="item-art"></div>
    <div class="item-name">${escapeHtml(item.name)}</div>
    <div class="item-rarity">${escapeHtml(rarityLabelMap[normalizeRarity(item.rarity)] || item.rarity)}</div>
  `;
  setArtBackground(card.querySelector('.item-art'), item.image);
  return card;
}

function setArtBackground(element, image) {
  const source = image || defaultImage('No Image');
  element.style.backgroundImage = `linear-gradient(180deg, rgba(0,0,0,0.12), rgba(0,0,0,0.42)), url("${escapeCssUrl(source)}")`;
}

function markCaseOpened(caseId, winningItem) {
  const caseData = getCaseById(caseId);
  caseData.opened = true;
  caseData.lastWon = normalizeItem(winningItem, 0);
  renderCasesGrid();
}

function pickWeighted(items) {
  const expanded = items.map((item, index) => normalizeItem(item, index));
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeConfig(appState)));
}

function loadConfig() {
  const stored = localStorage.getItem(STORAGE_KEY) || LEGACY_STORAGE_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);
  if (!stored) return makeInitialConfig();
  try {
    return normalizeAppState(JSON.parse(stored));
  } catch {
    return makeInitialConfig();
  }
}

function persistAndRender(full = true) {
  saveConfig();
  if (full) renderCaseSelector();
  renderCasesGrid();
  renderEditor();
}

function downloadConfig() {
  const normalized = serializeConfig(normalizeAppState(appState));
  const blob = new Blob([JSON.stringify(normalized, null, 2)], { type: 'application/json' });
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
      appState = normalizeAppState(parsed);
      selectedCaseId = appState.cases[0]?.id || 1;
      persistAndRender();
      alert('Конфиг успешно импортирован. Все кейсы стартуют закрытыми.');
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

function escapeCssUrl(value) {
  return String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
