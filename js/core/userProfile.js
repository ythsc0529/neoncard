/**
 * Neon Card Game - User Profile Manager (Firestore)
 */
const UserProfile = (() => {
    const db = () => AuthManager.getDb();

    async function getProfile(uid) {
        // ── NPC Bot Profile Fallback ─────────────────────────────────────────
        if (uid && uid.startsWith('NPC_')) {
            const botName = uid.split('NPC_')[1];
            if (typeof NPC_PROFILES !== 'undefined' && NPC_PROFILES[botName]) {
                const botData = NPC_PROFILES[botName];
                return { uid, ...botData, isBot: true };
            }
        }

        try {
            const doc = await db().collection('users').doc(uid).get();
            if (!doc.exists) return null;
            
            const data = doc.data();
            let needsUpdate = false;
            const updates = {};
            
            if (!data.titles || !data.titles.includes('初到新星')) {
                updates.titles = firebase.firestore.FieldValue.arrayUnion('初到新星');
                data.titles = data.titles || [];
                if (!data.titles.includes('初到新星')) data.titles.push('初到新星');
                needsUpdate = true;
            }
            if (!data.activeTitle) {
                updates.activeTitle = '初到新星';
                data.activeTitle = '初到新星';
                needsUpdate = true;
            }
            if (!data.ranked) {
                const def = typeof RankedSystem !== 'undefined'
                    ? RankedSystem.defaultRanked()
                    : { tierIdx: 0, stars: 1, points: 0, peakTierIdx: 0, peakSeason: 'S1' };
                updates.ranked = def;
                data.ranked = def;
                needsUpdate = true;
            }
            
            // --- NEW MECHANICS FALLBACKS ---
            if (data.level === undefined) { updates.level = 0; data.level = 0; needsUpdate = true; }
            if (data.exp === undefined) { updates.exp = 0; data.exp = 0; needsUpdate = true; }
            if (!data.inventory) {
                const defInv = { money: 300, landDeed: 10, drawNormal: 10, drawPremium: 1, drawSpecial: 0, passToken: 0, forgiveToken: 2 };
                updates.inventory = defInv; data.inventory = defInv; needsUpdate = true;
            }
            if (!data.unlockedCharacters) {
                const defChars = ['戰士', '抽卡員', '足球', '機率型選手', '灰塵', '隨便你', '巴萬', '蝦子', '史詩', '聖女', '水龍頭', '教宗', '英國紳士', '小吉', '很亮的魚'];
                updates.unlockedCharacters = defChars; data.unlockedCharacters = defChars; needsUpdate = true;
            }
            if (!data.missions) {
                updates.missions = { newbie: {}, daily: {}, permanent: {}, story: {} };
                data.missions = updates.missions; needsUpdate = true;
            }
            if (!data.battlePass) {
                updates.battlePass = { 
                    "踢飛．起步": { level: 1, exp: 0, claimed: [] }, 
                    "踢飛．盛宴": { unlocked: false, level: 1, exp: 0, claimed: [] } 
                };
                data.battlePass = updates.battlePass; needsUpdate = true;
            }
            if (!data.redeemedCodes) {
                updates.redeemedCodes = []; data.redeemedCodes = []; needsUpdate = true;
            }
            
            if (needsUpdate) {
                // Fire and forget update
                db().collection('users').doc(uid).set(updates, { merge: true }).catch(e => console.error('[UserProfile] auto-update failed:', e));
            }
            
            return { uid: doc.id, ...data };
        } catch (e) {
            console.error('[UserProfile] getProfile:', e);
            return null;
        }
    }
    async function createProfile(uid, displayName, googlePhotoURL) {
        const def = typeof RankedSystem !== 'undefined'
            ? RankedSystem.defaultRanked()
            : { tierIdx: 0, stars: 1, points: 0, peakTierIdx: 0, peakSeason: 'S1' };
        const profile = {
            displayName: displayName.trim(),
            googlePhotoURL: googlePhotoURL || '',
            bio: '',
            favoriteChars: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            isProfileSetup: true,
            uid,
            ranked: def,
            titles: ['初到新星'],
            activeTitle: '初到新星',
            level: 0,
            exp: 0,
            inventory: { money: 300, landDeed: 10, drawNormal: 10, drawPremium: 1, drawSpecial: 0, passToken: 0, forgiveToken: 2 },
            unlockedCharacters: ['戰士', '抽卡員', '足球', '機率型選手', '灰塵', '隨便你', '巴萬', '蝦子', '史詩', '聖女', '水龍頭', '教宗', '英國紳士', '小吉', '很亮的魚'],
            missions: { newbie: {}, daily: {}, permanent: {}, story: {} },
            battlePass: { 
                "踢飛．起步": { level: 1, exp: 0, claimed: [] }, 
                "踢飛．盛宴": { unlocked: false, level: 1, exp: 0, claimed: [] } 
            },
            redeemedCodes: []
        };
        await db().collection('users').doc(uid).set(profile);
        return profile;
    }

    async function updateProfile(uid, data) {
        await db().collection('users').doc(uid).update(data);
    }

    async function searchByDisplayName(query) {
        if (!query) return [];
        
        // 1. Search bots first (local)
        let botResults = [];
        if (typeof NPC_PROFILES !== 'undefined') {
            botResults = Object.keys(NPC_PROFILES)
                .filter(name => name.toLowerCase().includes(query.toLowerCase()))
                .map(name => ({
                    uid: `NPC_${name}`,
                    ...NPC_PROFILES[name],
                    isBot: true
                }));
        }

        // 2. Search Firestore
        const snap = await db().collection('users')
            .where('displayName', '>=', query)
            .where('displayName', '<=', query + '\uf8ff')
            .limit(10).get();
        const firestoreResults = snap.docs.map(d => ({ uid: d.id, ...d.data() }));

        // Merge results (bots first for flavor, or mix them)
        return [...botResults, ...firestoreResults].slice(0, 15);
    }

    // Check if a display name is already taken (optionally excluding a uid)
    async function isNameTaken(name, excludeUid = null) {
        if (!name || name.trim().length < 2) return false;
        const snap = await db().collection('users')
            .where('displayName', '==', name.trim())
            .limit(2).get();
        if (snap.empty) return false;
        return snap.docs.some(d => d.id !== excludeUid);
    }

    // Increment win or loss stat for a game mode
    // mode: 'pve' | 'pvp' | 'online' | 'competitive' | 'ranked'
    async function incrementStat(uid, mode, isWin) {
        const field = isWin ? 'wins' : 'losses';
        const updateData = {};
        updateData[`stats.${mode}.${field}`] = firebase.firestore.FieldValue.increment(1);
        try {
            await db().collection('users').doc(uid).update(updateData);
        } catch (e) {
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

    // ── Ranked helpers ───────────────────────────────────────────────────────
    async function updateRanked(uid, rankedData) {
        await db().collection('users').doc(uid).set(
            { ranked: rankedData },
            { merge: true }
        );
    }

    // ── Match History helpers ────────────────────────────────────────────────
    async function recordMatch(uid, matchData) {
        if (!uid || uid.startsWith('NPC_')) return; // Don't record for bots
        
        try {
            const docRef = db().collection('users').doc(uid);
            const doc = await docRef.get();
            if (!doc.exists) return;

            const data = doc.data();
            const recentMatches = data.recentMatches || [];

            // Add new match at the beginning
            const newMatch = {
                ...matchData,
                timestamp: Date.now()
            };

            // Prepend and limit to 5
            const updatedMatches = [newMatch, ...recentMatches].slice(0, 5);

            await docRef.set({ recentMatches: updatedMatches }, { merge: true });
        } catch (e) {
            console.error('[UserProfile] recordMatch failed:', e);
        }
    }

    // ── Title helpers ────────────────────────────────────────────────────────
    // Ensure legacy accounts get 初到新星 title and default ranked
    async function ensureTitles(uid) {
        const p = await getProfile(uid);
        if (!p) return;
        const updates = {};
        const titles = p.titles || [];
        if (!titles.includes('初到新星')) {
            updates.titles = firebase.firestore.FieldValue.arrayUnion('初到新星');
        }
        if (!p.activeTitle) {
            updates.activeTitle = '初到新星';
        }
        if (!p.ranked) {
            const def = typeof RankedSystem !== 'undefined'
                ? RankedSystem.defaultRanked()
                : { tierIdx: 0, stars: 1, points: 0, peakTierIdx: 0, peakSeason: 'S1' };
            updates.ranked = def;
        }
        if (Object.keys(updates).length > 0) {
            await db().collection('users').doc(uid).set(updates, { merge: true });
        }
    }

    async function addTitle(uid, titleKey) {
        await db().collection('users').doc(uid).set(
            { titles: firebase.firestore.FieldValue.arrayUnion(titleKey) },
            { merge: true }
        );
    }

    async function setActiveTitle(uid, titleKey) {
        await db().collection('users').doc(uid).update({ activeTitle: titleKey });
    }

    // ── New Mechanics Managers ───────────────────────────────────────────────
    async function gainExp(uid, amount) {
        if (!uid || uid.startsWith('NPC_')) return;
        const p = await getProfile(uid);
        if(!p) return;
        const newExp = (p.exp || 0) + amount;
        await db().collection('users').doc(uid).update({ exp: newExp });
        return newExp;
    }

    async function updateInventory(uid, items) {
        // items is an object like { money: 50, drawNormal: -1 }
        if (!uid || uid.startsWith('NPC_')) return;
        const updates = {};
        for(let key in items) {
            updates[`inventory.${key}`] = firebase.firestore.FieldValue.increment(items[key]);
        }
        await db().collection('users').doc(uid).set(updates, { merge: true });
    }

    async function unlockCharacter(uid, charName) {
        if (!uid || uid.startsWith('NPC_')) return false;
        const p = await getProfile(uid);
        if(!p) return false;
        
        if (p.unlockedCharacters && p.unlockedCharacters.includes(charName)) {
            return false; // already unlocked
        }
        await db().collection('users').doc(uid).set({
            unlockedCharacters: firebase.firestore.FieldValue.arrayUnion(charName)
        }, { merge: true });
        return true;
    }

    async function redeemCode(uid, code) {
        if (!uid || uid.startsWith('NPC_')) return false;
        const p = await getProfile(uid);
        if(!p) return false;
        if(p.redeemedCodes && p.redeemedCodes.includes(code)) return false;
        
        await db().collection('users').doc(uid).set({
            redeemedCodes: firebase.firestore.FieldValue.arrayUnion(code)
        }, { merge: true });
        return true;
    }

    return {
        getProfile, createProfile, updateProfile,
        searchByDisplayName, isNameTaken,
        incrementStat, isProfileSetup,
        updateRanked, recordMatch, ensureTitles, addTitle, setActiveTitle,
        gainExp, updateInventory, unlockCharacter, redeemCode
    };
})();

window.UserProfile = UserProfile;
