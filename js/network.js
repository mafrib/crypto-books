let svg, linkGroup, nodeGroup, simulation, tooltip;
let nodes, edges;
let allDataRef = null;
const selectedLinks = new Set();  // all currently selected (clicked + auto)
const clickedLinks = new Set();   // only those links the user explicitly clicked
const selectedNodes = new Set();  // libraries clicked
window.selectedLinks = selectedLinks;
window.clickedLinks  = clickedLinks;
window.selectedNodes = selectedNodes;
const linkKey = d => `${d.source.id || d.source}|${d.target.id || d.target}|${d.type}`;
window.linkKey = linkKey;

function linkLabel(key) {
    const [a, b, type] = key.split('|');
    const kind = (type === 'book')
        ? i18n.t('network.legend.books')
        : i18n.t('network.legend.authors');
    return `${kind}: ${a} ↔ ${b}`;
}

function rebuildNetworkFilterFromState(allData) {
    const filters = [];
    const labels  = [];

    const libMap = d3.group(allData, r => r.Proprietario_Nome);

    selectedNodes.forEach(id => {
        filters.push(r => r.Proprietario_Nome === id);
        labels.push(id);
    });

    selectedLinks.forEach(key => {
    const [a, b, type] = key.split('|');

    const isClicked = clickedLinks.has(key);
    // Only show/apply link filters when the link was explicitly clicked
    // AND neither endpoint library is selected.
    if (!isClicked) return;
    if (selectedNodes.has(a) || selectedNodes.has(b)) return;

    const setA = (type === 'book')
        ? new Set(
            (libMap.get(a) || [])
            .filter(r => {
                const t = r.Obra?.trim().toLowerCase();
                return t && t !== 'em classificação';
            })
            .map(r => r.Obra)
        )
        : new Set(
            (libMap.get(a) || [])
            .filter(r => !isAnonymous(r.Nome_Autor))
            .map(r => r.Nome_Autor)
        );

    const setB = (type === 'book')
        ? new Set(
            (libMap.get(b) || [])
            .filter(r => {
                const t = r.Obra?.trim().toLowerCase();
                return t && t !== 'em classificação';
            })
            .map(r => r.Obra)
        )
        : new Set(
            (libMap.get(b) || [])
            .filter(r => !isAnonymous(r.Nome_Autor))
            .map(r => r.Nome_Autor)
        );

    const common = new Set([...setA].filter(x => setB.has(x)));

    filters.push(row =>
        (row.Proprietario_Nome === a || row.Proprietario_Nome === b) &&
        (type === 'book'
        ? common.has(row.Obra)
        : common.has(row.Nome_Autor)
        )
    );

    labels.push(linkLabel(key));
    });

    if (filters.length > 0) {
        setGlobalFilter(
        'network',
        row => filters.some(fn => fn(row)),
        labels
        );
    } else {
        clearGlobalFilter('network');
    }
}

function handleLinkClick(d, allData) {
    const lk = linkKey(d);

    if (clickedLinks.has(lk)) clickedLinks.delete(lk);
    else clickedLinks.add(lk);

    const auto = new Set();
    edges.forEach(e => {
        const key = linkKey(e);
        const a = e.source.id || e.source, b = e.target.id || e.target;
        if (selectedNodes.has(a) && selectedNodes.has(b)) auto.add(key);
    });

    selectedLinks.clear();
    clickedLinks.forEach(k => selectedLinks.add(k));
    auto.forEach(k => selectedLinks.add(k));

    svg.selectAll('.link-group')
        .classed('active', l => selectedLinks.has(linkKey(l)));

    svg.selectAll('g.node')
        .classed('selected-by-link', n =>
            Array.from(selectedLinks).some(key =>
                key.startsWith(n.id + '|') || key.includes('|' + n.id + '|')
            )
        );

    rebuildNetworkFilterFromState(allData);

    // Check if the combination of all filters results in zero books
    const externalFiltersActive = Object.keys(activeFilters).some(k => k !== 'network');
    if (externalFiltersActive && clickedLinks.size > 0) {
        // Test if the current combination of filters produces any results
        const testResults = applyGlobalFilters(allData);

        if (testResults.length === 0) {
            // Store the previous state for undo
            const prevClickedLinks = new Set(clickedLinks);
            prevClickedLinks.delete(lk);

            window.showNoResultsPopup({
                type: 'link',
                clickedLinks: prevClickedLinks,
                selectedNodes: new Set(selectedNodes)
            });
        }
    }
}

