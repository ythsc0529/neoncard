// ========== NEON CARD GAME - CHARACTER DATABASE MASTER ==========
// Loads and combines all character parts

// Combine all character arrays
const ALL_CHARACTERS = [
    ...CHARACTERS_PART1,
    ...CHARACTERS_PART2,
    ...CHARACTERS_PART3,
    ...CHARACTERS_PART4
];

// Create lookup maps
const CHARACTER_BY_ID = {};
const CHARACTER_BY_NAME = {};

ALL_CHARACTERS.forEach(char => {
    CHARACTER_BY_ID[char.id] = char;
    CHARACTER_BY_NAME[char.name] = char;
});

// Get characters by rarity (excluding SPECIAL which can only be summoned)
function getDrawableCharacters() {
    return ALL_CHARACTERS.filter(c => c.rarity !== 'SPECIAL');
}

// Draw a random character based on rarity probabilities
function drawRandomCharacter() {
    const roll = Math.random() * 100;
    let rarity;

    if (roll < 5) rarity = 'MYTHIC';           // 5%
    else if (roll < 17) rarity = 'LEGENDARY';  // 12%
    else if (roll < 35) rarity = 'EPIC';       // 18%
    else if (roll < 60) rarity = 'RARE';       // 25%
    else rarity = 'COMMON';                     // 40%

    const candidates = getDrawableCharacters().filter(c => c.rarity === rarity);
    if (candidates.length === 0) {
        // Fallback to common if no characters of that rarity
        const commons = getDrawableCharacters().filter(c => c.rarity === 'COMMON');
        return commons[Math.floor(Math.random() * commons.length)];
    }
    return candidates[Math.floor(Math.random() * candidates.length)];
}

// Get a specific character by name
function getCharacterByName(name) {
    return CHARACTER_BY_NAME[name] || null;
}

// Get characters by category/tag
function getCharactersByTag(tag) {
    return ALL_CHARACTERS.filter(c => c.tags && c.tags.includes(tag));
}

// Categories
const BALLS = ['籃球', '足球', '排球', '羽球', '高爾夫球', '撞球'];
const PLANETS = ['冥王星', '水星', '金星', '地球', '火星', '木星', '土星', '天王星', '海王星', '北極星', '太陽'];
const TEAS = ['梅子綠茶', '檸檬紅茶', '水果茶', '台茶18號', '多多綠茶', '烏龍茶', '採茶員'];
const MOTORCYCLES = ['越野摩托車', '重型摩托車', '水上摩托車', '狗狗肉摩托車'];

function getRandomFromCategory(category) {
    let list;
    switch (category) {
        case 'ball': list = BALLS; break;
        case 'planet': list = PLANETS; break;
        case 'tea': list = TEAS; break;
        case 'motorcycle': list = MOTORCYCLES; break;
        default: return null;
    }
    const name = list[Math.floor(Math.random() * list.length)];
    return getCharacterByName(name);
}

// Create a character instance (with resolved random stats)
function createCharacterInstance(character) {
    const instance = JSON.parse(JSON.stringify(character));

    // Resolve random HP
    if (typeof instance.hp === 'object') {
        instance.hp = Math.floor(Math.random() * (instance.hp.max - instance.hp.min + 1)) + instance.hp.min;
    }
    instance.maxHp = instance.hp;

    // Resolve random ATK
    if (typeof instance.atk === 'object') {
        instance.baseAtkMin = instance.atk.min;
        instance.baseAtkMax = instance.atk.max;
        instance.atk = Math.floor(Math.random() * (instance.atk.max - instance.atk.min + 1)) + instance.atk.min;
    }
    instance.baseAtk = instance.atk;

    // Initialize cooldowns
    instance.cooldowns = {};
    if (instance.skills) {
        instance.skills.forEach((skill, idx) => {
            instance.cooldowns[idx] = 0;
        });
    }

    // Initialize resources if any
    if (!instance.resources) instance.resources = {};

    // Status effects
    instance.statusEffects = [];
    instance.shield = 0;
    instance.buffs = [];
    instance.debuffs = [];

    // Tracking
    instance.deathCount = 0;
    instance.hasAttacked = false;

    return instance;
}

// Rarity display helpers
function getRarityClass(rarity) {
    switch (rarity) {
        case 'COMMON': return 'rarity-common';
        case 'RARE': return 'rarity-rare';
        case 'EPIC': return 'rarity-epic';
        case 'LEGENDARY': return 'rarity-legendary';
        case 'MYTHIC': return 'rarity-mythic';
        case 'SPECIAL': return 'rarity-special';
        default: return '';
    }
}

function getRarityName(rarity) {
    return RARITY[rarity]?.name || rarity;
}

console.log(`Neon Card Game: Loaded ${ALL_CHARACTERS.length} characters`);
