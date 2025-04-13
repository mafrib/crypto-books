let globalData;

// Function to initiate the dashboard and load the data
function startDashboard() {

  document.getElementById("search-input").value = "";

  // Load the data
  d3.csv("data/dataset.csv")
    .then((data) => {
      // Store data in the globalData variable
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

    })
    .catch((error) => {
      // If there's an error while loading the data, log the error.
      console.error("Error loading the CSV file:", error);
    });
}