function distPointToSegment(px, py, x1, y1, x2, y2) {
    const A = px - x1,  B = py - y1;
    const C = x2 - x1,  D = y2 - y1;
    const dot   = A * C + B * D;
    const lenSq = C * C + D * D;
    const t = Math.max(0, Math.min(1, dot / lenSq));
    const ex = x1 + t * C,  ey = y1 + t * D;
    return Math.hypot(px - ex, py - ey);
}

function routedLink(d, nodes) {
    const sx = d.source.x, sy = d.source.y;
    const tx = d.target.x, ty = d.target.y;

    const vx = tx - sx,  vy = ty - sy;
    const len = Math.hypot(vx, vy) || 1;
    const nx = -vy / len, ny =  vx / len;

    let offset = (d.parallelIndex || 0) * (d.parallelGap || 10);

    const margin = 20;
    nodes.forEach(n => {
        if (n === d.source || n === d.target) return;

        const radius = Math.sqrt(n.size) * 10;
        const dist   = distPointToSegment(n.x, n.y, sx, sy, tx, ty);

        if (dist < radius + margin) {
            const cross = (n.x - sx) * vy - (n.y - sy) * vx;
            const side  = cross >= 0 ? 1 : -1;
            const needed = radius + margin - dist;
            offset += side * needed;
        }
    });

    const cx = (sx + tx) / 2 + nx * offset;
    const cy = (sy + ty) / 2 + ny * offset;

    return `M${sx},${sy}Q${cx},${cy} ${tx},${ty}`;
}

function addParallelMetadata(edges, gap) {
    const byPair = d3.group(
        edges,
        e => {
        const a = e.source.id || e.source,
                b = e.target.id || e.target;
        return a < b ? `${a}|${b}` : `${b}|${a}`;
        }
    );

    byPair.forEach(list => {
        const mid = (list.length - 1) / 2;
        list.forEach((e, i) => {
        e.parallelIndex  = i - mid;
        e.parallelTotal  = list.length;
        e.parallelGap    = gap;
        });
    });
}

function applyNetworkFilter(allowedSet, data) {
    // set or clear the global filter
    if (allowedSet && allowedSet.size > 0) {
        setGlobalFilter(
            'network',
            row => allowedSet.has(row.Proprietario_Nome.trim()),
            Array.from(allowedSet)
        );
    } else {
        clearGlobalFilter('network');
    }
}

function buildAllowedFromSelection(nodesSet, linksSet) {
  const allowed = new Set();

  nodesSet.forEach(libId => {
    allowed.add(libId);
  });

  linksSet.forEach(key => {
    const [src, tgt, type] = key.split('|');
    allowed.add(src);
    allowed.add(tgt);
  });

  return allowed;
}

function buildGenderSets(data) {
    const libs = Array.from(new Set(
        data.map(r => r.Proprietario_Nome.trim())
    ));
    const females = new Set(libs.filter(name => window.isFemaleLibrary(name)));
    const males   = new Set(libs.filter(name => !window.isFemaleLibrary(name)));
    return { males, females };
}

