/**
 * Neon Card Game - Matchmaking Manager (Realtime Database)
 * Handles auto-matchmaking for Competition Mode.
 * After 60 seconds with no real opponent found, matches player against AI
 * disguised as a random player name.
 */
const MatchmakingManager = (() => {
    const rtdb = () => AuthManager.getRtdb();

    let _myRef = null;
    let _myListener = null;
    let _timeout = null;

    // ── Fake player name pool ─────────────────────────────────────────
    const FAKE_NAMES = [
        'StarBlade_77', 'NightWolf', 'AquaFox', 'SilverEcho', 'ZephyrX',
        'CrimsonAce', 'DuskRider', 'IronVeil', 'LunarByte', 'ThunderEdge',
        '霓虹劍客', '幽靈手牌', '星煌決鬥', '暗月行者', '閃電術士',
        '赤焰王者', '冰晶智者', '神速閃擊', '午夜孤狼', '破曉戰士',
        'V3n0m_GG', 'TurboDecK', 'Phr0st', 'Kairos_99', 'NebulaX',
        '影速', '天穹牌師', '絕境逆轉', '虛空術士', 'ProPLayer2077', '我的刀盾', '逼逼拉補'
    ];

    function getRandomBotName() {
        return FAKE_NAMES[Math.floor(Math.random() * FAKE_NAMES.length)];
    }

    function genCode() {
        const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        return Array.from({ length: 4 }, () => c[Math.floor(Math.random() * c.length)]).join('');
    }

    async function joinQueue(gameMode, displayName, onStatus) {
        const user = AuthManager.getCurrentUser();
        if (!user) return;
        const uid = user.uid;
        const roomCode = genCode();

        const queueRef = rtdb().ref(`matchmaking/${gameMode}`);
        _myRef = queueRef.child(uid);

        // Write my entry
        await _myRef.set({
            uid,
            displayName,
            roomCode,
            joinedAt: firebase.database.ServerValue.TIMESTAMP,
            status: 'waiting'
        });
        _myRef.onDisconnect().remove();

        if (onStatus) onStatus('searching');

        // Look for an opponent already waiting
        const snap = await queueRef.orderByChild('status').equalTo('waiting').once('value');
        const all = snap.val() || {};
        const oppEntry = Object.entries(all).find(([id]) => id !== uid);

        if (oppEntry) {
            // Found opponent — I'm the joiner
            const [oppUid, oppData] = oppEntry;
            await queueRef.child(oppUid).remove();
            await _myRef.remove();
            _commit('join', oppData.roomCode, oppData.displayName, displayName, gameMode);
            if (onStatus) onStatus('matched');
            return;
        }

        // No opponent — wait as host
        _myListener = _myRef.on('value', snap => {
            if (!snap.exists()) {
                // Someone matched me by removing my entry — I'm the host
                clearTimeout(_timeout);
                _commit('host', roomCode, null, displayName, gameMode);
                if (onStatus) onStatus('matched');
            }
        });

        // 25~35s timeout → auto bot match (random so it doesn't feel scripted)
        const botDelay = (25 + Math.floor(Math.random() * 11)) * 1000; // 25–35 seconds
        _timeout = setTimeout(async () => {
            leaveQueue();
            if (onStatus) onStatus('bot_match_start');
            // Brief "found match" delay before redirecting
            await new Promise(r => setTimeout(r, 1800));
            const botName = getRandomBotName();
            _commitBotMatch(botName, gameMode);
            if (onStatus) onStatus('matched');
        }, botDelay);

    }

    function _commitBotMatch(botName, gameMode) {
        localStorage.setItem('gameMode', 'pve');
        localStorage.setItem('gameType', 'pve');
        localStorage.setItem('pveDifficulty', 'normal');
        localStorage.setItem('botMatchName', botName);        // disguised NPC name
        localStorage.setItem('fromCompetitiveMode', 'true');  // still counts as competitive
        localStorage.setItem('onlineSubMode', gameMode);      // card count
        localStorage.removeItem('onlineRole');
        setTimeout(() => { location.href = 'game.html'; }, 600);
    }

    function _commit(role, roomCode, opponentName, myName, gameMode) {
        localStorage.setItem('gameMode', 'online');
        localStorage.setItem('gameType', 'pvp');
        localStorage.setItem('onlineRole', role);
        localStorage.setItem('onlineSubMode', gameMode); // 'quick' or 'classic'
        localStorage.setItem('onlineMyName', myName);
        localStorage.setItem('fromCompetitiveMode', 'true'); // flag for stat tracking
        if (role === 'join') {
            localStorage.setItem('roomId', roomCode);
            localStorage.setItem('onlineOpponentName', opponentName || '');
        } else {
            // Host: set sessionStorage so networkManager uses our pre-generated code
            sessionStorage.setItem('last_host_room_id', roomCode);
            localStorage.setItem('onlineOpponentName', '');
        }
        setTimeout(() => { location.href = 'game.html'; }, 800);
    }


    function leaveQueue() {
        if (_myRef) {
            if (_myListener) _myRef.off('value', _myListener);
            _myRef.remove();
            _myRef = null;
        }
        if (_timeout) { clearTimeout(_timeout); _timeout = null; }
        _myListener = null;
    }

    return { joinQueue, leaveQueue };
})();

window.MatchmakingManager = MatchmakingManager;
