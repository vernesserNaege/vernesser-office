// ---------- The office floor plan ----------
// Every zone has a position, a rotation (which way its FRONT faces),
// and an offset (how far in front of it Vernesser stands).

export const ZONES = {
  pc:         { label: "Workstation",    position: [0, 0, -3.6],    rotation: 0,             offset: 0.8 },
  bookshelf:  { label: "Bookshelf",      position: [-5.5, 0, -1.8], rotation: Math.PI / 2,   offset: 0.9 },
  whiteboard: { label: "Whiteboard",     position: [3.4, 0, -4.8],  rotation: 0,             offset: 1.1 },
  cabinet:    { label: "Filing Cabinet", position: [-5.0, 0, -4.5], rotation: 0,             offset: 0.9 },
  printer:    { label: "Printer",        position: [5.3, 0, -1.2],  rotation: -Math.PI / 2,  offset: 0.9 },
  clock:      { label: "Clock",          position: [-2.4, 0, -4.9], rotation: 0,             offset: 1.0 },
  coffee:     { label: "Coffee Corner",  position: [-5.4, 0, 2.6],  rotation: Math.PI / 2,   offset: 0.9 },
};

// ---------- The lounge (sofa + coffee table) ----------
export const SOFA = { position: [3.4, 0, 3.8], rotation: Math.PI }; // faces into the room
export const COFFEE_TABLE = [3.4, 0, 2.3];
export const SOFA_SIDE = [1.9, 0, 3.0];   // beside the table, so he walks AROUND it
export const SOFA_FRONT = [3.4, 0, 3.0];  // between the table and the sofa
export const SOFA_SEAT = [3.4, 0, 3.85];  // on the cushion

export const LOUNGE_PATH_IN = [SOFA_SIDE, SOFA_FRONT, SOFA_SEAT];  // how to get onto the sofa
export const LOUNGE_PATH_OUT = [SOFA_FRONT, SOFA_SIDE];            // how to get off it

// Department names and their monitor colors
export const ROLE_INFO = {
  general:   { label: "Front Desk",         color: "#c9a66b" },
  business:  { label: "Business & Finance", color: "#6b8fb5" },
  hr:        { label: "Human Resources",    color: "#c48a9a" },
  marketing: { label: "Marketing",          color: "#d08a5b" },
  web_dev:   { label: "Web Development",    color: "#7fa37a" },
  school:    { label: "School & Study",     color: "#9b88b8" },
};

// Which zone each tool uses
export const TOOL_ZONE = {
  read_file: "cabinet",
  list_files: "cabinet",
  create_pdf: "printer",
  get_current_time: "clock",
  write_file: "pc",
  create_word_document: "pc",
  create_excel_file: "pc",
};

// Where he goes to THINK, per department (anything not listed thinks at the PC)
export const THINK_ZONE = {
  school: "bookshelf",
  marketing: "whiteboard",
};

// 🧭 The single place that decides where Vernesser should be
export function zoneFor(status) {
  if (status.tool) return TOOL_ZONE[status.tool] || "pc";
  if (status.state === "thinking") return THINK_ZONE[status.role] || "pc";
  if (status.state === "working") return "pc";
  return "lounge"; // idle → coffee, then sofa ☕🛋️
}

// One zone → one job. A job has a PATH (list of points) instead of a single spot.
export function jobFor(key) {
  const zone = ZONES[key] || ZONES.pc;
  const [x, , z] = zone.position;
  const r = zone.rotation;
  return {
    key,
    path: [[x + zone.offset * Math.sin(r), 0, z + zone.offset * Math.cos(r)]],
    face: r + Math.PI,
    dwell: key === "pc" ? 0 : 1.5,
  };
}

// A zone can create SEVERAL jobs in a row (a routine)
export function jobsFor(key) {
  if (key === "lounge") {
    return [
      { ...jobFor("coffee"), dwell: 3, pose: "sip" },                              // ☕ grab a coffee
      { key: "sofa", path: LOUNGE_PATH_IN, face: SOFA.rotation, dwell: 0, pose: "sit" }, // 🛋️ sit down
    ];
  }
  return [jobFor(key)];
}