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

        // [核心] 監聽登入狀態變化（Popup 模式不需要 getRedirectResult）
        if (_auth) {
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

    async function signInWithGoogle() {
        if (!_auth) init();

        const platform = (window.Capacitor && window.Capacitor.getPlatform) ? window.Capacitor.getPlatform() : "unknown";
        console.log("[Auth] 當前偵測平台:", platform);

        // 如果是 android 或是 ios，我們強制只走原生路徑
        if (platform === 'android' || platform === 'ios') {
            try {
                const { FirebaseAuthentication } = window.Capacitor.Plugins;
                if (!FirebaseAuthentication) {
                    alert("錯誤：App 尚未載入 FirebaseAuthentication 插件！請確認是否有執行 npx cap sync");
                    return;
                }

                const result = await FirebaseAuthentication.signInWithGoogle();

                if (result.credential && result.credential.idToken) {
                    const credential = firebase.auth.GoogleAuthProvider.credential(result.credential.idToken);
                    return _auth.signInWithCredential(credential);
                } else {
                    throw new Error("無法從 Google 取得憑證 (idToken missing)");
                }
            } catch (error) {
                console.error("[Auth] 原生登入失敗:", error);
                alert("原生登入失敗代碼: " + JSON.stringify(error));
                throw error;
            }
        } else {
            // 網頁版使用 Popup 登入，避免現代瀏覽器封鎖跨域 Cookie 導致 Redirect 後登入狀態傳遞失敗
            await _auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
            const provider = new firebase.auth.GoogleAuthProvider();
            provider.setCustomParameters({ prompt: 'select_account' });
            return _auth.signInWithPopup(provider);
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
