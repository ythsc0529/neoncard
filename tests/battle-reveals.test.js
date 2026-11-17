const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function makeAnimations() {
    const timers = [];
    let html = '';
    let stage;
    const classes = new Set(['hidden']);
    const container = {
        classList: { add: value => classes.add(value), remove: value => classes.delete(value) },
        get innerHTML() { return html; },
        set innerHTML(value) {
            html = value;
            if (value) stage = {
                isConnected: true,
                classList: { add: value => { stage.added.push(value); } },
                added: [],
                querySelector: () => ({ classList: { add: value => stage.added.push(value) } })
            };
            else if (stage) stage.isConnected = false;
        },
        querySelector: () => stage
    };
    const document = { addEventListener() {}, getElementById: () => container };
    const context = {
        document, window: { GameRandom: () => .25 },
        GameState: { player1: { name: '甲' }, player2: { name: '乙' } },
        getRarityClass: () => 'rarity-common', getRarityName: () => '普通',
        setTimeout: (callback, delay) => timers.push({ callback, delay })
    };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/ui/animations.js'), 'utf8') + '\nglobalThis.subject = Animations;', context);
    const animations = context.subject;
    animations.container = container;
    function flush() {
        for (const timer of timers.sort((a, b) => a.delay - b.delay)) timer.callback();
    }
    return { animations, container, classes, timers, flush };
}

test('draw reveals every character and closes without a click', async () => {
    const { animations, container, classes, flush } = makeAnimations();
    const finished = animations.drawCards([{ name: '戰士', rarity: 'COMMON', hp: 100, atk: 20 }, { name: '醫生', rarity: 'COMMON', hp: 90, atk: 5 }]);
    assert.match(container.innerHTML, /戰士/);
    assert.match(container.innerHTML, /醫生/);
    assert.equal(container.onclick, undefined);
    flush();
    await finished;
    assert.equal(classes.has('hidden'), true);
    assert.equal(container.innerHTML, '');
});

test('coin result is fixed before the panel closes', async () => {
    const { animations, container, timers, flush } = makeAnimations();
    const finished = animations.coinFlip(2);
    assert.match(container.innerHTML, /乙/);
    assert.match(container.innerHTML, /先手出擊/);
    assert.equal(timers.at(-1).delay, 3500);
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
