/**
 * Neon Card Game - Google Play Store Update System
 * - 檢查 GitHub / 伺服器上的 version.json
 * - 若有新版本，彈出強制更新視窗
 * - 點擊更新按鈕時，自動喚起 Android Google Play 商店（market://）或網頁商店
 */
const Updater = (() => {
    const VERSION_CHECK_URL = "https://raw.githubusercontent.com/ythsc0529/neoncard/main/version.json";
    const PACKAGE_NAME = "app.netlify.uptocard.twa";
    const PLAY_STORE_MARKET_URL = `market://details?id=${PACKAGE_NAME}`;
    const PLAY_STORE_WEB_URL = `https://play.google.com/store/apps/details?id=${PACKAGE_NAME}`;

    // ── 版本比對 ───────────────────────────────────────────────────────────
    function isVersionOlder(local, server) {
        const lp = local.split('.').map(Number);
        const sp = server.split('.').map(Number);
        for (let i = 0; i < Math.max(lp.length, sp.length); i++) {
            const l = lp[i] || 0;
            const s = sp[i] || 0;
            if (s > l) return true;
            if (l > s) return false;
        }
        return false;
    }

    // ── 版本檢查 ────────────────────────────────────────────────────────────
    async function checkVersion(forceShow = false) {
        if (!forceShow && sessionStorage.getItem('update_shown')) return;

        const localVersion = window.APP_VERSION;
        if (!localVersion || localVersion === '0.0.0') {
            console.warn('[Updater] APP_VERSION invalid, skipping check:', localVersion);
            return;
        }

        try {
            const response = await fetch(VERSION_CHECK_URL + "?t=" + Date.now(), { cache: 'no-store' });
            if (!response.ok) throw new Error('HTTP ' + response.status);
            const data = await response.json();

            const serverVersion = data.version;
            console.log(`[Updater] Local: ${localVersion}, Server: ${serverVersion}`);

            if (isVersionOlder(localVersion, serverVersion)) {
                sessionStorage.setItem('update_shown', '1');
                forceUpdate(data.notes || [], serverVersion);
            } else if (forceShow) {
                alert('目前已是最新版本 (' + localVersion + ')！');
            }
        } catch (error) {
            console.warn('[Updater] Version check failed:', error);
            if (forceShow) alert('版本檢查失敗，請檢查網路連線。');
        }
    }

    // ── 顯示更新 Modal ───────────────────────────────────────────────────────
    function forceUpdate(notes, serverVersion) {
        const modal = document.getElementById('updateModal');
        const list = document.getElementById('updateNotesList');
        const versionDisplay = document.getElementById('versionDisplay');
        const btn = document.getElementById('mainUpdateBtn');

        if (versionDisplay) {
            versionDisplay.textContent = `目前版本: ${window.APP_VERSION || '?'} ➔ 最新版本: ${serverVersion || '最新'}`;
        }
        if (btn) {
            btn.textContent = '🚀 前往 Google Play 商店更新';
            btn.disabled = false;
            btn.onclick = (e) => {
                e.preventDefault();
                openStore();
            };
        }
        if (modal) {
            if (list && notes.length > 0) {
                list.innerHTML = notes.map(n => `<li>${n}</li>`).join('');
            }
            modal.classList.add('active');
            modal.onclick = (e) => e.stopPropagation();
        }
    }

    // ── 開啟 Google Play 商店 ─────────────────────────────────────────────────
    function openStore() {
        const isNative = window.Capacitor && window.Capacitor.getPlatform() !== 'web';

        if (isNative) {
            console.log('[Updater] Launching Google Play Store Intent...');
            // 優先嘗試使用 Capacitor App Plugin 或直接呼叫 market://
            if (window.Capacitor?.Plugins?.App?.openUrl) {
                window.Capacitor.Plugins.App.openUrl({ url: PLAY_STORE_MARKET_URL }).catch(() => {
                    window.open(PLAY_STORE_WEB_URL, '_system');
                });
            } else {
                try {
                    window.location.href = PLAY_STORE_MARKET_URL;
                } catch (e) {
                    window.open(PLAY_STORE_WEB_URL, '_system');
                }
            }
        } else {
            // 網頁版直接開啟 Google Play 網頁或官網
            window.open(PLAY_STORE_WEB_URL, '_blank');
        }
    }

    window.Updater = {
        checkVersion,
        openStore,
        startDownloadFlow: openStore,
        initProgressListener: () => {} // 保留以相容舊呼叫
    };
    return window.Updater;
})();

function initUpdater() {
    if (window.Updater) {
        setTimeout(() => window.Updater.checkVersion(), 2000);
    }
}

if (document.readyState === 'complete') {
    initUpdater();
} else {
    window.addEventListener('load', initUpdater);
}


