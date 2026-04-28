/**
 * Neon Card Game - Mandatory Update System
 */
const Updater = (() => {
    // 【重要】請修改為你存放版本資訊的網址
    const VERSION_CHECK_URL = "https://raw.githubusercontent.com/ythsc0529/neoncard/main/version.json";
    // 【重要】請修改為你新版 APK 的下載連結
    const APK_DOWNLOAD_URL = "https://github.com/ythsc0529/neoncard/releases";

    async function checkVersion() {
        try {
            const response = await fetch(VERSION_CHECK_URL + "?t=" + Date.now());
            const data = await response.json();
            
            const serverVersion = data.version;
            const localVersion = window.APP_VERSION || "0.0.0";
            
            console.log(`[Updater] Local: ${localVersion}, Server: ${serverVersion}`);

            if (isVersionOlder(localVersion, serverVersion)) {
                forceUpdate(data.notes || []);
            }
        } catch (error) {
            console.warn("[Updater] Version check failed, skipping...", error);
        }
    }

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

    function forceUpdate(notes) {
        const modal = document.getElementById('updateModal');
        const list = document.getElementById('updateNotesList');
        const btn = document.querySelector('.btn-update');

        if (modal) {
            // 更新更新日誌
            if (list && notes.length > 0) {
                list.innerHTML = notes.map(n => `<li>${n}</li>`).join('');
            }

            // 修改更新按鈕行為
            if (btn) {
                btn.textContent = "立即下載新版本";
                btn.onclick = () => {
                    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
                        window.Capacitor.Plugins.Browser.open({ url: APK_DOWNLOAD_URL });
                    } else {
                        window.location.href = APK_DOWNLOAD_URL;
                    }
                };
            }

            // 顯示並鎖定 Modal (不允許點擊背景關閉)
            modal.classList.add('active');
            modal.onclick = (e) => e.stopPropagation(); 
        }
    }

    return { checkVersion };
})();

// 啟動時檢查
window.addEventListener('load', () => {
    setTimeout(Updater.checkVersion, 2000); // 延遲兩秒檢查，避免卡住 Preloader
});
