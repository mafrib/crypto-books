let globalData;
let currentTreemapMode = 'category';
let treemapFilterOrigin = null;   // 'category' or 'tradition'
let lastClassificationMode = null;
let __searchFocusRows = null;
let skipNextTreemapRedraw = false;
const periodOrder = [
    'Por determinar',
    'Época Arcaica (VIII-V aC)',
    'Antiguidade Clássica (V aC-III)',
    'Antiguidade Tardia (III-VIII)',
    'Alta Idade Média (VIII-XI)',
    'Idade Média Central (XI-XIII)',
    'Baixa Idade Média (XIV-XV)'
];
window.highlightPeriodBar    = () => {};
window.clearPeriodHighlights = () => {};

function normalizeLabelForSearch(v) {
    const t = (v ?? '').toString().trim();
    return t ? t : 'Por classificar';
}

function normalizePeriod(v) {
    const t = (v ?? '').toString().trim();
    if (!t) return 'Por determinar';
    const lc = t.toLowerCase();
    if (lc === 'indeterminada' || lc === 'por determinar') return 'Por determinar';
    return t;
}

function applySearchFocus(rows) {
    __searchFocusRows = rows || [];

    const base = applyGlobalFilters(globalData);

    const idSet     = new Set(__searchFocusRows.map(r => r.ID_Cod));
    const libSet    = new Set(__searchFocusRows.map(r => (r.Proprietario_Nome || '').trim()));
    const periodSet = new Set(__searchFocusRows.map(r => normalizePeriod(r.EpocaHistorica_Autor)));

    const catSet  = new Set(__searchFocusRows.map(r => normalizeLabelForSearch(r.CatLit_Descricao)));
    const genSet  = new Set(__searchFocusRows.map(r => normalizeLabelForSearch(r.GenLit_Descricao)));
    const tradSet = new Set(__searchFocusRows.map(r => normalizeLabelForSearch(r.TradicaoIntelectual_Obra)));

    const genPairs = new Set();
        __searchFocusRows.forEach(r => {
            const c = normalizeLabelForSearch(r.CatLit_Descricao);
            const g = normalizeLabelForSearch(r.GenLit_Descricao);
            genPairs.add(`${c}|||${g}`);
    });

    // Map points
    d3.selectAll('circle.library-point')
        .classed('search-dim', true)
        .each(function(d) {
        const rowsHere = (d.filteredEntries && d.filteredEntries.length) ? d.filteredEntries : d.entries;
        const match = rowsHere && rowsHere.some(e => idSet.has(e.ID_Cod));
        if (match) d3.select(this).classed('search-dim', false);
        });

    // Period bars
    d3.selectAll('#period-filter .period-bar')
        .classed('search-dim', function(period) { return !periodSet.has(period); });

    // Treemap rects
    d3.selectAll('#treemap-area g.cell').each(function(d) {
        const rect = d3.select(this).select('rect');
        let match = false;

        if (currentTreemapMode === 'category') {
            const isLeaf = !d.children;

            if (!isLeaf) {
            // Category cells
                const catName = d.data.name;
                match =
                    catSet.has(catName) ||
                    Array.from(genPairs).some(p => p.startsWith(`${catName}|||`));
            } else {
                const catName = d.parent?.data?.name || '';
                const genName = d.data.name;

                match = genPairs.has(`${catName}|||${genName}`);

                if (!match && catSet.has(catName)) match = true;
            }
        } else {
            // Tradition mode
            match = tradSet.has(d.data.name);
        }

        rect.classed('search-dim', !match);
    });

    // Network: nodes
    const nodeSel = d3.select('#network-graph .network-wrapper').selectAll('g.node');
    nodeSel.classed('search-dim', d => !libSet.has(d.id));

    const linkSel = d3.select('#network-graph .network-wrapper').selectAll('.link');
    linkSel
        .classed('search-dim', l => {
            const src = l.source.id || l.source;
            const tgt = l.target.id || l.target;
            return !(libSet.has(src) && libSet.has(tgt));
        })
        .style('opacity', null);
}

function clearSearchFocus() {
    __searchFocusRows = null;

    // Map
    d3.selectAll('circle.library-point').classed('search-dim', false);

    // Period bars
    d3.selectAll('#period-filter .period-bar').classed('search-dim', false);

    // Treemap
    d3.selectAll('#treemap-area rect').classed('search-dim', false);

    // Network
    d3.select('#network-graph .network-wrapper').selectAll('g.node').classed('search-dim', false);
    d3.select('#network-graph .network-wrapper').selectAll('.link')
        .classed('search-dim', false)
        .style('opacity', null); // return to normal
}

// Reapply after redraws (filters, treemap mode switch, etc.)
function reapplySearchFocusIfAny() {
    if (__searchFocusRows && __searchFocusRows.length) {
        applySearchFocus(__searchFocusRows);
    }
}

