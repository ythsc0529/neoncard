/** Google Play is authoritative for Android installs; version.json serves the web build. */
const Updater = (() => {
    const VERSION_CHECK_URL = 'https://raw.githubusercontent.com/ythsc0529/neoncard/main/version.json';
    const PACKAGE_NAME = 'app.netlify.uptocard.twa';
    const PLAY_STORE_MARKET_URL = `market://details?id=${PACKAGE_NAME}`;
    const PLAY_STORE_WEB_URL = `https://play.google.com/store/apps/details?id=${PACKAGE_NAME}`;
    let checking = null;
    let lastCheck = 0;
    let playUpdateAvailable = false;

    function isVersionOlder(local, server) {
        const lp = String(local).split('.').map(Number);
        const sp = String(server).split('.').map(Number);
        for (let i = 0; i < Math.max(lp.length, sp.length); i++) {
            const l = lp[i] || 0, s = sp[i] || 0;
            if (s > l) return true;
            if (l > s) return false;
        }
        return false;
    }

    async function fetchManifest() {
        const response = await fetch(VERSION_CHECK_URL + '?t=' + Date.now(), { cache: 'no-store' });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
    }

    function showUpdate(notes, installedVersion, latestVersion, fromPlay) {
        const modal = document.getElementById('updateModal');
        if (!modal) return;
        const list = document.getElementById('updateNotesList');
        const versionDisplay = document.getElementById('versionDisplay');
        const btn = document.getElementById('mainUpdateBtn');
        if (versionDisplay) versionDisplay.textContent = `目前版本：${installedVersion || '?'} · ${fromPlay ? 'Google Play 有可用更新' : `最新版本：${latestVersion}`}`;
        if (list) {
            list.replaceChildren();
            const entries = Array.isArray(notes) && notes.length ? notes : ['新版本已在 Google Play 上架。'];
            entries.forEach(note => {
                const item = document.createElement('li');
                item.textContent = note;
                list.appendChild(item);
            });
        }
        if (btn) {
            btn.textContent = '前往 Google Play 更新';
            btn.disabled = false;
            btn.onclick = event => { event.preventDefault(); openStore(); };
        }
        modal.classList.add('active');
    }

    async function checkVersion(forceShow = false) {
        if (checking) return checking;
        if (!forceShow && Date.now() - lastCheck < 60000) return;
        lastCheck = Date.now();
        checking = (async () => {
            const playPlugin = window.Capacitor?.Plugins?.PlayUpdate;
            if (window.Capacitor?.getPlatform?.() === 'android' && playPlugin?.checkUpdate) {
                try {
                    const state = await playPlugin.checkUpdate();
                    playUpdateAvailable = !!(state.available || state.inProgress);
                    if (playUpdateAvailable) {
                        // Show immediately; release notes are optional and may be offline.
                        showUpdate([], state.installedVersion, null, true);
                        fetchManifest().then(manifest => {
                            if (manifest.version && isVersionOlder(state.installedVersion, manifest.version)) {
                                showUpdate(manifest.notes, state.installedVersion, manifest.version, true);
                            }
                        }).catch(() => {});
                    } else if (forceShow) {
                        alert(`目前已是最新版本 (${state.installedVersion})！`);
                    }
                    return;
                } catch (error) {
                    console.warn('[Updater] Play update check failed:', error);
                    if (forceShow) alert('無法連線 Google Play 檢查更新，請稍後再試。');
                    return;
                }
            }
            const localVersion = window.APP_VERSION;
            if (!localVersion || localVersion === '0.0.0') return;
            try {
                const manifest = await fetchManifest();
                if (isVersionOlder(localVersion, manifest.version)) {
                    showUpdate(manifest.notes, localVersion, manifest.version, false);
                } else if (forceShow) {
                    alert(`目前已是最新版本 (${localVersion})！`);
                }
            } catch (error) {
                console.warn('[Updater] Version check failed:', error);
                if (forceShow) alert('版本檢查失敗，請檢查網路連線。');
            }
        })();
        try { await checking; } finally { checking = null; }
    }

    function fallbackStore() {
        if (window.Capacitor?.getPlatform?.() === 'android') {
            try { window.location.href = PLAY_STORE_MARKET_URL; }
            catch (_) { window.open(PLAY_STORE_WEB_URL, '_system'); }
        } else {
            window.open(PLAY_STORE_WEB_URL, '_blank');
        }
    }

    async function openStore() {
        const playPlugin = window.Capacitor?.Plugins?.PlayUpdate;
        if (playUpdateAvailable && playPlugin?.startUpdate) {
            try { await playPlugin.startUpdate(); return; }
            catch (error) { console.warn('[Updater] In-app update unavailable; opening Play:', error); }
        }
        fallbackStore();
    }

    return window.Updater = { checkVersion, openStore, startDownloadFlow: openStore, initProgressListener: () => {} };
})();

function initUpdater() {
    setTimeout(() => Updater.checkVersion(), 1500);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') Updater.checkVersion();
    });
    window.addEventListener('focus', () => Updater.checkVersion());
}
if (document.readyState === 'complete') initUpdater();
else window.addEventListener('load', initUpdater, { once: true });
