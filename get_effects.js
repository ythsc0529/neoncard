const fs = require('fs');

const p5 = require('./js/data/characters_part5.js').CHARACTERS_PART5;
const p6 = require('./js/data/characters_part6.js').CHARACTERS_PART6;

const allChars = [...p5, ...p6];

const skillEffectTypes = new Set();
const passiveActions = new Set();

for (let c of allChars) {
    if (c.skills) {
        for (let s of c.skills) {
            if (s.effect && s.effect.type) {
                skillEffectTypes.add(s.effect.type);
            }
        }
    }
    if (c.passive && c.passive.effect && c.passive.effect.action) {
        passiveActions.add(c.passive.effect.action);
    }
}

console.log('--- SKILL EFFECT TYPES ---');
console.log([...skillEffectTypes].join('\n'));
console.log('\n--- PASSIVE ACTIONS ---');
console.log([...passiveActions].join('\n'));
