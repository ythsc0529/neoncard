/**
 * Neon Card Game - Title Manager
 * Handles unlocking titles and queuing notifications.
 */
const TitleManager = (() => {
    const STORAGE_KEY = 'neonCard_newlyUnlockedTitles';

    /**
     * Attempts to unlock a title for the current user.
     * @param {string} titleKey The key of the title to unlock.
     * @param {boolean} showInBattle Whether to show a small fly-in notification immediately.
     */
    async function unlockTitle(titleKey, showInBattle = true) {
        if (typeof AuthManager === 'undefined' || typeof UserProfile === 'undefined') return;
        
        const user = AuthManager.getCurrentUser();
        if (!user) return;

        // Fetch profile to check if already unlocked
        const profile = await UserProfile.getProfile(user.uid);
        if (!profile) return;

        const currentTitles = profile.titles || [];
        if (currentTitles.includes(titleKey)) return;

        console.log(`[TitleManager] Unlocking new title: ${titleKey}`);

        // 1. Add to database
        await UserProfile.addTitle(user.uid, titleKey);

        // 2. Add to localStorage for main menu celebration
        queueForMainMenu(titleKey);

        // 3. Show in-battle notification if requested
        if (showInBattle && typeof Animations !== 'undefined' && Animations.showSmallTitleUnlock) {
            Animations.showSmallTitleUnlock(titleKey);
        }
    }

    function queueForMainMenu(titleKey) {
        let items = [];
        try {
            items = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        } catch (e) { items = []; }
        
        if (!items.includes(titleKey)) {
            items.push(titleKey);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        }
    }

    function getPendingUnlocks() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        } catch (e) { return []; }
    }

    function clearPendingUnlocks() {
        localStorage.removeItem(STORAGE_KEY);
    }

    return {
        unlockTitle,
        queueForMainMenu,
        getPendingUnlocks,
        clearPendingUnlocks
    };
})();

window.TitleManager = TitleManager;
