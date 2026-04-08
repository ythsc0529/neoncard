/**
 * Neon Card Game - Matchmaking Manager (Realtime Database)
 * Uses RTDB transactions for atomic slot-claiming to eliminate race conditions.
 * After ~15s with no real opponent, silently falls back to a bot disguised as a real player.
 */
const MatchmakingManager = (() => {
    const rtdb = () => AuthManager.getRtdb();

    let _myRef      = null;
    let _myListener = null;
    let _timeout    = null;
    let _committed  = false; // guard: prevent double-commit

    // ── Fake player name pool ─────────────────────────────────────────
    const FAKE_NAMES = [
        'StarBlade_77', 'NightWolf', 'AquaFox', 'SilverEcho', 'ZephyrX',
        'CrimsonAce', 'DuskRider', 'IronVeil', 'LunarByte', 'ThunderEdge',
        '霓虹劍客', '幽靈手牌', '星煌決鬥', '暗月行者', '閃電術士',
        '赤焰王者', '冰晶智者', '神速閃擊', '午夜孤狼', '破曉戰士',
        'V3n0m_GG', 'TurboDecK', 'Phr0st', 'Kairos_99', 'NebulaX',
        '影速', '天穹牌師', '絕境逆轉', '虛空術士', 'ProPLayer2077'
    ];

    function getRandomBotName() {
        return FAKE_NAMES[Math.floor(Math.random() * FAKE_NAMES.length)];
    }

    function genCode() {
        const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        return Array.from({ length: 4 }, () => c[Math.floor(Math.random() * c.length)]).join('');
    }

    // ─────────────────────────────────────────────────────────────────
    // joinQueue: main entry point
    // ─────────────────────────────────────────────────────────────────
    async function joinQueue(gameMode, displayName, onStatus, rankedInfo) {
        const user = AuthManager.getCurrentUser();
        if (!user) return;

        const uid      = user.uid;
        const roomCode = genCode();
        _committed     = false;

        const queueRef = rtdb().ref(`matchmaking/${gameMode}`);
        _myRef         = queueRef.child(uid);

        // 1. Write own entry
        const myRankScore = rankedInfo
            ? (typeof RankedSystem !== 'undefined' ? RankedSystem.getRankScore(rankedInfo) : 0)
            : 0;
        await _myRef.set({
            uid,
            displayName,
            roomCode,
            rankScore: myRankScore,
            joinedAt: firebase.database.ServerValue.TIMESTAMP
        });
        _myRef.onDisconnect().remove();

        if (onStatus) onStatus('searching');

        // 2. Read the queue and try to claim an opponent via transaction
        const claimed = await _tryClaim(queueRef, uid, displayName, gameMode, onStatus);
        if (claimed) return;

        // 3. Nobody to claim — become HOST, watch for joiner removing my entry
        _myListener = _myRef.on('value', snap => {
            if (!snap.exists() && !_committed) {
                _committed = true;
                clearTimeout(_timeout);
                if (_myListener) { _myRef.off('value', _myListener); _myListener = null; }
                _commit('host', roomCode, null, displayName, gameMode);
                if (onStatus) onStatus('matched');
            }
        });

        // 4. Bot-match fallback after ~15 s (13-17s)
        const botDelay = (13 + Math.floor(Math.random() * 5)) * 1000;
        _timeout = setTimeout(async () => {
            if (_committed) return;
            _committed = true;
            leaveQueue();
            if (onStatus) onStatus('bot_match_start');
            await new Promise(r => setTimeout(r, 1800));
            _commitBotMatch(getRandomBotName(), gameMode, displayName);
            if (onStatus) onStatus('matched');
        }, botDelay);
    }

    // ─────────────────────────────────────────────────────────────────
    // _tryClaim: atomically claim a waiting opponent via RTDB transaction
    // Returns true if successfully matched as joiner.
    // ─────────────────────────────────────────────────────────────────
    async function _tryClaim(queueRef, myUid, displayName, gameMode, onStatus) {
        const snap = await queueRef.once('value');
        const all  = snap.val() || {};

        const myData = all[myUid];
        if (!myData) return false;

        // Sort by rankScore similarity first, then by joinedAt for tiebreaking
        const myRankScore = myData.rankScore || 0;
        const candidates = Object.entries(all)
            .filter(([id, data]) => {
                if (id === myUid) return false;
                if (data.joinedAt < myData.joinedAt) return true;
                if (data.joinedAt === myData.joinedAt && id < myUid) return true;
                return false;
            })
            .sort((a, b) => {
                // Prefer closest rank score
                const aDiff = Math.abs((a[1].rankScore || 0) - myRankScore);
                const bDiff = Math.abs((b[1].rankScore || 0) - myRankScore);
                if (aDiff !== bDiff) return aDiff - bDiff;
                return (a[1].joinedAt || 0) - (b[1].joinedAt || 0);
            });

        for (const [oppUid, oppData] of candidates) {
            let claimSucceeded = false;
            let claimedData    = null;

            await queueRef.child(oppUid).transaction(current => {
                if (current !== null) {
                    // Slot is still occupied — atomically remove it (claim)
                    claimSucceeded = true;
                    claimedData    = current;
                    return null; // delete the node
                }
                // Already claimed by someone else — abort
                return current;
            });

            if (claimSucceeded && claimedData) {
                // We won the race → we are the JOINER
                _committed = true;
                await _myRef.remove();
                _commit('join', claimedData.roomCode, claimedData.displayName, displayName, gameMode);
                if (onStatus) onStatus('matched');
                return true;
            }
        }

        return false; // no opponent found
    }

    // ─────────────────────────────────────────────────────────────────
    // Commit helpers
    // ─────────────────────────────────────────────────────────────────
    function _commitBotMatch(botName, gameMode, myName) {
        localStorage.setItem('gameMode', 'pve');
        localStorage.setItem('gameType', 'pve');
        localStorage.setItem('pveDifficulty', 'normal');
        localStorage.setItem('botMatchName', botName);
        localStorage.setItem('fromCompetitiveMode', 'true');
        localStorage.setItem('onlineSubMode', gameMode);
        localStorage.removeItem('onlineRole');
        if (myName) localStorage.setItem('onlineMyName', myName);
        
        // If we were in a ranked queue, set bot ranked flag
        if (localStorage.getItem('isRankedMatch') === 'true') {
            localStorage.setItem('isBotRankedMatch', 'true');
            localStorage.removeItem('isRankedMatch'); // Use bot specific flag
        }
        
        setTimeout(() => { location.href = 'game.html'; }, 600);
    }

    function _commit(role, roomCode, opponentName, myName, gameMode) {
        localStorage.setItem('gameMode', 'online');
        localStorage.setItem('gameType', 'pvp');
        localStorage.setItem('onlineRole', role);
        localStorage.setItem('onlineSubMode', gameMode);
        localStorage.setItem('onlineMyName', myName);
        localStorage.setItem('fromCompetitiveMode', 'true');
        if (role === 'join') {
            localStorage.setItem('roomId', roomCode);
            localStorage.setItem('onlineOpponentName', opponentName || '');
        } else {
            sessionStorage.setItem('last_host_room_id', roomCode);
            localStorage.setItem('onlineOpponentName', '');
        }
        setTimeout(() => { location.href = 'game.html'; }, 800);
    }

    // ─────────────────────────────────────────────────────────────────
    function leaveQueue() {
        if (_myRef) {
            if (_myListener) { _myRef.off('value', _myListener); _myListener = null; }
            _myRef.remove();
            _myRef = null;
        }
        if (_timeout) { clearTimeout(_timeout); _timeout = null; }
    }

    return { joinQueue, leaveQueue };
})();

window.MatchmakingManager = MatchmakingManager;
