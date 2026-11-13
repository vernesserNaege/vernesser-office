# ---------- The brain settings: change models here only ----------

# Option 1: gpt-oss (stronger, always reasons)
MODEL = "gpt-oss:20b"
THINK_AGENT = "high"   # how hard to think for real work: "low" | "medium" | "high"
THINK_FAST = "low"       # quick decisions like routing

# Option 2: qwen3 (faster) — to switch back, comment out Option 1 and uncomment these:
# MODEL = "qwen3:14b"
# THINK_AGENT = False
# THINK_FAST = False