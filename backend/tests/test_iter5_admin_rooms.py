# Iteration 5: admin auth/content + online rooms API
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
ADMIN = {"email": "admin@multipolia.app", "password": "Multipolia2026!"}


@pytest.fixture(scope="module")
def s():
    return requests.Session()


@pytest.fixture(scope="module")
def token(s):
    r = s.post(f"{BASE_URL}/api/auth/login", json=ADMIN)
    assert r.status_code == 200, r.text
    return r.json()["token"]


# --- Admin auth ---
class TestAdminAuth:
    def test_login_ok(self, s):
        r = s.post(f"{BASE_URL}/api/auth/login", json=ADMIN)
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d["token"], str) and d["role"] == "admin" and d["email"] == ADMIN["email"]

    def test_login_wrong(self, s):
        r = s.post(f"{BASE_URL}/api/auth/login", json={"email": "TEST_nobody@x.io", "password": "bad"})
        assert r.status_code == 401

    def test_me(self, s, token):
        r = s.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == ADMIN["email"] and "password_hash" not in d and "_id" not in d

    def test_me_no_token(self, s):
        assert s.get(f"{BASE_URL}/api/auth/me").status_code == 401
        assert s.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": "Bearer junk"}).status_code == 401


# --- Content ---
class TestContent:
    def test_get_content(self, s):
        r = s.get(f"{BASE_URL}/api/content")
        assert r.status_code == 200
        d = r.json()
        assert "texts" in d and "cards" in d

    def test_put_requires_auth(self, s):
        assert s.put(f"{BASE_URL}/api/admin/content", json={"texts": {}, "cards": {}}).status_code == 401

    def test_put_roundtrip_and_restore(self, s, token):
        orig = s.get(f"{BASE_URL}/api/content").json()
        h = {"Authorization": f"Bearer {token}"}
        body = {"texts": {"ru": {"TEST_key": "TEST_val"}}, "cards": {"kap_chance": {"0": {"en": "TEST_card"}}}}
        r = s.put(f"{BASE_URL}/api/admin/content", json=body, headers=h)
        assert r.status_code == 200 and r.json()["ok"] is True
        g = s.get(f"{BASE_URL}/api/content").json()
        assert g["texts"]["ru"]["TEST_key"] == "TEST_val"
        assert g["cards"]["kap_chance"]["0"]["en"] == "TEST_card"
        # restore
        r = s.put(f"{BASE_URL}/api/admin/content", json={"texts": orig.get("texts", {}), "cards": orig.get("cards", {})}, headers=h)
        assert r.status_code == 200


