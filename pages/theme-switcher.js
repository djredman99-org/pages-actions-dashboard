// Theme Switcher Module
// Handles dynamic theme switching and persistence

class ThemeSwitcher {
    constructor() {
        this.themes = {
            default: 'theme-default.css',
            light: 'theme-light.css',
            dark: 'theme-dark.css'
        };
        this.currentTheme = this.loadTheme();
        this.themeLink = null;
    }

    /**
     * Load theme preference from localStorage
     * @returns {string} - Theme name (default, light, or dark)
     */
    loadTheme() {
        const savedTheme = localStorage.getItem('dashboard-theme');
        return savedTheme && this.themes[savedTheme] ? savedTheme : 'default';
    }

    /**
     * Save theme preference to localStorage
     * @param {string} theme - Theme name to save
     */
    saveTheme(theme) {
        localStorage.setItem('dashboard-theme', theme);
    }

    /**
     * Initialize theme switcher
     */
    init() {
        // Find or create the theme link element
        this.themeLink = document.querySelector('link[rel="stylesheet"][href*="theme-"]');
        
        if (!this.themeLink) {
            console.error('Theme stylesheet link not found');
            return;
        }

        // Apply the saved theme
        this.applyTheme(this.currentTheme);

        // Set up navigation button click handler
        const themeNavButton = document.getElementById('theme-nav-button');
        if (themeNavButton) {
            themeNavButton.addEventListener('click', () => {
                this.openThemeModal();
                this.closeSideNav();
            });
        }

        // Set up modal close handlers
        const modal = document.getElementById('theme-modal');
        const closeButton = modal?.querySelector('.close-button');
        
        if (closeButton) {
            closeButton.addEventListener('click', () => this.closeThemeModal());
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeThemeModal();
                }
            });
        }

        // Set up theme selection handlers
        const themeRadios = document.querySelectorAll('input[name="theme"]');
        themeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.switchTheme(e.target.value);
                }
            });
        });

        // Update the selected radio button
        this.updateSelectedTheme();

        // Set up side nav toggle
        this.setupSideNav();
    }

    /**
     * Setup side navigation toggle
     */
    setupSideNav() {
        const navToggle = document.getElementById('nav-toggle');
        const sideNav = document.getElementById('side-nav');
        const overlay = document.getElementById('side-nav-overlay');

        if (navToggle && sideNav && overlay) {
            navToggle.addEventListener('click', () => {
                const isOpen = sideNav.classList.contains('open');
                if (isOpen) {
                    this.closeSideNav();
                } else {
                    this.openSideNav();
                }
            });

            overlay.addEventListener('click', () => {
                this.closeSideNav();
            });
        }
    }

    /**
     * Open side navigation
     */
    openSideNav() {
        const sideNav = document.getElementById('side-nav');
        const overlay = document.getElementById('side-nav-overlay');
        
        if (sideNav && overlay) {
            sideNav.classList.add('open');
            overlay.classList.add('show');
        }
    }

    /**
     * Close side navigation
     */
    closeSideNav() {
        const sideNav = document.getElementById('side-nav');
        const overlay = document.getElementById('side-nav-overlay');
        
        if (sideNav && overlay) {
            sideNav.classList.remove('open');
            overlay.classList.remove('show');
        }
    }

    /**
     * Open theme modal
     */
    openThemeModal() {
        const modal = document.getElementById('theme-modal');
        if (modal) {
            modal.style.display = 'block';
            // Update selected theme when opening
            this.updateSelectedTheme();
        }
    }

    /**
     * Close theme modal
     */
    closeThemeModal() {
        const modal = document.getElementById('theme-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Update the selected theme radio button
     */
    updateSelectedTheme() {
        const themeRadio = document.querySelector(`input[name="theme"][value="${this.currentTheme}"]`);
        if (themeRadio) {
            themeRadio.checked = true;
        }
    }

    /**
     * Switch to a different theme
     * @param {string} theme - Theme name (default, light, or dark)
     */
    switchTheme(theme) {
        if (!this.themes[theme]) {
            console.error(`Unknown theme: ${theme}`);
            return;
        }

        this.currentTheme = theme;
        this.applyTheme(theme);
        this.saveTheme(theme);
    }

    /**
     * Apply a theme by updating the stylesheet link
     * @param {string} theme - Theme name to apply
     */
    applyTheme(theme) {
        if (!this.themeLink) {
            return;
        }

        // Validate theme exists before applying
        if (!this.themes[theme]) {
            console.error(`Invalid theme: ${theme}`);
            return;
        }

        const themeFile = this.themes[theme];
        this.themeLink.href = themeFile;
    }

    /**
     * Get the current theme name
     * @returns {string} - Current theme name
     */
    getCurrentTheme() {
        return this.currentTheme;
    }
}

// Global theme switcher instance
let themeSwitcherInstance = null;

// Initialize theme switcher when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    themeSwitcherInstance = new ThemeSwitcher();
    themeSwitcherInstance.init();
    
    // Expose globally for console access
    window.themeSwitcher = themeSwitcherInstance;
    
    console.log('Theme switcher initialized');
});
