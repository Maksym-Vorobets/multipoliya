# One-off refactor: systemModalsText (modal texts → game_content_config) + small UI templates
import json, re, subprocess

JS = "/app/frontend/public/js/"
# modal -> (label ru/en/uk, anchor substring of the first line, number of lines, [(old_expr, field, new_args, template)])
# template: "{t:key}" inserts the existing translation of key; other {x} are runtime placeholders
M = []
def modal(name, label, anchor, span, reps):
    M.append(dict(name=name, label=label, anchor=anchor, span=span, reps=reps))

modal("rentShortage", ["Нехватка средств на аренду", "Not enough money for rent", "Нестача коштів на оренду"], 'title: t("g.noFunds"), sub: t("g.sellToPay"),', 4, [
    ('t("g.noFunds")', "title", "", "{t:g.noFunds}"), ('t("g.sellToPay")', "description", "", "{t:g.sellToPay}"),
    ('t("g.toPay")', "rowToPay", "", "{t:g.toPay}"), ('t("g.missing")', "rowMissing", "", "{t:g.missing}"), ('t("game.balance")', "rowBalance", "", "{t:game.balance}"),
    ('`${t("g.takeLoan")} · ${fmt(loan, fc)}`', "loanButton", "{ sum: fmt(loan, fc) }", "{t:g.takeLoan} · {sum}"),
    ('`${t("g.sellBank")}: ${nm(h)} · +${fmt(E.holdingValue(m, h, p), unitCur())}`', "sellButton", "{ cell: nm(h), sum: fmt(E.holdingValue(m, h, p), unitCur()) }", "{t:g.sellBank}: {cell} · +{sum}")])
modal("noFunds", ["Недостаточно средств", "Not enough money", "Недостатньо коштів"], 'if (o && o.cur === fc && limit >= short && short > 0) buttons.push', 5, [
    ('`${t("g.takeLoan")} · ${fmt(short, fc)}`', "loanButton", "{ sum: fmt(short, fc) }", "{t:g.takeLoan} · {sum}"),
    ('t("g.useAssets")', "assetsButton", "", "{t:g.useAssets}"), ('t("g.goBenefit")', "benefitButton", "", "{t:g.goBenefit}"), ('t("g.back")', "backButton", "", "{t:g.back}"),
    ('t("g.noFunds")', "title", "", "{t:g.noFunds}"), ('t("g.toPay")', "rowToPay", "", "{t:g.toPay}"), ('t("g.available")', "rowAvailable", "", "{t:g.available}")])
modal("auction", ["Аукцион", "Auction", "Аукціон"], "bid = await ask(p, {", 6, [
    ('`${t("g.auction")} · ${nm(id)}`', "title", "{ cell: nm(id) }", "{t:g.auction} · {cell}"), ('`${t("g.bidder")}: ${p.name}`', "description", "{ name: p.name }", "{t:g.bidder}: {name}"),
    ('t("g.start")', "rowStart", "", "{t:g.start}"), ('t("g.highest")', "rowHighest", "", "{t:g.highest}"), ('t("game.balance")', "rowBalance", "", "{t:game.balance}"),
    ('t("g.amount")', "inputLabel", "", "{t:g.amount}"), ('t("g.bid")', "bidButton", "", "{t:g.bid}"), ('t("g.pass")', "passButton", "", "{t:g.pass}")])
modal("vote", ["Голосование", "Vote", "Голосування"], "else v = await ask(p, { title: `${t(\"g.vote\")}", 1, [
    ('`${t("g.vote")} · ${subj.title}`', "title", "{ subject: subj.title }", "{t:g.vote} · {subject}"), ('`${nm(id)} · ${t("g.voter")}: ${p.name}`', "description", "{ cell: nm(id), name: p.name }", "{cell} · {t:g.voter}: {name}"),
    ('t("g.initiator")', "rowInitiator", "", "{t:g.initiator}"), ('t("g.weight")', "rowWeight", "", "{t:g.weight}"), ('t("g.yes")', "yesButton", "", "{t:g.yes}"), ('t("g.no")', "noButton", "", "{t:g.no}")])
