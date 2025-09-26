function filterBooks(data, query) {
    const q = query.toLowerCase();
    return data.filter(book =>
      book.Obra.toLowerCase().includes(q) ||
      book.Nome_Autor.toLowerCase().includes(q) ||
      book.Proprietario_Nome.toLowerCase().includes(q)
    );
}

function deriveTreemapFromActiveFilters() {
    if (activeFilters.treemap && treemapSelection) {
        return {
        mode:   treemapFilterOrigin || currentTreemapMode,
        selection: treemapSelection,
        origin: treemapFilterOrigin || currentTreemapMode
        };
    }

    const trads = activeFilters.byTradition?.values || [];
    if (trads.length === 1) {
        return { mode: 'tradition', selection: { trad: trads[0] }, origin: 'tradition' };
    }

    const cats = activeFilters.byCategory?.values || [];
    const gens = activeFilters.byGenre?.values || [];
    if (gens.length === 1) {
        const g = gens[0];
        const cat = cats[0] || categoryOfGenre(g);
        return { mode: 'category', selection: { cat, gen: g }, origin: 'category' };
    }

    if (cats.length === 1) {
        return { mode: 'category', selection: { cat: cats[0] }, origin: 'category' };
    }

    return { mode: currentTreemapMode, selection: null, origin: null };
}

function shallowEqualTreemapSel(a, b) {
    if (!a && !b) return true;
    if (!a || !b) return false;
    const ak = Object.keys(a), bk = Object.keys(b);
    if (ak.length !== bk.length) return false;
    return ak.every(k => a[k] === b[k]);
}

function syncTreemapUIToFilters() {
  if (skipNextTreemapRedraw) { updateTreemapBadge(); return; }

  const hasCat  = !!(activeFilters.byCategory?.values?.length || activeFilters.byGenre?.values?.length);
  const hasTrad = !!(activeFilters.byTradition?.values?.length);

  let targetMode = currentTreemapMode;
  if (lastClassificationMode === 'category'  && hasCat)  targetMode = 'category';
  else if (lastClassificationMode === 'tradition' && hasTrad) targetMode = 'tradition';
  else if (hasTrad && !hasCat) targetMode = 'tradition';
  else if (hasCat && !hasTrad) targetMode = 'category';

  const sel = selectionFromFiltersForMode(targetMode);

  const modeChanged = targetMode !== currentTreemapMode;
  const selChanged  = !shallowEqualTreemapSel(sel, treemapSelection);

  if (!(modeChanged || selChanged)) {
    updateTreemapBadge();
    return;
  }

  currentTreemapMode = targetMode;
  treemapSelection   = sel;

  d3.selectAll('.mode-button').classed('active', false);
  d3.select(`.mode-button[data-mode="${currentTreemapMode}"]`).classed('active', true);

  createTreemap(
    '#treemap-area',
    applyGlobalFilters(globalData),
    currentTreemapMode,
    updateDashboard
  );

  updateTreemapBadge();
}

function selectionFromFiltersForMode(mode) {
    if (mode === 'category') {
        const g = activeFilters.byGenre?.values?.[0];
        const c = activeFilters.byCategory?.values?.[0] || (g ? categoryOfGenre(g) : null);
        if (g && c) return { cat: c, gen: g };
        if (c)      return { cat: c };
        return null;
    } else {
        const t = activeFilters.byTradition?.values?.[0];
        return t ? { trad: t } : null;
  }
}

function syncPeriodChecklist () {
    const ul = document.getElementById('filter-period');
    if (!ul) return;

    ul.querySelectorAll('input').forEach(cb => {
      cb.checked = selectedPeriods.includes(cb.value);
    });

    bumpCounter(ul);
}

function debounce (fn, ms = 120) {
  let h; return (...args) => { clearTimeout(h); h = setTimeout(()=>fn(...args), ms); };
}

const scheduleAvailUpdate = debounce(updateChecklistAvailability, 120);
const scheduleDashboardUpdate = debounce(updateDashboard, 100);

const sourceToList = {
    byLibrary   : 'filter-library',
    network     : 'filter-library',
    byAuthor    : 'filter-author',
    byIdioma    : 'filter-idioma',
    byCategory  : 'filter-category',
    byTradition : 'filter-tradition',
    byGenre     : 'filter-genre',
    byPeriod    : 'filter-period',
    period      : 'filter-period',
    byProbObra  : 'filter-probobra',
    byProbAutor : 'filter-probautor',
    byLocation  : 'filter-location',
    byGeoArea   : 'filter-geoarea'
};

