/* Terra Floor — каталог ламината: рендер, фильтры, сортировка, быстрое добавление в корзину */
(function () {
  const DATA = window.TF_LAMINATE || [];

  const COLLECTION_META = {
    'EasyStep':                   { gradient: 'linear-gradient(135deg,#C1652E,#4A2E18)' },
    'Design Collection':          { gradient: 'linear-gradient(135deg,#C1652E,#B98B3E)' },
    'Forest':                     { gradient: 'linear-gradient(135deg,#4A2E18,#1B1108)' },
    'Village':                    { gradient: 'linear-gradient(135deg,#4A2E18,#9C4D20)' },
    'AQUA SPC 43 кл.':            { gradient: 'linear-gradient(135deg,#5B7A73,#8FA89F)', label: 'AQUA SPC' },
    'AQUA SPC Herringbone 43 кл.':{ gradient: 'linear-gradient(135deg,#5B7A73,#B98B3E)', label: 'AQUA Herringbone' },
  };

  function collectionLabel(c) {
    return (COLLECTION_META[c] && COLLECTION_META[c].label) || c;
  }
  function collectionGradient(c) {
    return (COLLECTION_META[c] && COLLECTION_META[c].gradient) || 'linear-gradient(135deg,#C1652E,#B98B3E)';
  }

  const uniq = (arr) => Array.from(new Set(arr)).sort();

  const FACETS = {
    collection: uniq(DATA.map(d => d.collection)),
    class: uniq(DATA.map(d => d.class)),
    thickness: uniq(DATA.map(d => d.thickness)).sort((a,b)=>a-b),
    layType: uniq(DATA.map(d => d.layType)),
  };

  const priceMin = Math.min(...DATA.map(d => d.price));
  const priceMax = Math.max(...DATA.map(d => d.price));

  const state = {
    collection: new Set(FACETS.collection),
    class: new Set(FACETS.class),
    thickness: new Set(FACETS.thickness),
    layType: new Set(FACETS.layType),
    priceFrom: priceMin,
    priceTo: priceMax,
    sort: 'popular',
  };

  function countFor(facet, value) {
    return DATA.filter(d => d[facet] === value).length;
  }

  function buildFilterGroup(title, facet, labelFn) {
    const items = FACETS[facet].map(val => {
      const label = labelFn ? labelFn(val) : val;
      const checked = state[facet].has(val) ? 'checked' : '';
      return `<label class="filter-option">
        <input type="checkbox" data-facet="${facet}" value="${val}" ${checked}>
        ${label}<span class="fcount">${countFor(facet, val)}</span>
      </label>`;
    }).join('');
    return `<div class="filter-group"><h3>${title}</h3>${items}</div>`;
  }

  function renderFilters() {
    const root = document.getElementById('filters-root');
    root.innerHTML = `
      ${buildFilterGroup('Коллекция', 'collection', collectionLabel)}
      <div class="filter-group">
        <h3>Цена, ₽/м²</h3>
        <div class="price-range">
          <input type="number" id="price-from" placeholder="от ${Math.round(priceMin)}" value="${Math.round(state.priceFrom)}">
          <input type="number" id="price-to" placeholder="до ${Math.round(priceMax)}" value="${Math.round(state.priceTo)}">
        </div>
      </div>
      ${buildFilterGroup('Класс износостойкости', 'class', c => c === '43' ? '43 (SPC)' : c)}
      ${buildFilterGroup('Толщина', 'thickness', t => t + ' мм')}
      ${buildFilterGroup('Тип укладки', 'layType')}
      <div class="filter-apply">
        <a href="#" class="btn btn-primary" id="filter-apply">Применить</a>
        <a href="#" class="btn btn-ghost-dark" id="filter-reset">Сбросить</a>
      </div>
    `;

    root.querySelectorAll('input[data-facet]').forEach(cb => {
      cb.addEventListener('change', () => {
        const facet = cb.dataset.facet;
        const raw = cb.value;
        const val = (facet === 'thickness') ? parseFloat(raw) : raw;
        if (cb.checked) state[facet].add(val); else state[facet].delete(val);
        renderGrid();
      });
    });
    document.getElementById('price-from').addEventListener('input', e => {
      state.priceFrom = parseFloat(e.target.value) || priceMin;
      renderGrid();
    });
    document.getElementById('price-to').addEventListener('input', e => {
      state.priceTo = parseFloat(e.target.value) || priceMax;
      renderGrid();
    });
    document.getElementById('filter-reset').addEventListener('click', (e) => {
      e.preventDefault();
      state.collection = new Set(FACETS.collection);
      state.class = new Set(FACETS.class);
      state.thickness = new Set(FACETS.thickness);
      state.layType = new Set(FACETS.layType);
      state.priceFrom = priceMin;
      state.priceTo = priceMax;
      renderFilters();
      renderGrid();
    });
    document.getElementById('filter-apply').addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('product-grid').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function applyFilters() {
    return DATA.filter(d =>
      state.collection.has(d.collection) &&
      state.class.has(d.class) &&
      state.thickness.has(d.thickness) &&
      state.layType.has(d.layType) &&
      d.price >= state.priceFrom && d.price <= state.priceTo
    );
  }

  function applySort(list) {
    const arr = list.slice();
    if (state.sort === 'cheap') arr.sort((a, b) => a.price - b.price);
    else if (state.sort === 'expensive') arr.sort((a, b) => b.price - a.price);
    else if (state.sort === 'collection') arr.sort((a, b) => a.collection.localeCompare(b.collection));
    return arr;
  }

  function cardTemplate(item) {
    const grad = collectionGradient(item.collection);
    const label = collectionLabel(item.collection);
    const thickness = item.thickness ? item.thickness + ' мм' : '';
    return `
      <div class="cat-card">
        <div class="cat-swatch" style="background:${grad};"><span class="cat-tag">${label}</span></div>
        <div class="cat-body">
          <div class="name">${item.sku}</div>
          <div class="cat-chips"><span>${item.class === '43' ? '43 (SPC)' : item.class}</span><span>${thickness}</span><span>${item.layType}</span></div>
          <div class="cat-price-row">
            <div class="num">${Math.round(item.price).toLocaleString('ru-RU')} ₽<small> / м²</small></div>
            <button type="button" class="btn btn-primary" style="padding:7px 14px;font-size:12px;"
              data-add-to-cart
              data-id="${item.id}"
              data-sku="${item.sku}"
              data-collection="${label}"
              data-name="${item.sku}"
              data-price="${Math.round(item.packArea * item.price)}"
              data-pack-area="${item.packArea}"
              data-unit="упаковка"
              data-swatch="${grad}"
              data-toast="Добавлено">В корзину</button>
          </div>
        </div>
      </div>`;
  }

  function renderGrid() {
    const filtered = applySort(applyFilters());
    const grid = document.getElementById('product-grid');
    const empty = document.getElementById('empty-state');
    const count = document.getElementById('results-count');

    count.textContent = `Найдено ${filtered.length} ${pluralize(filtered.length)}`;
    if (filtered.length === 0) {
      grid.innerHTML = '';
      empty.style.display = 'block';
    } else {
      empty.style.display = 'none';
      grid.innerHTML = filtered.map(cardTemplate).join('');
    }
    // re-render filter facet counts to reflect current sub-selection within other facets (optional simple version: keep static total counts)
  }

  function pluralize(n) {
    const mod10 = n % 10, mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return 'покрытие';
    if ([2,3,4].includes(mod10) && ![12,13,14].includes(mod100)) return 'покрытия';
    return 'покрытий';
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderFilters();
    renderGrid();
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        state.sort = e.target.value;
        renderGrid();
      });
    }
  });
})();