window.applySearchFocus = applySearchFocus;
window.clearSearchFocus = clearSearchFocus;
window.reapplySearchFocusIfAny = reapplySearchFocusIfAny;

function showNoResultsPopup(prevSel) {
    pendingUndoNodes = prevSel;
    document.getElementById('no-results-popup').hidden = false;
    document.getElementById('modal-shield' ).hidden = false;
}

function installLocationLimitGuards() {
    const ul = document.getElementById('filter-location');
    if (!ul || ul.__limitGuardsInstalled) return;
    ul.__limitGuardsInstalled = true;

    const overCapAndUnchecked = (input) => {
        const selected = (activeFilters.byLocation?.values) || getChecked('filter-location');
        return selected.length >= 5 && input && !input.checked;
    };

    ul.addEventListener('click', (e) => {
        const input = e.target.closest('input[type="checkbox"]');
        if (!input) return;
        if (overCapAndUnchecked(input)) {
        e.preventDefault();
        e.stopPropagation();
        if (window.showLocationLimitToast) {
            window.showLocationLimitToast('You can select up to 5 locations.');
        }
        }
    }, true);

    ul.addEventListener('keydown', (e) => {
        if (e.key !== ' ' && e.key !== 'Enter') return;
        const input = e.target.closest('input[type="checkbox"]');
        if (!input) return;
        if (overCapAndUnchecked(input)) {
        e.preventDefault();
        e.stopPropagation();
        if (window.showLocationLimitToast) {
            window.showLocationLimitToast('You can select up to 5 locations.');
        }
        }
    }, true);

    // If the list’s contents are ever rebuilt, re-apply the limit immediately
    const observer = new MutationObserver(() => {
        const snapshot = (activeFilters.byLocation?.values) || getChecked('filter-location');
        if (window.enforceLocationMenuLimit) window.enforceLocationMenuLimit(snapshot);
    });
    observer.observe(ul, { childList: true, subtree: true });
    ul.__limitObserver = observer;
}

let __locCapRAF = null;

function enforceLocationMenuLimit(selectedOverride) {
    const list = document.getElementById('filter-location');
    if (!list) return;

    const snapshot = Array.isArray(selectedOverride)
        ? [...selectedOverride]
        : ((activeFilters.byLocation?.values) || getChecked('filter-location'));

    const selectedSet = new Set(snapshot);
    const limitReached = snapshot.length >= 5;

    list.querySelectorAll('input[type="checkbox"]').forEach(input => {
        const isChecked = selectedSet.has(input.value);

        if (input.checked !== isChecked) input.checked = isChecked;

        const shouldDisable = !isChecked && limitReached;
        input.disabled = shouldDisable;

        const li = input.closest('li');
        if (li) li.classList.toggle('disabled-option', shouldDisable);
    });

    bumpCounter(list);

    if (__locCapRAF) cancelAnimationFrame(__locCapRAF);
    __locCapRAF = requestAnimationFrame(() => {
        const list2 = document.getElementById('filter-location');
        if (!list2) return;

        const set2 = new Set(snapshot);
        const limit2 = snapshot.length >= 5;

        list2.querySelectorAll('input[type="checkbox"]').forEach(input => {
        const isChecked = set2.has(input.value);
        const shouldDisable = !isChecked && limit2;
        input.disabled = shouldDisable;

        const li = input.closest('li');
        if (li) li.classList.toggle('disabled-option', shouldDisable);
        });

        bumpCounter(list2);
    });
}

window.enforceLocationMenuLimit = enforceLocationMenuLimit;

function updateModalClearButton() {
    const btn = document.getElementById('clear-modal-filters');
    if (!btn) return;
    const isAny = Object.keys(activeFilters || {}).length > 0;
    btn.classList.toggle('disabled', !isAny);
    btn.disabled = !isAny;
}

function hideNoResultsPopup() {
  pendingUndoNodes = null;
  document.getElementById('no-results-popup').hidden = true;
  document.getElementById('modal-shield' ).hidden = true;
}

window.showNoResultsPopup  = showNoResultsPopup;
window.hideNoResultsPopup  = hideNoResultsPopup;

function handleEsc (evt) {
    if (evt.key === 'Escape') closeModal();
}

function handleOutsideClick (evt) {
    const clickedOnScrim   = evt.target.classList.contains('modal-scrim');
    const clickedOnBackdrop= evt.target === evt.currentTarget;
    if (clickedOnScrim || clickedOnBackdrop) closeModal();
}

function getConflictingFilters(rows, skip = []) {
    const ignore = new Set(skip);
    return Object.keys(activeFilters)
        .filter(k => !ignore.has(k))
        .filter(k => rows.every(r => !activeFilters[k].fn(r)));
}