const listIdToField = {
  'filter-library'   : 'Proprietario_Nome',
  'filter-author'    : 'Nome_Autor',
  'filter-idioma'    : 'Idioma',
  'filter-category'  : 'CatLit_Descricao',
  'filter-tradition' : 'TradicaoIntelectual_Obra',
  'filter-genre'     : 'GenLit_Descricao',
  'filter-period'    : 'EpocaHistorica_Autor',
  'filter-probobra'  : 'ProbAtribObra',
  'filter-probautor' : 'ProbAtribAutor',
  'filter-geoarea'   : 'OrigemGeografica_Autor'
};

function setChecked(listId, values){
    const ul = document.getElementById(listId);
    if (!ul) return;
    ul.querySelectorAll('input').forEach(cb =>
        cb.checked = values.includes(cb.value)
    );
    bumpCounter(ul);
}

function syncModalLists () {
    const wanted = {};

    Object.entries(activeFilters).forEach(([src, obj])=>{
      const listId = obj.listId ?? sourceToList[src];
      if (!listId) return;
      if (!wanted[listId]) wanted[listId] = new Set();
      obj.values.forEach(v => wanted[listId].add(v));
    });

    Array.from(
      new Set(
        Object.values(sourceToList)
              .concat(Object.values(activeFilters)
                        .map(o=>o.listId)
                        .filter(Boolean))
      )
    ).forEach(listId=>{
      const vals = wanted[listId] ? [...wanted[listId]] : [];
      setChecked(listId, vals);
    });
}

function commitChecklistFilters () {
    const libs   = getChecked('filter-library');
    const auths  = getChecked('filter-author');
    const idioma = getChecked('filter-idioma');
    let   cats   = getChecked('filter-category');
    let   trads  = getChecked('filter-tradition');
    let   gens   = getChecked('filter-genre');
    const pers   = getChecked('filter-period');

    const periodKey = activeFilters.hasOwnProperty('period') ? 'period' : 'byPeriod';
    selectedPeriods = [...pers];
    window.selectedPeriods = selectedPeriods.slice();

    const probOb = getChecked('filter-probobra');
    const probAu = getChecked('filter-probautor');

    const locs = getChecked('filter-location');
    const geos = getChecked('filter-geoarea');

    // Location: include explicit "No location" option
    locs.length
        ? setGlobalFilter(
            'byLocation',
            r => {
            const k = locKeyFromRow(r) || SPECIAL.UNLOCATED;
            return locs.includes(k);
            },
            locs,
            'filter-location'
        )
        : clearGlobalFilter('byLocation');

    // Geo area (with specials support if you enabled it in options)
    if (geos.length) {
        const sel = new Set(geos);
        setGlobalFilter(
        'byGeoArea',
        r => rowMatchesSelection(r, 'OrigemGeografica_Autor', sel),
        geos,
        'filter-geoarea'
        );
    } else {
        clearGlobalFilter('byGeoArea');
    }

    // Genre requires a selected Category
    if (!cats.length && gens.length) {
        setChecked('filter-genre', []);
        gens = [];
    }

    // If a genre is selected, it must belong to the selected category
    if (cats.length && gens.length) {
        const g = gens[0];
        if (categoryOfGenre(g) !== cats[0]) {
        setChecked('filter-genre', []);
        gens = [];
        }
    }

    // Apply filters (use specials-aware predicate)
    if (libs.length) {
        const sel = new Set(libs);
        setGlobalFilter('byLibrary',   r => rowMatchesSelection(r, 'Proprietario_Nome',        sel), libs);
    } else clearGlobalFilter('byLibrary');

    if (auths.length) {
        const sel = new Set(auths);
        setGlobalFilter('byAuthor',    r => rowMatchesSelection(r, 'Nome_Autor',               sel), auths);
    } else clearGlobalFilter('byAuthor');

    if (idioma.length) {
        const sel = new Set(idioma);
        setGlobalFilter('byIdioma',    r => rowMatchesSelection(r, 'Idioma',                   sel), idioma);
    } else clearGlobalFilter('byIdioma');

    if (cats.length) {
        const sel = new Set(cats);
        setGlobalFilter('byCategory',  r => rowMatchesSelection(r, 'CatLit_Descricao',         sel), cats);
    } else clearGlobalFilter('byCategory');

    if (trads.length) {
        const sel = new Set(trads);
        setGlobalFilter('byTradition', r => rowMatchesSelection(r, 'TradicaoIntelectual_Obra', sel), trads);
    } else clearGlobalFilter('byTradition');

    if (gens.length) {
        const sel = new Set(gens);
        setGlobalFilter('byGenre',     r => rowMatchesSelection(r, 'GenLit_Descricao',         sel), gens);
    } else clearGlobalFilter('byGenre');

    if (pers.length) {
        setGlobalFilter(
        periodKey,
        r => pers.includes(normalizePeriod(r.EpocaHistorica_Autor)),
        pers,
        'filter-period'
        );
    } else {
        clearGlobalFilter(periodKey);
    }

    if (probOb.length) {
        const sel = new Set(probOb);
        setGlobalFilter('byProbObra',  r => rowMatchesSelection(r, 'ProbAtribObra',  sel), probOb);
    } else clearGlobalFilter('byProbObra');

    if (probAu.length) {
        const sel = new Set(probAu);
        setGlobalFilter('byProbAutor', r => rowMatchesSelection(r, 'ProbAtribAutor', sel), probAu);
    } else clearGlobalFilter('byProbAutor');
}

