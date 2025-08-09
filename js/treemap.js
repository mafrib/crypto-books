let treemapSelection = null;

function createTreemap(selector, data, mode = 'category', onUpdate, genderGraphActive = false) {

    // Cleanup before redraw
    const container = d3.select(selector);
    container.selectAll("svg").remove(); // Remove all previous elements

    const color = "#16404D";

    // Determine rootData based on mode
    const rootData = (() => {
        if (mode === 'category') {
            return {
                name: "Literary Categories",
                children: Array.from(
                    d3.group(data, d => d.CatLit_Descricao, d => d.GenLit_Descricao),
                    ([category, genres]) => ({
                        name: category,
                        children: Array.from(genres, ([genre, records]) => {
                            const femaleCount = records.filter(r => isFemaleLibrary(r.Proprietario_Nome)).length;
                            const maleCount   = records.length - femaleCount;

                            return {
                                name: genre,
                                value: records.length,
                                femaleCount,
                                maleCount
                            };
                        })
                    })
                )
            };
        } else {
            return {
                name: "Intellectual Tradition",
                children: Array.from(
                    d3.group(data, d => d.TradicaoIntelectual_Obra),
                    ([tradition, records]) => {
                        const femaleCount = records.filter(r => isFemaleLibrary(r.Proprietario_Nome)).length;
                        const maleCount   = records.length - femaleCount;

                        return {
                            name: tradition,
                            value: records.length,
                            femaleCount,
                            maleCount
                        };
                    }
                )
            };
        }
    })();

    const root = d3.hierarchy(rootData)
        .sum(d => d.value)
        .sort((a, b) => b.value - a.value);

    const path = d3.select("#treemap-breadcrumbs");
    path.html(root.data.name); // Set root of path based on mode

    const containerEl = container.node();
    const width       = containerEl.clientWidth;
    const height      = containerEl.clientHeight;

    d3.treemap()
        .size([width, height])
        .paddingInner(1)(root);

    const svg = d3.select(selector)
        .selectAll("svg")
        .data([null])
        .join("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .attr("width", "100%")
        .attr("height", "100%")
        .style("font", "10px sans-serif")
        .style("cursor", "pointer");

    const group = svg.selectAll("g").data([null]).join("g");

    const tooltip = d3.select("#tooltip");

    svg.on("click", () => {
        // Clear filter when clicking background (root zoom)
        clearGlobalFilter('treemap');
        treemapSelection = null;
        zoom(root, null, true);

        // Trigger update callback (will “un‐dim” everything again)
        if (onUpdate) onUpdate(applyFiltersAndRefresh());
    });

    goToStoredPosition();

    function goToStoredPosition() {
        if (!treemapSelection) {
            zoom(root);
            return;
        }

        let target = null;

        if (currentTreemapMode === 'category') {
            const catNode = root.children
                .find(n => n.data.name === treemapSelection.cat);

            if (catNode) {
                if (treemapSelection.gen) {
                    target = catNode.children
                        ?.find(n => n.data.name === treemapSelection.gen);
                } else {
                    target = catNode;
                }
            }
        } else {
            target = root.children
                .find(n => n.data.name === treemapSelection.trad);
        }

        zoom(target || root);
    }

    function wrapText(selection, maxWidthAccessor) {
        selection.each(function(d) {
            const text = d3.select(this);
            const maxWidth = maxWidthAccessor(d);
            let words = text.text().split(/\s+/);

            // Keep removing words until text fits or only "..." remains
            while (text.node().getComputedTextLength() > maxWidth && words.length > 0) {
                words.pop();
                text.text(words.join(" ") + (words.length === 0 ? "" : "..."));
            }
        });
    }

    function applyFiltersAndRefresh() {
        const filteredRows = applyGlobalFilters(globalData);

        const allowed = new Set(filteredRows.map(r => r.Proprietario_Nome));
        updateNetworkStyles(allowed);

        createBooksCatalog(filteredRows);

        d3.selectAll("circle.library-point")
            .style("display", d =>
            filteredRows.some(r =>
                d.entries.some(e => e.ID_Cod === r.ID_Cod)
            )
                ? null
                : "none"
            );
    }

    function zoom(node, initRect = null, fromUser = false) {
        const childData = node.children
            ? node.children.map(d => d.data)
            : [node.data];

        const newRoot = d3.hierarchy({ name: node.data.name, children: childData })
            .sum(d => d.value)
            .sort((a, b) => b.value - a.value);

        d3.treemap()
            .size([width, height])
            .paddingInner(1)(newRoot);

        newRoot.each(d => {
            d.originalParent = node.parent || root;
        });

        const nodes = newRoot.children;

        // Update breadcrumbs
        const path = d3.select("#treemap-breadcrumbs");
        if (!node.parent) {
            path.html(root.data.name);
            if (fromUser) clearGlobalFilter('treemap');
            if (onUpdate) onUpdate(applyFiltersAndRefresh());
        } else {
            path.html(`
                <span style="cursor: pointer; font-weight: normal;">${root.data.name}</span>
                &nbsp;>&nbsp;
                <span style="font-weight: bold;">${node.data.name}</span>
            `);
            path.select("span")
                .on("click", (event) => {
                    event.stopPropagation();
                    zoom(node.originalParent);
                    if (node.originalParent.parent === null) {
                        clearGlobalFilter('treemap');
                        if (onUpdate) onUpdate(applyFiltersAndRefresh());
                    }
                });
        }

        const t = group.transition().duration(750);

        const cell = group.selectAll("g.cell")
            .data(nodes, d => d.data.name);

        cell.exit().remove();

        const cellEnter = cell.enter().append("g")
            .classed("cell", true)
            .on("click", (event, d) => {
                event.stopPropagation();

                // If already fully zoomed in, do nothing
                if (d.x0 === 0 && d.y0 === 0 && d.x1 === width && d.y1 === height) return;

                const isLeaf = !d.children;

                const initRect = { x0: d.x0, y0: d.y0, x1: d.x1, y1: d.y1 };

                if (isLeaf) {
                    // Leaf‐level filter
                    const filterFn = currentTreemapMode === 'category'
                        ? book =>
                            book.CatLit_Descricao === d.parent.data.name &&
                            book.GenLit_Descricao === d.data.name
                        : book => book.TradicaoIntelectual_Obra === d.data.name;

                    setGlobalFilter('treemap', filterFn);

                    if (currentTreemapMode === 'category')
                        treemapSelection = {cat: d.parent.data.name, gen: d.data.name};
                    else
                        treemapSelection = {trad: d.data.name};

                    zoom(d, initRect);

                    // Rebuild breadcrumbs for leaf
                    if (currentTreemapMode === 'category') {
                        const rootLabel = 'Literary categories';
                        d3.select("#treemap-breadcrumbs").html(`
                            <span class="crumb-root" style="cursor:pointer; font-weight:normal;">
                              ${rootLabel}
                            </span>
                            &nbsp;>&nbsp;
                            <span class="crumb-category" style="cursor:pointer; font-weight:normal;">
                              ${d.parent.data.name}
                            </span>
                            &nbsp;>&nbsp;
                            <span class="crumb-genre" style="font-weight:bold;">
                              ${d.data.name}
                            </span>
                        `);

                        d3.select("#treemap-breadcrumbs .crumb-root")
                            .on("click", () => {
                                zoom(root, null, true);
                                clearGlobalFilter('treemap');
                                if (onUpdate) onUpdate(applyFiltersAndRefresh());
                            });

                        d3.select("#treemap-breadcrumbs .crumb-category")
                            .on("click", () => {
                                zoom(d.parent);
                                setGlobalFilter('treemap',
                                    book => book.CatLit_Descricao === d.parent.data.name
                                );
                                d3.select("#treemap-breadcrumbs").html(`
                                    <span class="crumb-root" style="cursor:pointer; font-weight:normal;">
                                      ${rootLabel}
                                    </span>
                                    &nbsp;>&nbsp;
                                    <span class="crumb-category" style="font-weight:bold;">
                                      ${d.parent.data.name}
                                    </span>
                                `);
                                d3.select("#treemap-breadcrumbs .crumb-root")
                                    .on("click", () => {
                                        zoom(root);
                                        clearGlobalFilter('treemap');
                                        if (onUpdate) onUpdate(applyFiltersAndRefresh());
                                    });
                                if (onUpdate) onUpdate(applyFiltersAndRefresh());
                            });

                    } else {
                        d3.select("#treemap-breadcrumbs").html(`
                            <span class="crumb-root" style="cursor:pointer; font-weight:normal;">
                              Intellectual Tradition
                            </span>
                            &nbsp;>&nbsp;
                            <span class="crumb-tradition" style="font-weight:bold;">
                              ${d.data.name}
                            </span>
                        `);

                        d3.select("#treemap-breadcrumbs .crumb-root")
                            .on("click", () => {
                                zoom(root);
                                clearGlobalFilter('treemap');
                                if (onUpdate) onUpdate(applyFiltersAndRefresh());
                            });
                    }

                    if (onUpdate) onUpdate(applyFiltersAndRefresh());
                    return;
                }

                // Intermediate‐level filter (non‐leaf category/tradition)
                if (d.children) {
                    let filterFn;
                    if (currentTreemapMode === 'category' && d.depth === 1) {
                        filterFn = book => book.CatLit_Descricao === d.data.name;
                    } else if (currentTreemapMode !== 'category') {
                        filterFn = book => book.TradicaoIntelectual_Obra === d.data.name;
                    }
                    if (filterFn) setGlobalFilter('treemap', filterFn);
                    else clearGlobalFilter('treemap');

                    if (currentTreemapMode === 'category')
                        treemapSelection = {cat: d.data.name};
                    else
                        treemapSelection = {trad: d.data.name};

                    zoom(d, initRect);

                    if (onUpdate) onUpdate(applyFiltersAndRefresh());
                }
            });

        const rectEnter = cellEnter.append("rect")
            .attr("fill", d => {
                if (genderGraphActive) {
                    // compute the fraction of female books in this cell
                    const total   = d.data.femaleCount + d.data.maleCount;
                    const fracF   = total > 0
                                 ? d.data.femaleCount / total
                                 : 0.5;
                    // pick the female color if >50%, otherwise the male color
                    return fracF > 0.5
                        ? "#dd9298"
                        : "#d0a07d";
                }
                return color;
            })
            .on("mousemove", (event, d) => {
                const treemapRect = d3.select("#treemap").node().getBoundingClientRect();
                const x = event.pageX - treemapRect.left - window.scrollX;
                const y = event.pageY - treemapRect.top - window.scrollY;

                tooltip
                    .html(`<strong>${d.data.name}</strong><br>${d.value} books`)
                    .style("left", `${x + 20}px`)
                    .style("top", `${y - 30}px`)
                    .style("visibility", "visible");
            })
            .on("mouseout", () => {
                tooltip.style("visibility", "hidden");
            });

        if (initRect) {
            rectEnter
                .attr("x",      initRect.x0)
                .attr("y",      initRect.y0)
                .attr("width",  initRect.x1 - initRect.x0)
                .attr("height", initRect.y1 - initRect.y0);
        }

        const textEnter = cellEnter.append("text")
            .attr("pointer-events", "none")
            .attr("fill", "white")
            .attr("font-size", "0.6rem")
            .text(d => d.data.name)
            .call(wrapText, d => d.x1 - d.x0 - 8);

        if (initRect) {
            textEnter
                .attr("x", initRect.x0 + 4)
                .attr("y", initRect.y0 + 14)
                .style("opacity", 0);
        }

        const cellUpdate = cellEnter.merge(cell);

        function highlightTreemapRect(book) {
            d3.selectAll(selector + " rect")
                .classed("hovered-treemap-rect", d => {
                if (mode === "category") {
                    const cat = (book.CatLit_Descricao   || '').trim();
                    const gen = (book.GenLit_Descricao   || '').trim();
                    return d.data.name === gen || d.data.name === cat;
                } else if (mode === "tradition") {
                    return d.data.name === book.TradicaoIntelectual_Obra;
                }
                return false;
                });
            }

        function clearTreemapHighlights() {
            d3.selectAll(selector + " rect")
                .classed("hovered-treemap-rect", false);
        }

        window.highlightTreemapRect   = highlightTreemapRect;
        window.clearTreemapHighlights = clearTreemapHighlights;

        cellUpdate.select("rect")
            .transition(t)
            .attr("x", d => d.x0)
            .attr("y", d => d.y0)
            .attr("width", d => Math.max(0, d.x1 - d.x0))
            .attr("height", d => Math.max(0, d.y1 - d.y0));

        cellUpdate.select("text")
            .text(d => d.data.name)
            .call(wrapText, d => d.x1 - d.x0 - 8)
            .transition(t)
            .attr("x", d => d.x0 + 4)
            .attr("y", d => d.y0 + 14)
            .style("opacity", 1)
            .on("end", function(d) {
                const text = d3.select(this);
                const bbox = text.node().getBBox();
                const rectWidth = d.x1 - d.x0 - 8;
                const rectHeight = d.y1 - d.y0;
                if (bbox.width > rectWidth || bbox.height > rectHeight) {
                    text.style("opacity", 0);
                }
            });
    }
}
