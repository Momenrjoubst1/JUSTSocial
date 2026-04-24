import { useEffect, useRef } from "react";
import { useProgress, useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const CAMERA_PRESETS = {
  player: { pos: [0, 8, 7] as [number, number, number] },
  top: { pos: [0, 14, 0.1] as [number, number, number] },
  cinematic: { pos: [10, 6, 10] as [number, number, number] },
};

export function CameraSetup({ preset }: { preset: keyof typeof CAMERA_PRESETS }) {
  const { camera } = useThree();
  const target = CAMERA_PRESETS[preset].pos;

  useFrame(() => {
    camera.position.x += (target[0] - camera.position.x) * 0.05;
    camera.position.y += (target[1] - camera.position.y) * 0.05;
    camera.position.z += (target[2] - camera.position.z) * 0.05;
    camera.lookAt(0, 0, 0);
  });

  return null;
}

export function RealisticEarth() {
  const earthRef = useRef<THREE.Mesh>(null!);
  const cloudsRef = useRef<THREE.Mesh>(null!);
  const [colorMap, specularMap, cloudsMap] = useTexture([
    "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg",
    "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg",
    "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_1024.png",
  ]);

  useEffect(() => {
    if (colorMap) colorMap.colorSpace = THREE.SRGBColorSpace;
  }, [colorMap]);

  useFrame(() => {
    if (earthRef.current) earthRef.current.rotation.y += 0.0005;
    if (cloudsRef.current) cloudsRef.current.rotation.y += 0.0007;
  });

  useEffect(() => {
    return () => {
      if (earthRef.current?.geometry) earthRef.current.geometry.dispose();
      if (cloudsRef.current?.geometry) cloudsRef.current.geometry.dispose();
      if (earthRef.current?.material) {
        if (Array.isArray(earthRef.current.material)) {
          earthRef.current.material.forEach((m) => m.dispose());
        } else {
          earthRef.current.material.dispose();
        }
      }
      if (cloudsRef.current?.material) {
        if (Array.isArray(cloudsRef.current.material)) {
          cloudsRef.current.material.forEach((m) => m.dispose());
        } else {
          cloudsRef.current.material.dispose();
        }
      }
      [colorMap, specularMap, cloudsMap].forEach((tex) => {
        if (tex) tex.dispose();
      });
    };
  }, [colorMap, cloudsMap, specularMap]);

  return (
    <group position={[-18, 5, -25]} rotation={[0.2, 0, 0.1]}>
      <mesh ref={earthRef}>
        <sphereGeometry args={[8, 48, 48]} />
        <meshStandardMaterial map={colorMap} roughnessMap={specularMap} roughness={0.7} metalness={0.1} />
      </mesh>
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[8.1, 48, 48]} />
        <meshStandardMaterial map={cloudsMap} transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

export function SceneReady({ onReady }: { onReady: () => void }) {
  const { progress } = useProgress();
  const called = useRef(false);

  useEffect(() => {
    if (progress === 100 && !called.current) {
      called.current = true;
      setTimeout(onReady, 400);
    }
  }, [onReady, progress]);

  return null;
}
