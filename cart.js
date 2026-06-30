/* Terra Floor — общая корзина на localStorage, работает на всех страницах сайта */
(function (window) {
  const STORAGE_KEY = 'tf_cart_v1';

  function read() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function write(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    renderBadge();
    document.dispatchEvent(new CustomEvent('tf-cart-changed', { detail: { items } }));
  }

  function add(item, qty) {
    qty = qty || 1;
    const items = read();
    const existing = items.find(i => i.id === item.id);
    if (existing) {
      existing.qty += qty;
    } else {
      items.push(Object.assign({}, item, { qty }));
    }
    write(items);
    flashBadge();
  }

  function updateQty(id, qty) {
    let items = read();
    items = items.map(i => i.id === id ? Object.assign({}, i, { qty: Math.max(1, qty) }) : i);
    write(items);
  }

  function remove(id) {
    const items = read().filter(i => i.id !== id);
    write(items);
  }

  function clear() {
    write([]);
  }

  function count() {
    return read().reduce((sum, i) => sum + i.qty, 0);
  }

  function subtotal() {
    return read().reduce((sum, i) => sum + i.qty * i.price, 0);
  }

  function renderBadge() {
    const n = count();
    document.querySelectorAll('[data-cart-badge]').forEach(el => {
      el.textContent = n;
      el.style.display = n > 0 ? 'flex' : 'none';
    });
  }

  function flashBadge() {
    document.querySelectorAll('[data-cart-badge]').forEach(el => {
      el.classList.add('tf-cart-pulse');
      setTimeout(() => el.classList.remove('tf-cart-pulse'), 420);
    });
  }

  function toast(message) {
    let el = document.getElementById('tf-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'tf-toast';
      el.style.cssText = [
        'position:fixed', 'left:50%', 'bottom:28px', 'transform:translateX(-50%) translateY(20px)',
        'background:#1B1108', 'color:#F3ECDF', 'padding:13px 22px', 'border-radius:999px',
        'font-family:"Work Sans",sans-serif', 'font-size:14px', 'font-weight:500',
        'box-shadow:0 16px 32px -12px rgba(27,17,8,0.5)', 'z-index:9999',
        'opacity:0', 'transition:opacity .25s, transform .25s', 'pointer-events:none'
      ].join(';');
      document.body.appendChild(el);
    }
    el.textContent = message;
    requestAnimationFrame(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateX(-50%) translateY(0)';
    });
    clearTimeout(window.__tfToastTimer);
    window.__tfToastTimer = setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(-50%) translateY(20px)';
    }, 2200);
  }

  // Делегирование клика по любой кнопке [data-add-to-cart] на странице —
  // достаточно положить data-атрибуты на кнопку, JS сам подхватит.
  function bindQuickAdd() {
    document.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-add-to-cart]');
      if (!btn) return;
      e.preventDefault();
      const item = {
        id: btn.dataset.id,
        sku: btn.dataset.sku || '',
        collection: btn.dataset.collection || '',
        name: btn.dataset.name,
        price: parseFloat(btn.dataset.price),
        packArea: parseFloat(btn.dataset.packArea) || 1,
        unit: btn.dataset.unit || 'упаковка',
        swatch: btn.dataset.swatch || 'linear-gradient(135deg,#C1652E,#B98B3E)'
      };
      if (!item.id || !item.price) return;
      add(item, 1);
      toast((btn.dataset.toast || 'Добавлено в корзину') + ': ' + item.name);
    });
  }

  const style = document.createElement('style');
  style.textContent = '.tf-cart-pulse{animation:tfCartPulse .4s ease;}@keyframes tfCartPulse{0%{transform:scale(1);}40%{transform:scale(1.35);}100%{transform:scale(1);}}';
  document.head.appendChild(style);

  document.addEventListener('DOMContentLoaded', function () {
    renderBadge();
    bindQuickAdd();
  });

  window.TFCart = { add, updateQty, remove, clear, count, subtotal, getAll: read, toast };
})(window);
