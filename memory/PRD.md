# Мультиполия — PRD

## Problem statement
Build the browser PWA game «Мультиполия» from the spec (Техническое Задание_3073, 50 pages) and the approved design (Мультиполия_Дизайн_на_подпись, 43 mockups). Stack requested by the user: HTML, CSS, Vanilla JS. Work strictly step by step and wait for confirmation after each step.

## User choices
- v1: play vs bots, all 5 scenarios with base rules
- Online match: later stage
- Languages: RU + EN + UA from the start
- Admin panel: later stage
- Ad bonus: MOCKED ad view

## Architecture
- Vanilla app served from /app/frontend/public (CRA dev server used only as a static host; src/index.js is empty)
- index.html (all screens), css/variables.css (design palette), css/base.css, css/screens.css
- js/i18n.js (ru/en/uk dictionary, t(), setLang), js/app.js (router, setup, draw, game shell)
- manifest.json, sw.js (network-first cache), icons/, assets/img (tokens, planets, corner objects cut from the design PDF)

## Step plan
1. PWA + markup + CSS variables — DONE (2026-06)
2. State management classes — DONE (2026-06): js/state.js (Wallet usd/rub/nar, Player, HistoryLog with i18n keys, Bank goldPrice/priceIndex, Match: roll/doubles/3 doubles→Black Hole, endTurn, completeRound benefit/UBI, localStorage save + «Продолжить партию»), placeholder bot loop
3. Board generation (2 rings × 36 cells + 4 corners), dice, zigzag route calculation
4. Economy controllers: Kapmonia / Gosmonia / Narmonia (buying, shares, rent, UBI, taxes, loans, construction)
5. Events & UI: Chance/Borgi modals, voting, bots, results screen

## Backlog
- P1: Online match (rooms), admin panel for texts, results scoring (Construction / Living standard / Capital)
- P2: real ad network for the bonus

## Open questions
- Starting sum for the «Капмония / Госмония» scenario (spec says «определяется отдельно»): 2000 ₽ is a placeholder for now
- Prices / rent table per cell (needed for step 3–4)
