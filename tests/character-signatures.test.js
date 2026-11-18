const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('every requested character action owns a distinct storyboard and routes to it', async () => {
    const context = vm.createContext({ window: {}, console });
    vm.runInContext(read('js/ui/signatureMotion.js'), context);
    vm.runInContext(read('js/ui/characterSignatureMotion.js'), context);
    const motion = context.window.SignatureMotion;
    const called = [];
    motion.preview = (kind, data) => { called.push({ kind, data }); return Promise.resolve(); };
    const routes = [
        ['堯冥', '打籃球', 'basketball'], ['勇者', '鍛鍊', 'heroSword'], ['勇者', '防禦', 'heroShield'],
        ['勇者', '跑步', 'heroShoes'], ['麥狄', '麥狄時刻', 'mady'], ['巔峰', '全盛時期', 'peak'],
        ['概率學', '概率學概論', 'probabilityTheory'], ['概率學', '概率為0', 'probabilityZero'],
        ['概率學', '概率為100', 'probabilityHundred'],
        ['愛因斯坦', '布朗運動', 'brownian'], ['阿福', '呼叫增援', 'alfred']
    ];
    for (const [name, skill, kind] of routes) {
        await motion.combat({ attacker: { name }, skill: { name: skill, effect: { type: 'damage' } } });
        assert.equal(called.at(-1).kind, kind, `${name}/${skill}`);
    }
    const keys = ['motorcycle', 'robotParts', 'ball', 'tea', 'planetDeath', 'basketball', 'photocopy',
        'snooker', 'heroShop', 'heroSword', 'heroShield', 'heroShoes', 'demonCall', 'demonPeck',
        'mady', 'wounded', 'peak', 'probabilityPassive', 'probabilityTheory', 'probabilityZero',
        'probabilityHundred', 'injuryChain', 'machineNest', 'ordinary', 'brownian', 'alfred'];
    assert.equal(new Set(keys.map(k => motion.scenes[k].markup({ name: '測試', from: '來源', chance: 7, count: 1 }))).size, keys.length);
    for (const key of keys) {
        const storyboard = motion.scenes[key];
        assert.equal(storyboard.cues.length, 3, key);
        assert.ok(storyboard.duration > storyboard.cues.at(-1)[0], key);
        assert.match(storyboard.markup({ name: '測試' }), /cs-result/, key);
    }
});

test('death removes only the fallen hero or demon owner cards', async () => {
    const context = vm.createContext({ window: {}, console });
    vm.runInContext(read('js/core/gameState.js') + '\nglobalThis.state = GameState;', context);
    const state = context.state;
    state.addLog = () => {};
    state.processPassive = async () => {};
    state.checkRevive = async () => false;
    state.didSwapOrDie = { player1: false, player2: false };
    const card = name => ({ name, hp: 0, deathCount: 0 });
    const child = (name, master) => ({ name, passive: { effect: { master } } });
    const hero = card('勇者');
    state.player1 = { battleCard: hero, standbyCards: [child('劍', '勇者'), child('盾', '勇者'), child('鞋', '勇者'), child('魔穢', '魔王'), { name: '普通牌' }] };
    await state.handleDeath('player1');
    assert.deepEqual(state.player1.standbyCards.map(c => c.name), ['魔穢', '普通牌']);
    const demon = card('魔王');
    state.player2 = { battleCard: demon, standbyCards: [child('魔穢', '魔王'), child('劍', '勇者')] };
    await state.handleDeath('player2');
    assert.deepEqual(state.player2.standbyCards.map(c => c.name), ['劍']);
});

test('a successful revival keeps owner cards', async () => {
    const context = vm.createContext({ window: {}, console });
    vm.runInContext(read('js/core/gameState.js') + '\nglobalThis.state = GameState;', context);
    const state = context.state;
    const hero = { name: '勇者', hp: 0, deathCount: 0 };
    state.player1 = { battleCard: hero, standbyCards: [{ name: '劍', passive: { effect: { master: '勇者' } } }] };
    state.checkRevive = async card => { card.hp = 100; return true; };
    assert.equal(await state.handleDeath('player1'), false);
    assert.equal(state.player1.standbyCards.length, 1);
});

