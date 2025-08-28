document.addEventListener('DOMContentLoaded', () => {

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
            pdf.setFont('helvetica','bold').setFontSize(14).setTextColor(...teal);
            pdf.text(titleTxt, mar, y);
            y += 6;
        };

        /* ===== cover page =============================================== */
        pdf.setFont('helvetica','bold').setFontSize(18).setTextColor(...teal)
            .text('Crypto-Books', mar, y);
        y += 6;

        pdf.setFont('helvetica','normal').setFontSize(9).setTextColor(80)
            .text(
                'This report reflects the dashboard’s current view at export time, ' +
                'considering all active filters.',
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
            .text('Active filters:', mar, y);
        y += 5;

        const toString = v => {
            if (Array.isArray(v)) return v.map(toString).join(', ');
            if (typeof v === 'object') return v.label || v.name || Object.values(v).join(', ');
            return String(v);
        };

        if (!Object.keys(activeFilters).length) {
            pdf.setFont('helvetica','normal').setFontSize(9).setTextColor(0,0,0)
                .text('— none —', mar + 2, y);
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
        section('Authors and books per location');

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
            head:[['Location','Author','No. of books']],
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

        /* ===== Library owners =========================================== */
        section('Library owners');

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
            head:[['Owner','Books','Lifespan','Royal title','Reign']],
            body:libBody,
            startY:y,
            margin:{ left:mar, right:mar },
            styles:{ fontSize:7 },
            headStyles:{ fillColor: teal, textColor:255 }
        });
        y = pdf.lastAutoTable.finalY + GAP;

        /* ===== Books’ classification system ============================ */
        section('Books’ classification system');

        const treemapBody = d3.rollups(
            rows, v=>v.length,
            d=>d.CatLit_Descricao         || 'Unknown',
            d=>d.GenLit_Descricao         || 'Unknown',
            d=>d.TradicaoIntelectual_Obra || 'Unknown'
        ).flatMap(([cat,g1]) =>
            g1.flatMap(([gen,g2]) =>
                g2.map(([trad,n]) => [cat,gen,trad,n])) );

        pdf.autoTable({
            head:[['Literary category','Literary genre',
                    'Intellectual tradition','No. of books']],
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
        section('Catalog – current view');

        const catCols = [
            {key:'Descricao',        label:'Description'},
            {key:'Obra',             label:'Work'},
            {key:'Nome_Autor',       label:'Author'},
            {key:'Proprietario_Nome',label:'Library'}
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
