// Special game constants (fines, percentages). Cell prices/rents live in game_content_config (js/content-default.js / Admin → Content editor).
window.MPPrices = {
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
