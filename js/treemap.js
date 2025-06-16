function createTreemap(selector, data, mode = 'category', onUpdate) {

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
                        children: Array.from(genres, ([genre, records]) => ({
                            name: genre,
                            value: records.length
                        }))
                    })
                )
            };
        } else {
            return {
                name: "Intellectual Tradition",
                children: Array.from(
                    d3.group(data, d => d.TradicaoIntelectual_Obra),
                    ([tradition, records]) => ({
                        name: tradition,
                        value: records.length
                    })
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
        .style("font", "10px sans-serif")
        .style("cursor", "pointer");

    const group = svg.selectAll("g").data([null]).join("g");

    const tooltip = d3.select("#tooltip");

    svg.on("click", () => {
        // Clear filter when clicking background (root zoom)
        clearGlobalFilter('treemap');
        zoom(root);

        // Trigger update callback (will “un‐dim” everything again)
        if (onUpdate) onUpdate(applyFiltersAndRefresh());
    });

    zoom(root);

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
        // Apply all global filters (including the treemap filter we just set)
        const filteredRows = applyGlobalFilters(globalData);

        // Build a Set of “allowed” library IDs
        const allowed = new Set(filteredRows.map(r => r.Livraria));

        // Update styling of the network‐graph rather than rebuilding it
        updateNetworkStyles(allowed);

        // Rebuild the book catalog list (still based on filteredRows)
        createBooksCatalog(filteredRows);
    }

    function zoom(node) {
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
            clearGlobalFilter('treemap');
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

                if (isLeaf) {
                    // Leaf‐level filter
                    const filterFn = currentTreemapMode === 'category'
                        ? book =>
                            book.CatLit_Descricao === d.parent.data.name &&
                            book.GenLit_Descricao === d.data.name
                        : book => book.TradicaoIntelectual_Obra === d.data.name;

                    setGlobalFilter('treemap', filterFn);

                    // Zoom into the leaf
                    zoom(d);

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
                                zoom(root);
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
                    zoom(d);
                    let filterFn;
                    if (currentTreemapMode === 'category') {
                        if (d.depth === 1) {
                            filterFn = book => book.CatLit_Descricao === d.data.name;
                        }
                    } else {
                        filterFn = book => book.TradicaoIntelectual_Obra === d.data.name;
                    }

                    if (filterFn) {
                        setGlobalFilter('treemap', filterFn);
                    } else {
                        clearGlobalFilter('treemap');
                    }

                    if (onUpdate) onUpdate(applyFiltersAndRefresh());
                }
            });

        cellEnter.append("rect")
            .attr("fill", color)
            .on("mousemove", (event, d) => {
                const treemapRect = d3.select("#treemap").node().getBoundingClientRect();
                const x = event.pageX - treemapRect.left - window.scrollX;
                const y = event.pageY - treemapRect.top - window.scrollY;

                tooltip
                    .html(`<strong>${d.data.name}</strong><br>${d.value} books`)
                    .style("left", `${x + 10}px`)
                    .style("top", `${y + 10}px`)
                    .style("visibility", "visible");
            })
            .on("mouseout", () => {
                tooltip.style("visibility", "hidden");
            });

        cellEnter.append("text")
            .attr("pointer-events", "none")
            .attr("fill", "white")
            .attr("font-size", "10px")
            .text(d => d.data.name)
            .call(wrapText, d => d.x1 - d.x0 - 8);

        const cellUpdate = cellEnter.merge(cell);

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
