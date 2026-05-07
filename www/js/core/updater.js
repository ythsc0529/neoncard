/**
 * Neon Card Game - Mandatory Update System
 * 版本：重寫，優先使用原生 DownloadPlugin（Android DownloadManager）
 * - 支援後台下載：切換到其他 App 下載仍繼續
 * - 系統通知欄自動顯示進度條（由 DownloadManager 原生處理）
 * - 下載完成後系統通知可點擊直接安裝
 * - Fallback：若 DownloadPlugin 不可用，退回 Filesystem.downloadFile()
 */
const Updater = (() => {
    const VERSION_CHECK_URL = "https://raw.githubusercontent.com/ythsc0529/neoncard/main/version.json";
    let _apkDownloadUrl = "https://github.com/ythsc0529/neoncard/releases/latest";
    let _isDownloading = false;
    let _pollInterval = null;
    let _activeDownloadId = null;
    let _startTime = 0;

    // ── 舊有 APK 清理（僅 Filesystem 路徑用） ──────────────────────────────
    async function cleanupOldApk() {
        try {
            const isNative = window.Capacitor && window.Capacitor.getPlatform() !== 'web';
            if (!isNative) return;
            const { Filesystem } = window.Capacitor.Plugins;
            if (!Filesystem) return;
            await Filesystem.deleteFile({ path: 'neoncard_update.apk', directory: 'CACHE' });
            console.log('[Updater] Old update APK (cache) cleared.');
        } catch (e) {
            // 檔案不存在或無法刪除時忽略
        }
    }

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
        await cleanupOldApk();

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
            if (data.apk_url) _apkDownloadUrl = data.apk_url;

            console.log(`[Updater] Local: ${localVersion}, Server: ${serverVersion}`);

            if (isVersionOlder(localVersion, serverVersion)) {
                sessionStorage.setItem('update_shown', '1');
                forceUpdate(data.notes || []);
            } else if (forceShow) {
                alert('目前已是最新版本 (' + localVersion + ')！');
            }
        } catch (error) {
            console.warn('[Updater] Version check failed:', error);
            if (forceShow) alert('版本檢查失敗，請檢查網路連線。');
        }
    }

    // ── 顯示強制更新 Modal ───────────────────────────────────────────────────
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

    // ── 工具函數 ─────────────────────────────────────────────────────────────
    function formatTime(seconds) {
        if (seconds < 60) return `約 ${seconds} 秒`;
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `約 ${m} 分 ${s} 秒`;
    }

    function formatMB(bytes) {
        return (bytes / 1024 / 1024).toFixed(1);
    }

    // ── 更新 in-app 進度 UI ──────────────────────────────────────────────────
    function updateProgressUI(bytesDownloaded, bytesTotal) {
        const progressBar = document.getElementById('updateProgressBar');
        const progressPercent = document.getElementById('updateProgressPercent');
        const progressStatus = document.getElementById('updateProgressStatus');
        const progressRemaining = document.getElementById('updateProgressRemaining');

        if (bytesTotal > 0) {
            const pct = Math.min(100, Math.round((bytesDownloaded / bytesTotal) * 100));
            if (progressBar) progressBar.style.width = pct + '%';
            if (progressPercent) progressPercent.textContent = pct + '%';
            if (progressStatus) {
                progressStatus.textContent = `已下載: ${formatMB(bytesDownloaded)}MB / ${formatMB(bytesTotal)}MB`;
            }
            // 預估剩餘時間
            if (progressRemaining && _startTime > 0 && bytesDownloaded > 0) {
                const elapsed = (Date.now() - _startTime) / 1000;
                const speed = bytesDownloaded / elapsed;
                const remainingBytes = bytesTotal - bytesDownloaded;
                const remainingSecs = Math.ceil(remainingBytes / speed);
                progressRemaining.textContent = formatTime(remainingSecs);
            }
        } else {
            if (progressStatus) {
                progressStatus.textContent = `已下載: ${formatMB(bytesDownloaded)}MB...`;
            }
        }
    }

    // ── 主下載流程（優先使用 DownloadPlugin） ─────────────────────────────────
    async function startDownloadFlow() {
        if (_isDownloading) return;
        _isDownloading = true;

        const btn = document.getElementById('mainUpdateBtn');
        const progressContainer = document.getElementById('updateProgressContainer');
        const progressBar = document.getElementById('updateProgressBar');
        const progressPercent = document.getElementById('updateProgressPercent');
        const progressStatus = document.getElementById('updateProgressStatus');

        const isNative = window.Capacitor && window.Capacitor.getPlatform() !== 'web';

        // 網頁版：直接開新分頁下載
        if (!isNative) {
            window.open(_apkDownloadUrl, '_blank');
            _isDownloading = false;
            return;
        }

        if (btn) { btn.disabled = true; btn.textContent = '準備下載...'; }
        if (progressContainer) progressContainer.classList.remove('hidden');
        if (progressStatus) progressStatus.textContent = '連接中...';

        // ── 嘗試使用原生 DownloadPlugin（最佳路徑：後台下載）──────────────────
        const DownloadPlugin = window.Capacitor.Plugins.DownloadPlugin;

        if (DownloadPlugin) {
            try {
                if (progressStatus) progressStatus.textContent = '正在啟動後台下載...';
                if (btn) btn.textContent = '後台下載中...';
                _startTime = Date.now();

                // 向 Android DownloadManager 提交下載任務
                const { downloadId } = await DownloadPlugin.startDownload({
                    url: _apkDownloadUrl,
                    fileName: 'neoncard_update.apk'
                });
                _activeDownloadId = downloadId;

                // 更新 UI：通知使用者可以切換至後台
                if (progressStatus) {
                    progressStatus.textContent = '下載進行中（可切換至其他 App，完成後收到通知）';
                }
                if (btn) btn.textContent = '下載中（後台）...';

                // 啟動輪詢：每 2 秒更新 in-app 進度 UI
                _pollInterval = setInterval(async () => {
                    try {
                        const progress = await DownloadPlugin.checkDownload({ downloadId: _activeDownloadId });
                        updateProgressUI(progress.bytesDownloaded || 0, progress.bytesTotal || 0);

                        if (progress.isComplete) {
                            clearInterval(_pollInterval);
                            _pollInterval = null;
                            // 下載完成！（Android 系統通知已由 DownloadPlugin 自動發出）
                            if (progressBar) progressBar.style.width = '100%';
                            if (progressPercent) progressPercent.textContent = '100%';
                            if (progressStatus) progressStatus.textContent = '✅ 下載完成！請查看通知或稍候安裝提示。';
                            if (btn) btn.textContent = '下載完成';
                            _isDownloading = false;
                            _activeDownloadId = null;
                        } else if (progress.isFailed) {
                            clearInterval(_pollInterval);
                            _pollInterval = null;
                            throw new Error('DownloadManager 回報下載失敗');
                        }
                    } catch (pollErr) {
                        clearInterval(_pollInterval);
                        _pollInterval = null;
                        handleDownloadError(pollErr, btn, progressStatus);
                    }
                }, 2000);

                return; // 成功啟動後台下載，函數到此結束

            } catch (pluginErr) {
                console.warn('[Updater] DownloadPlugin failed, falling back to Filesystem:', pluginErr);
                clearInterval(_pollInterval);
                // 繼續往下走，使用 Fallback 方案
            }
        }

        // ── Fallback：使用 Filesystem.downloadFile()（前台下載）──────────────
        await startFilesystemDownload(btn, progressStatus, progressBar, progressPercent);
    }

    // ── Fallback：Filesystem.downloadFile()（前台、原有方案）──────────────────
    async function startFilesystemDownload(btn, progressStatus, progressBar, progressPercent) {
        const { Filesystem, LocalNotifications } = window.Capacitor.Plugins;
        const FileOpener = window.Capacitor.Plugins.FileOpener;

        if (!Filesystem) {
            handleDownloadError(new Error('Filesystem plugin 未載入'), btn, progressStatus);
            return;
        }
        if (!FileOpener) {
            handleDownloadError(new Error('FileOpener plugin 未載入'), btn, progressStatus);
            return;
        }

        if (LocalNotifications) {
            await LocalNotifications.requestPermissions().catch(() => {});
        }

        if (progressStatus) progressStatus.textContent = '下載中（前台模式）...';
        if (btn) btn.textContent = '下載中...';
        _startTime = Date.now();

        try {
            const downloadResult = await Filesystem.downloadFile({
                url: _apkDownloadUrl,
                path: 'neoncard_update.apk',
                directory: 'CACHE',
                progress: true,
                headers: { 'Accept': 'application/vnd.android.package-archive' }
            });

            if (progressBar) progressBar.style.width = '100%';
            if (progressPercent) progressPercent.textContent = '100%';
            if (progressStatus) progressStatus.textContent = '下載完成，啟動安裝...';
            if (btn) btn.textContent = '安裝中...';

            const filePath = downloadResult.path;
            if (!filePath) throw new Error('下載完成但未取得檔案路徑');

            // 發送完成通知
            if (LocalNotifications) {
                await LocalNotifications.schedule({
                    notifications: [{
                        id: 1001,
                        title: '🎮 霓虹牌更新下載完成！',
                        body: '點擊此處立即安裝新版本',
                        ongoing: false,
                        autoCancel: true,
                        extra: { action: 'install', filePath: filePath }
                    }]
                });
            }

            await FileOpener.open({
                filePath: filePath,
                contentType: 'application/vnd.android.package-archive'
            });

        } catch (err) {
            if (LocalNotifications) {
                LocalNotifications.cancel({ notifications: [{ id: 1001 }] }).catch(() => {});
            }
            handleDownloadError(err, btn, progressStatus);
        }
    }

    // ── 下載錯誤統一處理 ─────────────────────────────────────────────────────
    function handleDownloadError(err, btn, progressStatus) {
        console.error('[Updater] Download failed:', err);
        if (progressStatus) progressStatus.textContent = '下載失敗：' + (err.message || err);
        if (btn) { btn.disabled = false; btn.textContent = '重試下載'; }
        _isDownloading = false;
        _activeDownloadId = null;
    }

    // ── 進度事件監聽（舊 Filesystem 路徑用） ──────────────────────────────────
    function initProgressListener() {
        if (!window.Capacitor) return;
        const { Filesystem, LocalNotifications, FileOpener } = window.Capacitor.Plugins;
        if (!Filesystem || !Filesystem.addListener) return;

        // 通知點擊安裝（Filesystem fallback 路徑）
        if (LocalNotifications) {
            LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
                if (action.notification.id === 1001 && action.notification.extra?.action === 'install') {
                    const filePath = action.notification.extra.filePath;
                    if (FileOpener) {
                        FileOpener.open({
                            filePath: filePath,
                            contentType: 'application/vnd.android.package-archive'
                        });
                    }
                }
            });
        }

        // Filesystem 下載進度（Fallback 路徑）
        Filesystem.addListener('progress', (progress) => {
            if (_activeDownloadId !== null) return; // 使用 DownloadPlugin 時忽略此事件
            const progressBar = document.getElementById('updateProgressBar');
            const progressPercent = document.getElementById('updateProgressPercent');
            const progressStatus = document.getElementById('updateProgressStatus');
            const progressRemaining = document.getElementById('updateProgressRemaining');
            if (!progressBar) return;

            if (progress.contentLength > 0) {
                const pct = Math.round((progress.bytes / progress.contentLength) * 100);
                progressBar.style.width = pct + '%';
                if (progressPercent) progressPercent.textContent = pct + '%';
                if (progressStatus) {
                    progressStatus.textContent = `已下載: ${formatMB(progress.bytes)}MB / ${formatMB(progress.contentLength)}MB`;
                }
                if (_startTime > 0 && progress.bytes > 0) {
                    const elapsed = (Date.now() - _startTime) / 1000;
                    const speed = progress.bytes / elapsed;
                    const remainingSecs = Math.ceil((progress.contentLength - progress.bytes) / speed);
                    if (progressRemaining) progressRemaining.textContent = formatTime(remainingSecs);
                }
            } else {
                if (progressStatus) progressStatus.textContent = `已下載: ${formatMB(progress.bytes)}MB...`;
            }
        });
    }

    return { checkVersion, startDownloadFlow, initProgressListener };
})();

window.addEventListener('load', () => {
    Updater.initProgressListener();
    setTimeout(Updater.checkVersion, 2000);
});
