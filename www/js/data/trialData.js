/**
 * Neon Card - Path of Trials Data
 */
const TRIAL_REWARDS_TABLE = {
    0:   { chars: ['戰士','抽卡員','足球','機率型選手','灰塵','隨便你','巴萬','蝦子','史詩','聖女','水龍頭','教宗','英國紳士','小吉','很亮的魚'], items: { drawNormal: 10, money: 300, landDeed: 10, drawPremium: 1, forgiveToken: 2 }, title: '初到新星' },
    1:   { chars: ['沒錢','廚師','松鼠'], items: { money: 100 } },
    2:   { items: { money: 150 } },
    3:   { chars: ['莫那魯道'], items: { money: 150, landDeed: 30 } },
    4:   { items: { drawNormal: 2, money: 200, landDeed: 5 } },
    5:   { chars: ['海王星','盾哥','越野摩托車','致命','法特'], items: { drawNormal: 1, money: 50 } },
    6:   { items: { money: 50 } },
    7:   { chars: ['阿共','67！'], items: { drawNormal: 3 }, title: '失柳煎啾' },
    8:   { items: { money: 100, landDeed: 10 } },
    9:   { chars: ['內耗怪','厭世','李軍服'], items: { money: 50 } },
    10:  { chars: ['火車','鳳梨','劍盾'], items: { drawSpecial: 1, drawPremium: 2, drawNormal: 3, money: 500, landDeed: 30, passToken: 1, forgiveToken: 2 }, title: '真理學徒' },
    11:  { items: { money: 150 } },
    12:  { chars: ['12了'], items: { money: 100, forgiveToken: 1 }, title: '12了!' },
    13:  { items: { money: 150 } },
    14:  { items: { money: 150 } },
    15:  { items: { drawNormal: 2, money: 70, landDeed: 10, forgiveToken: 1 } },
    16:  { items: { money: 120 } },
    17:  { items: { money: 120 } },
    18:  { items: { money: 120 } },
    19:  { items: { money: 120 } },
    20:  { chars: ['結膜炎'], items: { money: 100, landDeed: 10 } },
    21:  { items: { money: 100 } },
    22:  { items: { money: 100 } },
    23:  { items: { money: 100 } },
    24:  { items: { money: 100 }, title: '萬人斬' },
    25:  { chars: ['亞克-I','抽卡時間','賴韋禎'], items: { money: 500, drawNormal: 1, drawSpecial: 1, forgiveToken: 1 }, title: '染血的權杖', note: '+ 麻將組合包' },
    50:  { chars: ['開發者','數值怪'], items: { drawSpecial: 1 }, title: '偽神' },
    100: { chars: ['作弊者'], items: { drawSpecial: 3, passToken: 1 }, title: '造物主' }
};

const TrialLogic = {
    getTrialData(lv) {
        const tbl = TRIAL_REWARDS_TABLE[lv];
        const data = { chars: [], items: {}, title: null, note: null };
        if (tbl) {
            if (tbl.chars)  data.chars  = [...tbl.chars];
            if (tbl.items)  data.items  = { ...tbl.items };
            if (tbl.title)  data.title  = tbl.title;
            if (tbl.note)   data.note   = tbl.note;
        }
        if (lv > 25 && !TRIAL_REWARDS_TABLE[lv]) {
            data.items.money = 100;
            if (lv % 5 === 0) { data.items.landDeed = 20; data.items.forgiveToken = 1; }
        }
        return data;
    },

    canClaimAny(profile) {
        const curLvl = profile.level || 0;
        const claimed = profile.trialClaims || [];
        
        // Check levels 0-25
        for (let i = 0; i <= 25; i++) {
            if (curLvl >= i && !claimed.includes(i)) return true;
        }
        // Special milestones
        if (curLvl >= 50 && !claimed.includes(50)) return true;
        if (curLvl >= 100 && !claimed.includes(100)) return true;
        
        // Beyond 25
        if (curLvl > 25) {
            for (let i = 26; i <= curLvl; i++) {
                if (!claimed.includes(i)) return true;
            }
        }
        return false;
    }
};
