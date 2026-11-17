const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

function updateContext(playState, fetch) {
    const elements = new Map();
    const modal = { classList: { active: false, add() { this.active = true; } } };
    const list = { items: [], replaceChildren() { this.items = []; }, appendChild(item) { this.items.push(item); } };
    const version = { textContent: '' };
    const button = { textContent: '', disabled: false };
    for (const [id, value] of [['updateModal', modal], ['updateNotesList', list], ['versionDisplay', version], ['mainUpdateBtn', button]]) elements.set(id, value);
    const document = { readyState: 'loading', getElementById: id => elements.get(id), createElement: () => ({ textContent: '' }) };
    const window = { APP_VERSION: '2.8.0', addEventListener() {}, Capacitor: { getPlatform: () => 'android', Plugins: { PlayUpdate: { checkUpdate: async () => playState, startUpdate: async () => {} } } } };
    const context = vm.createContext({ window, document, fetch, console, alert() {}, Date });
    vm.runInContext(read('js/core/updater.js'), context);
    return { context, modal, list, version };
}

test('Play update is shown even when release notes cannot be fetched', async () => {
    const { context, modal, list, version } = updateContext(
        { installedVersion: '2.8.0', available: true }, async () => { throw new Error('offline'); });
    await context.window.Updater.checkVersion();
    assert.equal(modal.classList.active, true);
    assert.match(version.textContent, /Google Play/);
    assert.equal(list.items.length, 1);
});

test('Play install is not prompted from a newer web version alone', async () => {
    const { context, modal } = updateContext(
        { installedVersion: '2.8.0', available: false }, async () => ({ ok: true, json: async () => ({ version: '9.0.0' }) }));
    await context.window.Updater.checkVersion();
    assert.equal(modal.classList.active, false);
});

test('comic swap keeps its panel until the change animation finishes', async () => {
    let finish;
    const layer = { children: [], className: '', setAttribute() {}, append(...nodes) { this.children.push(...nodes); }, remove() { this.removed = true; } };
    const document = { body: { append(node) { this.child = node; } }, createElement: () => ({ ...layer, children: [], append(...nodes) { this.children.push(...nodes); } }) };
    const window = {};
    vm.runInNewContext(read('js/ui/comicMotion.js'), { window, document, console, setTimeout: callback => { finish = callback; }, clearTimeout() {} });
    const action = window.ComicMotion.swap({ outgoing: { name: '戰士' }, incoming: { name: '魔眼' }, opponent: true });
    await new Promise(setImmediate);
    assert.equal(document.body.child.className, 'ink-swap');
    assert.equal(document.body.child.removed, undefined);
    finish();
    await action;
    assert.equal(document.body.child.removed, true);
});

test('death replacement still shows the entrance when the old battle slot is empty', async () => {
    let finish;
    const document = {
        body: { append(node) { this.child = node; } },
        createElement: () => ({ children: [], className: '', setAttribute() {}, append(...nodes) { this.children.push(...nodes); }, remove() { this.removed = true; } })
    };
    const window = {};
    vm.runInNewContext(read('js/ui/comicMotion.js'), { window, document, console, setTimeout: callback => { finish = callback; }, clearTimeout() {} });
    const action = window.ComicMotion.swap({ outgoing: null, incoming: { name: '魔眼' } });
    await new Promise(setImmediate);
    assert.match(document.body.child.className, /ink-swap--last-stand/);
    assert.equal(document.body.child.children[2].children[1].textContent, '魔眼');
    finish();
    await action;
    assert.equal(document.body.child.removed, true);
});

test('summon preview resolves the actual target and renders its base stats', () => {
    const source = read('game.html');
    const helpers = source.slice(source.indexOf('function escapeBattleHtml'), source.indexOf('function openBattleCardDetails'));
    const content = { innerHTML: '' };
    const modal = { classList: { add() {} } };
    const document = { getElementById: id => id === 'cardDetailsContent' ? content : modal };
    const context = vm.createContext({ window: { GameRandom: Math.random }, document, console });
    for (let part = 1; part <= 6; part++) vm.runInContext(read(`js/data/characters_part${part}.js`), context);
    vm.runInContext(read('js/data/characters.js'), context);
    vm.runInContext(`function getRarityName(value) { return value; } function getRemainingSkillCooldown() { return 0; } ${helpers}
        globalThis.targetNames = getSummonTargetNames;
        globalThis.cardByName = getCharacterByName;
        globalThis.details = showCardDetails;`, context);
    const summoner = context.cardByName('有斯勒斯');
    assert.equal(context.targetNames(summoner.skills[0]).join(','), '法特');
    context.details(context.cardByName('法特'));
    assert.match(content.innerHTML, /500/);
    assert.match(content.innerHTML, /60/);
    assert.match(content.innerHTML, /CHARACTER FILE/);
});
