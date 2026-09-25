"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { BufferAttribute, BufferGeometry, Color, Group, InstancedMesh, Object3D, Vector3 } from "three";

function seeded(seed: number) { let state = seed; return () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 4294967296; }; }
const random = seeded(42);
const nodes = Array.from({ length: 200 }, () => {
  const u = random() * 2 - 1, angle = random() * Math.PI * 2, radius = 5.7 * Math.cbrt(random());
  const plane = Math.sqrt(1 - u * u);
  return new Vector3(radius * plane * Math.cos(angle), radius * u, radius * plane * Math.sin(angle));
});

function Network() {
  const group = useRef<Group>(null);
  const mesh = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const lines = useMemo(() => {
    const pairs: number[] = [];
    for (let i = 0; i < nodes.length && pairs.length < 320 * 6; i++) {
      for (let j = i + 1; j < nodes.length && pairs.length < 320 * 6; j++) {
        if (nodes[i].distanceToSquared(nodes[j]) < 2.2 * 2.2) pairs.push(...nodes[i].toArray(), ...nodes[j].toArray());
      }
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(pairs), 3));
    return geometry;
  }, []);
  useEffect(() => {
    const instance = mesh.current;
    if (!instance) return;
    const colors = ["#747b7c", "#d96472", "#d49c59", "#d0bd69", "#75a8c8", "#73c98f"];
    nodes.forEach((position, index) => {
      dummy.position.copy(position);
      dummy.scale.setScalar(index % 17 === 0 ? 1.45 : 1);
      dummy.updateMatrix();
      instance.setMatrixAt(index, dummy.matrix);
      instance.setColorAt(index, new Color(index % 19 === 0 ? colors[1] : index % 13 === 0 ? colors[2] : index % 11 === 0 ? colors[3] : index % 7 === 0 ? colors[4] : index % 17 === 0 ? colors[5] : colors[0]));
    });
    instance.instanceMatrix.needsUpdate = true;
    if (instance.instanceColor) instance.instanceColor.needsUpdate = true;
  }, [dummy]);
  useEffect(() => () => lines.dispose(), [lines]);
  useFrame((state, delta) => {
    if (group.current) group.current.rotation.y += delta * .04;
    const instance = mesh.current;
    if (instance) {
      for (let index = 0; index < 12; index++) {
        const nodeIndex = index * 17;
        dummy.position.copy(nodes[nodeIndex]);
        dummy.scale.setScalar(1 + .6 * (.5 + .5 * Math.sin(state.clock.elapsedTime * 1.2 + index)));
        dummy.updateMatrix();
        instance.setMatrixAt(nodeIndex, dummy.matrix);
      }
      instance.instanceMatrix.needsUpdate = true;
    }
    state.camera.position.x += (state.pointer.x * .42 - state.camera.position.x) * .025;
    state.camera.position.y += (state.pointer.y * .42 - state.camera.position.y) * .025;
    const scroll = typeof window === "undefined" ? 0 : Math.min(1, window.scrollY / Math.max(1, window.innerHeight));
    state.camera.position.z += (8 + scroll * 6 - state.camera.position.z) * .025;
    state.camera.lookAt(0, 0, 0);
  });
  return <group ref={group}><instancedMesh ref={mesh} args={[undefined, undefined, 200]} frustumCulled={false}><icosahedronGeometry args={[.055, 0]} /><meshBasicMaterial /></instancedMesh><lineSegments geometry={lines}><lineBasicMaterial color="#52605d" transparent opacity={.38} /></lineSegments></group>;
}

export function HeroGraph() {
  return <Canvas dpr={[1, 1.75]} frameloop="always" camera={{ position: [0, 0, 8], fov: 55 }} gl={{ alpha: true, antialias: true }}><Network /></Canvas>;
}

