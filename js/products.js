(function () {
    const DATA_URL = '/agrotern/data/products.json';
    const IMG_BASE = '/agrotern/img/';
    const PLACEHOLDER = 'placeholder.png';

    const ALL_PER_CAT = 2;
    const PAGE_SIZE = 12;

    const CART_KEY = 'agro_cart_v1';

    const SUBCATS = {
        seeds: [
            { key: 'peas', label: 'Горох' },
            { key: 'cucumbers', label: 'Огірки' },
            { key: 'carrots', label: 'Морква' }
        ],
        protect: [
            { key: 'herbicides', label: 'Гербіциди' },
            { key: 'fungicides', label: 'Фунгіциди' },
            { key: 'insecticides', label: 'Інсектициди' }
        ],
        fert: [], covers: [], seedlings: [], bulbs: [], onionsets: [], myc: []
    };

    const BRANDS = {
        seeds: [
            { key: 'semena-ukrainy', label: 'Семена України' },
            { key: 'yaskrava', label: 'Яскрава' },
            { key: 'profi', label: 'Професійне' }
        ]
    };

    let cache = null;
    const state = { cat: 'all', subcat: '', brand: '' };

    const tablist = document.querySelector('.tabs');
    const tabs = tablist ? Array.from(tablist.querySelectorAll('[role="tab"]')) : [];
    const panels = Array.from(document.querySelectorAll('.tab-panel'));
    const selectCat = document.getElementById('tabs-select');

    const subWrap = document.getElementById('subfilters');
    const subSelect = document.getElementById('subtabs-select');
    const subChipsBox = document.querySelector('.subtabs');

    const brandWrap = document.getElementById('brandfilters');
    const brandSelect = document.getElementById('brands-select');
    const brandChips = document.querySelector('.brand-chips');

    if (!tabs.length && !selectCat) return;
    tabs.forEach(t => { t.dataset.category = t.id.replace(/^tabbtn-/, ''); });

    // ===== Дані
    async function loadData() {
        if (cache) return cache;
        const res = await fetch(DATA_URL, { cache: 'no-cache' });
        if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
        cache = await res.json();
        return cache;
    }

    // ===== Утиліти
    function money(v) {
        if (v == null) return '';
        return new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH', maximumFractionDigits: 0 }).format(v);
    }
    function labelByCat(key) {
        const map = { all: 'Усе', seeds: 'Насіння', fert: 'Добрива', protect: 'Захист', covers: 'Покривні', seedlings: 'Саджанці', bulbs: 'Цибулькові', onionsets: 'Цибуля-сівок', myc: 'Міцелій' };
        return map[key] || key;
    }
    function labelBySubcat(catKey, subKey) {
        const list = SUBCATS[catKey] || [];
        const found = list.find(s => s.key === subKey);
        return found ? found.label : (subKey || '');
    }
    const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeDecode = s => { try { return JSON.parse(decodeURIComponent(s)); } catch { return null; } };
    function resolveImg(name) {
        if (!name) return IMG_BASE + PLACEHOLDER;
        if (/^https?:\/\//i.test(name)) return name;
        if (name.startsWith('/')) return name;
        return IMG_BASE + name;
    }
    function clearNode(n) { if (!n) return; while (n.firstChild) n.removeChild(n.firstChild); }

    // ===== Картка товару
    function cardHTML(item) {
        const data = {
            id: item.id || `${(item.category || '')}-${esc(item.title || '')}`,
            category: item.category,
            subcat: item.subcat || '',
            brand: item.brand || '',
            title: item.title || 'Без назви',
            price: item.price ?? null,
            image: resolveImg(item.image),
            desc: item.desc || '',
            longDesc: item.longDesc || '',
            stock: Number.isFinite(item.stock) ? item.stock : 0,
            width: item.width || 320,
            height: item.height || 240
        };
        const payload = encodeURIComponent(JSON.stringify(data));
        const stockCls = data.stock > 0 ? 'in' : 'out';
        const stockTxt = data.stock > 0 ? `В наявності: ${data.stock} шт` : 'Немає в наявності';

        return `
      <article class="product-card">
        <img class="product-media" src="${data.image}" alt="${esc(data.title)}"
             loading="lazy" decoding="async" width="${data.width}" height="${data.height}">
        <div class="product-body">
          <div class="badge-row">
            ${data.category ? `<span class="badge">${labelByCat(data.category)}</span>` : ``}
            ${data.subcat ? `<span class="badge badge--sub">${labelBySubcat(data.category, data.subcat)}</span>` : ``}
            ${data.brand ? `<span class="badge">${esc(data.brand)}</span>` : ``}
          </div>
          <h3 class="product-title">${data.title}</h3>
          <div class="product-meta">
            <div>
              ${data.price != null ? `<div class="product-price">${money(data.price)}</div>` : ``}
              <div class="product-stock ${stockCls}">${stockTxt}</div>
            </div>
            <div class="product-cta">
              <button class="btn btn--secondary" type="button" data-action="info" data-item="${payload}">Деталі</button>
              <button class="btn" type="button" data-action="add" data-item="${payload}" ${data.stock <= 0 ? 'disabled' : ''}>У кошик</button>
            </div>
          </div>
        </div>
      </article>`;
    }

    // ===== Модалка
    const backdropEl = document.getElementById('product-backdrop');
    const modalEl = document.getElementById('product-modal');

    const pmImg = document.getElementById('pm-img');
    const pmTitle = document.getElementById('pm-title');
    const pmDesc = document.getElementById('pm-desc');
    const pmLong = document.getElementById('pm-long');
    const pmCat = document.getElementById('pm-cat');
    const pmSub = document.getElementById('pm-sub');
    const pmBrand = document.getElementById('pm-brand');
    const pmPrice = document.getElementById('pm-price');
    const pmAddBtn = document.getElementById('pm-add');

    let qtyInput, decBtn, incBtn;
    let lastFocus = null;
    let currentItem = null;

    function ensureQtyControls(max) {
        if (!modalEl) return;
        qtyInput = modalEl.querySelector('#pm-qty') || modalEl.querySelector('.qty-input');
        decBtn = modalEl.querySelector('#pm-minus') || modalEl.querySelector('.qty-btn[data-op="dec"]');
        incBtn = modalEl.querySelector('#pm-plus') || modalEl.querySelector('.qty-btn[data-op="inc"]');
        if (!qtyInput || !decBtn || !incBtn) return;

        const clamp = (v, m) => {
            const maxV = Math.max(Number(m) || 0, 0);
            if (maxV === 0) return 0;
            v = Number.isFinite(+v) ? +v : 1;
            return Math.min(Math.max(v, 1), maxV);
        };
        const sync = (m) => {
            const v = +qtyInput.value || 0;
            decBtn.disabled = v <= 1;
            incBtn.disabled = v >= (Math.max(Number(m) || 0, 0));
            if (pmAddBtn) pmAddBtn.disabled = (m <= 0) || v <= 0;
        };

        decBtn.onclick = () => { qtyInput.value = clamp((+qtyInput.value || 1) - 1, qtyInput.max); sync(qtyInput.max); };
        incBtn.onclick = () => { qtyInput.value = clamp((+qtyInput.value || 1) + 1, qtyInput.max); sync(qtyInput.max); };
        qtyInput.oninput = () => { qtyInput.value = clamp(qtyInput.value, qtyInput.max); sync(qtyInput.max); };

        qtyInput.max = String(max);
        qtyInput.value = max > 0 ? '1' : '0';
        sync(qtyInput.max);
    }

    function openModal(item) {
        if (!modalEl) return;
        currentItem = item;

        pmImg.src = item.image || (IMG_BASE + PLACEHOLDER);
        pmImg.alt = item.title || 'Товар';
        pmTitle.textContent = item.title || 'Товар';
        pmDesc.textContent = item.desc || '';
        if (pmLong) pmLong.textContent = item.longDesc || '';
        pmCat.textContent = labelByCat(item.category);
        if (item.subcat) { pmSub.textContent = labelBySubcat(item.category, item.subcat); pmSub.hidden = false; } else pmSub.hidden = true;
        if (item.brand) { pmBrand.textContent = item.brand; pmBrand.hidden = false; } else pmBrand.hidden = true;
        pmPrice.textContent = item.price != null ? money(item.price) : 'за запитом';

        const max = Math.max(Number(item.stock) || 0, 0);
        ensureQtyControls(max);

        lastFocus = document.activeElement;

        if (backdropEl) { backdropEl.classList.add('open'); backdropEl.setAttribute('aria-hidden', 'false'); }
        modalEl.classList.add('open', 'is-open');
        modalEl.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';

        if (pmAddBtn) pmAddBtn.focus();
    }

    function closeModal() {
        if (backdropEl) { backdropEl.classList.remove('open'); backdropEl.setAttribute('aria-hidden', 'true'); }
        if (!modalEl) return;
        modalEl.classList.remove('open', 'is-open');
        modalEl.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
        currentItem = null;
    }

    if (modalEl) {
        // Закриття по кнопці-хрестику
        modalEl.addEventListener('click', (e) => { if (e.target.matches('[data-close]')) closeModal(); });
        // Закриття по бекдропу
        if (backdropEl) backdropEl.addEventListener('click', closeModal);
        // ESC
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modalEl.classList.contains('open')) closeModal(); });

        // Додати в кошик з модалки
        if (pmAddBtn) {
            pmAddBtn.addEventListener('click', () => {
                if (!currentItem) return;
                const max = Math.max(Number(currentItem.stock) || 0, 0);
                const q = Math.max(1, Math.min(+((modalEl.querySelector('#pm-qty') || modalEl.querySelector('.qty-input'))?.value || 1), max));
                addToCart(currentItem, q);
                closeModal();
            });
        }
    }

    // ===== Дії на картках
    function attachCardActions(scope) {
        scope.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-action]');
            if (!btn) return;
            const item = safeDecode(btn.getAttribute('data-item'));
            if (!item) return;

            if (btn.dataset.action === 'info') {
                openModal(item);
                return;
            }
            if (btn.dataset.action === 'add') {
                if (item.stock <= 0) return;
                addToCart(item, 1);
                btn.textContent = 'Додано';
                setTimeout(() => { btn.textContent = 'У кошик'; }, 1200);
            }
        }, { once: false });
    }

    // ===== LocalStorage кошика
    function readCart() {
        try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch { return []; }
    }
    function writeCart(list) {
        localStorage.setItem(CART_KEY, JSON.stringify(list));
        document.dispatchEvent(new Event('cart:changed'));
    }
    function addToCart(item, qty = 1) {
        const cart = readCart();
        const key = (item.category || '') + '|' + (item.title || '');
        const found = cart.find(x => ((x.category || '') + '|' + (x.title || '')) === key);

        const clean = {
            title: item.title || 'Товар',
            category: item.category || '',
            brand: item.brand || '',
            price: item.price ?? null,
            image: item.image || (IMG_BASE + PLACEHOLDER)
        };
        const maxQty = Math.max(Number(item.stock) || Infinity, 0);

        if (found) {
            found.qty = Math.min((found.qty || 1) + qty, maxQty);
        } else {
            cart.push({ ...clean, qty: Math.min(qty, maxQty) });
        }
        writeCart(cart);
    }

    // ===== URL params
    function readParams() {
        const sp = new URLSearchParams(location.search);
        return { cat: sp.get('cat') || 'all', sub: sp.get('sub') || '', brand: sp.get('brand') || '' };
    }
    function writeParams(patch, push = true) {
        const url = new URL(location.href);
        const sp = url.searchParams;
        for (const [k, v] of Object.entries(patch)) {
            if (v === '' || v == null) sp.delete(k); else sp.set(k, v);
        }
        url.search = sp.toString();
        push ? history.pushState(null, '', url) : history.replaceState(null, '', url);
    }

    // ===== Підкатегорії / Бренди
    function renderSubcats(cat) {
        const list = SUBCATS[cat] || [];
        state.subcat = '';
        if (!list.length || cat === 'all') {
            if (subWrap) subWrap.hidden = true;
            clearNode(subSelect); clearNode(subChipsBox);
            renderBrands(cat);
            return;
        }
        if (subWrap) subWrap.hidden = false;

        clearNode(subSelect);
        if (subSelect) {
            const optAll = document.createElement('option');
            optAll.value = ''; optAll.textContent = 'Усі підкатегорії';
            subSelect.appendChild(optAll);
            list.forEach(sc => { const o = document.createElement('option'); o.value = sc.key; o.textContent = sc.label; subSelect.appendChild(o); });
        }

        clearNode(subChipsBox);
        if (subChipsBox) {
            list.forEach(sc => {
                const b = document.createElement('button');
                b.type = 'button'; b.className = 'chip-btn'; b.textContent = sc.label;
                b.setAttribute('aria-pressed', 'false'); b.dataset.subcat = sc.key;
                b.addEventListener('click', () => { writeParams({ sub: sc.key, brand: '' }); applyFromParams(); });
                subChipsBox.appendChild(b);
            });
        }
        renderBrands(cat);
    }

    function renderBrands(cat) {
        const list = BRANDS[cat] || [];
        state.brand = '';
        if (!list.length || cat === 'all') {
            if (brandWrap) brandWrap.hidden = true;
            clearNode(brandSelect); clearNode(brandChips);
            return;
        }
        if (brandWrap) brandWrap.hidden = false;

        clearNode(brandSelect);
        if (brandSelect) {
            const optAll = document.createElement('option');
            optAll.value = ''; optAll.textContent = 'Усі виробники';
            brandSelect.appendChild(optAll);
            list.forEach(br => { const o = document.createElement('option'); o.value = br.key; o.textContent = br.label; brandSelect.appendChild(o); });
        }

        clearNode(brandChips);
        if (brandChips) {
            list.forEach(br => {
                const b = document.createElement('button');
                b.type = 'button'; b.className = 'brand-chip'; b.textContent = br.label;
                b.setAttribute('aria-pressed', 'false'); b.dataset.brand = br.key;
                b.addEventListener('click', () => { writeParams({ brand: br.key }); applyFromParams(); });
                brandChips.appendChild(b);
            });
        }
    }

    // ===== Рендер товарів
    async function renderPanel(panel, catKey) {
        const grid = panel.querySelector('.products-grid');
        if (!grid) return;

        const data = await loadData();
        let items = [];

        if (catKey === 'all') {
            const groups = data.products || {};
            Object.keys(groups).forEach(k => {
                const list = Array.isArray(groups[k]) ? groups[k] : [];
                items.push(...list.slice(0, ALL_PER_CAT).map(x => ({ ...x, category: x.category || k })));
            });
        } else {
            const list = (data.products && data.products[catKey]) || [];
            items = list.map(x => ({ ...x, category: x.category || catKey }));
        }

        if (state.subcat) items = items.filter(x => (x.subcat || '').toLowerCase() === state.subcat.toLowerCase());
        if (state.brand) items = items.filter(x => (x.brand || '').toLowerCase() === state.brand.toLowerCase());
        if (catKey !== 'all') items = items.slice(0, PAGE_SIZE);

        grid.innerHTML = items.length
            ? items.map(cardHTML).join('')
            : '<p style="text-align:center;color:#555;">Немає товарів за вибраними фільтрами.</p>';

        attachCardActions(grid);
    }

    // ===== Активні стани
    function setActiveCategory(cat) {
        state.cat = cat;
        if (tabs.length) tabs.forEach(t => t.setAttribute('aria-selected', String(t.dataset.category === cat)));
        panels.forEach(p => { p.hidden = (p.id !== `tab-${cat}`); });
        if (selectCat) selectCat.value = cat;
        renderSubcats(cat);
    }
    function setActiveSubcat(cat, sub) {
        state.subcat = sub || '';
        if (subSelect) subSelect.value = state.subcat;
        if (subChipsBox) [...subChipsBox.querySelectorAll('.chip-btn')].forEach(x => {
            x.setAttribute('aria-pressed', String(x.dataset.subcat === state.subcat && !!state.subcat));
        });
    }
    function setActiveBrand(cat, brand) {
        state.brand = brand || '';
        if (brandSelect) brandSelect.value = state.brand;
        if (brandChips) [...brandChips.querySelectorAll('.brand-chip')].forEach(x => {
            x.setAttribute('aria-pressed', String(x.dataset.brand === state.brand && !!state.brand));
        });
    }

    function applyFromParams() {
        const p = readParams();
        const cats = new Set(['all', 'seeds', 'fert', 'protect', 'covers', 'seedlings', 'bulbs', 'onionsets', 'myc']);
        const cat = cats.has(p.cat) ? p.cat : 'all';

        setActiveCategory(cat);

        const validSubs = new Set((SUBCATS[cat] || []).map(s => s.key));
        const validBrands = new Set((BRANDS[cat] || []).map(b => b.key));
        const sub = p.sub && validSubs.has(p.sub) ? p.sub : '';
        const brand = p.brand && validBrands.has(p.brand) ? p.brand : '';

        setActiveSubcat(cat, sub);
        setActiveBrand(cat, brand);

        const panel = document.getElementById(`tab-${cat}`);
        if (panel) renderPanel(panel, cat);
    }

    // Події
    if (tabs.length) {
        tabs.forEach(t => t.addEventListener('click', () => {
            const cat = t.dataset.category;
            writeParams({ cat, sub: '', brand: '' });
            applyFromParams();
        }));
        tablist.addEventListener('keydown', (e) => {
            const i = tabs.indexOf(document.activeElement);
            if (i === -1) return;
            if (e.key === 'ArrowRight') { e.preventDefault(); (tabs[i + 1] || tabs[0]).focus(); (tabs[i + 1] || tabs[0]).click(); }
            if (e.key === 'ArrowLeft') { e.preventDefault(); (tabs[i - 1] || tabs[tabs.length - 1]).focus(); (tabs[i - 1] || tabs[tabs.length - 1]).click(); }
            if (e.key === 'Home') { e.preventDefault(); tabs[0].focus(); tabs[0].click(); }
            if (e.key === 'End') { e.preventDefault(); tabs[tabs.length - 1].focus(); tabs[tabs.length - 1].click(); }
        });
    }
    if (selectCat) {
        selectCat.addEventListener('change', () => {
            writeParams({ cat: selectCat.value, sub: '', brand: '' });
            applyFromParams();
        });
    }
    if (subSelect) {
        subSelect.addEventListener('change', () => {
            writeParams({ sub: subSelect.value || '', brand: '' });
            applyFromParams();
        });
    }
    if (brandSelect) {
        brandSelect.addEventListener('change', () => {
            writeParams({ brand: brandSelect.value || '' });
            applyFromParams();
        });
    }

    window.addEventListener('popstate', applyFromParams);
    applyFromParams();
})();
