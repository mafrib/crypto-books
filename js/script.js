let globalData;
let currentTreemapMode = 'category';

// Function to switch modes and redraw the treemap
function switchMode(mode) {
    currentTreemapMode = mode;
    createTreemap('#treemap-area', globalData, mode);
    
    // Update button styles
    d3.selectAll('.mode-button')
        .classed('active', false);
    d3.select(`.mode-button[data-mode="${mode}"]`)
        .classed('active', true);
}

// Function to initiate the dashboard and load the data
function startDashboard() {
    document.getElementById("search-input").value = "";

    // Load the data
    d3.csv("data/dataset.csv")
        .then((data) => {
            globalData = data;
          
        // Filter the data if needed
        makeMap();

        // Default alphabetical sort by library owner
        const initialSortColumn = "Livraria";
        const sortedData = [...globalData].sort((a, b) =>
            a[initialSortColumn].localeCompare(b[initialSortColumn])
        );

        // Books' Catalog     
        createBooksCatalog(sortedData);
        setupSearchBar(sortedData);
        setupSorting(sortedData, initialSortColumn);

        createTreemap('#treemap-area', globalData, currentTreemapMode);

        // Set up mode switch buttons
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