# Iteration 8: content-config (macro sliders, validation), presets CRUD, rooms macro
import copy
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
ADMIN = {"email": "admin@multipolia.app", "password": "Multipolia2026!"}
KEYS = ("defaultInflationRate", "defaultCreditRate", "fields", "cards", "systemModalsText")


def H(t):
    return {"Authorization": f"Bearer {t}"}


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN)
    if r.status_code != 200:
        pytest.skip("admin login failed")
    return r.json()["token"]


@pytest.fixture(scope="module")
def original():
    d = requests.get(f"{BASE_URL}/api/content-config").json()
    if not d.get("fields"):
        pytest.skip("no stored config")
    return {k: d[k] for k in KEYS if k in d}


@pytest.fixture(scope="module", autouse=True)
def restore(token, original):
    yield
    r = requests.put(f"{BASE_URL}/api/admin/content-config", json=original, headers=H(token))
    assert r.status_code == 200


# content-config validation
class TestConfig:
    def test_public_has_macro(self, original):
        assert original.get("defaultInflationRate") == 5
        assert original.get("defaultCreditRate") == 2

    def test_put_no_token(self, original):
        assert requests.put(f"{BASE_URL}/api/admin/content-config", json=original).status_code == 401

    def test_negative_price(self, token, original):
        b = copy.deepcopy(original)
        b["fields"][0]["basePrice"] = -1
        assert requests.put(f"{BASE_URL}/api/admin/content-config", json=b, headers=H(token)).status_code == 422

    @pytest.mark.parametrize("k,v", [("defaultInflationRate", 11), ("defaultCreditRate", 10.5), ("defaultCreditRate", -1)])
    def test_slider_out_of_range(self, token, original, k, v):
        b = copy.deepcopy(original)
        b[k] = v
        assert requests.put(f"{BASE_URL}/api/admin/content-config", json=b, headers=H(token)).status_code == 422

    def test_put_macro_persist(self, token, original):
        b = copy.deepcopy(original)
        b["defaultInflationRate"] = 7
        b["defaultCreditRate"] = 3
        assert requests.put(f"{BASE_URL}/api/admin/content-config", json=b, headers=H(token)).status_code == 200
        g = requests.get(f"{BASE_URL}/api/content-config").json()
        assert g["defaultInflationRate"] == 7 and g["defaultCreditRate"] == 3
        requests.put(f"{BASE_URL}/api/admin/content-config", json=original, headers=H(token))


# presets
class TestPresets:
    def test_list_requires_auth(self):
        assert requests.get(f"{BASE_URL}/api/admin/presets").status_code == 401

    def test_post_requires_auth(self, original):
        assert requests.post(f"{BASE_URL}/api/admin/presets", json={"presetName": "TEST_x", "configData": original}).status_code == 401

    def test_empty_name_422(self, token, original):
        assert requests.post(f"{BASE_URL}/api/admin/presets", json={"presetName": "", "configData": original}, headers=H(token)).status_code == 422

    def test_create_get_list(self, token, original):
        cd = copy.deepcopy(original)
        moon = next(f for f in cd["fields"] if f["id"] == "moon")
        moon["basePrice"] = 99
        r = requests.post(f"{BASE_URL}/api/admin/presets", json={"presetName": "TEST_pytest_preset", "configData": cd}, headers=H(token))
        assert r.status_code == 200
        pid = r.json()["id"]
        assert isinstance(pid, str) and r.json()["presetName"] == "TEST_pytest_preset"
        lst = requests.get(f"{BASE_URL}/api/admin/presets", headers=H(token)).json()
        item = next(p for p in lst if p["id"] == pid)
        assert "configData" not in item and "_id" not in item
        g = requests.get(f"{BASE_URL}/api/admin/presets/{pid}", headers=H(token))
        assert g.status_code == 200
        d = g.json()
        assert "_id" not in d
        assert next(f for f in d["configData"]["fields"] if f["id"] == "moon")["basePrice"] == 99
        assert d["configData"]["defaultInflationRate"] == original["defaultInflationRate"]

    def test_get_missing_404(self, token):
        assert requests.get(f"{BASE_URL}/api/admin/presets/doesnotexist", headers=H(token)).status_code == 404


# rooms macro
class TestRoomMacro:
    def test_room_bad_macro_422(self):
        r = requests.post(f"{BASE_URL}/api/rooms", json={"scenario": "kap_kap", "total": 2, "real": 2, "hostName": "TEST_h", "inflationRate": 20})
        assert r.status_code == 422

    def test_room_macro_ok(self):
        r = requests.post(f"{BASE_URL}/api/rooms", json={"scenario": "kap_kap", "total": 2, "real": 2, "hostName": "TEST_h", "inflationRate": 4, "creditRate": 1})
        assert r.status_code == 200, r.text
