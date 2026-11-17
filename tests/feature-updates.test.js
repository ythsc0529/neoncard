const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('anxious opponent grants the intended 50% dodge without undefined', async () => {
    const context = vm.createContext({ window: {}, console });
    vm.runInContext(read('js/core/gameState.js') + '\nglobalThis.state = GameState;', context);
    const card = { name: '焦慮', resources: {}, passive: { name: '抵抗焦慮', effect: { trigger: 'passive', action: 'dodge_if_enemy_anxious', value: 50 } } };
    context.state.getOpponent = () => ({ battleCard: { statusEffects: [{ type: 'anxiety' }] } });
    await context.state.processPassive(card, 'passive');
    assert.equal(card.resources.dodge, 50);
    context.state.getOpponent = () => ({ battleCard: { statusEffects: [] } });
    await context.state.processPassive(card, 'passive');
    assert.equal(card.resources.dodge, 0);
});

test('guaranteed roll uses its own animation and still advances the shared RNG', async () => {
    let rngCalls = 0, finish;
    const child = { textContent: '' };
    const container = { innerHTML: '', classList: { add() {}, remove() {} }, querySelector: () => child };
    const context = vm.createContext({ window: { GameRandom: () => { rngCalls++; return .99; } }, document: { addEventListener() {} }, setTimeout: fn => { finish = fn; } });
    vm.runInContext(read('js/ui/animations.js') + '\nglobalThis.animations = Animations;', context);
    context.animations.container = container;
    const result = context.animations.probabilityRoll(100, '必然判定');
    assert.match(container.innerHTML, /ink-guaranteed/);
    assert.doesNotMatch(container.innerHTML, /comic-prob-stage/);
    assert.equal(rngCalls, 1);
    assert.equal(child.textContent, '必然判定');
    finish();
    assert.equal(await result, true);
});

test('match selection timer auto picks after 20 seconds and stops after a manual pick', () => {
    const game = read('game.html');
    const code = game.slice(game.indexOf('let initialChoiceTimer = null;'), game.indexOf('let isShowingOpponent = false;'));
    let now = 0, next = 0;
    const intervals = new Map();
    const clocks = { initialChoiceClock: { hidden: true }, replacementChoiceClock: { hidden: true } };
    const context = vm.createContext({
        GameState: { mode: 'online' }, window: { isDisguisedBot: () => false },
        document: { getElementById: id => clocks[id] },
        Date: { now: () => now },
        setInterval: callback => { intervals.set(++next, callback); return next; },
        clearInterval: id => intervals.delete(id)
    });
    vm.runInContext(code + '\nglobalThis.timer = { startChoiceTimer, stopChoiceTimer };', context);
    let picks = 0;
    context.timer.startChoiceTimer('initial', () => picks++);
    assert.match(clocks.initialChoiceClock.textContent, /20 秒/);
    now = 20000;
    for (const tick of [...intervals.values()]) tick();
    assert.equal(picks, 1);
    assert.equal(clocks.initialChoiceClock.hidden, true);
    context.timer.startChoiceTimer('replacement', () => picks++);
    context.timer.stopChoiceTimer('replacement');
    now = 40000;
    for (const tick of [...intervals.values()]) tick();
    assert.equal(picks, 1);
});
