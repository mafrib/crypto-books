const zoomMin = 0.9;
const zoomMax = 8;

const width = 300;
const height = 200;

function makeMap() {

    const svg = d3.select("svg")
        .attr("width", width)
        .attr("height", height);

    const mapGroup = svg.append("g");

    const zoomControl = svg.append("g")
        .attr("class", "zoom-controls")
        .attr("transform", "translate(20,20)");

    // Zoom in button (top)
    zoomControl.append("g")
        .attr("class", "zoom-button")
        .on("click", () => zoom.scaleBy(svg, 1.2))
        .on("dblclick", function(event) {
            event.stopPropagation(); // Prevent zoom in behind the button
        })    
        .call(button => {
            button.append("circle")
                .attr("class", "zoom-button-bg")
                .attr("r", 10);
            button.append("text")
                .attr("class", "zoom-icon")
                .attr("text-anchor", "middle")
                .attr("dy", "0.3em")
                .text("+");
        });

    // Zoom out button (bottom)
    zoomControl.append("g")
        .attr("class", "zoom-button")
        .attr("transform", "translate(0,25)")
        .on("click", () => zoom.scaleBy(svg.transition().duration(50), 0.8))
        .on("dblclick", function(event) {
            event.stopPropagation(); // Prevent zoom in behind the button
        })    
        .call(button => {
            button.append("circle")
                .attr("class", "zoom-button-bg")
                .attr("r", 10);
            button.append("text")
                .attr("class", "zoom-icon")
                .attr("text-anchor", "middle")
                .attr("dy", "0.3em")
                .text("-");
        });
        
    const projection = d3.geoMercator()
        .center([15, 52])  // Initial center
        .scale(200)
        .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    // Initialize zoom
    const zoom = d3.zoom()
        .scaleExtent([zoomMin, zoomMax])
        .translateExtent([[0, 0], [width, height]])
        .on("zoom", (event) => {
            mapGroup.attr("transform", event.transform);
        });

    svg.call(zoom);

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

            mapGroup.append("path")
                .datum(mergedGeometries)
                .attr("class", "europe-outline")
                .attr("d", path);
        })
}