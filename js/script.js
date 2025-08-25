let globalData;
let baselineW, baselineH;
let currentTreemapMode = 'category';
let genderGraphActive = false;
let treemapFilterOrigin = null;   // 'category' or 'tradition'
let skipNextTreemapRedraw = false;
const periodOrder = [
  "Indeterminada",
  "Época Arcaica (VIII-V aC)",
  "Antiguidade Clássica (V aC-III)",
  "Antiguidade Tardia (III-VIII)",
  "Alta Idade Média (VIII-XI)",
  "Idade Média Central (XI-XIII)",
  "Baixa Idade Média (XIV-XV)"
];
window.highlightPeriodBar    = () => {};
window.clearPeriodHighlights = () => {};

function showNoResultsPopup(prevSel) {
  pendingUndoNodes = prevSel;
  document.getElementById('no-results-popup').hidden = false;
  document.getElementById('modal-shield' ).hidden = false;
}

function hideNoResultsPopup() {
  pendingUndoNodes = null;
  document.getElementById('no-results-popup').hidden = true;
  document.getElementById('modal-shield' ).hidden = true;
}

window.showNoResultsPopup  = showNoResultsPopup;
window.hideNoResultsPopup  = hideNoResultsPopup;

function getConflictingFilters(rows, skip = []) {
    const ignore = new Set(skip);
    return Object.keys(activeFilters)
        .filter(k => !ignore.has(k))
        .filter(k => rows.every(r => !activeFilters[k].fn(r)));
}

function getConflictingFiltersForPeriod(periodName) {
    const rowsOfPeriod = globalData
        .filter(r => r.EpocaHistorica_Autor === periodName);

    return Object.keys(activeFilters)
     .filter(src => src !== 'period' && src !== 'byPeriod')
     .filter(src => rowsOfPeriod.every(row => !activeFilters[src].fn(row)));
}

function showConflictPopup(subjectLabel, filters, kind = 'library') {
    const prefix = {
        library : 'The library',
        period  : 'The historical period'
    }[kind] || 'The item';

    const msg = document.getElementById('conflict-msg');
    msg.innerHTML =
        `${prefix} “<strong>${subjectLabel}</strong>” has no books that match:` +
        '<br>' +
        filters.map(f => `• ${prettyFilterName(f)}`).join('<br>');

    document.getElementById('conflict-popup').hidden = false;
    document.getElementById('modal-shield' ).hidden = false;
}

function getConflictingFiltersForPeriod(periodName) {
    const rowsOfPeriod = globalData.filter(r =>
        r.EpocaHistorica_Autor === periodName
    );

    return Object.keys(activeFilters)
        .filter(src => src !== 'period' && src !== 'byPeriod')
        .filter(src => {
            const fn = activeFilters[src];
            return rowsOfPeriod.every(row => !fn(row));
        });
}

function hideConflictPopup() {
    pendingNode   = null;
    document.getElementById('conflict-popup').hidden = true;
    document.getElementById('modal-shield' ).hidden = true;
}

window.hideConflictPopup = hideConflictPopup;

function prettyFilterName(src) {
    // helper that turns the internal filter-key into a label
    const map = {
        byCategory : 'Literary category',
        byAuthor   : 'Author',
        byIdioma   : 'Language',
        byLibrary  : 'Library',
        treemap    : "Books' classification",
        network    : 'Library'
    };

    if (src === 'byLibrary' || src === 'network') {
        const libs = activeFilters[src]?.values || [];
        const list = libs.length ? `: ${libs.join(', ')}` : '';
        return `Library${list}`;
   }

    /* add the concrete period(s) that are selected */
    if (src === 'period' || src === 'byPeriod') {
        const labels = Array.from(
        document.querySelectorAll('#period-filter .period-bar.selected .label')
        ).map(el => el.textContent.replace(/\s+/g, ' ').trim());

        const list = labels.length ? `: ${labels.join(', ')}` : '';
        return `Historical period${list}`;
    }

    if (src === 'treemap') {
        if (treemapSelection) {
            if (currentTreemapMode === 'category') {
                const {cat, gen} = treemapSelection;
                return `Books' classification: ${cat}${gen ? ' › ' + gen : ''}`;
            }
            return `Books' classification: ${treemapSelection.trad}`;
        }
        return "Books' classification";
    }

    return map[src] || src;
}


