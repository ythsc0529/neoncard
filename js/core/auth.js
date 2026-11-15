/**
 * Neon Card Game - Firebase Auth & App Manager
 */

const FIREBASE_CONFIG = {
    apiKey: "AIzaSyDK0A7oPyVIGSLXShqdOsqaDnkyW-dpN6U",
    authDomain: "neoncard-c4e2c.firebaseapp.com",
    databaseURL: "https://neoncard-c4e2c-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "neoncard-c4e2c",
    storageBucket: "neoncard-c4e2c.firebasestorage.app",
    messagingSenderId: "757364529881",
    appId: "1:757364529881:web:b2327c4575fb8ae89e3cc8",
    measurementId: "G-HFYQSBTDJ1"
};

const AuthManager = (() => {
    let _auth = null;
    let _db = null;
    let _rtdb = null;
    let _currentUser = null;
    let _initialized = false;
    let _onAuthCallbacks = [];

    async function init() {
        if (_initialized) return;
        _initialized = true;
        if (!firebase.apps.length) {
            firebase.initializeApp(FIREBASE_CONFIG);
        }
        if (typeof firebase.auth === 'function') _auth = firebase.auth();
        if (typeof firebase.firestore === 'function') _db = firebase.firestore();
        if (typeof firebase.database === 'function') _rtdb = firebase.database();

        // ── [新增] 原生環境權限請求 ──
        const platform = (window.Capacitor && window.Capacitor.getPlatform) ? window.Capacitor.getPlatform() : "web";
        if (platform !== 'web') {
            requestNativePermissions();
        }

        // [核心] 監聽登入狀態變化與 Redirect 結果
        if (_auth) {
            if (typeof _auth.getRedirectResult === 'function') {
                _auth.getRedirectResult().then(result => {
                    if (result && result.user) {
                        console.log("[Auth] Redirect 登入成功:", result.user);
                    }
                }).catch(err => {
                    console.warn("[Auth] getRedirectResult 狀態:", err);
                });
            }

            _auth.onAuthStateChanged(user => {
                _currentUser = user;
                _onAuthCallbacks.forEach(cb => cb(user));
            });
        }
    }

    async function requestNativePermissions() {
        try {
            const { LocalNotifications } = window.Capacitor.Plugins;
            if (LocalNotifications) {
                const status = await LocalNotifications.requestPermissions();
                console.log("[Auth] 通知權限狀態:", status.display);
            }
        } catch (e) {
            console.warn("[Auth] 請求通知權限失敗:", e);
        }
    }

    function isUserCancel(err) {
        if (!err) return false;
        const msg = (typeof err === 'string') ? err : (err.message || err.code || err.errorMessage || JSON.stringify(err));
        return (
            msg.includes("canceled") ||
            msg.includes("Canceled") ||
            msg.includes("cancelled") ||
            msg.includes("Cancelled") ||
            msg.includes("12501") ||
            msg.includes("1001") ||
            msg.includes("popup-closed-by-user") ||
            msg.includes("CancellationException") ||
            msg.includes("user canceled") ||
            msg.includes("Activity was cancelled") ||
            msg.includes("Caller has been cancelled")
        );
    }

    async function signInWithGoogle() {
        if (!_auth) init();

        const platform = (window.Capacitor && window.Capacitor.getPlatform) ? window.Capacitor.getPlatform() : "unknown";
        console.log("[Auth] 當前偵測平台:", platform);

        // ── 1. Android / iOS：原生 Google 登入（嚴禁在 App 內走 Web OAuth 彈窗）──
        if (platform === 'android' || platform === 'ios') {
            const { FirebaseAuthentication } = window.Capacitor.Plugins || {};

            if (!FirebaseAuthentication) {
                const err = new Error("App 尚未載入 FirebaseAuthentication 原生插件，請確認已執行 npx cap sync 並重新打包。");
                alert(err.message);
                throw err;
            }

            let result = null;

            if (platform === 'android') {
                try {
                    console.log("[Auth] 優先嘗試使用 Credential Manager 登入...");
                    result = await FirebaseAuthentication.signInWithGoogle({
                        useCredentialManager: true
                    });
                    console.log("[Auth] Credential Manager 登入結果:", result);
                } catch (credErr) {
                    if (isUserCancel(credErr)) {
                        console.log("[Auth] 使用者在 Credential Manager 取消 Google 登入");
                        return;
                    }
                    console.warn("[Auth] Credential Manager 無可用憑證或失敗，自動降級切換至傳統 Google 登入 (GoogleSignInClient):", credErr);
                    try {
                        result = await FirebaseAuthentication.signInWithGoogle({
                            useCredentialManager: false
                        });
                        console.log("[Auth] 降級傳統 Google 登入成功:", result);
                    } catch (fallbackErr) {
                        if (isUserCancel(fallbackErr)) {
                            console.log("[Auth] 使用者在降級 Google 登入取消");
                            return;
                        }
                        console.error("[Auth] 傳統 Google 登入也失敗:", fallbackErr);
                        const fallbackMsg =
                            fallbackErr?.message ||
                            fallbackErr?.code ||
                            fallbackErr?.errorMessage ||
                            (typeof fallbackErr === 'string' ? fallbackErr : JSON.stringify(fallbackErr));
                        throw new Error(fallbackMsg);
                    }
                }
            } else {
                try {
                    result = await FirebaseAuthentication.signInWithGoogle();
                } catch (iosErr) {
                    if (isUserCancel(iosErr)) {
                        console.log("[Auth] 使用者取消 iOS Google 登入");
                        return;
                    }
                    throw iosErr;
                }
            }

            if (!result) {
                // 使用者取消返回
                return;
            }

            const googleIdToken = result?.credential?.idToken;

            if (!googleIdToken) {
                console.error("[Auth] Google 登入成功但沒有回傳 Google idToken:", result);
                throw new Error("Google 登入成功但沒有取得 idToken，無法同步 Firebase Web SDK。");
            }

            try {
                const credential = firebase.auth.GoogleAuthProvider.credential(googleIdToken);
                await _auth.signInWithCredential(credential);
                console.log("[Auth] Google 登入並同步 Web SDK 成功");
                return;
            } catch (syncErr) {
                console.error("[Auth] Google idToken 同步 Firebase Web SDK 失敗:", syncErr);
                throw syncErr;
            }
        }

        // ── 2. 純 Web 瀏覽器環境：Web Google 授權模式（Popup 優先，被阻擋則轉 Redirect）──
        try {
            await _auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
            const provider = new firebase.auth.GoogleAuthProvider();
            provider.setCustomParameters({ prompt: 'select_account' });
            return await _auth.signInWithPopup(provider);
        } catch (webError) {
            console.warn("[Auth] Web Popup 失敗，嘗試 Redirect 模式:", webError);
            if (webError.code === 'auth/popup-blocked' || webError.code === 'auth/cancelled-popup-request') {
                const provider = new firebase.auth.GoogleAuthProvider();
                provider.setCustomParameters({ prompt: 'select_account' });
                return await _auth.signInWithRedirect(provider);
            }
            if (webError.code !== 'auth/popup-closed-by-user' && !isUserCancel(webError)) {
                alert("Google 登入失敗: " + (webError.message || webError.code || webError));
            }
            throw webError;
        }
    }

    async function signOut() {
        if (!_auth) return;
        await _auth.signOut();
        _currentUser = null;
    }

    function onAuthChanged(callback) {
        if (!_auth) init();
        _onAuthCallbacks.push(callback);
        return _auth.onAuthStateChanged((user) => {
            _currentUser = user;
            callback(user);
        });
    }

    function getCurrentUser() {
        if (!_auth) init();
        return _currentUser || (_auth ? _auth.currentUser : null);
    }

    function getDb()   { if (!_db)   init(); return _db; }
    function getRtdb() { if (!_rtdb) init(); return _rtdb; }

    return { init, signInWithGoogle, signOut, onAuthChanged, getCurrentUser, getDb, getRtdb };
})();

window.AuthManager = AuthManager;
