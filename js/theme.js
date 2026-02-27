/**
 * Neon Card Theme System
 * Handles Dark, Light, and System themes.
 * Must be loaded in <head> to prevent FOUC (Flash of Unstyled Content).
 */

(function () {
    // 1. Determine saved theme or default
    const savedTheme = localStorage.getItem('neoncard-theme') || 'system';

    // 2. Function to update toggle buttons UI
    function updateAllToggleButtons(theme) {
        let label = '💻 系統';
        if (theme === 'dark') label = '🌙 深色';
        else if (theme === 'light') label = '☀️ 淺色';

        // Wait for DOM if it's not ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                document.querySelectorAll('.theme-toggle-btn').forEach(btn => btn.innerHTML = label);
            }, { once: true });
        } else {
            document.querySelectorAll('.theme-toggle-btn').forEach(btn => btn.innerHTML = label);
        }
    }

    // 3. Function to apply theme
    function applyTheme(theme) {
        if (theme === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        } else {
            document.documentElement.setAttribute('data-theme', theme);
        }
        updateAllToggleButtons(theme);
    }

    // 4. Initial Apply
    applyTheme(savedTheme);

    // 5. Listen to system preference changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (localStorage.getItem('neoncard-theme') === 'system') {
            applyTheme('system');
        }
    });

    // 6. Expose global theme manager
    window.ThemeManager = {
        getTheme: function () {
            return localStorage.getItem('neoncard-theme') || 'system';
        },
        setTheme: function (theme) {
            localStorage.setItem('neoncard-theme', theme);
            applyTheme(theme);

            // Dispatch event for UI components to update
            window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
        },
        toggleNextTheme: function () {
            const current = this.getTheme();
            const themes = ['dark', 'light', 'system'];
            const nextIndex = (themes.indexOf(current) + 1) % themes.length;
            const nextTheme = themes[nextIndex];
            this.setTheme(nextTheme);
            return nextTheme;
        },
        getCurrentAppliedTheme: function () {
            return document.documentElement.getAttribute('data-theme');
        }
    };
})();
