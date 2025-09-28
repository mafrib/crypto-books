const ownerPhotoMap = {
    'D. Afonso V': 'img/libraries/afonso-v.jpg',
    'D. Beatriz': 'img/libraries/beatriz.jpg',
    'D. Duarte': 'img/libraries/duarte.jpg',
    'D. Fernando': 'img/libraries/fernando.jpg',
    'D. João I':    'img/libraries/joao-i.jpg',
    'D. Leonor de Viseu': 'img/libraries/leonor-viseu.jpg',
    'D. Pedro': 'img/libraries/pedro.jpg'
};

const PIN_ICONS = {
    book:       '../img/icons/book.png',
    person:     '../img/icons/person.png',
    location:   '../img/icons/location.png',
    historical: '../img/icons/historical.png'
};

function normText(s) {
    return (s || '').toString().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function isPendingClassification(v) {
    const t = normText(v);
    if (!t) return false;
    return t === 'em classificacao' || t === 'classificacao' || /\b(in|em)\s+classific/.test(t);
}

function meaningful(v) {
    const t = (v || '').toString().trim();
    return t && !isPendingClassification(t);
}

function withColon(label) {
    const txt = (label || '').toString();
    return /[:：]$/.test(txt) ? txt : `${txt}:`;
}

let currentCarouselItems = [];
let currentIndex = 0;

let hoverItem = null;
let __catalogOverlayTimer = null;

let pinnedBook = null;
window.getPinnedBook = () => pinnedBook;

let __catalogToastTimer = null;

function pinLabel(kind) {
    // Use i18n if available, otherwise a safe English fallback
    const T = (k, def) => (window.i18n && typeof i18n.t === 'function') ? i18n.t(k) : def;
    switch (kind) {
      case 'book':       return T('pin.book',       'Book pinned');
      case 'person':     return T('pin.library',    'Library pinned');
      case 'location':   return T('pin.location',   'Location pinned');
      case 'historical': return T('pin.period',     'Historical period pinned');
      default:           return '';
    }
}

function ensurePinIndicator() {
    const panel = document.getElementById('hover-details');
    if (!panel) return null;
    let el = panel.querySelector('#details-pin');
    if (!el) {
      el = document.createElement('div');
      el.id = 'details-pin';
      el.className = 'details-pin';
      el.innerHTML = '<img alt="" aria-hidden="true"><span class="label"></span>';
      panel.appendChild(el);
    }
    return el;
}

function setPinIndicator(kind) {
    const el = ensurePinIndicator();
    if (!el) return;

    if (!kind) {
      el.classList.remove('visible');
      el.setAttribute('aria-hidden', 'true');
      el.removeAttribute('title');
      return;
    }

    const img = el.querySelector('img');
    const lab = el.querySelector('.label');

    img.src = PIN_ICONS[kind] || '';
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');

    const text = pinLabel(kind);
    lab.textContent = text;
    el.title = text;

    el.classList.add('visible');
    el.setAttribute('aria-hidden', 'false');
}

function setDetailsExpandEnabled(on) {
    const btn = document.getElementById('details-expand-btn');
    if (!btn) return;
    btn.disabled = !on;
    btn.classList.toggle('disabled', !on);
    btn.setAttribute('aria-disabled', on ? 'false' : 'true');
}

function ensureDetailsExpand() {
    const panel = document.getElementById('hover-details');
    if (!panel || panel.__expandWired) return;
    panel.__expandWired = true;

    const btn = document.createElement('button');
    btn.id = 'details-expand-btn';
    btn.className = 'details-expand-btn';
    btn.setAttribute('aria-label', 'Maximize details');
    btn.innerHTML = '<img src="../img/icons/maximize.png" alt="" aria-hidden="true">';
    panel.appendChild(btn);

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (btn.disabled) return;
      panel.classList.contains('is-expanded')
        ? closeDetailsModal(panel.__modal, panel)
        : openDetailsModal(panel);
    });
}

function hideBookMeta(panel) {
    const attrib = panel.querySelector('.details-panel__attrib');
    const author = panel.querySelector('.details-panel__authorship');
    const desc   = panel.querySelector('.details-panel__description');
    [attrib, author, desc].forEach(el => {
      if (el) { el.style.display = 'none'; el.innerHTML = ''; }
    });
}