function openModal ()  {
    const modal = document.getElementById('filter-modal');
    modal.classList.add('open');

    rebuildFilterTags();

    modal.querySelectorAll('details[open]').forEach(d => d.open = false);
}

function closeModal () { document.getElementById('filter-modal').classList.remove('open'); }

function updateFilterBadge() {
  const count = Object.keys(activeFilters || {}).length;
  const btn   = document.getElementById('filter-btn');
  const badge = document.getElementById('filter-badge');
  badge.textContent = count > 0 ? count : '';
  btn.classList.toggle('filters-active', count > 0);
}

function treemapFilterActive() {
  return activeFilters && activeFilters.hasOwnProperty('treemap');
}

function updateTreemapBadge() {
  document.querySelectorAll('.mode-button').forEach(btn => {
    const mode   = btn.dataset.mode;
    const show   = treemapFilterActive() && mode === treemapFilterOrigin;
    btn.classList.toggle('has-filter', show);
  });
}

function fillChecklist(listId, values, multi = true) {
    const ul = document.getElementById(listId);
    ul.innerHTML = '';
    values.forEach(v => {
        const id = `${listId}-${CSS.escape(v)}`;
        const li = document.createElement('li');
        li.innerHTML =
        `<label for="${id}">` +
        `<input id="${id}" type="${multi ? 'checkbox' : 'radio'}" value="${v}">` +
        `<span class="chk-txt">${v || '–'}</span>` +
        `</label>`;
        ul.appendChild(li);
    });
}

// how many boxes are checked in a given checklist
function getChecked(listId) {
  return Array.from(
    document.querySelectorAll(`#${listId} input:checked`)
  ).map(c => c.value);
}

function switchMode(mode) {
    currentTreemapMode = mode;

    const filteredData = applyGlobalFilters(globalData);

    createTreemap(
        '#treemap-area',
        filteredData,
        currentTreemapMode,
        updateDashboard,
        genderGraphActive
    );

    d3.selectAll('.mode-button').classed('active', false);
    d3.select(`.mode-button[data-mode="${mode}"]`).classed('active', true);
}

function isFemaleLibrary(rawName) {
  const lower = rawName.trim().toLowerCase();
  return lower.includes('d. leonor') || lower.includes('d. beatriz');
}

// helper to grab unique, non‐empty values for a given key
function uniq(key) {
  return Array.from(
    new Set(globalData.map(d => d[key]).filter(v => v))
  ).sort();
}

function populateFilterOptions() {
  // distinct & sorted helpers
  const u = key => Array.from(new Set(globalData.map(d=>d[key]).filter(Boolean))).sort();

  fillChecklist('filter-library',   u('Proprietario_Nome'));
  fillChecklist('filter-author',    u('Nome_Autor'));
  fillChecklist('filter-idioma',    u('Idioma'));
  fillChecklist('filter-category',  u('CatLit_Descricao'));
  fillChecklist('filter-tradition', u('TradicaoIntelectual_Obra'));
  fillChecklist('filter-genre',     u('GenLit_Descricao'));

  const periods = periodOrder.filter(p=>globalData.some(d=>d.EpocaHistorica_Autor===p));
  fillChecklist('filter-period', periods);

  fillChecklist('filter-probobra',  u('ProbAtribObra'));
  fillChecklist('filter-probautor', u('ProbAtribAutor'));
}

