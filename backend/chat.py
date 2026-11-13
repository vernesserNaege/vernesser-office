import ollama

MODEL = "qwen3:14b"
SYSTEM_PROMPT = """You are Vernesser, a calm, professional office assistant.
Give clear, well-organized answers. If a task is unclear, ask one short question first."""


def main():
    # The memory: starts with just the job description
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    print("Vernesser is ready. Commands: /history, /reset, exit\n")

    while True:
        user_input = input("You: ").strip()

        # --- commands ---
        if user_input.lower() in ("exit", "quit"):
            print("Vernesser: Goodbye.")
            break
        if not user_input:
            continue
        if user_input == "/history":
            for m in messages:
                print(f"  [{m['role']}] {(m['content'] or '')[:60].replace(chr(10), ' ')}")
            print(f"  ({len(messages)} messages in memory)\n")
            continue
        if user_input == "/reset":
            messages = [{"role": "system", "content": SYSTEM_PROMPT}]
            print("  (memory cleared)\n")
            continue

        # 1. Add what you said to memory
        messages.append({"role": "user", "content": user_input})

        # 2. Send the WHOLE memory, and stream the reply word by word
        print("Vernesser: ", end="", flush=True)
        reply = ""
        for chunk in ollama.chat(model=MODEL, messages=messages, stream=True, think=False):
            piece = chunk.message.content or ""
            print(piece, end="", flush=True)
            reply += piece
        print("\n")

        # 3. Add his reply to memory too
        messages.append({"role": "assistant", "content": reply})


if __name__ == "__main__":
    main()