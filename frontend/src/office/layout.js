// The office floor plan.
// position = [x, y, z] on the floor. rotation = which way the desk faces (radians).

export const STATIONS = {
  general:   { label: "Front Desk",         position: [0, 0, 3.5],  rotation: Math.PI, color: "#eab308" },
  business:  { label: "Business & Finance", position: [-5, 0, -3],  rotation: 0,       color: "#3b82f6" },
  hr:        { label: "Human Resources",    position: [-5, 0, 1.5], rotation: 0,       color: "#ec4899" },
  marketing: { label: "Marketing",          position: [0, 0, -4],   rotation: 0,       color: "#f97316" },
  web_dev:   { label: "Web Development",    position: [5, 0, -3],   rotation: 0,       color: "#22c55e" },
  school:    { label: "School & Study",     position: [5, 0, 1.5],  rotation: 0,       color: "#a855f7" },
};

export const PROPS = {
  cabinet: { label: "Filing Cabinet", position: [-7.2, 0, -5] },
  printer: { label: "Printer",        position: [7.2, 0, 4.5] },
};

// Which tools send Vernesser to a prop instead of his desk
export const TOOL_PROP = {
  read_file: "cabinet",
  list_files: "cabinet",
  create_pdf: "printer",
};

// Where Vernesser stands when working at a desk (0.8 in front of it, rotated with the desk)
export function deskSpot(station) {
  const [x, , z] = station.position;
  const r = station.rotation;
  return [x + 0.8 * Math.sin(r), 0, z + 0.8 * Math.cos(r)];
}

// Where Vernesser stands when using a prop (just in front of it)
export function propSpot(prop) {
  const [x, , z] = prop.position;
  return [x, 0, z + 0.9];
}

// Turn a place (a department key or a prop key) into a job for the action queue.
//   spot  = where to stand
//   face  = which way to look when there (radians)
//   dwell = minimum seconds to stay before moving on to the next job
export function jobFor(key) {
  if (PROPS[key]) {
    return { key, spot: propSpot(PROPS[key]), face: Math.PI, dwell: 1.5 }; // look at the prop
  }
  const station = STATIONS[key] || STATIONS.general;
  return { key, spot: deskSpot(station), face: station.rotation + Math.PI, dwell: 0 }; // look at the desk
}