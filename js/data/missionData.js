/**
 * Neon Card - Mission Data & Logic
 */
const MISSIONS_DATA = [
    // 新手任務 — id, type, name, desc, condition, rewards
    { id: 'n1', type: 'novice', name: '學習戰鬥',  desc: '完成任意一場連線模式', condKey: 'onlineMatches', condVal: 1,  rewards: [{ type: 'drawNormal', amt: 1, txt: '普通抽獎卷x1' }] },
    { id: 'n2', type: 'novice', name: '招募',       desc: '抽一次任意獎池 (前往商店抽獎後自動解鎖)', condKey: 'gachaPulls',   condVal: 1,  rewards: [{ type: 'money', amt: 100, txt: '錢錢x100' }, { type: 'exp', amt: 20, txt: '經驗x20' }] },
    { id: 'n3', type: 'novice', name: '555嗚嗚',   desc: '達到等級5', condKey: 'level', condVal: 5, rewards: [{ type: 'drawPremium', amt: 1, txt: '高級抽獎券x1' }] },
    { id: 'n4', type: 'novice', name: '2場對戰',   desc: '完成任意2場連線模式', condKey: 'onlineMatches', condVal: 2,  rewards: [{ type: 'money', amt: 50,  txt: '錢錢x50' }] },
    { id: 'n5', type: 'novice', name: '輕鬆贏',    desc: '在任意一場連線模式中取得勝利', condKey: 'onlineWins', condVal: 1, rewards: [{ type: 'money', amt: 100, txt: '錢錢x100' }] },
    { id: 'n6', type: 'novice', name: '根本高手',  desc: '在任意連線模式獲勝3次', condKey: 'onlineWins', condVal: 3, rewards: [{ type: 'money', amt: 150, txt: '錢錢x150' }] },
    { id: 'n7', type: 'novice', name: '問就是買',  desc: '到商店購買任意物品 (購買後刷新此頁)', condKey: 'shopPurchases', condVal: 1, rewards: [{ type: 'exp', amt: 50, txt: '經驗x50' }] },
    { id: 'n8', type: 'novice', name: 'NPC?',      desc: '完成任意難度人機模式並取得勝利', condKey: 'pveWins', condVal: 1, rewards: [{ type: 'money', amt: 50, txt: '錢錢x50' }] },
    { id: 'n9', type: 'novice', name: '我很資深!', desc: '解鎖排位賽 (達到等級10)', condKey: 'level', condVal: 10, rewards: [{ type: 'forgiveToken', amt: 2, txt: '贖罪券x2' }] },
    
    // 每日任務 — daily reset
    { id: 'd1', type: 'daily', name: '對戰!',      desc: '進行任意一場連線模式',  condKey: 'onlineMatches', condVal: 1, rewards: [{ type: 'money', amt: 50,  txt: '錢錢x50' }] },
    { id: 'd2', type: 'daily', name: '贏!',        desc: '在任意一場連線模式取得勝利', condKey: 'onlineWins',   condVal: 1, rewards: [{ type: 'money', amt: 150, txt: '錢錢x150' }] },
    { id: 'd3', type: 'daily', name: '我愛霓虹牌', desc: '上線遊戲 (自動完成)',  condKey: 'login', condVal: 1, rewards: [{ type: 'money', amt: 30,  txt: '錢錢x30' }] },
    
    // 常駐任務 — repeatable
    { id: 'p1', type: 'perm', name: '稱號',         desc: '獲得任意稱號 (每擁有1個可領取1次)', condKey: 'titlesCount', condVal: 1, rewards: [{ type: 'exp', amt: 50, txt: '經驗x50' }, { type: 'money', amt: 200, txt: '錢錢x200' }], repeatable: true },
];

const MissionLogic = {
    checkCondition(m, profile) {
        if (!m.condKey || !profile) return false;
        
        // For repeatable missions (titlesCount): owned > repeats
        if (m.repeatable && m.condKey === 'titlesCount') {
            const repeats = (profile.missions?.repeatCounts || {})[m.id] || 0;
            const owned = (profile.titles || []).length;
            return owned > repeats;
        }

        const repeats = (profile.missions?.repeatCounts || {})[m.id] || 0;
        const reqVal = m.repeatable ? (m.condVal * (repeats + 1)) : m.condVal;

        switch (m.condKey) {
            case 'login':         return true;
            case 'level':         return (profile.level || 0) >= reqVal;
            case 'onlineMatches': return ((profile.stats?.online?.wins || 0) + (profile.stats?.online?.losses || 0)) >= reqVal;
            case 'onlineWins':    return (profile.stats?.online?.wins || 0) >= reqVal;
            case 'pveWins':       return (profile.stats?.pve?.wins || 0) >= reqVal;
            case 'gachaPulls':    return (profile.missions?.gachaPulls || 0) >= reqVal;
            case 'shopPurchases': return (profile.missions?.shopPurchases || 0) >= reqVal;
            case 'titlesCount':   return (profile.titles || []).length >= reqVal;
            default:              return false;
        }
    },

    isClaimed(m, profile) {
        if (m.repeatable) return false; // Repeatable missions are never "fully claimed" in this context
        const claimed = profile.missions?.claimed || [];
        return claimed.includes(m.id);
    },

    canClaim(m, profile) {
        return this.checkCondition(m, profile) && !this.isClaimed(m, profile);
    }
};