function rebuildFilterTags () {

    const tagsBox = document.getElementById('filter-tags');
    tagsBox.innerHTML = '';

    function addTag(label, removeFn) {
        const box = document.getElementById('filter-tags');
        if ([...box.children].some(t => t.firstChild.nodeValue.trim() === label))
            return;

        const tag  = document.createElement('div');
        tag.className = 'filter-tag';
        tag.textContent = label;

        const x = document.createElement('span');
        x.className = 'remove';
        x.textContent = '×';
        x.addEventListener('click', removeFn);
        tag.appendChild(x);

        tagsBox.appendChild(tag);
    }

    let periodTagAdded = false;
    for (const key of Object.keys(activeFilters)) {

        switch (key){

        case 'byLibrary'  : getChecked('filter-library'  )
                            .forEach(v => addTag(v, () => {
                                uncheckValue('filter-library', v);
                                clearGlobalFilter('byLibrary');
                            }));
                            break;

        case 'byAuthor'   : getChecked('filter-author'   )
                            .forEach(v => addTag(v, () => {
                                uncheckValue('filter-author', v);
                                clearGlobalFilter('byAuthor');
                            }));
                            break;

        case 'byIdioma'   : getChecked('filter-idioma'   )
                            .forEach(v => addTag(v, () => {
                                uncheckValue('filter-idioma', v);
                                clearGlobalFilter('byIdioma');
                            }));
                            break;

        case 'byCategory' : getChecked('filter-category' )
                            .forEach(v => addTag(v, () => {
                                uncheckValue('filter-category', v);
                                clearGlobalFilter('byCategory');
                            }));
                            break;

        case 'byTradition': getChecked('filter-tradition')
                            .forEach(v => addTag(v, () => {
                                uncheckValue('filter-tradition', v);
                                clearGlobalFilter('byTradition');
                            }));
                            break;

        case 'byGenre'    : getChecked('filter-genre'    )
                            .forEach(v => addTag(v, () => {
                                uncheckValue('filter-genre', v);
                                clearGlobalFilter('byGenre');
                            }));
                            break;

        case 'byPeriod' :
        case 'period'  :

            if (periodTagAdded) break;
            periodTagAdded = true;
            selectedPeriods.forEach(p => addTag(p, () => {
                selectedPeriods = [];
                d3.selectAll('#period-filter .period-bar').classed('selected', false);
                clearGlobalFilter('period');
                clearGlobalFilter('byPeriod');
            }));
            break;

        case 'treemap' :
            if (treemapSelection){
                const tagLabel = currentTreemapMode === 'category'
                    ? ( treemapSelection.gen
                            ? `${treemapSelection.cat} › ${treemapSelection.gen}`
                            : treemapSelection.cat )
                    : treemapSelection.trad;

                addTag(tagLabel, () => {
                    treemapSelection   = null;
                    treemapFilterOrigin = null;
                    clearGlobalFilter('treemap');
                    createTreemap('#treemap-area',
                                    applyGlobalFilters(globalData),
                                    currentTreemapMode,
                                    updateDashboard,
                                    genderGraphActive);
                    updateTreemapBadge();
                });
            } else addTag('Treemap', () => {
                clearGlobalFilter('treemap');
            });
            break;

        case 'network' :
            (activeFilters.network?.values || ['Network selection']).forEach(lib => {
                addTag(lib, () => {
                    selectedNodes.clear();
                    selectedLinks.clear();
                    clickedLinks.clear();
                    clearGlobalFilter('network');
                    updateNetworkStyles(null);
                });
            });
            break;

        case 'byProbObra' :
            getChecked('filter-probobra').forEach(v=>addTag(`Prob. Obra: ${v}`, ()=>{
                uncheckValue('filter-probobra', v);
                clearGlobalFilter('byProbObra');
            }));
            break;

        case 'byProbAutor':
            getChecked('filter-probautor').forEach(v=>addTag(`Prob. Autor: ${v}`, ()=>{
                uncheckValue('filter-probautor', v);
                clearGlobalFilter('byProbAutor');
            }));
            break;

        default:
            addTag(key, () => clearGlobalFilter(key));
        }
  }
}

