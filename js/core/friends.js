/**
 * Neon Card Game - Friends Manager (Realtime Database)
 * All social features use RTDB to avoid Firestore cross-user permission issues.
 *
 * RTDB structure:
 *   friendRequests/{targetUid}/{fromUid}  — incoming request, visible only to target
 *   friends/{uid}/{friendUid}             — mutual friend list entry
 *   gameInvites/{targetUid}/{fromUid}     — game invite
 */
const FriendsManager = (() => {
    const rtdb  = () => AuthManager.getRtdb();
    const myUid = () => { const u = AuthManager.getCurrentUser(); return u ? u.uid : null; };

    // ── Friend Requests ──────────────────────────────────────────────

    async function sendFriendRequest(targetUid) {
        const uid = myUid();
        if (!uid || uid === targetUid) return;
        const myProfile = await UserProfile.getProfile(uid);
        await rtdb().ref(`friendRequests/${targetUid}/${uid}`).set({
            fromUid: uid,
            fromName: myProfile?.displayName || '玩家',
            sentAt: firebase.database.ServerValue.TIMESTAMP
        });
    }

    async function acceptFriendRequest(fromUid) {
        const uid = myUid();
        if (!uid) return;
        const now = firebase.database.ServerValue.TIMESTAMP;
        // Write friendship for both sides, delete request
        await Promise.all([
            rtdb().ref(`friends/${uid}/${fromUid}`).set({ since: now }),
            rtdb().ref(`friends/${fromUid}/${uid}`).set({ since: now }),
            rtdb().ref(`friendRequests/${uid}/${fromUid}`).remove()
        ]);
    }

    async function declineFriendRequest(fromUid) {
        const uid = myUid();
        if (!uid) return;
        await rtdb().ref(`friendRequests/${uid}/${fromUid}`).remove();
    }

    // ── Friend List ──────────────────────────────────────────────────

    async function getFriendList() {
        const uid = myUid();
        if (!uid) return [];
        const snap = await rtdb().ref(`friends/${uid}`).once('value');
        const val  = snap.val() || {};
        const uids = Object.keys(val);
        const profiles = await Promise.all(uids.map(id => UserProfile.getProfile(id)));
        return profiles.filter(Boolean);
    }

    async function getPendingRequests() {
        const uid = myUid();
        if (!uid) return [];
        const snap = await rtdb().ref(`friendRequests/${uid}`).once('value');
        const val  = snap.val() || {};
        const uids = Object.keys(val);
        const profiles = await Promise.all(uids.map(id => UserProfile.getProfile(id)));
        return profiles.filter(Boolean);
    }

    function listenForRequests(callback) {
        const uid = myUid();
        if (!uid) return () => {};
        const ref  = rtdb().ref(`friendRequests/${uid}`);
        const handler = ref.on('child_added', snap => {
            if (snap.exists()) {
                UserProfile.getProfile(snap.key).then(p => { if (p) callback(p); });
            }
        });
        return () => ref.off('child_added', handler);
    }

    async function removeFriend(targetUid) {
        const uid = myUid();
        if (!uid) return;
        await Promise.all([
            rtdb().ref(`friends/${uid}/${targetUid}`).remove(),
            rtdb().ref(`friends/${targetUid}/${uid}`).remove()
        ]);
    }

    async function isFriend(targetUid) {
        const uid = myUid();
        if (!uid) return false;
        const snap = await rtdb().ref(`friends/${uid}/${targetUid}`).once('value');
        return snap.exists();
    }

    async function hasOutgoingRequest(targetUid) {
        const uid = myUid();
        if (!uid) return false;
        const snap = await rtdb().ref(`friendRequests/${targetUid}/${uid}`).once('value');
        return snap.exists();
    }

    // ── Game Invites (RTDB) ──────────────────────────────────────────

    async function sendGameInvite(targetUid, roomId, gameMode, fromName) {
        const uid = myUid();
        if (!uid) return;
        const ref = rtdb().ref(`gameInvites/${targetUid}/${uid}`);
        await ref.set({
            fromUid: uid,
            fromName,
            roomId,
            gameMode,
            sentAt: firebase.database.ServerValue.TIMESTAMP
        });
        setTimeout(() => ref.remove().catch(() => {}), 60000);
    }

    function listenForGameInvites(callback) {
        const uid = myUid();
        if (!uid) return () => {};
        const ref = rtdb().ref(`gameInvites/${uid}`);
        const handler = ref.on('child_added', snap => {
            if (snap.exists()) callback({ id: snap.key, ...snap.val() });
        });
        return () => ref.off('child_added', handler);
    }

    async function clearGameInvite(fromUid) {
        const uid = myUid();
        if (!uid) return;
        await rtdb().ref(`gameInvites/${uid}/${fromUid}`).remove();
    }

    return {
        sendFriendRequest, acceptFriendRequest, declineFriendRequest,
        getFriendList, getPendingRequests, listenForRequests,
        removeFriend, isFriend, hasOutgoingRequest,
        sendGameInvite, listenForGameInvites, clearGameInvite
    };
})();

window.FriendsManager = FriendsManager;
