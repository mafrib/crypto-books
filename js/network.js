let svg, linkGroup, nodeGroup, simulation, tooltip;
let nodes, edges;
const selectedLinks = new Set();  // all currently selected (clicked + auto)
const clickedLinks = new Set();   // only those links the user explicitly clicked
const selectedNodes = new Set();  // libraries clicked
const linkKey = d => `${d.source.id || d.source}|${d.target.id || d.target}|${d.type}`;

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

    svg.selectAll('.link')
        .classed('active', l => selectedLinks.has(linkKey(l)));

    svg.selectAll('g.node')
        .classed('selected-by-link', n =>
        Array.from(selectedLinks).some(key =>
            key.startsWith(n.id + '|') || key.includes('|' + n.id + '|')
        )
        );

    const libMap = d3.group(allData, r => r.Proprietario_Nome);
    const filters = [];

    selectedNodes.forEach(id => {
        filters.push(r => r.Proprietario_Nome === id);
    });

    selectedLinks.forEach(key => {
        const [a, b, type] = key.split('|');

        const setA = type === 'book'
            ? new Set(
                libMap.get(a)
                    .filter(r => {
                    const t = r.Obra?.trim().toLowerCase();
                    return t && t !== 'por classificar';
                    })
                    .map(r => r.Obra)
                )
            : new Set(
                libMap.get(a)
                    .filter(r => !isAnonymous(r.Nome_Autor))
                    .map(r => r.Nome_Autor)
                );

        const setB = type === 'book'
            ? new Set(
                libMap.get(b)
                    .filter(r => {
                    const t = r.Obra?.trim().toLowerCase();
                    return t && t !== 'por classificar';
                    })
                    .map(r => r.Obra)
                )
            : new Set(
                libMap.get(b)
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
    });

    if (filters.length > 0) {
    setGlobalFilter('network',
        row => filters.some(fn => fn(row))
    );
    } else {
    clearGlobalFilter('network');
    }

    updateDashboard();
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
        setGlobalFilter('network', row =>
            allowedSet.has(row.Proprietario_Nome.trim())
        );
    } else {
        clearGlobalFilter('network');
    }

    updateDashboard();
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

