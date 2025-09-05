(function () {
    const CART_KEY = 'agro_cart_v1';
    const IMG_BASE = '/agrotern/img/';
    const PLACEHOLDER = 'placeholder.png';

    const listEl = document.getElementById('cart-items');
    const emptyEl = document.getElementById('cart-empty');
    const sumBox = document.getElementById('cart-summary');
    const sumCnt = document.getElementById('sum-count');
    const sumTot = document.getElementById('sum-total');
    const btnClr = document.getElementById('btn-clear');

    const money = v =>
        (v == null || isNaN(v)) ? '—'
            : new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH', maximumFractionDigits: 0 }).format(v);

    const labelCat = k => ({
        seeds: 'Насіння', fert: 'Добрива', protect: 'Захист', covers: 'Покривні',
        seedlings: 'Саджанці', bulbs: 'Цибулькові', onionsets: 'Цибуля-сівок', myc: 'Міцелій'
    })[k] || k;

    const resolveImg = (p) => {
        if (!p) return IMG_BASE + PLACEHOLDER;
        if (/^https?:\/\//i.test(p)) return p;
        if (p.startsWith('/agrotern/')) return p;
        if (p.startsWith('/img/')) return p.replace('/img/', '/agrotern/img/');
        if (p.startsWith('/')) return '/agrotern' + p; // випадок старих даних типу "/img/x.png"
        return IMG_BASE + p; // просто "seeds.png"
    };

    function readCart() {
        try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch { return []; }
    }
    function writeCart(arr) {
        localStorage.setItem(CART_KEY, JSON.stringify(arr));
        document.dispatchEvent(new Event('cart:changed'));
    }

    function removeAt(idx) {
        const c = readCart();
        c.splice(idx, 1);
        writeCart(c);
        render();
    }
    function setQty(idx, qty) {
        const q = Math.max(1, Math.min(999, Number(qty) || 1));
        const c = readCart();
        if (!c[idx]) return;
        c[idx].qty = q;
        writeCart(c);
        render();
    }

    function itemRowHTML(item, idx) {
        const title = item.title || 'Товар';
        const img = resolveImg(item.image);
        const cat = item.category ? `<span class="badge">${labelCat(item.category)}</span>` : '';
        const price = item.price != null ? money(item.price) : 'за запитом';
        const qty = item.qty || 1;
        const subtotal = item.price != null ? money(qty * item.price) : '—';

        return `
      <article class="cart-item" data-index="${idx}">
        <img class="cart-img" src="${img}" alt="${title}" loading="lazy" decoding="async" width="96" height="96">
        <div>
          <h3 class="ci-title">${title}</h3>
          <div class="ci-meta">
            ${cat}
            <span class="price">${price}</span>
            <div class="ci-qty">
              <label for="qty-${idx}" class="visually-hidden">Кількість</label>
              <input id="qty-${idx}" class="qty" type="number" inputmode="numeric" min="1" max="999" value="${qty}">
            </div>
            <span class="subtotal">${subtotal}</span>
            <div class="ci-actions">
              <button class="btn btn--secondary remove" type="button">Видалити</button>
            </div>
          </div>
        </div>
      </article>`;
    }

    function render() {
        const cart = readCart();
        if (!cart.length) {
            listEl.innerHTML = '';
            emptyEl.hidden = false;
            sumBox.hidden = true;
            return;
        }
        emptyEl.hidden = true;
        sumBox.hidden = false;

        listEl.innerHTML = cart.map(itemRowHTML).join('');

        const count = cart.reduce((s, it) => s + (it.qty || 1), 0);
        const total = cart.reduce((s, it) => s + ((it.price != null ? it.price : 0) * (it.qty || 1)), 0);

        sumCnt.textContent = String(count);
        sumTot.textContent = money(total);
    }

    // Делегування подій списку
    listEl.addEventListener('input', (e) => {
        const qtyInput = e.target.closest('input.qty');
        if (!qtyInput) return;
        const itemEl = e.target.closest('.cart-item');
        const idx = Number(itemEl?.dataset.index);
        setQty(idx, qtyInput.value);
    });
    listEl.addEventListener('click', (e) => {
        if (e.target.closest('.remove')) {
            const itemEl = e.target.closest('.cart-item');
            const idx = Number(itemEl?.dataset.index);
            removeAt(idx);
        }
    });

    // Очистити кошик
    document.getElementById('btn-clear')?.addEventListener('click', () => {
        if (confirm('Очистити весь кошик?')) {
            writeCart([]);
            render();
        }
    });

    // Синхронізація між вкладками / іншими сторінками
    window.addEventListener('storage', (e) => { if (e.key === CART_KEY) render(); });
    document.addEventListener('cart:changed', render);

    // Старт
    render();
})();
