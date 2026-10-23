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
    "net.rejoin": ["Вернуться в партию", "Повернутися до партії", "Return to match"], "net.lost": ["Соединение потеряно — переподключаемся…", "З'єднання втрачено — перепідключаємося…", "Connection lost — reconnecting…"],
    "game.tabProps": ["Объекты", "Об'єкти", "Objects"],
  });

  // Tab session (survives reload) + last session in localStorage for «Return to match» after closing the tab
  const LAST = "mp.net.last";
  let session = JSON.parse(sessionStorage.getItem("mp.net") || "null"); // { code, token, seat }
  let room = null;
  let version = 0;
  let timer = null;
  let pushing = false;
  let pending = null;
  let ws = null;
  let wsOpen = false;
  let retry = 0;
  let retryTimer = null;
  let lostTimer = null;
  let deferred = null;
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
    if (s) {
      sessionStorage.setItem("mp.net", JSON.stringify(s));
      localStorage.setItem(LAST, JSON.stringify(s));
    } else {
      sessionStorage.removeItem("mp.net");
      localStorage.removeItem(LAST);
    }
  };

  /* ----- room updates (WebSocket push, polling as a safety net) ----- */
  const handle = (data) => {
    room = data;
    if (data.status === "lobby") renderLobby();
    if (data.state && data.version > version) {
      if (pushing || pending || window.MPGame.busy) {
        deferred = data; // apply after the local animation / push finishes
        setTimeout(() => deferred === data && handle(data), 250);
      } else {
        deferred = null;
        version = data.version;
        window.MPApp.applyRemote(data.state);
      }
    }
    (data.prompts || []).forEach((p) => {
      if (handled.has(p.id)) return;
      handled.add(p.id);
      window.MPGame.promptLocal(p.spec).then((value) => req("POST", `/rooms/${session.code}/prompts/${p.id}/answer`, { value: value ?? null }));
    });
    (data.answers || []).forEach((a) => {
      if (!waiters[a.id]) return;
      waiters[a.id](a.value);
      delete waiters[a.id];
      req("POST", `/rooms/${session.code}/prompts/${a.id}/ack`);
    });
  };
  const poll = async () => {
    if (!session) return;
    try {
      handle(await req("GET", `/rooms/${session.code}?since=${version}`));
      if (!wsOpen) setLost(!navigator.onLine);
    } catch (e) {
      if (e.status === 404 || e.status === 403) return leave();
      setLost(true);
    }
  };
  const setLost = (lost) => {
    clearTimeout(lostTimer);
    const banner = $("#net-banner");
    if (!lost) return (banner.hidden = true);
    lostTimer = setTimeout(() => (banner.hidden = !session || wsOpen), 2500);
  };
  const connect = () => {
    if (!session) return;
    clearTimeout(retryTimer);
    if (ws) {
      ws.onclose = null;
      ws.close();
    }
    const url = `${API.replace(/^http/, "ws")}/ws/rooms/${session.code}?token=${encodeURIComponent(session.token)}`;
    const sock = new WebSocket(url);
    ws = sock;
    sock.onopen = () => {
      wsOpen = true;
      retry = 0;
      setLost(false);
    };
    sock.onmessage = (ev) => {
      const data = JSON.parse(ev.data);
      if (data.type === "room") handle(data);
    };
    sock.onclose = (ev) => {
      if (ws !== sock) return;
      wsOpen = false;
      ws = null;
      if (ev.code === 4403) return leave();
      if (!session) return;
      setLost(true);
      retryTimer = setTimeout(connect, Math.min(8000, 1000 * 2 ** retry++));
    };
  };
  const startSync = () => {
    clearInterval(timer);
    timer = setInterval(() => (wsOpen ? ws.send("ping") : null, poll()), 4000);
    connect();
    poll();
  };
  // «Return to match»: reconnect and pull the full current state from the server
  const rejoin = () => {
    if (!session) {
      const last = JSON.parse(localStorage.getItem(LAST) || "null");
      if (!last) return;
      setSession(last);
    }
    version = 0;
    if (document.body.dataset.screen !== "game") window.MPApp.go("lobby");
    renderLobby();
    retry = 0;
    startSync();
  };
  window.addEventListener("offline", () => session && setLost(true));
  window.addEventListener("online", () => session && (retry = 0, connect(), poll()));

  // Push the full match state after every local change (versioned; server accepts only the current player or host)
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
          if (e.status === 409 || e.status === 403) version = 0; // out of sync: take the server state
          else window.MPApp.toast(e.message, "error");
        }
      }
      pushing = false;
      if (version === 0) poll();
    }, 30);
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
    startSync();
  };
  const join = async (code, name) => {
    const data = await req("POST", `/rooms/${code.toUpperCase()}/join`, { name });
    setSession({ code: data.code, token: data.token, seat: data.seat });
    room = data.room;
    version = 0;
    renderLobby();
    startSync();
  };
  const start = async () => {
    if (room.seats.some((s) => !s.joined)) return window.MPApp.toast(t("net.notFull"), "error");
    const state = window.MPApp.startOnline(room);
    version = (await req("POST", `/rooms/${session.code}/start`, { version: 0, state })).version;
    window.MPApp.applyRemote(state);
  };
  const leave = () => {
    clearInterval(timer);
    clearTimeout(retryTimer);
    if (ws) {
      ws.onclose = null;
      ws.close();
      ws = null;
    }
    wsOpen = false;
    $("#net-banner").hidden = true;
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
    if (b.id === "btn-rejoin" || b.id === "btn-net-rejoin") rejoin();
    if (b.id === "btn-lobby-copy") navigator.clipboard?.writeText(link()).then(() => window.MPApp.toast(t("net.copied")), () => $("#lobby-link").select());
  });
  document.addEventListener("langchange", () => document.body.dataset.screen === "lobby" && renderLobby());

  // Start screen: offer to return to an unfinished online match (tab closed / connection lost)
  const renderRejoin = () => {
    const btn = $("#btn-rejoin");
    const last = session || JSON.parse(localStorage.getItem(LAST) || "null");
    btn.hidden = !last;
  };
  window.MPNet = { get session() { return session; }, createRoom, prompt, push, leave, renderLobby, renderRejoin, rejoin };

  // Entry: invite link (?room=CODE), reload of the same tab, or a match left in another tab
  const code = new URLSearchParams(location.search).get("room");
  const last = JSON.parse(localStorage.getItem(LAST) || "null");
  if (session && (!code || code.toUpperCase() === session.code)) {
    window.MPApp.go("lobby");
    renderLobby();
    startSync();
  } else if (code && !(last && last.code === code.toUpperCase())) {
    sessionStorage.removeItem("mp.net");
    session = null;
    window.MPApp.go("lobby");
    renderLobby();
  } else if (last) {
    // verify the room still exists and the seat is still ours before offering the button
    fetch(`${API}/rooms/${last.code}`, { headers: { "X-Room-Token": last.token } })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((d) => {
        if (d.status === "finished") throw new Error("finished");
        room = d;
        renderRejoin();
        if (code) rejoin();
      })
      .catch(() => {
        localStorage.removeItem(LAST);
        renderRejoin();
      });
  }
})();