modal("shareOffer", ["Предложение доли совладельцам", "Share offer to co-owners", "Пропозиція частки співвласникам"], 'title: t("g.shareOffer"), sub: `${nm(id)} · ${p.name}`,', 3, [
    ('t("g.shareOffer")', "title", "", "{t:g.shareOffer}"), ('t("g.share")', "rowShare", "", "{t:g.share}"), ('t("g.price")', "rowPrice", "", "{t:g.price}"),
    ('`${t("g.buyShare")} · ${fmt(o.amount, o.cur)}`', "buyButton", "{ sum: fmt(o.amount, o.cur) }", "{t:g.buyShare} · {sum}"), ('t("g.no")', "declineButton", "", "{t:g.no}")])
modal("buyShare", ["Покупка доли", "Buy a share", "Купівля частки"], 'title: `${t("g.buyShare")} ${Math.round(share * 100)}%`, sub: nm(id),', 3, [
    ('`${t("g.buyShare")} ${Math.round(share * 100)}%`', "title", "{ pct: Math.round(share * 100) + \"%\" }", "{t:g.buyShare} {pct}"), ('t("g.price")', "rowPrice", "", "{t:g.price}"),
    ('`${t("g.pay." + o.cur)} · ${fmt(o.amount, o.cur)}`', "payButton", "{ cur: t(\"g.pay.\" + o.cur), sum: fmt(o.amount, o.cur) }", "{cur} · {sum}"), ('t("g.back")', "backButton", "", "{t:g.back}")])
modal("jointPartners", ["Совместная покупка: выбор партнёров", "Joint purchase: partners", "Спільна купівля: вибір партнерів"], 'title: t("g.joint"), sub: t("g.partners"),', 3, [
    ('t("g.joint")', "title", "", "{t:g.joint}"), ('t("g.partners")', "description", "", "{t:g.partners}"), ('t("g.confirm")', "confirmButton", "", "{t:g.confirm}"), ('t("g.back")', "backButton", "", "{t:g.back}")])
modal("jointParticipate", ["Совместная покупка: участие", "Joint purchase: participation", "Спільна купівля: участь"], 'const payBtns = (p, part, tid) =>', 1, [
    ('`${t("g.join")} ${fmt(o.amount, o.cur)}`', "joinButton", "{ sum: fmt(o.amount, o.cur) }", "{t:g.join} {sum}")])
modal("jointParticipate", None, 'else if (can) cur = await ask(p, { title: t("g.joint")', 1, [
    ('t("g.joint")', "title", "", "{t:g.joint}"), ('t("g.part")', "rowPart", "", "{t:g.part}"), ('t("g.pass")', "declineButton", "", "{t:g.pass}")])
modal("jointParticipate", None, 'curs[initiator.id] = await ask(initiator, {', 1, [
    ('t("g.joint")', "title", "", "{t:g.joint}"), ('t("g.part")', "rowPart", "", "{t:g.part}"), ('t("g.back")', "backButton", "", "{t:g.back}")])
modal("anomaly", ["Аномалия вероятности", "Anomaly of Probability", "Аномалія ймовірності"], 'if (!p.isBot) await dialog({ title: nm("c30"), sub, buttons: [{ label: t("game.roll")', 1, [
    ('t("game.roll")', "button", "", "{t:game.roll}")])
modal("anomaly", None, 'const [a, b] = await rollDice(t("g.anomaly"), "anomaly-roll-btn");', 1, [('t("g.anomaly")', "description", "", "{t:g.anomaly}")])
modal("anomalyReroll", ["Аномалия: проверочный бросок (дубль 1:1)", "Anomaly: check roll (double 1:1)", "Аномалія: перевірочний кидок (дубль 1:1)"], 'const [x, y] = await rollDice(t("g.anomalyExtra"), "anomaly-extra-roll-btn");', 1, [('t("g.anomalyExtra")', "description", "", "{t:g.anomalyExtra}")])
modal("card", ["Карточка Шанс / Борги", "Chance / Borgi card", "Картка Шанс / Борги"], 'const title = `${t("c." + kind)} №${d.n}`;', 6, [
    ('`${t("c." + kind)} №${d.n}`', "title", "{ deck: t(\"c.\" + kind), n: d.n }", "{deck} №{n}"),
    ('t("c.payFine")', "fineButton", "", "{t:c.payFine}"), ('t("c.drawChance")', "chanceButton", "", "{t:c.drawChance}"), ('t("c.apply")', "applyButton", "", "{t:c.apply}")])
