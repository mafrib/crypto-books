let globalData;
let baselineW, baselineH;
let currentTreemapMode = 'category';
let genderGraphActive = false;
let treemapFilterOrigin = null;   // 'category' or 'tradition'
const periodOrder = [
  "Indeterminada",
  "Época Arcaica (VIII-V aC)",
  "Antiguidade Clássica (V aC-III)",
  "Antiguidade Tardia (III-VIII)",
  "Alta Idade Média (VIII-XI)",
  "Idade Média Central (XI-XIII)",
  "Baixa Idade Média (XIV-XV)"
];

function openModal ()  {
    const modal = document.getElementById('filter-modal');
    modal.classList.add('open');

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

  // single-choice radio lists
  fillChecklist('filter-probobra',  u('ProbAtribObra'));
  fillChecklist('filter-probautor', u('ProbAtribAutor'));
}

function refreshFilterTags() {
    const tags = document.getElementById('filter-tags');
    tags.innerHTML = '';

    Object.keys(activeFilters).forEach(key => {
        const map = {
            byLibrary:'filter-library', byAuthor:'filter-author',
            byIdioma:'filter-idioma',   byCategory:'filter-category',
            byTradition:'filter-tradition', byGenre:'filter-genre',
            byPeriod:'filter-period',  byProbObra:'filter-probobra',
            byProbAutor:'filter-probautor'
        };
        const listId = map[key];
        if (!listId) return;

        const values = getChecked(listId);
        values.forEach(v => {
            const tag = document.createElement('div');
            tag.className = 'filter-tag';
            tag.textContent = v;

            const x = document.createElement('span');
            x.className = 'remove';
            x.textContent = '×';
            x.addEventListener('click', () => {
                document.querySelectorAll(`#${listId} input[value="${CSS.escape(v)}"]`)
                    .forEach(cb => { cb.checked = false; });
                bumpCounter(document.getElementById(listId));
                refreshFilterTags();
            });
            tag.appendChild(x);
            tags.appendChild(tag);
        });
    });
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

// hook every checklist once the DOM exists
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.checklist').forEach(list => {
    list.addEventListener('change', () => {
        bumpCounter(list);
        refreshFilterTags();
        updateFilterBadge();
    });
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
        viz.appendChild(btn);

        btn.addEventListener('click', e=>{
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
            });

            const modal      = document.getElementById('filter-modal');
            const applyBtn   = document.getElementById('apply-filters');

            filterBtn.addEventListener('click', openModal);
            document.getElementById('close-modal').addEventListener('click', closeModal);

            document.getElementById('clear-modal-filters')
                .addEventListener('click', () => {
                document.querySelectorAll('.checklist input:checked')
                        .forEach(cb => cb.checked = false);
                document.querySelectorAll('.checklist')
                        .forEach(list => bumpCounter(list));
                document.getElementById('filter-tags').innerHTML = '';
                refreshFilterTags();
            });

            applyBtn.addEventListener('click', () => {
                const libs    = getChecked('filter-library');
                const auths   = getChecked('filter-author');
                const idioma  = getChecked('filter-idioma');
                const cats    = getChecked('filter-category');
                const trads   = getChecked('filter-tradition');
                const gens    = getChecked('filter-genre');
                const pers    = getChecked('filter-period');
                const probOb  = getChecked('filter-probobra');
                const probAu  = getChecked('filter-probautor');

                libs.length   ? setGlobalFilter('byLibrary',   r => libs.includes(r.Proprietario_Nome))
                                : clearGlobalFilter('byLibrary');
                auths.length  ? setGlobalFilter('byAuthor',    r => auths.includes(r.Nome_Autor))
                                : clearGlobalFilter('byAuthor');
                idioma.length ? setGlobalFilter('byIdioma',    r => idioma.includes(r.Idioma))
                                : clearGlobalFilter('byIdioma');
                cats.length   ? setGlobalFilter('byCategory',  r => cats.includes(r.CatLit_Descricao))
                                : clearGlobalFilter('byCategory');
                trads.length  ? setGlobalFilter('byTradition', r => trads.includes(r.TradicaoIntelectual_Obra))
                                : clearGlobalFilter('byTradition');
                gens.length   ? setGlobalFilter('byGenre',     r => gens.includes(r.GenLit_Descricao))
                                : clearGlobalFilter('byGenre');
                pers.length   ? setGlobalFilter('byPeriod',    r => pers.includes(r.EpocaHistorica_Autor))
                                : clearGlobalFilter('byPeriod');

                probOb.length ? setGlobalFilter('byProbObra',  r => probOb.includes(r.ProbAtribObra))
                    : clearGlobalFilter('byProbObra');

                probAu.length ? setGlobalFilter('byProbAutor', r => probAu.includes(r.ProbAtribAutor))
                    : clearGlobalFilter('byProbAutor');

                updateDashboard();
                updateFilterBadge();

                refreshFilterTags();
                closeModal();
                });

            document.getElementById('filter-modal')
                .addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });

            enableVizExpand();
        })
        .catch((error) => {
            console.error("Error loading the CSV file:", error);
        });
}
