import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { LOUNGE_PATH_OUT, jobsFor } from "./layout";

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
  const root = useRef();     // whole character: position + facing
  const body = useRef();     // moves up/down (bounce, breathing, sitting)
  const head = useRef();
  const armL = useRef();
  const armR = useRef();
  const legL = useRef();
  const legR = useRef();
  const cup = useRef();      // coffee cup in his right hand
  const job = useRef(null);  // the job he's doing right now
  const lastKey = useRef(null); // the job he just finished (to know if he's getting up from the sofa)
  const walking = useRef(false);

  // Start sitting on the sofa
  useEffect(() => {
    const sofa = jobsFor("lounge").at(-1);
    root.current.position.set(...sofa.path.at(-1));
    root.current.rotation.y = sofa.face;
    job.current = { ...sofa, step: sofa.path.length - 1, arrivedAt: 0 };
  }, []);

  useFrame((state, delta) => {
    const g = root.current;
    const t = state.clock.elapsedTime;

    // ---------- 1. Take the next job when the current one is finished ----------
    if (!job.current && queueRef.current.length) {
      const next = queueRef.current.shift();
      // Getting up from the sofa? Step out around the coffee table first.
      const path = lastKey.current === "sofa" ? [...LOUNGE_PATH_OUT, ...next.path] : [...next.path];
      job.current = { ...next, path, step: 0, arrivedAt: null };
    }

    // ---------- 2. Walk along the path, point by point ----------
    walking.current = false;
    const j = job.current;
    let arrived = false;

    if (j) {
      const target = j.path[j.step];
      const dx = target[0] - g.position.x;
      const dz = target[2] - g.position.z;
      const dist = Math.hypot(dx, dz);

      if (dist > 0.05) {
        walking.current = true;
        const step = Math.min(dist, SPEED * delta);
        g.position.x += (dx / dist) * step;
        g.position.z += (dz / dist) * step;
        g.rotation.y = lerpAngle(g.rotation.y, Math.atan2(dx, dz), delta * 10);
      } else if (j.step < j.path.length - 1) {
        j.step += 1; // reached a waypoint → head for the next one
      } else {
        // Reached the final point: face the right way, stay for "dwell", then free up
        arrived = true;
        g.rotation.y = lerpAngle(g.rotation.y, j.face, delta * 6);
        if (j.arrivedAt === null) j.arrivedAt = t;
        if (t - j.arrivedAt >= j.dwell && queueRef.current.length) {
          lastKey.current = j.key;
          job.current = null;
        }
      }
    }

    // ---------- 3. Pick the animation ----------
    // walking beats everything; a pose (sit/sip) beats the agent's state
    const m = walking.current ? "walk" : (arrived && j?.pose) || mode;
    const swing = m === "walk" ? Math.sin(t * 10) * 0.6 : 0;

    let legLx = swing, legRx = -swing;
    let armLx = 0, armRx = 0, headTilt = 0;
    let bodyY = Math.sin(t * 2) * 0.01; // gentle breathing

    if (m === "walk") {
      armLx = -swing;
      armRx = swing;
      bodyY = Math.abs(Math.sin(t * 10)) * 0.05;
    } else if (m === "working") {
      armLx = -1.2 + Math.sin(t * 18) * 0.15;          // typing
      armRx = -1.2 + Math.sin(t * 18 + 1.5) * 0.15;
    } else if (m === "thinking") {
      armRx = -2.3;                                     // hand to chin
      headTilt = Math.sin(t * 1.5) * 0.12;
    } else if (m === "sip") {
      armRx = -1.7 + Math.sin(t * 1.5) * 0.35;          // lifting the cup to his mouth
    } else if (m === "sit") {
      legLx = -1.45;                                    // legs forward
      legRx = -1.45;
      armLx = -0.5;                                     // hand resting on lap
      armRx = -0.9 + Math.sin(t * 0.8) * 0.15;          // holding the cup
      bodyY = -0.05 + Math.sin(t * 2) * 0.005;          // lower onto the cushion
      headTilt = Math.sin(t * 0.6) * 0.05;              // relaxed
    }

    ease(legL.current.rotation, "x", legLx, delta, 15);
    ease(legR.current.rotation, "x", legRx, delta, 15);
    ease(armL.current.rotation, "x", armLx, delta, 12);
    ease(armR.current.rotation, "x", armRx, delta, 12);
    ease(head.current.rotation, "z", headTilt, delta, 5);
    ease(body.current.position, "y", bodyY, delta, 8);

    // ---------- 4. The coffee cup ----------
    // Picked up at the coffee corner, carried to the sofa, left behind when work starts
    cup.current.visible = j?.key === "sofa" || (j?.key === "coffee" && arrived);
    cup.current.rotation.x = -armR.current.rotation.x; // counter-rotate so it stays upright
  });

  return (
    <group ref={root}>
      <group ref={body}>
        {/* torso */}
        <mesh position={[0, 1.0, 0]} castShadow>
          <capsuleGeometry args={[0.25, 0.45, 8, 16]} />
          <meshStandardMaterial color="#4a3b2e" />
        </mesh>
        {/* tie */}
        <mesh position={[0, 1.22, 0.24]}>
          <boxGeometry args={[0.07, 0.25, 0.02]} />
          <meshStandardMaterial color="#a04a3a" />
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
        {/* left arm (shoulder joint) */}
        <group ref={armL} position={[-0.33, 1.35, 0]}>
          <mesh position={[0, -0.27, 0]} castShadow>
            <boxGeometry args={[0.12, 0.55, 0.12]} />
            <meshStandardMaterial color="#4a3b2e" />
          </mesh>
        </group>
        {/* right arm (shoulder joint) + coffee cup in the hand */}
        <group ref={armR} position={[0.33, 1.35, 0]}>
          <mesh position={[0, -0.27, 0]} castShadow>
            <boxGeometry args={[0.12, 0.55, 0.12]} />
            <meshStandardMaterial color="#4a3b2e" />
          </mesh>
          <group ref={cup} position={[0, -0.58, 0.06]} visible={false}>
            <mesh castShadow>
              <cylinderGeometry args={[0.055, 0.045, 0.12, 16]} />
              <meshStandardMaterial color="#fbf8f2" />
            </mesh>
            <mesh position={[0, 0.055, 0]}>
              <cylinderGeometry args={[0.045, 0.045, 0.01, 16]} />
              <meshStandardMaterial color="#6b4a2e" />
            </mesh>
          </group>
        </group>
        {/* legs (hip joints) */}
        <group ref={legL} position={[-0.12, 0.6, 0]}>
          <mesh position={[0, -0.3, 0]} castShadow>
            <boxGeometry args={[0.14, 0.6, 0.14]} />
            <meshStandardMaterial color="#3b3026" />
          </mesh>
        </group>
        <group ref={legR} position={[0.12, 0.6, 0]}>
          <mesh position={[0, -0.3, 0]} castShadow>
            <boxGeometry args={[0.14, 0.6, 0.14]} />
            <meshStandardMaterial color="#3b3026" />
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