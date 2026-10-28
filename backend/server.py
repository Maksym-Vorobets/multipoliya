from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import asyncio
import logging
import random
import secrets
import string
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Header, Request, WebSocket, WebSocketDisconnect
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from starlette.middleware.cors import CORSMiddleware

client = AsyncIOMotorClient(os.environ["MONGO_URL"], serverSelectionTimeoutMS=5000)
db = client[os.environ["DB_NAME"]]

app = FastAPI()
api = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")

COLORS = ["blue", "violet", "yellow", "red"]
now = lambda: datetime.now(timezone.utc)


# ---------------- Admin auth (JWT bearer) ----------------
JWT_ALG = "HS256"


def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def verify_password(p: str, h: str) -> bool:
    return bcrypt.checkpw(p.encode(), h.encode())


def make_token(uid: str, email: str) -> str:
    payload = {"sub": uid, "email": email, "type": "access", "exp": now() + timedelta(hours=12)}
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm=JWT_ALG)


async def require_admin(authorization: Optional[str]) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(authorization[7:], os.environ["JWT_SECRET"], algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")
    user = await db.users.find_one({"email": payload.get("email"), "role": "admin"}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user


class LoginIn(BaseModel):
    email: str
    password: str


@api.get("/health")
async def health():
    try:
        await db.command("ping")
        return {"ok": True, "db": "ok"}
    except Exception as e:
        raise HTTPException(503, f"Database unavailable: {type(e).__name__}")


@api.post("/auth/login")
async def login(body: LoginIn, request: Request):
    email = body.email.strip().lower()
    fwd = request.headers.get("x-forwarded-for", "")
    ip = fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else "x")
    ident = f"{ip}:{email}"
    att = await db.login_attempts.find_one({"identifier": ident})
    if att and att.get("count", 0) >= 5 and att.get("until") and datetime.fromisoformat(att["until"]) > now():
        raise HTTPException(429, "Too many attempts. Try again in 15 minutes")
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        count = (att or {}).get("count", 0) + 1
        await db.login_attempts.update_one({"identifier": ident}, {"$set": {"count": count, "until": (now() + timedelta(minutes=15)).isoformat()}}, upsert=True)
        raise HTTPException(401, "Invalid email or password")
    await db.login_attempts.delete_one({"identifier": ident})
    return {"token": make_token(user["id"], email), "email": email, "role": user["role"]}


@api.get("/auth/me")
async def me(authorization: Optional[str] = Header(None)):
    return await require_admin(authorization)


# ---------------- Editable content (rules, UI texts, cards) ----------------
class ContentIn(BaseModel):
    texts: Dict[str, Dict[str, str]] = Field(default_factory=dict)  # lang -> key -> text
    cards: Dict[str, Dict[str, Dict[str, str]]] = Field(default_factory=dict)  # deck -> index -> {t,en,uk}


@api.get("/content")
async def get_content():
    doc = await db.content.find_one({"key": "main"}, {"_id": 0, "key": 0})
    return doc or {"texts": {}, "cards": {}}


@api.put("/admin/content")
async def put_content(body: ContentIn, authorization: Optional[str] = Header(None)):
    user = await require_admin(authorization)
    doc = {"key": "main", **body.model_dump(), "updated_at": now().isoformat(), "updated_by": user["email"]}
    await db.content.replace_one({"key": "main"}, doc, upsert=True)
    return {"ok": True, "updated_at": doc["updated_at"]}


# ---------------- Online rooms (host-authoritative state sync) ----------------
class RoomCreate(BaseModel):
    scenario: str
    total: int = Field(ge=2, le=4)
    real: int = Field(ge=2, le=4)
    bots: List[str] = Field(default_factory=list)
    hostName: str = Field(min_length=1, max_length=16)


class JoinIn(BaseModel):
    name: str = Field(min_length=1, max_length=16)


class StateIn(BaseModel):
    version: int
    state: Dict[str, Any]


class PromptIn(BaseModel):
    to: int
    spec: Dict[str, Any]


class AnswerIn(BaseModel):
    value: Any = None


def public_room(room: dict, seat: Optional[int], since: int) -> dict:
    return {
        "code": room["code"], "status": room["status"], "scenario": room["scenario"], "version": room["version"],
        "hostSeat": 0, "seats": [{k: v for k, v in s.items() if k != "token"} for s in room["seats"]],
        "state": room.get("state") if room["version"] > since else None,
        "prompts": [p for p in room.get("prompts", []) if p["to"] == seat and not p["answered"]],
        "answers": [p for p in room.get("prompts", []) if p["from"] == seat and p["answered"]],
    }


async def load_room(code: str) -> dict:
    room = await db.rooms.find_one({"code": code.upper()}, {"_id": 0, "created_dt": 0})
    if not room:
        raise HTTPException(404, "Room not found")
    return room


def seat_of(room: dict, token: Optional[str]) -> Optional[int]:
    for s in room["seats"]:
        if token and s.get("token") == token:
            return s["idx"]
    return None


def current_seat(room: dict) -> Optional[int]:
    state = room.get("state") or {}
    players = state.get("players") or []
    active = state.get("active", 0)
    return players[active].get("idx") if isinstance(active, int) and 0 <= active < len(players) else None


# ----- live updates: one WebSocket per seat, every room change is pushed to everybody -----
ROOM_SOCKETS: Dict[str, List[tuple]] = {}


async def broadcast(code: str) -> None:
    conns = ROOM_SOCKETS.get(code) or []
    if not conns:
        return
    room = await db.rooms.find_one({"code": code}, {"_id": 0, "created_dt": 0})
    if not room:
        return
    for conn in list(conns):
        ws, seat = conn
        try:
            await ws.send_json({"type": "room", **public_room(room, seat, -1)})
        except Exception:
            if conn in conns:
                conns.remove(conn)


def notify(code: str) -> None:
    asyncio.create_task(broadcast(code))


def need_seat(room: dict, token: Optional[str]) -> int:
    seat = seat_of(room, token)
    if seat is None:
        raise HTTPException(403, "Not a member of this room")
    return seat


@api.post("/rooms")
async def create_room(body: RoomCreate):
    if body.real > body.total:
        raise HTTPException(422, "real must be <= total")
    code = "".join(random.choices(string.ascii_uppercase.replace("O", "").replace("I", "") + "23456789", k=6))
    token = secrets.token_urlsafe(16)
    seats = []
    for i in range(body.total):
        human = i < body.real
        seats.append({
            "idx": i, "color": COLORS[i], "isBot": not human,
            "botType": None if human else (body.bots[i] if i < len(body.bots) else "neutral"),
            "name": body.hostName if i == 0 else None, "joined": i == 0 or not human,
            **({"token": token} if i == 0 else {}),
        })
    room = {"code": code, "status": "lobby", "scenario": body.scenario, "version": 0, "seats": seats, "prompts": [], "created_at": now().isoformat(), "created_dt": now()}
    await db.rooms.insert_one(room)
    return {"code": code, "token": token, "seat": 0, "room": public_room(room, 0, -1)}


@api.post("/rooms/{code}/join")
async def join_room(code: str, body: JoinIn):
    room = await load_room(code)
    if room["status"] != "lobby":
        raise HTTPException(409, "Game already started")
    free = next((s for s in room["seats"] if not s["isBot"] and not s["joined"]), None)
    if not free:
        raise HTTPException(409, "Room is full")
    token = secrets.token_urlsafe(16)
    res = await db.rooms.update_one(
        {"code": room["code"], "seats": {"$elemMatch": {"idx": free["idx"], "joined": False}}},
        {"$set": {f"seats.{free['idx']}.joined": True, f"seats.{free['idx']}.name": body.name.strip(), f"seats.{free['idx']}.token": token}},
    )
    if not res.modified_count:
        raise HTTPException(409, "Seat taken, try again")
    room = await load_room(code)
    notify(room["code"])
    return {"code": room["code"], "token": token, "seat": free["idx"], "room": public_room(room, free["idx"], -1)}


@api.get("/rooms/{code}")
async def get_room(code: str, since: int = -1, x_room_token: Optional[str] = Header(None)):
    room = await load_room(code)
    return public_room(room, seat_of(room, x_room_token), since)


@api.post("/rooms/{code}/start")
async def start_room(code: str, body: StateIn, x_room_token: Optional[str] = Header(None)):
    room = await load_room(code)
    if need_seat(room, x_room_token) != 0:
        raise HTTPException(403, "Only the host can start")
    if any(not s["joined"] for s in room["seats"]):
        raise HTTPException(409, "Not all players joined")
    await db.rooms.update_one({"code": room["code"]}, {"$set": {"status": "playing", "state": body.state, "version": 1}})
    notify(room["code"])
    return {"version": 1}


@api.post("/rooms/{code}/state")
async def push_state(code: str, body: StateIn, x_room_token: Optional[str] = Header(None)):
    room = await load_room(code)
    seat = need_seat(room, x_room_token)
    # Only the player whose turn it is (or the host, who also drives the bots) may change the match
    if seat != 0 and seat != current_seat(room):
        raise HTTPException(403, "Not your turn")
    old_seats = sorted(p.get("idx") for p in (room.get("state") or {}).get("players", []))
    new_seats = sorted(p.get("idx") for p in body.state.get("players", []) if isinstance(p, dict))
    if old_seats and old_seats != new_seats:
        raise HTTPException(422, "Players cannot be changed")
    res = await db.rooms.update_one(
        {"code": room["code"], "version": body.version},
        {"$set": {"state": body.state, "status": "finished" if body.state.get("phase") == "finished" else "playing"}, "$inc": {"version": 1}},
    )
    if not res.modified_count:
        raise HTTPException(409, "Version conflict")
    notify(room["code"])
    return {"version": body.version + 1}


@api.post("/rooms/{code}/prompts")
async def create_prompt(code: str, body: PromptIn, x_room_token: Optional[str] = Header(None)):
    room = await load_room(code)
    seat = need_seat(room, x_room_token)
    prompt = {"id": uuid.uuid4().hex, "from": seat, "to": body.to, "spec": body.spec, "answered": False, "value": None}
    await db.rooms.update_one({"code": room["code"]}, {"$push": {"prompts": prompt}})
    notify(room["code"])
    return {"id": prompt["id"]}


@api.post("/rooms/{code}/prompts/{pid}/answer")
async def answer_prompt(code: str, pid: str, body: AnswerIn, x_room_token: Optional[str] = Header(None)):
    room = await load_room(code)
    seat = need_seat(room, x_room_token)
    res = await db.rooms.update_one(
        {"code": room["code"], "prompts": {"$elemMatch": {"id": pid, "to": seat, "answered": False}}},
        {"$set": {"prompts.$.answered": True, "prompts.$.value": body.value}},
    )
    if not res.modified_count:
        raise HTTPException(404, "Prompt not found")
    notify(room["code"])
    return {"ok": True}


@api.post("/rooms/{code}/prompts/{pid}/ack")
async def ack_prompt(code: str, pid: str, x_room_token: Optional[str] = Header(None)):
    room = await load_room(code)
    seat = need_seat(room, x_room_token)
    await db.rooms.update_one({"code": room["code"]}, {"$pull": {"prompts": {"id": pid, "from": seat}}})
    return {"ok": True}


@api.websocket("/ws/rooms/{code}")
async def room_socket(ws: WebSocket, code: str, token: str = ""):
    room = await db.rooms.find_one({"code": code.upper()}, {"_id": 0, "created_dt": 0})
    seat = seat_of(room, token) if room else None
    if seat is None:
        await ws.close(code=4403)
        return
    await ws.accept()
    conn = (ws, seat)
    ROOM_SOCKETS.setdefault(room["code"], []).append(conn)
    try:
        await ws.send_json({"type": "room", **public_room(room, seat, -1)})
        while True:
            if await ws.receive_text() == "ping":
                await ws.send_json({"type": "pong"})
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.info("room socket closed: %s", e)
    finally:
        conns = ROOM_SOCKETS.get(room["code"], [])
        if conn in conns:
            conns.remove(conn)


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.rooms.create_index("code", unique=True)
    await db.rooms.create_index("created_dt", expireAfterSeconds=172800)
    email = os.environ["ADMIN_EMAIL"].lower()
    password = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": email})
    if not existing:
        await db.users.insert_one({"id": uuid.uuid4().hex, "email": email, "password_hash": hash_password(password), "name": "Admin", "role": "admin", "created_at": now().isoformat()})
    elif not verify_password(password, existing["password_hash"]):
        await db.users.update_one({"email": email}, {"$set": {"password_hash": hash_password(password)}})


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
