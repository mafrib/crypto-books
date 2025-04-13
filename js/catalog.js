function createBooksCatalog(data) {

    const entries = d3.select("#catalog-entries")
        .selectAll(".catalog-entry")
        .data(data);

    // Remove entries not in the filtered set
    entries.exit().remove();

    // Enter new entries
    const newEntries = entries.enter()
        .append("div")
        .classed("catalog-entry", true);

    newEntries.append("div")
        .classed("obra", true)
        .text(d => d.Obra);

    newEntries.append("div")
        .classed("autor", true)
        .text(d => d.Nome_Autor);

    newEntries.append("div")
        .classed("livraria", true)
        .text(d => d.Livraria);
  
/*to do: se tiver mais de 21, colocar reticencias nos seguintes caracteres */
  
    // Update existing entries (if needed)
    entries.select(".obra").text(d => d.Obra);
    entries.select(".autor").text(d => d.Nome_Autor);
    entries.select(".livraria").text(d => d.Livraria);

    const countDisplay = d3.select("#book-count")
        .text(`${data.length} book${data.length !== 1 ? 's' : ''} found`);

}

function setupSearchBar(data) {
    const input = document.getElementById("search-input");
  
    input.addEventListener("input", () => {
      const filtered = filterBooks(data, input.value);
      createBooksCatalog(filtered);
    });
}

let currentSort = {
    column: null,
    ascending: true
  };
  
function setupSorting(data, defaultColumn = null) {
    const headers = document.querySelectorAll(".sortable");
  
    // If there's a default column, show the up arrow
    if (defaultColumn) {
      currentSort.column = defaultColumn;
      currentSort.ascending = true;
  
      const defaultHeader = document.querySelector(
        `.sortable[data-column="${defaultColumn}"]`
      );
      if (defaultHeader) {
        const defaultIcon = defaultHeader.querySelector(".sort-icon");
        if (defaultIcon) {
          defaultIcon.src = "icons/sort-up.png";
        }
      }
    }
  
    headers.forEach(header => {
      const icon = header.querySelector(".sort-icon");
  
      header.addEventListener("click", () => {
        const column = header.getAttribute("data-column");
  
        if (currentSort.column === column) {
          currentSort.ascending = !currentSort.ascending;
        } else {
          currentSort.column = column;
          currentSort.ascending = true;
        }
  
        const sorted = [...data].sort((a, b) => {
          const aVal = a[column].toLowerCase();
          const bVal = b[column].toLowerCase();
  
          return currentSort.ascending
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        });
  
        // Reset all icons to neutral
        document.querySelectorAll(".sort-icon").forEach(i => {
          i.src = "icons/sort-neutral.png";
        });
  
        // Set current icon to up/down
        icon.src = currentSort.ascending
          ? "icons/sort-up.png"
          : "icons/sort-down.png";
  
        createBooksCatalog(sorted);
      });
    });
  }
  
  