function getConflictingFiltersForPeriod(periodName) {
    const rowsOfPeriod = globalData.filter(r =>
        normalizePeriod(r.EpocaHistorica_Autor) === periodName
    );

    return Object.keys(activeFilters)
        .filter(src => src !== 'period' && src !== 'byPeriod')
        .filter(src => rowsOfPeriod.every(row => !activeFilters[src].fn(row)));
}

function showConflictPopup(subjectLabel, filters, kind = 'library') {
    const prefix = {
        library : 'The library',
        period  : 'The historical period'
    }[kind] || 'The item';

    const msg = document.getElementById('conflict-msg');
    msg.innerHTML =
        `${prefix} “<strong>${subjectLabel}</strong>” has no books that match:` +
        '<br>' +
        filters.map(f => `• ${prettyFilterName(f)}`).join('<br>');

    document.getElementById('conflict-popup').hidden = false;
    document.getElementById('modal-shield' ).hidden = false;
}

function hideConflictPopup() {
    pendingNode   = null;
    document.getElementById('conflict-popup').hidden = true;
    document.getElementById('modal-shield' ).hidden = true;
}

window.hideConflictPopup = hideConflictPopup;

function prettyFilterName(src) {
    // helper that turns the internal filter-key into a label
    const map = {
        byCategory : 'Literary category',
        byAuthor   : 'Author',
        byIdioma   : 'Language',
        byLibrary  : 'Library',
        treemap    : "Books' classification",
        network    : 'Library',
        byLocation : 'Location'
    };

    if (src === 'byLocation') {
        const vals = activeFilters[src]?.values || [];
        const labels = vals.map(v => {
            const input = document.querySelector(`#filter-location input[value="${CSS.escape(v)}"]`);
            return input ? input.nextElementSibling.textContent.trim() : v;
        });
        const list = labels.length ? `: ${labels.join(', ')}` : '';
        return `Location${list}`;
    }

    if (src === 'byLibrary' || src === 'network') {
        const libs = activeFilters[src]?.values || [];
        const list = libs.length ? `: ${libs.join(', ')}` : '';
        return `Library${list}`;
   }

    /* add the concrete period(s) that are selected */
    if (src === 'period' || src === 'byPeriod') {
        const labels = Array.from(
        document.querySelectorAll('#period-filter .period-bar.selected .label')
        ).map(el => el.textContent.replace(/\s+/g, ' ').trim());

        const list = labels.length ? `: ${labels.join(', ')}` : '';
        return `Historical period${list}`;
    }

    if (src === 'treemap') {
        if (treemapSelection) {
            if (currentTreemapMode === 'category') {
                const {cat, gen} = treemapSelection;
                return `Books' classification: ${cat}${gen ? ' › ' + gen : ''}`;
            }
            return `Books' classification: ${treemapSelection.trad}`;
        }
        return "Books' classification";
    }

    return map[src] || src;
}


function openModal ()  {
    const modal = document.getElementById('filter-modal');
    modal.classList.add('open');

    rebuildFilterTags();

    modal.querySelectorAll('details[open]').forEach(d => d.open = false);

    document.addEventListener('keydown', handleEsc,  { once:false });
    modal.addEventListener   ('click',  handleOutsideClick);

    updateModalClearButton();
    wireFilterAccordionAndScroll();

}

function closeModal () {
    const modal = document.getElementById('filter-modal');
    modal.classList.remove('open');
    document.removeEventListener('keydown', handleEsc);
    modal.removeEventListener   ('click',  handleOutsideClick);
}

function updateFilterBadge() {
    const keys = Object.keys(activeFilters || {});
    const kset = new Set(keys);

    let count = 0;

    if (kset.has('network') || kset.has('byLibrary')) {
        count += 1;
        kset.delete('network');
        kset.delete('byLibrary');
    }

    if (kset.has('period') || kset.has('byPeriod')) {
        count += 1;
        kset.delete('period');
        kset.delete('byPeriod');
    }

    count += kset.size;

    const btn   = document.getElementById('filter-btn');
    const badge = document.getElementById('filter-badge');
    badge.textContent = count > 0 ? count : '';
    btn.classList.toggle('filters-active', count > 0);
}

function treemapFilterActive() {
    return !!(activeFilters && (
        activeFilters.treemap ||
        activeFilters.byCategory ||
        activeFilters.byGenre ||
        activeFilters.byTradition
    ));
}

function updateTreemapBadge() {
    const hasCat  = !!(activeFilters.byCategory?.values?.length || activeFilters.byGenre?.values?.length);
    const hasTrad = !!(activeFilters.byTradition?.values?.length);

    document.querySelectorAll('.mode-button').forEach(btn => {
        const mode = btn.dataset.mode;
        const show = (mode === 'category'  && hasCat) ||
                    (mode === 'tradition' && hasTrad);
        btn.classList.toggle('has-filter', show);
        ensureTreemapIndicator(btn);
    });
}

