// Single price table for every cell. Replace values here to change the game economy.
// Key: "<cell>-<ring label>", ring label 11 = inner ring, 12 = outer ring.
// Amounts are base values in $ (Kapmonia/Narmonia) or ₽ (Gosmonia); inflation multiplies them.
// rent: [base, 1 module, 2 modules, 3 modules, 4 modules, dome]; double rent = base × 2
window.MPPrices = {
  cells: {
    // red
    "moon-11": { price: 60, module: 50, dome: 40, rent: [6, 21, 69, 165, 210, 240] },
    "moon-12": { price: 72, module: 60, dome: 48, rent: [7, 24, 80, 192, 245, 280] },
    "vesta-11": { price: 60, module: 50, dome: 40, rent: [6, 21, 69, 165, 210, 240] },
    "vesta-12": { price: 72, module: 60, dome: 48, rent: [7, 24, 80, 192, 245, 280] },
    "ceres-11": { price: 60, module: 50, dome: 40, rent: [6, 21, 69, 165, 210, 240] },
    "ceres-12": { price: 72, module: 60, dome: 48, rent: [7, 24, 80, 192, 245, 280] },
    // orange
    "deimos-11": { price: 100, module: 50, dome: 40, rent: [10, 35, 115, 275, 350, 400] },
    "deimos-12": { price: 120, module: 60, dome: 48, rent: [12, 42, 138, 330, 420, 480] },
    "phobos-11": { price: 100, module: 50, dome: 40, rent: [10, 35, 115, 275, 350, 400] },
    "phobos-12": { price: 120, module: 60, dome: 48, rent: [12, 42, 138, 330, 420, 480] },
    "mars-11": { price: 100, module: 50, dome: 40, rent: [10, 35, 115, 275, 350, 400] },
    "mars-12": { price: 120, module: 60, dome: 48, rent: [12, 42, 138, 330, 420, 480] },
    // yellow
    "cerara-11": { price: 140, module: 100, dome: 80, rent: [14, 49, 161, 385, 490, 560] },
    "cerara-12": { price: 168, module: 120, dome: 96, rent: [17, 60, 196, 468, 595, 680] },
    "theia-11": { price: 140, module: 100, dome: 80, rent: [14, 49, 161, 385, 490, 560] },
    "theia-12": { price: 168, module: 120, dome: 96, rent: [17, 60, 196, 468, 595, 680] },
    "nibiru-11": { price: 140, module: 100, dome: 80, rent: [14, 49, 161, 385, 490, 560] },
    "nibiru-12": { price: 168, module: 120, dome: 96, rent: [17, 60, 196, 468, 595, 680] },
    // green
    "io-11": { price: 180, module: 100, dome: 80, rent: [18, 63, 207, 495, 630, 720] },
    "io-12": { price: 216, module: 120, dome: 96, rent: [22, 77, 253, 605, 770, 880] },
    "europa-11": { price: 180, module: 100, dome: 80, rent: [18, 63, 207, 495, 630, 720] },
    "europa-12": { price: 216, module: 120, dome: 96, rent: [22, 77, 253, 605, 770, 880] },
    "ganymede-11": { price: 180, module: 100, dome: 80, rent: [18, 63, 207, 495, 630, 720] },
    "ganymede-12": { price: 216, module: 120, dome: 96, rent: [22, 77, 253, 605, 770, 880] },
    // sky
    "rhea-11": { price: 220, module: 150, dome: 120, rent: [22, 77, 253, 605, 770, 880] },
    "rhea-12": { price: 264, module: 180, dome: 144, rent: [26, 91, 299, 715, 910, 1040] },
    "enceladus-11": { price: 220, module: 150, dome: 120, rent: [22, 77, 253, 605, 770, 880] },
    "enceladus-12": { price: 264, module: 180, dome: 144, rent: [26, 91, 299, 715, 910, 1040] },
    "titan-11": { price: 220, module: 150, dome: 120, rent: [22, 77, 253, 605, 770, 880] },
    "titan-12": { price: 264, module: 180, dome: 144, rent: [26, 91, 299, 715, 910, 1040] },
    // blue
    "umbriel-11": { price: 260, module: 150, dome: 120, rent: [26, 91, 299, 715, 910, 1040] },
    "umbriel-12": { price: 312, module: 180, dome: 144, rent: [31, 108, 356, 852, 1085, 1240] },
    "oberon-11": { price: 260, module: 150, dome: 120, rent: [26, 91, 299, 715, 910, 1040] },
    "oberon-12": { price: 312, module: 180, dome: 144, rent: [31, 108, 356, 852, 1085, 1240] },
    "titania-11": { price: 260, module: 150, dome: 120, rent: [26, 91, 299, 715, 910, 1040] },
    "titania-12": { price: 312, module: 180, dome: 144, rent: [31, 108, 356, 852, 1085, 1240] },
    // violet
    "nereid-11": { price: 300, module: 200, dome: 160, rent: [30, 105, 345, 825, 1050, 1200] },
    "nereid-12": { price: 360, module: 240, dome: 192, rent: [36, 126, 414, 990, 1260, 1440] },
    "proteus-11": { price: 300, module: 200, dome: 160, rent: [30, 105, 345, 825, 1050, 1200] },
    "proteus-12": { price: 360, module: 240, dome: 192, rent: [36, 126, 414, 990, 1260, 1440] },
    "triton-11": { price: 300, module: 200, dome: 160, rent: [30, 105, 345, 825, 1050, 1200] },
    "triton-12": { price: 360, module: 240, dome: 192, rent: [36, 126, 414, 990, 1260, 1440] },
    // pink
    "haumea-11": { price: 350, module: 200, dome: 160, rent: [35, 122, 402, 962, 1225, 1400] },
    "haumea-12": { price: 420, module: 240, dome: 192, rent: [42, 147, 483, 1155, 1470, 1680] },
    "makemake-11": { price: 350, module: 200, dome: 160, rent: [35, 122, 402, 962, 1225, 1400] },
    "makemake-12": { price: 420, module: 240, dome: 192, rent: [42, 147, 483, 1155, 1470, 1680] },
    "eris-11": { price: 350, module: 200, dome: 160, rent: [35, 122, 402, 962, 1225, 1400] },
    "eris-12": { price: 420, module: 240, dome: 192, rent: [42, 147, 483, 1155, 1470, 1680] },
    // stations: one group of 4 per ring, rent by number held in the same form by the same owner(s) (1..4)
    "orion-11": { price: 200, rent: [36, 60, 120, 240] },
    "orion-12": { price: 240, rent: [36, 60, 120, 240] },
    "pegasus-11": { price: 200, rent: [36, 60, 120, 240] },
    "pegasus-12": { price: 240, rent: [36, 60, 120, 240] },
    "kiola-11": { price: 200, rent: [36, 60, 120, 240] },
    "kiola-12": { price: 240, rent: [36, 60, 120, 240] },
    "vega-11": { price: 200, rent: [36, 60, 120, 240] },
    "vega-12": { price: 240, rent: [36, 60, 120, 240] },
    // utilities (Kvantal + Icite): rent by dice sum 2–4 / 5–8 / 9–12; one held vs both held
    "kvantal-11": { price: 204, rent: { one: [36, 60, 96], both: [60, 120, 180] } },
    "kvantal-12": { price: 204, rent: { one: [36, 60, 96], both: [60, 120, 180] } },
    "icite-11": { price: 204, rent: { one: [36, 60, 96], both: [60, 120, 180] } },
    "icite-12": { price: 204, rent: { one: [36, 60, 96], both: [60, 120, 180] } },
  },
  special: {
    blackHoleFine: 50, // $/₽; Narmonia: blackHoleFineNar g
    blackHoleFineNar: 0.5,
    kvantalPercent: 10, // Kvantal: mandatory payment, % of balance
    kvantalNar: 0.5,
    iciteGrant: 50, // Icite: grant
    iciteGrantNar: 0.5,
    narmonyonNar: 1, // Narmonyon Centrary bonus in Narmonia scenarios, g
    auctionStartPercent: 50,
    auctionStep: 10,
    mortgagePercent: 50,
    redeemPercent: 55,
    sellToBankPercent: 75,
    gosPayoutPercent: 25,
    selfRentTaxPercent: 25, // Kapmonia: rent paid to yourself, only the profit tax leaves the wallet
    buildPremiumPercent: 33.3, // Narmonia: premium to the initiator of a construction vote
    adBonus: { usd: 100, rub: 50, nar: 0.5 },
  },
};
