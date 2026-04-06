/**
 * Neon Card Game - Ranked System
 * Season S1: 淵底甦醒 (ends 2026/05/31)
 *
 * Tiers (in order):
 *   骸1→3, 隱1→3, 刃1→3, 暗1→3, 魘1→3, 虛1→3, 永劫之顛
 *
 * Rules:
 *   - Each tier (except 永劫之顛) has 3 divisions, each needs 5 stars
 *   - Win: +1 star, Loss: -1 star
 *   - 骸1 floor: minimum 1 star, cannot drop below
 *   - Division drop: land on 4 stars of previous division
 *   - 永劫之顛: points system (+50 win, -30 loss); below 0 → drop to 虛3 with 1 star
 *   - Season reset: drop 2 tiers (骸/隱 exempt)
 */

const RankedSystem = (() => {

    // ── Tier definitions ────────────────────────────────────────────────────
    // Each entry represents one division (e.g. 骸1, 骸2, ...)
    const TIERS = [
        { tier: '骸', division: 1, img: 'race_pic/骸1.png' },
        { tier: '骸', division: 2, img: 'race_pic/骸2.png' },
        { tier: '骸', division: 3, img: 'race_pic/骸3.png' },
        { tier: '隱', division: 1, img: 'race_pic/隱1.png' },
        { tier: '隱', division: 2, img: 'race_pic/隱2.png' },
        { tier: '隱', division: 3, img: 'race_pic/隱3.png' },
        { tier: '刃', division: 1, img: 'race_pic/刃1.png' },
        { tier: '刃', division: 2, img: 'race_pic/刃2.png' },
        { tier: '刃', division: 3, img: 'race_pic/刃3.png' },
        { tier: '暗', division: 1, img: 'race_pic/暗1.png' },
        { tier: '暗', division: 2, img: 'race_pic/暗2.png' },
        { tier: '暗', division: 3, img: 'race_pic/暗3.png' },
        { tier: '魘', division: 1, img: 'race_pic/魘1.png' },
        { tier: '魘', division: 2, img: 'race_pic/魘2.png' },
        { tier: '魘', division: 3, img: 'race_pic/魘3.png' },
        { tier: '虛', division: 1, img: 'race_pic/虛1.png' },
        { tier: '虛', division: 2, img: 'race_pic/虛2.png' },
        { tier: '虛', division: 3, img: 'race_pic/虛3.png' },
        { tier: '永劫之顛', division: 0, img: 'race_pic/永劫之顛.png' },
    ];

    const APEX_INDEX = 18;   // TIERS index for 永劫之顛
    const STARS_PER_DIV = 5;
    const APEX_WIN_PTS  = 50;
    const APEX_LOSS_PTS = 30;

    // Season info
    const SEASON = {
        id: 'S1',
        name: 'S1：淵底甦醒',
        endDate: '2026/05/31',
        apexTitle: '極夜加冕者'
    };

    // Title definitions
    const TITLES = {
        '初到新星':   { img: 'hao_pic/初到新星.png',   color: '#00f3ff', desc: '所有玩家初始稱號' },
        '極夜加冕者': { img: 'hao_pic/極夜加冕者.png', color: '#ffd700', desc: `${SEASON.name} 賽季達到永劫之顛` },
    };

    // ── Default ranked state ─────────────────────────────────────────────────
    function defaultRanked() {
        return {
            tierIdx: 0,      // index into TIERS array (0 = 骸1)
            stars: 1,        // current stars (1-5)
            points: 0,       // only used at 永劫之顛
            peakTierIdx: 0,  // highest reached
            peakSeason: SEASON.id
        };
    }

    // ── Helpers ──────────────────────────────────────────────────────────────
    function getTierInfo(tierIdx) {
        return TIERS[Math.max(0, Math.min(tierIdx, APEX_INDEX))];
    }

    function isApex(tierIdx) {
        return tierIdx === APEX_INDEX;
    }

    // Returns rank score for matchmaking
    function getRankScore(ranked) {
        const r = ranked || defaultRanked();
        if (isApex(r.tierIdx)) return APEX_INDEX * STARS_PER_DIV + (r.points || 0) / 1000;
        return r.tierIdx * STARS_PER_DIV + (r.stars - 1);
    }

    // ── Display helpers ──────────────────────────────────────────────────────
    function getDisplayName(ranked) {
        const r = ranked || defaultRanked();
        const t = getTierInfo(r.tierIdx);
        if (isApex(r.tierIdx)) return '永劫之顛';
        return `${t.tier}${t.division}`;
    }

    function getImgPath(ranked) {
        const r = ranked || defaultRanked();
        return getTierInfo(r.tierIdx).img;
    }

    function getStarsHtml(ranked) {
        const r = ranked || defaultRanked();
        if (isApex(r.tierIdx)) return `<span style="color:#ffd700;font-size:0.9rem;">${r.points || 0} pts</span>`;
        let html = '';
        for (let i = 0; i < STARS_PER_DIV; i++) {
            html += i < r.stars
                ? '<span style="color:#ffd700;">★</span>'
                : '<span style="color:rgba(255,255,255,0.2);">☆</span>';
        }
        return html;
    }

    function getPeakDisplay(ranked) {
        const r = ranked || defaultRanked();
        const t = getTierInfo(r.peakTierIdx || 0);
        const name = (r.peakTierIdx === APEX_INDEX) ? '永劫之顛' : `${t.tier}${t.division}`;
        return `${name}（${r.peakSeason || SEASON.id}）`;
    }

    function getPeakImg(ranked) {
        const r = ranked || defaultRanked();
        return getTierInfo(r.peakTierIdx || 0).img;
    }

    // ── Match result processing ──────────────────────────────────────────────
    /**
     * Process a match result and return updated ranked + change description.
     * Does NOT write to Firestore — caller is responsible for saving.
     * @param {object} ranked  current ranked state (or null for default)
     * @param {boolean} isWin
     * @returns {{ ranked: object, description: string }}
     */
    function processMatchResult(ranked, isWin) {
        let r = ranked ? { ...ranked } : defaultRanked();
        let description = '';

        if (isApex(r.tierIdx)) {
            // ── 永劫之顛 Points mode ─────────────────────────────
            const delta = isWin ? APEX_WIN_PTS : -APEX_LOSS_PTS;
            r.points = (r.points || 0) + delta;
            description = isWin ? `+${APEX_WIN_PTS} 分` : `-${APEX_LOSS_PTS} 分`;

            if (r.points < 0) {
                // Drop to 虛3 with 1 star
                r.tierIdx = APEX_INDEX - 1; // 虛3
                r.stars = 1;
                r.points = 0;
                description += '  ↓ 掉回 虛3 · 1★';
            }
        } else {
            // ── Normal Stars mode ────────────────────────────────
            if (isWin) {
                r.stars++;
                description = '+1 ★';

                if (r.stars > STARS_PER_DIV) {
                    // Promotion
                    if (r.tierIdx + 1 >= APEX_INDEX) {
                        // Promote to 永劫之顛
                        r.tierIdx = APEX_INDEX;
                        r.stars = 0;
                        r.points = 0;
                        description = '🎉 晉升至 永劫之顛！';
                    } else {
                        r.tierIdx++;
                        r.stars = 1;
                        const t = getTierInfo(r.tierIdx);
                        const name = `${t.tier}${t.division}`;
                        description = `🎉 晉升至 ${name}！`;
                    }
                    // Update peak
                    if (r.tierIdx > (r.peakTierIdx || 0)) {
                        r.peakTierIdx = r.tierIdx;
                        r.peakSeason = SEASON.id;
                    }
                }
            } else {
                // Loss
                const isFloor = (r.tierIdx === 0 && r.stars <= 1);
                if (isFloor) {
                    // 骸1 floor — no drop
                    description = '骸1 保底，不會再掉';
                } else {
                    r.stars--;
                    description = '-1 ★';

                    if (r.stars < 1) {
                        // Demotion
                        if (r.tierIdx === 0) {
                            r.stars = 1; // Another floor guard
                            description = '骸1 保底，不會再掉';
                        } else {
                            r.tierIdx--;
                            r.stars = 4; // Land on 4 stars of prev division
                            const t = getTierInfo(r.tierIdx);
                            const name = `${t.tier}${t.division}`;
                            description = `↓ 掉段至 ${name} · 4★`;
                        }
                    }
                }
            }
        }

        return { ranked: r, description };
    }

    // ── Mid-game leave penalty (-2 stars) ────────────────────────────────────
    function penalizeLeave(ranked) {
        let r = ranked ? { ...ranked } : defaultRanked();
        let description = '排位賽中斷連線懲罰：-2 ★';
        
        // Apply loss twice to simulate -2 stars (handles demotion perfectly)
        let firstLoss = processMatchResult(r, false);
        let secondLoss = processMatchResult(firstLoss.ranked, false);
        
        return { 
            ranked: secondLoss.ranked, 
            description 
        };
    }

    // ── Season reset ─────────────────────────────────────────────────────────
    /**
     * Calculate post-season ranked state (drop 2 tiers, exempt if 骸/隱).
     */
    function calculateSeasonReset(ranked) {
        const r = ranked ? { ...ranked } : defaultRanked();
        const t = getTierInfo(r.tierIdx);

        // 骸 and 隱 are exempt
        if (t.tier === '骸' || t.tier === '隱') return r;

        // Drop 2 major tiers (each major tier = 3 divisions)
        const stepsToDropPerTier = 3;
        const newIdx = Math.max(0, r.tierIdx - stepsToDropPerTier * 2);
        const newT   = getTierInfo(newIdx);

        return {
            ...r,
            tierIdx: newIdx,
            stars: 1,
            points: 0,
            // 骸/隱 after drop — no lower
            ...(newT.tier === '骸' || newT.tier === '隱' ? {} : {})
        };
    }

    // ── All tiers list for UI ─────────────────────────────────────────────────
    function getAllTiers() {
        return TIERS.map((t, idx) => ({
            idx,
            name: idx === APEX_INDEX ? '永劫之顛' : `${t.tier}${t.division}`,
            img: t.img,
            isApex: idx === APEX_INDEX
        }));
    }

    // ── Title helpers ─────────────────────────────────────────────────────────
    function getTitleInfo(titleKey) {
        return TITLES[titleKey] || null;
    }

    function getAllTitles() {
        return Object.entries(TITLES).map(([key, v]) => ({ key, ...v }));
    }

    function shouldGrantApexTitle(ranked) {
        return ranked && isApex(ranked.tierIdx);
    }

    return {
        SEASON, TIERS, APEX_INDEX,
        defaultRanked,
        getTierInfo,
        isApex,
        getRankScore,
        getDisplayName,
        getImgPath,
        getStarsHtml,
        getPeakDisplay,
        getPeakImg,
        processMatchResult,
        penalizeLeave,
        calculateSeasonReset,
        getAllTiers,
        getTitleInfo,
        getAllTitles,
        shouldGrantApexTitle
    };
})();

window.RankedSystem = RankedSystem;
