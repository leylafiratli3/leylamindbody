// Shared client logic for the video classes store (EN + TR pages).
// Loaded after the Supabase CDN script:
//   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
//   <script src="store.js"></script>
// Only publishable values live here, the anon key is designed to be public;
// all secrets stay on the server (Fly.io).

const STORE_API_URL = 'https://leyla-mindbody-api.fly.dev';
const SUPABASE_URL = 'TODO_SUPABASE_URL'; // TODO: fill in, https://<project>.supabase.co
const SUPABASE_ANON_KEY = 'TODO_SUPABASE_ANON_KEY'; // TODO: fill in, anon/public key (safe for browsers)

const Store = (() => {
    const locale = window.location.pathname.startsWith('/tr/') ? 'tr' : 'en';

    // EN page ↔ TR page counterparts, used by the context-aware language toggle.
    const PAGE_MAP = {
        'classes.html': 'dersler.html',
        'product.html': 'ders.html',
        'watch.html': 'izle.html',
        'library.html': 'kutuphane.html',
        'login.html': 'giris.html',
        'set-password.html': 'sifre-olustur.html',
        'forgot-password.html': 'sifremi-unuttum.html',
        'checkout-success.html': 'odeme-basarili.html',
    };
    const PAGE_MAP_REVERSE = Object.fromEntries(Object.entries(PAGE_MAP).map(([en, tr]) => [tr, en]));

    const STRINGS = {
        en: {
            login: 'Log in', logout: 'Log out', library: 'My Library',
            loading: 'Loading…', buy: 'Buy', owned: 'In your library, watch',
            error: 'Something went wrong. Please try again.',
        },
        tr: {
            login: 'Giriş yap', logout: 'Çıkış yap', library: 'Kütüphanem',
            loading: 'Yükleniyor…', buy: 'Satın al', owned: 'Kütüphanenizde, izleyin',
            error: 'Bir şeyler ters gitti. Lütfen tekrar deneyin.',
        },
    };
    const t = STRINGS[locale];

    const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    function getParam(name) {
        return new URLSearchParams(window.location.search).get(name);
    }

    function formatPrice(minorUnits, currency) {
        return new Intl.NumberFormat(currency === 'TRY' ? 'tr-TR' : 'en-US', {
            style: 'currency', currency, minimumFractionDigits: minorUnits % 100 === 0 ? 0 : 2,
        }).format(minorUnits / 100);
    }

    async function getSession() {
        const { data } = await sb.auth.getSession();
        return data.session;
    }

    async function apiFetch(path, { method = 'GET', body, auth = false } = {}) {
        const headers = { 'Content-Type': 'application/json' };
        if (auth) {
            const session = await getSession();
            if (!session) throw Object.assign(new Error('not_logged_in'), { code: 'not_logged_in' });
            headers['Authorization'] = 'Bearer ' + session.access_token;
        }
        const res = await fetch(STORE_API_URL + path, {
            method, headers, body: body ? JSON.stringify(body) : undefined,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw Object.assign(new Error(data.error || 'request_failed'), { status: res.status, code: data.error });
        return data;
    }

    // --- API calls -----------------------------------------------------------
    const api = {
        products: () => apiFetch(`/api/products?locale=${locale}`),
        product: (slug) => apiFetch(`/api/products/${encodeURIComponent(slug)}?locale=${locale}`),
        library: () => apiFetch(`/api/library?locale=${locale}`, { auth: true }),
        checkout: (slug) => apiFetch('/api/checkout', { method: 'POST', body: { slug, locale } }),
        videoToken: (slug) => apiFetch('/api/video-token', { method: 'POST', body: { slug, locale }, auth: true }),
    };

    async function buy(slug, button) {
        if (button) { button.disabled = true; button.dataset.originalText = button.textContent; button.textContent = '…'; }
        try {
            const { url } = await api.checkout(slug);
            window.location.href = url;
        } catch (err) {
            if (button) { button.disabled = false; button.textContent = button.dataset.originalText; }
            alert(t.error);
        }
    }

    // --- Header wiring -------------------------------------------------------
    // Fills #store-auth-nav / #store-auth-nav-mobile with login-or-library/logout,
    // and points #store-lang-toggle at the counterpart page in the other language.
    function pageFile() {
        const parts = window.location.pathname.split('/');
        return parts[parts.length - 1] || 'index.html';
    }

    function counterpartUrl() {
        const file = pageFile();
        const other = locale === 'en'
            ? '/tr/' + (PAGE_MAP[file] || '')
            : '/' + (PAGE_MAP_REVERSE[file] || '');
        const slug = getParam('p');
        return slug ? `${other}?p=${encodeURIComponent(slug)}` : other;
    }

    async function renderHeader() {
        document.querySelectorAll('.store-lang-toggle').forEach((a) => { a.href = counterpartUrl(); });

        const session = await getSession();
        const dir = locale === 'en'
            ? { login: 'login.html', library: 'library.html' }
            : { login: 'giris.html', library: 'kutuphane.html' };

        const desktopHtml = session
            ? `<a href="${dir.library}" class="nav-link font-display transition-colors py-1">${t.library}</a>
               <button type="button" class="store-logout nav-cta nav-lang-btn inline-flex items-center border font-display transition-colors">${t.logout}</button>`
            : `<a href="${dir.login}" class="nav-cta nav-lang-btn inline-flex items-center border font-display transition-colors">${t.login}</a>`;
        const mobileHtml = session
            ? `<a href="${dir.library}" class="block py-2.5 text-base font-medium text-clay-600 hover:text-theme-primary font-display">${t.library}</a>
               <button type="button" class="store-logout block py-2.5 text-base font-medium text-clay-600 hover:text-theme-primary font-display">${t.logout}</button>`
            : `<a href="${dir.login}" class="block py-2.5 text-base font-medium text-clay-600 hover:text-theme-primary font-display">${t.login}</a>`;

        const desktop = document.getElementById('store-auth-nav');
        const mobile = document.getElementById('store-auth-nav-mobile');
        if (desktop) desktop.innerHTML = desktopHtml;
        if (mobile) mobile.innerHTML = mobileHtml;

        document.querySelectorAll('.store-logout').forEach((btn) => {
            btn.addEventListener('click', async () => {
                await sb.auth.signOut();
                window.location.href = locale === 'en' ? '/classes.html' : '/tr/dersler.html';
            });
        });
    }

    document.addEventListener('DOMContentLoaded', renderHeader);

    return { locale, t, sb, api, buy, getParam, formatPrice, getSession, renderHeader };
})();
