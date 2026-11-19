const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('selected second-pass storyboards replace the live scenes with distinct actions', () => {
    const context = vm.createContext({ window: {}, console });
    vm.runInContext(read('js/ui/signatureMotion.js'), context);
    vm.runInContext(read('js/ui/characterSignatureMotion.js'), context);
    const before = context.window.SignatureMotion.scenes.motorcycle.markup({ name: '測試' });
    vm.runInContext(read('js/ui/signatureStoryboardsV2.js'), context);
    const scenes = context.window.SignatureMotion.scenes;
    const keys = ['motorcycle', 'robotParts', 'ball', 'heroSword', 'heroShield', 'wounded',
        'probabilityTheory', 'probabilityHundred', 'planet', 'vehicle', 'replacement', 'revival',
        'machine', 'jet', 'jetGuard', 'win'];
    const markup = keys.map(key => scenes[key].markup({ name: '測試', to: '測試', incoming: '測試', winner: '測試' }));
    assert.equal(new Set(markup).size, keys.length);
    assert.notEqual(markup[0], before);
    for (const key of keys) {
        assert.equal(scenes[key].cues.length, 3, key);
        assert.ok(scenes[key].duration > scenes[key].cues.at(-1)[0], key);
        assert.match(scenes[key].markup({ name: '測試' }), /v2-outcome/, key);
    }
    assert.match(scenes.probabilityHundred.markup({}), /20–40% 機率 \/ 成功時/);
    assert.match(scenes.replacement.markup({ outgoing: '<舊>', incoming: '<新>' }), /&lt;舊&gt;.*&lt;新&gt;/s);
    assert.match(read('game.html'), /signatureStoryboardsV2\.js/);
});

test('third-pass scenes preserve actual results and give each reviewed event new staging', () => {
    const context = vm.createContext({ window: {}, console });
    for (const file of ['js/ui/signatureMotion.js', 'js/ui/characterSignatureMotion.js',
        'js/ui/signatureStoryboardsV2.js']) vm.runInContext(read(file), context);
    const scenes = context.window.SignatureMotion.scenes;
    const keys = ['motorcycle', 'heroSword', 'wounded', 'probabilityTheory', 'probabilityHundred',
        'replacement', 'revival', 'ball', 'planetDeath', 'heroShield'];
    const previous = Object.fromEntries(keys.map(key => [key, scenes[key].markup({ name: '火星' })]));
    vm.runInContext(read('js/ui/signatureStoryboardsV3.js'), context);
    const values = keys.map(key => {
        const markup = scenes[key].markup({ name: '火星', incoming: '魔眼', outgoing: '戰士', count: 5 });
        assert.notEqual(markup, previous[key], key);
        assert.match(markup, /v3-stage/, key);
        assert.match(markup, /v3-result/, key);
        assert.equal(scenes[key].cues.length, 3, key);
        return markup;
    });
    assert.equal(new Set(values).size, keys.length);
    assert.match(scenes.ball.markup({ name: '足球' }), /<path d="M60 33/);
    assert.match(scenes.ball.markup({ name: '籃球' }), /fill="#ec772a"/);
    assert.match(scenes.heroShield.markup({}), /<svg viewBox="0 0 180 220"/);
    assert.match(scenes.planetDeath.markup({ from: '地球', name: '火星' }), /data-planet="火星".*is-target|is-target.*data-planet="火星"/);
    assert.match(scenes.planetDeath.markup({ name: '火星' }), /animateMotion.*273 380/s);
    assert.match(scenes.probabilityHundred.markup({}), /20–40% 機率判定/);
    assert.match(read('game.html'), /signatureStoryboardsV3\.js/);
});

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
        ['愛因斯坦', '布朗運動', 'brownian'], ['阿福', '呼叫增援', 'alfred'],
        ['灰塵', '過敏', 'dustAllergy'], ['撞球', '炸杆', 'snookerBreak']
    ];
    for (const [name, skill, kind] of routes) {
        await motion.combat({ attacker: { name }, skill: { name: skill, effect: { type: 'damage' } } });
        assert.equal(called.at(-1).kind, kind, `${name}/${skill}`);
    }
    const keys = ['motorcycle', 'robotParts', 'ball', 'tea', 'dustAllergy', 'planetDeath', 'basketball', 'photocopy',
        'snooker', 'snookerBreak', 'heroShop', 'heroSword', 'heroShield', 'heroShoes', 'demonCall', 'demonPeck',
        'mady', 'wounded', 'peak', 'probabilityPassive', 'probabilityTheory', 'probabilityZero',
        'probabilityHundred', 'injuryChain', 'machineNest', 'ordinary', 'brownian', 'alfred'];
    assert.equal(new Set(keys.map(k => motion.scenes[k].markup({ name: '測試', from: '來源', chance: 7, count: 1 }))).size, keys.length);
    for (const key of keys) {
        const storyboard = motion.scenes[key];
        assert.equal(storyboard.cues.length, 3, key);
        assert.ok(storyboard.duration > storyboard.cues.at(-1)[0], key);
        assert.match(storyboard.markup({ name: '測試' }), /cs-result|orbit-reveal/, key);
    }
});

