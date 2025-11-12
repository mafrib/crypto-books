window.i18n = window.i18n || {
  t: k => k,
  plural: (n, one, many) => (n === 1 ? one : many),
  apply: () => {}
};

let currentSort = {
    column: null,
    ascending: true
};

function updateBookCountLabel() {
    const n = document.querySelectorAll('#catalog-entries .catalog-entry').length;
    const word = i18n.plural(n, i18n.t('unit.book.one'), i18n.t('unit.book.many'));
    d3.select('#book-count').text(`${n} ${word} ${i18n.t('catalog.results.found')}`);
}
window.updateBookCountLabel = updateBookCountLabel;

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
        // If a book is pinned, keep its period highlight – do not change it.
        if (window.getPinnedBook && window.getPinnedBook()) return;

        d3.select(event.currentTarget).classed('hovered-entry', true);

        const missing =
          isNaN(window.parseDMS(d.Latitude_Autor)) ||
          isNaN(window.parseDMS(d.Longitude_Autor));

        window.showNoLocationOverlay(missing);
        window.highlightMapPoint && window.highlightMapPoint(d);
        window.highlightNetworkNode && window.highlightNetworkNode(d.Proprietario_Nome);
        window.highlightTreemapRect && window.highlightTreemapRect(d);
        window.highlightPeriodBar && window.highlightPeriodBar(d);
      })
      .on('mouseout', (event, d) => {
        d3.select(event.currentTarget).classed('hovered-entry', false);

        // If a book is pinned, keep the highlight
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
          // Unpin
          window.unpinBook && window.unpinBook();
          d3.select(event.currentTarget).classed('pinned', false);
          window.showNoLocationOverlay && window.showNoLocationOverlay(false);

          // Now clear the period highlight
          window.clearPeriodHighlights && window.clearPeriodHighlights();
        } else {
          // Pin
          window.pinBook && window.pinBook(d);
          reapplyPinnedHighlights();

          d3.selectAll('#catalog-entries .catalog-entry')
            .classed('pinned', false)
            .classed('hovered-entry', false);

          d3.select(event.currentTarget).classed('pinned', true);

          // Ensure the red stroke is visible for the pinned book's period
          window.highlightPeriodBar && window.highlightPeriodBar(d);
        }
        if (window.updateClearButton) window.updateClearButton();
      });

      allEntries.classed('pinned', d => (window.getPinnedBook && window.getPinnedBook() === d));

      // Update existing entries (if needed)
      entries.select(".obra").text(d => d.Obra);
      entries.select(".autor").text(d => d.Nome_Autor);
      entries.select(".livraria").text(d => d.Proprietario_Nome);

      updateBookCountLabel();

      const n = data.length;
      const bookWord = i18n.plural(n, i18n.t('unit.book.one'), i18n.t('unit.book.many'));
      d3.select("#book-count").text(`${n} ${bookWord} ${i18n.t('catalog.results.found')}`);
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
            const cleanedWord = word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
            return cleanedWord.startsWith(term);
          });
      });
    });
}

function setupSearchBar(rawData) {
    const input  = document.getElementById("search-input");
    const clearX = document.getElementById("search-clear-btn");

    input.addEventListener("input", () => {
      const query = input.value.trim();
      if (!query) {
        const base = applyGlobalFilters(rawData);
        createBooksCatalog(base);
        window.clearSearchFocus && window.clearSearchFocus();
        window.updateUnlocatedBadge && window.updateUnlocatedBadge(base);

        if (clearX) clearX.classList.remove('visible');
        updateClearButton();
        return;
      }

      const terms = query
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .split(/\s+/)
        .map(t => t.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""))
        .filter(t => t);

      const base    = applyGlobalFilters(rawData);
      const results = base.filter(item => itemMatchesAllTerms(item, terms));

      createBooksCatalog(results);
      window.applySearchFocus && window.applySearchFocus(results);
      window.updateUnlocatedBadge && window.updateUnlocatedBadge(base);

      if (clearX) clearX.classList.add('visible');
      updateClearButton();
    });

    if (clearX) {
      clearX.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!input.value) return;
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.focus();
      });
    }

    if (clearX) clearX.classList.toggle('visible', !!input.value.trim());
    updateClearButton();
}

function setupSorting(rawData, defaultColumn = null) {
    const headers = document.querySelectorAll(".sortable");

    if (defaultColumn) {
      currentSort.column = defaultColumn;
      currentSort.ascending = true;
      const defaultHeader = document.querySelector(`.sortable[data-column="${defaultColumn}"]`);
      const defaultIcon = defaultHeader && defaultHeader.querySelector(".sort-icon");
      if (defaultIcon) defaultIcon.src = "img/icons/sort-up.png";
    }

    headers.forEach(header => {
      const icon = header.querySelector(".sort-icon");
      header.addEventListener("click", (e) => {
        const t = e.target;
        if (t && t.closest && t.closest('.header-info')) return; // ignore clicks on the info button

        const column = header.getAttribute("data-column");

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
          return currentSort.ascending ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        });

        document.querySelectorAll(".sort-icon")
          .forEach(i => i.src = "img/icons/sort-neutral.png");
        icon.src = currentSort.ascending ? "img/icons/sort-up.png" : "img/icons/sort-down.png";

        createBooksCatalog(sorted);
      });
    });

    document.querySelectorAll('.header-info').forEach(btn => {
      btn.addEventListener('click', (e) => e.stopPropagation());
    });
}

