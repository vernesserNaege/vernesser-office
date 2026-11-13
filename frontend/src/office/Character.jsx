import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { jobFor } from "./layout";

const SPEED = 3; // units per second

// Turn smoothly from angle a to angle b, the short way around
function lerpAngle(a, b, t) {
  let diff = ((b - a + Math.PI) % (2 * Math.PI)) - Math.PI;
  if (diff < -Math.PI) diff += 2 * Math.PI;
  return a + diff * Math.min(1, t);
}

// Move a value part of the way toward a target (smooth animation)
function ease(obj, prop, target, delta, speed = 10) {
  obj[prop] += (target - obj[prop]) * Math.min(1, delta * speed);
}

export default function Character({ queueRef, mode, speech }) {
  const root = useRef();   // whole character: position + facing
  const body = useRef();   // bobs up and down
  const head = useRef();
  const armL = useRef();
  const armR = useRef();
  const legL = useRef();
  const legR = useRef();
  const job = useRef(null);   // the job he's doing right now
  const walking = useRef(false);

  // Start at the Front Desk (only once)
  useEffect(() => {
    const start = jobFor("general");
    root.current.position.set(...start.spot);
    root.current.rotation.y = start.face;
    job.current = { ...start, arrivedAt: 0 };
  }, []);

  useFrame((state, delta) => {
    const g = root.current;
    const t = state.clock.elapsedTime;

    // ---------- 1. Take the next job when the current one is finished ----------
    if (!job.current && queueRef.current.length) {
      job.current = { ...queueRef.current.shift(), arrivedAt: null };
    }

    // ---------- 2. Walk toward the job's spot ----------
    walking.current = false;
    const j = job.current;
    if (j) {
      const dx = j.spot[0] - g.position.x;
      const dz = j.spot[2] - g.position.z;
      const dist = Math.hypot(dx, dz);

      if (dist > 0.05) {
        walking.current = true;
        const step = Math.min(dist, SPEED * delta);       // never overshoot
        g.position.x += (dx / dist) * step;
        g.position.z += (dz / dist) * step;
        g.rotation.y = lerpAngle(g.rotation.y, Math.atan2(dx, dz), delta * 10); // face where he walks
      } else {
        // Arrived: face the desk/prop, stay at least "dwell" seconds, then free up for the next job
        g.rotation.y = lerpAngle(g.rotation.y, j.face, delta * 6);
        if (j.arrivedAt === null) j.arrivedAt = t;
        if (t - j.arrivedAt >= j.dwell && queueRef.current.length) job.current = null;
      }
    }

    // ---------- 3. Body animation ----------
    const m = walking.current ? "walk" : mode; // walking beats everything else
    const swing = m === "walk" ? Math.sin(t * 10) * 0.6 : 0;

    ease(legL.current.rotation, "x", swing, delta, 20);
    ease(legR.current.rotation, "x", -swing, delta, 20);

    let armLx = 0, armRx = 0, headTilt = 0;
    if (m === "walk") {
      armLx = -swing;
      armRx = swing;
    } else if (m === "working") {
      armLx = -1.2 + Math.sin(t * 18) * 0.15;              // typing
      armRx = -1.2 + Math.sin(t * 18 + 1.5) * 0.15;
    } else if (m === "thinking") {
      armRx = -2.3;                                         // hand to chin
      headTilt = Math.sin(t * 1.5) * 0.12;
    }
    ease(armL.current.rotation, "x", armLx, delta, 12);
    ease(armR.current.rotation, "x", armRx, delta, 12);
    ease(head.current.rotation, "z", headTilt, delta, 5);

    body.current.position.y =
      m === "walk" ? Math.abs(Math.sin(t * 10)) * 0.05 : Math.sin(t * 2) * 0.01; // step bounce / breathing
  });

  return (
    <group ref={root}>
      <group ref={body}>
        {/* torso */}
        <mesh position={[0, 1.0, 0]} castShadow>
          <capsuleGeometry args={[0.25, 0.45, 8, 16]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        {/* red tie (on the front, so you can see which way he faces) */}
        <mesh position={[0, 1.22, 0.24]}>
          <boxGeometry args={[0.07, 0.25, 0.02]} />
          <meshStandardMaterial color="#dc2626" />
        </mesh>
        {/* head + eyes */}
        <group ref={head} position={[0, 1.72, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.2, 24, 24]} />
            <meshStandardMaterial color="#f1c27d" />
          </mesh>
          <mesh position={[-0.07, 0.04, 0.18]}>
            <sphereGeometry args={[0.03, 8, 8]} />
            <meshStandardMaterial color="#111" />
          </mesh>
          <mesh position={[0.07, 0.04, 0.18]}>
            <sphereGeometry args={[0.03, 8, 8]} />
            <meshStandardMaterial color="#111" />
          </mesh>
        </group>
        {/* arms: the group is the shoulder joint, the box hangs below it */}
        <group ref={armL} position={[-0.33, 1.35, 0]}>
          <mesh position={[0, -0.27, 0]} castShadow>
            <boxGeometry args={[0.12, 0.55, 0.12]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
        </group>
        <group ref={armR} position={[0.33, 1.35, 0]}>
          <mesh position={[0, -0.27, 0]} castShadow>
            <boxGeometry args={[0.12, 0.55, 0.12]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
        </group>
        {/* legs: the group is the hip joint */}
        <group ref={legL} position={[-0.12, 0.6, 0]}>
          <mesh position={[0, -0.3, 0]} castShadow>
            <boxGeometry args={[0.14, 0.6, 0.14]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
        </group>
        <group ref={legR} position={[0.12, 0.6, 0]}>
          <mesh position={[0, -0.3, 0]} castShadow>
            <boxGeometry args={[0.14, 0.6, 0.14]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
        </group>
      </group>

      {/* speech bubble */}
      {speech && (
        <Html position={[0, 2.3, 0]} center distanceFactor={10}>
          <div className="bubble">{speech}</div>
        </Html>
      )}
    </group>
  );
}