// ========== NEON CARD GAME - CHARACTER DATABASE ==========
// All 195+ characters from 角色.html

const RARITY = {
    COMMON: { name: '一般', color: '#ffffff', probability: 40 },
    RARE: { name: '稀有', color: '#00ffff', probability: 25 },
    EPIC: { name: '史詩', color: '#9900ff', probability: 18 },
    LEGENDARY: { name: '傳說', color: '#ffd700', probability: 12 },
    MYTHIC: { name: '神話', color: '#ff0040', probability: 5 },
    SPECIAL: { name: '特殊', color: '#00ff88', probability: 0 }
};

// Character database - Part 1 (ID 1-50)
const CHARACTERS_PART1 = [
    { id: 1, name: '戰士', rarity: 'COMMON', hp: 100, atk: 20, skills: [{ name: '砍一刀', desc: '造成30傷', cd: 2, effect: { type: 'damage', value: 30 } }], passive: null },
    { id: 2, name: '魔眼', rarity: 'MYTHIC', hp: 300, atk: 50, skills: [{ name: '洞察', desc: '封禁對方技能1回合', cd: 3, effect: { type: 'silence', turns: 1 } }, { name: '弱點破解', desc: '對敵方造成敵方最大血量30%傷害', cd: 5, effect: { type: 'damage_percent_max_hp', value: 30 } }, { name: '護身', desc: '對己身加上可抵擋1次任意傷害', cd: 3, effect: { type: 'immunity', hits: 1 } }], passive: { name: '燃盡', desc: '死亡抽一張', effect: { trigger: 'on_death', action: 'draw', count: 1 } } },
    { id: 3, name: '伊魯帕恩', rarity: 'LEGENDARY', hp: 400, atk: 30, skills: [{ name: '堅韌', desc: '三回合內受到的傷害減少25%', cd: 5, effect: { type: 'damage_reduction', value: 25, turns: 3 } }, { name: '血祭', desc: '對對手造成我已損失生命值*90%的傷害', cd: 99, effect: { type: 'damage_lost_hp_percent', value: 90 } }], passive: { name: '同歸於盡', desc: '死亡時對對手造成30點傷害', effect: { trigger: 'on_death', action: 'damage', value: 30 } } },
    { id: 4, name: '火車', rarity: 'EPIC', hp: 220, atk: 10, skills: [{ name: '自殘', desc: '使敵方血量損失敵方普攻傷害*2', cd: 2, effect: { type: 'damage_enemy_atk_mult', mult: 2 } }, { name: '死亡骰子', desc: '擲骰子擲出3、6則可對敵方發動目前血量一半傷害', cd: 5, effect: { type: 'dice_damage', success: [3, 6], damage_type: 'current_hp_percent', value: 50 } }, { name: '火車便當', desc: '增加50點的護盾', cd: 3, effect: { type: 'shield', value: 50 } }], passive: null },
    { id: 5, name: '卡德', rarity: 'RARE', hp: 50, atk: 10, skills: [{ name: '抽卡', desc: '抽三張牌', cd: 5, effect: { type: 'draw', count: 3 } }], passive: null },
    { id: 6, name: '赫特', rarity: 'RARE', hp: 200, atk: 15, skills: [{ name: '狙擊', desc: '造成50傷害', cd: 3, effect: { type: 'damage', value: 50 } }, { name: '隱蔽', desc: '增加100護盾', cd: 4, effect: { type: 'shield', value: 100 } }], passive: null },
    { id: 7, name: '鯊魚鞋子', rarity: 'LEGENDARY', hp: 200, atk: 40, skills: [{ name: '後期', desc: '造成2×回合數的傷害', cd: 4, effect: { type: 'damage_turn_mult', mult: 2 } }, { name: '啃咬', desc: '造成兩段普攻傷害', cd: 4, effect: { type: 'multi_attack', hits: 2 } }], passive: null },
    { id: 8, name: '小混混', rarity: 'COMMON', hp: 150, atk: 25, skills: [{ name: '叫大哥', desc: '加10護盾', cd: 2, effect: { type: 'shield', value: 10 } }], passive: null },
    { id: 9, name: '小圓盾', rarity: 'COMMON', hp: 250, atk: 5, skills: [{ name: '硬', desc: '減少下回合受到的傷害5', cd: 2, effect: { type: 'damage_reduction_flat', value: 5, turns: 1 } }], passive: null },
    { id: 10, name: '玻璃心', rarity: 'COMMON', hp: 50, atk: 1, skills: [{ name: '大走心', desc: '發出50攻擊並對自己造成50傷害', cd: 1, effect: { type: 'damage_self_damage', damage: 50, self_damage: 50 } }], passive: null },
    { id: 11, name: '醫生', rarity: 'COMMON', hp: 80, atk: 10, skills: [{ name: '自我治療', desc: '恢復20點生命值', cd: 3, effect: { type: 'heal', value: 20 } }], passive: null },
    { id: 12, name: '安拉奇', rarity: 'COMMON', hp: 10, atk: 10, skills: [{ name: '運氣不好', desc: '無意義', cd: 0, effect: { type: 'none' } }], passive: null },
    { id: 13, name: '迪斯查', rarity: 'EPIC', hp: 50, atk: 50, skills: [{ name: '免疫', desc: '免疫兩次傷害', cd: 10, effect: { type: 'immunity', hits: 2 } }], passive: null },
    { id: 14, name: '愛因斯坦', rarity: 'EPIC', hp: 314, atk: 30, skills: [{ name: '質能等價', desc: '可對敵方造成對方普攻傷害', cd: 3, effect: { type: 'damage_enemy_atk' } }, { name: '布朗運動', desc: '隨機造成1-100傷害', cd: 3, effect: { type: 'damage_random', min: 1, max: 100 } }], passive: null },
    { id: 15, name: '僕從', rarity: 'COMMON', hp: 50, atk: 10, skills: [{ name: '下等人', desc: '沒啥用', cd: 0, effect: { type: 'none' } }], passive: null },
    { id: 16, name: '仙人掌象', rarity: 'RARE', hp: 200, atk: 20, skills: [{ name: 'lilili larerla', desc: '造成40傷害', cd: 2, effect: { type: 'damage', value: 40 } }, { name: '仙人掌', desc: '下回合敵方傷害反彈一半回去', cd: 3, effect: { type: 'reflect', value: 50, turns: 1 } }], passive: null },
    { id: 17, name: '瑞賭斯', rarity: 'COMMON', hp: 100, atk: 10, skills: [{ name: '竊取', desc: '減少對手攻擊20，持續兩回合', cd: 5, effect: { type: 'debuff_atk', value: 20, turns: 2 } }], passive: null },
    { id: 18, name: '隨便你', rarity: 'RARE', hp: 400, atk: 5, skills: [{ name: '隨便你', desc: '增加150護盾', cd: 3, effect: { type: 'shield', value: 150 } }], passive: null },
    { id: 19, name: '扛壩子', rarity: 'LEGENDARY', hp: 300, atk: 50, skills: [{ name: '還不能倒下', desc: '恢復已損失生命值50%', cd: 5, effect: { type: 'heal_lost_hp_percent', value: 50 } }, { name: '蓄力', desc: '下次攻擊攻擊力增加50%', cd: 5, effect: { type: 'buff_next_attack', value: 50 } }, { name: '破滅', desc: '對對手造成(回合)傷害', cd: 4, effect: { type: 'damage_turn_mult', mult: 1 } }], passive: null },
    { id: 20, name: '團', rarity: 'COMMON', hp: 100, atk: 10, skills: [{ name: '優越', desc: '丟刀子對敵方造成30傷害', cd: 2, effect: { type: 'damage', value: 30 } }], passive: null },
    { id: 21, name: '夏天與你', rarity: 'MYTHIC', hp: 500, atk: 35, skills: [{ name: '太難聽', desc: '對方不能發動技能2回合', cd: 4, effect: { type: 'silence', turns: 2 } }, { name: 'ace', desc: '下回合攻擊力×3', cd: 3, effect: { type: 'buff_atk_mult', mult: 3, turns: 1 } }, { name: '有盈利', desc: '恢復最大生命值10%', cd: 4, effect: { type: 'heal_max_hp_percent', value: 10 } }], passive: { name: '意志傳承', desc: '死亡之後抽三張牌', effect: { trigger: 'on_death', action: 'draw', count: 3 } } },
    { id: 22, name: '蘇賽德', rarity: 'COMMON', hp: 30, atk: 1, skills: [{ name: '全員玉碎', desc: '造成50攻擊並使自己死亡', cd: 2, effect: { type: 'damage_suicide', damage: 50 } }], passive: null },
    { id: 23, name: '抽卡員', rarity: 'COMMON', hp: 100, atk: 5, skills: [{ name: '抽卡', desc: '抽一張牌', cd: 3, effect: { type: 'draw', count: 1 } }], passive: null },
    { id: 24, name: '砲灰', rarity: 'COMMON', hp: 100, atk: 20, skills: [{ name: '扛一下', desc: '沒有意義', cd: 0, effect: { type: 'none' } }], passive: null },
    { id: 25, name: '護理師', rarity: 'RARE', hp: 200, atk: 20, skills: [{ name: '自我恢復', desc: '恢復50點生命值', cd: 4, effect: { type: 'heal', value: 50 } }, { name: '砍一刀', desc: '造成30點傷害', cd: 1, effect: { type: 'damage', value: 30 } }], passive: null },
    { id: 26, name: '超級坦克', rarity: 'MYTHIC', hp: 700, atk: 5, skills: [{ name: '裝甲', desc: '增加50血量上限', cd: 1, effect: { type: 'buff_max_hp', value: 50 } }, { name: '致命一擊', desc: '造成50%最大生命值傷害', cd: 8, effect: { type: 'damage_self_max_hp_percent', value: 50 } }], passive: null },
    { id: 27, name: '法師', rarity: 'COMMON', hp: 100, atk: 10, skills: [{ name: '毒', desc: '使對方中毒，傷害10，持續兩回合', cd: 4, effect: { type: 'poison', damage: 10, turns: 2 } }], passive: null },
    { id: 28, name: '法特', rarity: 'MYTHIC', hp: 500, atk: 60, skills: [{ name: '提米我肚子餓了', desc: '炸個屁傷害100', cd: 8, effect: { type: 'damage', value: 100 } }], passive: null },
    { id: 29, name: '結膜炎', rarity: 'LEGENDARY', hp: 250, atk: 50, skills: [{ name: '傳染結膜炎', desc: '造成20傷害持續兩回合', cd: 3, effect: { type: 'dot', damage: 20, turns: 2 } }], passive: null },
    { id: 30, name: '致命', rarity: 'LEGENDARY', hp: 120, atk: 60, skills: [{ name: '傷敵一千自損八百', desc: '造成100傷害己身損血20', cd: 3, effect: { type: 'damage_self_damage', damage: 100, self_damage: 20 } }], passive: null },
    { id: 31, name: '多舉', rarity: 'COMMON', hp: 1, atk: 5, skills: [{ name: '好身法', desc: '有99%閃避下一次對手的攻擊', cd: 0, effect: { type: 'dodge', chance: 99, hits: 1 } }], passive: null },
    { id: 32, name: '暗夜騎士', rarity: 'RARE', hp: 150, atk: { min: 1, max: 75 }, skills: [{ name: '數值', desc: '有50%增加2倍傷害', cd: 2, effect: { type: 'damage_chance_mult', chance: 50, mult: 2 } }, { name: '粒子護盾', desc: '增加10-100護盾', cd: 4, effect: { type: 'shield_random', min: 10, max: 100 } }, { name: '概率學', desc: '25%機率使對方損血一半', cd: 3, effect: { type: 'damage_chance_half_hp', chance: 25 } }], passive: { name: '運氣', desc: '每次攻擊都是1-75隨機', effect: { trigger: 'on_attack', action: 'random_atk', min: 1, max: 75 } } },
    { id: 33, name: '修修', rarity: 'COMMON', hp: 100, atk: 10, skills: [{ name: '後期pro', desc: '造成(回合數×當前血量×10%)的傷害', cd: 0, effect: { type: 'damage_turn_hp_percent', percent: 10 } }], passive: null },
    { id: 34, name: '暴擊騎士', rarity: 'MYTHIC', hp: 300, atk: 120, skills: [{ name: '爆擊', desc: '造成2.5倍攻擊力的傷害', cd: 3, effect: { type: 'damage_atk_mult', mult: 2.5 } }, { name: '處刑', desc: '對手血量低於30%時，直接斬殺', cd: 1, effect: { type: 'execute', threshold: 30 } }, { name: '吸血', desc: '下一次攻擊恢復造成傷害×60%的血量', cd: 3, effect: { type: 'lifesteal_next', value: 60 } }], passive: { name: '詛咒', desc: '死亡後對手角色扣除50點最大生命值', effect: { trigger: 'on_death', action: 'debuff_max_hp', value: 50 } } },
    { id: 35, name: '廚師', rarity: 'RARE', hp: 200, atk: 25, skills: [{ name: '吃我的食物啦', desc: '造成(食物×攻擊力)點傷害', cd: 3, effect: { type: 'damage_resource_mult', resource: 'food' } }, { name: '煮', desc: '煮一個食物', cd: 0, effect: { type: 'add_resource', resource: 'food', value: 1 } }], passive: null, resources: { food: 0 } },
    { id: 36, name: '史詩抽卡員', rarity: 'EPIC', hp: 180, atk: 20, skills: [{ name: '史詩級抽牌', desc: '抽兩張牌', cd: 99, effect: { type: 'draw', count: 2 } }, { name: '再來一次', desc: '抽兩張牌', cd: 5, effect: { type: 'draw', count: 2 } }], passive: null },
    { id: 37, name: '無意義', rarity: 'COMMON', hp: 99, atk: 1, skills: [], passive: null },
    { id: 38, name: '瘋狗騎士', rarity: 'EPIC', hp: 400, atk: 20, skills: [{ name: '還沒倒下', desc: '恢復25%最大生命值', cd: 3, effect: { type: 'heal_max_hp_percent', value: 25 } }, { name: '絕殺', desc: '造成最大生命值×60%點傷害', cd: 8, effect: { type: 'damage_self_max_hp_percent', value: 60 } }], passive: { name: '疊加', desc: '每受到一次攻擊，增加5點最大生命值', effect: { trigger: 'on_hit', action: 'buff_max_hp', value: 5 } } },
    { id: 39, name: '花店老闆', rarity: 'LEGENDARY', hp: 300, atk: 20, skills: [{ name: '丟花', desc: '每回合加30護盾持續三回合', cd: 5, effect: { type: 'shield_dot', value: 30, turns: 3 } }, { name: '劍弗', desc: '砍一下50傷害', cd: 2, effect: { type: 'damage', value: 50 } }, { name: '弗花', desc: '下次敵方攻擊40%機率免傷並加30護盾', cd: 5, effect: { type: 'dodge_shield', chance: 40, shield: 30 } }], passive: null },
    { id: 40, name: '冰淇淋', rarity: 'EPIC', hp: 150, atk: 1, skills: [{ name: '美食反彈', desc: '下次受到的傷害，反彈200%給對手', cd: 5, effect: { type: 'reflect', value: 200, hits: 1 } }, { name: '破釜沉舟', desc: '將生命值扣為1，扣除的生命值對對手造成60%傷害', cd: 99, effect: { type: 'sacrifice_damage', percent: 60 } }], passive: { name: '起死回生', desc: '死亡之後有(50-死亡次數×5)的機會復活', effect: { trigger: 'on_death', action: 'revive_chance', base: 50, decay: 5 } } },
    { id: 41, name: '小吉', rarity: 'MYTHIC', hp: 500, atk: 15, skills: [{ name: '基礎攻擊', desc: '攻擊力+10', cd: 1, effect: { type: 'buff_atk', value: 10 } }, { name: '緊急恢復', desc: '血量恢復已損失生命值50%', cd: 5, effect: { type: 'heal_lost_hp_percent', value: 50 } }, { name: '連續攻擊機率上升', desc: '連續攻擊機率上升5%', cd: 2, effect: { type: 'buff_resource', resource: 'combo_chance', value: 5 } }], passive: { name: '連擊', desc: '有(60+連續攻擊上升機率)%的機率再攻擊一次(上限99%)', effect: { trigger: 'on_attack', action: 'extra_attack_chance', base: 60, resource: 'combo_chance', max: 99 } }, resources: { combo_chance: 0 } },
    { id: 42, name: '籃球', rarity: 'COMMON', hp: 1, atk: 1, skills: [{ name: '投籃', desc: '有5%的機會將庫裡面加入卡組', cd: 0, effect: { type: 'summon_chance', chance: 5, target: '庫裡面' } }], passive: { name: '滑', desc: '20%的機率迴避所有傷害', effect: { trigger: 'on_hit', action: 'dodge_chance', chance: 20 } } },
    { id: 43, name: '有斯勒斯', rarity: 'EPIC', hp: 100, atk: 50, skills: [{ name: '羈絆', desc: '將法特加入手牌', cd: 99, effect: { type: 'summon', target: '法特' } }], passive: null },
    { id: 44, name: '羈絆', rarity: 'COMMON', hp: 1, atk: 1, skills: [{ name: '我們的羈絆', desc: '抽一張牌', cd: 3, effect: { type: 'draw', count: 1 } }], passive: null },
    { id: 45, name: '嘻嘻', rarity: 'COMMON', hp: 50, atk: 15, skills: [{ name: '嘻嘻', desc: '減少5點攻擊力，血量增加50', cd: 2, effect: { type: 'trade_atk_hp', atk_loss: 5, hp_gain: 50 } }, { name: '很嘻嘻', desc: '減少20點生命，增加30點攻擊', cd: 5, effect: { type: 'trade_hp_atk', hp_loss: 20, atk_gain: 30 } }], passive: null },
    { id: 46, name: '不嘻嘻', rarity: 'COMMON', hp: 5, atk: 15, skills: [{ name: '嘻嘻不嘻嘻', desc: '召喚3隻嘻嘻到手牌中', cd: 5, effect: { type: 'summon_multiple', target: '嘻嘻', count: 3 } }, { name: '自爆', desc: '自殺並造成35攻擊', cd: 2, effect: { type: 'damage_suicide', damage: 35 } }], passive: null },
    { id: 47, name: '黑爾', rarity: 'LEGENDARY', hp: 350, atk: 20, skills: [{ name: '再撐一下', desc: '血量恢復最大生命值的20%', cd: 6, effect: { type: 'heal_max_hp_percent', value: 20 } }, { name: '身法', desc: '有99%迴避下一次攻擊', cd: 2, effect: { type: 'dodge', chance: 99, hits: 1 } }, { name: '斬殺', desc: '造成(回合數×1.1)點攻擊', cd: 3, effect: { type: 'damage_turn_mult', mult: 1.1 } }], passive: null },
    { id: 48, name: '足球', rarity: 'COMMON', hp: 30, atk: 5, skills: [{ name: '踢足球', desc: '對敵方造成永久持續直到死亡，每回合持續傷害5，不可累加', cd: 3, effect: { type: 'dot_permanent', damage: 5, stackable: false } }], passive: null },
    { id: 49, name: '神益州', rarity: 'COMMON', hp: 100, atk: 10, skills: [{ name: '晚安', desc: '使敵人睡眠，但可有50%機率恢復狀態', cd: 0, effect: { type: 'sleep' } }], passive: null },
    { id: 50, name: '城之內', rarity: 'RARE', hp: 30, atk: 20, skills: [{ name: '下巴', desc: '造成30點傷害', cd: 1, effect: { type: 'damage', value: 30 } }], passive: null }
];

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RARITY, CHARACTERS_PART1 };
}
