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
let __catalogOverlayTimer = null;

let pinnedBook = null;
window.getPinnedBook = () => pinnedBook;

let __catalogToastTimer = null;

function normalizeProbString(v) {
  return (v || '').toString().trim();
}

function probLevelFrom(value) {
    const t = normalizeProbString(value).toLowerCase();
    if (!t) return 0;

    // Textual buckets
    if (t.includes('indisputad')) return 3;  // indisputada
    if (t.includes('prov'))       return 2;  // provável
    if (t.includes('indet'))      return 1;  // indeterminada

    // Numeric fallback (try to detect %)
    const m = t.match(/(\d{1,3})\s*%/);
    if (m) {
      const p = Math.max(0, Math.min(100, +m[1]));
      if (p >= 85) return 3;
      if (p >= 60) return 2;
      return 1;
    }
    return 1;
}

function buildProbBadge(value, tipText) {
    const v = normalizeProbString(value);
    if (!v) return '';
    const lvl = probLevelFrom(v);
    const safeTip = tipText || 'Attribution probability';
    return `<span class="prob-badge level-${lvl || 1}" tabindex="0" data-tip="${safeTip}">${v}</span>`;
}

function showCatalogToast(msg, timeout = 1800) {
    const el = document.getElementById('catalog-toast');
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    el.classList.add('open');
    // blur other entries only within the catalog
    document.getElementById('catalog')?.classList.add('toast-open');

    clearTimeout(__catalogToastTimer);
    __catalogToastTimer = setTimeout(() => {
      el.classList.remove('open');
      el.hidden = true;
      document.getElementById('catalog')?.classList.remove('toast-open');
    }, timeout);
}

window.showCatalogToast = showCatalogToast;

function showCatalogOverlay(msg, timeout = 2000) {
    const el = document.getElementById('catalog-overlay');
    if (!el) return;
    const panel = el.querySelector('.catalog-overlay__panel');
    if (panel) panel.textContent = msg;

    el.hidden = false;
    el.classList.add('open');

    // Blur only entries (on the host)
    document.getElementById('catalog')?.classList.add('overlay-open');

    clearTimeout(__catalogOverlayTimer);
    __catalogOverlayTimer = setTimeout(hideCatalogOverlay, timeout);
    el.onclick = hideCatalogOverlay;
}

function hideCatalogOverlay() {
    const el = document.getElementById('catalog-overlay');
    if (!el) return;
    el.classList.remove('open');
    el.hidden = true;
    el.onclick = null;

    document.getElementById('catalog')?.classList.remove('overlay-open');
}

window.showCatalogOverlay = showCatalogOverlay;
window.hideCatalogOverlay = hideCatalogOverlay;

function pinBook(row) {
    const replacing = !!pinnedBook && pinnedBook !== row;
    pinnedBook = row;
    hoverItem = null;
    renderCurrentItem();

    // Reuse the same highlight logic as hover
    window.highlightMapPoint && window.highlightMapPoint(row);
    window.highlightNetworkNode && window.highlightNetworkNode(row.Proprietario_Nome);
    window.highlightTreemapRect && window.highlightTreemapRect(row);
    window.highlightPeriodBar && window.highlightPeriodBar(row);

    if (replacing) {
      showCatalogOverlay('Only 1 book can be pinned. Replacing the previous selection.');
    }

    const hint = document.getElementById('catalog-hint');
    if (hint && !hint.hidden) hint.hidden = true;
}

function unpinBook() {
    pinnedBook = null;
    renderCurrentItem();

    // Clear all highlights
    window.clearMapHighlights && window.clearMapHighlights();
    window.clearNetworkHighlights && window.clearNetworkHighlights();
    window.clearTreemapHighlights && window.clearTreemapHighlights();
    window.clearPeriodHighlights && window.clearPeriodHighlights();
}

window.pinBook = pinBook;
window.unpinBook = unpinBook;

function showHoverItem(item) {
  if (pinnedBook) return; // don't override a pinned book
  hoverItem = item;
  renderHover();
}

function clearHoverItem() {
  if (pinnedBook) return; // keep showing the pinned book
  hoverItem = null;
  renderCurrentItem();
}

window.showDetailsHover = showHoverItem;
window.clearDetailsHover = clearHoverItem;

