import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";

// ---------- The 3D color palette (matches the CSS cream palette) ----------
export const C = {
  floor: "#e6d6bb",
  wallBack: "#f6efe3",
  wallSide: "#efe5d3",
  wood: "#c8a77e",
  woodDark: "#9c7b56",
  cream: "#f3ead9",
  creamDark: "#e2d4bb",
  fabric: "#d9c3a0",
  metal: "#b9ad9b",
  dark: "#3b3026",
  white: "#fbf8f2",
  leaf: "#8fae7e",
};

// ---------- Helper: one box, with optional glow ----------
export function Box({ args, position, color, emissive = "#000000", glow = 0, cast = true }) {
  return (
    <mesh position={position} castShadow={cast} receiveShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={glow} />
    </mesh>
  );
}

// ---------- Floating name label ----------
export function Label({ text, position, active }) {
  return (
    <Html position={position} center distanceFactor={12}>
      <div className={`label3d ${active ? "active" : ""}`}>{text}</div>
    </Html>
  );
}

// ---------- Workstation: desk, monitor (shows the department color), keyboard, mug, chair ----------
export function Workstation({ roleInfo, busy }) {
  const legs = [[-0.92, -0.38], [0.92, -0.38], [-0.92, 0.38], [0.92, 0.38]];
  return (
    <group>
      <Box args={[2, 0.08, 0.9]} position={[0, 0.75, 0]} color={C.wood} />
      {legs.map(([x, z], i) => (
        <Box key={i} args={[0.06, 0.74, 0.06]} position={[x, 0.37, z]} color={C.woodDark} />
      ))}
      {/* monitor stand, frame, and glowing screen */}
      <Box args={[0.08, 0.3, 0.08]} position={[0, 0.93, -0.25]} color={C.dark} />
      <Box args={[0.9, 0.52, 0.05]} position={[0, 1.3, -0.28]} color={C.dark} />
      <Box
        args={[0.82, 0.44, 0.01]}
        position={[0, 1.3, -0.25]}
        color={roleInfo.color}
        emissive={roleInfo.color}
        glow={busy ? 0.7 : 0.15}
        cast={false}
      />
      {/* keyboard and mug */}
      <Box args={[0.6, 0.03, 0.2]} position={[0, 0.8, 0.1]} color={C.white} />
      <mesh position={[0.6, 0.85, 0.1]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 0.12, 16]} />
        <meshStandardMaterial color={C.white} />
      </mesh>
      {/* chair */}
      <Box args={[0.55, 0.08, 0.55]} position={[0, 0.45, 0.75]} color={C.fabric} />
      <Box args={[0.55, 0.6, 0.06]} position={[0, 0.78, 1.0]} color={C.fabric} />
      <Box args={[0.06, 0.41, 0.06]} position={[0, 0.2, 0.75]} color={C.metal} />
    </group>
  );
}

// ---------- Bookshelf (school thinking spot) ----------
export function Bookshelf({ active }) {
  const colors = ["#c98f7a", "#8fa9c4", "#d8b56a", "#9bb48f", "#b39cc4"];
  return (
    <group>
      <Box args={[1.4, 2.2, 0.45]} position={[0, 1.1, 0]} color={C.wood} emissive="#ffffff" glow={active ? 0.12 : 0} />
      {[0.45, 1.05, 1.65].map((y, row) => (
        <group key={row}>
          <Box args={[1.3, 0.04, 0.4]} position={[0, y - 0.22, 0.03]} color={C.woodDark} />
          {colors.map((_, i) => (
            <Box
              key={i}
              args={[0.14, 0.38, 0.3]}
              position={[-0.45 + i * 0.2 + (row % 2) * 0.05, y, 0.1]}
              color={colors[(i + row) % colors.length]}
            />
          ))}
        </group>
      ))}
    </group>
  );
}

// ---------- Whiteboard with sticky notes (marketing thinking spot) ----------
export function Whiteboard({ active }) {
  const notes = [[-0.7, 1.75, "#f2d27a"], [-0.25, 1.45, "#e8a8b8"], [0.35, 1.8, "#a9c4e0"], [0.75, 1.4, "#b9d3a5"]];
  return (
    <group>
      <Box args={[0.06, 1.2, 0.06]} position={[-1.1, 0.6, 0]} color={C.metal} />
      <Box args={[0.06, 1.2, 0.06]} position={[1.1, 0.6, 0]} color={C.metal} />
      <Box args={[2.4, 1.3, 0.06]} position={[0, 1.65, 0]} color={C.white} emissive="#d08a5b" glow={active ? 0.15 : 0} />
      {notes.map(([x, y, c], i) => (
        <Box key={i} args={[0.25, 0.25, 0.01]} position={[x, y, 0.04]} color={c} cast={false} />
      ))}
    </group>
  );
}

