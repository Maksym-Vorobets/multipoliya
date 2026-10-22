import asyncio, json, os, re
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv("/app/backend/.env")
SRC = "/app/frontend/public/js/cards-data.js"


async def translate(deck, texts):
    chat = LlmChat(api_key=os.environ["EMERGENT_LLM_KEY"], session_id=f"tr-{deck}",
                   system_message="You translate board game card texts. Keep numbers, currency symbols, planet and station names. Return only JSON.").with_model("openai", "gpt-5.2")
    prompt = ("Translate each Russian card text into English and Ukrainian. Return JSON object "
              '{"en": [...], "uk": [...]} with arrays of the same length and order.\n' + json.dumps(texts, ensure_ascii=False))
    raw = await chat.send_message(UserMessage(text=prompt))
    data = json.loads(re.search(r"\{.*\}", raw, re.S).group(0))
    assert len(data["en"]) == len(texts) == len(data["uk"])
    return data


async def main():
    src = open(SRC).read()
    data = json.loads(src.split("window.MPCardData = ", 1)[1].rstrip().rstrip(";"))
    results = await asyncio.gather(*[translate(k, [c["t"] for c in v]) for k, v in data.items()])
    for (k, v), tr in zip(data.items(), results):
        for i, c in enumerate(v):
            c["en"], c["uk"] = tr["en"][i], tr["uk"][i]
    open(SRC, "w").write("// Chance / Borgi decks: t = RU text from customer files, en/uk translations, e = effect\nwindow.MPCardData = "
                         + json.dumps(data, ensure_ascii=False) + ";\n")
    print("ok", sum(len(v) for v in data.values()))


asyncio.run(main())
