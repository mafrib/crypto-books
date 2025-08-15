function filterBooks(data, query) {
    const q = query.toLowerCase();
    return data.filter(book =>
      book.Obra.toLowerCase().includes(q) ||
      book.Nome_Autor.toLowerCase().includes(q) ||
      book.Proprietario_Nome.toLowerCase().includes(q)
    );
  }

// Centralized filtering system
let activeFilters = {};

function applyGlobalFilters(rawData) {
  return Object.values(activeFilters).reduce(
    (data, filterFn) => data.filter(filterFn),
    rawData
  );
}

function setGlobalFilter(source, filterFn) {
  activeFilters[source] = filterFn;
  updateClearButton();
}

function clearGlobalFilter(source) {
  delete activeFilters[source];
  if (source === 'treemap') treemapSelection = null;
  updateClearButton();
}

function clearAllFilters() {
  activeFilters = {};
  updateClearButton();
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
                .reduce((data, [,fn]) => data.filter(fn), globalData);
}