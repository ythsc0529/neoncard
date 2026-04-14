/**
 * Neon Card - Gacha Pools Data
 */
const GACHA_POOLS = [
    {
        id: 'general',
        name: '一般獎池',
        costType: 'drawNormal',
        costName: '普通抽獎券',
        costAmount: 1,
        hasFreeDaily: true,
        bg: 'linear-gradient(135deg, #1a1a2e, #16213e)',
        desc: '包含大部分基礎角色與強力角色。\n由科學、一般等級組成。',
        ratesHtml: 'MYTHIC: 1% | LEGENDARY: 4% | EPIC: 15% | RARE: 35% | COMMON: 45%'
    },
    {
        id: 'science',
        name: '科學獎池',
        costType: 'drawPremium',
        costName: '高級抽獎券',
        costAmount: 1,
        hasFreeDaily: false,
        bg: 'linear-gradient(135deg, #0f3460, #1a1a2e)',
        desc: '專注於高稀有度科学角色。\n低機率出現神話。',
        ratesHtml: 'MYTHIC: 2% | LEGENDARY: 10% | EPIC: 30% | RARE: 58%'
    },
    {
        id: 'star',
        name: '新星特選',
        costType: 'drawSpecial',
        costName: '特殊抽獎券',
        costAmount: 1,
        hasFreeDaily: false,
        bg: 'linear-gradient(135deg, #4e0066, #1a1a2e)',
        desc: '包含新星系列角色與強力傳說卡牌。\n無一般卡。',
        ratesHtml: 'MYTHIC: 5% | LEGENDARY: 20% | EPIC: 75%'
    },
    {
        id: 'titles',
        name: '皇民化運動 (稱號)',
        costType: 'drawNormal',
        costName: '普通抽獎券',
        costAmount: 1,
        hasFreeDaily: false,
        bg: 'linear-gradient(135deg, #1b3a4b, #212529)',
        desc: '僅能抽中特殊稱號 (EPIC)。\n如果你已擁有所有稱號，抽獎將退還券。',
        ratesHtml: 'EPIC: 100% (稱號已滿則退票)'
    },
    {
        id: 'evo',
        name: '進化之光 (神話/傳說)',
        costType: 'drawPremium',
        costName: '高級抽獎券',
        costAmount: 3,
        hasFreeDaily: false,
        bg: 'linear-gradient(135deg, #ffcc00, #ff6600)',
        desc: '極高消耗，但僅會產出神話與傳說卡牌。\n推薦給頂尖收藏家。',
        ratesHtml: 'MYTHIC: 10% | LEGENDARY: 90%'
    }
];

const GachaLogic = {
    isToday(timestamp) {
        if (!timestamp) return false;
        const d = new Date(timestamp);
        const t = new Date();
        return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
    },

    hasFreePull(profile) {
        for (const pool of GACHA_POOLS) {
            if (pool.hasFreeDaily) {
                const lastFree = profile.dailyResetTime?.freeGacha || 0;
                if (!this.isToday(lastFree)) return true;
            }
        }
        return false;
    }
};
