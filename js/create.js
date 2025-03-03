// Functions to create each visualization


function makeMap() {
    // Initialize dimensions
    const width = 300;
    const height = 200;

    // Create SVG container
    const svg = d3.select("svg")
        .attr("width", width)
        .attr("height", height)
        .call(d3.zoom().on("zoom", handleZoom))
        .append("g");

    const projection = d3.geoMercator()
        .center([15, 52])  // Initial center
        .scale(200)
        .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    // Create zoom handler
    function handleZoom(event) {
        svg.attr("transform", event.transform);
    }

    const zoom = d3.zoom()
        .scaleExtent([0.9, 8]) // Min/max zoom levels
        .translateExtent([[0, 0], [width, height]])
        .on("zoom", handleZoom);

    d3.select("svg").call(zoom);

    // Country names that are visible on the map
    const visibleCountries = new Set([
        "France", "Germany", "United Kingdom", "Italy", "Spain",
        "Netherlands", "Belgium", "Portugal", "Poland", "Czech Republic",
        "Austria", "Sweden", "Norway", "Finland", "Denmark", "Switzerland",
        "Ireland", "Hungary", "Greece", "Romania", "Slovakia", "Bulgaria",
        "Croatia", "Serbia", "Slovenia", "Lithuania", "Latvia", "Estonia",
        "Luxembourg", "Ukraine", "Albania", "Bosnia and Herzegovina", "Russia", 
        "Morocco", "Algeria", "Tunisia","Turkey", "Armenia", "Syria", "Libya",
        "Egypt", "Israel", "Saudi Arabia", "Iceland", "Cyprus", "Georgia", 
        "Moldova", "Czechia", "Belarus", "Jordan", "Bosnia and Herz.", 
        "Montenegro", "Macedonia", "Kosovo", "Lebanon", "Iran", "Armenia",
        "Azerbaijan", "Turkmenistan", "Uzbekistan", "Kazakhstan", "Palestine",
        "Iraq", "Kuwait"
    ]);

    // Load and process data
    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
        .then(data => {
            // Filter visible countries by name
            const visibleGeometries = data.objects.countries.geometries
                .filter(d => visibleCountries.has(d.properties.name));

            // Merge the geometries
            const mergedGeometries = topojson.merge(
                data,
                visibleGeometries
            );

            svg.append("path")
                .datum(mergedGeometries)
                .attr("class", "europe-outline")
                .attr("d", path)
                .style("fill", "#90AA86")
                .style("stroke", "#333")
                .style("stroke-width", "0.5px");
        })
}