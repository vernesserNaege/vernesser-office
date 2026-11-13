import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { API, useVernesser } from "./useVernesser";
import Office3D from "./office/Office3D";
import "./App.css";

export default function App() {
  const { messages, status, connected, busy, files, send, upload } =
    useVernesser();
  const [input, setInput] = useState("");
  const [dragging, setDragging] = useState(false);
  const bottomRef = useRef(null);

  // The newest reply from Vernesser (for the speech bubble in 3D)
  const lastReply = [...messages]
    .reverse()
    .find((m) => m.from === "vernesser")?.text;

  // Auto-scroll to the newest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const submit = (e) => {
    e.preventDefault(); // stop the page from reloading
    send(input);
    setInput("");
  };

  // Upload a file, then pre-fill the input so you can say what to do with it
  const handleFile = async (file) => {
    if (!file) return;
    const saved = await upload(file);
    setInput(`Read ${saved} and `);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="app">
      {/* ---------- LEFT: the 3D office ---------- */}
      <section className="office">
        <div className="office-stage">
          <Office3D status={status} lastReply={lastReply} />
          <div className="status-overlay">
            <strong>{status.department}</strong>
            <span>{status.activity || "On a coffee break ☕"}</span>
          </div>
        </div>

        <div className="files">
          <h3>📁 Outputs</h3>
          {files.length === 0 && <p className="muted">No files yet</p>}
          {files.map((f) => (
            <a
              key={f}
              href={`${API}/download/${encodeURI(f)}`}
              className="file"
            >
              ⬇ {f}
            </a>
          ))}
        </div>
      </section>

      {/* ---------- RIGHT: the chat ---------- */}
      <section
        className={`chat ${dragging ? "dragging" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <header>
          <h1>Vernesser</h1>
          <span className={connected ? "online" : "offline"}>
            {connected ? "● Online" : "● Offline"}
          </span>
        </header>

        <div className="messages">
          {messages.length === 0 && (
            <p className="muted">
              Give me a task, or drop a file here to get started.
            </p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.from}`}>
              {m.from === "vernesser" ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {m.text}
                </ReactMarkdown>
              ) : (
                m.text
              )}
            </div>
          ))}
          {busy && (
            <div className="msg step">⏳ {status.activity || "Working..."}</div>
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={submit}>
          <label className="attach" title="Attach a file">
            📎
            <input
              type="file"
              hidden
              onChange={(e) => {
                handleFile(e.target.files[0]);
                e.target.value = ""; // allow picking the same file again
              }}
            />
          </label>
          <input
            className="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              busy ? "Vernesser is working..." : "Give Vernesser a task..."
            }
            disabled={!connected}
          />
          <button disabled={busy || !connected}>Send</button>
        </form>
      </section>
    </div>
  );
}
