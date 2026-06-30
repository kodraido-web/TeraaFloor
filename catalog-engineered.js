/* Terra Floor — каталог инженерной доски: рендер, фильтры, сортировка, быстрое добавление в корзину */
(function () {
  const DATA = window.TF_ENGINEERED || [];

  const SELECTION_META = {
    'Марканд': { gradient: 'linear-gradient(135deg,#9C4D20,#E8DDC8)' },
    'Рустик':  { gradient: 'linear-gradient(135deg,#B98B3E,#4A2E18)' },
    'Натур':   { gradient: 'linear-gradient(135deg,#B98B3E,#1B1108)' },
    'Селект':  { gradient: 'linear-gradient(135deg,#4A2E18,#1B1108)' },
  };
  function gradientFor(s) {
    return (SELECTION_META[s] && SELECTION_META[s].gradient) || 'linear-gradient(135deg,#9C4D20,#4A2E18)';
  }

  const uniq = (arr) => Array.from(new Set(arr)).sort();
  const FACETS = {
    collection: uniq(DATA.map(d => d.collection)),
    layType: uniq(DATA.map(d => d.layType)),
    coating: uniq(DATA.map(d => d.coating)),
  };
  const priceMin = Math.min(...DATA.map(d => d.price));
  const priceMax = Math.max(...DATA.map(d => d.price));

  const state = {
    collection: new Set(FACETS.collection),
    layType: new Set(FACETS.layType),
    coating: new Set(FACETS.coating),
    priceFrom: priceMin,
    priceTo: priceMax,
    sort: 'popular',
  };

  function countFor(facet, value) {
    return DATA.filter(d => d[facet] === value).length;
  }

  function buildFilterGroup(title, facet) {
    const items = FACETS[facet].map(val => {
      const checked = state[facet].has(val) ? 'checked' : '';
      return `<label class="filter-option">
        <input type="checkbox" data-facet="${facet}" value="${val}" ${checked}>
        ${val}<span class="fcount">${countFor(facet, val)}</span>
      </label>`;
    }).join('');
    return `<div class="filter-group"><h3>${title}</h3>${items}</div>`;
  }

  function renderFilters() {
    const root = document.getElementById('filters-root');
    root.innerHTML = `
      ${buildFilterGroup('Селекция', 'collection')}
      <div class="filter-group">
        <h3>Цена, ₽/м²</h3>
        <div class="price-range">
          <input type="number" id="price-from" placeholder="от ${Math.round(priceMin)}" value="${Math.round(state.priceFrom)}">
          <input type="number" id="price-to" placeholder="до ${Math.round(priceMax)}" value="${Math.round(state.priceTo)}">
        </div>
      </div>
      ${buildFilterGroup('Тип укладки', 'layType')}
      ${buildFilterGroup('Покрытие', 'coating')}
      <div class="filter-apply">
        <a href="#" class="btn btn-primary" id="filter-apply">Применить</a>
        <a href="#" class="btn btn-ghost-dark" id="filter-reset">Сбросить</a>
      </div>
    `;
    root.querySelectorAll('input[data-facet]').forEach(cb => {
      cb.addEventListener('change', () => {
        const facet = cb.dataset.facet;
        if (cb.checked) state[facet].add(cb.value); else state[facet].delete(cb.value);
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
      state.layType = new Set(FACETS.layType);
      state.coating = new Set(FACETS.coating);
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
      state.layType.has(d.layType) &&
      state.coating.has(d.coating) &&
      d.price >= state.priceFrom && d.price <= state.priceTo
    );
  }

  function applySort(list) {
    const arr = list.slice();
    if (state.sort === 'cheap') arr.sort((a, b) => a.price - b.price);
    else if (state.sort === 'expensive') arr.sort((a, b) => b.price - a.price);
    return arr;
  }

  function cardTemplate(item) {
    const grad = gradientFor(item.collection);
    const thickness = item.thickness ? item.thickness + ' мм' : '';
    return `
      <div class="cat-card">
        <div class="cat-swatch" style="background:${grad};"><span class="cat-tag">${item.collection}</span></div>
        <div class="cat-body">
          <div class="name">${item.sku}</div>
          <div class="cat-chips"><span>${item.layType}</span><span>${thickness}</span><span>${item.coating}</span></div>
          <div class="cat-price-row">
            <div class="num">${Math.round(item.price).toLocaleString('ru-RU')} ₽<small> / м²</small></div>
            <button type="button" class="btn btn-primary" style="padding:7px 14px;font-size:12px;"
              data-add-to-cart
              data-id="${item.id}"
              data-sku="${item.sku}"
              data-collection="Инженерная доска · ${item.collection}"
              data-name="${item.sku}"
              data-price="${Math.round(item.price)}"
              data-pack-area="1"
              data-unit="м²"
              data-swatch="${grad}"
              data-toast="Добавлено">В корзину</button>
          </div>
        </div>
      </div>`;
  }

  function pluralize(n) {
    const mod10 = n % 10, mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return 'позиция';
    if ([2,3,4].includes(mod10) && ![12,13,14].includes(mod100)) return 'позиции';
    return 'позиций';
  }

  function renderGrid() {
    const filtered = applySort(applyFilters());
    const grid = document.getElementById('product-grid');
    const empty = document.getElementById('empty-state');
    const count = document.getElementById('results-count');
    count.textContent = `Найдено ${filtered.length} ${pluralize(filtered.length)} · premium-сегмент`;
    if (filtered.length === 0) {
      grid.innerHTML = '';
      empty.style.display = 'block';
    } else {
      empty.style.display = 'none';
      grid.innerHTML = filtered.map(cardTemplate).join('');
    }
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