function notifyFilterChange () {
    updateClearButton();
    updateFilterBadge();
    document.querySelectorAll('.checklist').forEach(bumpCounter);

    syncPeriodChecklist();
    syncModalLists();
    rebuildFilterTags();
    scheduleAvailUpdate();
    scheduleDashboardUpdate();
    syncTreemapUIToFilters();

    if (typeof updateModalClearButton === 'function') {
        updateModalClearButton();
    }
}

// Centralized filtering system
let activeFilters = {};

function categoryOfGenre(genre) {
    const row = globalData?.find(r => r.GenLit_Descricao === genre);
    return row ? row.CatLit_Descricao : '';
}

function applyGlobalFilters(rawData) {
    return Object.values(activeFilters)
                .reduce((data, obj) => data.filter(obj.fn), rawData);
}

function setGlobalFilter(source, filterFn, values = [], listId = null) {
    activeFilters[source] = { fn : filterFn, values, listId };
    notifyFilterChange();
}

function clearGlobalFilter(source) {
    delete activeFilters[source];
    if (source === 'treemap') treemapSelection = null;
    notifyFilterChange();
}

function clearAllFilters() {
    activeFilters          = {};
    window.selectedPeriods = [];

    treemapSelection       = null;
    treemapFilterOrigin    = null;
    lastClassificationMode = null;

    selectedNodes.clear();
    selectedLinks.clear();
    clickedLinks.clear();
    selectedPeriods        = [];

   d3.selectAll('#period-filter .period-bar')
       .classed('selected', false);
   if (typeof clearPeriodHighlights === 'function') clearPeriodHighlights();

   if (typeof unpinBook          === 'function') unpinBook();
   if (typeof clearHoverItem     === 'function') clearHoverItem();
   if (typeof setDetailsItems    === 'function') setDetailsItems([], null);
   else if (typeof clearDetailsPanel === 'function') clearDetailsPanel();

   try {
       d3.select('#network-graph .network-wrapper')
         .selectAll('g.node')
         .classed('active', false)
         .classed('selected-by-link', false);
       d3.select('#network-graph .network-wrapper')
         .selectAll('.link')
         .classed('active', false)
         .style('opacity', null);
   } catch (_) {}

   if (window.selectedLocations) window.selectedLocations.clear();
   if (typeof clearMapHighlights === 'function') clearMapHighlights();

   d3.selectAll('#catalog-entries .catalog-entry').classed('pinned', false);

    notifyFilterChange();
    updateNetworkStyles(null);
}

function updateClearButton() {
    const btn = document.getElementById('clear-btn');
    if (!btn) return;

    const hasFilters = Object.keys(activeFilters).length > 0;
    const hasSearch  = !!document.getElementById('search-input')?.value.trim();
    const hasPinned  = !!(window.getPinnedBook && window.getPinnedBook());

    const isAny = hasFilters || hasSearch || hasPinned;

    btn.classList.toggle('active', isAny);

    const img = btn.querySelector('img');
    if (img) {
        img.src = isAny
        ? '../img/icons/clear-filter-active.png'
        : '../img/icons/clear-filter-inactive.png';
    }
}