function attachLinkTooltip(selection) {
    selection
        .on('mouseover.tooltip', function(event, d) {
        tooltip
            .style('visibility', 'visible')
            .style('opacity', 1)
            .html(
                d.type === 'book'
                    ? `${d.weight} book${d.weight>1?'s':''} in common`
                    : `${d.weight} author${d.weight>1?'s':''} in common`
            );
            d3.select(this).style('opacity', 1);
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
        d3.select(this)
            .style('opacity', selectedLinks.has(linkKey(d)) ? 1 : 0.6);
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
    return norm === 'por classificar' || norm.includes('anonimo');
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
                    return t && t !== 'por classificar';
                })
                .map(r => r.Obra)
        );
        const authors = new Set(
            rows
                .filter(r => !isAnonymous(r.Nome_Autor))
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
    linkGroup.selectAll('path')
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

    nodes = processNodes(data);
    edges = processEdges(data);
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
        .range([3,10]);

    const radiusScale = d3.scaleSqrt()
        .domain(d3.extent(nodes, d => d.size))
        .range([ width * 0.05, width * 0.09 ]);

    const linkSel = linkGroup.selectAll('path')
        .data(edges, d => linkKey(d));
    linkSel.exit().remove();

    const linkEnter = linkSel.enter().append('path')
        .attr('class', d => `link ${d.type}`)
        .attr('stroke-width', d => strokeScale(+d.weight))
        .attr('d', d => routedLink(d, nodes));

    attachLinkTooltip(linkEnter);

    linkEnter
        .merge(linkSel)
        .on('click', (event, d) => handleLinkClick(d, data))
        .on('mouseover', (event, d) => {
            svg.selectAll('g.node')
            .classed('hovered', n =>
                n.id === (d.source.id || d.source) ||
                n.id === (d.target.id || d.target)
            );
        })
        .on('mouseout',  (event, d) => {
            svg.selectAll('g.node').classed('hovered', false);
        });

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
            const id = d.id;
            if (selectedNodes.has(id)) {
                selectedNodes.delete(id);
            } else {
                selectedNodes.add(id);
            }

            nodeGroup.selectAll('g.node')
                .classed('active', n => selectedNodes.has(n.id));

            svg.classed('node-active-mode', selectedNodes.size > 0);

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
                .classed('active', l => selectedLinks.has(linkKey(l)))
                .style('opacity', l => selectedLinks.has(linkKey(l)) ? 1 : 0.6);

            svg.selectAll('g.node')
                .classed('selected-by-link', n =>
                    Array.from(selectedLinks).some(key =>
                        key.startsWith(n.id + '|') || key.includes('|' + n.id + '|')
                    )
                );

            applyNetworkFilter(
                buildAllowedFromSelection(selectedNodes, selectedLinks),
                data
            );

            const libs = Array.from(selectedNodes);
            currentCarouselLibs = libs;
            currentIndex = libs.indexOf(id);
            if (currentIndex < 0) currentIndex = 0;

            renderCarousel();

            if (libs.length > 0) {
                updateDetailsPanel(libs[currentIndex], globalData);
            } else {
                clearDetailsPanel();
            }
        });

    nodeEnter
        .on('mouseover', (event, d) => {
            updateDetailsPanel(d.id, globalData);
        })
        .on('mouseout',  () => {
            if (selectedNodes.size > 0) {
                const libs = Array.from(selectedNodes);
                updateDetailsPanel(libs[currentIndex], globalData);
            } else {
                clearDetailsPanel();
            }
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
  if (!svg) return;

  if (genderGraphActive) {
    linkGroup.selectAll('.link').style('opacity', null);

    if (selectedNodes.size === 0) {
      // no gender node clicked → both base colors, no "active" class
      svg.classed('node-active-mode', false);
      nodeGroup.selectAll('g.node')
        .classed('active', false);
    } else {
      svg.classed('node-active-mode', true);
      nodeGroup.selectAll('g.node')
        .classed('active', d => selectedNodes.has(d.id));
    }

    return;
  }

  const total = nodeGroup.selectAll('g.node').size();

  // Case 1: clicked every node
  if (selectedNodes.size === total) {
    svg.classed('node-active-mode', true);
    nodeGroup.selectAll('g.node').classed('active', true);
    linkGroup.selectAll('.link').style('opacity', 1);
    return;
  }

  // Case 2: no clicks & treemap filter allows everything
  if (allowedSet && allowedSet.size === total && selectedNodes.size === 0) {
    svg.classed('node-active-mode', false);
    nodeGroup.selectAll('g.node').classed('active', false);
    linkGroup.selectAll('.link').style('opacity', null);
    return;
  }

  // Case 3: links selected but no node clicks
  if (selectedLinks.size > 0 && selectedNodes.size === 0) {
    linkGroup.selectAll('.link')
      .style('opacity', d => selectedLinks.has(linkKey(d)) ? 1 : 0.6);
    return;
  }

  // Case 4: mixed (some nodes clicked or treemap filter)
  if (selectedNodes.size > 0) {
    svg.classed('node-active-mode', true);
    nodeGroup.selectAll('g.node')
      .classed('active', d => selectedNodes.has(d.id));
  } else if (allowedSet && allowedSet.size > 0) {
    svg.classed('node-active-mode', true);
    nodeGroup.selectAll('g.node')
      .classed('active', d => allowedSet.has(d.id));
  } else {
    svg.classed('node-active-mode', false);
    nodeGroup.selectAll('g.node').classed('active', false);
  }

  if (selectedLinks.size > 0) {
    linkGroup.selectAll('.link')
      .style('opacity', d => selectedLinks.has(linkKey(d)) ? 1 : 0.6);
  } else if (allowedSet && allowedSet.size > 0) {
    linkGroup.selectAll('.link')
      .style('opacity', d => {
        const s = d.source.id || d.source;
        const t = d.target.id || d.target;
        return (allowedSet.has(s) && allowedSet.has(t)) ? 1 : 0.6;
      });
  } else {
    linkGroup.selectAll('.link').style('opacity', null);
  }
}

function createGenderGraph(containerSelector, fullData) {

    clickedLinks.clear();
    selectedLinks.clear();
    selectedNodes.clear();

    svg.selectAll('.link').classed('active', false);
    svg.selectAll('g.node')
        .classed('active', false)
        .classed('selected-by-link', false);

    const containerEl = d3.select(containerSelector).node();
    const width  = containerEl.clientWidth;
    const height = containerEl.clientHeight;

    simulation.force('center', d3.forceCenter(width/2, height/2));

    const designW = 554, designH = 343;
    const scaleFactor = Math.min(width/designW, height/designH);
    const rFn = d => Math.sqrt(d.size) * 6 * scaleFactor;

    const femaleLibs = new Set();
    const maleLibs   = new Set();

    fullData.forEach(row => {
        const lib   = row.Proprietario_Nome.trim();
        const lower = lib.toLowerCase();

        const isFemale =
            lower.includes('d. leonor') ||
            lower.includes('d. beatriz');

        if (isFemale) femaleLibs.add(lib);
        else maleLibs.add(lib);
    });

    const groupedByLib = d3.group(fullData, d => d.Proprietario_Nome.trim());
    const libSizes = new Map();
    groupedByLib.forEach((rows, libName) => {
        libSizes.set(libName, rows.length);
    });

    let sumFemale = 0;
    let sumMale = 0;
    libSizes.forEach((size, libName) => {
        const lower = libName.toLowerCase();
        const isFemale =
            lower.includes('d. leonor') ||
            lower.includes('d. beatriz');
        if (isFemale) sumFemale += size;
        else           sumMale   += size;
    });

    nodes = [
        { id: 'Female owners', size: sumFemale, gender: 'female' },
        { id: 'Male owners',   size: sumMale,   gender: 'male'   }
    ];

    const femaleBooks = new Set();
    const maleBooks = new Set();
    const femaleAuthors = new Set();
    const maleAuthors = new Set();
    fullData.forEach(row => {
        const lib = row.Proprietario_Nome.trim();
        const lower = lib.toLowerCase();
        const isFemale = lower.includes('d. leonor') || lower.includes('d. beatriz');

        const book = row.Obra?.trim().toLowerCase();
        let author = row.Nome_Autor?.trim() || '';
        const norm = author.toLowerCase();

        if (isFemale) {
            if (book && book !== 'por classificar') femaleBooks.add(book);
        } else {
            if (book && book !== 'por classificar') maleBooks.add(book);
        }

        if (author && norm!== 'por classificar' && !norm.includes('anónimo')) {
            if (isFemale) femaleAuthors.add(author);
            else maleAuthors.add(author);
        }
    });

    const sharedBooksSet = new Set([...femaleBooks].filter(b => maleBooks.has(b)));
    const sharedAuthorsSet = new Set([...femaleAuthors].filter(a => maleAuthors.has(a)));
    const sharedBooksCount = sharedBooksSet.size;
    const sharedAuthorsCount = sharedAuthorsSet.size;

    edges = [
        {
        source: 'Male owners',
        target: 'Female owners',
        type: 'book',
        weight: sharedBooksCount
        },
        {
        source: 'Male owners',
        target: 'Female owners',
        type: 'author',
        weight: sharedAuthorsCount
        }
    ];

    const fontScale = d3.scaleSqrt()
        .domain(d3.extent(nodes, d => d.size))
        .range([16 * scaleFactor, 24 * scaleFactor]);

    addParallelMetadata(edges, 150);
    linkGroup.selectAll('path').remove();
    nodeGroup.selectAll('g.node').remove();

    const weights = edges.map(e => +e.weight);
    const [minW, maxW] = d3.extent(weights);
    const strokeScale = d3.scaleLinear()
        .domain(d3.extent(edges, e => +e.weight))
        .range([3,10]);

    const radiusScale = d3.scaleSqrt()
        .domain(d3.extent(nodes, d => d.size))
        .range([ width * 0.05, width * 0.09 ]);

    const linkSel = linkGroup.selectAll('path')
        .data(edges, d => `${d.source}|${d.target}|${d.type}`);

    const linkEnter = linkSel.enter().append('path')
        .attr('class', d => `link ${d.type}`)
        .attr('stroke-width', d => strokeScale(+d.weight))
        .attr('d', d => routedLink(d, nodes));;

    attachLinkTooltip(linkEnter);

    linkEnter
        .merge(linkSel)
        .on('click', (event, d) => {
            const src = d.source.id || d.source;
            const tgt = d.target.id || d.target;
            const type = d.type;
            const key = linkKey(d);

            // toggle clickedLinks & rebuild selectedLinks
            if (clickedLinks.has(key)) clickedLinks.delete(key);
            else clickedLinks.add(key);
            selectedLinks.clear();
            clickedLinks.forEach(k => selectedLinks.add(k));

            // update visual state of the links
            svg.selectAll('.link')
               .classed('active', l => selectedLinks.has(linkKey(l)));

            if (selectedLinks.size === 0) {
                svg.classed('node-active-mode', false);
                svg.selectAll('g.node')
                    .classed('active', false)
                    .classed('selected-by-link', false);
            }

            // apply a gender-specific filter over fullData
            if (selectedLinks.size > 0) {
                setGlobalFilter('network', row =>
                    (clickedLinks.has('Male owners|Female owners|book')   &&
                       sharedBooksSet.has(row.Obra?.trim().toLowerCase())
                    ) ||
                    (clickedLinks.has('Male owners|Female owners|author') &&
                       sharedAuthorsSet.has(row.Nome_Autor?.trim())
                    )
                );
            } else {
                clearGlobalFilter('network');
            }

           updateDashboard();
        });

    const nodeSel = nodeGroup.selectAll('g.node').data(nodes, d => d.id);

    const nodeEnter = nodeSel.enter().append('g')
        .attr('class', 'node')
        .on('click', (event, d) => {
            if (selectedNodes.has(d.id)) selectedNodes.delete(d.id);
            else selectedNodes.add(d.id);
            updateNetworkStyles(null);
        });

    nodeEnter
        .on('mouseover', (event, d) => {
            const previewLibs = d.id === 'Female owners'
            ? Array.from(femaleLibs)
            : Array.from(maleLibs);

            currentCarouselLibs = previewLibs;
            currentIndex = 0;
            renderCarousel();
            if (previewLibs.length)
                updateDetailsPanel(previewLibs[0], fullData);
        })
        .on('mouseout', () => {
            if (selectedNodes.size) {
                const libs = [];
                if (selectedNodes.has('Female owners')) libs.push(...femaleLibs);
                if (selectedNodes.has('Male owners'))   libs.push(...maleLibs);
                currentIndex = Math.min(currentIndex, libs.length - 1);
                renderCarousel();
                updateDetailsPanel(libs[currentIndex], fullData);
            } else {
                currentCarouselLibs = [];
                currentIndex = 0;
                renderCarousel();
                clearDetailsPanel();
            }
        }
    );

    nodeEnter.append('circle')
        .attr('r', d => rFn(d))
        .attr('class', d => `gender-circle ${d.gender}`);

    nodeEnter.append('text')
        .text(d => d.id)
        .attr('class', 'gender-label')
        .style('font-size', d => `${fontScale(d.size)}px`)
        .each(function(d) {
            const dia = Math.sqrt(d.size) * 6 * scaleFactor * 2;
            wrapText(d3.select(this), dia);
        });

    nodeEnter.merge(nodeSel)
        .on('click', (event, d) => {
            if (selectedNodes.has(d.id)) selectedNodes.delete(d.id);
            else selectedNodes.add(d.id);
            updateNetworkStyles(null);

            const allowed = new Set();
            if (selectedNodes.has('Female owners')) {
                femaleLibs.forEach(lib => allowed.add(lib));
            }
            if (selectedNodes.has('Male owners')) {
                maleLibs.forEach(lib => allowed.add(lib));
            }

            applyNetworkFilter(allowed, fullData);
            updateNetworkStyles(allowed);

            const libs = Array.from(allowed);
            currentCarouselLibs = libs;
            currentIndex = 0;
            renderCarousel();
            if (libs.length) {
                updateDetailsPanel(libs[0], fullData);
            } else {
                currentCarouselLibs = [];
                currentIndex = 0;
                renderCarousel();
                clearDetailsPanel();
            }
        });

    simulation.nodes(nodes);
    simulation.force('link').links(edges);
    simulation.alpha(0.5).restart();
}