function ensureGenderControls(containerSelector) {
    const container = d3.select(containerSelector).node();
    if (!container) return;

    // If the panel already exists, do nothing
    if (container.parentElement.querySelector('.network-gender-controls')) return;

    // Create the panel right after the wrapper
    const panel = document.createElement('div');
    panel.className = 'network-gender-controls';
    panel.setAttribute('aria-label', 'Quick gender filters');

    const maleBtn = document.createElement('button');
    maleBtn.id = 'gender-btn-male';
    maleBtn.className = 'gender-btn male';
    maleBtn.title = 'Male libraries';
    maleBtn.setAttribute('aria-pressed', 'false');
    maleBtn.innerHTML = '<img src="../img/icons/male.svg" alt="Male">';

    const femaleBtn = document.createElement('button');
    femaleBtn.id = 'gender-btn-female';
    femaleBtn.className = 'gender-btn female';
    femaleBtn.title = 'Female libraries';
    femaleBtn.setAttribute('aria-pressed', 'false');
    femaleBtn.innerHTML = '<img src="../img/icons/female.svg" alt="Female">';

    panel.appendChild(maleBtn);
    panel.appendChild(femaleBtn);

    // Insert after the network wrapper so it stays within the viz box
    container.parentElement.appendChild(panel);

    maleBtn.addEventListener('click', () => toggleGenderSelection('male'));
    femaleBtn.addEventListener('click', () => toggleGenderSelection('female'));
}

function toggleGenderSelection(kind) {
    const maleBtn   = d3.select('#gender-btn-male');
    const femaleBtn = d3.select('#gender-btn-female');

    const wasActive = (kind === 'male'
        ? maleBtn.classed('active')
        : femaleBtn.classed('active'));

    const maleActiveNext   = (kind === 'male')   ? !wasActive : maleBtn.classed('active');
    const femaleActiveNext = (kind === 'female') ? !wasActive : femaleBtn.classed('active');

    setGenderButtonState('male',   maleActiveNext);
    setGenderButtonState('female', femaleActiveNext);

    // Simplification rule: clicking these buttons replaces previous library selections
    selectedNodes.clear();
    clickedLinks.clear();
    selectedLinks.clear();

    setGenderButtonState('male', false);
    setGenderButtonState('female', false);

    const { males, females } = buildGenderSets(allDataRef || globalData);

    if (maleActiveNext)   males.forEach(id => selectedNodes.add(id));
    if (femaleActiveNext) females.forEach(id => selectedNodes.add(id));

    nodeGroup.selectAll('g.node')
        .classed('active', d => selectedNodes.has(d.id));

    applyNetworkFilter(
        buildAllowedFromSelection(selectedNodes, selectedLinks),
        allDataRef || globalData
    );

    const libs = Array.from(selectedNodes);
    if (window.rebuildDetailsItems) {
        window.rebuildDetailsItems(libs[0]);
    } else {
        currentCarouselLibs = libs;
        currentIndex = 0;
        renderCarousel();
        if (libs.length > 0) {
            updateDetailsPanel(libs[0], globalData);
        } else {
            clearDetailsPanel();
        }
    }
    syncGenderButtonsWithSelection();
}

function wireGenderButtons() {
    const male   = document.getElementById('gender-btn-male');
    const female = document.getElementById('gender-btn-female');
    if (!male || !female) return;

    // Avoid double-binding if this runs more than once
    if (!male.dataset.wired) {
        male.addEventListener('click', () => toggleGenderSelection('male'));
        male.dataset.wired = '1';
    }
    if (!female.dataset.wired) {
        female.addEventListener('click', () => toggleGenderSelection('female'));
        female.dataset.wired = '1';
  }
}

