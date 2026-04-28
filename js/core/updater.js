/**
 * Neon Card Game - Mandatory Update System
 * 版本：重寫，使用 Capacitor Filesystem.downloadFile() 原生下載
 * 解決：Webview 302 重定向攔截 + CORS 限制問題
 */
const Updater = (() => {
    const VERSION_CHECK_URL = "https://raw.githubusercontent.com/ythsc0529/neoncard/main/version.json";
    let _apkDownloadUrl = "https://github.com/ythsc0529/neoncard/releases/latest";
    let _isDownloading = false;

    async function checkVersion(forceShow = false) {
        // 防呆：同一 session 已觸發過更新，不重複彈出
        if (!forceShow && sessionStorage.getItem('update_shown')) return;

        // 防呆：APP_VERSION 必須是有效版號
        const localVersion = window.APP_VERSION;
        if (!localVersion || localVersion === '0.0.0') {
            console.warn('[Updater] APP_VERSION invalid, skipping check:', localVersion);
            return;
        }

        try {
            const response = await fetch(VERSION_CHECK_URL + "?t=" + Date.now(), {
                cache: 'no-store'
            });
            if (!response.ok) throw new Error('HTTP ' + response.status);
            const data = await response.json();

            const serverVersion = data.version;
            if (data.apk_url) _apkDownloadUrl = data.apk_url;

            console.log(`[Updater] Local: ${localVersion}, Server: ${serverVersion}`);

            if (isVersionOlder(localVersion, serverVersion)) {
                sessionStorage.setItem('update_shown', '1');
                forceUpdate(data.notes || []);
            } else if (forceShow) {
                alert("目前已是最新版本 (" + localVersion + ")！");
            }
        } catch (error) {
            console.warn('[Updater] Version check failed:', error);
            if (forceShow) alert("版本檢查失敗，請檢查網路連線。");
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
        const versionDisplay = document.getElementById('versionDisplay');

        if (versionDisplay) {
            versionDisplay.textContent = 'Current Version: ' + (window.APP_VERSION || '?');
        }
        if (modal) {
            if (list && notes.length > 0) {
                list.innerHTML = notes.map(n => `<li>${n}</li>`).join('');
            }
            modal.classList.add('active');
            modal.onclick = (e) => e.stopPropagation();
        }
    }

    async function startDownloadFlow() {
        if (_isDownloading) return;
        _isDownloading = true;

        const btn = document.getElementById('mainUpdateBtn');
        const progressContainer = document.getElementById('updateProgressContainer');
        const progressBar = document.getElementById('updateProgressBar');
        const progressPercent = document.getElementById('updateProgressPercent');
        const progressStatus = document.getElementById('updateProgressStatus');

        const isNative = window.Capacitor && window.Capacitor.getPlatform() !== 'web';

        if (!isNative) {
            // 網頁版：開新分頁下載
            window.open(_apkDownloadUrl, '_blank');
            _isDownloading = false;
            return;
        }

        btn.disabled = true;
        btn.textContent = '準備下載...';
        if (progressContainer) progressContainer.classList.remove('hidden');
        if (progressStatus) progressStatus.textContent = '連接中...';

        try {
            const { Filesystem } = window.Capacitor.Plugins;
            const FileOpener = window.Capacitor.Plugins.FileOpener;

            if (!Filesystem) throw new Error('Filesystem plugin 未載入');
            if (!FileOpener) throw new Error('FileOpener plugin 未載入');

            if (progressStatus) progressStatus.textContent = '下載中（原生下載器）...';
            btn.textContent = '下載中...';

            // ✅ 核心修正：使用 Capacitor 原生 downloadFile
            // 在 Java/OkHttp 層執行，完全繞開 Webview 的 302 重定向攔截與 CORS 限制
            const downloadResult = await Filesystem.downloadFile({
                url: _apkDownloadUrl,
                path: 'neoncard_update.apk',
                directory: 'CACHE',
                progress: true,
                headers: {
                    'Accept': 'application/vnd.android.package-archive'
                }
            });

            if (progressBar) progressBar.style.width = '100%';
            if (progressPercent) progressPercent.textContent = '100%';
            if (progressStatus) progressStatus.textContent = '下載完成，啟動安裝...';
            btn.textContent = '安裝中...';

            const filePath = downloadResult.path;
            if (!filePath) throw new Error('下載完成但未取得檔案路徑');

            await FileOpener.open({
                filePath: filePath,
                contentType: 'application/vnd.android.package-archive'
            });

        } catch (err) {
            console.error('[Updater] Download failed:', err);
            if (progressStatus) progressStatus.textContent = '下載失敗：' + err.message;
            btn.disabled = false;
            btn.textContent = '重試下載';
            _isDownloading = false;
        }
    }

    // 監聽原生 downloadFile 進度事件
    function initProgressListener() {
        if (!window.Capacitor) return;
        const { Filesystem } = window.Capacitor.Plugins;
        if (!Filesystem || !Filesystem.addListener) return;

        Filesystem.addListener('progress', (progress) => {
            const progressBar = document.getElementById('updateProgressBar');
            const progressPercent = document.getElementById('updateProgressPercent');
            const progressStatus = document.getElementById('updateProgressStatus');
            if (!progressBar) return;

            if (progress.contentLength > 0) {
                const pct = Math.round((progress.bytes / progress.contentLength) * 100);
                progressBar.style.width = pct + '%';
                if (progressPercent) progressPercent.textContent = pct + '%';
                const dlMB = (progress.bytes / 1024 / 1024).toFixed(1);
                const totalMB = (progress.contentLength / 1024 / 1024).toFixed(1);
                if (progressStatus) progressStatus.textContent = `已下載: ${dlMB}MB / ${totalMB}MB`;
            } else {
                const dlMB = (progress.bytes / 1024 / 1024).toFixed(1);
                if (progressStatus) progressStatus.textContent = `已下載: ${dlMB}MB...`;
            }
        });
    }

    return { checkVersion, startDownloadFlow, initProgressListener };
})();

window.addEventListener('load', () => {
    Updater.initProgressListener();
    setTimeout(Updater.checkVersion, 2000);
});