window.refreshFilterTags = rebuildFilterTags;
const refreshFilterTags  = rebuildFilterTags;

function uncheckValue(listId, value){
    document
        .querySelectorAll(`#${listId} input[value="${CSS.escape(value)}"]`)
        .forEach(cb => cb.checked = false);
    bumpCounter(document.getElementById(listId));
}

function wireSearch(inputEl, listEl) {
  inputEl.addEventListener('input', () => {
    const term = inputEl.value.trim().toLowerCase();
    listEl.querySelectorAll('li').forEach(li => {
      const txt = li.textContent.toLowerCase();
      li.style.display = term && !txt.includes(term) ? 'none' : '';
    });
  });
}

// update the (n) counter inside each <summary>
function bumpCounter(list) {
  const n = list.querySelectorAll('input:checked').length;
  const id = list.id;
  const counter = list.closest('details')
                     .querySelector(`[data-for="${id}"]`);
  if (counter) counter.textContent = n ? `(${n})` : '';
}

document.addEventListener('DOMContentLoaded', () => {
    // hook every checklist once the DOM exists
    document.querySelectorAll('.checklist').forEach(list => {
        list.addEventListener('change', () => {
            commitChecklistFilters();
            bumpCounter(list);
            refreshFilterTags();
            updateFilterBadge();
        });
    });

    document.getElementById('conflict-keep-btn')
          .addEventListener('click', hideConflictPopup);

    document.getElementById('conflict-clear-btn')
        .addEventListener('click', () => {
            document.getElementById('clear-btn').click();
            hideConflictPopup();
        });

    document.getElementById('undo-last-btn')
        .addEventListener('click', ()=> {
            if (!pendingUndoNodes) return;
            // restore previous node selection
            selectedNodes.clear();
            pendingUndoNodes.forEach(n=>selectedNodes.add(n));
            selectedPeriods = Array.from(pendingUndoNodes);
            repaintPeriodBars(applyFiltersExcept(['period','byPeriod']));

            hideNoResultsPopup();

            svg.classed('node-active-mode', true);
            nodeGroup.selectAll('g.node')
                    .classed('active', d => selectedNodes.has(d.id));

            applyNetworkFilter(
                buildAllowedFromSelection(selectedNodes, selectedLinks),
                globalData
            );
        });

    document.getElementById('clear-filters-btn')
        .addEventListener('click', ()=> {
            document.getElementById('clear-btn').click();
            hideNoResultsPopup();
        });

});

function redrawVisualisation(vizEl){
    switch (vizEl.id){
        case 'map-visualization':
            makeMap();
            updateDashboard();
            break;
        case 'network-graph':
            const cont = '#network-graph .network-wrapper';

            if (genderGraphActive) {
                createGenderGraph(cont, globalData);
            } else {
                createNetworkGraph(cont, globalData);
            }

            const allowedSet = new Set(
                applyGlobalFilters(globalData)
                    .map(r => r.Proprietario_Nome.trim())
            );

            updateNetworkStyles(allowedSet);
            break;
        case 'treemap':
            createTreemap(
                '#treemap-area',
                applyGlobalFilters(globalData),
                currentTreemapMode,
                updateDashboard,
                genderGraphActive
            );
            break;
        case 'catalog':
            createBooksCatalog(applyGlobalFilters(globalData));
            break;
        default:
    }
}

function redrawAllViz () {
    makeMap();
    createTreemap(
        '#treemap-area',
        applyGlobalFilters(globalData),
        currentTreemapMode,
        updateDashboard,
        genderGraphActive
    );
}