modal("adBonus", ["Реклама: бонус", "Ad bonus", "Реклама: бонус"], 'title: t("ad.title"), sub: `${p.name} · ${t("ad.reward")}: ${fmt(amount, cur)}`,', 3, [
    ('t("ad.title")', "title", "", "{t:ad.title}"), ('`${p.name} · ${t("ad.reward")}: ${fmt(amount, cur)}`', "description", "{ name: p.name, sum: fmt(amount, cur) }", "{name} · {t:ad.reward}: {sum}"),
    ('t("ad.watching")', "watching", "", "{t:ad.watching}"), ('t("ad.claim")', "claimButton", "", "{t:ad.claim}"), ('t("g.back")', "cancelButton", "", "{t:g.back}")])
modal("adBonusDone", ["Реклама: бонус получен", "Ad bonus received", "Реклама: бонус отримано"], 'await dialog({ title: t("ad.ok"), rows:', 1, [
    ('t("ad.ok")', "title", "", "{t:ad.ok}"), ('t("g.amount")', "rowAmount", "", "{t:g.amount}"), ('t("ad.cur")', "rowCurrency", "", "{t:ad.cur}"), ('t("ad.after")', "rowAfter", "", "{t:ad.after}"), ('t("common.close")', "closeButton", "", "{t:common.close}")])
modal("finishGame", ["Завершение партии", "Finish the game", "Завершення партії"], 'const ok = await dialog({ title: t("r.confirmTitle")', 1, [
    ('t("r.confirmTitle")', "title", "", "{t:r.confirmTitle}"), ('t("r.confirmSub")', "description", "", "{t:r.confirmSub}"), ('t("r.finish")', "finishButton", "", "{t:r.finish}"), ('t("g.back")', "backButton", "", "{t:g.back}")])
modal("exchange", ["Обмен $ на нармонит", "Exchange $ for Narmonit", "Обмін $ на нармоніт"], 'title: t("g.exchange"), sub: p.name,', 5, [
    ('t("g.exchange")', "title", "", "{t:g.exchange}"), ('t("g.rate")', "rowRate", "", "{t:g.rate}"), ('t("game.balance")', "rowBalance", "", "{t:game.balance}"),
    ('${t("g.amount")}, $', "${mt(\"exchange\", \"inputLabel\")}", None, "{t:g.amount}, $"), ('${t("g.youGet")}:', "${mt(\"exchange\", \"youGet\")}", None, "{t:g.youGet}:"),
    ('t("g.exchangeDo")', "exchangeButton", "", "{t:g.exchangeDo}"), ('t("g.back")', "backButton", "", "{t:g.back}")])
modal("blackHole", ["Black Hole: штраф или пропуск хода", "Black Hole: fine or skip", "Black Hole: штраф або пропуск ходу"], 'await dialog({ title: "Black Hole", sub: t("g.bh")', 1, [
    ('"Black Hole"', "title", "", "Black Hole"), ('t("g.bh")', "description", "", "{t:g.bh}"),
    ('`${t("g.payFine")} · ${fmt(opt.amount, opt.cur)}`', "payButton", "{ sum: fmt(opt.amount, opt.cur) }", "{t:g.payFine} · {sum}"), ('t("g.skip")', "skipButton", "", "{t:g.skip}")])
modal("loanInterest", ["Проценты по кредиту", "Loan interest", "Відсотки за кредитом"], 'title: t("g.interestTitle"), sub: t("g.interestSub", { rate: m.macro.creditRate }),', 6, [
    ('t("g.interestTitle")', "title", "", "{t:g.interestTitle}"), ('t("g.interestSub", { rate: m.macro.creditRate })', "description", "{ rate: m.macro.creditRate }", "{t:g.interestSub}"),
    ('t("g.toPay")', "rowToPay", "", "{t:g.toPay}"), ('t("g.missing")', "rowMissing", "", "{t:g.missing}"), ('t("game.balance")', "rowBalance", "", "{t:game.balance}"),
    ('`${t("g.takeLoan")} · ${fmt(loan, fc)}`', "loanButton", "{ sum: fmt(loan, fc) }", "{t:g.takeLoan} · {sum}"),
    ('`${t(m.cells[id].dome ? "g.sellDome" : "g.sellModule")}: ${nm(id)} · +${fmt(E.buildingRefund(m, id), fc)}`', "@sell", "{ cell: nm(id), sum: fmt(E.buildingRefund(m, id), fc) }", None),
    ('`${t("g.mortgageBtn")}: ${nm(id)} · +${fmt(E.mortgageValue(m, id), fc)}`', "mortgageButton", "{ cell: nm(id), sum: fmt(E.mortgageValue(m, id), fc) }", "{t:g.mortgageBtn}: {cell} · +{sum}"),
    ('t("g.declareBankrupt")', "bankruptButton", "", "{t:g.declareBankrupt}")])
