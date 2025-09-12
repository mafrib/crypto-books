// js/i18n.js
(function () {
    const messages = {
        en: {
            'navbar.title': 'Crypto-Books',
            'navbar.about': 'About',
            'navbar.export': 'Export',
            'navbar.export.csv': 'Dataset (.csv)',
            'navbar.export.pdf': 'PDF report',
            'navbar.language': 'Language',
            'lang.en': 'English',
            'lang.pt': 'Português',

            'map.title': 'Authors',
            'map.reset': 'Reset initial view',
            'map.overlay.nolocation': 'No location associated with the author of this book',
            'map.legend.books': 'No. of Books',
            'map.offmsg.tail': 'with no location',
            'period.title': 'Historical period',

            'network.title': 'Libraries, per library owner',
            'network.info.aria': 'Legend info',
            'network.legend.shared.top': 'Shared items',
            'network.legend.shared.sub': '(books/authors)',
            'network.legend.authors': 'Authors in common',
            'network.legend.books': 'Books in common',
            'network.gender.label': 'Filter by owner’s gender:',
            'gender.male': 'Male libraries',
            'gender.female': 'Female libraries',

            'side.filter': 'Filter',
            'side.clear': 'Clear',

            'details.placeholder': 'Click or hover on elements to see more details here.',
            'carousel.prev': 'Previous',
            'carousel.next': 'Next',

            'treemap.title': "Books' classification system",
            'treemap.mode.category': 'Literary Categories',
            'treemap.mode.tradition': 'Intellectual Tradition',
            'treemap.breadcrumb.filtered': '(Filtered)',

            'catalog.search.placeholder': 'Search for a book, author or library...',
            'catalog.header.description': 'Description',
            'catalog.header.title': 'Title',
            'catalog.header.author': 'Author',
            'catalog.header.library': 'Library',
            'catalog.results.found': 'found',

            'overlay.onePin': 'Only 1 book can be pinned. Replacing the previous selection.',

            'noresults.text': 'No books match the current filters.',
            'noresults.undo': 'Undo last action',
            'noresults.clear': 'Clear',

            'modal.title': 'Advanced filters',
            'modal.clearAll': 'Clear all',
            'modal.close': 'Close',

            'filter.library': 'Library',
            'filter.author': 'Author',
            'filter.geoarea': 'Geographical area',
            'filter.location': 'Location',
            'filter.period': 'Historical period',
            'filter.probobra': 'Authorship',
            'filter.probautor': 'Author Attribution Probability',
            'filter.category': 'Literary Category',
            'filter.genre': 'Literary Genre',
            'filter.genre.guard': 'Select a Literary Category first',
            'filter.tradition': 'Intellectual Tradition',
            'filter.idioma': 'Language',
            'quick.author': 'Search authors…',
            'quick.geoarea': 'Search geographical area…',
            'quick.location': 'Search locations…',
            'quick.genre': 'Search literary genres…',
            'quick.tradition': 'Search intellectual traditions…',

            // Dynamic helpers
            'unit.book.one': 'book',
            'unit.book.many': 'books',
            'unit.author.one': 'author',
            'unit.author.many': 'authors',
            'label.location': 'Location',
            'label.numBooks': 'No. of books',
            'label.numAuthors': 'No. of authors',

            'details.book.titleLabel': "Book's title:",
            'prob.tip': 'Attribution probability',
            'prob.obra.tip': 'Book attribution probability',
            'prob.autor.tip': 'Author attribution probability',
            'details.lifespan': 'Lifespan:',
            'details.royalTitle': 'Royal title:',
            'details.tenure': 'Tenure period:',

            'export.cover.note': 'This report reflects the dashboard’s current view at export time, considering all active filters.',
            'export.filters.title': 'Active filters:',
            'export.filters.none': '— none —',
            'export.section.loc': 'Authors and books per location',
            'export.loc.header.location': 'Location',
            'export.loc.header.author': 'Author',
            'export.loc.header.numBooks': 'No. of books',
            'export.section.owners': 'Library owners',
            'export.owners.header.owner': 'Owner',
            'export.owners.header.books': 'Books',
            'export.owners.header.lifespan': 'Lifespan',
            'export.owners.header.royalTitle': 'Royal title',
            'export.owners.header.reign': 'Reign',
            'export.section.treemap': "Books’ classification system",
            'export.treemap.header.category': 'Literary category',
            'export.treemap.header.genre': 'Literary genre',
            'export.treemap.header.tradition': 'Intellectual tradition',
            'export.treemap.header.numBooks': 'No. of books',
            'export.section.catalog': 'Catalog – current view',
            'export.common.inCommon': 'in common'
        },

        pt: {
            'navbar.title': 'Crypto-Books',
            'navbar.about': 'Sobre',
            'navbar.export': 'Exportar',
            'navbar.export.csv': 'Base de dados (.csv)',
            'navbar.export.pdf': 'Relatório PDF',
            'navbar.language': 'Idioma',
            'lang.en': 'English',
            'lang.pt': 'Português',

            'map.title': 'Autores',
            'map.reset': 'Repor vista inicial',
            'map.overlay.nolocation': 'Sem localização associada ao autor deste livro',
            'map.legend.books': 'N.º de livros',
            'map.offmsg.tail': 'sem localização',
            'period.title': 'Período histórico',

            'network.title': 'Livrarias, por proprietário',
            'network.info.aria': 'Informação da legenda',
            'network.legend.shared.top': 'Itens partilhados',
            'network.legend.shared.sub': '(livros/autores)',
            'network.legend.authors': 'Autores em comum',
            'network.legend.books': 'Livros em comum',
            'network.gender.label': 'Filtrar por género do proprietário:',
            'gender.male': 'Livrarias masculinas',
            'gender.female': 'Livrarias femininas',

            'side.filter': 'Filtrar',
            'side.clear': 'Limpar',

            'details.placeholder': 'Clique ou passe o rato sobre os elementos para ver mais detalhes aqui.',
            'carousel.prev': 'Anterior',
            'carousel.next': 'Seguinte',

            'treemap.title': 'Sistema de classificação das obras',
            'treemap.mode.category': 'Categorias literárias',
            'treemap.mode.tradition': 'Tradição intelectual',
            'treemap.breadcrumb.filtered': '(Filtrado)',

            'catalog.search.placeholder': 'Procure por livro, autor ou livraria...',
            'catalog.header.description': 'Descrição',
            'catalog.header.title': 'Título da Obra',
            'catalog.header.author': 'Autor',
            'catalog.header.library': 'Livraria',
            'catalog.results.found': 'encontrado(s)',

            'overlay.onePin': 'Apenas 1 livro pode ser fixado. A substituir a seleção anterior.',

            'noresults.text': 'Nenhum livro corresponde aos filtros atuais.',
            'noresults.undo': 'Desfazer a última ação',
            'noresults.clear': 'Limpar',

            'modal.title': 'Filtros avançados',
            'modal.clearAll': 'Limpar tudo',
            'modal.close': 'Fechar',

            'filter.library': 'Livraria',
            'filter.author': 'Autor',
            'filter.geoarea': 'Área geográfica',
            'filter.location': 'Localização',
            'filter.period': 'Período histórico',
            'filter.probobra': 'Autoria',
            'filter.probautor': 'Probabilidade de atribuição (Autor)',
            'filter.category': 'Categoria literária',
            'filter.genre': 'Género literário',
            'filter.genre.guard': 'Selecione primeiro uma Categoria literária',
            'filter.tradition': 'Tradição intelectual',
            'filter.idioma': 'Idioma',
            'quick.author': 'Pesquisar autores…',
            'quick.geoarea': 'Pesquisar áreas geográficas…',
            'quick.location': 'Pesquisar localizações…',
            'quick.genre': 'Pesquisar géneros literários…',
            'quick.tradition': 'Pesquisar tradições intelectuais…',

            // Dynamic helpers
            'unit.book.one': 'livro',
            'unit.book.many': 'livros',
            'unit.author.one': 'autor',
            'unit.author.many': 'autores',
            'label.location': 'Localização',
            'label.numBooks': 'N.º de livros',
            'label.numAuthors': 'N.º de autores',

            'details.book.titleLabel': 'Título da obra:',
            'prob.tip': 'Probabilidade de atribuição',
            'prob.obra.tip': 'Probabilidade de atribuição da obra',
            'prob.autor.tip': 'Probabilidade de atribuição do autor',
            'details.lifespan': 'Vida:',
            'details.royalTitle': 'Título real:',
            'details.tenure': 'Período de governo:',

            'export.cover.note': 'Este relatório reflete a vista atual do painel no momento da exportação, considerando todos os filtros ativos.',
            'export.filters.title': 'Filtros ativos:',
            'export.filters.none': '— nenhum —',
            'export.section.loc': 'Autores e livros por localização',
            'export.loc.header.location': 'Localização',
            'export.loc.header.author': 'Autor',
            'export.loc.header.numBooks': 'N.º de livros',
            'export.section.owners': 'Proprietários das livrarias',
            'export.owners.header.owner': 'Proprietário',
            'export.owners.header.books': 'Livros',
            'export.owners.header.lifespan': 'Vida',
            'export.owners.header.royalTitle': 'Título real',
            'export.owners.header.reign': 'Período de governo',
            'export.section.treemap': 'Sistema de classificação das obras',
            'export.treemap.header.category': 'Categoria literária',
            'export.treemap.header.genre': 'Género literário',
            'export.treemap.header.tradition': 'Tradição intelectual',
            'export.treemap.header.numBooks': 'N.º de livros',
            'export.section.catalog': 'Catálogo – vista atual',
            'export.common.inCommon': 'em comum'
        }
    };

    const i18n = {
        locale: localStorage.getItem('lang') ||
                (navigator.language || '').toLowerCase().startsWith('pt') ? 'pt' : 'en',

        t(key) {
        const pack = messages[this.locale] || messages.en;
        return pack[key] || messages.en[key] || key;
        },

        // very small plural helper
        plural(n, one, many) { return n === 1 ? one : many; },

        // Replace {n} style tokens after t()
        fmt(str, vars = {}) {
        return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
        },

        setLocale(lang) {
            if (!messages[lang]) return;
            this.locale = lang;
            localStorage.setItem('lang', lang);
            document.documentElement.setAttribute('lang', lang);
            this.apply();
            window.dispatchEvent(new CustomEvent('i18n:changed', { detail: { locale: lang }}));
        },

        apply(root = document) {
            // Text content
            root.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                el.textContent = this.t(key);
            });

            // Attribute translations: data-i18n-attr="placeholder:catalog.search.placeholder"
            root.querySelectorAll('[data-i18n-attr]').forEach(el => {
                const spec = el.getAttribute('data-i18n-attr').split('|');
                spec.forEach(pair => {
                const [attr, key] = pair.split(':').map(s => s.trim());
                if (attr && key) el.setAttribute(attr, this.t(key));
                });
            });
        }
    };

    // Expose globally
    window.i18n = i18n;

    // Wire the language menu if present
    document.addEventListener('DOMContentLoaded', () => {
        i18n.apply();
        window.dispatchEvent(new CustomEvent('i18n:changed', { detail: { locale: i18n.locale }}));

        const btn  = document.getElementById('lang-btn');
        const menu = document.getElementById('lang-menu');

        if (btn && menu) {
        btn.addEventListener('click', e => {
            menu.classList.toggle('open');
            btn.setAttribute('aria-expanded', menu.classList.contains('open'));
            e.stopPropagation();
        });
        document.addEventListener('click', e => {
            if (!menu.contains(e.target) && !btn.contains(e.target)) menu.classList.remove('open');
        });
        menu.querySelectorAll('[data-lang]').forEach(a => {
            a.addEventListener('click', () => {
            const lang = a.getAttribute('data-lang');
            i18n.setLocale(lang);
            menu.classList.remove('open');
            });
        });
        }
    });
})();