function ensureTreemapIndicator(btn) {
    let dot = btn.querySelector('.filter-indicator');
    if (!dot) {
        dot = document.createElement('span');
        dot.className = 'filter-indicator';
        dot.tabIndex = 0;
        dot.setAttribute('aria-label', 'Filter active');
        btn.appendChild(dot);
    }
}

function buildLocationOptions(data) {
    const map = new Map();
    data.forEach(r => {
        const key = locKeyFromRow(r);
        if (!key) return;
        const name = (r.LocalNasc_Autor || 'Unknown location').trim();
        const cur = map.get(key) || { value: key, label: name, count: 0 };
        cur.count++;
        if (!cur.label || cur.label === 'Unknown location') cur.label = name;
        map.set(key, cur);
    });
    return Array.from(map.values())
        .sort((a, b) => a.label.localeCompare(b.label));
}

function fillChecklist(listId, values, multi = true) {
    const ul = document.getElementById(listId);
    if (!ul) { console.warn(`[fillChecklist] Missing list #${listId}`); return; }

    ul.innerHTML = '';
    values.forEach(v => {
        const value = (typeof v === 'object' && v !== null) ? v.value : v;
        const label = (typeof v === 'object' && v !== null) ? (v.label ?? v.value) : v;
        const id = `${listId}-${CSS.escape(value)}`;
        const li = document.createElement('li');
        const type = multi ? 'checkbox' : 'radio';
        const nameAttr = type === 'radio' ? `name="${listId}"` : '';
        li.innerHTML =
        `<label for="${id}">` +
        `<input id="${id}" ${nameAttr} type="${type}" value="${value}">` +
        `<span class="chk-txt">${label || '–'}</span>` +
        `</label>`;
        ul.appendChild(li);
    });
}

// how many boxes are checked in a given checklist
function getChecked(listId) {
  return Array.from(
    document.querySelectorAll(`#${listId} input:checked`)
  ).map(c => c.value);
}

function switchMode(mode) {
    currentTreemapMode = mode;

    treemapSelection = selectionFromFiltersForMode(mode);

    const filteredData = applyGlobalFilters(globalData);

    createTreemap(
        '#treemap-area',
        filteredData,
        currentTreemapMode,
        updateDashboard
    );

    d3.selectAll('.mode-button').classed('active', false);
    d3.select(`.mode-button[data-mode="${mode}"]`).classed('active', true);
}

function isFemaleLibrary(rawName) {
  const lower = rawName.trim().toLowerCase();
  return lower.includes('d. leonor') || lower.includes('d. beatriz');
}

function populateFilterOptions() {
    const u = key => Array.from(new Set(globalData.map(d=>d[key]).filter(Boolean))).sort();

    fillChecklist('filter-library',   u('Proprietario_Nome'));
    fillChecklist('filter-author',    u('Nome_Autor'));
    fillChecklist('filter-idioma',    u('Idioma'));
    fillChecklist('filter-category',  u('CatLit_Descricao'),  false);
    fillChecklist('filter-tradition', u('TradicaoIntelectual_Obra'), false);
    fillChecklist('filter-genre',     u('GenLit_Descricao'),  false);
    fillChecklist('filter-location', buildLocationOptions(globalData));

    const normPeriodSet = new Set(globalData.map(d => normalizePeriod(d.EpocaHistorica_Autor)));
    const periods = periodOrder.filter(p => normPeriodSet.has(p));
    fillChecklist('filter-period', periods);

    fillChecklist('filter-probobra',  u('ProbAtribObra'));
    fillChecklist('filter-probautor', u('ProbAtribAutor'));
}

