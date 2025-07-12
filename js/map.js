const zoomMin = 0.5;
const zoomMax = 8;

const width = 380;
const height = 200;

function makeMap() {

    window.highlightMapPoint   = () => {};
    window.clearMapHighlights  = () => {};

    const containerEl = document.getElementById("map-area");
    const legendEl    = document.querySelector(".map-color-scale");
    const legendW = legendEl.clientWidth;
    const mapW   = containerEl.clientWidth - legendW;

    const mapH = window.innerHeight * 0.26;

    const svg = d3.select("svg")
        .attr("width", mapW)
        .attr("height", mapH);

    d3.select('#map-area')
        .style('height', mapH + 'px');

    d3.select('#map-area .map-color-scale')
        .style('height', mapH + 'px');

    const tooltip = d3.select("body")
        .append("div")
            .attr("class", "map-tooltip");

    const mapGroup = svg.append("g");

    let mergedGeometries;
    let countryFeatures;
    let fullCountryFeatures;

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
        .center([17, 47])  // Initial center
        .scale(255)
        .translate([mapW / 2, mapH / 2]);

    const path = d3.geoPath().projection(projection);

    // Initialize zoom
    const zoom = d3.zoom()
        .scaleExtent([zoomMin, zoomMax])
        .translateExtent([[0, 0], [mapW, mapH]])
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
        "Iraq", "Kuwait", "Pakistan", "Afghanistan"
    ]);

    // Load and process data
    // File originally got from https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json
    d3.json("data/countries-110m.json")
        .then(data => {
            // Filter visible countries by name
            const visibleGeometries = data.objects.countries.geometries
                .filter(d => visibleCountries.has(d.properties.name));

            // Merge the geometries
            mergedGeometries = topojson.merge(data, visibleGeometries);
            countryFeatures = visibleGeometries.map(geom =>
                topojson.feature(data, geom)
            );

            fullCountryFeatures = data.objects.countries.geometries.map(geom =>
            topojson.feature(data, geom)
          );

            mapGroup.append("path")
                .datum(mergedGeometries)
                .attr("class", "europe-outline")
                .attr("d", path);

            return d3.csv("data/dataset.csv");
        })

        .then(libraries => {
            const periodCounts = d3.rollup(
                libraries,
                v => v.length,
                d => d.EpocaHistorica_Autor
                );

            const parseDMS = str => {
                const m = str.match(/(\d+)°\s*(\d+)′\s*(\d+)″\s*([NSEW])/);
                if (!m) return NaN;
                let [, deg, min, sec, dir] = m;
                let dec = +deg + +min/60 + +sec/3600;
                if (dir === "S"||dir==="W") dec = -dec;
                return dec;
            };

            const points = libraries
                .map(d => ({
                ...d,
                lat: parseDMS(d.Latitude_Autor),
                lon: parseDMS(d.Longitude_Autor)
                }))
                .filter(d => !isNaN(d.lat) && !isNaN(d.lon));

            const agg = {};
            points.forEach(d => {
                const key = `${d.lat},${d.lon}`;
                if (!agg[key]) {
                    agg[key] = {
                        lat: d.lat,
                        lon: d.lon,
                        totalBooks: 0,
                        entries: []
                    };
                }
                agg[key].totalBooks += +d.NumCopias;
                agg[key].entries.push(d);
            });

            const aggregatedPoints = Object.values(agg);

            mapGroup.selectAll("circle.library-point")
                .data(aggregatedPoints)
                .enter().append("circle")
                    .attr("class", d => {
                        const n = +d.totalBooks;
                        let bucket = "";
                        if      (n >= 15) bucket = "books-15plus";
                        else if (n >= 6)  bucket = "books-6to14";
                        else              bucket = "books-1to5";
                        return `library-point ${bucket}`;
                    })
                    .attr("r", 2)
                    .attr("cx", d => projection([d.lon,d.lat])[0])
                    .attr("cy", d => projection([d.lon,d.lat])[1])
                    .on("mouseover", (event, d) => {
                        tooltip
                            .style("opacity", 1)
                            .html(`${d.totalBooks} book${+d.totalBooks>1?'s':''}`)
                            .style("left", (event.pageX + 8) + "px")
                            .style("top",  (event.pageY - 28) + "px");
                    })
                    .on("mousemove", (event) => {
                        tooltip
                            .style("left", (event.pageX + 8) + "px")
                            .style("top",  (event.pageY - 28) + "px");
                    })
                    .on("mouseout", () => {
                        tooltip.style("opacity", 0);
                    });

            function highlightMapPoint(book) {
                d3.selectAll('circle.library-point')
                    .classed('hovered-map-point',
                        p => p.entries.some(e =>
                            e.Obra              === book.Obra &&
                            e.Nome_Autor        === book.Nome_Autor &&
                            e.Proprietario_Nome === book.Proprietario_Nome
                        )
                    );
            }

            function clearMapHighlights() {
                d3.selectAll('circle.library-point')
                    .classed('hovered-map-point', false);
            }

            window.highlightMapPoint   = highlightMapPoint;
            window.clearMapHighlights  = clearMapHighlights;

            const totalH = height;
            const titleH = 20;
            const wrapperH = totalH - titleH;

            const sliceH = Math.floor(wrapperH / 3);

            const overlap = 4;

            const totals = [
                { units: sliceH,                          color: '#7F5F24', label: '15+'    },
                { units: sliceH,                          color: '#B89B3C', label: '6–14'   },
                { units: wrapperH - 2 * sliceH + overlap, color: '#F0E3C0', label: '1-5'    }
            ];

            const barWrapper = d3.select('#map-area .map-color-scale .bar-wrapper')
                .style("height", mapH + "px");

            const bars = barWrapper.selectAll('.legend-bar')
                .data(totals)
                .enter().append('div')
                    .attr('class', 'legend-bar')
                    .style('background', d => d.color)
                    .style('flex',       d => d.units)
                    .style('margin-top', (d,i) => i === 0 ? 0 : `-${overlap}px`)
                    .style('position', 'relative');

            bars.append('div')
                .attr('class', 'legend-label')
                .text(d => d.label);

            let selectedPeriods = [];

            const periodOrder = [
                "Indeterminada",
                "Época Arcaica (VIII-V aC)",
                "Antiguidade Clássica (V aC-III)",
                "Antiguidade Tardia (III-VIII)",
                "Alta Idade Média (VIII-XI)",
                "Idade Média Central (XI-XIII)",
                "Baixa Idade Média (XIV-XV)"
            ];

            const allPeriods = Array.from(
                new Set(libraries.map(d => d.EpocaHistorica_Autor).filter(Boolean))
            )
            .sort((a, b) =>
                periodOrder.indexOf(a) - periodOrder.indexOf(b)
            );

            const pf = d3.select('#period-filter');
            const periodBars = pf.selectAll('.period-bar')
                .data(allPeriods)
                .enter().append('div')
                    .attr('class', 'period-bar')
                    .on('click', function(event, period) {
                        const i = selectedPeriods.indexOf(period);
                        if (i > -1) selectedPeriods.splice(i, 1);
                        else          selectedPeriods.push(period);

                        d3.select(this).classed('selected', selectedPeriods.includes(period));

                        if (selectedPeriods.length) {
                            setGlobalFilter('period', d =>
                            selectedPeriods.includes(d.EpocaHistorica_Autor)
                            );
                        } else {
                            clearGlobalFilter('period');
                        }

                        updateDashboard();
                    });

            periodBars
                .append('span')
                    .attr('class', 'label')
                    .html(d => {
                        const m = d.match(/^(.*?)\s*(\(.+\))$/);
                        if (m) {
                            const [, main, years] = m;
                            return `${main}<br><span class="period‐years">${years}</span>`;
                        }
                        return d;
                    });

            periodBars
                .append('span')
                    .attr('class', 'count')
                    .text(d => {
                        const n = periodCounts.get(d) || 0;
                        return `${n} book${n === 1 ? '' : 's'}`;
                    });

            function highlightPeriodBar(book) {
                d3.selectAll('#period-filter .period-bar')
                .classed('hovered-period-bar',
                    period => period === book.EpocaHistorica_Autor
                );
            }

            function clearPeriodHighlights() {
                d3.selectAll('#period-filter .period-bar')
                .classed('hovered-period-bar', false);
            }

            window.highlightPeriodBar   = highlightPeriodBar;
            window.clearPeriodHighlights = clearPeriodHighlights;

            function updateFiltersAndRedraw() {
                activeFilters.period = [...selectedPeriods];

                const filtered = applyGlobalFilters(globalData);

                d3.selectAll('circle.library-point')
                    .style('display', d =>
                    !selectedPeriods.length ||
                    d.entries.some(e => selectedPeriods.includes(e.EpocaHistorica_Autor))
                        ? null
                        : 'none'
                    );

                redrawTreemap(filtered);
                redrawNetwork(filtered);
                redrawCatalog(filtered);

                updateClearButton();
            }
        })

    .catch(err => console.error("Error loading map or data:", err));

}

function updateDashboard() {
    const filtered = applyGlobalFilters(globalData);

    d3.selectAll('circle.library-point')
        .style('display', d =>
        filtered.some(r =>
            d.entries.some(e => e.ID_Cod === r.ID_Cod)
        )
            ? null
            : 'none'
        );

    const sorted = [...filtered]
        .sort((a, b) => a.Proprietario_Nome.localeCompare(b.Proprietario_Nome));
    createBooksCatalog(sorted);

    const allowedSet = new Set(filtered.map(r => r.Proprietario_Nome));
    updateNetworkStyles(allowedSet);

    createTreemap(
        '#treemap-area',
        filtered,
        currentTreemapMode,
        () => {
        const newlyFiltered = applyGlobalFilters(globalData);
        const sortedAgain = [...newlyFiltered]
            .sort((a, b) => a.Proprietario_Nome.localeCompare(b.Proprietario_Nome));
        createBooksCatalog(sortedAgain);
        updateNetworkStyles(new Set(newlyFiltered.map(r => r.Proprietario_Nome)));
        },
        genderGraphActive
    );
}