import ollama

MODEL = "qwen3:14b"   # try "gpt-oss:20b" next

response = ollama.chat(
    model=MODEL,
    messages=[
        {"role": "system", "content": "You are Vernesser, a calm, professional office assistant."},
        {"role": "user", "content": "Introduce yourself in two sentences."},
    ],
    think=False,       # for gpt-oss, change this to think="low"
)

print(response.message.content)