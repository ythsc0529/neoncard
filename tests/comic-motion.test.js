const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

function fakeClock() {
    let now = 0, nextId = 0;
    const timers = new Map();
    return {
        timers,
        setTimeout(fn, delay = 0) { const id = ++nextId; timers.set(id, { fn, at: now + delay }); return id; },
        clearTimeout(id) { timers.delete(id); },
        tick(ms) {
            const until = now + ms;
            for (;;) {
                const next = [...timers].filter(([,v]) => v.at <= until).sort((a,b) => a[1].at-b[1].at)[0];
                if (!next) break;
                now = next[1].at; timers.delete(next[0]); next[1].fn();
            }
            now = until;
        }
    };
}

function setup(reduced = false) {
    const clock = fakeClock();
    const elements = new Map();
    const document = { activeElement: null, getElementById: id => elements.get(id),
        createElement: () => new Element(), querySelectorAll: () => [], addEventListener() {} };
    class Element {
        constructor() {
            this.className = ''; this.innerHTML = ''; this.children = []; this.dataset = {};
            this.style = { setProperty() {} }; this.attrs = {};
            this.classList = {
                contains: name => this.className.split(' ').includes(name),
                add: name => { if (!this.classList.contains(name)) this.className += ' ' + name; },
                remove: name => { this.className = this.className.split(' ').filter(c => c !== name).join(' '); }
            };
        }
        appendChild(el) { this.children.push(el); return el; }
        append(...els) { this.children.push(...els); }
        addEventListener() {}
        setAttribute(key,value) { this.attrs[key] = value; }
        focus() { document.activeElement = this; }
        remove() { this.removed = true; }
        getBoundingClientRect() { return { left: 100, top: 100, width: 160, height: 220 }; }
        querySelector(selector) {
            if (selector === '.gc-status.is-dupe') return this.innerHTML.includes('gc-status is-dupe') ? {} : null;
            return new Element();
        }
    }
    document.body = new Element();
    for (const id of ['gachaAnimModal','gachaStage','gachaResults','gachaAnimTitle','gachaAnimHint','btnSkipAnim','btnRevealAll']) elements.set(id, new Element());
    const window = { matchMedia: () => ({matches: reduced}), addEventListener() {} };
    const context = vm.createContext({ window, document, console, ...clock, innerWidth: 1000, innerHeight: 700 });
    vm.runInContext(read('js/ui/comicMotion.js'), context);
    context.ComicMotion = window.ComicMotion;
    const shop = read('js/ui/shop.js');
    const config = shop.slice(shop.indexOf('const EXP_CONVERSION'), shop.indexOf('// ── Init'));
    vm.runInContext(`let gachaAnimState = null; let isAnimating = false; let activePoolId = 'general';
        function toggleUIButtons() {} function selectPool() {} function triggerHaptic() {}
        ${config}
        ${shop.slice(shop.indexOf('function showGachaModal'), shop.indexOf('function triggerHaptic'))}
        globalThis.getState = () => gachaAnimState;
        globalThis.getLocked = () => isAnimating;
        spawnComicPop = () => {};
    `, context);
    return { context, clock, elements, document };
}
const rewards = (count = 10) => Array.from({length: count}, (_,i) => ({type:'char',name:'角色'+i,rarity:i===count-1?'MYTHIC':'COMMON',isDupe:i===0}));

test('full recruit sequence holds anticipation for 6.2 seconds, then reveals every reward once', () => {
    const {context:c,clock} = setup();
    c.showGachaModal(rewards());
    assert.equal(c.getLocked(), true);
    clock.tick(6199); assert.equal(c.getState().opened, false);
    clock.tick(1); assert.equal(c.getState().opened, true); assert.equal(c.getState().revealed, 0);
    clock.tick(499); assert.equal(c.getState().revealed, 0);
    clock.tick(1); assert.equal(c.getState().revealed, 1);
    clock.tick(10000); assert.equal(c.getState().revealed, 10); assert.equal(c.getState().completed, true);
    c.revealAll(); assert.equal(c.getState().revealed, 10);
});

test('skip, rapid repeated reveal and a new session cannot receive stale timers', () => {
    const {context:c,clock} = setup();
    c.showGachaModal(rewards()); clock.tick(1800);
    const oldCard = c.getState().cards[0];
    c.skipAnim(); c.skipAnim(); c.skipAnim(); clock.tick(700);
    assert.equal(c.getState().completed, true);
    assert.equal(c.getState().revealed, 10);
    c.skipAnim(); assert.equal(c.getState(), null); assert.equal(c.getLocked(), false);
    c.showGachaModal(rewards(1)); c.revealGachaCard(oldCard);
    assert.equal(c.getState().revealed, 0);
    clock.tick(3000); assert.equal(c.getState().opened, false);
    clock.tick(5000); assert.equal(c.getState().revealed, 1); assert.equal(c.getState().completed, true);
});

test('closing during anticipation cancels all callbacks and restores focus and scrolling', () => {
    const {context:c,clock,document} = setup();
    const original = { focus() { document.activeElement = this; } };
    document.activeElement = original; document.body.style.overflow = 'auto';
    c.showGachaModal(rewards()); clock.tick(3600); c.closeGachaModal(); clock.tick(20000);
    assert.equal(clock.timers.size, 0); assert.equal(c.getState(), null);
    assert.equal(document.activeElement, original); assert.equal(document.body.style.overflow, 'auto');
});