function enableVizExpand() {
    document.querySelectorAll('.visualization').forEach(viz=>{
        if (viz.querySelector('.expand-btn')) return;

        const btn = document.createElement('button');
        btn.className = 'expand-btn';
        btn.setAttribute('aria-label', 'Maximize');
        btn.innerHTML = '<img src="../img/icons/maximize.png" alt="" aria-hidden="true">';
        (viz.querySelector('.viz-actions')
            || viz).appendChild(btn);

        btn.addEventListener('click', e=> {
            e.stopPropagation();
            viz.classList.contains('is-expanded')
                ? closeVizModal(viz.__modal, viz)
                : openVizModal(viz);
        });
  });
}

function openVizModal(viz) {
    const modal  = document.createElement('div');
    modal.className = 'viz-modal';
    modal.innerHTML = '<div class="viz-panel"></div>';
    const panel = modal.firstElementChild;

    const ph = document.createElement('div');
    ph.className = 'viz-placeholder';
    viz.__placeholder = ph;
    viz.parentNode.insertBefore(ph, viz);   // occupy the cell

    viz.__origParent = viz.parentNode;
    viz.__origNext   = viz.nextSibling;
    viz.__modal      = modal;
    viz.classList.add('is-expanded');
    panel.appendChild(viz);

    const btn = viz.querySelector('.expand-btn');
    btn.querySelector('img').src = '../img/icons/minimize.png';
    btn.setAttribute('aria-label', 'Restore');

    modal.addEventListener('click', e=>{
        if (e.target === modal) closeVizModal(modal, viz);
    });

    document.body.appendChild(modal);
    requestAnimationFrame(()=>{
        redrawVisualisation(viz);
    });
}

function closeVizModal(modal, viz) {
    const {__origParent:p, __origNext:n} = viz;
    n ? p.insertBefore(viz,n) : p.appendChild(viz);
    viz.classList.remove('is-expanded');
    const btn = viz.querySelector('.expand-btn');
    btn.querySelector('img').src = '../img/icons/maximize.png';
    btn.setAttribute('aria-label', 'Maximize');
    if (viz.__placeholder){
        viz.__placeholder.remove();
        delete viz.__placeholder;
    }
    modal.remove();
    requestAnimationFrame(()=>{
        redrawVisualisation(viz);
    });
}