function setGenderButtonState(kind, active) {
    const btn = document.getElementById(kind === 'male' ? 'gender-btn-male' : 'gender-btn-female');
    if (!btn) return;
    btn.classList.toggle('active', !!active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
}

function syncGenderButtonsWithSelection() {
    const { males, females } = buildGenderSets(allDataRef || globalData);

    const maleActive = males.size > 0 && [...males].every(id => selectedNodes.has(id));
    const femaleActive = females.size > 0 && [...females].every(id => selectedNodes.has(id));

    setGenderButtonState('male', maleActive);
    setGenderButtonState('female', femaleActive);
}

function attachLinkTooltip(selection) {
    selection
        .on('mouseover.tooltip', function(event, d) {
            const isBook = d.type === 'book';
            const unit   = i18n.plural(d.weight,
                            i18n.t(isBook ? 'unit.book.one' : 'unit.author.one'),
                            i18n.t(isBook ? 'unit.book.many' : 'unit.author.many'));
            const suffix = i18n.t('export.common.inCommon');
            tooltip
                .style('visibility', 'visible')
                .style('opacity', 1)
                .html(`${d.weight} ${unit} ${suffix}`);
        })
        .on('mousemove.tooltip', event => {
            tooltip
                .style('left', (event.pageX+10)+'px')
                .style('top',  (event.pageY-10)+'px');
        })
        .on('mouseout.tooltip', function(event, d) {
            tooltip
                .style('opacity', 0)
                .style('visibility', 'hidden');
        });
}

function wrapText(textSelection, diameter) {
    const words = textSelection.text().split(/\s+/).reverse();
    let line = [], lineNum = 0;
    const lineHeight = 1.1;

    textSelection.text(null).append('tspan')
        .attr('x', 0).attr('y', 0).attr('dy', '0em');
    let tspan = textSelection.select('tspan');

    while (words.length) {
        const word = words.pop();
        line.push(word);
        tspan.text(line.join(' '));
        if (tspan.node().getComputedTextLength() > diameter - 10) {
            line.pop();
            tspan.text(line.join(' '));
            line = [word];
            tspan = textSelection.append('tspan')
                .attr('x', 0)
                .attr('dy', `${++lineNum * lineHeight}em`)
                .text(word);
        }
    }
}

function isAnonymous(name) {
    if (!name) return true;
    const norm = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .trim();
    return norm === 'nao aplicavel' || norm.includes('anonimo');
}

function processNodes(data) {
    const grouped = d3.group(data, d => d.Proprietario_Nome);
    return Array.from(grouped, ([key, vals]) => ({ id: key, size: vals.length }));
}

function processEdges(data) {
    const libs   = d3.group(data, d => d.Proprietario_Nome);
    const libMap = new Map();
    const edges  = [];

    libs.forEach((rows, lib) => {
        const books = new Set(
            rows
                .filter(r => {
                    const t = r.Obra?.trim().toLowerCase();
                    return t && t !== 'em classificação';
                })
                .map(r => r.Obra)
        );
        const authors = new Set(
            rows
                .filter(r => {
                    const authorName = r.Nome_Autor?.trim().toLowerCase()
                    return !isAnonymous(authorName) && authorName!== 'não aplicável'
                })
                .map(r => r.Nome_Autor)
        );
        libMap.set(lib, { books, authors });
    });

    const libsArr = Array.from(libMap.keys());
    for (let i = 0; i < libsArr.length; i++) {
        for (let j = i + 1; j < libsArr.length; j++) {
            const A = libMap.get(libsArr[i]);
            const B = libMap.get(libsArr[j]);

            const commonBooks   = [...A.books].filter(x => B.books.has(x)).length;
            const commonAuthors = [...A.authors].filter(x => B.authors.has(x)).length;

            if (commonBooks) {
                edges.push({
                    source: libsArr[i],
                    target: libsArr[j],
                    type: 'book',
                    weight: commonBooks
                });
            }
            if (commonAuthors) {
                edges.push({
                    source: libsArr[i],
                    target: libsArr[j],
                    type: 'author',
                    weight: commonAuthors
                });
            }
        }
    }
    return edges;
}

function ticked() {
    linkGroup.selectAll('.link-group')
        .selectAll('path')
        .attr('d', d => routedLink(d, nodes));

    nodeGroup.selectAll('g.node')
        .attr('transform', d => `translate(${d.x},${d.y})`);
}

function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = event.x; d.fy = event.y;
}
function dragged(event, d) {
    d.fx = event.x; d.fy = event.y;
}
function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null; d.fy = null;
}