function rebuildFilterTags () {

    const tagsBox = document.getElementById('filter-tags');
    tagsBox.innerHTML = '';

    function addTag(label, removeFn) {
        const box = document.getElementById('filter-tags');
        if ([...box.children].some(t => t.firstChild.nodeValue.trim() === label))
            return;

        const tag  = document.createElement('div');
        tag.className = 'filter-tag';
        tag.textContent = label;

        const x = document.createElement('span');
        x.className = 'remove';
        x.textContent = '×';
        x.addEventListener('click', removeFn);
        tag.appendChild(x);

        tagsBox.appendChild(tag);
    }

    let periodTagAdded = false;
    for (const key of Object.keys(activeFilters)) {

        switch (key){

        case 'byLocation':
            getChecked('filter-location').forEach(v => {
                const input = document.querySelector(`#filter-location input[value="${CSS.escape(v)}"]`);
                const label = input ? input.nextElementSibling.textContent.trim() : v;

                addTag(`Location: ${label}`, () => {

                    uncheckValue('filter-location', v);

                    const remaining = getChecked('filter-location');
                    if (remaining.length) {
                        setGlobalFilter(
                        'byLocation',
                        r => {
                            const k = locKeyFromRow(r);
                            return k ? remaining.includes(k) : false;
                        },
                        remaining,
                        'filter-location'
                        );
                    } else {
                        clearGlobalFilter('byLocation');
                    }
                    if (window.enforceLocationMenuLimit) window.enforceLocationMenuLimit(getChecked('filter-location'));
                });
            });
            break;

        case 'byLibrary':
            if (activeFilters.network) break;
            getChecked('filter-library').forEach(v => addTag(v, () => {
                uncheckValue('filter-library', v);
                clearGlobalFilter('byLibrary');
            }));
            break;

        case 'byAuthor'   : getChecked('filter-author'   )
                            .forEach(v => addTag(v, () => {
                                uncheckValue('filter-author', v);
                                clearGlobalFilter('byAuthor');
                            }));
                            break;

        case 'byIdioma'   : getChecked('filter-idioma'   )
                            .forEach(v => addTag(v, () => {
                                uncheckValue('filter-idioma', v);
                                clearGlobalFilter('byIdioma');
                            }));
                            break;

        case 'byCategory' : getChecked('filter-category')
                            .forEach(v => addTag(`Literary Categories › ${v}`, () => {
                                // Uncheck category
                                uncheckValue('filter-category', v);
                                clearGlobalFilter('byCategory');
                                // Also uncheck/clear any genre
                                const curGenre = getChecked('filter-genre');
                                if (curGenre.length) {
                                    setChecked('filter-genre', []);
                                    clearGlobalFilter('byGenre');
                                }
                            }));
                            break;

        case 'byTradition': getChecked('filter-tradition')
                            .forEach(v => addTag(`Intellectual Tradition › ${v}`, () => {
                                uncheckValue('filter-tradition', v);
                                clearGlobalFilter('byTradition');
                            }));
                            break;

        case 'byGenre'    : getChecked('filter-genre')
                            .forEach(v => {
                                const cat = categoryOfGenre(v) || getChecked('filter-category')[0] || '';
                                const label = cat ? `${cat} › ${v}` : v;
                                addTag(label, () => {
                                    uncheckValue('filter-genre', v);
                                    clearGlobalFilter('byGenre');
                                });
                            });
                            break;

        case 'byPeriod' :
        case 'period'  :

            if (periodTagAdded) break;
            periodTagAdded = true;
            selectedPeriods.forEach(p => addTag(p, () => {
                selectedPeriods = [];
                d3.selectAll('#period-filter .period-bar').classed('selected', false);
                clearGlobalFilter('period');
                clearGlobalFilter('byPeriod');
            }));
            break;

        case 'treemap' :
            if (treemapSelection) {
                let tagLabel = '';
                if (currentTreemapMode === 'category') {
                    const {cat, gen} = treemapSelection;
                    tagLabel = gen ? `${cat} › ${gen}` : `Literary Categories › ${cat}`;
                } else {
                    tagLabel = `Intellectual Tradition › ${treemapSelection.trad}`;
                }
                addTag(tagLabel, () => {
                    treemapSelection    = null;
                    treemapFilterOrigin = null;
                    clearGlobalFilter('treemap');
                    createTreemap('#treemap-area',
                                    applyGlobalFilters(globalData),
                                    currentTreemapMode,
                                    updateDashboard);
                    updateTreemapBadge();
                });
            } else {
                addTag('Treemap', () => { clearGlobalFilter('treemap'); });
            }
            break;

        case 'network' :
            (activeFilters.network?.values || ['Network selection']).forEach(lib => {
                addTag(lib, () => {
                    selectedNodes.clear();
                    selectedLinks.clear();
                    clickedLinks.clear();
                    clearGlobalFilter('network');
                    svg.selectAll('.link')
                                .classed('active', false)
                                .style('opacity', null);

                    svg.selectAll('g.node')
                                .classed('active', false)
                                .classed('selected-by-link', false);

                    updateNetworkStyles(null);
                });
            });
            break;

        case 'byProbObra' :
            getChecked('filter-probobra').forEach(v=>addTag(`Book Attribution Probability: ${v}`, ()=>{
                uncheckValue('filter-probobra', v);
                clearGlobalFilter('byProbObra');
            }));
            break;

        case 'byProbAutor':
            getChecked('filter-probautor').forEach(v=>addTag(`Author Attribution Probability: ${v}`, ()=>{
                uncheckValue('filter-probautor', v);
                clearGlobalFilter('byProbAutor');
            }));
            break;

        default:
            addTag(key, () => clearGlobalFilter(key));
        }
  }
}

