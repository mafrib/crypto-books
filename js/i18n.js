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
            "gender.disabled.male.long"   :
                "Unable to select by gender.\nSome of the male libraries do not match the current filters",
            "gender.disabled.female.long" :
                "Unable to select by gender.\nSome of the female libraries do not match the current filters",

            'side.filter': 'Filter',
            'side.clear': 'Clear',

            'details.placeholder': 'Click or hover on elements to see more details here.',
            'carousel.prev': 'Previous',
            'carousel.next': 'Next',

            'treemap.title': "Books' classification system",
            'treemap.mode.category': 'Literary Categories',
            'treemap.info.category': 'Literary Category',
            'treemap.mode.tradition': 'Intellectual Tradition',
            'treemap.breadcrumb.filtered': '(Filtered)',
            'treemap.info.genre': 'Literary Genre',

            'catalog.search.placeholder': 'Search for a book, author or library...',
            'catalog.search.clear': 'Clear search',
            'catalog.header.description': 'Description',
            'catalog.header.title': 'Title',
            'catalog.header.author': 'Author',
            'catalog.header.library': 'Library',
            'catalog.header.description.tip': 'Description as in the original document',
            'catalog.header.title.tip': 'Attributed book based on the Description',
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
            'filter.geoarea': 'Geographical Area',
            'filter.geoarea-pi-except': 'Península Ibérica (except Portugal)',
            'filter.location': 'Location',
            'filter.period': 'Historical Period',
            'filter.probobra': 'Book Attribution',
            'filter.probautor': 'Authorship',
            'filter.category': 'Literary Category',
            'filter.genre': 'Literary Genre',
            'filter.genre.guard': 'Select a Literary Category first',
            'filter.tradition': 'Intellectual Tradition',
            'filter.idioma': 'Language',
            'filter.value.unknown': 'Unknown',
            'filter.value.classifying': 'In classification',
            'filter.value.na': 'Not applicable',
            'filter.value.question': '?',
            'filter.value.undetermined': 'Undetermined',
            'filter.location.unlocated': 'No location',
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

            'conflict.prefix.library': 'The library',
            'conflict.prefix.period': 'The historical period',
            'conflict.prefix.item': 'The item',
            'conflict.suffix': 'has no books that match:',
            'conflict.keep': 'Keep filters',
            'conflict.clear': 'Clear filters',

            'details.book.titleLabel': "Book's title:",
            'details.attribution': 'Attribution:',
            'details.authorship': 'Authorship:',
            'prob.tip': 'Attribution probability',
            'prob.obra.tip': 'Book attribution',
            'prob.autor.tip': 'Authorship',
            'details.lifespan': 'Lifespan:',
            'details.royalTitle': 'Royal title:',
            'details.tenure': 'Tenure period:',

            'details.description': 'Description',
            'details.language': 'Language',
            'details.altBook': 'Alternative book',
            'details.form': 'Form',
            'details.support': 'Support',
            'details.production': 'Original production',
            'details.synopsis': 'Synopsis',
            'details.archivalCopies': 'Archival copies',
            'details.textualEditions': 'Textual editions',
            'details.authorStatus': 'Author status',
            'details.birth': 'Birth',
            'details.death': 'Death',
            'details.bio': 'Biography',
            'details.seeMore': 'See more',
            'details.seeLess': 'See less',

            'viewport.warning.title': 'Screen too small',
            'viewport.warning.message': 'This dashboard requires a minimum screen size of 1200×700px for optimal viewing. Please use a larger screen or zoom out your browser.',
            'viewport.current': 'Current',

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
            'period.title': 'Época histórica',

            'network.title': 'Livrarias, por proprietário',
            'network.info.aria': 'Informação da legenda',
            'network.legend.shared.top': 'Itens partilhados',
            'network.legend.shared.sub': '(livros/autores)',
            'network.legend.authors': 'Autores em comum',
            'network.legend.books': 'Livros em comum',
            'network.gender.label': 'Filtrar por género do proprietário:',
            'gender.male': 'Livrarias masculinas',
            'gender.female': 'Livrarias femininas',
            "gender.disabled.male"   :
            "Não é possível filtrar por género.\nAlgumas livrarias masculinas não correspondem aos filtros atuais",
            "gender.disabled.female" :
            "Não é possível filtrar por género.\nAlgumas livrarias femininas não correspondem aos filtros atuais",

            'side.filter': 'Filtrar',
            'side.clear': 'Limpar',

            'details.placeholder': 'Clique ou passe o rato sobre os elementos para ver mais detalhes aqui.',
            'carousel.prev': 'Anterior',
            'carousel.next': 'Seguinte',

            'treemap.title': 'Sistema de classificação das obras',
            'treemap.mode.category': 'Categorias Literárias',
            'treemap.info.category': 'Categoria Literária',
            'treemap.mode.tradition': 'Tradição Intelectual',
            'treemap.breadcrumb.filtered': '(Filtrado)',
            'treemap.info.genre': 'Género Literário',

            'catalog.search.placeholder': 'Procure por livro, autor ou livraria...',
            'catalog.search.clear': 'Limpar pesquisa',
            'catalog.header.description': 'Descrição',
            'catalog.header.title': 'Título da Obra',
            'catalog.header.author': 'Autor',
            'catalog.header.library': 'Livraria',
            'catalog.header.description.tip': 'Descrição no documento original',
            'catalog.header.title.tip': 'Obra atribuída com base na Descrição',
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
            'filter.geoarea': 'Área Geográfica',
            'filter.geoarea-pi-except': 'Península Ibérica (exceto Portugal)',
            'filter.location': 'Localização',
            'filter.period': 'Época Histórica',
            'filter.probobra': 'Atribuição Obra',
            'filter.probautor': 'Autoria',
            'filter.category': 'Categoria Literária',
            'filter.genre': 'Género Literário',
            'filter.genre.guard': 'Selecione primeiro uma Categoria literária',
            'filter.tradition': 'Tradição Intelectual',
            'filter.idioma': 'Idioma',
            'filter.value.unknown': 'Desconhecido',
            'filter.value.classifying': 'Em classificação',
            'filter.value.na': 'Não aplicável',
            'filter.value.question': '?',
            'filter.value.undetermined': 'Por determinar',
            'filter.location.unlocated': 'Sem localização',
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

            'conflict.prefix.library': 'A livraria',
            'conflict.prefix.period': 'A época histórica',
            'conflict.prefix.item': 'O item',
            'conflict.suffix': 'não tem livros que correspondam a:',
            'conflict.keep': 'Manter os filtros',
            'conflict.clear': 'Limpar filtros',

            'details.book.titleLabel': 'Título da obra:',
            'details.attribution': 'Atribuição:',
            'details.authorship': 'Autoria',
            'prob.tip': 'Probabilidade de atribuição',
            'prob.obra.tip': 'Probabilidade de atribuição da obra',
            'prob.autor.tip': 'Probabilidade de atribuição do autor',
            'details.lifespan': 'Vida:',
            'details.royalTitle': 'Título real:',
            'details.tenure': 'Período de governo:',

            'details.description': 'Descrição',
            'details.language': 'Idioma',
            'details.altBook': 'Obra alternativa',
            'details.form': 'Forma',
            'details.support': 'Suporte',
            'details.production': 'Produção original',
            'details.synopsis': 'Sinopse',
            'details.archivalCopies': 'Cópias arquivísticas',
            'details.textualEditions': 'Edições textuais',
            'details.authorStatus': 'Estatuto do autor',
            'details.birth': 'Nascimento',
            'details.death': 'Morte',
            'details.bio': 'Biografia',
            'details.seeMore': 'Ver mais',
            'details.seeLess': 'Ver menos',

            'viewport.warning.title': 'Ecrã demasiado pequeno',
            'viewport.warning.message': 'Este painel requer um tamanho mínimo de ecrã de 1200×700px para uma visualização ideal. Use um ecrã maior ou reduza o zoom do navegador.',
            'viewport.current': 'Atual',

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
            'export.treemap.header.category': 'Categoria Literária',
            'export.treemap.header.genre': 'Género literário',
            'export.treemap.header.tradition': 'Tradição Intelectual',
            'export.treemap.header.numBooks': 'N.º de livros',
            'export.section.catalog': 'Catálogo – vista atual',
            'export.common.inCommon': 'em comum'
        }
    };

    const stored = localStorage.getItem('lang');
    const i18n = {
        locale: stored || 'pt',

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