function renderBookDetails(row) {
    const panel       = document.getElementById('hover-details');
    panel.classList.add('details-panel--list-mode', 'details-panel--book-mode');

    const wrapper     = panel.querySelector('.details-panel__img-wrapper');
    const nameEl      = panel.querySelector('.details-panel__name');
    const booksEl     = panel.querySelector('.details-panel__books');
    const datesEl     = panel.querySelector('.details-panel__dates');
    const titleEl     = panel.querySelector('.details-panel__title');
    const reignEl     = panel.querySelector('.details-panel__reign');
    const placeholder = panel.querySelector('.details-panel__placeholder');
    const listEl      = panel.querySelector('#details-list');

    // Base visibility
    placeholder.style.display = 'none';
    wrapper.style.display     = 'none';
    nameEl.style.display      = '';
    // “Book:” label above the title
    booksEl.style.display     = '';
    booksEl.textContent       = "Book's title:";
    datesEl.style.display     = 'none';
    titleEl.style.display     = 'none';
    reignEl.style.display     = 'none';

    // Title (emphasized) + standardized book attribution probability badge
    const probObra = normalizeProbString(row.ProbAtribObra);
    const title = normalizeProbString(row.Obra) || '—';
    const obraBadge = buildProbBadge(probObra, 'Book attribution probability');
    nameEl.innerHTML = `${title}${obraBadge ? ' ' + obraBadge : ''}`;

    // Key/value list
    if (listEl) {
      listEl.hidden = false;
      listEl.innerHTML = '';

      const addItem = (label, val, extraHTML = '') => {
        const v = normalizeProbString(val);
        if (!v) return;
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `<strong>${label}:</strong> ${v}${extraHTML}`;
        listEl.appendChild(div);
      };

      const probAutor = normalizeProbString(row.ProbAtribAutor);
      const autorBadge = buildProbBadge(probAutor, 'Author attribution probability');

      addItem('Author', normalizeProbString(row.Nome_Autor) || '—', autorBadge ? ' ' + autorBadge : '');

      addItem('Alternative attribution (Book)', row.AtribuicaoAlternat_Obra);
      addItem('Alternative attribution (Author)', row.AtribuicaoAlternat_Autor);

      // Accept either canonical or lowercase names if CSV headers vary
      addItem('Author short bio', row.BioAbreviada_Autor || row.bioabreviada_autor);
      addItem('Synopsis', row.Sinopse_Obra || row['Sinopse obra']);
      addItem('Document type', row.TipoDoc);
    }
}

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
    if (pinnedBook) { renderBookDetails(pinnedBook); return; }
    if (hoverItem)  { renderHover(); return; }

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
    pinnedBook = null;
    const panel = document.getElementById('hover-details');
    panel.classList.remove('details-panel--list-mode', 'details-panel--book-mode');
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

let __probTipEl;
function ensureProbTip() {
    if (!__probTipEl) {
      __probTipEl = document.createElement('div');
      __probTipEl.className = 'prob-tip';
      __probTipEl.style.display = 'none';
      document.body.appendChild(__probTipEl);
    }
    return __probTipEl;
  }

  function showProbTip(target, text) {
    const tip = ensureProbTip();
    tip.textContent = text || 'Attribution probability';
    tip.style.display = 'block';

    const rect = target.getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();
    const gap = 8;

    // Center over the badge, above it
    let left = rect.left + rect.width / 2 - tipRect.width / 2;
    let top  = rect.top - gap - tipRect.height;

    // Keep inside viewport
    left = Math.max(6, Math.min(left, window.innerWidth - tipRect.width - 6));
    top  = Math.max(6, top);

    tip.style.left = `${left}px`;
    tip.style.top  = `${top}px`;
}

function hideProbTip() {
    if (__probTipEl) __probTipEl.style.display = 'none';
}

document.addEventListener('mouseenter', (e) => {
    const el = e.target.closest('.prob-badge');
    if (!el) return;
    showProbTip(el, el.getAttribute('data-tip'));
  }, true);

document.addEventListener('mouseleave', (e) => {
    if (e.target.matches('.prob-badge') || e.target.closest('.prob-badge')) {
      hideProbTip();
    }
  }, true);

document.addEventListener('focusin', (e) => {
    const el = e.target.closest('.prob-badge');
    if (!el) return;
    showProbTip(el, el.getAttribute('data-tip'));
  });
  document.addEventListener('focusout', (e) => {
    if (e.target.matches('.prob-badge') || e.target.closest('.prob-badge')) {
      hideProbTip();
    }
});