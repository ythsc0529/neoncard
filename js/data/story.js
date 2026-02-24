// ========== NEON CARD GAME - STORY MODE DATA ==========
// Contains all story chapters, dialogues, and custom battle configurations

const STORY_CHAPTERS = [
    {
        id: 'main_1',
        title: '理性的崩塌與蘋果的戰爭',
        type: 'main', // 'main' 主傳, 'side' 外傳
        chapter_number: 1,
        description: '虛擬第 7 區的防線即將崩潰，迷因軍團來襲。',
        nodes: [
            // 節點 1：戰前劇情
            {
                type: 'dialogue',
                background: 'bg-wasteland', // 可以後續在CSS中加入對應的背景
                conversations: [
                    { speaker: '系統', text: '地點：虛擬第 7 區 —— 「破碎程式碼荒原」\n時間：系統重置後第 12 週期' },
                    { speaker: '旁白', text: '天空不是藍色的，而是由無數閃爍的雜訊和亂碼構成的灰白。地面上插滿了巨大的、生鏽的「一般」稀有度刀劍，像是墓碑一樣林立。' },
                    { speaker: '旁白', text: '奧本海默（神話）站在懸崖邊，推了推鼻樑上的帽子，眼神深邃而疲憊。他手中的煙斗早已熄滅，取而代之的是手中微微發光的「曼哈頓計數器」。目前的數值是 2。離那個毀滅性的臨界點還有很長一段距離。' },
                    { speaker: '愛因斯坦', text: '「我們還要等多久？」' },
                    { speaker: '旁白', text: '身後傳來一個急躁的聲音。愛因斯坦正在瘋狂地在空氣中寫寫畫畫，他的頭髮比教科書上還要亂，身邊漂浮著幾個不穩定的粒子。' },
                    { speaker: '愛因斯坦', text: '「我的『布朗運動』已經迫不及待要隨機撞擊某個倒霉鬼了，這不確定性讓我感到焦慮，或者興奮？這是相對的。」' },
                    { speaker: '奧本海默', text: '「冷靜點，阿爾伯特。這場仗不是靠你的骰子就能贏的。對面集結了『迷因軍團』的主力。」' },
                    { speaker: '愛因斯坦', text: '「迷因……毫無邏輯，違反物理定律。那個叫鯊魚鞋子的傢伙，為什麼鞋子會咬人？這不科學。」' },
                    { speaker: '旁白', text: '就在這時，通訊頻道裡傳來了刺耳的電流聲。那是前線偵查兵小圓盾最後的慘叫。' },
                    { speaker: '小圓盾 (通訊)', text: '「他們來了！太硬了！根本擋不住！那個叫彼得（Peter）的傢伙進化了——」' },
                    { speaker: '旁白', text: '訊號中斷。' },
                    { speaker: '奧本海默', text: '「全員，準備戰鬥。」' }
                ]
            },
            // 節點 2：戰鬥
            {
                type: 'battle',
                title: '遭遇戰：現實扭曲場',
                player: {
                    name: '神話聯盟',
                    deck: ['奧本海默', '愛因斯坦', '皇家騎士', '夏天與你', '超級坦克', '抽卡員', '護理師'] // 取主要的7張
                },
                enemy: {
                    name: '迷因軍團',
                    deck: ['鯊魚鞋子', '小混混', '賈伯斯', '小米', 'Peter', '科比布萊恩特', '玻璃心']
                },
                rules: {
                    customStats: {
                        'Peter': { hp: 700, maxHp: 700 }
                    }
                }
            },
            // 節點 3：戰後劇情
            {
                type: 'dialogue',
                conversations: [
                    { speaker: '旁白', text: '戰場上只剩下燃燒的殘骸、碎裂的玻璃心，以及滿地的蘋果核。' },
                    { speaker: '旁白', text: '奧本海默坐在高鐵的商務艙裡，看著窗外飛逝的風景，手中的計數器跳到了 5。' },
                    { speaker: '奧本海默', text: '「原子彈快好了。下次，我會讓羅伯特知道，什麼才是真正的咆哮。」' },
                    { speaker: '旁白', text: '而在這節車廂的角落裡，一個穿著連帽衫的神秘人正默默地洗著一副牌。' },
                    { speaker: '抽卡員', text: '「再來一次？」' },
                    { speaker: '旁白', text: '他笑了笑，從牌堆中抽出了兩張牌。一張是黑暗大法師般的結膜炎，另一張，則是那個傳說中只要死亡就能無限復活的男人——鳳凰。' },
                    { speaker: '抽卡員', text: '「好戲，才剛開始。」' }
                ]
            }
        ]
    }
];

// 儲存/讀取進度
function getStoryProgress() {
    const saved = localStorage.getItem('neonCardStoryProgress');
    if (!saved) {
        return {
            unlockedNodes: { 'main_1_0': true }, // chapterId_nodeIndex
            completedNodes: {}
        };
    }
    return JSON.parse(saved);
}

function saveStoryProgress(progress) {
    localStorage.setItem('neonCardStoryProgress', JSON.stringify(progress));
}

function unlockNextNode(chapterId, currentNodeIndex) {
    let progress = getStoryProgress();
    const chapter = STORY_CHAPTERS.find(c => c.id === chapterId);
    if (!chapter) return;

    // Mark current as completed
    progress.completedNodes[`${chapterId}_${currentNodeIndex}`] = true;

    // Unlock next node in this chapter
    if (currentNodeIndex + 1 < chapter.nodes.length) {
        progress.unlockedNodes[`${chapterId}_${currentNodeIndex + 1}`] = true;
    } else {
        // Unlock next chapter's first node
        const currentChapIdx = STORY_CHAPTERS.findIndex(c => c.id === chapterId);
        if (currentChapIdx + 1 < STORY_CHAPTERS.length) {
            progress.unlockedNodes[`${STORY_CHAPTERS[currentChapIdx + 1].id}_0`] = true;
        }
    }
    saveStoryProgress(progress);
}

// 供 nodeJS (如果有的話) 或其他模塊匯出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { STORY_CHAPTERS, getStoryProgress, saveStoryProgress, unlockNextNode };
}
