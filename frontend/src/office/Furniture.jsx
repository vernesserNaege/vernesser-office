import { Html } from "@react-three/drei";

// ---------- Floating name label ----------
export function Label({ text, position, color = "#888", active }) {
  return (
    <Html position={position} center distanceFactor={12}>
      <div className={`label3d ${active ? "active" : ""}`} style={{ borderColor: color }}>
        {text}
      </div>
    </Html>
  );
}

// ---------- Desk with chair and monitor ----------
export function Desk({ active, withMonitor = true }) {
  const legs = [[-0.82, -0.38], [0.82, -0.38], [-0.82, 0.38], [0.82, 0.38]];
  return (
    <group>
      {/* tabletop */}
      <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.08, 0.9]} />
        <meshStandardMaterial color="#8b6b4a" />
      </mesh>
      {/* legs */}
      {legs.map(([x, z], i) => (
        <mesh key={i} position={[x, 0.37, z]} castShadow>
          <boxGeometry args={[0.06, 0.74, 0.06]} />
          <meshStandardMaterial color="#333" />
        </mesh>
      ))}
      {/* monitor: glows blue when this desk is active */}
      {withMonitor && (
        <mesh position={[0, 1.05, -0.3]} castShadow>
          <boxGeometry args={[0.7, 0.42, 0.04]} />
          <meshStandardMaterial
            color="#111"
            emissive={active ? "#4aa3ff" : "#000000"}
            emissiveIntensity={active ? 0.8 : 0}
          />
        </mesh>
      )}
      {/* chair */}
      <mesh position={[0, 0.45, 0.75]} castShadow>
        <boxGeometry args={[0.5, 0.08, 0.5]} />
        <meshStandardMaterial color="#2b2b2b" />
      </mesh>
      <mesh position={[0, 0.75, 0.98]} castShadow>
        <boxGeometry args={[0.5, 0.6, 0.06]} />
        <meshStandardMaterial color="#2b2b2b" />
      </mesh>
    </group>
  );
}

// ---------- Marketing whiteboard with sticky notes ----------
export function Board({ active }) {
  const notes = [[-0.7, 1.8, "#facc15"], [-0.2, 1.5, "#f472b6"], [0.4, 1.85, "#60a5fa"], [0.8, 1.45, "#4ade80"]];
  return (
    <group>
      <Desk active={active} withMonitor={false} />
      <mesh position={[0, 1.6, -0.6]} castShadow>
        <boxGeometry args={[2.4, 1.3, 0.06]} />
        <meshStandardMaterial
          color="#f5f5f5"
          emissive={active ? "#f97316" : "#000000"}
          emissiveIntensity={active ? 0.15 : 0}
        />
      </mesh>
      {notes.map(([x, y, c], i) => (
        <mesh key={i} position={[x, y, -0.56]}>
          <boxGeometry args={[0.25, 0.25, 0.01]} />
          <meshStandardMaterial color={c} />
        </mesh>
      ))}
    </group>
  );
}

// ---------- Bookshelf for the study corner ----------
export function Bookshelf({ position }) {
  const colors = ["#ef4444", "#3b82f6", "#eab308", "#22c55e", "#a855f7"];
  return (
    <group position={position}>
      <mesh position={[0, 1, 0]} castShadow>
        <boxGeometry args={[0.9, 2, 0.4]} />
        <meshStandardMaterial color="#6b4f35" />
      </mesh>
      {[0.5, 1.1, 1.7].map((y, row) =>
        colors.map((_, i) => (
          <mesh key={`${row}-${i}`} position={[-0.32 + i * 0.16, y, 0.12]}>
            <boxGeometry args={[0.12, 0.4, 0.2]} />
            <meshStandardMaterial color={colors[(i + row) % colors.length]} />
          </mesh>
        ))
      )}
    </group>
  );
}

// ---------- Filing cabinet (used by read_file / list_files) ----------
export function Cabinet({ active }) {
  return (
    <group>
      <mesh position={[0, 0.7, 0]} castShadow>
        <boxGeometry args={[0.7, 1.4, 0.6]} />
        <meshStandardMaterial
          color="#9ca3af"
          emissive={active ? "#ffffff" : "#000000"}
          emissiveIntensity={active ? 0.2 : 0}
        />
      </mesh>
      {[0.35, 0.75, 1.15].map((y, i) => (
        <mesh key={i} position={[0, y, 0.31]}>
          <boxGeometry args={[0.25, 0.05, 0.02]} />
          <meshStandardMaterial color="#374151" />
        </mesh>
      ))}
    </group>
  );
}

// ---------- Printer (used by create_pdf) ----------
export function Printer({ active }) {
  return (
    <group>
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[0.8, 0.7, 0.6]} />
        <meshStandardMaterial color="#4b5563" />
      </mesh>
      <mesh position={[0, 0.85, 0]} castShadow>
        <boxGeometry args={[0.7, 0.3, 0.5]} />
        <meshStandardMaterial
          color="#e5e7eb"
          emissive={active ? "#22c55e" : "#000000"}
          emissiveIntensity={active ? 0.5 : 0}
        />
      </mesh>
      <mesh position={[0, 0.92, 0.3]}>
        <boxGeometry args={[0.4, 0.02, 0.2]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}