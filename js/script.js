let globalData;
let currentTreemapMode = 'category';

// Function to switch modes and redraw the treemap
function switchMode(mode) {
    currentTreemapMode = mode;

    const filteredData = applyGlobalFilters(globalData);

    // redraw the treemap on the filtered set
    createTreemap('#treemap-area', filteredData, mode, newFiltered => {
        const sorted = [...newFiltered].sort((a, b) =>
            a.Livraria.localeCompare(b.Livraria)
        );
        createBooksCatalog(sorted);
        createNetworkGraph('#network-graph', newFiltered);
    });

    d3.selectAll('.mode-button').classed('active', false);
    d3.select(`.mode-button[data-mode="${mode}"]`).classed('active', true);
}

// Function to initiate the dashboard and load the data
function startDashboard() {
    document.getElementById("search-input").value = "";

    // Load the data
    d3.csv("data/dataset.csv")
        .then((data) => {
            globalData = data;

            let currentData = applyGlobalFilters(globalData);
            // Default alphabetical sort by library owner
            const initialSortColumn = "Livraria";

            // Sort initially
            let sortedData = [...currentData].sort((a, b) =>
                a[initialSortColumn].localeCompare(b[initialSortColumn])
            );

            makeMap();

            // Books' Catalog
            createBooksCatalog(sortedData);
            setupSearchBar(globalData);
            setupSorting(sortedData, initialSortColumn);

            createTreemap('#treemap-area', globalData, currentTreemapMode, (newFilteredData) => {
                // Update current data and re-sort
                currentData = newFilteredData;
                sortedData = [...currentData].sort((a, b) =>
                    a[initialSortColumn].localeCompare(b[initialSortColumn])
                );
                createBooksCatalog(sortedData);
                createNetworkGraph('#network-graph', newFilteredData);
            });

            // Set up mode switch buttons
            d3.selectAll('.mode-button')
            .on('click', function() {
            const mode = this.getAttribute('data-mode');
            switchMode(mode);
            });

        }
    )
    .catch((error) => {
        console.error("Error loading the CSV file:", error);
    });
}