function initNetwork(containerSelector) {
    const container = d3.select(containerSelector);
    const w = container.node().clientWidth;
    const h = container.node().clientHeight;
    const cx = w / 2, cy = h / 2;
    const orbitR = Math.min(w, h) * 0.35;

    const designW = 554, designH = 343;
    const scaleFactor = Math.min(w / designW, h / designH);


    container.selectAll('svg').remove();

    svg = container.append('svg')
        .style('width', '100%')
        .style('height', '100%');

    linkGroup = svg.append('g').attr('class', 'links');
    nodeGroup = svg.append('g').attr('class', 'nodes');

    window.svg       = svg;
    window.nodeGroup = nodeGroup;

    function highlightNetworkNode(libraryName) {
    d3.selectAll('g.node')
        .classed('hovered-network-node',
        d => d.id === libraryName
        );
    }

    function clearNetworkHighlights() {
    d3.selectAll('g.node')
        .classed('hovered-network-node', false);
    }

    window.highlightNetworkNode   = highlightNetworkNode;
    window.clearNetworkHighlights = clearNetworkHighlights;

    tooltip   = d3.select('body').selectAll('.tooltip')
        .data([null]).join(
            enter => enter.append('div').attr('class', 'tooltip'),
            update => update,
            exit  => exit.remove()
        );

    simulation = d3.forceSimulation()
        .force('link',    d3.forceLink().id(d => d.id).distance(200 * scaleFactor).strength(0.15))
        .force('charge',  d3.forceManyBody().strength(-1200 * scaleFactor))
        .force('collide', d3.forceCollide().radius(d => Math.sqrt(d.size) * 6 * scaleFactor + 8).strength(1))
        .force('center',  d3.forceCenter(cx, cy))
        .force('x',       d3.forceX(cx).strength(0.002))
        .force('y',       d3.forceY(cy).strength(0.2))
        .force('radial',  d3.forceRadial(orbitR, cx, cy).strength(0.8))
        .on('tick', ticked);
}

