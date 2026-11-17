const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function makeTutorial() {
    const state = { selection: true, skill: false, retreat: false };
    const storage = new Map();
    const game = { mode: 'tutorial', currentPlayer: 1, winner: null };
    const document = {
        getElementById(id) {
            return {
                classList: {
                    contains(name) {
                        if (id === 'selectionPhase' && name === 'hidden') return !state.selection;
                        if (id === 'skillPanelModal' && name === 'active') return state.skill;
                        if (id === 'retreatModal' && name === 'active') return state.retreat;
                        return false;
                    }
                }
            };
        }
    };
    const context = {
        window: {}, document, GameState: game, setTimeout, clearTimeout,
        localStorage: { setItem: (key, value) => storage.set(key, value) }
    };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/core/tutorialSystem.js'), 'utf8'), context);
    const tutorial = context.window.TutorialSystem;
    const shown = [];
    tutorial.isActive = true;
    tutorial.overlayContainer = { style: {}, remove() {} };
    tutorial.dialogElement = { style: {}, remove() {} };
    tutorial.stopHighlightTracking = () => {};
    tutorial.showStep = step => shown.push(step.action);
    tutorial.showFeedback = message => { tutorial.lastFeedback = message; };
    return { tutorial, state, storage, game, shown };
}

test('guided actions follow the actual turn and modal events', async () => {
    const { tutorial: t, state, game, shown, storage } = makeTutorial();
    t.checkTrigger('onDrawCards');
    assert.equal(shown.at(-1), 'draw_revealed');
    t.onActionCompleted('draw_revealed');
    assert.equal(shown.at(-1), 'select_warrior');
    t.onActionCompleted('click_card', 1);
    assert.equal(t.currentStepIndex, 1, 'wrong first card must not advance');
    t.onActionCompleted('click_card', 0);
    assert.equal(shown.at(-1), 'click_confirm');
    t.onActionCompleted('click_confirm');
    state.selection = false;
    t.checkTrigger('onPlayerTurn');
    assert.equal(shown.at(-1), 'continue');
    t.nextStep();
    t.nextStep();
    t.nextStep();
    assert.equal(shown.at(-1), 'click_attack');
    t.onActionCompleted('click_attack');
    game.currentPlayer = 2;
    t.checkTrigger('onEnemyTurn');
    assert.equal(shown.at(-1), 'wait');
    game.currentPlayer = 1;
    t.checkTrigger('onPlayerTurn');
    await new Promise(resolve => setTimeout(resolve, 5));
    assert.equal(shown.at(-1), 'click_skill');
    state.skill = true;
    t.onActionCompleted('click_skill');
    assert.equal(shown.at(-1), 'click_skill_option');
    t.onActionCompleted('click_skill_option');
    state.skill = false;
    game.currentPlayer = 2;
    t.checkTrigger('onEnemyTurn');
    game.currentPlayer = 1;
    t.checkTrigger('onPlayerTurn');
    await new Promise(resolve => setTimeout(resolve, 5));
    assert.equal(shown.at(-1), 'click_retreat');
    state.retreat = true;
    t.onActionCompleted('click_retreat');
    assert.equal(shown.at(-1), 'choose_hette');
    t.onActionCompleted('click_retreat_option', 1);
    assert.equal(t.currentStepIndex, 12, 'wrong replacement must not advance');
    t.onActionCompleted('click_retreat_option', 0);
    state.retreat = false;
    game.currentPlayer = 2;
    t.checkTrigger('onEnemyTurn');
    game.currentPlayer = 1;
    t.checkTrigger('onPlayerTurn');
    await new Promise(resolve => setTimeout(resolve, 5));
    assert.equal(shown.at(-1), 'quiz');
    t.nextStep();
    assert.equal(shown.at(-1), 'practice');
    game.winner = 1;
    t.onBattleFinished();
    assert.equal(storage.get('tutorialCompleted'), 'true');
    assert.equal(t.completedThisBattle, true);
});

test('losing before independent practice does not complete the tutorial', () => {
    const { tutorial: t, game, storage } = makeTutorial();
    t.currentStepIndex = 7;
    game.winner = 2;
    t.onBattleFinished();
    assert.equal(storage.has('tutorialCompleted'), false);
});
