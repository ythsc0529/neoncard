/**
 * Neon Card - Battle Pass Data
 */
const PASS_FREE = {
    1: { type: 'money', amount: 50 },
    2: { type: 'exp', amount: 20 },
    5: { type: 'money', amount: 100 },
    10: { type: 'drawNormal', amount: 1 },
    11: { type: 'exp', amount: 20 },
    15: { type: 'money', amount: 100 },
    16: { type: 'money', amount: 50 },
    19: { type: 'drawPremium', amount: 1 },
    20: { type: 'title', name: '踢飛起步' }
};

const PASS_PREM = {
    1: { type: 'drawNormal', amount: 1 },
    2: { type: 'money', amount: 100 },
    3: { type: 'drawNormal', amount: 1 },
    4: { type: 'landDeed', amount: 30 },
    5: { type: 'money', amount: 100 },
    6: { type: 'exp', amount: 150 },
    7: { type: 'money', amount: 100 },
    8: { type: 'drawSpecial', amount: 1 },
    9: { type: 'money', amount: 150 },
    10: { type: 'drawPremium', amount: 1 },
    11: { type: 'drawNormal', amount: 1 },
    12: { type: 'drawNormal', amount: 1 },
    13: { type: 'drawPremium', amount: 1 },
    14: { type: 'money', amount: 150 },
    15: { type: 'money', amount: 300 },
    16: { type: 'exp', amount: 200 },
    17: { type: 'money', amount: 150 },
    18: { type: 'drawNormal', amount: 1 },
    19: { type: 'title', name: '一腳定江山' },
    20: { type: 'char', name: '踢飛你' }
};

const PassLogic = {
    getCurrentLevel(points) {
        return Math.floor((points || 0) / 50);
    },
    
    canClaimAny(profile) {
        const pass = profile.battlePass || { points: 0, premiumActive: false, claimed: { free: [], premium: [] } };
        const curLevel = this.getCurrentLevel(pass.points);
        const isPremium = pass.premiumActive === true;
        
        const freeClaimed = pass.claimed?.free || [];
        const premClaimed = pass.claimed?.premium || [];
        
        for (let i = 1; i <= 20; i++) {
            // Check free track
            if (PASS_FREE[i] && curLevel >= i && !freeClaimed.includes(i)) return true;
            
            // Check premium track
            if (PASS_PREM[i] && isPremium && curLevel >= i && !premClaimed.includes(i)) return true;
        }
        return false;
    }
};
