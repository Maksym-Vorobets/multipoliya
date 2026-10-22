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
3. Board + movement + token animation — DONE (2026-06): js/board.js (40 positions, 2 rings × 36 + 4 corners, groups, price list, route graph: ring switch at corners and stations), css/board.css, game.js (render, highlight options, confirm move, smooth token walk)
4. Economy — DONE (2026-06): js/economy.js — Kapmonia (buy, auction, rent with «Взыскать аренду», tender, modules/dome, self-rent 25%, mortgage, sell to bank, loans 5%/3% per 10 turns, taxes every 10 rounds), Gosmonia (build object/module/dome with 25% payout, ordinary/double rent, +50 ₽/round, quota 5 builds per 7 rounds → Black Hole), Narmonia (individual/joint purchase, public construction by vote, tariff rent into fund refunded by shares, 1% tax returned equally), hybrids kap_nar / kap_gos; stats «Строительство»/«Уровень жизни»; basic bot strategies
5. DONE (2026-06): Chance/Borgi cards (108, effects, inflation/deflation, patch, subbotnik), results screen (4/2/1/0 points ×3), ad bonus (MOCK 5 s), menu, single price table js/prices.js
6. DONE (2026-06): straight/sideways movement (no diagonal/back), EN/UK card texts (LLM-translated once via scripts/translate_cards.py), dashed route preview, online rooms (backend /api/rooms*, polling sync, host runs bots, remote prompts), admin panel /#admin (JWT, edits rules/UI/cards in 3 languages → /api/content)

## Backlog
- P1: WebSocket instead of polling; server-side validation of state pushes (current player/host only); reconnect UI for dropped players
- P2: real ad network; currency exchange menu; smarter bot strategies

## Assumptions to confirm with customer
- Price list per color group (60…350 $, ring 12 = ×1.2), module cost, dome = 80% of module, rent multipliers 1/3.5/11.5/27.5/35/40
- Route scheme (fixed per customer, 2026-06): each step = straight (next cell same ring) or sideways (other ring, same column); no backward/diagonal; no revisiting cells within one move; from corners either ring
- Kvantal = pay 10% of balance, Icite = grant 50; Narmonyon = +1 g in Narmonia scenarios; Black Hole exit fine 50 (0.5 g)
- Auction start = 50% of price; mortgage 50% / redeem 55%; sale to bank 75%

## Backlog
- P1: Online match (rooms), admin panel for texts, results scoring (Construction / Living standard / Capital)
- P2: real ad network for the bonus

## Open questions
- Starting sum for the «Капмония / Госмония» scenario (spec says «определяется отдельно»): 2000 ₽ is a placeholder for now
- Prices / rent table per cell (needed for step 3–4)
