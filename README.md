# 霓虹牌 (Neon Card Game)

![Game Status](https://img.shields.io/badge/Status-Active%20Development-00f3ff?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/Tech-Vanilla%20JS%20|%20Firebase%20|%20PeerJS-purple?style=for-the-badge)

這是一款以賽博龐克為視覺核心的雙人對戰卡牌遊戲平台。專案採用 WebRTC 技術實現低延遲 P2P 對戰，並建構了完整的排位競技、社交互動與角色成長體系。

## 🚀 立即體驗

**線上版本：[https://uptocard.netlify.app](https://uptocard.netlify.app)**

---

## 🛠️ 技術架構 (Technical Architecture)

本專案拒絕使用笨重的框架，堅持以 Vanilla JS 與現代 Web API 打造高效能、反應迅速的遊戲體驗。

-   **核心引擎**：基於狀態機 (State Machine) 的對戰系統，精確處理複雜的技能連鎖與異常狀態。
-   **通訊協定**：利用 **PeerJS (WebRTC)** 實現點對點連線，大幅降低伺服器負擔並提供極低延遲的對戰反饋。
-   **持久化層**：整合 **Firebase** 生態系統：
    *   **Authentication**：玩家帳戶體系。
    *   **Firestore**：儲存玩家配置、卡庫與排位數據。
    *   **Realtime Database (RTDB)**：處理即時社交功能、好友狀態與遊戲邀請。
-   **視覺系統**：純 CSS3 打造的 **Glassmorphism (玻璃擬物)** 與 **Neon UI** 設計規範，具備動態發光特效。

---

## ⚔️ 核心戰鬥系統

遊戲提供超過 300 名各具特色的角色，戰鬥深度建立在資源管理與位置控制之上。

-   **區塊化戰場**：劃分「戰鬥區」與「備戰區」，考量技能冷卻 (CD) 與撤退時機。
-   **多樣化機制**：包含斬殺、反傷、護盾衰減、沉默、黑洞吞噬等多達 10 餘種異常狀態。
-   **隨機性優化**：內建中心化 RNG 邏輯，確保卡牌抽取與技能觸發的公平性。

---

## 🏆 競技排位 (Ranked S1：淵底甦醒)

專案開發了完整的 ELO 積分與段位體系，目前正處於 **S1 賽季：淵底甦醒**。

-   **段位層級**：骸 → 隱 → 刃 → 暗 → 魘 → 虛 → 永劫之巔。
-   **升段規則**：各階級細分 3 個小段，採星等增減制；頂端玩家進入「永劫之巔」點數制排位。
-   **賽季重置**：具備自動化的賽季結算與段位繼承邏輯。
-   **榮譽體系**：動態稱號系統，根據玩家戰績（如連勝、特定獲勝條件）解鎖專屬視覺稱號。

---

## 🧬 平台與社交體系

不只是單次對戰，而是一個完整的遊戲生態圈。

-   **社交系統**：即時好友請求、在線狀態追蹤、以及基於 RTDB 的房間邀請機制。
-   **通行證 (Battle Pass)**：**「踢飛．盛宴」** 系統，包含免費與進階軌道，透過戰鬥經驗值驅動成長獎勵。
-   **任務系統**：劃分新手、每日、常駐三類任務，提供動態獎勵領取機制。
-   **試煉之路**：線性等級成長體系，提供長期的遊玩動能。

---

## 📂 專案結構簡介

-   `js/core/`：核心邏輯目錄
    *   `battleSystem.js`：戰鬥演算引擎
    *   `rankedSystem.js`：排位與稱號邏輯
    *   `friends.js`：社交與邀請管理
    *   `auth.js` / `userProfile.js`：用戶數據與持久化管理
-   `js/data/`：靜態數據庫（角色、技能、任務數據）
-   `game.html` / `index.html`：對戰介面與大廳主入口
-   `css/styles.css`：全站通用的霓虹設計系統變數

---

## 🔧 本地開發指南

1.  複製專案：`git clone https://github.com/ythsc0529/neoncard.git`
2.  專案無需預編譯，可直接使用 VS Code Live Server 或任何靜態 HTTP 伺服器啟動。
3.  Firebase 配置位於 `js/core/auth.js`（請替換為開發用 API Key）。