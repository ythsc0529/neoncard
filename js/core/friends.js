/**
 * Neon Card Game - Friends Manager (Firestore)
 * Handles friend requests, friend list, and game invites
 */
const FriendsManager = (() => {
    const db = () => AuthManager.getDb();
    const myUid = () => { const u = AuthManager.getCurrentUser(); return u ? u.uid : null; };

    // ── Friend Requests ──────────────────────────────────────────────

    async function sendFriendRequest(targetUid) {
        const uid = myUid();
        if (!uid || uid === targetUid) return;
        const batch = db().batch();
        batch.set(db().collection('friendships').doc(uid).collection('requests').doc(targetUid),
            { type: 'outgoing', uid: targetUid, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        batch.set(db().collection('friendships').doc(targetUid).collection('requests').doc(uid),
            { type: 'incoming', uid: uid, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        await batch.commit();
    }

    async function acceptFriendRequest(fromUid) {
        const uid = myUid();
        if (!uid) return;
        const batch = db().batch();
        batch.set(db().collection('friendships').doc(uid).collection('friends').doc(fromUid),
            { uid: fromUid, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        batch.set(db().collection('friendships').doc(fromUid).collection('friends').doc(uid),
            { uid: uid, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        batch.delete(db().collection('friendships').doc(uid).collection('requests').doc(fromUid));
        batch.delete(db().collection('friendships').doc(fromUid).collection('requests').doc(uid));
        await batch.commit();
    }

    async function declineFriendRequest(fromUid) {
        const uid = myUid();
        if (!uid) return;
        const batch = db().batch();
        batch.delete(db().collection('friendships').doc(uid).collection('requests').doc(fromUid));
        batch.delete(db().collection('friendships').doc(fromUid).collection('requests').doc(uid));
        await batch.commit();
    }

    // ── Friend List ──────────────────────────────────────────────────

    async function getFriendList() {
        const uid = myUid();
        if (!uid) return [];
        const snap = await db().collection('friendships').doc(uid).collection('friends').get();
        const profiles = await Promise.all(snap.docs.map(d => UserProfile.getProfile(d.id)));
        return profiles.filter(Boolean);
    }

    async function getPendingRequests() {
        const uid = myUid();
        if (!uid) return [];
        const snap = await db().collection('friendships').doc(uid).collection('requests')
            .where('type', '==', 'incoming').get();
        const profiles = await Promise.all(snap.docs.map(d => UserProfile.getProfile(d.id)));
        return profiles.filter(Boolean);
    }

    function listenForRequests(callback) {
        const uid = myUid();
        if (!uid) return () => {};
        return db().collection('friendships').doc(uid).collection('requests')
            .where('type', '==', 'incoming')
            .onSnapshot(snap => {
                snap.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        UserProfile.getProfile(change.doc.id).then(p => { if (p) callback(p); });
                    }
                });
            });
    }

    async function removeFriend(targetUid) {
        const uid = myUid();
        if (!uid) return;
        const batch = db().batch();
        batch.delete(db().collection('friendships').doc(uid).collection('friends').doc(targetUid));
        batch.delete(db().collection('friendships').doc(targetUid).collection('friends').doc(uid));
        await batch.commit();
    }

    async function isFriend(targetUid) {
        const uid = myUid();
        if (!uid) return false;
        const doc = await db().collection('friendships').doc(uid).collection('friends').doc(targetUid).get();
        return doc.exists;
    }

    async function hasOutgoingRequest(targetUid) {
        const uid = myUid();
        if (!uid) return false;
        const doc = await db().collection('friendships').doc(uid).collection('requests').doc(targetUid).get();
        return doc.exists && doc.data().type === 'outgoing';
    }

    // ── Game Invites ──────────────────────────────────────────────────

    async function sendGameInvite(targetUid, roomId, gameMode, fromName) {
        const uid = myUid();
        if (!uid) return;
        await db().collection('gameInvites').doc(targetUid).collection('invites').doc(uid).set({
            fromUid: uid,
            fromName,
            roomId,
            gameMode,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }

    function listenForGameInvites(callback) {
        const uid = myUid();
        if (!uid) return () => {};
        return db().collection('gameInvites').doc(uid).collection('invites')
            .onSnapshot(snap => {
                snap.docChanges().forEach(change => {
                    if (change.type === 'added') callback({ id: change.doc.id, ...change.doc.data() });
                });
            });
    }

    async function clearGameInvite(fromUid) {
        const uid = myUid();
        if (!uid) return;
        await db().collection('gameInvites').doc(uid).collection('invites').doc(fromUid).delete();
    }

    return {
        sendFriendRequest, acceptFriendRequest, declineFriendRequest,
        getFriendList, getPendingRequests, listenForRequests,
        removeFriend, isFriend, hasOutgoingRequest,
        sendGameInvite, listenForGameInvites, clearGameInvite
    };
})();

window.FriendsManager = FriendsManager;