// ---------- Filing cabinet (reading files) ----------
export function Cabinet({ active }) {
  return (
    <group>
      <Box args={[0.8, 1.4, 0.6]} position={[0, 0.7, 0]} color={C.creamDark} emissive="#ffffff" glow={active ? 0.2 : 0} />
      {[0.35, 0.75, 1.15].map((y, i) => (
        <Box key={i} args={[0.25, 0.05, 0.02]} position={[0, y, 0.31]} color={C.woodDark} cast={false} />
      ))}
    </group>
  );
}

// ---------- Printer on a small stand (making PDFs) ----------
export function Printer({ active }) {
  return (
    <group>
      <Box args={[0.9, 0.6, 0.6]} position={[0, 0.3, 0]} color={C.wood} />
      <Box args={[0.75, 0.35, 0.5]} position={[0, 0.78, 0]} color={C.creamDark} />
      <Box args={[0.65, 0.06, 0.4]} position={[0, 0.98, 0]} color={C.white} emissive="#7fa37a" glow={active ? 0.6 : 0} />
      <Box args={[0.4, 0.02, 0.25]} position={[0, 0.9, 0.3]} color="#ffffff" cast={false} />
    </group>
  );
}

// ---------- Wall clock that shows your REAL time ----------
export function WallClock({ active }) {
  const hour = useRef();
  const minute = useRef();

  useFrame(() => {
    const now = new Date();
    const m = now.getMinutes() + now.getSeconds() / 60;
    const h = (now.getHours() % 12) + m / 60;
    minute.current.rotation.z = -(m / 60) * Math.PI * 2; // negative = clockwise
    hour.current.rotation.z = -(h / 12) * Math.PI * 2;
  });

  return (
    <group position={[0, 2.2, 0.1]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.4, 0.4, 0.06, 32]} />
        <meshStandardMaterial color={C.white} emissive="#ffffff" emissiveIntensity={active ? 0.3 : 0} />
      </mesh>
      <group ref={hour}>
        <Box args={[0.04, 0.2, 0.02]} position={[0, 0.1, 0.05]} color={C.dark} cast={false} />
      </group>
      <group ref={minute}>
        <Box args={[0.03, 0.32, 0.02]} position={[0, 0.16, 0.06]} color={C.woodDark} cast={false} />
      </group>
    </group>
  );
}

// ---------- Coffee corner (idle break spot) ----------
export function CoffeeCorner({ active }) {
  return (
    <group>
      <Box args={[1.4, 0.9, 0.6]} position={[0, 0.45, 0]} color={C.wood} />
      <Box args={[1.45, 0.05, 0.65]} position={[0, 0.92, 0]} color={C.creamDark} />
      <Box args={[0.35, 0.45, 0.3]} position={[-0.35, 1.17, -0.05]} color={C.dark} emissive="#d08a5b" glow={active ? 0.4 : 0} />
      {[0.15, 0.35].map((x, i) => (
        <mesh key={i} position={[x, 1.0, 0.1]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 0.12, 16]} />
          <meshStandardMaterial color={C.white} />
        </mesh>
      ))}
    </group>
  );
}

// ---------- Decoration ----------
export function Sofa() {
  return (
    <group>
      <Box args={[2.2, 0.45, 0.9]} position={[0, 0.3, 0]} color={C.fabric} />
      <Box args={[2.2, 0.6, 0.25]} position={[0, 0.75, -0.35]} color={C.fabric} />
      <Box args={[0.25, 0.55, 0.9]} position={[-1.1, 0.5, 0]} color={C.fabric} />
      <Box args={[0.25, 0.55, 0.9]} position={[1.1, 0.5, 0]} color={C.fabric} />
      <Box args={[0.5, 0.35, 0.15]} position={[-0.6, 0.7, -0.15]} color={C.white} />
    </group>
  );
}

export function CoffeeTable() {
  return (
    <group>
      <Box args={[1.2, 0.06, 0.6]} position={[0, 0.4, 0]} color={C.wood} />
      <Box args={[1.0, 0.37, 0.4]} position={[0, 0.19, 0]} color={C.woodDark} />
    </group>
  );
}

export function Plant() {
  return (
    <group>
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.17, 0.5, 16]} />
        <meshStandardMaterial color={C.white} />
      </mesh>
      <mesh position={[0, 0.85, 0]} castShadow>
        <sphereGeometry args={[0.45, 16, 16]} />
        <meshStandardMaterial color={C.leaf} />
      </mesh>
    </group>
  );
}

export function Window() {
  return (
    <group>
      <Box args={[1.8, 1.1, 0.05]} position={[0, 0, 0]} color={C.white} cast={false} />
      <Box args={[1.6, 0.9, 0.02]} position={[0, 0, 0.03]} color="#dce8ec" emissive="#ffffff" glow={0.25} cast={false} />
      <Box args={[0.04, 0.9, 0.03]} position={[0, 0, 0.05]} color={C.white} cast={false} />
    </group>
  );
}