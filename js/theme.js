/**
 * Neon Card Theme System
 * Handles Dark, Light, and System themes.
 * Must be loaded in <head> to prevent FOUC (Flash of Unstyled Content).
 */

(function () {
    // 1. Force dark mode
    document.documentElement.setAttribute('data-theme', 'dark');

    // 2. Expose global theme manager (kept for compatibility with other scripts)
    window.ThemeManager = {
        getTheme: function () {
            return 'dark';
        },
        setTheme: function (theme) {
            // Ignored, always dark mode
        },
        toggleNextTheme: function () {
            // Ignored, always dark mode
            return 'dark';
        },
        getCurrentAppliedTheme: function () {
            return 'dark';
        }
    };
})();
