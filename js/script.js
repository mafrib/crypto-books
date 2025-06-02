let globalData;
let currentTreemapMode = 'category';

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

    d3.selectAll('.mode-button').classed('active', false);
    d3.select(`.mode-button[data-mode="${mode}"]`).classed('active', true);
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

            d3.selectAll('.mode-button')
                .on('click', function() {
                    const mode = this.getAttribute('data-mode');
                    switchMode(mode);
                });
        })
        .catch((error) => {
            console.error("Error loading the CSV file:", error);
        });
}
