const ownerPhotoMap = {
    'D. Afonso V': 'img/libraries/afonso-v.jpg',
    'D. Beatriz': 'img/libraries/beatriz.jpg',
    'D. Duarte': 'img/libraries/duarte.jpg',
    'D. Fernando': 'img/libraries/fernando.jpg',
    'D. João I':    'img/libraries/joao-i.jpg',
    'D. Leonor de Viseu': 'img/libraries/leonor-viseu.jpg',
    'D. Pedro': 'img/libraries/pedro.jpg'
};

let currentCarouselItems = [];
let currentIndex = 0;

let hoverItem = null;

function showHoverItem(item) {
  hoverItem = item;
  renderHover();
}
function clearHoverItem() {
  hoverItem = null;
  renderCurrentItem();
}
window.showDetailsHover = showHoverItem;
window.clearDetailsHover = clearHoverItem;

function renderHover() {
    if (!hoverItem) return;
    if (hoverItem.type === 'library') {
      renderLibraryDetails(hoverItem.id, window.globalData);
    } else if (hoverItem.type === 'location') {
      renderLocationDetails(hoverItem.id);
    }
}

function rebuildDetailsItems(focusId) {
    const items = [];
    const af = window.activeFilters || {};

    // 1) Libraries selected in the network
    if (window.selectedNodes && window.selectedNodes.size) {
      for (const id of window.selectedNodes) {
        items.push({ type: 'library', id, label: id });
      }
    }

    // 2) Libraries selected via the filter menu
    const libsFromFilter = af.byLibrary?.values || [];
    libsFromFilter.forEach(id => {
      if (!items.some(it => it.type==='library' && it.id===id)) {
        items.push({ type: 'library', id, label: id });
      }
    });

    // 3) Locations selected on the map
    if (window.selectedLocations && window.selectedLocations.size) {
      for (const key of window.selectedLocations) {
        const p = (window.mapPoints || []).find(pt => pt.key === key);
        items.push({ type: 'location', id: key, label: p?.label || key });
      }
    }

    // 4) Locations selected via the filter menu
    const locsFromFilter = af.byLocation?.values || [];
    locsFromFilter.forEach(key => {
      if (!items.some(it => it.type==='location' && it.id===key)) {
        const p = (window.mapPoints || []).find(pt => pt.key === key);
        items.push({ type: 'location', id: key, label: p?.label || key });
      }
    });

    setDetailsItems(items, focusId);
}

window.rebuildDetailsItems = rebuildDetailsItems;

function setDetailsItems(items, focusId) {
    currentCarouselItems = items.slice();
    if (currentCarouselItems.length === 0) {
      clearDetailsPanel();
      renderCarousel(); // hides arrows/dots
      return;
    }
    // Focus logic
    if (focusId) {
      const idx = currentCarouselItems.findIndex(it => it.id === focusId);
      currentIndex = idx >= 0 ? idx : 0;
    } else if (currentIndex >= currentCarouselItems.length) {
      currentIndex = 0;
    }

    renderCarousel();
    renderCurrentItem();
}

window.setDetailsItems = setDetailsItems;

function renderLibraryDetails(libName, allData) {
    const panel       = document.getElementById('hover-details');
    panel.classList.remove('details-panel--list-mode');
    const wrapper     = panel.querySelector('.details-panel__img-wrapper');
    const nameEl      = panel.querySelector('.details-panel__name');
    const booksEl     = panel.querySelector('.details-panel__books');
    const datesEl     = panel.querySelector('.details-panel__dates');
    const titleEl     = panel.querySelector('.details-panel__title');
    const reignEl     = panel.querySelector('.details-panel__reign');
    const placeholder = panel.querySelector('.details-panel__placeholder');
    const listEl      = panel.querySelector('#details-list');

    // Ensure list is hidden for libraries
    if (listEl) {
      listEl.hidden = true;
      listEl.innerHTML = '';
    }

    placeholder.style.display = 'none';
    wrapper.style.display     = 'block';
    nameEl.style.display      = '';
    booksEl.style.display     = '';
    datesEl.style.display     = '';
    titleEl.style.display     = '';
    reignEl.style.display     = '';

    let photo = '';
    for (let key in ownerPhotoMap) {
      if (libName.includes(key)) { photo = ownerPhotoMap[key]; break; }
    }
    wrapper.querySelector('img').src = photo;
    wrapper.querySelector('img').alt = libName;

    nameEl.textContent  = libName;
    const count = allData.filter(r => r.Proprietario_Nome === libName).length;
    booksEl.textContent = `${count} book${count===1?'':'s'}`;

    const info = allData.find(r => r.Proprietario_Nome === libName) || {};
    datesEl.innerHTML = `<strong>Lifespan:</strong> ${info.Proprietario_DatasExtremas || '—'}`;
    titleEl.innerHTML = `<strong>Royal title:</strong> ${info.Proprietario_Titulo || '—'}`;
    reignEl.innerHTML = `<strong>Tenure period:</strong> ${info.Proprietario_Titulo_DatasExtremas || '—'}`;
}

function updateDetailsPanel(libName, allData) {
    renderLibraryDetails(libName, allData);
}

window.updateDetailsPanel = updateDetailsPanel;