test('system reduced-motion setting still plays the full recruit sequence', () => {
    const {context:c,clock} = setup(true);
    c.showGachaModal([]); assert.equal(c.getLocked(), false);
    c.showGachaModal(rewards(1)); clock.tick(6199);
    assert.equal(c.getState().opened, false);
    clock.tick(1); assert.equal(c.getState().opened, true);
    clock.tick(1200);
    assert.equal(c.getState().completed, true); assert.equal(c.getState().revealed, 1);
});

test('each visible pool roster uses the same characters as its draw filter', () => {
    const context = vm.createContext({});
    for (let part = 1; part <= 6; part++) vm.runInContext(read(`js/data/characters_part${part}.js`), context);
    vm.runInContext(read('js/data/characters.js'), context);
    const shop = read('js/ui/shop.js');
    vm.runInContext(`${shop.slice(shop.indexOf('const STAR_POOL_CHARS'), shop.indexOf('// ── Init'))}
        let allCharacters = ALL_CHARACTERS;
        ${shop.slice(shop.indexOf('function getPoolContents'), shop.indexOf('function renderPoolContents'))}
        ${shop.slice(shop.indexOf('function filterCharPool'), shop.indexOf('async function performPull'))}
        globalThis.roster = getPoolContents;
        globalThis.drawFilter = filterCharPool;`, context);
    for (const id of ['general', 'science', 'star']) {
        const roster = context.roster(id);
        assert.ok(roster.length > 0, `${id} has drawable characters`);
        assert.ok(roster.every(char => char.rarity !== 'SPECIAL'));
        for (const rarity of ['MYTHIC', 'LEGENDARY', 'EPIC', 'RARE', 'COMMON']) {
            assert.equal(
                context.drawFilter({id}, rarity).map(char => char.name).sort().join('|'),
                roster.filter(char => char.rarity === rarity).map(char => char.name).sort().join('|')
            );
        }
    }
    assert.ok(context.roster('evo').every(char => ['MYTHIC', 'LEGENDARY'].includes(char.rarity)));
    assert.ok(context.roster('titles').every(item => item.type === 'title'));
});

test('skill visuals distinguish damage, restoration, protection, summons and utility', () => {
    const {context:c} = setup();
    for (const [type,expected] of [['damage','strike'],['heal','heal'],['shield','guard'],['summon','summon'],['silence','control'],['buff_next_attack','power']]) {
        assert.equal(c.ComicMotion.classifySkill({effect:{type}}), expected);
    }
});

test('combat effects queue in order and remove their overlays when finished', async () => {
    const {context:c,clock,document} = setup();
    let completed = 0;
    const first = c.ComicMotion.combat({attacker:{name:'戰士'}}).then(()=>completed++);
    const second = c.ComicMotion.combat({attacker:{name:'醫生'},kind:'skill',skill:{name:'治療',effect:{type:'heal'}}}).then(()=>completed++);
    await new Promise(setImmediate);
    assert.equal(document.body.children.length, 1);
    clock.tick(1050); await first; await new Promise(setImmediate);
    assert.equal(completed,1); assert.equal(document.body.children[0].removed,true);
    assert.equal(document.body.children.length,2);
    clock.tick(1550); await second;
    assert.equal(completed,2); assert.equal(document.body.children[1].removed,true);
});

test('system reduced-motion setting still plays the full combat duration', async () => {
    const {context:c,clock,document} = setup(true);
    let finished = false;
    const action = c.ComicMotion.combat({attacker:{name:'戰士'}}).then(() => { finished = true; });
    await new Promise(setImmediate);
    assert.equal(document.body.children[0].className.includes('is-reduced'), false);
    clock.tick(1049); await new Promise(setImmediate);
    assert.equal(finished, false);
    clock.tick(1); await action;
    assert.equal(finished, true);
});

test('normal attacks and valid skills await motion before resolving; invalid skills do not animate', async () => {
    const events = [];
    let finishMotion;
    const context = vm.createContext({window:{},
        Animations:{comicAction:()=>new Promise(resolve=>{events.push('motion');finishMotion=resolve;})},
        GameState:{addLog(){},processPassive:async()=>{}}});
    vm.runInContext(read('js/core/battleSystem.js')+'\nglobalThis.battle = BattleSystem;', context);
    const attacker = {name:'戰士',atk:20,statusEffects:[],resources:{},cooldowns:[0],skills:[{name:'斬擊',cd:2,effect:{type:'damage',value:50}}]};
    const defender = {name:'敵人',statusEffects:[]};
    context.battle.applyDamage = async()=>{events.push('damage');return {damage:20};};
    let action = context.battle.normalAttack(attacker,defender);
    assert.deepEqual(events,['motion']);finishMotion();await action;
    assert.deepEqual(events,['motion','damage']); assert.equal(attacker.hasAttacked,true);
    events.length=0;
    context.battle.executeSkillEffect = async()=>{events.push('skill');return true;};
    action = context.battle.useSkill(attacker,defender,0);
    assert.deepEqual(events,['motion']);finishMotion();await action;
    assert.deepEqual(events,['motion','skill']);
    events.length=0;assert.equal(await context.battle.useSkill(attacker,defender,0),false);assert.deepEqual(events,[]);
    attacker.cooldowns[0]=0;attacker.statusEffects=[{type:'silence'}];
    assert.equal(await context.battle.useSkill(attacker,defender,0),false);assert.deepEqual(events,[]);
});
