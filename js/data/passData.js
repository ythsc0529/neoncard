/**
 * Neon Card - Battle Pass Data & Configuration
 */
const PASS_SEASON_CONFIG = {
    seasonId: 'S1',
    seasonName: '踢飛．盛宴',
    freeName: '踢飛．起步',
    premiumName: '踢飛．盛宴',
    endDate: '2026/12/31',
    endTimestamp: new Date('2026-12-31T23:59:59+08:00').getTime(),
    pointsPerLevel: 50,
    maxLevel: 20,
    pointsWin: 30,
    pointsLoss: 15
};

const PASS_FREE = {
    1: { type: 'money', amount: 50, desc: '可用於遊戲內基礎消費' },
    2: { type: 'exp', amount: 20, desc: '增加玩家帳號經驗值' },
    5: { type: 'money', amount: 100, desc: '可用於遊戲內基礎消費' },
    10: { type: 'drawNormal', amount: 1, desc: '普通角色卡包抽獎券' },
    11: { type: 'exp', amount: 20, desc: '增加玩家帳號經驗值' },
    15: { type: 'money', amount: 100, desc: '可用於遊戲內基礎消費' },
    16: { type: 'money', amount: 50, desc: '可用於遊戲內基礎消費' },
    19: { type: 'drawPremium', amount: 1, desc: '高級角色卡包抽獎券' },
    20: { type: 'title', name: '踢飛起步', image: 'hao_pic/踢飛起步.png', desc: '賽季起步專屬榮譽稱號' }
};

const PASS_PREM = {
    1: { type: 'drawNormal', amount: 1, desc: '普通角色卡包抽獎券' },
    2: { type: 'money', amount: 100, desc: '可用於遊戲內基礎消費' },
    3: { type: 'drawNormal', amount: 1, desc: '普通角色卡包抽獎券' },
    4: { type: 'landDeed', amount: 30, desc: '稀有貨幣，可用於商店兌換珍稀道具' },
    5: { type: 'money', amount: 100, desc: '可用於遊戲內基礎消費' },
    6: { type: 'exp', amount: 150, desc: '增加玩家帳號經驗值' },
    7: { type: 'money', amount: 100, desc: '可用於遊戲內基礎消費' },
    8: { type: 'drawSpecial', amount: 1, desc: '特殊角色卡包抽獎券' },
    9: { type: 'money', amount: 150, desc: '可用於遊戲內基礎消費' },
    10: { type: 'drawPremium', amount: 1, desc: '高級角色卡包抽獎券' },
    11: { type: 'drawNormal', amount: 1, desc: '普通角色卡包抽獎券' },
    12: { type: 'drawNormal', amount: 1, desc: '普通角色卡包抽獎券' },
    13: { type: 'drawPremium', amount: 1, desc: '高級角色卡包抽獎券' },
    14: { type: 'money', amount: 150, desc: '可用於遊戲內基礎消費' },
    15: { type: 'money', amount: 300, desc: '可用於遊戲內基礎消費' },
    16: { type: 'exp', amount: 200, desc: '增加玩家帳號經驗值' },
    17: { type: 'money', amount: 150, desc: '可用於遊戲內基礎消費' },
    18: { type: 'drawNormal', amount: 1, desc: '普通角色卡包抽獎券' },
    19: { type: 'title', name: '一腳定江山', image: 'hao_pic/踢飛你.png', desc: '盛宴進階專屬霸氣稱號' },
    20: { type: 'char', name: '踢飛你', image: 'hao_pic/踢飛你.png', desc: '賽季限定傳奇角色【踢飛你】' }
};

const PassLogic = {
    getCurrentLevel(points) {
        return Math.floor((points || 0) / PASS_SEASON_CONFIG.pointsPerLevel);
    },
    
    getPointsInCurrentLevel(points) {
        return (points || 0) % PASS_SEASON_CONFIG.pointsPerLevel;
    },

    getPointsToNextLevel(points) {
        const cur = (points || 0) % PASS_SEASON_CONFIG.pointsPerLevel;
        return PASS_SEASON_CONFIG.pointsPerLevel - cur;
    },

    getClaimableRewards(profile) {
        const pass = profile.battlePass || { points: 0, premiumActive: false, claimed: { free: [], premium: [] } };
        const curLevel = this.getCurrentLevel(pass.points);
        const isPremium = pass.premiumActive === true;
        const freeClaimed = pass.claimed?.free || [];
        const premClaimed = pass.claimed?.premium || [];

        const list = [];
        for (let i = 1; i <= PASS_SEASON_CONFIG.maxLevel; i++) {
            if (PASS_FREE[i] && curLevel >= i && !freeClaimed.includes(i)) {
                list.push({ level: i, track: 'free', reward: PASS_FREE[i] });
            }
            if (PASS_PREM[i] && isPremium && curLevel >= i && !premClaimed.includes(i)) {
                list.push({ level: i, track: 'premium', reward: PASS_PREM[i] });
            }
        }
        return list;
    },
    
    canClaimAny(profile) {
        return this.getClaimableRewards(profile).length > 0;
    }
};

window.PASS_SEASON_CONFIG = PASS_SEASON_CONFIG;
window.PASS_FREE = PASS_FREE;
window.PASS_PREM = PASS_PREM;
window.PassLogic = PassLogic;
