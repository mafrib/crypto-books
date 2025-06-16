let globalData;
let baselineW, baselineH;
let currentTreemapMode = 'category';
let genderGraphActive = false;

function captureBaselineSize() {
  const dash = document.querySelector('.dashboard');
  dash.style.transform = 'none';
  baselineW = dash.scrollWidth;
  baselineH = dash.scrollHeight;
  fitDashboard();
}

function fitDashboard() {
  const wrap   = document.querySelector('.dashboard-wrap');
  const dash   = document.querySelector('.dashboard');
  const scale  = Math.min(wrap.clientWidth / baselineW,
                          wrap.clientHeight / baselineH);
  dash.style.transform = `scale(${scale})`;
}

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
    });

    fitDashboard();

    d3.selectAll('.mode-button').classed('active', false);
    d3.select(`.mode-button[data-mode="${mode}"]`).classed('active', true);
}

function isFemaleLibrary(rawName) {
  const lower = rawName.trim().toLowerCase();
  return lower.includes('d. leonor') || lower.includes('d. beatriz');
}

function startDashboard() {
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

            createNetworkGraph('#network-graph', globalData);

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
                    createGenderGraph('#network-graph', globalData);
                } else {
                    genderGraphActive = false;
                    createNetworkGraph('#network-graph', globalData);
                }

                requestAnimationFrame(fitDashboard);

                const filtered = applyGlobalFilters(globalData);
                createBooksCatalog(filtered);

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
            });

            requestAnimationFrame(captureBaselineSize);
            window.addEventListener('resize', fitDashboard);

            d3.selectAll('.mode-button')
                .on('click', function() {
                    const mode = this.getAttribute('data-mode');
                    switchMode(mode);
                    requestAnimationFrame(fitDashboard);
                });
        })
        .catch((error) => {
            console.error("Error loading the CSV file:", error);
        });
}
