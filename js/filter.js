function filterBooks(data, query) {
    const q = query.toLowerCase();
    return data.filter(book =>
      book.Obra.toLowerCase().includes(q) ||
      book.Nome_Autor.toLowerCase().includes(q) ||
      book.Proprietario_Nome.toLowerCase().includes(q)
    );
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
    byProbAutor : 'filter-probautor'
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
  'filter-probautor' : 'ProbAtribAutor'
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

    const libs    = getChecked('filter-library');
    const auths   = getChecked('filter-author');
    const idioma  = getChecked('filter-idioma');
    const cats    = getChecked('filter-category');
    const trads   = getChecked('filter-tradition');
    const gens    = getChecked('filter-genre');
    const pers    = getChecked('filter-period');
    const periodKey = activeFilters.hasOwnProperty('period')
                          ? 'period'
                          : 'byPeriod';

    const probOb  = getChecked('filter-probobra');
    const probAu  = getChecked('filter-probautor');

    libs.length   ? setGlobalFilter('byLibrary',   r => libs.includes(r.Proprietario_Nome)          , libs) : clearGlobalFilter('byLibrary');
    auths.length  ? setGlobalFilter('byAuthor',    r => auths.includes(r.Nome_Autor)                , auths): clearGlobalFilter('byAuthor');
    idioma.length ? setGlobalFilter('byIdioma',    r => idioma.includes(r.Idioma)                   , idioma): clearGlobalFilter('byIdioma');
    cats.length   ? setGlobalFilter('byCategory',  r => cats.includes(r.CatLit_Descricao)           , cats) : clearGlobalFilter('byCategory');
    trads.length  ? setGlobalFilter('byTradition', r => trads.includes(r.TradicaoIntelectual_Obra)  , trads): clearGlobalFilter('byTradition');
    gens.length   ? setGlobalFilter('byGenre',     r => gens.includes(r.GenLit_Descricao)           , gens) : clearGlobalFilter('byGenre');
    pers.length ? setGlobalFilter(periodKey,
          r => pers.includes(r.EpocaHistorica_Autor), pers, 'filter-period')
            : clearGlobalFilter(periodKey);
    probOb.length ? setGlobalFilter('byProbObra',  r => probOb.includes(r.ProbAtribObra)            , probOb): clearGlobalFilter('byProbObra');
    probAu.length ? setGlobalFilter('byProbAutor', r => probAu.includes(r.ProbAtribAutor)           , probAu): clearGlobalFilter('byProbAutor');
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
}

// Centralized filtering system
let activeFilters = {};

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
    activeFilters        = {};

    treemapSelection     = null;
    treemapFilterOrigin  = null;
    selectedNodes.clear();
    selectedLinks.clear();
    clickedLinks.clear();
    selectedPeriods      = [];

    notifyFilterChange();
    updateNetworkStyles(null);
}

function updateClearButton() {
    const btn = document.getElementById('clear-btn');
    if (!btn) return;
    const isAny = Object.keys(activeFilters).length > 0;
    btn.classList.toggle('active', isAny);

    const img = btn.querySelector('img');
    if (img) {
      img.src = isAny
        ? '../img/icons/clear-filter-active.png'
        : '../img/icons/clear-filter-inactive.png';
    }
}

function applyFiltersExcept(keysToSkip = []) {
    const skip = new Set(keysToSkip);
    return Object.entries(activeFilters)
                .filter(([k]) => !skip.has(k))
                .reduce((data, [,obj]) => data.filter(obj.fn), globalData);
}


function updateChecklistAvailability () {

    const fullyFilteredRows = applyGlobalFilters(globalData);

    Object.entries(listIdToField).forEach(([listId, field]) => {
        const ul = document.getElementById(listId);
        if (!ul) return;

        const ownFilterKeys = Object.entries(activeFilters)
            .filter(([src,obj]) => (obj.listId ?? sourceToList[src]) === listId)
            .map(([src]) => src);

        const rows = ownFilterKeys.length
            ? applyFiltersExcept(ownFilterKeys)
            : fullyFilteredRows;

        const allowed = new Set(rows.map(r => (r[field] ?? '').toString()));

        ul.querySelectorAll('input').forEach(cb => {
            const selectable = allowed.has(cb.value) || cb.checked;
            cb.disabled = !selectable;
            cb.closest('li').classList.toggle('disabled-option', !selectable);

            if (!selectable)
                cb.parentElement.title =
                  'No books match the current filters';
            else
                cb.parentElement.removeAttribute('title');
        });

        const lis = Array.from(ul.children);
        lis.sort((a,b)=>
            a.classList.contains('disabled-option') -
            b.classList.contains('disabled-option')
        );
        lis.forEach(li => ul.appendChild(li));
    });
}