function openDetailsModal(panel) {
    const modal = document.createElement('div');
    modal.className = 'details-modal';
    modal.innerHTML = '<div class="details-modal-panel"></div>';
    const wrap = modal.firstElementChild;

    // placeholder to keep the grid cell
    const ph = document.createElement('div');
    ph.className = 'details-placeholder';
    panel.__placeholder = ph;
    panel.parentNode.insertBefore(ph, panel);

    panel.__origParent = panel.parentNode;
    panel.__origNext = panel.nextSibling;
    panel.__modal = modal;

    panel.classList.add('is-expanded');
    wrap.appendChild(panel);

    // Toggle button appearance
    const btn = document.getElementById('details-expand-btn');
    if (btn) {
      btn.setAttribute('aria-label', 'Restore details');
      btn.innerHTML = '<img src="../img/icons/minimize.png" alt="" aria-hidden="true">';
    }

    // Click outside closes
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeDetailsModal(modal, panel);
    });

    function escListener(e) {
      if (e.key === 'Escape') closeDetailsModal(modal, panel);
    }
    document.addEventListener('keydown', escListener);
    modal.__escListener = escListener;

    document.body.appendChild(modal);
}

function closeDetailsModal(modal, panel) {
    const { __origParent: p, __origNext: n } = panel;
    n ? p.insertBefore(panel, n) : p.appendChild(panel);
    panel.classList.remove('is-expanded');

    // Toggle button appearance back
    const btn = document.getElementById('details-expand-btn');
    if (btn) {
      btn.setAttribute('aria-label', 'Maximize details');
      btn.innerHTML = '<img src="../img/icons/maximize.png" alt="" aria-hidden="true">';
    }

    if (panel.__placeholder) {
      panel.__placeholder.remove();
      delete panel.__placeholder;
    }
    if (modal.__escListener) {
      document.removeEventListener('keydown', modal.__escListener);
      delete modal.__escListener;
    }
    modal.remove();
}

function getFirst(row, keys) {
    for (const k of keys) {
      if (row[k] != null && String(row[k]).trim() !== '') return row[k];
    }
    return '';
}

function normalizeProbString(v) {
  return (v || '').toString().trim();
}