# --- Rooms ---
class TestRooms:
    def _create(self, s, real=2, total=3):
        r = s.post(f"{BASE_URL}/api/rooms", json={"scenario": "kap", "total": total, "real": real, "bots": ["neutral"] * total, "hostName": "TEST_Host"})
        assert r.status_code == 200, r.text
        return r.json()

    def test_create(self, s):
        d = self._create(s)
        assert d["seat"] == 0 and len(d["code"]) == 6 and d["token"]
        seats = d["room"]["seats"]
        assert len(seats) == 3 and seats[0]["name"] == "TEST_Host" and seats[0]["joined"]
        assert not seats[1]["joined"] and not seats[1]["isBot"]
        assert seats[2]["isBot"] and seats[2]["joined"]
        assert all("token" not in x for x in seats)

    def test_create_invalid(self, s):
        r = s.post(f"{BASE_URL}/api/rooms", json={"scenario": "kap", "total": 2, "real": 3, "bots": [], "hostName": "x"})
        assert r.status_code == 422
        r = s.post(f"{BASE_URL}/api/rooms", json={"scenario": "kap", "total": 2, "real": 2, "bots": [], "hostName": ""})
        assert r.status_code == 422

    def test_full_flow(self, s):
        d = self._create(s)
        code, ht = d["code"], d["token"]
        H = {"X-Room-Token": ht}
        # start before all joined -> 409
        r = s.post(f"{BASE_URL}/api/rooms/{code}/start", json={"version": 0, "state": {"phase": "x"}}, headers=H)
        assert r.status_code == 409
        # join lowercase code
        j = s.post(f"{BASE_URL}/api/rooms/{code.lower()}/join", json={"name": "TEST_Guest"})
        assert j.status_code == 200
        jd = j.json()
        assert jd["seat"] == 1 and jd["room"]["seats"][1]["name"] == "TEST_Guest"
        G = {"X-Room-Token": jd["token"]}
        # full -> 409
        assert s.post(f"{BASE_URL}/api/rooms/{code}/join", json={"name": "TEST_X"}).status_code == 409
        # GET
        g = s.get(f"{BASE_URL}/api/rooms/{code}?since=-1", headers=G).json()
        assert g["status"] == "lobby" and all(x["joined"] for x in g["seats"])
        # guest cannot start
        assert s.post(f"{BASE_URL}/api/rooms/{code}/start", json={"version": 0, "state": {}}, headers=G).status_code == 403
        # no token
        assert s.post(f"{BASE_URL}/api/rooms/{code}/start", json={"version": 0, "state": {}}).status_code == 403
        # host start
        r = s.post(f"{BASE_URL}/api/rooms/{code}/start", json={"version": 0, "state": {"phase": "await_roll", "n": 1}}, headers=H)
        assert r.status_code == 200 and r.json()["version"] == 1
        g = s.get(f"{BASE_URL}/api/rooms/{code}?since=0", headers=G).json()
        assert g["status"] == "playing" and g["state"]["n"] == 1 and g["version"] == 1
        assert s.get(f"{BASE_URL}/api/rooms/{code}?since=1", headers=G).json()["state"] is None
        # join after start -> 409
        assert s.post(f"{BASE_URL}/api/rooms/{code}/join", json={"name": "TEST_Late"}).status_code == 409
        # state push
        # iter6: guest is not on turn (no players in state) -> 403; host may push
        assert s.post(f"{BASE_URL}/api/rooms/{code}/state", json={"version": 1, "state": {"n": 2}}, headers=G).status_code == 403
        r = s.post(f"{BASE_URL}/api/rooms/{code}/state", json={"version": 1, "state": {"phase": "await_roll", "n": 2}}, headers=H)
        assert r.status_code == 200 and r.json()["version"] == 2
        r = s.post(f"{BASE_URL}/api/rooms/{code}/state", json={"version": 1, "state": {"n": 3}}, headers=H)
        assert r.status_code == 409
        assert s.post(f"{BASE_URL}/api/rooms/{code}/state", json={"version": 2, "state": {}}).status_code == 403
        assert s.get(f"{BASE_URL}/api/rooms/{code}?since=1", headers=H).json()["state"]["n"] == 2
        # prompts
        p = s.post(f"{BASE_URL}/api/rooms/{code}/prompts", json={"to": 1, "spec": {"kind": "vote"}}, headers=H)
        assert p.status_code == 200
        pid = p.json()["id"]
        g = s.get(f"{BASE_URL}/api/rooms/{code}", headers=G).json()
        assert any(x["id"] == pid for x in g["prompts"])
        # host cannot answer prompt addressed to guest
        assert s.post(f"{BASE_URL}/api/rooms/{code}/prompts/{pid}/answer", json={"value": 1}, headers=H).status_code == 404
        assert s.post(f"{BASE_URL}/api/rooms/{code}/prompts/{pid}/answer", json={"value": "yes"}, headers=G).status_code == 200
        assert s.post(f"{BASE_URL}/api/rooms/{code}/prompts/{pid}/answer", json={"value": "yes"}, headers=G).status_code == 404
        g = s.get(f"{BASE_URL}/api/rooms/{code}", headers=H).json()
        ans = [a for a in g["answers"] if a["id"] == pid]
        assert ans and ans[0]["value"] == "yes"
        assert s.post(f"{BASE_URL}/api/rooms/{code}/prompts/{pid}/ack", headers=H).status_code == 200
        g = s.get(f"{BASE_URL}/api/rooms/{code}", headers=H).json()
        assert not [a for a in g["answers"] if a["id"] == pid]
        # finished
        r = s.post(f"{BASE_URL}/api/rooms/{code}/state", json={"version": 2, "state": {"phase": "finished"}}, headers=H)
        assert r.status_code == 200
        assert s.get(f"{BASE_URL}/api/rooms/{code}").json()["status"] == "finished"

    def test_room_404(self, s):
        assert s.get(f"{BASE_URL}/api/rooms/ZZZZZZ").status_code == 404
        assert s.post(f"{BASE_URL}/api/rooms/ZZZZZZ/join", json={"name": "a"}).status_code == 404