test('three robot types merge when one is on the field', async () => {
    const context = vm.createContext({ window: {}, console });
    vm.runInContext(read('js/core/gameState.js') + '\nglobalThis.state = GameState;', context);
    const state = context.state;
    const card = { name: '機器人I', passive: { effect: { trigger: 'passive', action: 'robot_merge', requires: ['機器人I', '機器人II', '機器人III'], target: '機器之神' } } };
    state.player1 = { battleCard: card, standbyCards: [{ name: '機器人II' }, { name: '普通牌' }, { name: '機器人III' }] };
    state.player2 = { battleCard: null, standbyCards: [] };
    const evolutions = [];
    context.BattleSystem = { evolveCharacter: async (source, target) => evolutions.push([source.name, target]) };
    await state.processPassive(card, 'passive');
    assert.deepEqual(evolutions, [['機器人I', '機器之神']]);
    assert.deepEqual(state.player1.standbyCards.map(c => c.name), ['普通牌']);
});

test('神益州 sleep reports both a continued dream and waking on the affected turns', async () => {
    const moments = [];
    let roll = .9;
    const context = vm.createContext({ window: { GameRandom: () => roll }, console, Animations: { characterMoment: async (kind, data) => moments.push([kind, data.awake === true]) } });
    vm.runInContext(read('js/core/gameState.js') + '\nglobalThis.state = GameState;', context);
    const state = context.state;
    const card = { name: '目標', hp: 100, statusEffects: [{ type: 'sleep', source: '神益州' }], cooldowns: [] };
    state.player1 = { name: '玩家', battleCard: card, standbyCards: [], skipTurns: 0 };
    state.currentPlayer = 1;
    state.getCurrentPlayer = () => state.player1;
    state.addLog = () => {};
    let skipped = 0;
    state.endTurn = async () => { skipped++; };
    state.processPassive = async () => {};
    state.processTurnIntervalPassives = async () => {};
    await state.processStartOfTurn();
    assert.equal(skipped, 1);
    assert.deepEqual(moments, [['sleep', false]]);
    roll = .1;
    await state.processStartOfTurn();
    assert.equal(card.statusEffects.length, 0);
    assert.deepEqual(moments, [['sleep', false], ['sleep', true]]);
});

test('巔峰 death can summon 殘骸 and play the injury chain', async () => {
    const events = [];
    const context = vm.createContext({
        window: { GameRandom: () => 0, SignatureMotion: { event: async (...args) => events.push(args) } },
        Animations: { drawCards: async () => {} },
        getCharacterByName: name => ({ name, hp: 40, atk: 5 }),
        createCharacterInstance: data => ({ ...data }), console
    });
    vm.runInContext(read('js/core/gameState.js') + '\nglobalThis.state = GameState;', context);
    const state = context.state;
    state.addLog = () => {};
    const peak = { name: '巔峰', passive: { name: '到此為止了嗎', effect: { trigger: 'on_death', action: 'summon_chance', chance: 10, target: '殘骸' } } };
    state.player1 = { battleCard: peak, standbyCards: [] };
    state.player2 = { battleCard: null, standbyCards: [] };
    await state.processPassive(peak, 'on_death');
    assert.equal(state.player1.standbyCards[0].name, '殘骸');
    assert.equal(events[0][0], 'injuryChain');
});

test('opening an opponent profile leaves the battle document mounted', () => {
    const game = read('game.html');
    const code = game.slice(game.indexOf('function openBattleProfile(uid) {'), game.indexOf('function viewMyProfile() {'));
    const added = [];
    const makeElement = () => ({
        children: [], attrs: {}, listeners: {},
        setAttribute(key, value) { this.attrs[key] = value; },
        addEventListener(key, fn) { this.listeners[key] = fn; },
        append(...children) { this.children.push(...children); },
        remove() { this.removed = true; },
        focus() { this.focused = true; }
    });
    const document = { createElement: makeElement, addEventListener() {}, removeEventListener() {}, body: { appendChild: el => added.push(el) } };
    const battle = { turnCount: 8 };
    const context = vm.createContext({ document, GameState: battle });
    vm.runInContext(code + '\nglobalThis.openProfile = openBattleProfile;', context);
    context.openProfile('opponent/1');
    assert.equal(added.length, 1);
    assert.equal(added[0].children[1].src, 'player.html?uid=opponent%2F1');
    assert.equal(context.GameState, battle);
    added[0].children[0].listeners.click();
    assert.equal(added[0].removed, true);
    assert.equal(context.GameState.turnCount, 8);
});