window.refreshFilterTags = rebuildFilterTags;
const refreshFilterTags  = rebuildFilterTags;

function uncheckValue(listId, value){
    document
        .querySelectorAll(`#${listId} input[value="${CSS.escape(value)}"]`)
        .forEach(cb => cb.checked = false);
    bumpCounter(document.getElementById(listId));
}

function wireSearch(inputEl, listEl) {
  inputEl.addEventListener('input', () => {
    const term = inputEl.value.trim().toLowerCase();
    listEl.querySelectorAll('li').forEach(li => {
      const txt = li.textContent.toLowerCase();
      li.style.display = term && !txt.includes(term) ? 'none' : '';
    });
  });
}

// update the (n) counter inside each <summary>
function bumpCounter(list) {
  const n = list.querySelectorAll('input:checked').length;
  const id = list.id;
  const counter = list.closest('details')
                     .querySelector(`[data-for="${id}"]`);
  if (counter) counter.textContent = n ? `(${n})` : '';
}

document.addEventListener('DOMContentLoaded', () => {
    // hook every checklist once the DOM exists
    document.querySelectorAll('.checklist').forEach(list => {
        list.addEventListener('change', (evt) => {

            const id = list.id;

            if (id === 'filter-location') {
                const checked = getChecked('filter-location');

                if (checked.length > 5 && evt && evt.target && evt.target.checked) {
                    evt.target.checked = false;

                    const fixed = getChecked('filter-location');

                    bumpCounter(list);
                    if (window.showLocationLimitToast) {
                    window.showLocationLimitToast('You can select up to 5 locations.');
                    }
                    enforceLocationMenuLimit(fixed);
                    return;
                }

                if (checked.length) {
                    setGlobalFilter(
                    'byLocation',
                    row => {
                        const k = locKeyFromRow(row);
                        return k ? checked.includes(k) : false;
                    },
                    checked,
                    'filter-location'
                    );
                } else {
                    clearGlobalFilter('byLocation');
                }

                enforceLocationMenuLimit(checked);
                bumpCounter(list);
                refreshFilterTags();
                updateFilterBadge();
                updateDashboard();
                return;
            }

            if (id === 'filter-category' || id === 'filter-genre') {
            lastClassificationMode = 'category';
            }
            if (id === 'filter-tradition') {
            lastClassificationMode = 'tradition';
            }

            commitChecklistFilters();

            if (id === 'filter-period') {
                window.selectedPeriods = (selectedPeriods || []).slice();

                if (window.rebuildDetailsItems) {
                    const latest = window.selectedPeriods[window.selectedPeriods.length - 1];
                    window.rebuildDetailsItems(latest);
                }
            }

            bumpCounter(list);
            refreshFilterTags();
            updateFilterBadge();
        });
    });

    document.getElementById('conflict-keep-btn')
          .addEventListener('click', hideConflictPopup);

    document.getElementById('conflict-clear-btn')
        .addEventListener('click', () => {
            document.getElementById('clear-btn').click();
            hideConflictPopup();
        });

    document.getElementById('undo-last-btn')
        .addEventListener('click', ()=> {
            if (!pendingUndoNodes) return;
            // restore previous node selection
            selectedNodes.clear();
            pendingUndoNodes.forEach(n=>selectedNodes.add(n));
            selectedPeriods = Array.from(pendingUndoNodes);
            window.selectedPeriods = selectedPeriods.slice();
            repaintPeriodBars(applyFiltersExcept(['period','byPeriod']));

            hideNoResultsPopup();

            svg.classed('node-active-mode', true);
            nodeGroup.selectAll('g.node')
                    .classed('active', d => selectedNodes.has(d.id));

            applyNetworkFilter(
                buildAllowedFromSelection(selectedNodes, selectedLinks),
                globalData
            );
        });

    document.getElementById('clear-filters-btn')
        .addEventListener('click', ()=> {
            document.getElementById('clear-btn').click();
            hideNoResultsPopup();
        });

    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('#treemap-controls .mode-button')
            .forEach(ensureTreemapIndicator);
        });

});

function redrawVisualisation(vizEl){
    switch (vizEl.id){
        case 'map-visualization':
            makeMap();
            updateDashboard();
            break;
        case 'network-graph':
            createNetworkGraph('#network-graph .network-wrapper', globalData);
            wireGenderButtons();

            const allowedSet = new Set(
                applyGlobalFilters(globalData)
                    .map(r => r.Proprietario_Nome.trim())
            );

            updateNetworkStyles(allowedSet);
            break;
        case 'treemap':
            createTreemap(
                '#treemap-area',
                applyGlobalFilters(globalData),
                currentTreemapMode,
                updateDashboard
            );
            break;
        case 'catalog':
            createBooksCatalog(applyGlobalFilters(globalData));
            break;
        default:
    }
}