function probLevelFrom(value) {
    const t = normalizeProbString(value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    if (!t) return 1; // default to lowest level

    // Highest certainty - green
    if (t.includes('indisputad') || t.includes('segura')) return 4;

    // High certainty - yellow
    if (t.includes('prov')) return 3; // 'provável'/'provavel'

    // Medium certainty - orange
    if (t.includes('possiv') || t.includes('possível')) return 2;

    // Lowest certainty - red
    if (t.includes('indet')) return 1; // 'indeterminada'

    // Handle percentage values
    const m = t.match(/(\d{1,3})\s*%/);
    if (m) {
      const p = Math.max(0, Math.min(100, +m[1]));
      if (p >= 85) return 4; // green
      if (p >= 70) return 3; // yellow
      if (p >= 50) return 2; // orange
      return 1; // red
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

function ensureBookNodes(panel) {
    const info = panel.querySelector('.details-panel__info');

    let attribEl = panel.querySelector('.details-panel__attrib');
    if (!attribEl) {
      attribEl = document.createElement('p');
      attribEl.className = 'details-panel__attrib';
      info.appendChild(attribEl);
    }

    let authorshipEl = panel.querySelector('.details-panel__authorship');
    if (!authorshipEl) {
      authorshipEl = document.createElement('p');
      authorshipEl.className = 'details-panel__authorship';
      info.appendChild(authorshipEl);
    }

    let descEl = panel.querySelector('.details-panel__description');
    if (!descEl) {
      descEl = document.createElement('p');
      descEl.className = 'details-panel__description';
      info.appendChild(descEl);
    }
    return { attribEl, authorshipEl, descEl };
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
      showCatalogOverlay(i18n.t('overlay.onePin'));
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
    d3.selectAll('#period-filter .period-bar').classed('pinned-period-bar', false);
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

function onlyYear(v) {
    const t = (v || '').toString().trim();
    if (!t) return '';
    if (isPendingClassification(t)) return '?';
    const m = t.match(/(\d{4})/);
    return m ? m[1] : t;
}

function fmtYear(raw) {
    if (isPendingClassification(raw) || !raw || !String(raw).trim()) return '?';
    return onlyYear(raw);
}

function fmtPlace(raw) {
    if (isPendingClassification(raw) || !raw || !String(raw).trim()) return '?';
    return String(raw).trim();
}

function renderPeriodDetails(periodName) {
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

    const isPinned = Array.isArray(window.selectedPeriods) && window.selectedPeriods.includes(periodName);
    setPinIndicator(isPinned ? 'historical' : null);

    // Use the current filtered set (period filter already applied by the bar click)
    const base = (typeof applyGlobalFilters === 'function' && window.globalData)
      ? applyGlobalFilters(globalData)
      : (window.globalData || []);
    const normalizeP = (v) =>
      (typeof window.normalizePeriod === 'function')
        ? window.normalizePeriod(v)
        : ((v ?? '').toString().trim() || 'Por determinar');

    const rows = base.filter(r => normalizeP(r.EpocaHistorica_Autor) === periodName);

    // Per-author counts
    const counts = rows.reduce((m, r) => {
      const a = (r.Nome_Autor || '').trim();
      if (!a) return m;
      m.set(a, (m.get(a) || 0) + 1);
      return m;
    }, new Map());

    // Show only the needed fields for list mode
    placeholder.style.display = 'none';
    wrapper.style.display     = 'none';
    nameEl.style.display      = '';
    booksEl.style.display     = '';
    datesEl.style.display     = 'none';
    titleEl.style.display     = 'none';
    reignEl.style.display     = 'none';

    nameEl.innerHTML = formatPeriodLabelHTML(periodName);
    nameEl.setAttribute('aria-label', (periodName ?? '').toString().trim());

    booksEl.textContent = `${rows.length} ${i18n.plural(rows.length, i18n.t('unit.book.one'), i18n.t('unit.book.many'))}`;

    if (listEl) {
      listEl.hidden = false;
      listEl.innerHTML = '';

      const header = document.createElement('div');
      header.className = 'list-header';
      header.textContent = `${i18n.t('unit.author.many')} (${counts.size})`;
      listEl.appendChild(header);

      const authors = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

      authors.forEach(([author, n]) => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.textContent = `${author} — ${n} book${n === 1 ? '' : 's'}`;
        listEl.appendChild(div);
      });
    }
    setDetailsExpandEnabled(true);
  }

window.renderPeriodDetails = renderPeriodDetails;

function __getSelectedPeriods() {
    if (Array.isArray(window.selectedPeriods)) {
      return window.selectedPeriods.slice();
    }

    const els = Array.from(document.querySelectorAll('#period-filter .period-bar.selected'));
    const fromAttr = els.map(el => el.getAttribute('data-period')).filter(Boolean);
    if (fromAttr.length) return fromAttr;

    return Array.from(
      document.querySelectorAll('#period-filter .period-bar.selected .label')
    ).map(el => el.textContent.replace(/\s+/g, ' ').trim());
}

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

    const { attribEl, authorshipEl, descEl } = ensureBookNodes(panel);

    // Base visibility
    placeholder.style.display = 'none';
    wrapper.style.display     = 'none';
    nameEl.style.display      = '';
    booksEl.style.display     = '';
    datesEl.style.display     = 'none';
    titleEl.style.display     = 'none';
    reignEl.style.display     = 'none';
    if (listEl) { listEl.hidden = false; listEl.innerHTML = ''; }

    // Authorship paragraph (old) stays hidden
    authorshipEl.style.display = 'none';
    authorshipEl.setAttribute('aria-hidden', 'true');

    // Header label (already translated in i18n)
    booksEl.textContent = i18n.t('details.book.titleLabel');

    // Title
    const title = (row.Obra || '').toString().trim();
    nameEl.textContent = title || '—';
    nameEl.setAttribute('aria-label', title || '—');

    // Attribution badge + “see more” for alternative attribution (both hidden if pending)
    const probObraRaw = getFirst(row, ['ProbAtribObra', 'ProbAtribuicao_Obra', 'Prob Atrib Obra', 'probatribobra']);
    const probObra    = meaningful(probObraRaw) ? probObraRaw : '';
    const obraBadge   = probObra ? buildProbBadge(probObra, i18n.t('prob.obra.tip')) : '';

    const altAtribRaw = getFirst(row, [
      'AtribuicaoAlternatObra', 'AtribuicaoAlternat_Obra', 'AtribuiçãoAlternat_Obra', 'Atribuicao Alternativa Obra'
    ]);
    const altAtribObra = meaningful(altAtribRaw) ? altAtribRaw.toString().trim() : '';

    if (obraBadge || altAtribObra) {
        attribEl.style.display = '';
        const altId = `alt-atr-obra-${Math.random().toString(36).slice(2,8)}`;

        attribEl.innerHTML = `
          <span class="meta-label">${i18n.t('details.attribution')}</span>
          ${obraBadge || ''}
          ${altAtribObra ? `
            <button type="button" class="meta-toggle" aria-expanded="false" aria-controls="${altId}">
              ${i18n.t('details.seeMore')}
            </button>
            <span id="${altId}" class="meta-more" hidden>
              <strong>${withColon(i18n.t('details.altBook'))}</strong> ${altAtribObra}
            </span>
          ` : ''}
        `;

        if (altAtribObra) {
            const btn  = attribEl.querySelector('.meta-toggle');
            const more = attribEl.querySelector('.meta-more');
            btn.addEventListener('click', () => {
              const expanded = btn.getAttribute('aria-expanded') === 'true';
              btn.setAttribute('aria-expanded', String(!expanded));
              more.hidden = expanded;
              btn.textContent = expanded ? i18n.t('details.seeMore') : i18n.t('details.seeLess');
            });
        }
    } else {
          attribEl.style.display = 'none';
          attribEl.innerHTML = '';
      }

    // Description (hidden if pending)
    const descRaw = getFirst(row, ['Descricao', 'Descrição', 'descricao']);
    const desc    = meaningful(descRaw) ? descRaw.toString().trim() : '';
    if (desc) {
        descEl.style.display = '';
        descEl.innerHTML = `<strong>${withColon(i18n.t('details.description'))}</strong> ${desc}`;
    } else {
        descEl.style.display = 'none';
        descEl.innerHTML = '';
    }

    // Author box
    const authorName = (getFirst(row, ['Nome_Autor', 'Autor']) || '').toString().trim();

    const bornYear  = fmtYear ( getFirst(row, ['DataNasc_Autor' ]) );
    const bornPlace = fmtPlace( getFirst(row, ['LocalNasc_Autor']) );
    const diedYear  = fmtYear ( getFirst(row, ['DataMorte_Autor']) );
    const diedPlace = fmtPlace( getFirst(row, ['LocalMorte_Autor']) );

    function buildLine(year, place) {
        const y = year  && year.trim()  ? year  : '?';
        const p = place && place.trim() ? place : '?';
        return `${y}, ${p}`;
    }

    const bornLine = buildLine(bornYear, bornPlace);
    const diedLine = buildLine(diedYear, diedPlace);

    const probAutorRaw = getFirst(row, ['ProbAtribAutor', 'ProbAtribuicao_Autor', 'Prob Atrib Autor', 'probatribautor']);
    const probAutor    = meaningful(probAutorRaw) ? probAutorRaw : '';
    const autorBadge   = probAutor ? buildProbBadge(probAutor, i18n.t('prob.autor.tip')) : '';

    const autorStatusRaw = getFirst(row, ['EstatutoAutor']);
    const autorStatus    = meaningful(autorStatusRaw) ? autorStatusRaw.toString().trim() : '';

    const bioRaw = getFirst(row, ['BioAbreviada_Autor']);
    const bio = meaningful(bioRaw) ? bioRaw.toString().trim() : '';

    const authorBox = document.createElement('div');
    authorBox.className = 'list-item';
    authorBox.innerHTML = `
      <div><strong>${withColon(i18n.t('catalog.header.author'))}</strong> ${authorName || '—'}</div>
      ${(bornLine || diedLine) ? `
        <ul class="subpoints author-subpoints">
          ${bornLine ? `<li><strong>${withColon(i18n.t('details.birth'))}</strong> ${bornLine}</li>` : ''}
          ${diedLine ? `<li><strong>${withColon(i18n.t('details.death'))}</strong> ${diedLine}</li>` : ''}
        </ul>` : ''}
      ${autorBadge ? `<div><strong>${withColon(i18n.t('details.authorship'))}</strong> ${autorBadge}</div>` : ''}
      ${autorStatus ? `<div><strong>${withColon(i18n.t('details.authorStatus'))}</strong> ${autorStatus}</div>` : ''}
      ${bio        ? `<div><strong>${withColon(i18n.t('details.bio'))}</strong> ${bio}</div>` : ''}   <!-- NEW -->
    `;
    listEl.appendChild(authorBox);

    // Language / Form / Support (each hidden if pending)
    const idioma  = meaningful(getFirst(row, ['Idioma'])) ? getFirst(row, ['Idioma']).toString().trim() : '';
    const forma   = meaningful(getFirst(row, ['Forma'])) ? getFirst(row, ['Forma']).toString().trim() : '';
    const suporte = meaningful(getFirst(row, ['Suporte'])) ? getFirst(row, ['Suporte']).toString().trim() : '';
    if (idioma || forma || suporte) {
        const box = document.createElement('div');
        box.className = 'list-item';
        box.innerHTML = `
          ${idioma  ? `<div><strong>${withColon(i18n.t('details.language'))}</strong> ${idioma}</div>` : ''}
          ${forma   ? `<div><strong>${withColon(i18n.t('details.form'))}</strong> ${forma}</div>` : ''}
          ${suporte ? `<div><strong>${withColon(i18n.t('details.support'))}</strong> ${suporte}</div>` : ''}
        `;
        listEl.appendChild(box);
    }

    // Original production (date + place), both filtered
    const prodDateRaw  = getFirst(row, ['DataProdOriginal_Obra']);
    const prodPlaceRaw = getFirst(row, ['LugarProdOriginal_Obra']);
    const prodDate  = meaningful(prodDateRaw)  ? prodDateRaw.toString().trim()  : '';
    const prodPlace = meaningful(prodPlaceRaw) ? prodPlaceRaw.toString().trim() : '';
    if (prodDate || prodPlace) {
        const pp = document.createElement('div');
        pp.className = 'list-item';
        const combined = [prodDate, prodPlace].filter(Boolean).join(', ');
        pp.innerHTML = `<div><strong>${withColon(i18n.t('details.production'))}</strong> ${combined}</div>`;
        listEl.appendChild(pp);
    }

    // Synopsis (hidden if pending)
    const synopsisRaw = getFirst(row, ['Sinopse_Obra']);
    const synopsis    = meaningful(synopsisRaw) ? synopsisRaw.toString().trim() : '';
    if (synopsis) {
        const syn = document.createElement('div');
        syn.className = 'list-item';
        syn.innerHTML = `<div><strong>${withColon(i18n.t('details.synopsis'))}</strong> ${synopsis}</div>`;
        listEl.appendChild(syn);
    }

    // Archival copies / Textual editions (hidden if pending)
    const copiasRaw  = getFirst(row, ['CopiasArquivisticas_Obra']);
    const edicoesRaw = getFirst(row, ['EdicoesTextuais_Obra']);
    const copias  = meaningful(copiasRaw)  ? copiasRaw.toString().trim()  : '';
    const edicoes = meaningful(edicoesRaw) ? edicoesRaw.toString().trim() : '';
    if (copias || edicoes) {
        const we = document.createElement('div');
        we.className = 'list-item';
        we.innerHTML = `
          ${copias  ? `<div><strong>${withColon(i18n.t('details.archivalCopies'))}</strong> ${copias}</div>` : ''}
          ${edicoes ? `<div><strong>${withColon(i18n.t('details.textualEditions'))}</strong> ${edicoes}</div>` : ''}
        `;
        listEl.appendChild(we);
      }

    panel.classList.toggle('is-pinned', !!(window.getPinnedBook && window.getPinnedBook()));
    setDetailsExpandEnabled(true);
}

function renderHover() {
    if (!hoverItem) return;
    if (hoverItem.type === 'library') {
      renderLibraryDetails(hoverItem.id, window.globalData);
    } else if (hoverItem.type === 'location') {
      renderLocationDetails(hoverItem.id);
    }
}

function formatPeriodLabelHTML(label) {
    const s = (label ?? '').toString().trim();
    if (!s) return '';
    const m = s.match(/^(.*?)\s*(\(.+\))$/);
    if (!m) return s;
    const [, main, years] = m;

    return `${main}<br><span class="period-years period‐years">${years}</span>`;
}

function rebuildDetailsItems(focusId) {
    const items = [];
    const af = window.activeFilters || {};

    if (window.selectedNodes && window.selectedNodes.size) {
      for (const id of window.selectedNodes) {
        items.push({ type: 'library', id, label: id });
      }
    }

    if (window.selectedLocations && window.selectedLocations.size) {
      for (const key of window.selectedLocations) {
        const p = (window.mapPoints || []).find(pt => pt.key === key);
        items.push({ type: 'location', id: key, label: p?.label || key });
      }
    }

    __getSelectedPeriods().forEach(p => {
      if (!items.some(it => it.type === 'period' && it.id === p)) {
        items.push({ type: 'period', id: p, label: p });
      }
    });

    const periods = Array.isArray(window.selectedPeriods) ? window.selectedPeriods : [];
    periods.forEach(p => {
      if (!items.some(it => it.type === 'period' && it.id === p)) {
        items.push({ type: 'period', id: p, label: p });
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
    panel.classList.remove('details-panel--book-mode');
    panel.classList.remove('details-panel--list-mode');
    hideBookMeta(panel);

    const isPinned = !!(window.selectedNodes && window.selectedNodes.has(libName));
    setPinIndicator(isPinned ? 'person' : null);

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

    nameEl.textContent = libName;
    nameEl.setAttribute('aria-label', libName);

    const count = allData.filter(r => r.Proprietario_Nome === libName).length;
    const bookWord = i18n.plural(count, i18n.t('unit.book.one'), i18n.t('unit.book.many'));
    booksEl.textContent = `${count} ${bookWord}`;

    const info = allData.find(r => r.Proprietario_Nome === libName) || {};
    datesEl.innerHTML = `<strong>${i18n.t('details.lifespan')}</strong> ${info.Proprietario_DatasExtremas || '—'}`;
    titleEl.innerHTML = `<strong>${i18n.t('details.royalTitle')}</strong> ${info.Proprietario_Titulo || '—'}`;
    reignEl.innerHTML = `<strong>${i18n.t('details.tenure')}</strong> ${info.Proprietario_Titulo_DatasExtremas || '—'}`;

    setDetailsExpandEnabled(true);
}

function updateDetailsPanel(libName, allData) {
    renderLibraryDetails(libName, allData);
}

window.updateDetailsPanel = updateDetailsPanel;

function renderLocationDetails(locKey) {
    const panel       = document.getElementById('hover-details');
    panel.classList.add('details-panel--list-mode');
    panel.classList.remove('details-panel--book-mode');
    hideBookMeta(panel);
    const wrapper     = panel.querySelector('.details-panel__img-wrapper');
    const nameEl      = panel.querySelector('.details-panel__name');
    const booksEl     = panel.querySelector('.details-panel__books');
    const datesEl     = panel.querySelector('.details-panel__dates');
    const titleEl     = panel.querySelector('.details-panel__title');
    const reignEl     = panel.querySelector('.details-panel__reign');
    const placeholder = panel.querySelector('.details-panel__placeholder');
    const listEl      = panel.querySelector('#details-list');

    const isPinned = !!(window.selectedLocations && window.selectedLocations.has(locKey));
    setPinIndicator(isPinned ? 'location' : null);

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
    booksEl.textContent = `${rows.length} ${i18n.plural(rows.length, i18n.t('unit.book.one'), i18n.t('unit.book.many'))}`;

    if (listEl) {
      listEl.hidden = false;
      listEl.innerHTML = '';

      // proper header (not boxed)
      const header = document.createElement('div');
      header.className = 'list-header';
      header.textContent = `${i18n.t('unit.author.many')} (${counts.size})`;
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
    setDetailsExpandEnabled(true);
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
    } else if (item.type === 'period') {
        renderPeriodDetails(item.id);
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
    setPinIndicator(null);
    const panel = document.getElementById('hover-details');
    panel.classList.remove('details-panel--list-mode', 'details-panel--book-mode');
    hideBookMeta(panel);
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
    placeholder.textContent = i18n.t('details.placeholder');
    setDetailsExpandEnabled(false);
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

document.addEventListener('DOMContentLoaded', ensureDetailsExpand);