test('break shot and planet draw reveal the actual action and planet', () => {
    const context = vm.createContext({ window: {}, console });
    vm.runInContext(read('js/ui/signatureMotion.js'), context);
    vm.runInContext(read('js/ui/characterSignatureMotion.js'), context);
    const scenes = context.window.SignatureMotion.scenes;
    assert.match(scenes.snookerBreak.markup({ name: '撞球' }), /break-rack.*break-impact.*暈眩判定/s);
    const planet = scenes.planetDeath.markup({ from: '地球', name: '火星' });
    assert.match(planet, /orbit-meteor.*--target-x:57%;--target-y:69%/s);
    assert.match(planet, /planet-4 chosen.*火星/s);
    assert.match(planet, /orbit-reveal.*火星/s);
});

test('oolong tea counts successful basic hits and draws on every second hit', async () => {
    const draws = [];
    const context = vm.createContext({
        window: {}, console,
        Animations: { comicAction: async () => {}, drawCards: async cards => draws.push(...cards) },
        getRandomFromCategory: category => category === 'tea' ? { name: '梅子綠茶' } : null,
        createCharacterInstance: data => ({ ...data })
    });
    vm.runInContext(read('js/core/gameState.js') + '\nglobalThis.state = GameState;', context);
    vm.runInContext(read('js/core/battleSystem.js') + '\nglobalThis.battle = BattleSystem;', context);
    const { state, battle } = context;
    const tea = { name: '烏龍茶', hp: 50, maxHp: 50, atk: 10, resources: { hit_count: 0 }, statusEffects: [], passive: { name: '烏龍', effect: { trigger: 'on_hit_basic', count: 2, action: 'summon_category', category: 'tea' } } };
    const attacker = { name: '戰士', hp: 100, atk: 1, statusEffects: [] };
    state.player1 = { battleCard: tea, standbyCards: [] };
    state.player2 = { battleCard: attacker, standbyCards: [] };
    state.addLog = () => {};
    battle.applyDamage = async () => ({ damage: 1 });
    await battle.normalAttack(attacker, tea);
    assert.equal(tea.resources.hit_count, 1);
    assert.equal(draws.length, 0);
    await battle.normalAttack(attacker, tea);
    assert.equal(tea.resources.hit_count, 2);
    assert.equal(draws.length, 1);
    assert.equal(state.player1.standbyCards[0].name, '梅子綠茶');
    battle.applyDamage = async () => ({ damage: 0, dodged: true });
    await battle.normalAttack(attacker, tea);
    assert.equal(tea.resources.hit_count, 2);
    let finalHits = 0;
    battle.applyDamage = async () => { if (++finalHits === 2) tea.hp = 0; return { damage: 1 }; };
    await battle.normalAttack(attacker, tea);
    await battle.normalAttack(attacker, tea);
    assert.equal(draws.length, 2);
});

