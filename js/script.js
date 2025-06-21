let globalData;
let baselineW, baselineH;
let currentTreemapMode = 'category';
let genderGraphActive = false;

function switchMode(mode) {
    currentTreemapMode = mode;

    const filteredData = applyGlobalFilters(globalData);

    createTreemap('#treemap-area', filteredData, mode, () => {
        const newFiltered = applyGlobalFilters(globalData);
        const sorted = [...newFiltered].sort((a, b) =>
            a.Livraria.localeCompare(b.Livraria)
        );
        createBooksCatalog(sorted);

        const allowedSet = new Set(newFiltered.map(r => r.Livraria));
        updateNetworkStyles(allowedSet);
    }, genderGraphActive);

    d3.selectAll('.mode-button').classed('active', false);
    d3.select(`.mode-button[data-mode="${mode}"]`).classed('active', true);
}

function isFemaleLibrary(rawName) {
  const lower = rawName.trim().toLowerCase();
  return lower.includes('d. leonor') || lower.includes('d. beatriz');
}

function startDashboard() {
    clearDetailsPanel();
    document.getElementById("search-input").value = "";

    d3.csv("data/dataset.csv")
        .then((data) => {
            globalData = data;

            let currentData = [...globalData];
            const initialSortColumn = "Livraria";
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
                        filtered,
                        currentTreemapMode,
                        () => {
                        const newFiltered = applyGlobalFilters(globalData);
                        createBooksCatalog(
                            [...newFiltered].sort((a,b) => a.Livraria.localeCompare(b.Livraria))
                        );
                        updateNetworkStyles(new Set(newFiltered.map(r=>r.Livraria)));
                        },
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

            createTreemap('#treemap-area', globalData, currentTreemapMode, () => {
                const newFiltered = applyGlobalFilters(globalData);
                currentData = newFiltered;
                sortedData = [...currentData].sort((a, b) =>
                    a[initialSortColumn].localeCompare(b[initialSortColumn])
                );
                createBooksCatalog(sortedData);

                const allowedSet = new Set(newFiltered.map(r => r.Livraria));
                updateNetworkStyles(allowedSet);
            }, genderGraphActive);

            d3.selectAll('.mode-button')
                .on('click', function() {
                    const mode = this.getAttribute('data-mode');
                    switchMode(mode);
                });

            const clearBtn = document.getElementById('clear-btn');
            clearBtn.addEventListener('click', () => {
                if (!clearBtn.classList.contains('active')) return;

                Object.keys(activeFilters).forEach(src => clearGlobalFilter(src));
                updateClearButton();

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
                    cleanData,
                    currentTreemapMode,
                    () => {
                    const again = applyGlobalFilters(globalData);
                    createBooksCatalog(again);
                    const libs = new Set(again.map(r => r.Livraria));
                    updateNetworkStyles(libs);
                    },
                    genderGraphActive
                );
                createBooksCatalog(cleanData);
                });
        })
        .catch((error) => {
            console.error("Error loading the CSV file:", error);
        });
}
