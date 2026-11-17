const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function makeAnimations() {
    const timers = [];
    let html = '';
    let stage;
    let now = 0;
    const classes = new Set(['hidden']);
    const makeNode = () => {
        const added = new Set();
        return { added, innerHTML: '', textContent: '', classList: { add: value => added.add(value), remove: value => added.delete(value) }, querySelector: () => makeNode() };
    };
    const container = {
        classList: { add: value => classes.add(value), remove: value => classes.delete(value) },
        get innerHTML() { return html; },
        set innerHTML(value) {
            html = value;
            if (value) {
                stage = makeNode();
                stage.isConnected = true;
                stage.nodes = new Map();
                stage.querySelector = selector => {
                    if (!stage.nodes.has(selector)) stage.nodes.set(selector, makeNode());
                    return stage.nodes.get(selector);
                };
                stage.querySelectorAll = () => [stage.querySelector('.coin-front-mark'), stage.querySelector('.coin-back-mark')];
            }
            else if (stage) stage.isConnected = false;
        },
        querySelector: () => stage
    };
    const document = { addEventListener() {}, getElementById: () => container };
    const context = {
        document, window: { GameRandom: () => .25 },
        GameState: { player1: { name: '甲' }, player2: { name: '乙' } },
        getRarityClass: () => 'rarity-common', getRarityName: () => '普通',
        setTimeout: (callback, delay) => timers.push({ callback, delay: now + delay })
    };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/ui/animations.js'), 'utf8') + '\nglobalThis.subject = Animations;', context);
    const animations = context.subject;
    animations.container = container;
    function runUntil(time) {
        while (timers.some(timer => timer.delay <= time)) {
            timers.sort((a, b) => a.delay - b.delay);
            const timer = timers.shift();
            now = timer.delay;
            timer.callback();
        }
        now = time;
    }
    function flush() { runUntil(Infinity); }
    return { animations, container, classes, timers, runUntil, flush, get stage() { return stage; } };
}

test('draw reveals every character and closes without a click', async () => {
    const harness = makeAnimations();
    const { animations, container, classes, runUntil, flush } = harness;
    const finished = animations.drawCards([{ name: '戰士', rarity: 'COMMON', hp: 100, atk: 20 }, { name: '醫生', rarity: 'COMMON', hp: 90, atk: 5 }]);
    assert.match(container.innerHTML, /戰士/);
    assert.match(container.innerHTML, /醫生/);
    assert.equal(container.onclick, undefined);
    runUntil(949);
    assert.equal(harness.stage.added.has('is-opening'), true);
    assert.equal(harness.stage.querySelector('.manga-draw-focus').innerHTML, '');
    runUntil(950);
    assert.match(harness.stage.querySelector('.manga-draw-focus').innerHTML, /戰士/);
    runUntil(1800);
    assert.match(harness.stage.querySelector('.manga-draw-focus').innerHTML, /醫生/);
    runUntil(2600);
    assert.equal(harness.stage.added.has('is-revealed'), true);
    flush();
    await finished;
    assert.equal(classes.has('hidden'), true);
    assert.equal(container.innerHTML, '');
});

test('coin result is fixed before the panel closes', async () => {
    const harness = makeAnimations();
    const { animations, container, timers, runUntil, flush } = harness;
    const finished = animations.coinFlip(2);
    assert.match(container.innerHTML, /乙/);
    assert.match(container.innerHTML, /先手出擊/);
    assert.match(container.innerHTML, /manga-coin-front manga-coin-mark">\?/);
    assert.equal(timers.at(-1).delay, 4300);
    runUntil(350);
    assert.equal(harness.stage.added.has('is-tossing'), true);
    runUntil(2550);
    assert.equal(harness.stage.added.has('is-revealed'), true);
    flush();
    assert.equal(await finished, 2);
});

test('replacement panel identifies both cards that changed', async () => {
    const { animations, container, flush } = makeAnimations();
    const finished = animations.characterMoment('replace', {
        changes: [
            { player: '甲', from: '戰士', to: '平凡' },
            { player: '乙', from: '醫生', to: '平凡' }
        ]
    });
    assert.match(container.innerHTML, /戰士/);
    assert.match(container.innerHTML, /醫生/);
    assert.match(container.innerHTML, /平凡/);
    flush();
    await finished;
    assert.equal(container.innerHTML, '');
});
