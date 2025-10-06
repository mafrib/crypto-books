document.addEventListener('DOMContentLoaded', () => {
    const t = (k) => (window.i18n ? i18n.t(k) : k);

    const rowsNow = () => applyGlobalFilters(globalData);

    const saveBlob = (str, name, mime) => {
        const url = URL.createObjectURL(new Blob([str], {type: mime}));
        Object.assign(document.createElement('a'), {href: url, download: name}).click();
        URL.revokeObjectURL(url);
    };

    /* ---------- dropdown ---------- */
    const btn   = document.getElementById('export-btn');
    const menu  = document.getElementById('export-menu');

    btn.addEventListener('click', e=> {
        menu.classList.toggle('open');
        btn.setAttribute('aria-expanded', menu.classList.contains('open'));
    });
    document.addEventListener('click', e=> {
        if (!menu.contains(e.target) && !btn.contains(e.target))
            menu.classList.remove('open');
    });

    /* ---------- CSV ---------- */
    document.getElementById('export-csv').addEventListener('click', () => {
        saveBlob(d3.csvFormat(rowsNow()), 'crypto-books.csv', 'text/csv');
        menu.classList.remove('open');
    });

    /* ---------- PDF ---------- */
    document.getElementById('export-pdf').addEventListener('click', async () => {

        const {jsPDF} = window.jspdf;
        const pdf  = new jsPDF({orientation:'p', unit:'mm', format:'a4'});
        const mar  = 12;
        const teal = [22,64,77];
        const rows = rowsNow(); // filtered dataset
        const pageW = pdf.internal.pageSize.getWidth()  - mar*2;
        const pageH = pdf.internal.pageSize.getHeight() - mar*2;

        let y = mar;
        const newPage = () => { pdf.addPage(); y = mar; };
        const ensure = h => { if (y+h > pageH) newPage(); };
        const section = titleTxt => {
            ensure(20);
            pdf.setFont('helvetica','bold').setFontSize(11).setTextColor(...teal)
                .text(titleTxt, mar, y);
            y += 6;
        };

        /* ===== cover page =============================================== */
        pdf.setFont('helvetica','bold').setFontSize(18).setTextColor(...teal)
            .text('Crypto-Books', mar, y);
        y += 6;

        pdf.setFont('helvetica','normal').setFontSize(9).setTextColor(80)
            .text(
                t('export.cover.note'),
                mar, y, {maxWidth: pageW}
            );
        y += 8;

        const shot = await html2canvas(
        document.querySelector('.dashboard-wrap'),
        {backgroundColor:'#FFFFFF', scale:2}
        );
        const imgW = pageW, imgH = shot.height * imgW / shot.width;
        pdf.addImage(shot.toDataURL('image/png'), 'PNG', mar, y, imgW, imgH);
        y += imgH + 8;

        /* ---- filters --------------------------------------------------- */

        /* ---------- helper that turns any filter value into a clean string */
        const formatFilterValue = v => {
            if (v == null)              return '';
            if (typeof v === 'string')  return v;
            if (Array.isArray(v))       return v.map(formatFilterValue).join(', ');

            if (typeof v === 'object') {
                if (v.readable) return v.readable;
                if (v.label)    return v.label;
                if (v.value)    return formatFilterValue(v.value);
                if (v.values)   return formatFilterValue(v.values);

                return Object.values(v)
                    .filter(x => typeof x !== 'function')
                    .map(formatFilterValue)
                    .filter(Boolean)
                    .join(', ');
            }
            return String(v);
        };

        pdf.setFont('helvetica','bold').setFontSize(12).setTextColor(...teal)
            .text(t('export.filters.title'), mar, y);
        y += 5;

        const toString = v => {
            if (Array.isArray(v)) return v.map(toString).join(', ');
            if (typeof v === 'object') return v.label || v.name || Object.values(v).join(', ');
            return String(v);
        };

        if (!Object.keys(activeFilters).length) {
            pdf.setFont('helvetica','normal').setFontSize(9).setTextColor(0,0,0)
            .text(t('export.filters.none'), mar + 2, y);
            y += 5;
        } else {
            pdf.setFontSize(9);
            Object.entries(activeFilters).forEach(([key, val]) => {
            const labelPure  = prettyFilterName(key).split(':')[0];
            const labelText  = '• ' + labelPure + ': ';

            pdf.setFont('helvetica','bold');
            pdf.text(labelText, mar, y);

            const x = mar + pdf.getTextWidth(labelText);
            pdf.setFont('helvetica','normal');
            pdf.text(
                formatFilterValue(val),
                x, y,
                {maxWidth: pageW - (x - mar)}
            );
            y += 4;
            });

        }

        newPage();

        const GAP = 16;

        /* ===== Authors & books per location ============================= */
        section(t('export.section.loc'));

        const locAgg = d3.rollups(
            rows,
            v => ({
                books   : v.length,
                authors : Array.from(new Set(v.map(d=>d.Nome_Autor))).sort()
            }),
            d => d.LocalNasc_Autor || 'Unknown'
        ).sort((a,b)=>d3.descending(a[1].books,b[1].books));

        const locBody = locAgg.map(([loc,o])=>[
            loc,
            o.authors.join('\n'),         // one author per line
            o.books
            ]);

        pdf.autoTable({
            head:[[ t('export.loc.header.location'), t('export.loc.header.author'), t('export.loc.header.numBooks') ]],
            body:locBody,
            startY:y,
            margin:{left:mar,right:mar},
            styles:{fontSize:7, overflow:'linebreak'},
            headStyles:{fillColor:teal, textColor:255},
            willDrawCell:data=> {
                if (data.section==='body' && data.column.index===2) {
                    const n = +data.cell.raw;
                    const bg = n>=15 ? [127,95,36] : n>=6 ? [184,155,60] : [240,227,192];
                    pdf.setFillColor(...bg);
                    const lum = 0.299*bg[0] + 0.587*bg[1] + 0.114*bg[2];
                    pdf.setTextColor(lum < 140?255:0, lum < 140?255:0, lum < 140?255:0);
                }
                if(data.section==='body' && data.column.index!==2) pdf.setTextColor(0,0,0);
            }
        });
        y = pdf.lastAutoTable.finalY + GAP;

        /* ===== Authors & books per historical period ===================== */
        section(t('export.section.period'));

        const periodAgg = d3.rollups(
            rows,
            v => ({
                books   : v.length,
                authors : Array.from(new Set(v.map(d => d.Nome_Autor))).sort()
            }),
            d => normalizePeriod(d.EpocaHistorica_Autor)
        );

        /* Sort by the visual order used in the dashboard, if available     */
        if (window.periodOrder) {
            periodAgg.sort(
                (a, b) => window.periodOrder.indexOf(a[0]) - window.periodOrder.indexOf(b[0])
            );
        } else {
            periodAgg.sort((a, b) => a[0].localeCompare(b[0]));
        }

        const periodBody = periodAgg.map(([period, o]) => [
            period,
            o.authors.join('\n'),
            o.books
        ]);

        pdf.autoTable({
            head: [[
                t('export.period.header.period'),
                t('export.period.header.author'),
                t('export.period.header.numBooks')
            ]],
            body      : periodBody,
            startY    : y,
            margin    : { left: mar, right: mar },
            styles    : { fontSize: 7, overflow: 'linebreak' },
            headStyles: { fillColor: teal, textColor: 255 }
        });

        y = pdf.lastAutoTable.finalY + GAP;


        /* ===== Library owners =========================================== */
        section(t('export.section.owners'));

        const libAgg = d3.rollups(
            rows, v=>v.length, d=>d.Proprietario_Nome||'Unknown'
        ).sort((a,b)=>d3.descending(a[1],b[1]));

        const libBody = libAgg.map(([name,n])=> {
            const any = rows.find(r=>r.Proprietario_Nome===name) || {};
            return [
                name, n,
                any.Proprietario_DatasExtremas        || '—',
                any.Proprietario_Titulo               || '—',
                any.Proprietario_Titulo_DatasExtremas || '—'
            ];
        });

        pdf.autoTable({
            head:[[ t('export.owners.header.owner'), t('export.owners.header.books'), t('export.owners.header.lifespan'), t('export.owners.header.royalTitle'), t('export.owners.header.reign') ]],
            body:libBody,
            startY:y,
            margin:{ left:mar, right:mar },
            styles:{ fontSize:7 },
            headStyles:{ fillColor: teal, textColor:255 }
        });
        y = pdf.lastAutoTable.finalY + GAP;

        /* ===== Books’ classification system ============================ */
        section(t('export.section.treemap'));

        const treemapBody = d3.rollups(
            rows, v=>v.length,
            d=>d.CatLit_Descricao         || 'Unknown',
            d=>d.GenLit_Descricao         || 'Unknown',
            d=>d.TradicaoIntelectual_Obra || 'Unknown'
        ).flatMap(([cat,g1]) =>
            g1.flatMap(([gen,g2]) =>
                g2.map(([trad,n]) => [cat,gen,trad,n])) );

        pdf.autoTable({
            head:[[ t('export.treemap.header.category'),
                t('export.treemap.header.genre'),
                t('export.treemap.header.tradition'),
                t('export.treemap.header.numBooks') ]],
            body:treemapBody,
            startY:y,
            margin:{left:mar,right:mar},
            styles:{fontSize:7, overflow:'linebreak'},
            headStyles:{fillColor:teal,textColor:255},
            /* horizontal line between category blocks */
            didDrawCell: data => {
                if (data.section !== 'body') return;
                const r = data.row.index;
                if (r === 0) return;

                if (treemapBody[r][0] !== treemapBody[r-1][0]) {
                    const yLine = data.cell.y;
                    const width = (data.table && data.table.width) ? data.table.width : pageW;
                    if (Number.isFinite(yLine))
                    pdf.setDrawColor(...teal).line(mar, yLine, mar + width, yLine);
                }
            }

        });

        newPage();

        /* ===== Catalog list ============================================= */
        section(t('export.section.catalog'));

        const catCols = [
            {key:'Descricao',         label: t('catalog.header.description')},
            {key:'Obra',              label: t('catalog.header.title')},
            {key:'Nome_Autor',        label: t('catalog.header.author')},
            {key:'Proprietario_Nome', label: t('catalog.header.library')}
        ];

        const catOrder = Array.from(
            document.querySelectorAll('#catalog-entries .catalog-entry')
        ).map(d => d.__data__);

        /* apply currentSort from catalog if any ----------------------- */
        let catRows = catOrder.length ? catOrder : [...rows];
        if (window.currentSort && currentSort.column) {
            const col = currentSort.column;
            const asc = currentSort.ascending;
            catRows.sort((a,b)=> {
                const av = (a[col]||'').toLowerCase(), bv=(b[col]||'').toLowerCase();
                return asc ? av.localeCompare(bv) : bv.localeCompare(av);
            });
        }

        pdf.autoTable({
            head:[catCols.map(c=>c.label)],
            body:catRows.map(r=>catCols.map(c=>r[c.key]||'')),
            startY:y,
            margin: { left: mar, right: mar },
            styles: { fontSize: 6, overflow: 'linebreak' },
            columnStyles: {0: {cellWidth:60} },
            headStyles: { fillColor: teal, textColor: 255 }
        });

        /* ===== save ===================================================== */
        pdf.save('crypto-books-report.pdf');
    });

});
