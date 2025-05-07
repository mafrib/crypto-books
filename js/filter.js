function filterBooks(data, query) {
    const q = query.toLowerCase();
    return data.filter(book =>
      book.Obra.toLowerCase().includes(q) ||
      book.Nome_Autor.toLowerCase().includes(q) ||
      book.Livraria.toLowerCase().includes(q)
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
}

function clearGlobalFilter(source) {
  delete activeFilters[source];
}