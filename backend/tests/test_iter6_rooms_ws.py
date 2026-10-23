# Iteration 6: room state push permissions (turn seat/host), seat-set validation, version conflict, WebSocket
import os
import json
import asyncio
import pytest
import requests
import websockets

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
WS_URL = BASE_URL.replace("https://", "wss://").replace("http://", "ws://")


def mkstate(active, idxs=(0, 1, 2)):
    return {"phase": "play", "active": active, "players": [{"idx": i, "name": f"P{i}"} for i in idxs]}


@pytest.fixture(scope="module")
def room():
    r = requests.post(f"{BASE_URL}/api/rooms", json={"scenario": "kap_nar", "total": 3, "real": 3, "hostName": "TEST_host"})
    assert r.status_code == 200, r.text
    d = r.json()
    g1 = requests.post(f"{BASE_URL}/api/rooms/{d['code']}/join", json={"name": "TEST_g1"}).json()
    g2 = requests.post(f"{BASE_URL}/api/rooms/{d['code']}/join", json={"name": "TEST_g2"}).json()
    assert g1["seat"] == 1 and g2["seat"] == 2
    st = requests.post(f"{BASE_URL}/api/rooms/{d['code']}/start", json={"version": 0, "state": mkstate(0)}, headers={"X-Room-Token": d["token"]})
    assert st.status_code == 200 and st.json()["version"] == 1
    return {"code": d["code"], "host": d["token"], "g1": g1["token"], "g2": g2["token"]}


def push(room, tok, version, state):
    return requests.post(f"{BASE_URL}/api/rooms/{room['code']}/state", json={"version": version, "state": state}, headers={"X-Room-Token": tok})


def ver(room):
    return requests.get(f"{BASE_URL}/api/rooms/{room['code']}", headers={"X-Room-Token": room["host"]}).json()["version"]


class TestPushState:
    def test_guest_not_turn_403(self, room):
        # active=0 -> seat 1 may not push
        r = push(room, room["g1"], ver(room), mkstate(1))
        assert r.status_code == 403 and "Not your turn" in r.text

    def test_host_can_push_and_pass_turn(self, room):
        v = ver(room)
        r = push(room, room["host"], v, mkstate(1))
        assert r.status_code == 200 and r.json()["version"] == v + 1

    def test_current_guest_can_push(self, room):
        v = ver(room)
        r = push(room, room["g1"], v, mkstate(2))
        assert r.status_code == 200

    def test_previous_guest_now_403(self, room):
        r = push(room, room["g1"], ver(room), mkstate(0))
        assert r.status_code == 403

    def test_other_guest_turn(self, room):
        r = push(room, room["g2"], ver(room), mkstate(0))
        assert r.status_code == 200

    def test_seat_change_422(self, room):
        r = push(room, room["host"], ver(room), mkstate(0, (0, 1)))
        assert r.status_code == 422

    def test_version_conflict_409(self, room):
        r = push(room, room["host"], ver(room) - 1, mkstate(0))
        assert r.status_code == 409

    def test_bad_token_403(self, room):
        r = push(room, "badtoken", ver(room), mkstate(0))
        assert r.status_code == 403


class TestWebSocket:
    def test_ws_initial_and_broadcast(self, room):
        async def run():
            async with websockets.connect(f"{WS_URL}/api/ws/rooms/{room['code']}?token={room['g1']}") as ws:
                first = json.loads(await asyncio.wait_for(ws.recv(), 10))
                assert first["type"] == "room" and first["code"] == room["code"]
                v = ver(room)
                assert push(room, room["host"], v, mkstate(0)).status_code == 200
                msg = json.loads(await asyncio.wait_for(ws.recv(), 5))
                assert msg["type"] == "room" and msg["version"] == v + 1
                await ws.send("ping")
                pong = json.loads(await asyncio.wait_for(ws.recv(), 5))
                assert pong["type"] == "pong"
        asyncio.run(run())

    def test_ws_invalid_token_closes_4403(self, room):
        async def run():
            try:
                async with websockets.connect(f"{WS_URL}/api/ws/rooms/{room['code']}?token=bad") as ws:
                    await asyncio.wait_for(ws.recv(), 5)
                return None
            except websockets.exceptions.ConnectionClosed as e:
                return e.rcvd.code if e.rcvd else None
            except Exception as e:
                return str(e)
        res = asyncio.run(run())
        assert res == 4403 or "403" in str(res), res
