import { useEffect, useState } from "react";
import { API } from "./useVernesser";

const THINK_OPTIONS = {
  gptoss: [["low", "Low (fastest)"], ["medium", "Medium"], ["high", "High (smartest, slowest)"]],
  other: [["off", "Off (fast)"], ["on", "On (smarter, slower)"]],
};
const CONTEXT_OPTIONS = [
  [4096, "4K: least VRAM"],
  [8192, "8K"],
  [16384, "16K (default)"],
  [32768, "32K: long files, most VRAM"],
];
const KEEP_OPTIONS = [["5m", "5 minutes"], ["30m", "30 minutes"], ["2h", "2 hours"], ["-1", "Forever"]];

export default function SettingsPanel({ onClose }) {
  const [settings, setSettings] = useState(null);
  const [models, setModels] = useState({ installed: [], loaded: [] });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  // Ask the server which models are installed and which are on the GPU
  const loadModels = async () => {
    try {
      const res = await fetch(`${API}/models`);
      if (res.ok) setModels(await res.json());
      else setMessage("⚠️ Can't reach Ollama. Is it running?");
    } catch {
      setMessage("⚠️ Can't reach the server.");
    }
  };

  // Load everything once, when the panel opens
  useEffect(() => {
    fetch(`${API}/settings`)
      .then((r) => r.json())
      .then(setSettings)
      .catch(() => setMessage("⚠️ Can't reach the server."));
    loadModels();
  }, []);

  const isGptOss = settings?.model.startsWith("gpt-oss");
  const thinkOptions = isGptOss ? THINK_OPTIONS.gptoss : THINK_OPTIONS.other;

  // Change one setting. When the model changes, convert the thinking levels to fit it.
  const update = (key, value) =>
    setSettings((s) => {
      const next = { ...s, [key]: value };
      if (key === "model") {
        const gpt = value.startsWith("gpt-oss");
        for (const k of ["think_agent", "think_fast"]) {
          if (gpt && ["off", "on"].includes(next[k])) next[k] = next[k] === "on" ? "medium" : "low";
          if (!gpt && !["off", "on"].includes(next[k])) next[k] = next[k] === "low" ? "off" : "on";
        }
      }
      return next;
    });

  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`${API}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Invalid settings");
      setSettings(data);
      setMessage("✅ Saved. The new settings apply from your next message.");
    } catch (e) {
      setMessage(`⚠️ ${e.message}`);
    }
    setSaving(false);
  };

  const unload = async () => {
    await fetch(`${API}/models/unload`, { method: "POST" });
    setMessage("🧹 GPU memory freed.");
    loadModels();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⚙️ Brain settings</h2>
          <button type="button" className="secondary" onClick={onClose}>✕</button>
        </div>

        {!settings ? (
          <p className="muted">Loading...</p>
        ) : (
          <>
            <label className="field">
              🧠 Model
              <select value={settings.model} onChange={(e) => update("model", e.target.value)}>
                {models.installed.map((m) => (
                  <option key={m.name} value={m.name}>
                    {m.name} ({m.size_gb} GB)
                  </option>
                ))}
                {!models.installed.some((m) => m.name === settings.model) && (
                  <option value={settings.model}>{settings.model}</option>
                )}
              </select>
              <span className="field-help">
                {isGptOss
                  ? "gpt-oss always thinks. You choose how much."
                  : "Thinking can be on or off. Models that don't support it simply ignore it."}
              </span>
            </label>

            <label className="field">
              💭 Thinking for real work
              <select value={settings.think_agent} onChange={(e) => update("think_agent", e.target.value)}>
                {thinkOptions.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>

            <label className="field">
              ⚡ Thinking for quick decisions (router)
              <select value={settings.think_fast} onChange={(e) => update("think_fast", e.target.value)}>
                {thinkOptions.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>

            <label className="field">
              📏 Context size
              <select value={settings.num_ctx} onChange={(e) => update("num_ctx", Number(e.target.value))}>
                {CONTEXT_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <span className="field-help">
                How much he can "hold in mind" at once. Bigger = longer files, but more VRAM.
              </span>
            </label>

            <label className="field">
              ⏱️ Keep loaded on the GPU
              <select value={settings.keep_alive} onChange={(e) => update("keep_alive", e.target.value)}>
                {KEEP_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <span className="field-help">Longer = faster replies, but the VRAM stays used.</span>
            </label>

            <h3>🎮 On the GPU right now</h3>
            {models.loaded.length === 0 ? (
              <p className="muted">Nothing loaded. A model loads when you send a message.</p>
            ) : (
              models.loaded.map((m) => (
                <div key={m.name} className="loaded-model">
                  <strong>{m.name}</strong>
                  <span>
                    {m.vram_gb} GB VRAM · {m.gpu_percent}% GPU{" "}
                    {m.gpu_percent < 100 ? "⚠️ partly on CPU (slow)" : "✅"}
                  </span>
                </div>
              ))
            )}

            <div className="modal-actions">
              <button type="button" className="secondary" onClick={loadModels}>🔄 Refresh</button>
              <button type="button" className="secondary" onClick={unload}>🧹 Free GPU memory</button>
              <button type="button" onClick={save} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
            {message && <p className="modal-message">{message}</p>}
          </>
        )}
      </div>
    </div>
  );
}