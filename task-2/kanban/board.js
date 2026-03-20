import { getState } from './state.js';

export function renderBoard() {
  const board = document.getElementById('board');
  if (!board) return;

  // Minimal placeholder for Ticket 1 page-load sanity.
  // Later tickets will rebuild the full DOM structure.
  board.innerHTML = '';

  const { columns } = getState();
  for (const col of columns) {
    const colEl = document.createElement('div');
    colEl.className = 'column';
    colEl.dataset.id = col.id;

    const header = document.createElement('div');
    header.className = 'column-header';
    const h2 = document.createElement('h2');
    h2.textContent = col.title;
    header.appendChild(h2);

    colEl.appendChild(header);

    const cardList = document.createElement('div');
    cardList.className = 'card-list';
    if (!col.cards || col.cards.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-placeholder';
      empty.textContent = 'No cards yet';
      cardList.appendChild(empty);
    } else {
      for (const card of col.cards) {
        const cardEl = document.createElement('div');
        cardEl.className = 'card';
        cardEl.dataset.id = card.id;
        cardEl.textContent = card.title;
        cardList.appendChild(cardEl);
      }
    }

    colEl.appendChild(cardList);
    board.appendChild(colEl);
  }
}