modal("sellShare", ["Продажа доли", "Sell a share", "Продаж частки"], 'const ok = await dialog({ title: t("g.sellShare"), sub: nm(id), rows: [[t("g.share")', 1, [
    ('title: t("g.sellShare")', "title: " , None, None), ('t("g.share")', "rowShare", "", "{t:g.share}"), ('t("g.price")', "rowPrice", "", "{t:g.price}"),
    ('t("g.sellShareHint")', "description", "", "{t:g.sellShareHint}"), ('label: t("g.sellShare")', "label: ", None, None), ('t("g.back")', "backButton", "", "{t:g.back}")])
modal("sellToBank", ["Продажа банку", "Sell to the bank", "Продаж банку"], 'const ok = await dialog({ title: t("g.sellConfirm")', 1, [
    ('t("g.sellConfirm")', "title", "", "{t:g.sellConfirm}"), ('t("g.youGet")', "rowYouGet", "", "{t:g.youGet}"), ('t("g.sellBank")', "sellButton", "", "{t:g.sellBank}"), ('t("g.back")', "backButton", "", "{t:g.back}")])
modal("loan", ["Кредит", "Loan", "Кредит"], 'const amt = await dialog({ title: t("g.loan")', 1, [
    ('t("g.loan")', "title", "", "{t:g.loan}"), ('t("g.limit")', "rowLimit", "", "{t:g.limit}"), ('t("g.amount")', "inputLabel", "", "{t:g.amount}"), ('t("g.takeLoan")', "takeButton", "", "{t:g.takeLoan}"), ('t("g.back")', "backButton", "", "{t:g.back}")])

src = open(JS + "game.js", encoding="utf8").read()
lines = src.split("\n")
fields = {}  # modal -> ordered {field: template}
labels = {}
for d in M:
    if d["label"]:
        labels[d["name"]] = d["label"]
    idx = [i for i, l in enumerate(lines) if d["anchor"] in l]
    assert len(idx) == 1, (d["name"], d["anchor"], len(idx))
    i0 = idx[0]
    seg = "\n".join(lines[i0:i0 + d["span"]])
    f = fields.setdefault(d["name"], {})
    for old, field, args, tpl in d["reps"]:
        assert old in seg, (d["name"], old)
        if field == "@sell":  # two templates chosen at runtime
            new = f'mt("{d["name"]}", m.cells[id].dome ? "sellDomeButton" : "sellModuleButton", {args})'
            f["sellModuleButton"] = "{t:g.sellModule}: {cell} · +{sum}"
            f["sellDomeButton"] = "{t:g.sellDome}: {cell} · +{sum}"
        elif args is None and tpl is None:  # sellShare: title + label share the same key
            fld = "title" if old.startswith("title") else "confirmButton"
            new = field + f'mt("{d["name"]}", "{fld}")'
            f[fld] = "{t:g.sellShare}"
        elif args is None:  # inside a template literal
            new = field
            f[re.search(r'"(\w+)"\)\}$', field).group(1)] = tpl
        else:
            new = f'mt("{d["name"]}", "{field}"' + (f", {args})" if args else ")")
            f[field] = tpl
        seg = seg.replace(old, new)
    lines[i0:i0 + d["span"]] = seg.split("\n")
open(JS + "game.js", "w", encoding="utf8").write("\n".join(lines))
json.dump({"fields": fields, "labels": labels}, open("/app/memory/modals_spec.json", "w"), ensure_ascii=False, indent=1)
print({k: len(v) for k, v in fields.items()})
