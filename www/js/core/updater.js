/**
 * Neon Card Game - Mandatory Update System (Pro Edition)
 * Handles in-app download with progress bar and background notification.
 */
const Updater = (() => {
    const VERSION_CHECK_URL = "https://raw.githubusercontent.com/ythsc0529/neoncard/main/version.json";
    
    // Default URL, will be overridden by version.json's apk_url
    let _apkDownloadUrl = "https://github.com/ythsc0529/neoncard/releases";

    async function checkVersion() {
        try {
            const response = await fetch(VERSION_CHECK_URL + "?t=" + Date.now());
            const data = await response.json();
            
            const serverVersion = data.version;
            const localVersion = window.APP_VERSION || "0.0.0";
            
            if (data.apk_url) _apkDownloadUrl = data.apk_url;
            
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
        const btn = document.getElementById('mainUpdateBtn');

        if (modal) {
            if (list && notes.length > 0) {
                list.innerHTML = notes.map(n => `<li>${n}</li>`).join('');
            }

            if (btn) {
                btn.onclick = () => startDownloadFlow();
            }

            modal.classList.add('active');
            modal.onclick = (e) => e.stopPropagation(); 
        }
    }

    async function startDownloadFlow() {
        const btn = document.getElementById('mainUpdateBtn');
        const progressContainer = document.getElementById('updateProgressContainer');
        const progressBar = document.getElementById('updateProgressBar');
        const progressPercent = document.getElementById('updateProgressPercent');
        const progressStatus = document.getElementById('updateProgressStatus');

        btn.disabled = true;
        btn.textContent = "正在啟動下載...";
        progressContainer.classList.remove('hidden');

        try {
            const isNative = window.Capacitor && window.Capacitor.isNativePlatform();
            if (!isNative) {
                // Browser: Fallback to direct download
                window.location.href = _apkDownloadUrl;
                return;
            }

            // Native Flow: Download with progress
            await downloadWithProgress(_apkDownloadUrl, (percent, status) => {
                progressBar.style.width = percent + "%";
                progressPercent.textContent = percent + "%";
                if (status) progressStatus.textContent = status;
            });

        } catch (err) {
            console.error("[Updater] Download failed:", err);
            alert("下載失敗，請手動前往 GitHub 下載或檢查網路連線。");
            btn.disabled = false;
            btn.textContent = "重試下載";
        }
    }

    function downloadWithProgress(url, onProgress) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.responseType = 'blob';

            xhr.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percent = Math.round((event.loaded / event.total) * 100);
                    onProgress(percent, `正在下載: ${(event.loaded / 1024 / 1024).toFixed(1)}MB / ${(event.total / 1024 / 1024).toFixed(1)}MB`);
                } else {
                    onProgress(0, "正在下載 (無法計算進度)...");
                }
            };

            xhr.onload = async () => {
                if (xhr.status === 200) {
                    onProgress(100, "下載完成，正在準備安裝...");
                    try {
                        await saveAndInstallApk(xhr.response);
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                } else {
                    reject(new Error("HTTP Status " + xhr.status));
                }
            };

            xhr.onerror = () => reject(new Error("網路連線錯誤"));
            xhr.send();
        });
    }

    async function saveAndInstallApk(blob) {
        const { Filesystem, LocalNotifications } = window.Capacitor.Plugins;
        const fileName = "NeonCard_Update.apk";

        // Convert blob to base64
        const reader = new FileReader();
        const base64Data = await new Promise((resolve) => {
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.readAsDataURL(blob);
        });

        // Save to cache directory
        const saveResult = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: 'CACHE'
        });

        // Notify user
        try {
            await LocalNotifications.schedule({
                notifications: [{
                    id: 999,
                    title: "霓虹牌 更新",
                    body: "更新檔下載完成，點擊以安裝",
                    schedule: { at: new Date(Date.now() + 1000) }
                }]
            });
        } catch (e) { console.warn("Notification failed", e); }

        // Open APK for installation
        const { FileOpener } = window.Capacitor.Plugins;
        if (FileOpener) {
            await FileOpener.open({
                filePath: saveResult.uri,
                contentType: 'application/vnd.android.package-archive'
            });
        } else {
            alert("請手動開啟下載資料夾安裝更新檔。");
        }
    }

    return { checkVersion };
})();

// Start check
window.addEventListener('load', () => {
    setTimeout(Updater.checkVersion, 2000);
});
