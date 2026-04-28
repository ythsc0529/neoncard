/**
 * Neon Card - Redeem Codes Data
 */
const REDEEM_CODES = {
    'TK888': {
        name: '免洗手遊',
        rewards: [{ type: 'drawNormal', amt: 3 }],
        desc: '普通抽獎券*3'
    },
    'VIP666': {
        name: '免洗廣告',
        rewards: [{ type: 'drawNormal', amt: 3 }],
        desc: '普通抽獎券*3'
    },
    'VIP777': {
        name: '免洗代號',
        rewards: [{ type: 'drawNormal', amt: 4 }],
        desc: '普通抽獎券*4'
    },
    'HUSONGOD': {
        name: '沒錯，開發者就是神',
        rewards: [{ type: 'drawSpecial', amt: 1 }],
        desc: '特殊抽獎券*1'
    },
    'SECRET': {
        name: '恭喜你發現彩蛋了!',
        rewards: [{ type: 'title', name: '抓到你了!' }],
        desc: '稱號:抓到你了!'
    },
    'CODE': {
        name: '你以為打範例可以找到東西嗎?',
        rewards: [{ type: 'exp', amt: 100 }],
        desc: '經驗*100'
    }
};

const RedeemLogic = {
    validateCode(code) {
        const normalized = code.trim().toUpperCase();
        return REDEEM_CODES[normalized] || null;
    }
};
