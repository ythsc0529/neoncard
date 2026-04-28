/**
 * Neon Card Game - Mandatory Update System (Pro Edition)
 * Handles in-app download with progress bar and background notification.
 */
const Updater = (() => {
    const VERSION_CHECK_URL = "https://raw.githubusercontent.com/ythsc0529/neoncard/main/version.json";
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

        if (modal) {
            if (list && notes.length > 0) {
                list.innerHTML = notes.map(n => `<li>${n}</li>`).join('');
            }
            modal.classList.add('active');
            modal.onclick = (e) => e.stopPropagation(); 
        }
    }

    async function startDownloadFlow() {
        alert("[Updater] 開始下載流程...");
        const btn = document.getElementById('mainUpdateBtn');
        const progressContainer = document.getElementById('updateProgressContainer');
        const progressBar = document.getElementById('updateProgressBar');
        const progressPercent = document.getElementById('updateProgressPercent');
        const progressStatus = document.getElementById('updateProgressStatus');

        try {
            const isNative = window.Capacitor && window.Capacitor.getPlatform() !== 'web';
            console.log("[Updater] Platform isNative:", isNative);

            if (!isNative) {
                console.log("[Updater] Web mode: Redirecting to", _apkDownloadUrl);
                window.location.href = _apkDownloadUrl;
                return;
            }

            // --- Native Flow ---
            btn.disabled = true;
            btn.textContent = "正在下載更新...";
            progressContainer.classList.remove('hidden');

            console.log("[Updater] Starting Native Download:", _apkDownloadUrl);

            // Use XHR for progress tracking (Capacitor Webview usually allows CORS for specific setups, 
            // but let's add an error handler to fallback if needed)
            await downloadWithProgress(_apkDownloadUrl, (percent, status) => {
                progressBar.style.width = percent + "%";
                progressPercent.textContent = percent + "%";
                if (status) progressStatus.textContent = status;
            });

        } catch (err) {
            console.error("[Updater] Download error:", err);
            alert("下載失敗，原因: " + err.message + "\n\n將嘗試開啟瀏覽器下載。");
            // Final fallback: Browser
            if (window.Capacitor && window.Capacitor.Plugins.Browser) {
                window.Capacitor.Plugins.Browser.open({ url: _apkDownloadUrl });
            } else {
                window.location.href = _apkDownloadUrl;
            }
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
                    // GitHub sometimes doesn't send Content-Length on redirects
                    onProgress(50, "正在下載 (進度計算中)...");
                }
            };

            xhr.onload = async () => {
                console.log("[Updater] XHR Load Status:", xhr.status);
                if (xhr.status >= 200 && xhr.status < 300) {
                    onProgress(100, "下載完成，正在安裝...");
                    try {
                        await saveAndInstallApk(xhr.response);
                        resolve();
                    } catch (e) {
                        reject(new Error("儲存檔案失敗: " + e.message));
                    }
                } else {
                    reject(new Error("伺服器回應錯誤 (" + xhr.status + ")"));
                }
            };

            xhr.onerror = () => reject(new Error("網路連線或 CORS 跨域限制錯誤"));
            xhr.send();
        });
    }

    async function saveAndInstallApk(blob) {
        const { Filesystem, LocalNotifications, FileOpener } = window.Capacitor.Plugins;
        const fileName = "NeonCard_Update_" + Date.now() + ".apk";

        const reader = new FileReader();
        const base64Data = await new Promise((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });

        const saveResult = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: 'CACHE'
        });

        console.log("[Updater] Saved to:", saveResult.uri);

        try {
            await LocalNotifications.schedule({
                notifications: [{
                    id: 999,
                    title: "霓虹牌 更新",
                    body: "下載完成，點擊開始安裝",
                    schedule: { at: new Date(Date.now() + 500) }
                }]
            });
        } catch (e) {}

        if (FileOpener) {
            await FileOpener.open({
                filePath: saveResult.uri,
                contentType: 'application/vnd.android.package-archive'
            });
        } else {
            throw new Error("找不到檔案開啟插件");
        }
    }

    return { checkVersion, startDownloadFlow };
})();

window.addEventListener('load', () => {
    setTimeout(Updater.checkVersion, 2000);
});
