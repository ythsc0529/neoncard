const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

function setup(mode) {
    const values = new Map(Object.entries({
        gameMode: 'pve', gameType: 'pve', fromCompetitiveMode: 'true',
        botMatchName: 'StarBlade_77', onlineMyName: '玩家甲',
        ...(mode === 'ranked' ? { isBotRankedMatch: 'true' } : {})
    }));
    const localStorage = {
        getItem: key => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, String(value)),
        removeItem: key => values.delete(key)
    };
    const records = { matches: [], rankUpdates: [], settlement: null, stats: [] };
    const profile = { ranked: { tierIdx: 2, stars: 1 }, battlePass: { points: 0 } };
    const window = { localOnlineRole: null, SoundManager: { play() {} } };
    const GameState = {
        mode: 'pve', type: 'pve', winner: 1,
        player1: { name: '玩家甲', allCards: [] },
        player2: { name: 'StarBlade_77', allCards: [] }
    };
    const context = vm.createContext({
        window, GameState, localStorage, console,
        setTimeout: fn => { fn(); return 1; }, clearTimeout() {},
        document: { addEventListener() {} },
        SoundManager: window.SoundManager,
        AuthManager: { getCurrentUser: () => ({ uid: 'player-1' }), getDb: () => ({ collection: () => ({ doc: () => ({ set: async () => {} }) }) }) },
        UserProfile: {
            getProfile: async () => structuredClone(profile),
            updateRanked: async (_, ranked) => records.rankUpdates.push(ranked),
            incrementStat: async (_, kind, won) => records.stats.push([kind, won]),
            updateProfile: async () => {}, addTitle: async () => {},
            recordMatch: async (_, match) => records.matches.push(match)
        },
        RankedSystem: {
            defaultRanked: () => profile.ranked,
            processMatchResult: (old, won) => ({ ranked: { ...old, stars: old.stars + (won ? 1 : -1) }, description: '+1 星' }),
            shouldGrantApexTitle: () => false
        },
        firebase: { firestore: { FieldValue: { increment: value => value } } },
        GameSettlement: { show: (_, opts) => { records.settlement = opts; } }
    });
    vm.runInContext(read('js/ui/animations.js'), context);
    vm.runInContext('Animations.container = { classList: { add(){}, remove(){} }, innerHTML: "" };', context);
    return { context, records, values };
}

for (const mode of ['casual', 'ranked']) {
    test(`${mode} bot win records the competitive mode and completed match rewards`, async () => {
        const { context, records, values } = setup(mode);
        await vm.runInContext('Animations.victory("玩家1")', context);
        await Promise.resolve();
        assert.equal(records.matches.length, 1);
        assert.equal(records.matches[0].opponentName, 'StarBlade_77');
        assert.equal(records.matches[0].mode, mode === 'ranked' ? 'ranked' : 'online');
        assert.equal(records.settlement.expGained, 50);
        assert.equal(records.settlement.mode, mode === 'ranked' ? 'ranked_bot' : 'casual');
        assert.equal(values.has('botMatchName'), false);
        if (mode === 'ranked') assert.equal(records.rankUpdates[0].stars, 2);
    });
}

test('ranked rematch keeps its mode after victory clears match flags', () => {
    const values = new Map();
    const context = vm.createContext({
        window: {}, console,
        localStorage: { getItem: key => values.get(key) ?? null, removeItem: key => values.delete(key) },
        sessionStorage: { setItem: (key, value) => values.set(key, value) },
        document: { getElementById: () => null },
        location: { href: '' }, clearInterval() {}, clearTimeout() {}
    });
    vm.runInContext(read('js/ui/settlement.js'), context);
    vm.runInContext('GameSettlement.show("玩家甲", { mode: "ranked_bot" }); GameSettlement._rematch();', context);
    assert.equal(values.get('autoMatchmake'), 'ranked');
});
