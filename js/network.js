let svg, linkGroup, nodeGroup, simulation, tooltip;
const selectedLinks = new Set();
const selectedNodes = new Set();
const linkKey = d => `${d.source.id || d.source}|${d.target.id || d.target}|${d.type}`;

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
    // treat any variant of “anónimo …”  or  “por classificar” as anonymous
    return norm === 'por classificar' ||
            norm.includes('anonimo');
}

function processNodes(data) {
    const grouped = d3.group(data, d => d.Livraria);
    return Array.from(grouped, ([key, vals]) => ({ id: key, size: vals.length }));
}

function processEdges(data) {
    const libs   = d3.group(data, d => d.Livraria);
    const libMap = new Map();
    const edges  = [];

    libs.forEach((rows, lib) => {

        const books = new Set(
            rows
                .filter(r => {
                    const t = r.Obra?.trim().toLowerCase();
                    return t && t !== 'por classificar'; // keep only meaningful titles
                })
                .map(r => r.Obra)
        );

        const authors = new Set(
            rows
                .filter(r => !isAnonymous(r.Nome_Autor)) // drop “anónimo” and “por classificar”
                .map(r => r.Nome_Autor)
        );

        libMap.set(lib, { books, authors });
    });

    // ---------- LINKS ----------
    const libsArr = Array.from(libMap.keys());
    for (let i = 0; i < libsArr.length; i++) {
        for (let j = i + 1; j < libsArr.length; j++) {
            const A = libMap.get(libsArr[i]);
            const B = libMap.get(libsArr[j]);

            const commonBooks   = [...A.books].filter(x => B.books.has(x)).length;
            const commonAuthors = [...A.authors].filter(x => B.authors.has(x)).length;

            if (commonBooks)
                edges.push({
                    source: libsArr[i],
                    target: libsArr[j],
                    type: 'book',
                    weight: commonBooks
                });
            if (commonAuthors)
                edges.push({
                    source: libsArr[i],
                    target: libsArr[j],
                    type: 'author',
                    weight: commonAuthors
                });
        }
    }
    return edges;
}

