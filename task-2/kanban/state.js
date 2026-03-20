const STORAGE_KEY = 'kanban-state';

const DEFAULT_STATE = {
  columns: [
    { id: 'col-1', title: 'To Do', cards: [] },
    { id: 'col-2', title: 'In Progress', cards: [] },
    { id: 'col-3', title: 'Done', cards: [] },
  ],
};

let state = { columns: [] };

function isNonEmptyString(s) {
  return typeof s === 'string' && s.trim().length > 0;
}

function isValidStateShape(maybe) {
  if (!maybe || typeof maybe !== 'object') return false;
  if (!Array.isArray(maybe.columns)) return false;
  for (const c of maybe.columns) {
    if (!c || typeof c !== 'object') return false;
    if (!isNonEmptyString(c.id)) return false;
    if (typeof c.title !== 'string') return false;
    if (!Array.isArray(c.cards)) return false;
    for (const card of c.cards) {
      if (!card || typeof card !== 'object') return false;
      if (!isNonEmptyString(card.id)) return false;
      if (typeof card.title !== 'string') return false;
      if (typeof card.description !== 'string') return false;
    }
  }
  return true;
}

export function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      state = structuredClone(DEFAULT_STATE);
      saveState();
      return state;
    }

    const parsed = JSON.parse(raw);
    if (!isValidStateShape(parsed)) {
      state = structuredClone(DEFAULT_STATE);
      saveState();
      return state;
    }

    state = parsed;
    return state;
  } catch {
    state = structuredClone(DEFAULT_STATE);
    try {
      saveState();
    } catch {
      // If localStorage is unavailable, still return a valid in-memory state.
    }
    return state;
  }
}

export function saveState() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getState() {
  return state;
}

export function addColumn(title) {
  if (!isNonEmptyString(title)) {
    throw new Error('Column title cannot be empty');
  }

  const column = { id: `col-${Date.now()}`, title: title.trim(), cards: [] };
  state.columns.push(column);
  saveState();
}

export function removeColumn(id) {
  state.columns = state.columns.filter((c) => c.id !== id);
  saveState();
}

export function renameColumn(id, newTitle) {
  if (typeof newTitle !== 'string' || newTitle.trim().length === 0) {
    throw new Error('Column title cannot be empty');
  }

  const col = state.columns.find((c) => c.id === id);
  if (!col) return;
  col.title = newTitle.trim();
  saveState();
}

function findCardById(cardId) {
  for (const col of state.columns) {
    const idx = col.cards.findIndex((c) => c.id === cardId);
    if (idx !== -1) return { col, cardIndex: idx, card: col.cards[idx] };
  }
  return null;
}

export function addCard(columnId, title, description = '') {
  if (!isNonEmptyString(title)) {
    throw new Error('Card title cannot be empty');
  }

  const col = state.columns.find((c) => c.id === columnId);
  if (!col) return;

  col.cards.push({
    id: `card-${Date.now()}`,
    title: title.trim(),
    description: typeof description === 'string' ? description : '',
  });

  saveState();
}

export function updateCard(cardId, title, description) {
  if (!isNonEmptyString(title)) {
    throw new Error('Card title cannot be empty');
  }

  const found = findCardById(cardId);
  if (!found) return;

  found.card.title = title.trim();
  found.card.description = typeof description === 'string' ? description : '';
  saveState();
}

export function removeCard(cardId) {
  for (const col of state.columns) {
    const beforeLen = col.cards.length;
    col.cards = col.cards.filter((c) => c.id !== cardId);
    if (col.cards.length !== beforeLen) {
      saveState();
      return;
    }
  }
}

export function moveCard(cardId, direction) {
  const found = findCardById(cardId);
  if (!found) return;

  const sourceIdx = state.columns.findIndex((c) => c.id === found.col.id);
  if (sourceIdx === -1) return;

  const targetIdx =
    direction === 'left'
      ? sourceIdx - 1
      : direction === 'right'
        ? sourceIdx + 1
        : sourceIdx;

  const clampedIdx = Math.max(0, Math.min(state.columns.length - 1, targetIdx));
  if (clampedIdx === sourceIdx) return;

  const sourceCol = state.columns[sourceIdx];
  const targetCol = state.columns[clampedIdx];
  const card = sourceCol.cards.splice(found.cardIndex, 1)[0];
  if (!card) return;
  targetCol.cards.push(card);
  saveState();
}