function createNetworkGraph(containerSelector, data) {
    initNetwork(containerSelector);

    allDataRef = data;

    ensureGenderControls(containerSelector);

    nodes = processNodes(data);
    edges = processEdges(data);
    window.edges = edges;
    addParallelMetadata(edges, 80);

    // count links for each node
    const degree = new Map();
    edges.forEach(e => {
        degree.set(e.source, (degree.get(e.source) || 0) + 1);
        degree.set(e.target, (degree.get(e.target) || 0) + 1);
    });
    nodes.forEach(n => n.degree = degree.get(n.id) || 0);

    const containerEl = d3.select(containerSelector).node();
    const width     = containerEl.clientWidth;
    const height = containerEl.clientHeight;

    const designW = 554;
    const designH = 343;
    const scaleFactor = Math.min(width / designW, height / designH);

    const fontScale = d3.scaleSqrt()
        .domain(d3.extent(nodes, d => d.size))
        .range([9 * scaleFactor, 16 * scaleFactor]);

    simulation.force('center', d3.forceCenter(width/2, height/2));

    const weights = edges.map(e => +e.weight);
    const [minW, maxW] = d3.extent(weights);
    const strokeScale = d3.scaleLinear()
        .domain(d3.extent(edges, e => +e.weight))
        .range([3.5,11]);

    const radiusScale = d3.scaleSqrt()
        .domain(d3.extent(nodes, d => d.size))
        .range([ width * 0.05, width * 0.09 ]);

    const linkSel = linkGroup.selectAll('path')
        .data(edges, d => linkKey(d));
    linkSel.exit().remove();

    const linkEnter = linkSel.enter().append('g')
    .attr('class', d => `link-group ${d.type}`);

    // Add invisible thicker path for better hitbox
    linkEnter.append('path')
        .attr('class', d => `link-hitbox ${d.type}`)
        .attr('stroke-width', d => Math.max(strokeScale(+d.weight), 8)) // Minimum 8px hitbox
        .attr('d', d => routedLink(d, nodes))
        .style('opacity', 0)
        .style('pointer-events', 'stroke');

    // Add visible thinner path
    linkEnter.append('path')
        .attr('class', d => `link ${d.type}`)
        .attr('stroke-width', d => strokeScale(+d.weight))
        .attr('d', d => routedLink(d, nodes));

    const linkGroups = linkEnter.merge(linkSel);

    linkGroups
        .on('click', (event, d) => handleLinkClick(d, data))
        .on('mouseover', (event, d) => {
            const hoveredKey = linkKey(d);

            // Highlight connected nodes
            svg.selectAll('g.node')
                .classed('hovered', n =>
                    n.id === (d.source.id || d.source) ||
                    n.id === (d.target.id || d.target)
                );

            // Dim all other links
            svg.selectAll('.link-group')
                .classed('dimmed', l => linkKey(l) !== hoveredKey);
        })
        .on('mouseout', (event, d) => {
            // Clear node highlighting and dimming
            svg.selectAll('g.node')
                .classed('hovered', false);

            // Remove dimming from all links
            svg.selectAll('.link-group').classed('dimmed', false);
        });

    attachLinkTooltip(linkGroups);

    const nodeSel = nodeGroup.selectAll('g.node').data(nodes, d => d.id);
    nodeSel.exit().remove();

    const nodeEnter = nodeSel.enter().append('g')
        .attr('class', 'node')
        .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended)
        )
        .on('click', function(event, d) {

            const prevSelection = new Set(selectedNodes);

            const libsFilterVals = (window.activeFilters?.byLibrary?.values) || [];
            if (selectedNodes.size === 0 && libsFilterVals.length) {
                libsFilterVals.forEach(id => selectedNodes.add(id));
                nodeGroup.selectAll('g.node').classed('active', n => selectedNodes.has(n.id));
            }

            const allowedSet = new Set(
                applyFiltersExcept(['network','byLibrary'])
                .map(r => r.Proprietario_Nome.trim())
            );

            if (!allowedSet.has(d.id)) {
                const blockers = getConflictingFilters(
                    globalData.filter(r => r.Proprietario_Nome.trim() === d.id),
                    ['network','byLibrary']
                );
                if (blockers.length) {
                    showConflictPopup(d.id, blockers, 'library');
                    return;
                }
            }

            if (selectedNodes.size === 0 &&
                Object.keys(activeFilters).some(k => k !== 'network')) {
                applyGlobalFilters(globalData)
                .forEach(r => selectedNodes.add(r.Proprietario_Nome.trim()));
            } else if (selectedNodes.size === 0) {
                clearGlobalFilter('network');
                nodeGroup.selectAll('g.node').classed('active', false);
                linkGroup.selectAll('.link-group').style('opacity', null);
                updateDashboard();
            } else {
                window.hideNoResultsPopup();
                applyNetworkFilter(
                    buildAllowedFromSelection(selectedNodes, selectedLinks),
                    data
                );
            }

            const id = d.id;
            if (selectedNodes.has(id)) {
                selectedNodes.delete(id);
            } else {
                selectedNodes.add(id);
            }

            nodeGroup.selectAll('g.node')
                .classed('active', n => selectedNodes.has(n.id));

            // 1) Recompute autoSelectedLinks from selectedNodes
            const autoSelectedLinks = new Set();
            edges.forEach(link => {
                const key = linkKey(link);
                const src = link.source.id || link.source;
                const tgt = link.target.id || link.target;
                if (selectedNodes.has(src) && selectedNodes.has(tgt)) {
                    autoSelectedLinks.add(key);
                }
            });

            // Rebuild selectedLinks = union(clickedLinks, autoSelectedLinks)
            selectedLinks.clear();
            clickedLinks.forEach(key => selectedLinks.add(key));
            autoSelectedLinks.forEach(key => selectedLinks.add(key));

            // Update CSS classes
            svg.selectAll('.link')
                .classed('active', l => selectedLinks.has(linkKey(l)));

            svg.selectAll('g.node')
                .classed('selected-by-link', n =>
                    Array.from(selectedLinks).some(key =>
                        key.startsWith(n.id + '|') || key.includes('|' + n.id + '|')
                    )
                );

            const curLibs = Array.from(selectedNodes);

            if (window.setChecked) window.setChecked('filter-library', curLibs);
            if (activeFilters.byLibrary) clearGlobalFilter('byLibrary');

            // Rebuild the network filter and UI state
            const externalFiltersActive = Object.keys(activeFilters).some(k => k !== 'network');
            if (selectedNodes.size === 0 && selectedLinks.size === 0 && externalFiltersActive) {
                setGlobalFilter('network', () => false);
                updateDashboard();
                nodeGroup.selectAll('g.node').classed('active', false);
                linkGroup.selectAll('.link-group').style('opacity', null);
                window.showNoResultsPopup(prevSelection);
            } else {
                window.hideNoResultsPopup();
                rebuildNetworkFilterFromState(data);
                syncGenderButtonsWithSelection();
            }

            // Keep details panel current
            if (window.rebuildDetailsItems) {
                window.rebuildDetailsItems(d.id);
            }
        });

    nodeEnter
        .on('mouseover', (event, d) => {
            if (window.showDetailsHover) window.showDetailsHover({ type: 'library', id: d.id, label: d.id });
        })
        .on('mouseout',  () => {
            if (window.clearDetailsHover) window.clearDetailsHover();
        });

    nodeEnter.append('circle')
        .attr('r', d => Math.sqrt(d.size) * 6 * scaleFactor)
        .attr('stroke-width', 1);
    nodeEnter.append('text')
        .text(d => d.id)
        .style('font-size', d => `${fontScale(d.size)}px`)
        .each(function(d) {
            const dia = Math.sqrt(d.size) * 6 * scaleFactor * 2;
            wrapText(d3.select(this), dia);
        });
    nodeEnter.merge(nodeSel);

    simulation.nodes(nodes);
    simulation.force('link').links(edges);
    simulation.alpha(0.5).restart();
}

