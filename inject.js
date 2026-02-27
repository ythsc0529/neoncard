const fs = require('fs');

const BATTLE_SYSTEM_ADDITIONS = fs.readFileSync('battle_cases.txt', 'utf8');
const GAMESTATE_ADDITIONS = fs.readFileSync('game_cases.txt', 'utf8');

let bs = fs.readFileSync('js/core/battleSystem.js', 'utf8');
bs = bs.replace(/                case 'spend_resource_evolve':/, BATTLE_SYSTEM_ADDITIONS + '\n                case \'spend_resource_evolve\':');
fs.writeFileSync('js/core/battleSystem.js', bs);


let gs = fs.readFileSync('js/core/gameState.js', 'utf8');
gs = gs.replace(/            \/\/ --- NEW PASSIVE HANDLERS ---/, '// --- NEW PASSIVE HANDLERS ---\n' + GAMESTATE_ADDITIONS);
fs.writeFileSync('js/core/gameState.js', gs);

console.log('Successfully injected cases into battleSystem.js and gameState.js');
