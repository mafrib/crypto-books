let mapSvg;
let mapProjection;
let mapGroup;
let baseScale, baseWidth, baseHeight;
let zoom;
let selectedPeriods = [];

const zoomMin = 0.8;
const zoomMax = 4;

let currentZoomK = 1;

const width = 380;
const height = 200;

function positionOffMsg(legendEl) {
    const el = document.getElementById('map-offmsg');
    if(!el || !legendEl) return;

    const legendW = legendEl.getBoundingClientRect().width;
    const padL = parseFloat(getComputedStyle(legendEl).paddingLeft) || 0;

    const extra   = 6;

    el.style.paddingRight = (legendW + padL + extra) + 'px';
}

function updateZoomButtons(k) {
    d3.select('.zoom-in' )
        .classed('disabled', k >= zoomMax - 1e-6);
    d3.select('.zoom-out')
        .classed('disabled', k <= zoomMin + 1e-6);
}


function parseDMS(str) {
    if (!str) return NaN;
    const m = str.match(/(\d+)°\s*(\d+)′\s*(\d+)″\s*([NSEW])/);
    if (!m) return NaN;
    let [,deg,min,sec,dir] = m;
    let dec = +deg + +min/60 + +sec/3600;
    if (dir==='S'||dir==='W') dec = -dec;
    return dec;
}

function locKeyFromLatLon(lat, lon) {
    return `${(+lat).toFixed(6)},${(+lon).toFixed(6)}`;
}

function locKeyFromRow(r) {
    const lat = parseDMS(r.Latitude_Autor);
    const lon = parseDMS(r.Longitude_Autor);
    if (isNaN(lat) || isNaN(lon)) return null;
    return locKeyFromLatLon(lat, lon);
}

function updateMapLocationStyles() {
    const selected = new Set(activeFilters.byLocation?.values || []);
    const any = selected.size > 0;

    d3.selectAll('circle.library-point')
        .classed('location-selected', function(d){ return any && selected.has(d.key); })
        .classed('location-dim',      function(d){ return any && !selected.has(d.key); });
}

function showNoLocationOverlay(show) {
    const overlay = document.getElementById('map-nolocation-overlay');
    if (overlay) overlay.hidden = !show;
}

function updateUnlocatedBadge(rowSet) {
    const n = rowSet.filter(r=>{
        const lat = parseDMS(r.Latitude_Autor);
        const lon = parseDMS(r.Longitude_Autor);
        return isNaN(lat) || isNaN(lon);
    }).length;

    const el = document.getElementById('map-offmsg');
    if (!el) return;

    if (n) {
        el.textContent = `${n} book${n>1?'s':''} with no location`;
        el.hidden = false;
    } else {
        el.hidden = true;
    }
}

function highlightPoint(el, d) {
    el.raise()
        .classed('highlighted', true)
        .transition().duration(120)
        .attr('r', (d.baseR * 2) / currentZoomK);

    d3.selectAll('circle.library-point')
        .filter(p => p !== d)
        .classed('dimmed', true);
}

function clearPointHighlight(el, d) {
    el.classed('highlighted', false)
        .transition().duration(120)
        .attr('r', d.baseR / currentZoomK);

    d3.selectAll('circle.library-point').classed('dimmed', false);
}

function clickZoom(event, factor) {
    event.stopPropagation();
    mapSvg.interrupt();
    mapSvg.transition()
            .duration(150)
            .call(zoom.scaleBy, factor);
}

function normalizePeriod(v) {
    const t = (v ?? '').toString().trim();
    if (!t) return 'Por determinar';
    const lc = t.toLowerCase();
    if (lc === 'indeterminada' || lc === 'por determinar') return 'Por determinar';
    return t;
}