function updateNetworkStyles(allowedSet) {
    const nodesSel = nodeGroup.selectAll('g.node');
    const linksSel = linkGroup.selectAll('.link-group');

    if (!allowedSet) {
        allowedSet = new Set(
            applyGlobalFilters(globalData)
              .map(r => r.Proprietario_Nome.trim())
        );
    }

    const externalFiltersActive =
        Object.keys(activeFilters).some(k => k !== 'network');

    const networkSelectionActive =
        selectedNodes.size > 0 || selectedLinks.size > 0;

    if (!externalFiltersActive) {
        svg.classed('node-active-mode', networkSelectionActive);

        if (networkSelectionActive) {
            nodesSel.classed('active', d => selectedNodes.has(d.id));
            linksSel.classed('active', l => selectedLinks.has(linkKey(l)));
        } else {
            nodesSel.classed('active', false);
            linksSel.classed('active', false);
        }

        linksSel.style('opacity', null);
        return;
    }

    svg.classed('node-active-mode', true);

    nodesSel.classed('active', d => allowedSet.has(d.id));
    linksSel.classed('active', d =>
        allowedSet.has(d.source.id) && allowedSet.has(d.target.id)
    );

    linksSel.style('opacity', null);
}

window.rebuildNetworkFilterFromState = rebuildNetworkFilterFromState;