function renderLocationDetails(locKey) {
    const panel       = document.getElementById('hover-details');
    panel.classList.add('details-panel--list-mode');
    const wrapper     = panel.querySelector('.details-panel__img-wrapper');
    const nameEl      = panel.querySelector('.details-panel__name');
    const booksEl     = panel.querySelector('.details-panel__books');
    const datesEl     = panel.querySelector('.details-panel__dates');
    const titleEl     = panel.querySelector('.details-panel__title');
    const reignEl     = panel.querySelector('.details-panel__reign');
    const placeholder = panel.querySelector('.details-panel__placeholder');
    const listEl      = panel.querySelector('#details-list');

    const p = (window.mapPoints || []).find(pt => pt.key === locKey);
    if (!p) return;

    const rows = (p.filteredEntries && p.filteredEntries.length) ? p.filteredEntries : p.entries;

    // per-author counts by rows (books)
    const counts = rows.reduce((m, r) => {
      const a = (r.Nome_Autor || '').trim();
      if (!a) return m;
      m.set(a, (m.get(a) || 0) + 1);
      return m;
    }, new Map());

    // Show only the text fields needed for locations
    placeholder.style.display = 'none';
    wrapper.style.display     = 'none'; // no photo for locations
    nameEl.style.display      = '';
    booksEl.style.display     = '';
    datesEl.style.display     = 'none';
    titleEl.style.display     = 'none';
    reignEl.style.display     = 'none';

    nameEl.textContent  = p.label || 'Unknown location';
    booksEl.textContent = `${rows.length} book${rows.length===1?'':'s'}`;

    if (listEl) {
      listEl.hidden = false;
      listEl.innerHTML = '';

      // proper header (not boxed)
      const header = document.createElement('div');
      header.className = 'list-header';
      header.textContent = `Authors (${counts.size})`;
      listEl.appendChild(header);

      // authors sorted by count desc, then name
      const authors = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

      authors.forEach(([author, n]) => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.textContent = `${author} — ${n} book${n===1?'':'s'}`;
        listEl.appendChild(div);
      });
    }
}

function renderCurrentItem() {
    if (hoverItem) { renderHover(); return; }

    const item = currentCarouselItems[currentIndex];
    if (!item) { clearDetailsPanel(); return; }

    if (item.type === 'library') {
      renderLibraryDetails(item.id, window.globalData);
    } else if (item.type === 'location') {
      renderLocationDetails(item.id);
    }
}

function renderCarousel() {
    const container  = document.querySelector('.details-panel__carousel-container');
    const dotsEl     = container.querySelector('.details-panel__carousel');
    const leftArrow  = container.querySelector('.carousel-arrow.left');
    const rightArrow = container.querySelector('.carousel-arrow.right');

    dotsEl.innerHTML = '';
    const n = currentCarouselItems.length;
    currentIndex = Math.max(0, Math.min(currentIndex, n - 1));

    dotsEl.style.display = n > 1 ? 'flex' : 'none';
    leftArrow.style.display  = (n > 1 && currentIndex > 0)     ? 'block' : 'none';
    rightArrow.style.display = (n > 1 && currentIndex < n - 1) ? 'block' : 'none';

    leftArrow.onclick  = () => {
      if (currentIndex > 0) {
        currentIndex--;
        hoverItem = null;
        renderCurrentItem();
        renderCarousel();
      }
    };
    rightArrow.onclick = () => {
      if (currentIndex < n - 1) {
        currentIndex++;
        hoverItem = null;
        renderCurrentItem();
        renderCarousel();
      }
    };

    const maxDots = 5;
    const items = computeDotModel(n, currentIndex, maxDots);
    items.forEach(entry => {
      if (entry.type === 'dot') {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'dot' + (entry.index === currentIndex ? ' active' : '');
        dot.title = currentCarouselItems[entry.index].label || currentCarouselItems[entry.index].id;
        dot.setAttribute('aria-label', dot.title);
        dot.addEventListener('click', () => {
          currentIndex = entry.index;
          hoverItem = null;
          renderCurrentItem();
          renderCarousel();
        });
        dotsEl.appendChild(dot);
      } else {
        const span = document.createElement('span');
        span.className = 'dot-ellipsis';
        span.textContent = '…';
        dotsEl.appendChild(span);
      }
    });
}

function computeDotModel(n, cur, maxDots) {
    if (n <= maxDots) {
      return Array.from({ length: n }, (_, i) => ({ type: 'dot', index: i }));
    }
    const windowSize = maxDots - 2; // keep first and last
    const half = Math.floor(windowSize / 2);
    let start = Math.max(1, cur - half);
    let end   = Math.min(n - 2, start + windowSize - 1);
    start = Math.max(1, Math.min(start, n - 1 - windowSize));

    const res = [{ type: 'dot', index: 0 }];
    if (start > 1) res.push({ type: 'ellipsis' });
    for (let i = start; i <= end; i++) res.push({ type: 'dot', index: i });
    if (end < n - 2) res.push({ type: 'ellipsis' });
    res.push({ type: 'dot', index: n - 1 });
    return res;
}


function clearDetailsPanel() {
    const panel = document.getElementById('hover-details');
    panel.classList.remove('details-panel--list-mode');
    panel.querySelector('.details-panel__img-wrapper').style.display = 'none';
    panel.querySelector('.details-panel__name').style.display        = 'none';
    panel.querySelector('.details-panel__books').style.display       = 'none';
    panel.querySelector('.details-panel__dates').style.display       = 'none';
    panel.querySelector('.details-panel__title').style.display       = 'none';
    panel.querySelector('.details-panel__reign').style.display       = 'none';

    const listEl = panel.querySelector('#details-list');
    if (listEl) { listEl.hidden = true; listEl.innerHTML = ''; }

    const placeholder = panel.querySelector('.details-panel__placeholder');
    placeholder.style.display = '';
    placeholder.textContent   = 'Click or hover on elements to see more details here.';
}

window.clearDetailsPanel = clearDetailsPanel;