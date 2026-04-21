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

    function init() {
        if (_initialized) return;
        _initialized = true;
        if (!firebase.apps.length) {
            firebase.initializeApp(FIREBASE_CONFIG);
        }
        if (typeof firebase.auth === 'function') _auth = firebase.auth();
        if (typeof firebase.firestore === 'function') _db = firebase.firestore();
        if (typeof firebase.database === 'function') _rtdb = firebase.database();
    }

    async function signInWithGoogle() {
        if (!_auth) init();
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const result = await _auth.signInWithPopup(provider);
        _currentUser = result.user;
        return result.user;
    }

    async function signOut() {
        if (!_auth) return;
        await _auth.signOut();
        _currentUser = null;
    }

    function onAuthChanged(callback) {
        if (!_auth) init();
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
