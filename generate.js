const fs = require('fs');

const chars = JSON.parse(fs.readFileSync('c:/Users/s0307/Desktop/code/neoncard-main/tmp_chars.json', 'utf8'));

// We want characters 199 to 305 (row numbers) -> indices in array 0 to 106.
// ID starts at 198 for row 199.
let idCounter = 198;

function parseRarity(r) {
    if (r.includes('一般')) return 'COMMON';
    if (r.includes('稀有')) return 'RARE';
    if (r.includes('史詩')) return 'EPIC';
    if (r.includes('傳說')) return 'LEGENDARY';
    if (r.includes('神話')) return 'MYTHIC';
    if (r.includes('特殊')) return 'SPECIAL';
    return 'COMMON';
}

function parseStat(s) {
    s = s.toString();
    if (s.includes('~')) {
        const [min, max] = s.split('~').map(x => parseInt(x));
        return `{ min: ${min}, max: ${max} }`;
    }
    if (s.includes('齒輪')) {
        return `{ dynamic: 'gear' }`;
    }
    return parseInt(s) || 1;
}

function parseSkills(sk1, sk2, sk3) {
    const list = [];
    const parse = (sk) => {
        if (!sk) return;
        const match = sk.match(/^(.*?)-(.*?)\((\d+)\)$/);
        if (match) {
            list.push(`{ name: '${match[1].trim()}', desc: '${match[2].trim()}', cd: ${match[3]}, effect: { type: 'todo' } }`);
        } else if (sk.trim()) {
            list.push(`{ name: '${sk.trim()}', desc: '${sk.trim()}', cd: 3, effect: { type: 'todo' } }`);
        }
    };
    parse(sk1); parse(sk2); parse(sk3);
    return list.length ? `[${list.join(', ')}]` : `[]`;
}

function parsePassive(p) {
    if (!p || !p.trim()) return `null`;
    const match = p.match(/^(.*?)-(.*)$/);
    if (match) {
        return `{ name: '${match[1].trim()}', desc: '${match[2].trim()}', effect: { trigger: 'todo', action: 'todo' } }`;
    }
    return `{ name: 'Passive', desc: '${p.trim()}', effect: { type: 'todo' } }`;
}

let part5 = `// ========== NEON CARD GAME - CHARACTER DATABASE PART 5 ==========\n\nconst CHARACTERS_PART5 = [\n`;
let part6 = `// ========== NEON CARD GAME - CHARACTER DATABASE PART 6 ==========\n\nconst CHARACTERS_PART6 = [\n`;

chars.forEach((c, idx) => {
    let id = idCounter++;
    let out = `    { id: ${id}, name: '${c.name}', rarity: '${parseRarity(c.rarity)}', hp: ${parseStat(c.hp)}, atk: ${parseStat(c.atk)}, skills: ${parseSkills(c.sk1, c.sk2, c.sk3)}, passive: ${parsePassive(c.passive)} }`;
    if (idx < chars.length - 1) out += ",\n";
    else out += "\n";

    if (idx < 55) {
        part5 += out;
    } else {
        part6 += out;
    }
});

part5 += `];\n\nif (typeof module !== 'undefined' && module.exports) module.exports = { CHARACTERS_PART5 };\n`;
part6 += `];\n\nif (typeof module !== 'undefined' && module.exports) module.exports = { CHARACTERS_PART6 };\n`;

fs.writeFileSync('c:/Users/s0307/Desktop/code/neoncard-main/js/data/characters_part5.js', part5);
fs.writeFileSync('c:/Users/s0307/Desktop/code/neoncard-main/js/data/characters_part6.js', part6);

console.log('Generated characters_part5.js and characters_part6.js');
