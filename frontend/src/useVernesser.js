import { useCallback, useEffect, useRef, useState } from "react";

export const API = "http://localhost:8000";
const WS_URL = "ws://localhost:8000/ws";

// How long (ms) each tool visit stays visible in the 3D office
const TOOL_HOLD_MS = 2500;

// Human-friendly names for each tool (also used for 3D animations later)
const TOOL_LABELS = {
  get_current_time: "Checking the clock",
  list_files: "Looking through the files",
  read_file: "Reading a file",
  write_file: "Writing a file",
  create_word_document: "Typing a Word document",
  create_excel_file: "Building a spreadsheet",
  create_pdf: "Printing a PDF",
};

export function useVernesser() {
  const [messages, setMessages] = useState([]); // { from: "you" | "vernesser" | "step", text }
  const [status, setStatus] = useState({
    state: "idle",          // idle | thinking | working
    role: "general",        // which department (matches STATIONS in layout.js)
    tool: null,             // which tool is running right now (e.g. "read_file")
    department: "Front Desk",
    activity: "",
  });
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [files, setFiles] = useState([]);
  const wsRef = useRef(null);
  const toolHoldRef = useRef(0); // time until which the current tool visit must stay visible

  const addMessage = (from, text) => setMessages((m) => [...m, { from, text }]);

  // Ask the server for the list of output files
  const refreshFiles = useCallback(async () => {
    try {
      const res = await fetch(`${API}/files`);
      const data = await res.json();
      setFiles(data.files);
    } catch {
      setFiles([]);
    }
  }, []);

  // Open the WebSocket once, when the page loads
  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => {
      setConnected(false);
      setBusy(false);
    };

    // Every event from the server lands here
    ws.onmessage = (e) => {
      const event = JSON.parse(e.data);

      if (event.type === "role") {
        setStatus((s) => ({
          ...s,
          role: event.role,
          department: event.title,
          activity: `Walking to ${event.title}`,
        }));
        addMessage("step", `🏢 ${event.title}: ${event.reason}`);
      } else if (event.type === "state") {
        const apply = () =>
          setStatus((s) => ({
            ...s,
            state: event.state,
            tool: null, // back to the desk to think, or done
            activity: event.state === "thinking" ? "Thinking..." : "",
          }));
        const wait = toolHoldRef.current - Date.now();
        if (wait > 0) setTimeout(apply, wait); // let him finish at the cabinet/printer first
        else apply();
      } else if (event.type === "tool") {
        const label = TOOL_LABELS[event.name] || event.name;
        toolHoldRef.current = Date.now() + TOOL_HOLD_MS; // stay visible for a while
        setStatus((s) => ({ ...s, state: "working", tool: event.name, activity: label }));
        addMessage("step", `🔧 ${label}`);
      } else if (event.type === "tool_result") {
        if (event.preview.startsWith("ERROR") || event.preview.startsWith("Error")) {
          addMessage("step", `⚠️ ${event.preview}`);
        }
      } else if (event.type === "reply") {
        addMessage("vernesser", event.text);
        setBusy(false);
        refreshFiles(); // he may have created new files
      }
    };

    refreshFiles();
    return () => ws.close(); // clean up when the page closes
  }, [refreshFiles]);

  // Send a message to Vernesser
  const send = (text) => {
    if (!text.trim() || busy || wsRef.current?.readyState !== WebSocket.OPEN) return;
    addMessage("you", text);
    setBusy(true);
    wsRef.current.send(JSON.stringify({ message: text }));
  };

  // Upload a file to workspace/uploads
  const upload = async (file) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API}/upload`, { method: "POST", body: form });
    const data = await res.json();
    addMessage("step", `📎 Uploaded ${data.saved}`);
    return data.saved;
  };

  return { messages, status, connected, busy, files, send, upload };
}