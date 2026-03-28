const PRIMARY_STORAGE_KEY = 'stream-case-game-v8';
const LEGACY_STORAGE_KEYS = ['stream-case-game-v7', 'stream-case-game-v6'];
const STAGE_DEFS = [
  {
    id: 'round1',
    type: 'regular',
    label: 'Раунд 1',
    shortLabel: 'R1',
    description: 'Правила: зрители выбирают номер кейса и вкус. Совпавший вкус даёт +1 очко. Для приза нужно 2 очка за раунд.'
  },
  {
    id: 'round2',
    type: 'regular',
    label: 'Раунд 2',
    shortLabel: 'R2',
    description: 'Правила: всё как в первом раунде. Пустой вкус не даёт очков, а спец-предметы работают по своей подписи.'
  },
  {
    id: 'extra1',
    type: 'extra',
    label: 'Экстра Раунд 1',
    shortLabel: 'EX1',
    description: 'Экстра-раунд: отдельная золотая настройка, редкий визуал и отдельное наполнение. Для приза всё так же нужно 2 очка за раунд.'
  },
  {
    id: 'round3',
    type: 'regular',
    label: 'Раунд 3',
    shortLabel: 'R3',
    description: 'Правила: продолжается обычная игра. Открывай кейс, который выбрали зрители, и считай очки по выпавшему предмету.'
  },
  {
    id: 'round4',
    type: 'regular',
    label: 'Раунд 4',
    shortLabel: 'R4',
    description: 'Правила: обычный раунд с теми же условиями. Пустой вкус не даёт очков, бонусные предметы дают преимущество.'
  },
  {
    id: 'round5',
    type: 'regular',
    label: 'Раунд 5',
    shortLabel: 'R5',
    description: 'Правила: финальный основной раунд. После него можно перейти в последний бонусный этап.'
  },
  {
    id: 'extra2',
    type: 'extra',
    label: 'Экстра Раунд 2',
    shortLabel: 'EX2',
    description: 'Финальный экстра-раунд: отдельное золотое наполнение, отдельные шансы и такой же порог — 2 очка за один раунд.'
  },
];

const rarityLabelMap = {
  consumer: 'Белая',
  industrial: 'Голубая',
  'mil-spec': 'Синяя',
  restricted: 'Фиолетовая',
  classified: 'Розовая',
  covert: 'Красная',
  rare: 'Золотая',
};

const effectLabelMap = {
  empty: 'Пустой вкус',
  plus: 'Плюс одно очко',
  auto: 'Авто плюс 1 — плюс одно очко',
  bomb: 'Бомба — сброс всех очков',
};

const effectHeadlineMap = {
  empty: 'Пустой вкус',
  plus: '+1 ОЧКО',
  auto: 'АВТО +1',
  bomb: 'БОМБА',
};

function defaultImage(seed) {
  const safe = encodeURIComponent(seed);
  return `https://placehold.co/900x900/101826/EAF1FF?text=${safe}`;
}

function inferEffectFromName(name = '') {
  const lower = String(name).trim().toLowerCase();
  if (lower.includes('бомб')) return 'bomb';
  if (lower.includes('авто') || lower.includes('галоч') || lower.includes('check')) return 'auto';
  return 'empty';
}

function normalizeEffect(effect, name = '') {
  const allowed = ['empty', 'plus', 'auto', 'bomb'];
  if (allowed.includes(effect)) return effect;
  return inferEffectFromName(name);
}

