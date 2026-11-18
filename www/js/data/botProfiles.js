/** Matchmaking NPC identities and their local player profiles. */
const NPC_NAMES = [
    '阿哲', '小宇', '阿凱', '阿豪', '阿翰', '阿倫', '阿傑', '阿翔', '阿廷', '阿勳',
    '小晴', '小涵', '小琳', '小雨', '小雯', '小雅', '小萱', '小潔', '小瑄', '小彤',
    '建宏', '家豪', '冠廷', '柏翰', '俊傑', '宇軒', '志明', '佳穎', '怡君', '佩珊',
    'ray_chen', 'kevinlin', 'mia_0912', 'jackwu_88', 'yuki_lin', 'annie_03', 'leo_chen', 'amyhsu_12', 'brianliu', 'may_chen',
    '鹹酥雞加蒜', '今天想睡覺', '阿嬤叫我打牌', '不想上班的貓', '台北小陳', '台中阿明', '高雄小林', '奶茶半糖去冰', '晚點再睡', '一隻橘貓'
];

const NPC_PROFILES = Object.fromEntries(NPC_NAMES.map((name, index) => {
    const tierIdx = 2 + (index * 7) % 17;
    const onlineWins = 46 + (index * 37) % 570;
    const competitiveWins = 12 + (index * 13) % 180;
    return [name, {
        displayName: name,
        bio: ['有空就打幾場，慢慢爬分。', '喜歡試不同的卡組。', '今天也來打排位了。'][index % 3],
        stats: {
            online: { wins: onlineWins, losses: Math.round(onlineWins * (0.65 + index % 5 * 0.1)) },
            competitive: { wins: competitiveWins, losses: Math.round(competitiveWins * (0.55 + index % 4 * 0.15)) }
        },
        ranked: { tierIdx, stars: tierIdx === 18 ? 0 : index % 6, points: tierIdx === 18 ? 150 + index * 11 : 0, peakTierIdx: Math.min(18, tierIdx + 1), peakSeason: 'S1' },
        activeTitle: '初到新星',
        favoriteChars: [
            ['籃球', '火星', '梅子綠茶'],
            ['地球', '足球', '烏龍茶'],
            ['太陽', '水星', '台茶18號']
        ][index % 3],
        createdAt: new Date(2025, index % 12, 1 + index % 27)
    }];
}));

window.NPC_PROFILES = NPC_PROFILES;
