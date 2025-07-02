const ownerPhotoMap = {
    'D. Afonso V': 'img/libraries/afonso-v.jpg',
    'D. Beatriz': 'img/libraries/beatriz.jpg',
    'D. Duarte': 'img/libraries/duarte.jpg',
    'D. Fernando': 'img/libraries/fernando.jpg',
    'D. João I':    'img/libraries/joao-i.jpg',
    'D. Leonor de Viseu': 'img/libraries/leonor-viseu.jpg',
    'D. Pedro': 'img/libraries/pedro.jpg'
};

let currentCarouselLibs = [];
let currentIndex = 0;

function renderCarousel() {
  const libs = currentCarouselLibs;
  const carousel = document.querySelector('.details-panel__carousel');
  carousel.innerHTML = '';
  carousel.style.display = libs.length > 1 ? 'flex' : 'none';

  libs.forEach((lib, i) => {
    const dot = document.createElement('div');
    dot.className = i === currentIndex ? 'dot active' : 'dot';
    dot.addEventListener('click', () => {
      currentIndex = i;
      updateDetailsPanel(libs[currentIndex], globalData);
      renderCarousel();
    });
    carousel.appendChild(dot);
  });
}

function updateDetailsPanel(libName, allData) {
    const panel       = document.getElementById('hover-details');
    const wrapper     = panel.querySelector('.details-panel__img-wrapper');
    const nameEl      = panel.querySelector('.details-panel__name');
    const booksEl     = panel.querySelector('.details-panel__books');
    const datesEl     = panel.querySelector('.details-panel__dates');
    const titleEl     = panel.querySelector('.details-panel__title');
    const reignEl     = panel.querySelector('.details-panel__reign');
    const placeholder = panel.querySelector('.details-panel__placeholder');

    placeholder.style.display = 'none';
    wrapper.style.display     = 'block';
    nameEl.style.display      = '';
    booksEl.style.display     = '';
    datesEl.style.display     = '';
    titleEl.style.display     = '';
    reignEl.style.display     = '';

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
    const count = allData.filter(r => r.Proprietario_Nome === libName).length;
    booksEl.textContent = `${count} book${count===1?'':'s'}`;

    const info = allData.find(r => r.Proprietario_Nome === libName) || {};
    datesEl.innerHTML = `<strong>Lifespan:</strong> ${info.Proprietario_DatasExtremas || '—'}`;
    titleEl.innerHTML = `<strong>Royal title:</strong> ${info.Proprietario_Titulo || '—'}`;
    reignEl.innerHTML = `<strong>Reign period:</strong> ${info.Proprietario_Titulo_DatasExtremas || '—'}`;
}

function clearDetailsPanel() {
    const panel       = document.getElementById('hover-details');
    panel.querySelector('.details-panel__img-wrapper').style.display = 'none';
    panel.querySelector('.details-panel__name').style.display        = 'none';
    panel.querySelector('.details-panel__books').style.display       = 'none';
    panel.querySelector('.details-panel__dates').style.display       = 'none';
    panel.querySelector('.details-panel__title').style.display       = 'none';
    panel.querySelector('.details-panel__reign').style.display       = 'none';

    const placeholder = panel.querySelector('.details-panel__placeholder');
    placeholder.style.display = '';
    placeholder.textContent   = 'Click or hover on elements to see more details here.';
}