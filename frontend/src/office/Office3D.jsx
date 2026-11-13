import { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { STATIONS, PROPS, TOOL_PROP, jobFor } from "./layout";
import { Board, Bookshelf, Cabinet, Desk, Label, Printer } from "./Furniture";
import Character from "./Character";

// ---------- Floor and walls ----------
function Room() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[16, 12]} />
        <meshStandardMaterial color="#3a3f4b" />
      </mesh>
      <mesh position={[0, 1.5, -6]} receiveShadow>
        <boxGeometry args={[16, 3, 0.2]} />
        <meshStandardMaterial color="#2a2f3a" />
      </mesh>
      <mesh position={[-8, 1.5, 0]} receiveShadow>
        <boxGeometry args={[0.2, 3, 12]} />
        <meshStandardMaterial color="#262b35" />
      </mesh>
    </group>
  );
}

// ---------- One department station ----------
function Station({ id, station, active }) {
  return (
    <group position={station.position} rotation={[0, station.rotation, 0]}>
      {id === "marketing" ? <Board active={active} /> : <Desk active={active} />}
      {id === "school" && <Bookshelf position={[1.4, 0, -0.2]} />}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0.3]} receiveShadow>
        <planeGeometry args={[2.6, 2.4]} />
        <meshStandardMaterial color={station.color} transparent opacity={active ? 0.5 : 0.15} />
      </mesh>
      <Label text={station.label} position={[0, 2.2, 0]} color={station.color} active={active} />
    </group>
  );
}

// Make a reply short and plain enough for a speech bubble
function shorten(text) {
  const plain = text.replace(/[#*`|_>]/g, "").replace(/\s+/g, " ").trim();
  return plain.length > 110 ? plain.slice(0, 110) + "…" : plain;
}

// ---------- The whole scene ----------
export default function Office3D({ status, lastReply }) {
  const activeRole = STATIONS[status.role] ? status.role : "general";
  const activeProp = TOOL_PROP[status.tool];
  const targetKey = activeProp || activeRole; // where he should be going right now

  // The action queue: every new destination is added to the end
  const queueRef = useRef([]);
  useEffect(() => {
    queueRef.current.push(jobFor(targetKey));
  }, [targetKey]);

  // Speech bubble: show each new reply for 6 seconds
  const [speech, setSpeech] = useState(null);
  useEffect(() => {
    if (!lastReply) return;
    setSpeech(shorten(lastReply));
    const timer = setTimeout(() => setSpeech(null), 6000);
    return () => clearTimeout(timer); // a newer reply cancels the old timer
  }, [lastReply]);

  return (
    <Canvas shadows camera={{ position: [9, 10, 13], fov: 45 }}>
      <color attach="background" args={["#0f1115"]} />

      <ambientLight intensity={0.5} />
      <directionalLight
        position={[6, 12, 6]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />

      <Room />

      {Object.entries(STATIONS).map(([id, station]) => (
        <Station key={id} id={id} station={station} active={id === activeRole && !activeProp} />
      ))}

      <group position={PROPS.cabinet.position}>
        <Cabinet active={activeProp === "cabinet"} />
        <Label text={PROPS.cabinet.label} position={[0, 1.9, 0]} active={activeProp === "cabinet"} />
      </group>

      <group position={PROPS.printer.position}>
        <Printer active={activeProp === "printer"} />
        <Label text={PROPS.printer.label} position={[0, 1.5, 0]} active={activeProp === "printer"} />
      </group>

      <Character queueRef={queueRef} mode={status.state} speech={speech} />

      <OrbitControls target={[0, 0, 0]} maxPolarAngle={Math.PI / 2.2} minDistance={6} maxDistance={25} />
    </Canvas>
  );
}