function ticked() {
    linkGroup.selectAll('path')
        .attr('d', d => {
            const dx = d.target.x - d.source.x;
            const dy = d.target.y - d.source.y;
            const dr = Math.sqrt(dx * dx + dy * dy);
            const sweep = d.type === 'book' ? 1 : 0;
            return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,${sweep} ${d.target.x},${d.target.y}`;
        });
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
    const w = container.node().getBoundingClientRect().width;
    const h = w * 0.6;
    const cx = w / 2, cy = h / 2;
    const orbitR = Math.min(w, h) * 0.35;

    svg = container.append('svg')
        .attr('viewBox', `0 0 ${w} ${h}`)
        .style('width', '100%')
        .style('height', 'auto');

    linkGroup = svg.append('g').attr('class', 'links');
    nodeGroup = svg.append('g').attr('class', 'nodes');
    tooltip   = d3.select('body').selectAll('.tooltip')
        .data([null]).join(
            enter => enter.append('div').attr('class', 'tooltip'),
            update => update,
            exit  => exit.remove()
        );

    simulation = d3.forceSimulation()
        .force('link',    d3.forceLink().id(d => d.id).distance(500).strength(0.1))
        .force('charge',  d3.forceManyBody().strength(-700))
        .force('collide', d3.forceCollide().radius(d => Math.sqrt(d.size) * 8 + 4).strength(1))
        .force('center',  d3.forceCenter(cx, cy))
        .force('x',       d3.forceX(cx).strength(0.001))
        .force('y',       d3.forceY(cy).strength(0.2))
        // radial force for isolates
        .force('radial',
            d3.forceRadial(d => d.degree === 0 ? orbitR : 0, cx, cy)
                .strength(0.6)
        )
        .on('tick', ticked);
}

function createNetworkGraph(containerSelector, data) {
    if (!svg) initNetwork(containerSelector);

    const nodes = processNodes(data);
    const edges = processEdges(data);

    const degree = new Map();
    // count links for each node
    edges.forEach(e => {
        degree.set(e.source,  (degree.get(e.source)  || 0) + 1);
        degree.set(e.target,  (degree.get(e.target)  || 0) + 1);
    });
    nodes.forEach(n => n.degree = degree.get(n.id) || 0);

    const bbox = d3.select(containerSelector).node().getBoundingClientRect();
    const width = bbox.width;
    const height = width * 0.6;
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const weights = edges.map(e => +e.weight);
    const [minW, maxW] = d3.extent(weights);
    const widthScale = d3.scaleLinear()
        .domain(
            weights.length === 0
                ? [0, 1]
                : minW === maxW
                    ? [minW - 1, maxW + 1]
                    : [minW, maxW]
        )
        .range([3, 10]);

    const linkSel = linkGroup.selectAll('path')
        .data(edges, d => `${d.source}|${d.target}|${d.type}`);
    linkSel.exit().remove();

    const linkEnter = linkSel.enter().append('path')
        .attr('class', d => `link ${d.type}`)
        .attr('stroke-width', d => widthScale(+d.weight))
        .on('mouseover', function(event, d) {
            tooltip.style('opacity', 1)
                .html(
                    d.type === 'book'
                        ? `${d.weight} book${d.weight > 1 ? 's' : ''} in common`
                        : `${d.weight} author${d.weight > 1 ? 's' : ''} in common`
                );
            d3.select(this).style('opacity', 1);
            const sourceId = d.source.id || d.source;
            const targetId = d.target.id || d.target;
            nodeGroup.selectAll('g.node')
                .classed('hovered',
                    n => (n.id === sourceId || n.id === targetId)
                );
        })
        .on('mousemove', event => {
            tooltip.style('left', (event.pageX + 10) + 'px')
                   .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', function(event, d) {
            tooltip.style('opacity', 0);
            if (selectedLinks.has(linkKey(d))) {
                d3.select(this).style('opacity', 1);
            } else {
                d3.select(this).style('opacity', 0.6);
            }
            const sourceId = d.source.id || d.source;
            const targetId = d.target.id || d.target;
            nodeGroup.selectAll('g.node')
                .classed('hovered', false);
        })
        .on('click', function(event, d) {
            const k = linkKey(d);
            selectedLinks.has(k) ? selectedLinks.delete(k) : selectedLinks.add(k);

            // update styling of every link
            svg.selectAll('.link')
                .classed('active', l => selectedLinks.has(linkKey(l)));

            // highlight nodes that belong to at least one active link
            svg.selectAll('g.node')
                .classed('selected-by-link', n =>
                    Array.from(selectedLinks).some(k =>
                        k.startsWith(n.id + '|') || k.includes('|' + n.id + '|')
                    )
                );

            if (selectedLinks.size) {
                const libMap = d3.group(data, row => row.Livraria);
                const filters = [];

                // ── Apply filtering logic for each selected link ──
                selectedLinks.forEach(k => {
                    const [a, b, type] = k.split('|');

                    let setA, setB;
                    if (type === 'book') {
                        // Only include non-empty titles ≠ "por classificar"
                        setA = new Set(
                            libMap.get(a)
                                .filter(r => {
                                    const t = r.Obra?.trim().toLowerCase();
                                    return t && t !== 'por classificar';
                                })
                                .map(r => r.Obra)
                        );
                        setB = new Set(
                            libMap.get(b)
                                .filter(r => {
                                    const t = r.Obra?.trim().toLowerCase();
                                    return t && t !== 'por classificar';
                                })
                                .map(r => r.Obra)
                        );
                    } else {
                        // type === 'author': only include non-anonymous authors
                        setA = new Set(
                            libMap.get(a)
                                .filter(r => !isAnonymous(r.Nome_Autor))
                                .map(r => r.Nome_Autor)
                        );
                        setB = new Set(
                            libMap.get(b)
                                .filter(r => !isAnonymous(r.Nome_Autor))
                                .map(r => r.Nome_Autor)
                        );
                    }

                    const common = new Set([...setA].filter(x => setB.has(x)));
                    filters.push(row =>
                        (row.Livraria === a || row.Livraria === b) &&
                        common.has(type === 'book' ? row.Obra : row.Nome_Autor)
                    );
                });

                setGlobalFilter('network', row => filters.some(f => f(row)));
            } else {
                clearGlobalFilter('network');
            }

            const filtered = applyGlobalFilters(globalData);
            createTreemap('#treemap-area', filtered, currentTreemapMode, () =>
                createBooksCatalog(applyGlobalFilters(globalData))
            );
            createBooksCatalog(filtered);
        });

    linkEnter.merge(linkSel);

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
            if (selectedNodes.has(d.id)) {
                selectedNodes.delete(d.id);
            } else {
                selectedNodes.add(d.id);
            }

            nodeGroup.selectAll('g.node')
                .classed('active', n => selectedNodes.has(n.id));

            if (selectedNodes.size > 0) {
                svg.classed('node-active-mode', true);
            } else {
                svg.classed('node-active-mode', false);
            }

            const libMap = d3.group(data, row => row.Livraria);
            const filters = [];

            // Retain any filters from selected links
            selectedLinks.forEach(key => {
                const [a, b, type] = key.split('|');
                const field = type === 'book' ? 'Obra' : 'Nome_Autor';
                const setA = new Set(libMap.get(a).map(r => r[field]));
                const setB = new Set(libMap.get(b).map(r => r[field]));
                const common = new Set([...setA].filter(x => setB.has(x)));
                filters.push(row =>
                    (row.Livraria === a || row.Livraria === b) && common.has(row[field])
                );
            });

            // Add filters for selected nodes
            selectedNodes.forEach(nodeId => {
                filters.push(row => row.Livraria === nodeId);
            });

            if (filters.length) {
                setGlobalFilter('network', row => filters.some(fn => fn(row)));
            } else {
                clearGlobalFilter('network');
            }

            const filtered = applyGlobalFilters(globalData);
            createTreemap(
                '#treemap-area',
                filtered,
                currentTreemapMode,
                () => createBooksCatalog(applyGlobalFilters(globalData))
            );
            createBooksCatalog(filtered);
        });
    nodeEnter.append('circle')
        .attr('r', d => Math.sqrt(d.size) * 6)
        .attr('stroke-width', 1);
    nodeEnter.append('text')
        .text(d => d.id)
        .each(function(d) { wrapText(d3.select(this), Math.sqrt(d.size) * 12); });
    nodeEnter.merge(nodeSel);

    simulation.nodes(nodes);
    simulation.force('link').links(edges);
    simulation.alpha(0.5).restart();
}
