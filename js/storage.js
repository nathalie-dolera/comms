// Client cache for the server-owned MongoDB data. Sensitive data and sessions
// are never persisted to localStorage; API authorization is enforced on Vercel.
const Storage = {
    KEYS: {
        SUBMISSIONS: 'thalie_submissions', FEEDBACKS: 'thalie_feedbacks', OUTPUTS: 'thalie_outputs',
        CALENDAR: 'thalie_calendar_events', ABOUT: 'thalie_about_content', TERMS: 'thalie_terms_content',
        ADMIN_USERS: 'thalie_admin_users', ADMIN_SESSION: 'thalie_admin_session',
        DEFAULT_FEEDBACK_IMAGE: 'thalie_default_feedback_image', OUTPUT_CATEGORIES: 'thalie_output_categories',
        PAYMENTS: 'thalie_payments', PAYMENT_PROOFS: 'thalie_payment_proofs', SITE_SETTINGS: 'thalie_site_settings',
        SERVICES: 'thalie_services', THEME: 'thalie_site_theme', CLIENT_ACCOUNTS: 'thalie_client_accounts'
    },
    SYSTEM_FALLBACK_FEEDBACK_IMAGE: 'assets/images/default-proof.svg',
    cache: {},
    user: null,
    ready: null,
    lastError: null,
    writes: {},

    async request(path, options = {}) {
        const response = await fetch(path, {
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
            ...options
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
        return payload;
    },

    async refresh() {
        const [authResult, dataResult] = await Promise.all([
            this.request('/api/auth').catch(error => ({ user: null, error })),
            this.request('/api/data').catch(error => ({ data: {}, error }))
        ]);
        this.user = authResult.user || null;
        this.cache = dataResult.data || {};
        this.cache[this.KEYS.ADMIN_SESSION] = this.user;
        this.lastError = authResult.error || dataResult.error || null;
        if (this.lastError) {
            console.warn('Server data is unavailable:', this.lastError.message);
            document.documentElement.dataset.dataStatus = 'offline';
        } else {
            delete document.documentElement.dataset.dataStatus;
        }
        return this;
    },

    get(key, defaultVal = []) {
        if (key === this.KEYS.ADMIN_SESSION) return this.user;
        return Object.prototype.hasOwnProperty.call(this.cache, key) ? this.cache[key] : defaultVal;
    },

    set(key, value) {
        if (key === this.KEYS.ADMIN_SESSION || key === this.KEYS.ADMIN_USERS) return;
        const oldValue = this.cache[key];
        this.cache[key] = value;
        const previousWrite = this.writes[key] || Promise.resolve();
        const nextWrite = previousWrite.catch(() => {}).then(() => this.request('/api/data', {
            method: 'PUT', body: JSON.stringify({ key, value })
        }));
        this.writes[key] = nextWrite;
        nextWrite.catch(error => {
            if (oldValue === undefined) delete this.cache[key];
            else this.cache[key] = oldValue;
            this.lastError = error;
            document.dispatchEvent(new CustomEvent('storageerror', { detail: { key, message: error.message } }));
        });
    },

    async login(accountName, password) {
        const result = await this.request('/api/auth', {
            method: 'POST', body: JSON.stringify({ action: 'login', accountName, password })
        });
        this.user = result.user;
        await this.refresh();
        return result.user;
    },

    async registerCommissioner(accountName, password, avatar) {
        return this.request('/api/auth', {
            method: 'POST', body: JSON.stringify({ action: 'register', accountName, password, avatar })
        });
    },

    async logout() {
        await this.request('/api/auth', { method: 'POST', body: JSON.stringify({ action: 'logout' }) });
        this.user = null;
        this.cache[this.KEYS.ADMIN_SESSION] = null;
        await this.refresh();
    },

    async updateAvatar(avatar) {
        await this.request('/api/profile', { method: 'PUT', body: JSON.stringify({ avatar }) });
        await this.refresh();
    },

    async decideCommissioner(id, status) {
        await this.request('/api/admin-accounts', {
            method: 'POST', body: JSON.stringify({ id, status })
        });
        await this.refresh();
    },

    async submitCommission(data) {
        return this.request('/api/submissions', { method: 'POST', body: JSON.stringify(data) });
    },

    async searchCommissions(query) {
        try {
            const res = await this.request(`/api/client-commissions?q=${encodeURIComponent(query)}`);
            if (res && Array.isArray(res.commissions)) return res.commissions;
        } catch (e) {
            console.warn('Remote search failed, falling back to local cache:', e.message);
        }
        const q = String(query || '').toLowerCase().trim();
        const list = this.get(this.KEYS.SUBMISSIONS, []);
        return list.filter(s => {
            const nameMatch = String(s.name || '').toLowerCase().includes(q);
            const idMatch = String(s.id || '').toLowerCase().includes(q);
            return nameMatch || idMatch;
        });
    },

    async updateClientCommission(id, data) {
        try {
            return await this.request('/api/client-commissions', {
                method: 'PUT',
                body: JSON.stringify({ id, ...data })
            });
        } catch (e) {
            console.warn('Remote update failed, updating local cache:', e.message);
            const list = this.get(this.KEYS.SUBMISSIONS, []);
            const idx = list.findIndex(s => s.id === id);
            if (idx !== -1) {
                list[idx] = { ...list[idx], ...data, updatedAt: new Date().toISOString() };
                this.set(this.KEYS.SUBMISSIONS, list);
                return { ok: true, commission: list[idx] };
            }
            throw e;
        }
    },

    async verifyReceipt(receiptBase64, extra = {}) {
        return this.request('/api/verify-receipt', {
            method: 'POST',
            body: JSON.stringify({ receipt: receiptBase64, ...extra })
        });
    },

    async submitPaymentProof(data) {
        return this.request('/api/payment-proofs', { method: 'POST', body: JSON.stringify(data) });
    },

    async submitFeedback(data) {
        return this.request('/api/feedback', { method: 'POST', body: JSON.stringify(data) });
    },

    async trackCommission(id) {
        return this.request(`/api/track?id=${encodeURIComponent(id)}`);
    },

    resolveAssetPath(path) {
        if (!path || typeof path !== 'string') return '';
        if (path.startsWith('data:') || path.startsWith('http://') || path.startsWith('https://')) return path;
        const isSubdir = typeof window !== 'undefined' && window.location && (window.location.pathname.includes('/pages/') || window.location.pathname.includes('/admin/'));
        if (isSubdir) return path.startsWith('../') ? path : (path.startsWith('assets/') ? '../' + path : path);
        return path.startsWith('../') ? path.replace(/^\.\.\//, '') : path;
    },

    getDefaultFeedbackImage() {
        const stored = this.get(this.KEYS.DEFAULT_FEEDBACK_IMAGE, null);
        if (stored) return stored;
        const feedbacks = this.get(this.KEYS.FEEDBACKS, []);
        if (Array.isArray(feedbacks)) {
            const item = feedbacks.slice().reverse().find(row => row.imageUrl);
            if (item) return item.imageUrl;
        }
        return this.SYSTEM_FALLBACK_FEEDBACK_IMAGE;
    },

    getTheme() { return this.get(this.KEYS.THEME, 'red'); },
    setTheme(themeName) {
        const theme = themeName || 'red';
        this.set(this.KEYS.THEME, theme);
        this.applyTheme(theme);
    },
    applyTheme(themeName) {
        if (document.documentElement) document.documentElement.setAttribute('data-theme', themeName || 'red');
    }
};

// Hydrate the in-memory cache before page renderers run on DOMContentLoaded.
Storage.ready = Storage.refresh();
const nativeDocumentAddEventListener = document.addEventListener.bind(document);
document.addEventListener = function(type, listener, options) {
    if (type !== 'DOMContentLoaded') return nativeDocumentAddEventListener(type, listener, options);
    return nativeDocumentAddEventListener(type, event => {
        Storage.ready.finally(() => {
            if (typeof listener === 'function') listener.call(document, event);
            else listener?.handleEvent?.(event);
        });
    }, options);
};
Storage.ready.then(() => Storage.applyTheme(Storage.getTheme()));

document.addEventListener('storageerror', event => {
    console.error(`Could not save ${event.detail.key}:`, event.detail.message);
});
