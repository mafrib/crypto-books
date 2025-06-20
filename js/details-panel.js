const ownerPhotoMap = {
  'Dom João I':    'img/libraries/joao-i.jpg',
  'Leonor de Viseu': 'img/libraries/leonor-viseu.jpg'
};

function updateDetailsPanel(libName, allData) {
    const panel       = document.getElementById('hover-details');
    const wrapper     = panel.querySelector('.details-panel__img-wrapper');
    const nameEl      = panel.querySelector('.details-panel__name');
    const booksEl     = panel.querySelector('.details-panel__books');
    const placeholder = panel.querySelector('.details-panel__placeholder');

    placeholder.style.display = 'none';
    wrapper.style.display     = 'block';
    nameEl.style.display      = '';
    booksEl.style.display     = '';

    let photo = '';
    for (let key in ownerPhotoMap) {
        if (libName.includes(key)) {
        photo = ownerPhotoMap[key];
        break;
        }
    }
    wrapper.querySelector('img').src = photo;
    wrapper.querySelector('img').alt = libName;

    nameEl.textContent  = libName;
    const count = allData.filter(r => r.Livraria === libName).length;
    booksEl.textContent = `${count} book${count===1?'':'s'}`;
}

function clearDetailsPanel() {
    const panel       = document.getElementById('hover-details');
    panel.querySelector('.details-panel__img-wrapper').style.display = 'none';
    panel.querySelector('.details-panel__name').style.display        = 'none';
    panel.querySelector('.details-panel__books').style.display       = 'none';

    const placeholder = panel.querySelector('.details-panel__placeholder');
    placeholder.style.display = '';
    placeholder.textContent   = 'Click or hover on elements to see more details here.';
}