function startDashboard() {
    clearDetailsPanel();
    document.getElementById("search-input").value = "";

    d3.csv("data/dataset.csv")
        .then((data) => {
            globalData = data;
            const filteredData = applyGlobalFilters(globalData);
            updateTreemapBadge();

            populateFilterOptions();

            wireSearch(
                document.querySelector('#filter-author').previousElementSibling,
                document.getElementById('filter-author')
            );
            wireSearch(
                document.querySelector('#filter-tradition').previousElementSibling,
                document.getElementById('filter-tradition')
            );
            wireSearch(
                document.querySelector('#filter-genre').previousElementSibling,
                document.getElementById('filter-genre')
            );

            let currentData = [...globalData];
            const initialSortColumn = "Proprietario_Nome";
            let sortedData = [...currentData].sort((a, b) =>
                a[initialSortColumn].localeCompare(b[initialSortColumn])
            );

            makeMap();

            createBooksCatalog(sortedData);
            setupSearchBar(globalData);
            setupSorting(sortedData, initialSortColumn);

            createNetworkGraph('#network-graph .network-wrapper', globalData);

            const toggle = document.querySelector('.switch');
            if (toggle) {
                toggle.addEventListener('click', () => {
                    const isOn = toggle.getAttribute('aria-pressed') === 'true';
                    toggle.setAttribute('aria-pressed', isOn ? 'false' : 'true');

                    selectedNodes.clear();
                    clickedLinks.clear();
                    selectedLinks.clear();
                    currentCarouselLibs = [];
                    currentIndex = 0;
                    renderCarousel();
                    clearDetailsPanel();
                    svg.classed('node-active-mode', false);
                    nodeGroup.selectAll('g.node').classed('active', false).classed('selected-by-link', false);
                    linkGroup.selectAll('.link').classed('active', false).style('opacity', null);

                    if (!isOn) {
                        genderGraphActive = true;
                        createGenderGraph('#network-graph .network-wrapper', globalData);
                    } else {
                        genderGraphActive = false;
                        createNetworkGraph('#network-graph .network-wrapper', globalData);
                    }

                    const filtered = applyGlobalFilters(globalData);
                    createBooksCatalog(filtered);
                    createTreemap(
                        '#treemap-area',
                        filteredData,
                        currentTreemapMode,
                        updateDashboard,
                        genderGraphActive
                    );
                });
                toggle.addEventListener('keydown', e => {
                    if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        toggle.click();
                    }
                });
            }

            createTreemap(
                '#treemap-area',
                filteredData,
                currentTreemapMode,
                updateDashboard,
                genderGraphActive
            );

            d3.selectAll('.mode-button')
                .on('click', function() {
                    const mode = this.getAttribute('data-mode');
                    switchMode(mode);
                    updateTreemapBadge();
                });

            const filterBtn  = document.getElementById('filter-btn');
            const badge      = document.getElementById('filter-badge');

            const clearBtn = document.getElementById('clear-btn');
            clearBtn.addEventListener('click', () => {
                if (!clearBtn.classList.contains('active')) return;
                Object.keys(activeFilters).forEach(src => clearGlobalFilter(src));

                treemapFilterOrigin = null;
                updateTreemapBadge();

                updateClearButton();
                document.getElementById('search-input').value = '';

                selectedPeriods = [];
                d3.selectAll('#period-filter .period-bar')
                    .classed('selected', false);

                updateDashboard();

                selectedNodes.clear();
                clickedLinks.clear();
                selectedLinks.clear();
                svg.classed('node-active-mode', false);
                nodeGroup.selectAll('g.node')
                    .classed('active', false)
                    .classed('selected-by-link', false);
                linkGroup.selectAll('.link')
                    .classed('active', false)
                    .style('opacity', null);

                const cleanData = applyGlobalFilters(globalData);
                const networkContainer = '#network-graph .network-wrapper';
                if (genderGraphActive) {
                    createGenderGraph(networkContainer, globalData);
                } else {
                    createNetworkGraph(networkContainer, globalData);
                }
                createTreemap(
                    '#treemap-area',
                    filteredData,
                    currentTreemapMode,
                    updateDashboard,
                    genderGraphActive
                );
                createBooksCatalog(cleanData);

                currentCarouselLibs = [];
                currentIndex = 0;
                renderCarousel();
                clearDetailsPanel();

                updateFilterBadge();

                document.querySelectorAll('.checklist input:checked')
                    .forEach(cb => cb.checked = false);
                document.querySelectorAll('.checklist')
                    .forEach(list => bumpCounter(list));

                refreshFilterTags();
                hideNoResultsPopup();
            });

            const modal      = document.getElementById('filter-modal');

            filterBtn.addEventListener('click', openModal);
            document.getElementById('close-modal').addEventListener('click', closeModal);

            document.getElementById('clear-modal-filters')
                .addEventListener('click', () => {
                    clearAllFilters();

                    document.querySelectorAll('.checklist input')
                            .forEach(cb => cb.checked = false);
                    document.querySelectorAll('.checklist')
                            .forEach(list => bumpCounter(list));

                    updateTreemapBadge();
                    rebuildFilterTags();
                    updateDashboard();
            });

            if (!document.querySelector('#filter-category input:checked, #filter-genre input:checked, #filter-tradition input:checked')) {
                clearGlobalFilter('treemap');
                treemapFilterOrigin = null;
                updateTreemapBadge();
            }


            document.getElementById('filter-modal')
                .addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });

            enableVizExpand();
        })
        .catch((error) => {
            console.error("Error loading the CSV file:", error);
        });
}