function makeItemId() {
  return `item_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function itemSignature(item) {
  return [item.name, item.image, item.rarity, item.effect].join('__');
}

function previewSignature(item) {
  return [String(item.name).trim().toLowerCase(), item.image, item.effect].join('__');
}

function makeDefaultItems(stageType) {
  if (stageType === 'extra') {
    return [
      { id: makeItemId(), name: 'Манго Экстра', image: defaultImage('Extra Mango'), weight: 5, rarity: 'rare', effect: 'plus' },
      { id: makeItemId(), name: 'Арбуз Экстра', image: defaultImage('Extra Watermelon'), weight: 4, rarity: 'classified', effect: 'empty' },
      { id: makeItemId(), name: 'Авто плюс 1', image: defaultImage('Auto Plus 1'), weight: 2, rarity: 'rare', effect: 'auto' },
    ];
  }
  return [
    { id: makeItemId(), name: 'Манго', image: defaultImage('Mango'), weight: 5, rarity: 'industrial', effect: 'empty' },
    { id: makeItemId(), name: 'Клубника', image: defaultImage('Strawberry'), weight: 4, rarity: 'mil-spec', effect: 'empty' },
    { id: makeItemId(), name: 'Авто плюс 1', image: defaultImage('Auto Plus 1'), weight: 2, rarity: 'restricted', effect: 'auto' },
    { id: makeItemId(), name: 'Бомба', image: defaultImage('Bomb'), weight: 1, rarity: 'covert', effect: 'bomb' },
  ];
}

function makeStage(stageDef) {
  const items = makeDefaultItems(stageDef.type);
  return {
    id: stageDef.id,
    type: stageDef.type,
    label: stageDef.label,
    shortLabel: stageDef.shortLabel,
    description: stageDef.description,
    forcedNextItemSignature: '',
    cases: Array.from({ length: 16 }, (_, index) => ({
      id: index + 1,
      name: `Кейс ${String(index + 1).padStart(2, '0')}`,
      items: structuredClone(items),
    })),
  };
}

function makeInitialState() {
  return {
    currentStageId: STAGE_DEFS[0].id,
    finishedStageIds: [],
    stages: STAGE_DEFS.map(makeStage),
  };
}

function normalizeRarity(rarity) {
  const allowed = ['consumer', 'industrial', 'mil-spec', 'restricted', 'classified', 'covert', 'rare'];
  return allowed.includes(rarity) ? rarity : 'consumer';
}

function normalizeItem(rawItem, index) {
  const name = String(rawItem?.name || `Предмет ${index + 1}`);
  return {
    id: String(rawItem?.id || makeItemId()),
    name,
    image: String(rawItem?.image || defaultImage(`Item ${index + 1}`)),
    weight: Math.max(1, Number(rawItem?.weight) || 1),
    rarity: normalizeRarity(rawItem?.rarity),
    effect: normalizeEffect(rawItem?.effect, name),
  };
}

function normalizeCase(rawCase, fallbackId, stageType) {
  const fallbackItems = makeDefaultItems(stageType);
  const sourceItems = Array.isArray(rawCase?.items) && rawCase.items.length ? rawCase.items : fallbackItems;
  return {
    id: Number(rawCase?.id) || fallbackId,
    name: String(rawCase?.name || `Кейс ${String(fallbackId).padStart(2, '0')}`),
    items: sourceItems.map((item, index) => normalizeItem(item, index)),
  };
}

function normalizeStage(rawStage, stageDef) {
  const sourceCases = Array.isArray(rawStage?.cases) ? rawStage.cases : [];
  const normalizedCases = Array.from({ length: 16 }, (_, index) => {
    const fallbackId = index + 1;
    const found = sourceCases.find((entry) => Number(entry?.id) === fallbackId) || sourceCases[index];
    return normalizeCase(found, fallbackId, stageDef.type);
  });

  return {
    id: stageDef.id,
    type: stageDef.type,
    label: stageDef.label,
    shortLabel: stageDef.shortLabel,
    description: stageDef.description,
    forcedNextItemSignature: String(rawStage?.forcedNextItemSignature || ''),
    cases: normalizedCases,
  };
}

function normalizeState(rawState) {
  const currentStageId = STAGE_DEFS.some((def) => def.id === rawState?.currentStageId) ? rawState.currentStageId : STAGE_DEFS[0].id;
  const stages = STAGE_DEFS.map((stageDef) => {
    const found = Array.isArray(rawState?.stages) ? rawState.stages.find((entry) => entry?.id === stageDef.id) : null;
    return normalizeStage(found, stageDef);
  });
  const finishedStageIds = Array.isArray(rawState?.finishedStageIds)
    ? rawState.finishedStageIds.filter((id) => STAGE_DEFS.some((def) => def.id === id))
    : [];

  return { currentStageId, finishedStageIds, stages };
}

function saveState() {
  localStorage.setItem(PRIMARY_STORAGE_KEY, JSON.stringify(appState));
}

function loadState() {
  const allKeys = [PRIMARY_STORAGE_KEY, ...LEGACY_STORAGE_KEYS];
  for (const key of allKeys) {
    const stored = localStorage.getItem(key);
    if (!stored) continue;
    try {
      return normalizeState(JSON.parse(stored));
    } catch {
      // ignore broken legacy values
    }
  }
  return makeInitialState();
}

const openResultsByStage = new Map();
let appState = loadState();
let adminStageType = 'regular';
let selectedStageId = appState.currentStageId;
let selectedCaseId = 1;
let isSpinning = false;
let spinStageId = appState.currentStageId;
let spinCaseId = 1;

const casesGrid = document.getElementById('casesGrid');
const stageStrip = document.getElementById('stageStrip');
const currentStageTitle = document.getElementById('currentStageTitle');
const stageCounter = document.getElementById('stageCounter');
const stageDescription = document.getElementById('stageDescription');
const stageTypeBadge = document.getElementById('stageTypeBadge');
const poolPreview = document.getElementById('poolPreview');
const poolNote = document.getElementById('poolNote');
const prevStageBtn = document.getElementById('prevStageBtn');
const nextStageBtn = document.getElementById('nextStageBtn');
const finishStageBtn = document.getElementById('finishStageBtn');
const newGameBtn = document.getElementById('newGameBtn');

const openAdminBtn = document.getElementById('openAdminBtn');
const adminModal = document.getElementById('adminModal');
const closeAdminBtn = document.getElementById('closeAdminBtn');
const closeAdminBackdrop = document.getElementById('closeAdminBackdrop');
const regularTabBtn = document.getElementById('regularTabBtn');
const extraTabBtn = document.getElementById('extraTabBtn');
const stageSelector = document.getElementById('stageSelector');
const caseSelector = document.getElementById('caseSelector');
const forcePickSelector = document.getElementById('forcePickSelector');
const addItemBtn = document.getElementById('addItemBtn');
const copyToAllBtn = document.getElementById('copyToAllBtn');
const copyStageTypeBtn = document.getElementById('copyStageTypeBtn');
const resetCurrentStageBtn = document.getElementById('resetCurrentStageBtn');
const resetAllStagesBtn = document.getElementById('resetAllStagesBtn');
const saveConfigBtn = document.getElementById('saveConfigBtn');
const importConfigBtn = document.getElementById('importConfigBtn');
const configInput = document.getElementById('configInput');
const itemsEditor = document.getElementById('itemsEditor');

const rouletteModal = document.getElementById('rouletteModal');
const closeRouletteBackdrop = document.getElementById('closeRouletteBackdrop');
const closeModalBtn = document.getElementById('closeModalBtn');
const resultCloseBtn = document.getElementById('resultCloseBtn');
const rouletteTrack = document.getElementById('rouletteTrack');
const resultCard = document.getElementById('resultCard');
const modalTitle = document.getElementById('modalTitle');
const modalHint = document.getElementById('modalHint');

init();

function init() {
  ensureStageOpenMap(appState.currentStageId);
  syncAdminSelectionWithCurrentStage();
  bindEvents();
  renderAll();
  saveState();
}

function bindEvents() {
  prevStageBtn.addEventListener('click', goToPrevStage);
  nextStageBtn.addEventListener('click', goToNextStage);
  finishStageBtn.addEventListener('click', finishCurrentStage);
  newGameBtn.addEventListener('click', resetGameSession);

  openAdminBtn.addEventListener('click', openAdminModal);
  closeAdminBtn.addEventListener('click', closeAdminModal);
  closeAdminBackdrop.addEventListener('click', closeAdminModal);

  regularTabBtn.addEventListener('click', () => switchAdminTab('regular'));
  extraTabBtn.addEventListener('click', () => switchAdminTab('extra'));

  stageSelector.addEventListener('change', (event) => {
    selectedStageId = event.target.value;
    const selectedStage = getStageById(selectedStageId);
    adminStageType = selectedStage.type;
    resetCaseSelectionIfNeeded();
    renderAdmin();
  });

  caseSelector.addEventListener('change', (event) => {
    selectedCaseId = Number(event.target.value);
    renderItemsEditor();
  });

  forcePickSelector.addEventListener('change', (event) => {
    const stage = getStageById(selectedStageId);
    stage.forcedNextItemSignature = String(event.target.value || '');
    saveState();
  });

  addItemBtn.addEventListener('click', () => {
    const targetCase = getSelectedAdminCase();
    const newItem = {
      id: makeItemId(),
      name: 'Новый предмет',
      image: defaultImage('New Item'),
      weight: 1,
      rarity: 'consumer',
      effect: 'empty',
    };
    targetCase.items.push(newItem);
    saveState();
    renderItemsEditor();
    renderForcePickSelector();
    if (selectedStageId === appState.currentStageId) {
      renderPoolPreview();
      renderCasesGrid();
    }
    requestAnimationFrame(() => {
      const lastInput = itemsEditor.querySelector('.editor-item:last-child input[data-field="name"]');
      if (lastInput) lastInput.focus();
    });
  });

  copyToAllBtn.addEventListener('click', () => {
    const sourceCase = getSelectedAdminCase();
    const stage = getStageById(selectedStageId);
    const cloneItems = sourceCase.items.map((item, index) => normalizeItem(item, index));
    stage.cases.forEach((caseData) => {
      caseData.items = structuredClone(cloneItems);
    });
    saveState();
    renderItemsEditor();
    renderForcePickSelector();
    if (selectedStageId === appState.currentStageId) {
      renderPoolPreview();
      renderCasesGrid();
    }
    alert('Содержимое выбранного кейса скопировано во все 16 кейсов этого этапа.');
  });

  copyStageTypeBtn.addEventListener('click', () => {
    const stage = getStageById(selectedStageId);
    const stageSnapshot = stage.cases.map((caseData) => ({
      id: caseData.id,
      name: caseData.name,
      items: caseData.items.map((item, index) => normalizeItem(item, index)),
    }));
    appState.stages.forEach((targetStage) => {
      if (targetStage.type !== stage.type || targetStage.id === stage.id) return;
      targetStage.cases = structuredClone(stageSnapshot);
    });
    saveState();
    renderItemsEditor();
    renderForcePickSelector();
    if (selectedStageId === appState.currentStageId) {
      renderPoolPreview();
      renderCasesGrid();
    }
    alert(`Наполнение этапа «${stage.label}» скопировано во все этапы типа «${stage.type === 'extra' ? 'экстра' : 'обычный'}».`);
  });

  resetCurrentStageBtn.addEventListener('click', () => {
    ensureStageOpenMap(selectedStageId).clear();
    if (selectedStageId === appState.currentStageId) renderCasesGrid();
  });

  resetAllStagesBtn.addEventListener('click', () => {
    if (!confirm('Сбросить конфиг, раунды и открытые кейсы к базовому состоянию?')) return;
    appState = makeInitialState();
    openResultsByStage.clear();
    ensureStageOpenMap(appState.currentStageId);
    adminStageType = 'regular';
    syncAdminSelectionWithCurrentStage();
    saveState();
    renderAll();
  });

  saveConfigBtn.addEventListener('click', downloadConfig);
  importConfigBtn.addEventListener('click', () => configInput.click());
  configInput.addEventListener('change', importConfig);

  closeRouletteBackdrop.addEventListener('click', closeRouletteModal);
  closeModalBtn.addEventListener('click', closeRouletteModal);
  resultCloseBtn.addEventListener('click', closeRouletteModal);

  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (!adminModal.classList.contains('hidden')) closeAdminModal();
    else if (!rouletteModal.classList.contains('hidden')) closeRouletteModal();
  });
}

function renderAll() {
  updateTheme();
  renderRoundPanel();
  renderStageStrip();
  renderPoolPreview();
  renderCasesGrid();
  renderAdmin();
}

function getCurrentStageIndex() {
  return STAGE_DEFS.findIndex((entry) => entry.id === appState.currentStageId);
}

function getCurrentStage() {
  return getStageById(appState.currentStageId);
}

function getStageById(stageId) {
  return appState.stages.find((stage) => stage.id === stageId);
}

function getSelectedAdminCase() {
  const stage = getStageById(selectedStageId);
  return stage.cases.find((caseData) => caseData.id === selectedCaseId);
}

function getStagePreviewItems(stage) {
  const unique = new Map();
  stage.cases.forEach((caseData) => {
    caseData.items.forEach((item, index) => {
      const normalized = normalizeItem(item, index);
      const signature = previewSignature(normalized);
      if (!unique.has(signature)) unique.set(signature, normalized);
    });
  });
  return Array.from(unique.values());
}

function ensureStageOpenMap(stageId) {
  if (!openResultsByStage.has(stageId)) openResultsByStage.set(stageId, new Map());
  return openResultsByStage.get(stageId);
}

function resetCaseSelectionIfNeeded() {
  const stage = getStageById(selectedStageId);
  const exists = stage.cases.some((entry) => entry.id === selectedCaseId);
  if (!exists) selectedCaseId = 1;
}

function syncAdminSelectionWithCurrentStage() {
  const currentStage = getCurrentStage();
  adminStageType = currentStage.type;
  selectedStageId = currentStage.id;
  resetCaseSelectionIfNeeded();
}

function switchAdminTab(tabType) {
  adminStageType = tabType;
  const sameTypeStages = appState.stages.filter((stage) => stage.type === tabType);
  if (!sameTypeStages.some((stage) => stage.id === selectedStageId)) {
    selectedStageId = sameTypeStages[0]?.id || appState.currentStageId;
  }
  resetCaseSelectionIfNeeded();
  renderAdmin();
}

function renderRoundPanel() {
  const stage = getCurrentStage();
  const stageIndex = getCurrentStageIndex();
  currentStageTitle.textContent = stage.label;
  stageCounter.textContent = `${stageIndex + 1} / ${STAGE_DEFS.length}`;
  stageDescription.textContent = stage.description;
  stageTypeBadge.textContent = stage.type === 'extra' ? '✨ Экстра раунд' : '🎯 Основной раунд';

  prevStageBtn.disabled = stageIndex <= 0;
  nextStageBtn.disabled = stageIndex >= STAGE_DEFS.length - 1;
  finishStageBtn.textContent = appState.finishedStageIds.includes(stage.id) ? 'Этап завершён' : 'Завершить этап';
}

function renderStageStrip() {
  stageStrip.innerHTML = '';
  appState.stages.forEach((stage) => {
    const chip = document.createElement('div');
    chip.className = 'stage-chip';
    if (stage.id === appState.currentStageId) chip.classList.add('is-active');
    if (appState.finishedStageIds.includes(stage.id)) chip.classList.add('is-finished');
    chip.innerHTML = `
      <div class="stage-chip-title">${escapeHtml(stage.shortLabel)} · ${escapeHtml(stage.label)}</div>
      <div class="stage-chip-meta">${stage.type === 'extra' ? 'Экстра' : 'Обычный'} · ${appState.finishedStageIds.includes(stage.id) ? 'завершён' : 'в процессе'}</div>
    `;
    stageStrip.appendChild(chip);
  });
}

function renderPoolPreview() {
  poolPreview.innerHTML = '';
  const stage = getCurrentStage();
  const items = getStagePreviewItems(stage);

  poolNote.textContent = 'Для получения промика нужно собрать 2 очка в течение одного раунда.';

  items.forEach((item) => {
    const card = document.createElement('div');
    card.className = `pool-pill rarity-${normalizeRarity(item.rarity)}`;
    card.innerHTML = `
      <div class="pool-thumb"></div>
      <div class="pool-info">
        <strong>${escapeHtml(item.name)}</strong>
        <span class="pool-effect">${escapeHtml(effectLabelMap[item.effect])}</span>
        <span class="pool-rarity">${escapeHtml(rarityLabelMap[item.rarity] || item.rarity)}</span>
      </div>
    `;
    setArtBackground(card.querySelector('.pool-thumb'), item.image);
    poolPreview.appendChild(card);
  });
}

function renderCasesGrid() {
  casesGrid.innerHTML = '';
  const stage = getCurrentStage();
  const openedMap = ensureStageOpenMap(stage.id);
  const template = document.getElementById('caseCardTemplate');

  stage.cases.forEach((caseData) => {
    const node = template.content.firstElementChild.cloneNode(true);
    const badge = node.querySelector('.case-badge');
    const nameNode = node.querySelector('.case-name');
    const metaNode = node.querySelector('.case-meta');
    const openedItem = openedMap.get(caseData.id);

    nameNode.textContent = caseData.name;

    if (openedItem) {
      node.classList.add('is-opened');
      badge.textContent = 'ОТКРЫТ';
      metaNode.innerHTML = `Выпал:<br><strong>${escapeHtml(openedItem.name)}</strong>`;
    } else {
      badge.textContent = stage.type === 'extra' ? 'ЭКСТРА' : 'ЗАКРЫТ';
      metaNode.textContent = `${caseData.items.length} предметов внутри`;
    }

    node.addEventListener('click', () => {
      if (isSpinning) return;
      const existing = openedMap.get(caseData.id);
      if (existing) {
        showOpenedCase(stage, caseData, existing);
        return;
      }
      openCase(stage.id, caseData.id);
    });

    casesGrid.appendChild(node);
  });
}

function renderAdmin() {
  regularTabBtn.classList.toggle('active', adminStageType === 'regular');
  extraTabBtn.classList.toggle('active', adminStageType === 'extra');

  const availableStages = appState.stages.filter((stage) => stage.type === adminStageType);
  if (!availableStages.some((stage) => stage.id === selectedStageId)) selectedStageId = availableStages[0]?.id || appState.currentStageId;

  stageSelector.innerHTML = '';
  availableStages.forEach((stage) => {
    const option = document.createElement('option');
    option.value = stage.id;
    option.textContent = stage.label;
    option.selected = stage.id === selectedStageId;
    stageSelector.appendChild(option);
  });

  const stage = getStageById(selectedStageId);
  caseSelector.innerHTML = '';
  stage.cases.forEach((caseData) => {
    const option = document.createElement('option');
    option.value = caseData.id;
    option.textContent = `${caseData.id}. ${caseData.name}`;
    option.selected = caseData.id === selectedCaseId;
    caseSelector.appendChild(option);
  });

  renderForcePickSelector();
  renderItemsEditor();
}

function renderForcePickSelector() {
  const stage = getStageById(selectedStageId);
  const items = getStagePreviewItems(stage);
  forcePickSelector.innerHTML = '';

  const autoOption = document.createElement('option');
  autoOption.value = '';
  autoOption.textContent = 'Случайно по шансам';
  forcePickSelector.appendChild(autoOption);

  items.forEach((item) => {
    const option = document.createElement('option');
    option.value = itemSignature(item);
    option.textContent = `${item.name} — ${effectLabelMap[item.effect]}`;
    forcePickSelector.appendChild(option);
  });

  forcePickSelector.value = stage.forcedNextItemSignature || '';
}

function renderItemsEditor() {
  itemsEditor.innerHTML = '';
  const currentCase = getSelectedAdminCase();

  if (!currentCase.items.length) {
    currentCase.items.push({
      id: makeItemId(),
      name: 'Новый предмет',
      image: defaultImage('New Item'),
      weight: 1,
      rarity: 'consumer',
      effect: 'empty',
    });
  }

  currentCase.items.forEach((item, index) => {
    const template = document.getElementById('editorItemTemplate');
    const node = template.content.firstElementChild.cloneNode(true);
    const preview = node.querySelector('.preview-thumb');
    const previewText = node.querySelector('.preview-text');
    const previewEffect = node.querySelector('.preview-effect');

    node.querySelectorAll('[data-field]').forEach((field) => {
      const fieldName = field.dataset.field;

      if (fieldName === 'file') {
        field.addEventListener('change', async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          try {
            const dataUrl = await fileToDataUrl(file);
            currentCase.items[index].image = dataUrl;
            setArtBackground(preview, dataUrl);
            saveState();
            renderForcePickSelector();
            if (selectedStageId === appState.currentStageId) renderPoolPreview();
          } catch {
            alert('Не удалось прочитать файл. Попробуй другой JPG/JPEG/PNG/WebP.');
          }
        });
        return;
      }

      field.value = item[fieldName];
      const eventName = field.tagName === 'SELECT' ? 'change' : 'input';
      field.addEventListener(eventName, (event) => {
        let value = event.target.value;
        if (fieldName === 'weight') {
          value = Math.max(1, Number(value) || 1);
          event.target.value = value;
        }
        if (fieldName === 'rarity') value = normalizeRarity(value);
        if (fieldName === 'effect') value = normalizeEffect(value, currentCase.items[index].name);
        currentCase.items[index][fieldName] = value;
        if (fieldName === 'image') setArtBackground(preview, value);
        if (fieldName === 'name') previewText.textContent = value || 'Фон предмета';
        if (fieldName === 'effect') previewEffect.textContent = effectLabelMap[value];
        saveState();
        renderForcePickSelector();
        if (selectedStageId === appState.currentStageId) {
          renderPoolPreview();
          renderCasesGrid();
        }
      });
    });

    setArtBackground(preview, item.image);
    previewText.textContent = item.name || 'Фон предмета';
    previewEffect.textContent = effectLabelMap[item.effect];

    node.querySelector('.remove-item-btn').addEventListener('click', () => {
      currentCase.items.splice(index, 1);
      if (!currentCase.items.length) {
        currentCase.items.push({
          id: makeItemId(),
          name: 'Новый предмет',
          image: defaultImage('New Item'),
          weight: 1,
          rarity: 'consumer',
          effect: 'empty',
        });
      }
      saveState();
      renderItemsEditor();
      renderForcePickSelector();
      if (selectedStageId === appState.currentStageId) {
        renderPoolPreview();
        renderCasesGrid();
      }
    });

    itemsEditor.appendChild(node);
  });
}

function goToPrevStage() {
  const index = getCurrentStageIndex();
  if (index <= 0) return;
  appState.currentStageId = STAGE_DEFS[index - 1].id;
  ensureStageOpenMap(appState.currentStageId);
  saveState();
  syncAdminSelectionWithCurrentStage();
  renderAll();
}

function goToNextStage() {
  const index = getCurrentStageIndex();
  if (index >= STAGE_DEFS.length - 1) return;
  finishCurrentStage(false);
  appState.currentStageId = STAGE_DEFS[index + 1].id;
  ensureStageOpenMap(appState.currentStageId);
  saveState();
  syncAdminSelectionWithCurrentStage();
  renderAll();
}

function finishCurrentStage(showAlert = true) {
  const currentStageId = appState.currentStageId;
  if (!appState.finishedStageIds.includes(currentStageId)) appState.finishedStageIds.push(currentStageId);
  saveState();
  renderRoundPanel();
  renderStageStrip();
  if (showAlert) alert(`Этап «${getCurrentStage().label}» отмечен как завершённый.`);
}

function resetGameSession() {
  openResultsByStage.clear();
  ensureStageOpenMap(STAGE_DEFS[0].id);
  appState.currentStageId = STAGE_DEFS[0].id;
  appState.finishedStageIds = [];
  saveState();
  syncAdminSelectionWithCurrentStage();
  closeRouletteModal();
  renderAll();
}

function updateTheme() {
  const currentStage = getCurrentStage();
  document.body.classList.toggle('stage-extra', currentStage.type === 'extra');
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

function resolveWinningItem(stage, caseData) {
  const forcedSignature = stage.forcedNextItemSignature;
  if (forcedSignature) {
    const exact = caseData.items.find((item, index) => itemSignature(normalizeItem(item, index)) === forcedSignature);
    if (exact) {
      stage.forcedNextItemSignature = '';
      saveState();
      renderForcePickSelector();
      return normalizeItem(exact, 0);
    }
  }
  return pickWeighted(caseData.items);
}

function openCase(stageId, caseId) {
  const stage = getStageById(stageId);
  const caseData = stage.cases.find((entry) => entry.id === caseId);
  spinStageId = stageId;
  spinCaseId = caseId;
  modalTitle.textContent = `${stage.label} · ${caseData.name}`;
  modalHint.textContent = stage.type === 'extra'
    ? 'Экстра-раунд активен. Визуал и наполнение здесь настраиваются отдельно.'
    : 'Предмет выбирается случайно из наполнения этого кейса.';
  resultCard.className = 'result-card hidden';
  resultCard.innerHTML = '';
  openRouletteModal();
  runSpin(stage, caseData);
}

function showOpenedCase(stage, caseData, item) {
  openRouletteModal();
  rouletteTrack.innerHTML = '';
  rouletteTrack.style.transition = 'none';
  rouletteTrack.style.transform = 'translateX(0px)';
  modalTitle.textContent = `${stage.label} · ${caseData.name}`;
  modalHint.textContent = 'Этот кейс уже открыт в текущем этапе.';
  showResult(item, true);
}

function runSpin(stage, caseData) {
  const winningItem = resolveWinningItem(stage, caseData);
  rouletteTrack.innerHTML = '';
  rouletteTrack.style.transition = 'none';
  rouletteTrack.style.transform = 'translateX(0px)';
  resultCard.className = 'result-card hidden';
  resultCard.innerHTML = '';
  isSpinning = true;

  const totalSlots = 56;
  const winnerIndex = 47;
  const trackItems = Array.from({ length: totalSlots }, (_, index) => {
    if (index === winnerIndex) return winningItem;
    return caseData.items[Math.floor(Math.random() * caseData.items.length)];
  });

  trackItems.forEach((item) => {
    rouletteTrack.appendChild(createRouletteCard(item));
  });

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const itemWidth = 190;
      const wrapperWidth = rouletteTrack.parentElement.clientWidth;
      const targetOffset = (winnerIndex * itemWidth) - (wrapperWidth / 2) + (itemWidth / 2) + randomInt(-16, 16);
      rouletteTrack.style.transition = 'transform 8.8s cubic-bezier(0.08, 0.78, 0.16, 1)';
      rouletteTrack.style.transform = `translateX(-${targetOffset}px)`;
    });
  });

  window.clearTimeout(runSpin.timeoutId);
  runSpin.timeoutId = window.setTimeout(() => {
    ensureStageOpenMap(spinStageId).set(spinCaseId, normalizeItem(winningItem, 0));
    isSpinning = false;
    if (spinStageId === appState.currentStageId) renderCasesGrid();
    showResult(winningItem, false);
  }, 9150);
}

function showResult(item, alreadyOpened) {
  const rarity = normalizeRarity(item.rarity);
  resultCard.className = `result-card ${alreadyOpened ? 'is-opened-result' : ''} effect-${item.effect}`;
  resultCard.classList.remove('hidden');
  resultCard.innerHTML = `
    <div class="result-card-inner rarity-${rarity}">
      <div class="result-art"></div>
      <div class="result-copy">
        <div class="result-headline">${escapeHtml(alreadyOpened ? 'УЖЕ ОТКРЫТ' : effectHeadlineMap[item.effect])}</div>
        <h3>${escapeHtml(item.name)}</h3>
        <p class="item-rarity large">${escapeHtml(effectLabelMap[item.effect])}</p>
        <p class="item-rarity large">Редкость: ${escapeHtml(rarityLabelMap[rarity] || rarity)}</p>
      </div>
    </div>
  `;
  setArtBackground(resultCard.querySelector('.result-art'), item.image);
}

function createRouletteCard(item) {
  const normalized = normalizeItem(item, 0);
  const node = document.createElement('div');
  node.className = `roulette-item rarity-${normalizeRarity(normalized.rarity)}`;
  node.innerHTML = `
    <div class="item-art"></div>
    <div class="item-name">${escapeHtml(normalized.name)}</div>
    <div class="item-rarity">${escapeHtml(effectLabelMap[normalized.effect])}</div>
  `;
  setArtBackground(node.querySelector('.item-art'), normalized.image);
  return node;
}

function setArtBackground(element, image) {
  const source = image || defaultImage('No Image');
  element.style.backgroundImage = `linear-gradient(180deg, rgba(0,0,0,0.12), rgba(0,0,0,0.42)), url("${escapeCssUrl(source)}")`;
}

function pickWeighted(items) {
  const expanded = items.map((item, index) => normalizeItem(item, index));
  const totalWeight = expanded.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const item of expanded) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return expanded[expanded.length - 1];
}

function downloadConfig() {
  const normalized = normalizeState(appState);
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
      appState = normalizeState(JSON.parse(reader.result));
      openResultsByStage.clear();
      ensureStageOpenMap(appState.currentStageId);
      syncAdminSelectionWithCurrentStage();
      saveState();
      closeRouletteModal();
      renderAll();
      alert('Конфиг успешно импортирован.');
    } catch {
      alert('Не удалось прочитать config.json');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
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
