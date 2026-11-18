const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const context = vm.createContext({ window: {} });
vm.runInContext(read('js/core/npcAI.js'), context);
vm.runInContext(read('js/data/botProfiles.js'), context);
const ai = context.window.NpcAI;

function card(hp, atk, skills = [], extra = {}) {
    return { hp, maxHp: 100, shield: 0, atk, skills, ...extra };
}

test('matchmaking has 50 unique human-style NPC identities with profiles', () => {
    const profiles = context.window.NPC_PROFILES;
    assert.equal(Object.keys(profiles).length, 50);
    assert.equal(new Set(Object.keys(profiles)).size, 50);
    for (const [name, profile] of Object.entries(profiles)) {
        assert.equal(profile.displayName, name);
        assert.ok(profile.ranked && profile.stats && profile.favoriteChars.length);
    }
});

test('Hell NPC chooses the strongest opening card', () => {
    assert.equal(ai.bestCardIndex([card(100, 10), card(100, 35), card(20, 8)]), 1);
});

test('Hell NPC secures a kill with a skill when basic attack cannot', () => {
    const self = card(100, 20, [
        { effect: { type: 'damage', value: 55 } },
        { effect: { type: 'shield', value: 100 } }
    ]);
    assert.equal(ai.chooseAction(self, card(50, 20), [], [0, 1]).type, 'skill');
    assert.equal(ai.chooseAction(self, card(50, 20), [], [0, 1]).index, 0);
});

test('Hell NPC prefers a lethal basic attack and retreats from danger', () => {
    const self = card(25, 20, [{ effect: { type: 'shield', value: 100 } }]);
    const reserve = card(90, 30);
    assert.equal(ai.chooseAction(self, card(15, 20), [reserve], [0]).type, 'attack');
    const decision = ai.chooseAction(self, card(80, 35), [reserve], [0]);
    assert.equal(decision.type, 'retreat');
    assert.equal(decision.index, 0);
});

for (const mode of ['casual', 'ranked']) {
    test(`${mode} matchmaking fallback uses a profiled Hell NPC`, async () => {
        const values = new Map();
        const timers = [];
        const ownEntry = {
            set: async () => {}, onDisconnect: () => ({ remove() {} }),
            on: () => () => {}, off() {}, remove: async () => {}
        };
        const queue = {
            child: () => ownEntry,
            once: async () => ({ val: () => ({ me: { rankScore: 0, version: 'test' } }) })
        };
        const window = { NPC_PROFILES: context.window.NPC_PROFILES };
        const sandbox = vm.createContext({
            window, console, location: { href: '' },
            localStorage: {
                getItem: key => values.get(key) ?? null,
                setItem: (key, value) => values.set(key, value),
                removeItem: key => values.delete(key)
            },
            AuthManager: {
                getCurrentUser: () => ({ uid: 'me' }),
                getRtdb: () => ({ ref: () => queue })
            },
            firebase: { database: { ServerValue: { TIMESTAMP: 1 } } },
            setTimeout: fn => { timers.push(fn); return timers.length; },
            clearTimeout() {}
        });
        vm.runInContext(read('js/core/matchmaking.js'), sandbox);
        await sandbox.window.MatchmakingManager.joinQueue(mode, '玩家', () => {});
        const fallback = timers.shift()();
        timers.shift()(); // Resolve the simulated match animation delay.
        await fallback;
        assert.equal(values.get('pveDifficulty'), 'hell');
        assert.ok(window.NPC_PROFILES[values.get('botMatchName')]);
        assert.equal(values.get('isBotRankedMatch'), mode === 'ranked' ? 'true' : undefined);
    });
}
