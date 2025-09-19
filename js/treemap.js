let treemapSelection = null;

function createTreemap(selector, data, mode = 'category', onUpdate) {

    // Cleanup before redraw
    const container = d3.select(selector);
    container.selectAll("svg").remove(); // Remove all previous elements

    const rectFillColor  = (mode === 'category') ? '#16404D' : '#A6CDC6';
    const textFillColor  = (mode === 'category') ? '#FFFFFF' : '#16404D';

    // Determine rootData based on mode
    const rootData = (() => {
        if (mode === 'category') {
            return {
            name: i18n.t('treemap.mode.category'),
            children: Array.from(
                d3.group(
                data,
                d => normalizeLabel(d.CatLit_Descricao),
                d => normalizeLabel(d.GenLit_Descricao)
                ),
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
            name: i18n.t('treemap.mode.tradition'),
            children: Array.from(
                d3.group(data, d => normalizeLabel(d.TradicaoIntelectual_Obra)),
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

    const hideTreemapTip = () =>
        tooltip.style("opacity", "0").style("visibility", "hidden");

    hideTreemapTip();

    svg.on("click", () => {
        hideTreemapTip();
        skipNextTreemapRedraw = true;

        // Clear only the current mode’s classification filters
        if (currentTreemapMode === 'category') {
            clearGlobalFilter('byGenre');
            clearGlobalFilter('byCategory');
        } else {
            clearGlobalFilter('byTradition');
        }

        treemapSelection = null;
        updateTreemapBadge();

        createTreemap('#treemap-area', applyGlobalFilters(globalData), currentTreemapMode, updateDashboard);
        setTimeout(() => { skipNextTreemapRedraw = false; }, 0);
    });

    goToStoredPosition();

    function goToStoredPosition() {
        // if there are no child nodes (empty dataset) just zoom to root and quit
        if (!root.children || root.children.length === 0) {
            zoom(root);
            return;
        }

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
        hideTreemapTip();

        const childData = node.children
            ? node.children.map(d => d.data)
            : [node.data];

        const newRoot = d3.hierarchy({ name: node.data.name, children: childData })
            .sum(d => d.value)
            .sort((a, b) => b.value - a.value);

        d3.treemap()
            .size([width, height])
            .paddingInner(1)(newRoot);

        newRoot.originalParent = node.originalParent
                        || node.parent;

        const nodes = newRoot.children;

        const path  = d3.select("#treemap-breadcrumbs");

        const names = [];
        let p = node;
        while (p) {
            names.unshift(p.data.name);
            p = p.originalParent || p.parent;
        }

        const otherModeFiltered =
            (mode === 'category')
                ? !!(activeFilters.byTradition?.values?.length)
                : !!(activeFilters.byCategory?.values?.length || activeFilters.byGenre?.values?.length);

            // Use a display copy so navigation still uses the clean `names`
            const labelsForDisplay = names.slice();
            if (otherModeFiltered && labelsForDisplay.length > 0) {
                labelsForDisplay[0] = `${labelsForDisplay[0]} ${i18n.t('treemap.breadcrumb.filtered')}`;
            }

            const html = labelsForDisplay.map((label, i) => {
            const cls =
                    i === 0              ? 'crumb-root'
                : i === labelsForDisplay.length-1 ? 'crumb-leaf'
                : 'crumb-intermediate';
            const w   = i === labelsForDisplay.length-1 ? 'bold' : 'normal';
            const cur = i === labelsForDisplay.length-1 ? 'default' : 'pointer';
            return `<span class="${cls}" data-level="${i}"
                        style="cursor:${cur}; font-weight:${w};">
                        ${label}
                    </span>`;
            }).join('&nbsp;>&nbsp;');

            path.html(html);

        path.select('.crumb-root')
            .on('click', e => {
                hideTreemapTip();
                e.stopPropagation();
                if (names.length === 1) return;

                skipNextTreemapRedraw = true;

                // Clear only the current mode’s filters
                if (currentTreemapMode === 'category') {
                    clearGlobalFilter('byGenre');
                    clearGlobalFilter('byCategory');
                } else {
                    clearGlobalFilter('byTradition');
                }

                treemapSelection = null;
                updateTreemapBadge();

                createTreemap('#treemap-area', applyGlobalFilters(globalData), currentTreemapMode, updateDashboard);
                setTimeout(() => { skipNextTreemapRedraw = false; }, 0);
            });

        path.selectAll('.crumb-intermediate').on('click', (e) => {
            hideTreemapTip();
            e.stopPropagation();

            const targetLevel = +e.currentTarget.dataset.level;
            let a = root;
            for (let lvl = 1; lvl <= targetLevel; ++lvl) {
                const wanted = names[lvl];
                a = a.children?.find(n => n.data.name === wanted);
                if (!a) break;
            }
            if (!a) return;

            skipNextTreemapRedraw = true;

            if (currentTreemapMode === 'category') {
                if (targetLevel === 1) {
                    // Go to category level: keep category, drop genre
                    const catName = a.data.name;
                    treemapSelection = { cat: catName };

                    setGlobalFilter('byCategory',
                        r => normalizeLabel(r.CatLit_Descricao) === catName,
                        [catName],
                        'filter-category'
                    );
                    clearGlobalFilter('byGenre');
                } else {
                    treemapSelection = null;
                    clearGlobalFilter('byGenre');
                    clearGlobalFilter('byCategory');
                }
            } else {
                const tradName = a.data.name;
                treemapSelection = { trad: tradName };
                setGlobalFilter('byTradition',
                    r => normalizeLabel(r.TradicaoIntelectual_Obra) === tradName,
                    [tradName],
                    'filter-tradition'
                );
            }

            treemapFilterOrigin = currentTreemapMode;
            lastClassificationMode = currentTreemapMode;
            updateTreemapBadge();
            createTreemap(
                '#treemap-area',
                applyGlobalFilters(globalData),
                currentTreemapMode,
                updateDashboard
            );

            setTimeout(() => { skipNextTreemapRedraw = false; }, 0);
        });

        const t = group.transition().duration(750);

        const cell = group.selectAll("g.cell")
            .data(nodes, d => d.data.name);

        cell.exit().remove();

        const cellEnter = cell.enter().append("g")
            .classed("cell", true)
            .on("click", (event, d) => {
                hideTreemapTip();
                event.stopPropagation();

                const isLeaf   = !d.children;
                const isFull = (d.x0 === 0 && d.y0 === 0 && d.x1 === width && d.y1 === height);
                const initRect = { x0: d.x0, y0: d.y0, x1: d.x1, y1: d.y1 };

                skipNextTreemapRedraw = true;

                if (isLeaf) {
                    if (currentTreemapMode === 'category') {
                        // Leaf in category mode = a Genre. Set BOTH Category and Genre.
                        const catName = d.parent.data.name;
                        const genName = d.data.name;

                        treemapSelection = { cat: catName, gen: genName };

                        setGlobalFilter('byCategory',
                            r => normalizeLabel(r.CatLit_Descricao) === catName,
                            [catName],
                            'filter-category'
                        );
                        setGlobalFilter('byGenre',
                            r => normalizeLabel(r.GenLit_Descricao) === genName,
                            [genName],
                            'filter-genre'
                        );

                    } else {
                        // Leaf in tradition mode
                        const tradName = d.data.name;
                        treemapSelection = { trad: tradName };

                        setGlobalFilter('byTradition',
                            r => normalizeLabel(r.TradicaoIntelectual_Obra) === tradName,
                            [tradName],
                            'filter-tradition'
                        );
                    }

                    treemapFilterOrigin = currentTreemapMode;
                    lastClassificationMode = currentTreemapMode;
                    updateTreemapBadge();

                    if (isFull) {
                        createTreemap('#treemap-area',
                        applyGlobalFilters(globalData),
                        currentTreemapMode,
                        updateDashboard
                        );
                    } else {
                        zoom(d, initRect);
                    }

                    setTimeout(() => { skipNextTreemapRedraw = false; }, 0);
                    return;
                }

                // Non-leaf (intermediate) click
                if (currentTreemapMode === 'category' && d.depth === 1) {
                    const catName = d.data.name;
                    treemapSelection = { cat: catName };

                    setGlobalFilter('byCategory',
                        r => normalizeLabel(r.CatLit_Descricao) === catName,
                        [catName],
                        'filter-category'
                    );
                    // Drop any previous genre (we're at category level)
                    clearGlobalFilter('byGenre');

                    lastClassificationMode = currentTreemapMode;
                    createTreemap(
                        '#treemap-area',
                        applyGlobalFilters(globalData),
                        currentTreemapMode,
                        updateDashboard
                    );

                } else if (currentTreemapMode !== 'category') {
                    const tradName = d.data.name;
                    treemapSelection = { trad: tradName };

                    setGlobalFilter(
                        'byTradition',
                        r => normalizeLabel(r.TradicaoIntelectual_Obra) === tradName,
                        [tradName],
                        'filter-tradition'
                    );
                } else {
                    // clear only current mode’s filters
                    treemapSelection = null;
                    if (currentTreemapMode === 'category') {
                        clearGlobalFilter('byCategory');
                        clearGlobalFilter('byGenre');
                    } else {
                        clearGlobalFilter('byTradition');
                    }
                }

                treemapFilterOrigin = currentTreemapMode;
                updateTreemapBadge();

                zoom(d, initRect);
                setTimeout(() => { skipNextTreemapRedraw = false; }, 0);
            });

        const rectEnter = cellEnter.append("rect")
            .attr("fill", rectFillColor)
            .on("mousemove", (event, d) => {
                const treemapRect = d3.select("#treemap").node().getBoundingClientRect();
                const x = event.pageX - treemapRect.left - window.scrollX;
                const y = event.pageY - treemapRect.top - window.scrollY;
                const unit = i18n.plural(d.value, i18n.t('unit.book.one'), i18n.t('unit.book.many'));

                tooltip
                    .html(`<strong>${d.data.name}</strong><br>${d.value} ${unit}`)
                    .style("left", `${x + 20}px`)
                    .style("top", `${y - 30}px`)
                    .style("visibility", "visible")
                    .style("opacity", "1");
            })
            .on("mouseleave", hideTreemapTip)
            .on("mousedown", hideTreemapTip)
            .on("touchstart", hideTreemapTip);

        if (initRect) {
            rectEnter
                .attr("x",      initRect.x0)
                .attr("y",      initRect.y0)
                .attr("width",  initRect.x1 - initRect.x0)
                .attr("height", initRect.y1 - initRect.y0);
        }

        const textEnter = cellEnter.append("text")
            .attr("pointer-events", "none")
            .attr("fill", textFillColor)
            .attr("fill", "white")
            .text(d => d.data.name)
            .call(wrapText, d => d.x1 - d.x0 - 8);

        if (initRect) {
            textEnter
                .attr("x", initRect.x0 + 4)
                .attr("y", initRect.y0 + 14)
                .style("opacity", 0);
        }

        const cellUpdate = cellEnter.merge(cell);

        if (window.reapplySearchFocusIfAny) window.reapplySearchFocusIfAny();

        function highlightTreemapRect(book) {
            const bookCat = normalizeLabel(book.CatLit_Descricao);
            const bookGen = normalizeLabel(book.GenLit_Descricao);
            const bookTrad = normalizeLabel(book.TradicaoIntelectual_Obra);

            d3.selectAll(selector + " rect")
                .classed("hovered-treemap-rect", d => {
                if (mode === "category") {
                    const isLeaf = !d.children; // in the current zoom level
                    const parentName = d.parent?.data?.name || null;

                    // Highlight the category rect, and the matching genre within that category
                    if (isLeaf) {
                    return parentName === bookCat && d.data.name === bookGen;
                    }
                    return d.data.name === bookCat;
                } else if (mode === "tradition") {
                    return d.data.name === bookTrad;
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
            .attr("fill", rectFillColor)
            .transition(t)
            .attr("x", d => d.x0)
            .attr("y", d => d.y0)
            .attr("width", d => Math.max(0, d.x1 - d.x0))
            .attr("height", d => Math.max(0, d.y1 - d.y0));

        cellUpdate.select("text")
            .attr("fill", textFillColor)
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

    function normalizeLabel(v) {
        const t = (v ?? '').toString().trim();
        return t ? t : 'Em classificação';
    }
}
