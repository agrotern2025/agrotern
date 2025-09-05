// ===================== Константи =====================
const CART_KEY = 'agro_cart_v1';

// ===================== Завантаження шаблонів =====================
async function loadTemplate(path, targetSelector, { mode = 'replace', dedupe = false } = {}) {
    try {
        const res = await fetch(path, { cache: 'no-cache' });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const html = await res.text();
        const target = document.querySelector(targetSelector);
        if (!target) return;

        if (target.tagName === 'HEAD' && mode === 'append') {
            const tpl = document.createElement('template');
            tpl.innerHTML = html;
            for (const el of Array.from(tpl.content.children)) {
                if (dedupe && shouldSkipHeadNode(el)) continue;
                target.appendChild(el.cloneNode(true));
            }
        } else {
            if (mode === 'append') target.insertAdjacentHTML('beforeend', html);
            else target.innerHTML = html;
        }
    } catch (e) {
        console.error(`Не вдалося завантажити ${path}:`, e);
    }
}

function shouldSkipHeadNode(node) {
    const tag = node.tagName;
    if (!tag) return true;
    if (tag === 'TITLE') return document.title && node.textContent.trim() === document.title.trim();
    if (tag === 'LINK') {
        const rel = node.getAttribute('rel');
        const href = node.getAttribute('href');
        if (!href) return true;
        return !!document.head.querySelector(`link[rel="${rel}"][href="${cssEscape(href)}"]`);
    }
    if (tag === 'META') {
        const name = node.getAttribute('name');
        const prop = node.getAttribute('property');
        if (name) return !!document.head.querySelector(`meta[name="${cssEscape(name)}"]`);
        if (prop) return !!document.head.querySelector(`meta[property="${cssEscape(prop)}"]`);
    }
    if (tag === 'SCRIPT') {
        const src = node.getAttribute('src');
        if (!src) return false;
        return !!document.head.querySelector(`script[src="${cssEscape(src)}"]`);
    }
    return false;
}

function cssEscape(v) { return v.replace(/["\\]/g, '\\$&'); }

// ===================== Навігація =====================
function markActiveNav(scope = document) {
    const p = location.pathname.replace(/\/+$/, '');
    scope.querySelectorAll('header a[href]').forEach(a => {
        const href = a.getAttribute('href').replace(/\/+$/, '');
        if (href && href !== '/agrotern/' && p.endsWith(href)) {
            a.setAttribute('aria-current', 'page');
            const li = a.closest('li');
            if (li) li.classList.add('is-active');
        }
    });
}

// ===================== Зображення =====================
function enhanceImages() {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
        const isHero = img.classList.contains('featured-image') || img === document.querySelector('main img');
        if (!isHero && !img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
        if (isHero && !img.hasAttribute('fetchpriority')) img.setAttribute('fetchpriority', 'high');
        if (!img.hasAttribute('width') || !img.hasAttribute('height')) {
            if (img.complete && img.naturalWidth) setWH(img);
            else img.addEventListener('load', () => setWH(img), { once: true });
        }
    });
    function setWH(el) {
        if (!el.hasAttribute('width')) el.setAttribute('width', el.naturalWidth || 1);
        if (!el.hasAttribute('height')) el.setAttribute('height', el.naturalHeight || 1);
    }
}

// ===================== Footer =====================
function setYear() {
    const y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();
}

// ===================== Бургер-меню =====================
function initMobileMenu(scope = document) {
    const toggle = scope.querySelector('.menu-toggle');
    const menu = scope.querySelector('#main-menu');
    if (!toggle || !menu) return;

    const open = () => { toggle.classList.add('active'); toggle.setAttribute('aria-expanded', 'true'); menu.classList.add('show'); };
    const close = () => { toggle.classList.remove('active'); toggle.setAttribute('aria-expanded', 'false'); menu.classList.remove('show'); };

    toggle.addEventListener('click', () => {
        const expanded = toggle.getAttribute('aria-expanded') === 'true';
        expanded ? close() : open();
    });

    // Закриття по кліку на пункт меню
    menu.addEventListener('click', (e) => {
        if (e.target.closest('a')) close();
    });

    // Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && menu.classList.contains('show')) close();
    });

    // Клік поза меню
    document.addEventListener('click', (e) => {
        if (!menu.classList.contains('show')) return;
        if (e.target.closest('.site-nav')) return;
        close();
    });
}

// ===================== Кошик (badge) =====================
function readCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch { return []; }
}
function cartCountTotal(list) {
    return (list || []).reduce((s, it) => s + (it.qty || 1), 0);
}
function updateCartBadge() {
    const el = document.getElementById('cart-count');
    if (!el) return;
    el.textContent = String(cartCountTotal(readCart()));
}

// ===================== Ініціалізація =====================
(async function init() {
    // head
    await loadTemplate('/agrotern/template/head.html', 'head', { mode: 'append', dedupe: true });

    // header
    await loadTemplate('/agrotern/template/header.html', '#header');
    const headerHost = document.getElementById('header');
    if (headerHost) {
        initMobileMenu(headerHost);     // важливо: після інʼєкції
        markActiveNav(headerHost);
        updateCartBadge();              // показати актуальний лічильник
        document.dispatchEvent(new Event('header:ready'));
    }

    // footer
    await loadTemplate('/agrotern/template/footer.html', '#footer');
    setYear();

    // інше
    enhanceImages();
    document.querySelectorAll('a[target="_blank"]').forEach(a => { if (!a.rel) a.rel = 'noopener noreferrer'; });
})();

// Синхронізація бейджа між вкладками/сторінками
window.addEventListener('storage', (e) => { if (e.key === CART_KEY) updateCartBadge(); });
document.addEventListener('cart:changed', updateCartBadge);

(function setupStickyHeader() {
    function init() {
        const header = document.querySelector('.site-header');
        if (!header) return;

        const setH = () => {
            document.documentElement.style.setProperty('--header-h', header.offsetHeight + 'px');
        };
        const onScroll = () => {
            if (window.scrollY > 2) header.classList.add('is-stuck');
            else header.classList.remove('is-stuck');
        };

        setH(); onScroll();
        window.addEventListener('resize', setH);
        window.addEventListener('scroll', onScroll, { passive: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else { init(); }
})();
