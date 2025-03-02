let globalData;

// Function to initiate the dashboard and load the data
function startDashboard() {
  // Load the data
  d3.csv("data/dataset.csv")
    .then((data) => {
      // Store data in the globalData variable
      globalData = data;

      // Filter the data if needed
      // Run functions to create the visualizations
    })
    .catch((error) => {
      // If there's an error while loading the data, log the error.
      console.error("Error loading the CSV file:", error);
    });
}
