/**
 * Neon Card Game - User Profile Manager (Firestore)
 */
const UserProfile = (() => {
    const db = () => AuthManager.getDb();

    async function getProfile(uid) {
        try {
            const doc = await db().collection('users').doc(uid).get();
            return doc.exists ? { uid: doc.id, ...doc.data() } : null;
        } catch (e) {
            console.error('[UserProfile] getProfile:', e);
            return null;
        }
    }

    async function createProfile(uid, displayName, googlePhotoURL) {
        const profile = {
            displayName: displayName.trim(),
            googlePhotoURL: googlePhotoURL || '',
            bio: '',
            favoriteChars: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            isProfileSetup: true,
            uid
        };
        await db().collection('users').doc(uid).set(profile);
        return profile;
    }

    async function updateProfile(uid, data) {
        await db().collection('users').doc(uid).update(data);
    }

    async function searchByDisplayName(query) {
        if (!query) return [];
        const snap = await db().collection('users')
            .where('displayName', '>=', query)
            .where('displayName', '<=', query + '\uf8ff')
            .limit(10).get();
        return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
    }

    // Check if a display name is already taken (optionally excluding a uid)
    async function isNameTaken(name, excludeUid = null) {
        if (!name || name.trim().length < 2) return false;
        const snap = await db().collection('users')
            .where('displayName', '==', name.trim())
            .limit(2).get();
        if (snap.empty) return false;
        // Only taken if there's a doc that's NOT the excluding uid
        return snap.docs.some(d => d.id !== excludeUid);
    }

    // Increment win or loss stat for a game mode
    // mode: 'pve' | 'pvp' | 'online' | 'competitive'
    async function incrementStat(uid, mode, isWin) {
        const field = isWin ? 'wins' : 'losses';
        const updateData = {};
        updateData[`stats.${mode}.${field}`] = firebase.firestore.FieldValue.increment(1);
        try {
            await db().collection('users').doc(uid).update(updateData);
        } catch (e) {
            // If stats field doesn't exist yet, set it
            await db().collection('users').doc(uid).set(
                { stats: { [mode]: { [field]: 1 } } },
                { merge: true }
            );
        }
    }

    async function isProfileSetup(uid) {
        const p = await getProfile(uid);
        return !!(p && p.isProfileSetup);
    }

    return { getProfile, createProfile, updateProfile, searchByDisplayName, isNameTaken, incrementStat, isProfileSetup };
})();

window.UserProfile = UserProfile;