function redrawAllViz () {
    makeMap();
    createTreemap(
        '#treemap-area',
        applyGlobalFilters(globalData),
        currentTreemapMode,
        updateDashboard
    );
}

function enableVizExpand() {
    document.querySelectorAll('.visualization').forEach(viz=>{
        if (viz.querySelector('.expand-btn')) return;

        const btn = document.createElement('button');
        btn.className = 'expand-btn';
        btn.setAttribute('aria-label', 'Maximize');
        btn.innerHTML = '<img src="../img/icons/maximize.png" alt="" aria-hidden="true">';
        (viz.querySelector('.viz-actions')
            || viz).appendChild(btn);

        btn.addEventListener('click', e=> {
            e.stopPropagation();
            viz.classList.contains('is-expanded')
                ? closeVizModal(viz.__modal, viz)
                : openVizModal(viz);
        });
  });
}

function wireFilterAccordionAndScroll() {
    const modal = document.getElementById('filter-modal');
    if (!modal) return;
    const container = modal.querySelector('.modal-body');
    if (!container) return;

    const groups = container.querySelectorAll('details');
    groups.forEach(d => {
        if (d.__wired) return;
        d.__wired = true;
        d.addEventListener('toggle', () => {
        if (!d.open) return;

        groups.forEach(other => { if (other !== d) other.open = false; });

        d.scrollIntoView({ block: 'start', behavior: 'smooth' });
        });
    });
}

function openVizModal(viz) {
    const modal  = document.createElement('div');
    modal.className = 'viz-modal';
    modal.innerHTML = '<div class="viz-panel"></div>';
    const panel = modal.firstElementChild;

    const ph = document.createElement('div');
    ph.className = 'viz-placeholder';
    viz.__placeholder = ph;
    viz.parentNode.insertBefore(ph, viz);   // occupy the cell

    viz.__origParent = viz.parentNode;
    viz.__origNext   = viz.nextSibling;
    viz.__modal      = modal;
    viz.classList.add('is-expanded');
    panel.appendChild(viz);

    const btn = viz.querySelector('.expand-btn');
    btn.querySelector('img').src = '../img/icons/minimize.png';
    btn.setAttribute('aria-label', 'Restore');

    modal.addEventListener('click', e=>{
        if (e.target === modal) closeVizModal(modal, viz);
    });

    function escListener (e) {
        if (e.key === 'Escape') closeVizModal(modal, viz);
    }
    document.addEventListener('keydown', escListener);
    modal.__escListener = escListener;

    document.body.appendChild(modal);
    requestAnimationFrame(()=>{
        redrawVisualisation(viz);
    });
}

function closeVizModal(modal, viz) {
    const {__origParent:p, __origNext:n} = viz;
    n ? p.insertBefore(viz,n) : p.appendChild(viz);
    viz.classList.remove('is-expanded');
    const btn = viz.querySelector('.expand-btn');
    btn.querySelector('img').src = '../img/icons/maximize.png';
    btn.setAttribute('aria-label', 'Maximize');
    if (viz.__placeholder){
        viz.__placeholder.remove();
        delete viz.__placeholder;
    }

    if (modal.__escListener) {
        document.removeEventListener('keydown', modal.__escListener);
        delete modal.__escListener;
    }

    modal.remove();
    requestAnimationFrame(()=>{
        redrawVisualisation(viz);
    });
}

