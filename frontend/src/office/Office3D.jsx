import { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import {
  ZONES,
  ROLE_INFO,
  SOFA,
  COFFEE_TABLE,
  zoneFor,
  jobsFor,
} from "./layout";
import {
  C,
  Box,
  Label,
  Workstation,
  Bookshelf,
  Whiteboard,
  Cabinet,
  Printer,
  WallClock,
  CoffeeCorner,
  Sofa,
  CoffeeTable,
  Plant,
  Window,
} from "./Furniture";
import Character from "./Character";

// ---------- Floor, walls, baseboards, window ----------
function Room() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[12, 10]} />
        <meshStandardMaterial color={C.floor} />
      </mesh>
      <mesh position={[0, 1.6, -5]} receiveShadow>
        <boxGeometry args={[12, 3.2, 0.2]} />
        <meshStandardMaterial color={C.wallBack} />
      </mesh>
      <mesh position={[-6, 1.6, 0]} receiveShadow>
        <boxGeometry args={[0.2, 3.2, 10]} />
        <meshStandardMaterial color={C.wallSide} />
      </mesh>
      <Box
        args={[12, 0.15, 0.04]}
        position={[0, 0.075, -4.88]}
        color={C.woodDark}
        cast={false}
      />
      <Box
        args={[0.04, 0.15, 10]}
        position={[-5.88, 0.075, 0]}
        color={C.woodDark}
        cast={false}
      />
      <group position={[0, 1.95, -4.88]}>
        <Window />
      </group>
      {/* rug in the lounge area */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[3.4, 0.005, 3.0]}
        receiveShadow
      >
        <planeGeometry args={[3.4, 2.6]} />
        <meshStandardMaterial color="#ead9bd" />
      </mesh>
    </group>
  );
}

// ---------- A zone: puts furniture at its spot and adds a label ----------
function Zone({ id, text, labelY = 2.4, active, children }) {
  const zone = ZONES[id];
  return (
    <group position={zone.position} rotation={[0, zone.rotation, 0]}>
      {children}
      <Label
        text={text || zone.label}
        position={[0, labelY, 0]}
        active={active}
      />
    </group>
  );
}

// Make a reply short and plain enough for a speech bubble
function shorten(text) {
  const plain = text
    .replace(/[#*`|_>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > 110 ? plain.slice(0, 110) + "…" : plain;
}

// ---------- The whole scene ----------
export default function Office3D({ status, lastReply }) {
  const zone = zoneFor(status); // where he should be
  const role = ROLE_INFO[status.role] ? status.role : "general"; // which department
  const busy = status.state !== "idle";

  // Action queue: every new destination is added to the end
  // Action queue: every new destination (or routine) is added to the end
  const queueRef = useRef([]);
  const lastZone = useRef("lounge"); // he starts in the lounge, sitting on the sofa
  useEffect(() => {
    if (zone === lastZone.current) return; // same place as before → nothing new to do
    lastZone.current = zone;
    queueRef.current.push(...jobsFor(zone));
  }, [zone]);

  // Speech bubble: show each new reply for 6 seconds
  const [speech, setSpeech] = useState(null);
  useEffect(() => {
    if (!lastReply) return;
    setSpeech(shorten(lastReply));
    const timer = setTimeout(() => setSpeech(null), 6000);
    return () => clearTimeout(timer);
  }, [lastReply]);

  return (
    <Canvas shadows camera={{ position: [8, 8.5, 10], fov: 45 }}>
      <color attach="background" args={["#f5efe4"]} />

      {/* Warm, soft lighting */}
      <hemisphereLight args={["#fff8ec", "#e6d6bb", 0.8]} />
      <directionalLight
        position={[5, 10, 6]}
        intensity={1.1}
        color="#fff1dc"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />

      <Room />

      {/* ----- Work zones ----- */}
      <Zone
        id="pc"
        text={`Workstation · ${ROLE_INFO[role].label}`}
        labelY={2.0}
        active={zone === "pc"}
      >
        <Workstation roleInfo={ROLE_INFO[role]} busy={busy} />
      </Zone>
      <Zone id="bookshelf" labelY={2.6} active={zone === "bookshelf"}>
        <Bookshelf active={zone === "bookshelf"} />
      </Zone>
      <Zone id="whiteboard" labelY={2.6} active={zone === "whiteboard"}>
        <Whiteboard active={zone === "whiteboard"} />
      </Zone>
      <Zone id="cabinet" labelY={1.9} active={zone === "cabinet"}>
        <Cabinet active={zone === "cabinet"} />
      </Zone>
      <Zone id="printer" labelY={1.5} active={zone === "printer"}>
        <Printer active={zone === "printer"} />
      </Zone>
      <Zone id="clock" labelY={2.9} active={zone === "clock"}>
        <WallClock active={zone === "clock"} />
      </Zone>
      <Zone id="coffee" labelY={1.8} active={zone === "lounge"}>
        <CoffeeCorner active={zone === "lounge"} />
      </Zone>

      {/* ----- Decoration ----- */}
      <group position={SOFA.position} rotation={[0, SOFA.rotation, 0]}>
        <Sofa />
      </group>
      <group position={COFFEE_TABLE}>
        <CoffeeTable />
      </group>
      <group position={[5.3, 0, -4.4]}>
        <Plant />
      </group>
      <group position={[-5.4, 0, 4.3]}>
        <Plant />
      </group>

      <Character queueRef={queueRef} mode={status.state} speech={speech} />

      <OrbitControls
        target={[0, 0.5, -0.5]}
        maxPolarAngle={Math.PI / 2.2}
        minDistance={5}
        maxDistance={20}
      />
    </Canvas>
  );
}
