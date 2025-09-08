let currentSort = {
  column: null,
  ascending: true
};

function createBooksCatalog(data) {

    const entries = d3.select("#catalog-entries")
        .selectAll(".catalog-entry")
        .data(data, d => d.id || d.__index__);

    // Remove entries not in the filtered set
    entries.exit().remove();

    // Enter new entries
    const newEntries = entries.enter()
        .append("div")
        .classed("catalog-entry", true);

    newEntries.append("div")
        .classed("descricao", true)
        .text(d => d.Descricao);

    newEntries.append("div")
        .classed("obra", true)
        .text(d => d.Obra);

    newEntries.append("div")
        .classed("autor", true)
        .text(d => d.Nome_Autor);

    newEntries.append("div")
        .classed("livraria", true)
        .text(d => d.Proprietario_Nome);

    newEntries.merge(entries)
        .select(".obra").text(d => d.Obra);

    newEntries.merge(entries).select(".descricao").text(d => d.Descricao);
    newEntries.merge(entries).select(".autor").text(d => d.Nome_Autor);
    newEntries.merge(entries).select(".livraria").text(d => d.Proprietario_Nome);

    const allEntries = newEntries.merge(entries);

    allEntries
      .on('mouseover', (event, d) => {
          if (window.getPinnedBook && window.getPinnedBook()) return;
          d3.select(event.currentTarget).classed('hovered-entry', true);

          const missing =
            isNaN(window.parseDMS(d.Latitude_Autor)) ||
            isNaN(window.parseDMS(d.Longitude_Autor));

          window.showNoLocationOverlay(missing);
          window.highlightMapPoint(d);
          window.highlightNetworkNode(d.Proprietario_Nome);
          window.highlightTreemapRect(d);
          window.highlightPeriodBar(d);
      })
      .on('mouseout', (event, d) => {
          d3.select(event.currentTarget).classed('hovered-entry', false);

          if (window.getPinnedBook && window.getPinnedBook()) return;

          window.showNoLocationOverlay(false);
          window.clearMapHighlights && window.clearMapHighlights();
          window.clearNetworkHighlights && window.clearNetworkHighlights();
          window.clearTreemapHighlights && window.clearTreemapHighlights();
          window.clearPeriodHighlights && window.clearPeriodHighlights();
        })
      .on('click', (event, d) => {
          const cur = window.getPinnedBook ? window.getPinnedBook() : null;
          if (cur === d) {
              window.unpinBook && window.unpinBook();
              d3.select(event.currentTarget).classed('pinned', false);
          } else {
              window.pinBook && window.pinBook(d);

              d3.selectAll('#catalog-entries .catalog-entry')
                .classed('pinned', false)
                .classed('hovered-entry', false);

              d3.select(event.currentTarget).classed('pinned', true);
          }
        });

      allEntries.classed('pinned', d => (window.getPinnedBook && window.getPinnedBook() === d));

      // Update existing entries (if needed)
      entries.select(".obra").text(d => d.Obra);
      entries.select(".autor").text(d => d.Nome_Autor);
      entries.select(".livraria").text(d => d.Proprietario_Nome);

      const countDisplay = d3.select("#book-count")
          .text(`${data.length} book${data.length !== 1 ? 's' : ''} found`);
}

function normalizeText(text) {
  return text
    .normalize("NFD") // normalize accents
    .replace(/\p{Diacritic}/gu, "") // remove accents
    .toLowerCase();
}

function itemMatchesAllTerms(item, terms) {
  const fields = [
    item.Descricao,
    item.Obra,
    item.Nome_Autor,
    item.Proprietario_Nome
  ].map(field => normalizeText(field));

  return terms.every(term => {
    return fields.some(field => {
      return field
        .split(/\s+/)
        .some(word => {
          const cleanedWord = word.replace(/^[^\p{L}\p{N}]+/gu, ""); // remove leading non-letters/numbers
          return cleanedWord.startsWith(term);
        });
    });
  });
}

function setupSearchBar(rawData) {
  const input = document.getElementById("search-input");

  input.addEventListener("input", () => {
    const query = input.value.trim();
    if (!query) {
      createBooksCatalog(rawData);
      return;
    }

    const terms = query
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .split(/\s+/)
      .filter(t => t);

    const results = rawData.filter(item => itemMatchesAllTerms(item, terms));

    createBooksCatalog(results);
  });
}

function setupSorting(rawData, defaultColumn = null) {
  const headers = document.querySelectorAll(".sortable");

  // Initialize default sort column and icon
  if (defaultColumn) {
    currentSort.column = defaultColumn;
    currentSort.ascending = true;
    const defaultHeader = document.querySelector(`.sortable[data-column="${defaultColumn}"]`);
    const defaultIcon = defaultHeader && defaultHeader.querySelector(".sort-icon");
    if (defaultIcon) {
      defaultIcon.src = "img/icons/sort-up.png";
    }
  }

  headers.forEach(header => {
    const icon = header.querySelector(".sort-icon");
    header.addEventListener("click", () => {
      const column = header.getAttribute("data-column");

      // Toggle direction if same column, otherwise reset to ascending
      if (currentSort.column === column) {
        currentSort.ascending = !currentSort.ascending;
      } else {
        currentSort.column = column;
        currentSort.ascending = true;
      }

      const filtered = applyGlobalFilters(rawData);

      const sorted = [...filtered].sort((a, b) => {
        const aVal = a[column].toLowerCase();
        const bVal = b[column].toLowerCase();
        return currentSort.ascending
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      });

      // Reset all icons, then set this one to up/down
      document.querySelectorAll(".sort-icon")
        .forEach(i => i.src = "img/icons/sort-neutral.png");
      icon.src = currentSort.ascending
        ? "img/icons/sort-up.png"
        : "img/icons/sort-down.png";

      createBooksCatalog(sorted);
    });
  });
}