function startDashboard() {
    clearDetailsPanel();
    document.getElementById("search-input").value = "";

    d3.csv("data/dataset.csv")
        .then((data) => {
            globalData = data.map(d => {
                const trimmed = (d.Obra ?? '').toString().trim();
                return {
                    ...d,
                    Obra: trimmed ? trimmed : 'Por classificar'
                };
            });
            window.globalData = globalData;
            const filteredData = applyGlobalFilters(globalData);
            updateUnlocatedBadge(filteredData);
            updateTreemapBadge();

            populateFilterOptions();
            installLocationLimitGuards();
            enforceLocationMenuLimit();

            wireSearch(
                document.querySelector('#filter-author').previousElementSibling,
                document.getElementById('filter-author')
            );
            wireSearch(
                document.querySelector('#filter-location').previousElementSibling,
                document.getElementById('filter-location')
            );
            wireSearch(
                document.querySelector('#filter-tradition').previousElementSibling,
                document.getElementById('filter-tradition')
            );
            wireSearch(
                document.querySelector('#filter-genre').previousElementSibling,
                document.getElementById('filter-genre')
            );

            let currentData = [...globalData];
            const initialSortColumn = "Proprietario_Nome";
            let sortedData = [...currentData].sort((a, b) =>
                a[initialSortColumn].localeCompare(b[initialSortColumn])
            );

            makeMap();

            createBooksCatalog(sortedData);
            setupSearchBar(globalData);
            setupSorting(sortedData, initialSortColumn);

            createNetworkGraph('#network-graph .network-wrapper', globalData);
            wireGenderButtons();

            const toggle = document.querySelector('.switch');
            if (toggle) {
                toggle.addEventListener('click', () => {
                    const isOn = toggle.getAttribute('aria-pressed') === 'true';
                    toggle.setAttribute('aria-pressed', isOn ? 'false' : 'true');

                    selectedNodes.clear();
                    clickedLinks.clear();
                    selectedLinks.clear();
                    currentCarouselLibs = [];
                    currentIndex = 0;
                    renderCarousel();
                    clearDetailsPanel();
                    svg.classed('node-active-mode', false);
                    nodeGroup.selectAll('g.node').classed('active', false).classed('selected-by-link', false);
                    linkGroup.selectAll('.link').classed('active', false).style('opacity', null);

                    createNetworkGraph('#network-graph .network-wrapper', globalData);
                    wireGenderButtons();

                    const filtered = applyGlobalFilters(globalData);
                    createBooksCatalog(filtered);
                    createTreemap(
                        '#treemap-area',
                        filteredData,
                        currentTreemapMode,
                        updateDashboard
                    );
                });
                toggle.addEventListener('keydown', e => {
                    if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        toggle.click();
                    }
                });
            }

            createTreemap(
                '#treemap-area',
                filteredData,
                currentTreemapMode,
                updateDashboard
            );

            d3.selectAll('.mode-button')
                .on('click', function() {
                    const mode = this.getAttribute('data-mode');
                    switchMode(mode);
                    updateTreemapBadge();
                });

            const filterBtn  = document.getElementById('filter-btn');
            const badge      = document.getElementById('filter-badge');

            const clearBtn = document.getElementById('clear-btn');
            clearBtn.addEventListener('click', () => {
                if (!clearBtn.classList.contains('active')) return;

                const input = document.getElementById('search-input');
                if (input && input.value) {
                    input.value = '';
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                } else {
                    if (window.clearSearchFocus) window.clearSearchFocus();
                }

                Object.keys(activeFilters).forEach(src => clearGlobalFilter(src));

                treemapFilterOrigin = null;
                lastClassificationMode = null;
                updateTreemapBadge();

                selectedPeriods = [];
                window.selectedPeriods = [];
                d3.selectAll('#period-filter .period-bar').classed('selected', false);

                selectedNodes.clear();
                clickedLinks.clear();
                selectedLinks.clear();
                svg.classed('node-active-mode', false);
                nodeGroup.selectAll('g.node')
                    .classed('active', false)
                    .classed('selected-by-link', false);
                linkGroup.selectAll('.link')
                    .classed('active', false)
                    .style('opacity', null);

                const cleanData = applyGlobalFilters(globalData);
                createNetworkGraph('#network-graph .network-wrapper', globalData);
                wireGenderButtons();
                createTreemap(
                    '#treemap-area',
                    cleanData,
                    currentTreemapMode,
                    updateDashboard
                );
                createBooksCatalog(cleanData);

                currentCarouselLibs = [];
                currentIndex = 0;
                renderCarousel();
                clearDetailsPanel();
                if (window.unpinBook) window.unpinBook();
                d3.selectAll('#catalog-entries .catalog-entry').classed('pinned', false);

                document.querySelectorAll('.checklist input:checked').forEach(cb => cb.checked = false);
                document.querySelectorAll('.checklist').forEach(list => bumpCounter(list));

                updateFilterBadge();
                refreshFilterTags();
                hideNoResultsPopup();

                if (window.selectedLocations) window.selectedLocations.clear();
                if (window.rebuildDetailsItems) window.rebuildDetailsItems();

                updateClearButton();
            });

            const modal      = document.getElementById('filter-modal');

            filterBtn.addEventListener('click', openModal);
            document.getElementById('close-modal').addEventListener('click', closeModal);

            document.getElementById('clear-modal-filters')
                .addEventListener('click', () => {
                    clearAllFilters();

                    document.querySelectorAll('.checklist input')
                            .forEach(cb => cb.checked = false);
                    document.querySelectorAll('.checklist')
                            .forEach(list => bumpCounter(list));

                    updateTreemapBadge();
                    rebuildFilterTags();
                    updateDashboard();
            });

            if (!document.querySelector('#filter-category input:checked, #filter-genre input:checked, #filter-tradition input:checked')) {
                clearGlobalFilter('treemap');
                treemapFilterOrigin = null;
                updateTreemapBadge();
            }


            document.getElementById('filter-modal')
                .addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });

            enableVizExpand();
            wireFilterAccordionAndScroll();
        })
        .catch((error) => {
            console.error("Error loading the CSV file:", error);
        });
}