function applyFiltersExcept(excludeFilters = []) {
    const excludeSet = new Set(excludeFilters);
    let result = [...globalData];

    Object.entries(activeFilters).forEach(([key, filter]) => {
        if (!excludeSet.has(key) && filter.fn) {
            result = result.filter(filter.fn);
        }
    });

    return result;
}

function updateChecklistAvailability () {
    const fullyFilteredRows = applyGlobalFilters(globalData);

    // Determine whether a category is selected (either via checklist or treemap)
    const hasCategory =
        !!(activeFilters.byCategory?.values?.length || activeFilters.byGenre?.values?.length);

    const genreGuard = document.getElementById('genre-guard-msg');
    if (genreGuard) genreGuard.hidden = !!hasCategory;

    Object.entries(listIdToField).forEach(([listId, field]) => {
        const ul = document.getElementById(listId);
        if (!ul) return;

        // Special gating for genres: block if there is no category selected
        if (listId === 'filter-genre' && !hasCategory) {
            ul.querySelectorAll('input').forEach(cb => {
                cb.disabled = true;
                cb.closest('li').classList.add('disabled-option');
            });
            // keep disabled items sorted to the bottom behavior
            const lis = Array.from(ul.children);
            lis.sort((a, b) => {
                const da = a.classList.contains('disabled-option') ? 1 : 0;
                const db = b.classList.contains('disabled-option') ? 1 : 0;
                if (da !== db) return da - db;
                return Number(a.dataset.idx) - Number(b.dataset.idx);  // keep original order
            });

            lis.forEach(li => ul.appendChild(li));
            return;
        }

        const ownFilterKeys = Object.entries(activeFilters)
            .filter(([src,obj]) => (obj.listId ?? sourceToList[src]) === listId)
            .map(([src]) => src);

        const rows = ownFilterKeys.length
            ? applyFiltersExcept(ownFilterKeys)
            : fullyFilteredRows;

        const allowed = new Set();

        rows.forEach(r => {
        if (listId === 'filter-period') {
            allowed.add(normalizePeriod(r[field]));
        } else {
            const raw = r[field];
            const sk  = specialKeyOf(raw);
            if (sk) allowed.add(sk);
            else    allowed.add((raw ?? '').toString().trim());
        }
        });

        ul.querySelectorAll('input').forEach(cb => {
            const selectable = allowed.has(cb.value) || cb.checked;
            cb.disabled = !selectable;
            cb.closest('li').classList.toggle('disabled-option', !selectable);

            cb.parentElement.removeAttribute('title');
        });

        const lis = Array.from(ul.children);
        lis.sort((a,b)=>
            a.classList.contains('disabled-option') -
            b.classList.contains('disabled-option')
        );
        lis.forEach(li => ul.appendChild(li));
    });

    const ulLoc = document.getElementById('filter-location');
    if (ulLoc) {
        const ownKeys = Object.entries(activeFilters)
            .filter(([src,obj]) => (obj.listId ?? sourceToList[src]) === 'filter-location')
            .map(([src]) => src);

        const rows = ownKeys.length ? applyFiltersExcept(ownKeys) : fullyFilteredRows;
        const allowed = new Set();
            rows.forEach(r => {
                const k = locKeyFromRow(r);
                if (k) allowed.add(k);
                else   allowed.add(SPECIAL.UNLOCATED);
            });

        ulLoc.querySelectorAll('input').forEach(cb => {
            const selectable = allowed.has(cb.value) || cb.checked;
            cb.disabled = !selectable;
            cb.closest('li').classList.toggle('disabled-option', !selectable);
            if (!selectable) cb.parentElement.title = 'No books match the current filters';
            else cb.parentElement.removeAttribute('title');
        });

        const lis = Array.from(ulLoc.children);
        lis.sort((a, b) => {
            const da = a.classList.contains('disabled-option') ? 1 : 0;
            const db = b.classList.contains('disabled-option') ? 1 : 0;
            if (da !== db) return da - db;
            return Number(a.dataset.idx) - Number(b.dataset.idx);  // keep original order
        });

        lis.forEach(li => ulLoc.appendChild(li));
    }
}

