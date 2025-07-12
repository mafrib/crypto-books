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
        .classed("male",   d => genderGraphActive && !isFemaleLibrary(d.Proprietario_Nome))
        .classed("female", d => genderGraphActive &&  isFemaleLibrary(d.Proprietario_Nome))
        .select(".obra").text(d => d.Obra);

    newEntries.merge(entries).select(".descricao").text(d => d.Descricao);
    newEntries.merge(entries).select(".autor").text(d => d.Nome_Autor);
    newEntries.merge(entries).select(".livraria").text(d => d.Proprietario_Nome);

    newEntries
      .on('mouseover', (event, d) => {
        // highlight the entry
        d3.select(event.currentTarget)
          .classed('hovered-entry', true);

        window.highlightMapPoint(d);
        window.highlightNetworkNode(d.Proprietario_Nome);
        window.highlightTreemapRect(d);
        window.highlightPeriodBar(d);
      })
      .on('mouseout', (event, d) => {
        d3.select(event.currentTarget)
          .classed('hovered-entry', false);

        window.clearMapHighlights();
        window.clearNetworkHighlights();
        window.clearTreemapHighlights();
        window.clearPeriodHighlights();
      });

    // Update existing entries (if needed)
    entries.select(".obra").text(d => d.Obra);
    entries.select(".autor").text(d => d.Nome_Autor);
    entries.select(".livraria").text(d => d.Proprietario_Nome);

    const countDisplay = d3.select("#book-count")
        .text(`${data.length} book${data.length !== 1 ? 's' : ''} found`);

}

function setupSearchBar(rawData) {
  const input = document.getElementById("search-input");

  input.addEventListener("input", () => {
    const query = input.value;

    // Update search filter
    if (query) {
      setGlobalFilter('search', (book) =>
        book.Obra.toLowerCase().includes(query.toLowerCase()) ||
        book.Nome_Autor.toLowerCase().includes(query.toLowerCase()) ||
        book.Proprietario_Nome.toLowerCase().includes(query.toLowerCase())
      );
    } else {
      clearGlobalFilter('search');
    }

    // TO DO: highlight occurences in other idioms during search
    const filteredData = applyGlobalFilters(rawData);
    createBooksCatalog(filteredData);
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
