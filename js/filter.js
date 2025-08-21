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


function notifyFilterChange () {
    updateClearButton();
    updateFilterBadge();
    document.querySelectorAll('.checklist').forEach(bumpCounter);

    syncPeriodChecklist();
    syncModalLists();
    rebuildFilterTags();
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