test('signature scenes leave time for the result and connect the repaired motion', async () => {
    const timers = [];
    const layers = [];
    const context = vm.createContext({
        window: {}, console,
        document: {
            createElement: () => ({ dataset: {}, classList: { add() {} }, setAttribute() {}, remove() { this.removed = true; } }),
            body: { appendChild: layer => layers.push(layer) }
        },
        setTimeout: (fn, delay) => { const timer = { fn, delay }; timers.push(timer); return timer; },
        clearTimeout: () => {}
    });
    vm.runInContext(read('js/ui/signatureMotion.js'), context);
    vm.runInContext(read('js/ui/characterSignatureMotion.js'), context);
    const motion = context.window.SignatureMotion;
    const dust = motion.scenes.dustAllergy.markup({ target: '對手', percent: 4 });
    assert.match(dust, /cs-dust-cloud/);
    assert.match(dust, /對手/);
    assert.match(dust, /每回合 -4% HP/);
    assert.match(motion.scenes.tea.markup({ name: '紅茶' }), /cs-pour.*cs-tea-fill/);
    assert.match(motion.scenes.snooker.markup({}), /cs-cueball/);
    const css = read('css/character-signature-motion.css');
    assert.match(css, /signature-snooker\.phase-2 \.cs-cueball\{left:58%/);
    assert.match(css, /signature-tea\.phase-2 \.cs-pour path\{stroke-dashoffset:0/);
    assert.match(css, /signature-tea\.phase-2 \.cs-tea-fill\{height:67%/);

    const finished = motion.event('dustAllergy', { target: '對手' });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(layers.length, 1);
    assert.deepEqual(timers.map(timer => timer.delay), [330, 1200, 2250, 3150, 3450]);
    timers.sort((a, b) => a.delay - b.delay).forEach(timer => timer.fn());
    await finished;
    assert.equal(layers[0].removed, true);
});

test('redesigned evolution and result scenes reveal their actual outcome', () => {
    const context = vm.createContext({ window: {}, console });
    vm.runInContext(read('js/ui/signatureMotion.js'), context);
    const scenes = context.window.SignatureMotion.scenes;
    const outcomes = [
        ['jobs', { to: '賈伯斯max' }, /rd-macintosh.*rd-ipod.*rd-iphone.*賈伯斯max/],
        ['lich', { to: '骷髏王' }, /rd-black-king.*骷髏王/],
        ['jet', { to: 'K型戰機' }, /rd-k-core.*K型戰機/],
        ['jetGuard', { to: 'L型戰機' }, /rd-decoy.*L型戰機/],
        ['empower', { fatal: true }, /rd-genius-bridge fatal.*命運落空/],
        ['loss', { winner: '魔王' }, /rd-loss-ticket.*敗北.*魔王 勝利/]
    ];
    for (const [kind, data, expected] of outcomes) {
        assert.match(scenes[kind].markup(data), expected, kind);
        assert.equal(scenes[kind].cues.length, 3, kind);
    }
    assert.match(scenes.empower.markup({ fatal: false }), /通過命運/);
    assert.doesNotMatch(scenes.empower.markup({ fatal: false }), /rd-genius-bridge fatal/);
    assert.doesNotMatch(scenes.jobs.markup({}), /rd-keynote|ONE MORE THING/);
    assert.doesNotMatch(scenes.lich.markup({}), /☛/);
    assert.doesNotMatch(scenes.loss.markup({}), /0 : 1/);
    for (const kind of ['jobs', 'lich', 'loss']) {
        assert.ok((scenes[kind].duration - scenes[kind].cues.at(-1)[0]) * 1.5 >= 1800, `${kind} result should stay readable`);
    }
});

test('sleep and copied skill moments use separate readable results', async () => {
    const timers = [];
    const stage = { isConnected: true, classList: { add() {} } };
    const container = { innerHTML: '', querySelector: () => stage };
    const context = vm.createContext({
        window: {}, console,
        document: { addEventListener() {} },
        setTimeout: (fn, delay) => { timers.push({ fn, delay }); return timers.length; }
    });
    vm.runInContext(read('js/ui/animations.js') + '\nglobalThis.motion = Animations;', context);
    const motion = context.motion;
    motion.container = container;
    motion.show = () => {};
    motion.hide = () => {};
    const cases = [
        ['sleep', { applied: true, character: '魔眼' }, /rd-asleep.*魔眼 陷入睡眠/],
        ['sleep', { character: '魔眼' }, /rd-dreaming.*本回合仍在夢中/],
        ['sleep', { awake: true, character: '魔眼' }, /rd-awake.*魔眼 恢復行動/],
        ['copy', { target: '魔王', skill: '啄食', source: '摳屎不累' }, /rd-copy.*魔王.*啄食.*摳屎不累/]
    ];
    for (const [kind, data, expected] of cases) {
        timers.length = 0;
        const finished = motion.characterMoment(kind, data);
        assert.match(container.innerHTML, expected);
        assert.deepEqual(timers.map(timer => timer.delay), [250, 1050, 2200, 3400]);
        timers.forEach(timer => timer.fn());
        await finished;
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
