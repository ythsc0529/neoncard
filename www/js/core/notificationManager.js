/**
 * Neon Card - Notification Manager
 * Monitors claimable rewards and updates UI red dots.
 */
const NotificationManager = (() => {
    let currentProfile = null;

    function init(profile) {
        currentProfile = profile;
        updateAllDots();
    }

    function refresh(profile) {
        currentProfile = profile;
        updateAllDots();
    }

    function checkStates() {
        if (!currentProfile) return {};
        
        return {
            missions: checkMissions(),
            pass: checkPass(),
            trial: checkTrial(),
            shop: checkShop()
        };
    }

    function checkMissions() {
        if (typeof MissionLogic === 'undefined' || typeof MISSIONS_DATA === 'undefined') return false;
        return MISSIONS_DATA.some(m => MissionLogic.canClaim(m, currentProfile));
    }

    function checkPass() {
        if (typeof PassLogic === 'undefined') return false;
        return PassLogic.canClaimAny(currentProfile);
    }

    function checkTrial() {
        if (typeof TrialLogic === 'undefined') return false;
        return TrialLogic.canClaimAny(currentProfile);
    }

    function checkShop() {
        if (typeof GachaLogic === 'undefined') return false;
        return GachaLogic.hasFreePull(currentProfile);
    }

    function updateAllDots() {
        if (!currentProfile) return;
        const states = checkStates();
        
        // Update elements with data-notification attribute
        // missions, shop, pass, trial
        document.querySelectorAll('[data-notification]').forEach(el => {
            const type = el.getAttribute('data-notification');
            const dot = el.querySelector('.notify-dot');
            if (dot) {
                if (states[type]) dot.classList.add('active');
                else dot.classList.remove('active');
            }
        });
    }

    return {
        init,
        refresh,
        checkStates,
        updateAllDots
    };
})();
