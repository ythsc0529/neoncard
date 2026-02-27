const fs = require('fs');
const html = fs.readFileSync('c:/Users/s0307/Desktop/code/neoncard-main/角色.html', 'utf8');

const rowRegex = /<tr.*?>\s*<th.*?>([\s\S]*?)<\/th>\s*([\s\S]*?)<\/tr>/g;
const tdRegex = /<td.*?>([\s\S]*?)<\/td>/g;

let match;
const results = [];
while ((match = rowRegex.exec(html)) !== null) {
    const thContent = match[1];
    let rowNumMatch = thContent.match(/>(\d+)<\/div>/);
    if (!rowNumMatch) continue;

    let rowNum = parseInt(rowNumMatch[1], 10);
    if (rowNum >= 199 && rowNum <= 305) {
        let tdContent = match[2];
        let tds = [];
        let tdMatch;
        while ((tdMatch = tdRegex.exec(tdContent)) !== null) {
            let text = tdMatch[1].replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim();
            tds.push(text);
        }
        results.push({
            row: rowNum,
            rarity: tds[0] || '',
            name: tds[1] || '',
            hp: tds[2] || '',
            atk: tds[3] || '',
            sk1: tds[4] || '',
            sk2: tds[5] || '',
            sk3: tds[6] || '',
            passive: tds[7] || ''
        });
    }
}

fs.writeFileSync('c:/Users/s0307/Desktop/code/neoncard-main/tmp_chars.json', JSON.stringify(results, null, 2));
console.log(`Parsed ${results.length} characters.`);
