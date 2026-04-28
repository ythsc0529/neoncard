/**
 * Neon Card Game - NPC Bot Profiles
 * Predefined profiles for bots encountered in matchmaking.
 */
const NPC_PROFILES = {
    'StarBlade_77': {
        displayName: 'StarBlade_77',
        bio: '來自虛空邊境的劍客，追求極致的勝率。',
        stats: { online: { wins: 342, losses: 120 }, competitive: { wins: 56, losses: 12 } },
        ranked: { tierIdx: 12, stars: 3, points: 0, peakTierIdx: 15, peakSeason: 'S1' }, // 魘1
        activeTitle: '初到新星',
        favoriteChars: ['籃球', '火星', '梅子綠茶'],
        createdAt: new Date('2025-10-12')
    },
    'NightWolf': {
        displayName: 'NightWolf',
        bio: '午夜是我的戰場，陰影是我的朋友。',
        stats: { online: { wins: 156, losses: 140 }, competitive: { wins: 20, losses: 35 } },
        ranked: { tierIdx: 6, stars: 2, points: 0, peakTierIdx: 8, peakSeason: 'S1' }, // 刃1
        activeTitle: '無光之徒',
        favoriteChars: ['冥王星', '烏龍茶', '越野摩托車'],
        createdAt: new Date('2025-11-05')
    },
    'AquaFox': {
        displayName: 'AquaFox',
        bio: '流水不爭先，爭的是滔滔不絕。',
        stats: { online: { wins: 89, losses: 76 }, competitive: { wins: 5, losses: 10 } },
        ranked: { tierIdx: 3, stars: 4, points: 0, peakTierIdx: 4, peakSeason: 'S1' }, // 隱1
        activeTitle: '初到新星',
        favoriteChars: ['水星', '檸檬紅茶', '海王星'],
        createdAt: new Date('2026-01-20')
    },
    'SilverEcho': {
        displayName: 'SilverEcho',
        bio: '銀色的殘響，在虛空中迴盪。',
        stats: { online: { wins: 210, losses: 180 }, competitive: { wins: 45, losses: 40 } },
        ranked: { tierIdx: 9, stars: 5, points: 0, peakTierIdx: 10, peakSeason: 'S1' }, // 暗1
        activeTitle: '初到新星',
        favoriteChars: ['天王星', '足球', '水果茶'],
        createdAt: new Date('2026-04-02')
    },
    'ZephyrX': {
        displayName: 'ZephyrX',
        bio: '風之翼，翱翔於霓虹都市之上。',
        stats: { online: { wins: 500, losses: 450 }, competitive: { wins: 120, losses: 110 } },
        ranked: { tierIdx: 15, stars: 1, points: 0, peakTierIdx: 18, peakSeason: 'S1' }, // 虛1
        activeTitle: '命運篡奪者',
        favoriteChars: ['神速', '重型摩托車', '木星'],
        createdAt: new Date('2026-04-06')
    },
    'CrimsonAce': {
        displayName: 'CrimsonAce',
        bio: '赤紅的王牌，絕不輕易出手。',
        stats: { online: { wins: 120, losses: 30 }, competitive: { wins: 80, losses: 15 } },
        ranked: { tierIdx: 18, stars: 0, points: 450, peakTierIdx: 18, peakSeason: 'S1' }, // 永劫之顛
        activeTitle: '極夜加冕者',
        favoriteChars: ['太陽', '金星', '重型摩托車'],
        createdAt: new Date('2024-04-10')
    },
    'DuskRider': {
        displayName: 'DuskRider',
        bio: '在黃昏中奔馳，追逐最後的餘暉。',
        stats: { online: { wins: 45, losses: 50 }, competitive: { wins: 2, losses: 8 } },
        ranked: { tierIdx: 2, stars: 1, points: 0, peakTierIdx: 2, peakSeason: 'S1' }, // 骸3
        activeTitle: '初到新星',
        favoriteChars: ['冥王星', '土星', '烏龍茶'],
        createdAt: new Date('2026-03-30')
    },
    'IronVeil': {
        displayName: 'IronVeil',
        bio: '堅如鋼鐵，穩如泰山。',
        stats: { online: { wins: 300, losses: 290 }, competitive: { wins: 40, losses: 38 } },
        ranked: { tierIdx: 11, stars: 2, points: 0, peakTierIdx: 11, peakSeason: 'S1' }, // 暗3
        activeTitle: '初到新星',
        favoriteChars: ['地球', '排球', '多多綠茶'],
        createdAt: new Date('2026-04-07')
    },
    'LunarByte': {
        displayName: 'LunarByte',
        bio: '月光的代碼，正在重寫世界。',
        stats: { online: { wins: 180, losses: 165 }, competitive: { wins: 30, losses: 28 } },
        ranked: { tierIdx: 14, stars: 4, points: 0, peakTierIdx: 14, peakSeason: 'S1' }, // 魘3
        activeTitle: '初到新星',
        favoriteChars: ['月球', '水王星', '台茶18號'],
        createdAt: new Date('2026-04-06')
    },
    'ThunderEdge': {
        displayName: 'ThunderEdge',
        bio: '雷霆之怒，觸之即發。',
        stats: { online: { wins: 270, losses: 120 }, competitive: { wins: 95, losses: 40 } },
        ranked: { tierIdx: 17, stars: 3, points: 0, peakTierIdx: 17, peakSeason: 'S1' }, // 虛3
        activeTitle: '命運篡奪者',
        favoriteChars: ['木星', '高爾夫球', '採茶員'],
        createdAt: new Date('2026-04-01')
    },
    '霓虹劍客': {
        displayName: '霓虹劍客',
        bio: '這座城市只有一個正義，那就是我的劍。',
        stats: { online: { wins: 1500, losses: 500 }, competitive: { wins: 450, losses: 120 } },
        ranked: { tierIdx: 18, stars: 0, points: 1200, peakTierIdx: 18, peakSeason: 'S1' }, // 永劫之顛
        activeTitle: '絕對獨裁',
        favoriteChars: ['太陽', '北極星', '撞球'],
        createdAt: new Date('2026-04-03')
    },
    '幽靈手牌': {
        displayName: '幽靈手牌',
        bio: '你看得到的牌，都不是真的。',
        stats: { online: { wins: 66, losses: 66 }, competitive: { wins: 13, losses: 13 } },
        ranked: { tierIdx: 13, stars: 1, points: 0, peakTierIdx: 13, peakSeason: 'S1' }, // 魘2
        activeTitle: '無光之徒',
        favoriteChars: ['冥王星', '天王星', '多多綠茶'],
        createdAt: new Date('2026-04-01')
    },
    '星煌決鬥': {
        displayName: '星煌決鬥',
        bio: '繁星為我見證，每一場都是榮耀。',
        stats: { online: { wins: 420, losses: 380 }, competitive: { wins: 110, losses: 95 } },
        ranked: { tierIdx: 16, stars: 4, points: 0, peakTierIdx: 16, peakSeason: 'S1' }, // 虛2
        activeTitle: '初到新星',
        favoriteChars: ['北極星', '木星', '台茶18號'],
        createdAt: new Date('2026-04-11')
    },
    '暗月行者': {
        displayName: '暗月行者',
        bio: '我漫步在黑暗中，只為了尋找那一絲光芒。',
        stats: { online: { wins: 290, losses: 310 }, competitive: { wins: 33, losses: 50 } },
        ranked: { tierIdx: 7, stars: 3, points: 0, peakTierIdx: 9, peakSeason: 'S1' }, // 刃2
        activeTitle: '初到新星',
        favoriteChars: ['冥王星', '烏龍茶', '狗狗肉摩托車'],
        createdAt: new Date('2026-04-04')
    },
    '閃電術士': {
        displayName: '閃電術士',
        bio: '極速的魔法，你的眼睛捕捉不到。',
        stats: { online: { wins: 560, losses: 540 }, competitive: { wins: 150, losses: 145 } },
        ranked: { tierIdx: 14, stars: 2, points: 0, peakTierIdx: 15, peakSeason: 'S1' }, // 魘3
        activeTitle: '命運篡奪者',
        favoriteChars: ['水星', '神速', '採茶員'],
        createdAt: new Date('2026-04-04')
    },
    '赤焰王者': {
        displayName: '赤焰王者',
        bio: '讓火焰淨化這一切。',
        stats: { online: { wins: 888, losses: 222 }, competitive: { wins: 222, losses: 44 } },
        ranked: { tierIdx: 18, stars: 0, points: 888, peakTierIdx: 18, peakSeason: 'S1' }, // 永劫之顛
        activeTitle: '絕對獨裁',
        favoriteChars: ['太陽', '火星', '重型摩托車'],
        createdAt: new Date('2026-04-08')
    },
    '冰晶智者': {
        displayName: '冰晶智者',
        bio: '冷靜思考，每一張牌都有意義。',
        stats: { online: { wins: 432, losses: 321 }, competitive: { wins: 98, losses: 76 } },
        ranked: { tierIdx: 15, stars: 5, points: 0, peakTierIdx: 16, peakSeason: 'S1' }, // 虛1
        activeTitle: '初到新星',
        favoriteChars: ['海王星', '台茶18號', '高爾夫球'],
        createdAt: new Date('2026-04-10')
    },
    '神速閃擊': {
        displayName: '神速閃擊',
        bio: '戰鬥在五秒內結束。',
        stats: { online: { wins: 750, losses: 740 }, competitive: { wins: 210, losses: 205 } },
        ranked: { tierIdx: 13, stars: 2, points: 0, peakTierIdx: 15, peakSeason: 'S1' }, // 魘2
        activeTitle: '初到新星',
        favoriteChars: ['神速', '越野摩托車', '羽球'],
        createdAt: new Date('2026-04-08')
    },
    '午夜孤狼': {
        displayName: '午夜孤狼',
        bio: '獨自狩獵，是我的本能。',
        stats: { online: { wins: 145, losses: 130 }, competitive: { wins: 22, losses: 28 } },
        ranked: { tierIdx: 8, stars: 1, points: 0, peakTierIdx: 9, peakSeason: 'S1' }, // 刃3
        activeTitle: '無光之徒',
        favoriteChars: ['冥王星', '烏龍茶', '足球'],
        createdAt: new Date('2026-04-05')
    },
    '破曉戰士': {
        displayName: '破曉戰士',
        bio: '迎接黎明，為希望而戰。',
        stats: { online: { wins: 210, losses: 190 }, competitive: { wins: 45, losses: 42 } },
        ranked: { tierIdx: 10, stars: 3, points: 0, peakTierIdx: 11, peakSeason: 'S1' }, // 暗2
        activeTitle: '初到新星',
        favoriteChars: ['太陽', '地球', '水果茶'],
        createdAt: new Date('2026-04-02')
    },
    'V3n0m_GG': {
        displayName: 'V3n0m_GG',
        bio: '致命的劇毒，正緩慢滲透你的防線。',
        stats: { online: { wins: 333, losses: 333 }, competitive: { wins: 66, losses: 66 } },
        ranked: { tierIdx: 12, stars: 4, points: 0, peakTierIdx: 13, peakSeason: 'S1' }, // 魘1
        activeTitle: '初到新星',
        favoriteChars: ['冥王星', '多多綠茶', '足球'],
        createdAt: new Date('2026-04-11')
    },
    'TurboDecK': {
        displayName: 'TurboDecK',
        bio: '速度就是力量，你跟得上我的配速嗎？',
        stats: { online: { wins: 820, losses: 800 }, competitive: { wins: 180, losses: 175 } },
        ranked: { tierIdx: 16, stars: 2, points: 0, peakTierIdx: 17, peakSeason: 'S1' }, // 虛2
        activeTitle: '命運篡奪者',
        favoriteChars: ['神速', '重型摩托車', '水星'],
        createdAt: new Date('2026-04-07')
    },
    'Phr0st': {
        displayName: 'Phr0st',
        bio: '絕對零度，凍結你的所有行動。',
        stats: { online: { wins: 156, losses: 142 }, competitive: { wins: 24, losses: 30 } },
        ranked: { tierIdx: 5, stars: 5, points: 0, peakTierIdx: 6, peakSeason: 'S1' }, // 隱3
        activeTitle: '初到新星',
        favoriteChars: ['海王星', '台茶18號', '高爾夫球'],
        createdAt: new Date('2026-04-10')
    },
    'Kairos_99': {
        displayName: 'Kairos_99',
        bio: '時間掌握者，過去與未來都在我手中。',
        stats: { online: { wins: 678, losses: 345 }, competitive: { wins: 156, losses: 89 } },
        ranked: { tierIdx: 17, stars: 5, points: 0, peakTierIdx: 18, peakSeason: 'S1' }, // 虛3
        activeTitle: '不朽者',
        favoriteChars: ['太陽', '木星', '撞球'],
        createdAt: new Date('2026-04-02')
    },
    'NebulaX': {
        displayName: 'NebulaX',
        bio: '星雲深處傳來的呼喚，你聽到了嗎？',
        stats: { online: { wins: 412, losses: 395 }, competitive: { wins: 78, losses: 82 } },
        ranked: { tierIdx: 14, stars: 1, points: 0, peakTierIdx: 15, peakSeason: 'S1' }, // 魘3
        activeTitle: '初到新星',
        favoriteChars: ['天王星', '水果茶', '冥王星'],
        createdAt: new Date('2026-04-05')
    },
    '影速': {
        displayName: '影速',
        bio: '影子比光還快，你相信嗎？',
        stats: { online: { wins: 999, losses: 888 }, competitive: { wins: 333, losses: 222 } },
        ranked: { tierIdx: 18, stars: 0, points: 777, peakTierIdx: 18, peakSeason: 'S1' }, // 永劫之顛
        activeTitle: '絕對獨裁',
        favoriteChars: ['神速', '冥王星', '重型摩托車'],
        createdAt: new Date('2026-04-01')
    },
    '天穹牌師': {
        displayName: '天穹牌師',
        bio: '每一張牌都承載著星辰的力量。',
        stats: { online: { wins: 256, losses: 240 }, competitive: { wins: 48, losses: 52 } },
        ranked: { tierIdx: 11, stars: 4, points: 0, peakTierIdx: 12, peakSeason: 'S1' }, // 暗3
        activeTitle: '初到新星',
        favoriteChars: ['北極星', '太陽', '台茶18號'],
        createdAt: new Date('2026-04-03')
    },
    '絕境逆轉': {
        displayName: '絕境逆轉',
        bio: '不到最後一刻，絕不言棄。',
        stats: { online: { wins: 1234, losses: 1100 }, competitive: { wins: 345, losses: 300 } },
        ranked: { tierIdx: 17, stars: 4, points: 0, peakTierIdx: 18, peakSeason: 'S1' }, // 虛3
        activeTitle: '不朽者',
        favoriteChars: ['太陽', '地球', '火星'],
        createdAt: new Date('2026-04-01')
    },
    '虛空術士': {
        displayName: '虛空術士',
        bio: '虛空並不空，它充滿了可能性。',
        stats: { online: { wins: 188, losses: 177 }, competitive: { wins: 44, losses: 33 } },
        ranked: { tierIdx: 14, stars: 2, points: 0, peakTierIdx: 15, peakSeason: 'S1' }, // 魘3
        activeTitle: '初到新星',
        favoriteChars: ['冥王星', '天王星', '多多綠茶'],
        createdAt: new Date('2026-04-12')
    },
    'ProPLayer2077': {
        displayName: 'ProPLayer2077',
        bio: '我是專業的，至少在 2077 年是。',
        stats: { online: { wins: 2077, losses: 772 }, competitive: { wins: 772, losses: 207 } },
        ranked: { tierIdx: 18, stars: 0, points: 2077, peakTierIdx: 18, peakSeason: 'S1' }, // 永劫之顛
        activeTitle: '極夜加冕者',
        favoriteChars: ['太陽', '足球', '重型摩托車'],
        createdAt: new Date('2026-04-01')
    }
};

window.NPC_PROFILES = NPC_PROFILES;
