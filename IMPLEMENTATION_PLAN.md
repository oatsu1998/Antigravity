# Master Implementation Plan — Destiny Network Terminal Architecture

**Project**: Destiny Network Sportsbook & Line Movement Terminal  
**Repository**: `c:\Users\samue\OneDrive\Desktop\Betslip Anti Gravity`  
**Live Site**: [https://antigravity-three-nu.vercel.app/history.html](https://antigravity-three-nu.vercel.app/history.html)  

---

## 📌 Executive Summary

This document outlines the complete architectural design, data normalization engine, and visual specs for the **Destiny Network Line History Terminal** (`history.html`). The project converts raw total points into high-utility betting intelligence via **Spread Margin Delta ($\Delta$)**, continuous game clock scaling, dual Y-axis overlays, MLB pipeline mapping, and ESPN team logo node rendering.

---

## 📐 Key Specifications & Architecture

### 1. Primary Chart: Spread Margin Delta ($\Delta$)
* **Formula**: $\text{Margin} = (\text{Away Score} - \text{Home Score}) + \text{Away Spread Line}$
* **Cover Line Baseline ($y = 0$)**: Centered at $0$ (The Push / Target Line) with a 2px gold axis line.
* **Dynamic Covering Shading**:
  * **Above $0$ (15% Opacity Blue)**: Away team is covering the spread.
  * **Below $0$ (15% Opacity Gold)**: Home team is covering the spread.

---

### ⏱️ 2. Time Normalization Engine (`parseClockToMinute`)
Converts discrete game clocks (NBA quarters or MLB innings) into a continuous float X-axis scale ($0.0\text{m} \rightarrow 48.0\text{m}$):

#### 🏀 Basketball (NBA / NCAA / WNBA) Mapping
* **Q1**: $12.0 - \text{Remaining Mins}$ (e.g. Q1 9:30 $\rightarrow$ 2.5m)
* **Q2**: $24.0 - \text{Remaining Mins}$ (e.g. Q2 5:45 $\rightarrow$ 18.25m)
* **Halftime**: $24.0\text{m}$
* **Q3**: $36.0 - \text{Remaining Mins}$ (e.g. Q3 8:20 $\rightarrow$ 27.67m)
* **Q4**: $48.0 - \text{Remaining Mins}$ (e.g. Q4 3:30 $\rightarrow$ 44.5m)

#### ⚾ Baseball (MLB) Inning Normalization Mapping
* **Pre-Game / First Pitch**: $0.0\text{m}$
* **Top 1st**: $1.0\text{m}$ | **Bot 1st**: $2.5\text{m}$
* **Top 4th**: $15.0\text{m}$ | **Bot 4th**: $17.5\text{m}$
* **Mid 5th (5th Inning Stretch)**: $24.0\text{m}$
* **Top 9th**: $44.0\text{m}$ | **Final (9th)**: $48.0\text{m}$

---

### 📈 3. Dual Y-Axis Mechanics
* **Left Y-Axis (`y-spread`)**: Spread Cover Margin Delta / Run Line Margin ($\pm 15$ pts / $\pm 5$ runs). 3px solid blue line.
* **Right Y-Axis (`y-total`)**: Live Total Line trajectory (O/U Points / Runs). 1.5px cyan dashed line.

---

### 🛡️ 4. ESPN Team Logo Nodes
* Replaces standard circular dots with official **Team Logo Badges** (24px Image nodes) dynamically preloaded from ESPN CDN.
* In **Spread Margin Mode**, the graph renders the logo of the team currently covering the spread/run line at each timeline node.

---

### 🎯 5. Stacked Breakdown Tooltip (`The box` Model)
Hovering over any node displays the complete audit breakdown:
```text
Q3 8:20 (27.7m Game Clock)
🎯 🔥 STATUS: OKC Covering by +4.0 PTS
🟦 OKC Thunder: Score 68 | Spread -2.0 (-110)
   • Live Spread vs Open: -2.0 (Opened +2.5)
   • Moneyline: -125
🟨 BOS Celtics: Score 62 | Spread +2.0 (-110)
   • Moneyline: +105

📊 Total Line: O/U 232.5
⚡ Play Event: Williams 3PT + Foul
📍 Book: BetOnline
```

---

## 🛠️ Verification & Deployment Status

- **Version Controlled**: Commit `d4212ba`
- **GitHub Remotes**:
  - `https://github.com/oatsu1998/Antigravity` (`origin`)
  - `https://github.com/oatsu1998/Betslip` (`old-origin`)
- **Live Deployment**: [https://antigravity-three-nu.vercel.app/history.html](https://antigravity-three-nu.vercel.app/history.html)