function makeMap () {

    if (mapSvg) {
        const containerEl = document.getElementById('map-area');
        const legendEl    = containerEl.querySelector('.map-color-scale');
        const legendW     = legendEl.clientWidth;
        positionOffMsg(legendEl);
        const mapW        = containerEl.clientWidth - legendW;
        const isExpanded = document
            .getElementById('map-visualization')
            .classList.contains('is-expanded');

        const mapH = isExpanded
            ? containerEl.clientHeight
            : Math.round(baseHeight * (mapW / baseWidth));

        mapSvg.attr('width', mapW).attr('height', mapH);

        const k = mapW / baseWidth;
        mapProjection
                .scale(baseScale * k)
                .translate([mapW / 2, mapH / 2]);

        const path = d3.geoPath().projection(mapProjection);
        mapGroup.select('path.europe-outline')
                .attr('d', path);

        const proj = d => mapProjection([d.lon, d.lat]);

        mapSvg.selectAll('circle.library-point')
            .attr('cx', d => proj(d)[0])
            .attr('cy', d => proj(d)[1]);

        mapGroup.selectAll("circle.library-point.highlighted")
            .attr("r", d => (d.baseR * 2) / event.transform.k);

        d3.select('#map-area .map-color-scale , #map-area .bar-wrapper')
            .style('height', mapH + 'px');

        return;
    }

    const containerEl = document.getElementById('map-area');
    const legendEl    = containerEl.querySelector('.map-color-scale');
    const legendW = legendEl.clientWidth;
    positionOffMsg(legendEl);
    const mapW    = containerEl.clientWidth - legendW;
    const mapH = containerEl.clientHeight;

    mapSvg = d3.select('#map')
           .attr('width', mapW)
           .attr('height', mapH);

    d3.select('#map-area .map-color-scale')
        .style('height', mapH + 'px');

    const tooltip = d3.select("body")
        .append("div")
            .attr("class", "map-tooltip");

    mapGroup = mapSvg.append("g");

    let mergedGeometries;
    let countryFeatures;
    let fullCountryFeatures;

    const zoomControl = mapSvg.append("g")
        .attr("class", "zoom-controls")
        .attr("transform", "translate(20,20)");

    // Zoom in button (top)
    zoomControl.append("g")
        .attr("class", "zoom-button zoom-in")
        .on("click",  e => clickZoom(e, 1.2))
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
        .attr("class", "zoom-button zoom-out")
        .attr("transform", "translate(0,25)")
        .on("click",  e => clickZoom(e, 0.8))
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

    mapProjection = d3.geoMercator()
        .center([25, 47])  // Initial center
        .scale(280)
        .translate([mapW / 2, mapH / 2]);

    baseScale  = mapProjection.scale();
    baseWidth  = mapW;
    baseHeight = mapH;

    const path = d3.geoPath().projection(mapProjection);

    // Initialize zoom
    zoom = d3.zoom()
        .scaleExtent([zoomMin, zoomMax])
        .on("zoom", (event) => {
            currentZoomK = event.transform.k;

            mapGroup.attr("transform", event.transform);

            mapGroup.selectAll("circle.library-point")
                    .attr("r", d => d.baseR / currentZoomK);

            mapGroup.selectAll("circle.library-point.highlighted")
                    .attr("r", d => (d.baseR * 2) / currentZoomK);

            updateZoomButtons(currentZoomK);
        });

    mapSvg.call(zoom);
    updateZoomButtons(1);

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
                d => normalizePeriod(d.EpocaHistorica_Autor)
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
                const key = locKeyFromLatLon(d.lat, d.lon);
                if (!agg[key]) {
                    const label = (d.LocalNasc_Autor || 'Unknown location').trim();
                    agg[key] = {
                    key,
                    lat: d.lat,
                    lon: d.lon,
                    label,
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
                    .attr("data-key", d => d.key)
                    .attr("r", d => { d.baseR = 3; return d.baseR; })
                    .attr("cx", d => mapProjection([d.lon,d.lat])[0])
                    .attr("cy", d => mapProjection([d.lon,d.lat])[1])
                    .on("click", function (event, d) {
                        event.stopPropagation();

                        const key = d.key;
                        const cur = activeFilters.byLocation?.values || [];
                        const isSelected = cur.includes(key);

                        const next = isSelected ? cur.filter(v => v !== key) : cur.concat(key);

                        if (next.length) {
                            setGlobalFilter(
                            'byLocation',
                            row => {
                                const k = locKeyFromRow(row);
                                return k ? next.includes(k) : false;
                            },
                            next,
                            'filter-location'
                            );
                        } else {
                            clearGlobalFilter('byLocation');
                        }
                    })
                    .on("mouseover", function (event, d) {
                    const rows       = d.filteredEntries ?? d.entries;
                    const location   = d.label || "Unknown location";
                    const numAuthors = new Set(rows.map(e => e.Nome_Autor)).size;
                    const numBooks   = rows.length;

                    highlightPoint(d3.select(this), d);

                    tooltip
                        .style("opacity", 1)
                        .html(
                        `<strong>Location:</strong> ${location}<br/>` +
                        `<strong>No. of authors:</strong> ${numAuthors}<br/>` +
                        `<strong>No. of books:</strong> ${numBooks}`
                        )
                        .style("left", (event.pageX + 8) + "px")
                        .style("top",  (event.pageY - 28) + "px");
                    })
                    .on("mousemove", event => {
                    tooltip
                        .style("left", (event.pageX + 8) + "px")
                        .style("top",  (event.pageY - 28) + "px");
                    })
                    .on("mouseout", function (event, d) {
                    clearPointHighlight(d3.select(this), d);
                    tooltip.style("opacity", 0);
                    });

            function highlightMapPoint(book) {
                d3.selectAll('circle.library-point')
                    .classed('hovered-map-point', false)
                    .classed('dimmed',            false);

                const sel = d3.selectAll('circle.library-point')
                    .filter(p => p.entries.some(e => e.ID_Cod === book.ID_Cod));

                sel.classed('hovered-map-point', true)
                .raise();
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

            const periodOrder = [
                'Por determinar',
                'Época Arcaica (VIII-V aC)',
                'Antiguidade Clássica (V aC-III)',
                'Antiguidade Tardia (III-VIII)',
                'Alta Idade Média (VIII-XI)',
                'Idade Média Central (XI-XIII)',
                'Baixa Idade Média (XIV-XV)'
            ];

            const allPeriods = Array.from(
                new Set(libraries.map(d => normalizePeriod(d.EpocaHistorica_Autor)))
                ).sort((a, b) => periodOrder.indexOf(a) - periodOrder.indexOf(b));

            const pf = d3.select('#period-filter');
            const periodBars = pf.selectAll('.period-bar')
                .data(allPeriods)
                .enter().append('div')
                    .attr('class', 'period-bar')
                    .on('click', function (event, period) {
                        const adding = !selectedPeriods.includes(period);
                        if (adding) {
                            const blockers = getConflictingFilters(
                            globalData.filter(r => normalizePeriod(r.EpocaHistorica_Autor) === period),
                            ['period','byPeriod']
                            );
                            if (blockers.length) {
                            showConflictPopup(period, blockers, 'period');
                            return;
                            }
                        }

                        const next = [...selectedPeriods];
                        const already = next.indexOf(period) > -1;
                        already ? next.splice(next.indexOf(period), 1) : next.push(period);

                        const pretendFn = row => next.includes(normalizePeriod(row.EpocaHistorica_Autor));
                        const pretendSet = applyFiltersExcept(['period','byPeriod']).filter(pretendFn);

                        if (next.length > 0 && pretendSet.length === 0) {
                            showConflictPopup(period, getConflictingFiltersForPeriod(period), 'period');
                            return;
                        }

                        selectedPeriods = next;
                        d3.select(this).classed('selected', !already)
                                        .classed('selected', selectedPeriods.includes(period));

                        if (selectedPeriods.length) {
                            clearGlobalFilter('byPeriod');
                            setGlobalFilter(
                            'period',
                            d => selectedPeriods.includes(normalizePeriod(d.EpocaHistorica_Autor)),
                            selectedPeriods
                            );
                        } else {
                            clearGlobalFilter('period');
                            clearGlobalFilter('byPeriod');
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

            repaintPeriodBars(libraries);

            function highlightPeriodBar(book) {
                const bookPeriod = normalizePeriod(book.EpocaHistorica_Autor);
                d3.selectAll('#period-filter .period-bar')
                    .classed('hovered-period-bar', period => period === bookPeriod);
            }

            function clearPeriodHighlights() {
                d3.selectAll('#period-filter .period-bar')
                .classed('hovered-period-bar', false);
            }

            window.highlightPeriodBar   = highlightPeriodBar;
            window.clearPeriodHighlights = clearPeriodHighlights;
            refreshMapPoints(applyGlobalFilters(globalData));
            updateMapLocationStyles();
        })

    .catch(err => console.error("Error loading map or data:", err));

}

function updateDashboard() {
    const filtered = applyGlobalFilters(globalData);

    // For map visibility and per-point entries, ignore the location filter
    const filteredForMap = applyFiltersExcept(['byLocation']);
    refreshMapPoints(filteredForMap);
    updateUnlocatedBadge(filtered);

    const filteredNoPeriod = applyFiltersExcept(['period','byPeriod']);
    repaintPeriodBars(filteredNoPeriod);

    d3.selectAll('circle.library-point')
        .style('display', d =>
        filteredForMap.some(r =>
            d.entries.some(e => e.ID_Cod === r.ID_Cod)
        ) ? null : 'none'
        );

    updateMapLocationStyles(); // apply dimming/selection ring

    const sorted = [...filtered].sort((a, b) => a.Proprietario_Nome.localeCompare(b.Proprietario_Nome));
    createBooksCatalog(sorted);

    const allowedSet = new Set(filtered.map(r => r.Proprietario_Nome));
    updateNetworkStyles(allowedSet);

    const skipTreemap =
        treemapFilterActive() && treemapFilterOrigin === currentTreemapMode;

    if (!skipTreemap) {
        createTreemap('#treemap-area', filtered, currentTreemapMode, null);
    }
}

function repaintPeriodBars(rowSetWithoutPeriod) {
    const counts = d3.rollup(
        rowSetWithoutPeriod,
        v => v.length,
        d => normalizePeriod(d.EpocaHistorica_Autor)
    );

    d3.selectAll('#period-filter .period-bar').each(function (period) {
        const sel = selectedPeriods.includes(period);
        const n   = counts.get(period) || 0;

        d3.select(this)
        .classed('selected', sel)
        .classed('inactive', n === 0)
        .classed('dimmed',  !sel && selectedPeriods.length > 0)
        .select('.count')
        .text(`${n} book${n === 1 ? '' : 's'}`);
    });
}


window.repaintPeriodBars = repaintPeriodBars;

function refreshMapPoints(filteredRows) {

    if (!mapGroup) return;

    const allowedIds = new Set(filteredRows.map(r => r.ID_Cod));

    mapGroup.selectAll('circle.library-point')
        .each(function (d){

        d.filteredEntries = d.entries.filter(e => allowedIds.has(e.ID_Cod));

        const nCopies  = d.filteredEntries.reduce((s,e)=>s + +e.NumCopias,0);
        const nVisible = d.filteredEntries.length;

        let bucket = 'books-1to5';
        if (nCopies >= 15) bucket = 'books-15plus';
        else if (nCopies >= 6) bucket = 'books-6to14';

        d3.select(this)
            .attr('class', `library-point ${bucket}`)
            .style('display', nVisible ? null : 'none');
        });
}