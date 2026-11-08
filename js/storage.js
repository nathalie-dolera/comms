// Shared Data Management using localStorage
const Storage = {
    KEYS: {
        SUBMISSIONS: 'thalie_submissions',
        FEEDBACKS: 'thalie_feedbacks',
        OUTPUTS: 'thalie_outputs',
        CALENDAR: 'thalie_calendar_events',
        ABOUT: 'thalie_about_content',
        TERMS: 'thalie_terms_content',
        ADMIN_USERS: 'thalie_admin_users',
        ADMIN_SESSION: 'thalie_admin_session',
        DEFAULT_FEEDBACK_IMAGE: 'thalie_default_feedback_image',
        OUTPUT_CATEGORIES: 'thalie_output_categories',
        PAYMENTS: 'thalie_payments',
        PAYMENT_PROOFS: 'thalie_payment_proofs',
        SITE_SETTINGS: 'thalie_site_settings',
        SERVICES: 'thalie_services',
        THEME: 'thalie_site_theme',
        DATA_CLEANSED_V1: 'thalie_data_cleansed_v1',
        SERVICES_CLEANSED_V2: 'thalie_services_cleansed_v2',
        CLIENT_ACCOUNTS: 'thalie_client_accounts'
    },

    SYSTEM_FALLBACK_FEEDBACK_IMAGE: 'assets/images/default-proof.svg',

    resolveAssetPath(path) {
        if (!path || typeof path !== 'string') return '';
        if (path.startsWith('data:') || path.startsWith('http://') || path.startsWith('https://')) return path;
        const isSubdir = typeof window !== 'undefined' && window.location && (window.location.pathname.includes('/pages/') || window.location.pathname.includes('/admin/'));
        if (isSubdir) {
            return path.startsWith('../') ? path : (path.startsWith('assets/') ? '../' + path : path);
        } else {
            return path.startsWith('../') ? path.replace(/^\.\.\//, '') : path;
        }
    },

    getDefaultFeedbackImage() {
        const stored = this.get(this.KEYS.DEFAULT_FEEDBACK_IMAGE, null);
        if (stored && typeof stored === 'string' && stored.trim().length > 0) return stored;

        // Fallback to the latest feedback item that has an image uploaded
        const feedbacks = this.get(this.KEYS.FEEDBACKS, []);
        if (Array.isArray(feedbacks)) {
            const itemWithImg = feedbacks.slice().reverse().find(f => f.imageUrl && typeof f.imageUrl === 'string' && f.imageUrl.trim().length > 0);
            if (itemWithImg) return itemWithImg.imageUrl;
        }

        return this.SYSTEM_FALLBACK_FEEDBACK_IMAGE;
    },

    get(key, defaultVal = []) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultVal;
        } catch (e) {
            console.error('Storage get error', e);
            return defaultVal;
        }
    },

    set(key, val) {
        try {
            localStorage.setItem(key, JSON.stringify(val));
        } catch (e) {
            console.error('Storage set error', e);
        }
    },

    // Seed defaults if empty
    initDefaults() {
        // One-time hardcoded data cleanup: wipe previous mock data from localStorage
        if (!localStorage.getItem(this.KEYS.DATA_CLEANSED_V1)) {
            this.set(this.KEYS.SUBMISSIONS, []);
            this.set(this.KEYS.PAYMENTS, []);
            this.set(this.KEYS.FEEDBACKS, []);
            this.set(this.KEYS.OUTPUTS, []);
            this.set(this.KEYS.CALENDAR, []);
            this.set(this.KEYS.ABOUT, {
                sections: [
                    {
                        id: 'about-1',
                        type: 'about',
                        title: '',
                        subtitle: '',
                        items: []
                    }
                ],
                contacts: []
            });
            this.set(this.KEYS.TERMS, {
                pageTitle: 'Terms & Conditions',
                pageSubtitle: 'Please read carefully before requesting a commission',
                footnote: '',
                sections: [
                    {
                        id: 'term-1',
                        col: 1,
                        style: 'light',
                        title: '',
                        subtitle: '',
                        items: []
                    }
                ]
            });
            localStorage.setItem(this.KEYS.DATA_CLEANSED_V1, 'true');
        }

        // Migration: clear hardcoded services & categories so fresh state is completely blank
        if (!localStorage.getItem(this.KEYS.SERVICES_CLEANSED_V2)) {
            this.set(this.KEYS.SERVICES, []);
            this.set(this.KEYS.OUTPUT_CATEGORIES, []);
            const curSettings = this.get(this.KEYS.SITE_SETTINGS, null);
            if (!curSettings || curSettings.portfolioTitle === "THALIE'S\nPORTFOLIO") {
                this.set(this.KEYS.SITE_SETTINGS, { portfolioTitle: "YOUR NAME\nPORTFOLIO" });
            }
            localStorage.setItem(this.KEYS.SERVICES_CLEANSED_V2, 'true');
        }

        if (!localStorage.getItem(this.KEYS.SERVICES)) {
            this.set(this.KEYS.SERVICES, []);
        }

        if (!localStorage.getItem(this.KEYS.OUTPUT_CATEGORIES)) {
            this.set(this.KEYS.OUTPUT_CATEGORIES, []);
        }

        if (!localStorage.getItem(this.KEYS.ADMIN_USERS)) {
            const defaultAdmins = [
                {
                    username: 'admin',
                    password: 'password123',
                    name: 'Thalie',
                    createdAt: '2026-11-01'
                }
            ];
            this.set(this.KEYS.ADMIN_USERS, defaultAdmins);
        }

        if (!localStorage.getItem(this.KEYS.SUBMISSIONS)) {
            this.set(this.KEYS.SUBMISSIONS, []);
        }

        if (!localStorage.getItem(this.KEYS.FEEDBACKS)) {
            this.set(this.KEYS.FEEDBACKS, []);
        }

        if (!localStorage.getItem(this.KEYS.OUTPUTS)) {
            this.set(this.KEYS.OUTPUTS, []);
        }

        if (!localStorage.getItem(this.KEYS.PAYMENTS)) {
            this.set(this.KEYS.PAYMENTS, []);
        }

        if (!localStorage.getItem(this.KEYS.PAYMENT_PROOFS)) {
            this.set(this.KEYS.PAYMENT_PROOFS, []);
        }

        if (!localStorage.getItem(this.KEYS.CALENDAR)) {
            this.set(this.KEYS.CALENDAR, []);
        }

        if (!localStorage.getItem(this.KEYS.ABOUT)) {
            const defaultAbout = {
                sections: [
                    {
                        id: 'about-1',
                        type: 'about',
                        title: '',
                        subtitle: '',
                        items: []
                    }
                ],
                contacts: []
            };
            this.set(this.KEYS.ABOUT, defaultAbout);
        }

        if (!localStorage.getItem(this.KEYS.SITE_SETTINGS)) {
            const defaultSettings = {
                portfolioTitle: "YOUR NAME\nPORTFOLIO"
            };
            this.set(this.KEYS.SITE_SETTINGS, defaultSettings);
        }

        if (!localStorage.getItem(this.KEYS.TERMS)) {
            const defaultTerms = {
                pageTitle: 'Terms & Conditions',
                pageSubtitle: 'Please read carefully before requesting a commission',
                footnote: '',
                sections: [
                    {
                        id: 'term-1',
                        col: 1,
                        style: 'light',
                        title: '',
                        subtitle: '',
                        items: []
                    }
                ]
            };
            this.set(this.KEYS.TERMS, defaultTerms);
        }

        // Apply theme immediately on startup
        this.applyTheme(this.getTheme());
    },

    getTheme() {
        return this.get(this.KEYS.THEME, 'red');
    },

    setTheme(themeName) {
        this.set(this.KEYS.THEME, themeName);
        this.applyTheme(themeName);
    },

    applyTheme(themeName) {
        const theme = themeName || 'red';
        if (typeof document !== 'undefined' && document.documentElement) {
            document.documentElement.setAttribute('data-theme', theme);
        }
    }
};

// Auto initialize on script load
Storage.initDefaults();

