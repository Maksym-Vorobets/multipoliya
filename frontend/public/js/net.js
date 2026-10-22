(function () {
  const API = window.MP_API;
  const { t } = window.I18N;
  const $ = (s) => document.querySelector(s);
  const esc = (s) => window.MPApp.esc(s);

  window.I18N.extend({
    "net.create": ["Создать комнату", "Створити кімнату", "Create room"], "net.waiting": ["Ожидает игрока", "Очікує гравця", "Waiting for player"],
    "net.title": ["Онлайн-партия", "Онлайн-партія", "Online match"], "net.code": ["Код комнаты", "Код кімнати", "Room code"],
    "net.link": ["Ссылка-приглашение", "Посилання-запрошення", "Invite link"], "net.copy": ["Скопировать", "Скопіювати", "Copy"], "net.copied": ["Ссылка скопирована", "Посилання скопійовано", "Link copied"],
    "net.start": ["Начать партию", "Почати партію", "Start match"], "net.leave": ["Выйти из комнаты", "Вийти з кімнати", "Leave room"],
    "net.join": ["Присоединиться", "Приєднатися", "Join"], "net.yourName": ["Ваше имя", "Ваше ім'я", "Your name"],
    "net.joinSub": ["Вас пригласили в комнату {code}", "Вас запросили до кімнати {code}", "You are invited to room {code}"],
    "net.hostSub": ["Отправьте ссылку или код друзьям. Партия начнётся, когда все займут места.", "Надішліть посилання або код друзям. Партія почнеться, коли всі займуть місця.", "Share the link or code. The match starts when all seats are taken."],
    "net.guestSub": ["Ожидаем, пока хост начнёт партию", "Чекаємо, поки хост почне партію", "Waiting for the host to start"],
    "net.you": ["вы", "ви", "you"], "net.host": ["хост", "хост", "host"], "net.bot": ["бот", "бот", "bot"], "net.free": ["свободно", "вільно", "free"],
    "net.waitTurn": ["Ход игрока {name}…", "Хід гравця {name}…", "{name} is playing…"], "net.hostOnly": ["Подвести итоги может только хост", "Підбити підсумки може лише хост", "Only the host can finish"],
    "net.yourTurnOnly": ["Бонус доступен только в ваш ход", "Бонус доступний лише у ваш хід", "Bonus is available on your turn only"],
    "net.notFull": ["Ещё не все игроки присоединились", "Ще не всі гравці приєдналися", "Not all players have joined"], "net.codePh": ["Код, например K7QX2M", "Код, наприклад K7QX2M", "Code, e.g. K7QX2M"],
  });

  let session = JSON.parse(sessionStorage.getItem("mp.net") || "null"); // { code, token, seat }
  let room = null;
  let version = 0;
  let timer = null;
  let pushing = false;
  let pending = null;
  const handled = new Set();
  const waiters = {};

  const req = async (method, path, body) => {
    const r = await fetch(API + path, {
      method,
      headers: { "Content-Type": "application/json", ...(session ? { "X-Room-Token": session.token } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(typeof data.detail === "string" ? data.detail : "Error"), { status: r.status });
    return data;
  };
  const setSession = (s) => {
    session = s;
    s ? sessionStorage.setItem("mp.net", JSON.stringify(s)) : sessionStorage.removeItem("mp.net");
  };

  /* ----- polling: lobby, state sync, prompts ----- */
  const poll = async () => {
    if (!session) return;
    try {
      const data = await req("GET", `/rooms/${session.code}?since=${version}`);
      room = data;
      if (data.status === "lobby") renderLobby();
      if (data.state && data.version > version && !pushing && !pending && !window.MPGame.busy) {
        version = data.version;
        window.MPApp.applyRemote(data.state);
      }
      data.prompts.forEach((p) => {
        if (handled.has(p.id)) return;
        handled.add(p.id);
        window.MPGame.promptLocal(p.spec).then((value) => req("POST", `/rooms/${session.code}/prompts/${p.id}/answer`, { value: value ?? null }));
      });
      data.answers.forEach((a) => {
        if (!waiters[a.id]) return;
        waiters[a.id](a.value);
        delete waiters[a.id];
        req("POST", `/rooms/${session.code}/prompts/${a.id}/ack`);
      });
    } catch (e) {
      if (e.status === 404 || e.status === 403) leave();
    }
  };
  const startPolling = () => {
    clearInterval(timer);
    timer = setInterval(poll, 1200);
    poll();
  };

  // Push the full match state after every local change (debounced, versioned)
  const push = (m) => {
    pending = m;
    if (pushing) return;
    pushing = true;
    setTimeout(async () => {
      while (pending) {
        const state = JSON.parse(JSON.stringify(pending));
        pending = null;
        try {
          version = (await req("POST", `/rooms/${session.code}/state`, { version, state })).version;
        } catch (e) {
          if (e.status !== 409) window.MPApp.toast(e.message, "error");
        }
      }
      pushing = false;
    }, 150);
  };

  const prompt = async (seat, spec) => {
    const { id } = await req("POST", `/rooms/${session.code}/prompts`, { to: seat, spec });
    return new Promise((resolve) => {
      waiters[id] = resolve;
      setTimeout(() => waiters[id] && (delete waiters[id], resolve(null)), 120000);
    });
  };

  /* ----- room lifecycle ----- */
  const createRoom = async (opts) => {
    const data = await req("POST", "/rooms", opts);
    setSession({ code: data.code, token: data.token, seat: data.seat });
    room = data.room;
    version = 0;
    window.MPApp.go("lobby");
    renderLobby();
    startPolling();
  };
  const join = async (code, name) => {
    const data = await req("POST", `/rooms/${code.toUpperCase()}/join`, { name });
    setSession({ code: data.code, token: data.token, seat: data.seat });
    room = data.room;
    version = 0;
    renderLobby();
    startPolling();
  };
  const start = async () => {
    if (room.seats.some((s) => !s.joined)) return window.MPApp.toast(t("net.notFull"), "error");
    const state = window.MPApp.startOnline(room);
    version = (await req("POST", `/rooms/${session.code}/start`, { version: 0, state })).version;
    window.MPApp.applyRemote(state);
  };
  const leave = () => {
    clearInterval(timer);
    setSession(null);
    room = null;
    history.replaceState(null, "", location.pathname);
    window.MPApp.go("start");
  };

  /* ----- lobby UI ----- */
  const link = () => `${location.origin}/?room=${session.code}`;
  const renderLobby = () => {
    const joinBox = $("#lobby-join");
    const roomBox = $("#lobby-room");
    if (!session) {
      joinBox.hidden = false;
      roomBox.hidden = true;
      const code = new URLSearchParams(location.search).get("room") || "";
      $("#lobby-code-input").value = $("#lobby-code-input").value || code;
      $("#lobby-sub").textContent = code ? t("net.joinSub", { code }) : "";
      return;
    }
    joinBox.hidden = true;
    roomBox.hidden = false;
    if (!room) return;
    const host = session.seat === 0;
    $("#lobby-sub").textContent = host ? t("net.hostSub") : t("net.guestSub");
    $("#lobby-code").textContent = session.code;
    $("#lobby-link").value = link();
    $("#lobby-seats").innerHTML = room.seats.map((s) => `<li class="draw-item${s.idx === session.seat ? " is-current" : ""}" data-testid="lobby-seat-${s.idx}">
      <span class="p-dot c-${s.color}"></span>${esc(s.isBot ? t(`color.${s.color}`) : s.name || t("net.waiting"))}
      <span class="draw-res">${s.isBot ? `${t("net.bot")} · ${t(`bot.${s.botType}`)}` : s.joined ? (s.idx === 0 ? t("net.host") : "") + (s.idx === session.seat ? ` (${t("net.you")})` : "") : t("net.free")}</span></li>`).join("");
    $("#btn-lobby-start").hidden = !host;
    $("#btn-lobby-start").disabled = room.seats.some((s) => !s.joined);
  };

  document.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.id === "btn-lobby-join") {
      const code = $("#lobby-code-input").value.trim();
      const name = $("#lobby-name-input").value.trim();
      if (!code || !name) return window.MPApp.toast(t("setup.nameRequired"), "error");
      join(code, name).catch((err) => window.MPApp.toast(err.message, "error"));
    }
    if (b.id === "btn-lobby-start") start().catch((err) => window.MPApp.toast(err.message, "error"));
    if (b.id === "btn-lobby-leave") leave();
    if (b.id === "btn-lobby-copy") navigator.clipboard?.writeText(link()).then(() => window.MPApp.toast(t("net.copied")), () => $("#lobby-link").select());
  });
  document.addEventListener("langchange", () => document.body.dataset.screen === "lobby" && renderLobby());

  window.MPNet = { get session() { return session; }, createRoom, prompt, push, leave, renderLobby };

  // Entry: invite link (?room=CODE) or resumed session after reload
  const code = new URLSearchParams(location.search).get("room");
  if (session && (!code || code.toUpperCase() === session.code)) {
    window.MPApp.go("lobby");
    renderLobby();
    startPolling();
  } else if (code) {
    setSession(null);
    window.MPApp.go("lobby");
    renderLobby();
  }
})();
