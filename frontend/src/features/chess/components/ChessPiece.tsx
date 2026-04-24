import type { ReactNode } from "react";

type PieceColor = "w" | "b";

export function PieceMesh({
  type,
  color,
  materialType,
}: {
  type: string;
  color: PieceColor;
  materialType: string;
}) {
  const isW = color === "w";

  const getMaterial = (): ReactNode => {
    if (materialType === "glass") {
      const glassProps = {
        thickness: 0.8,
        roughness: 0.05,
        transmission: 0.95,
        ior: 1.5,
        chromaticAberration: 0.05,
        backside: true,
      };
      return isW ? (
        <meshPhysicalMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.05} {...glassProps} />
      ) : (
        <meshPhysicalMaterial
          color="#1a1a1a"
          emissive="#000000"
          metalness={0.9}
          roughness={0.02}
          transmission={0.7}
          thickness={1.2}
          ior={1.8}
        />
      );
    }

    if (materialType === "wood") {
      return isW ? <meshStandardMaterial color="#d4bd94" roughness={0.8} /> : <meshStandardMaterial color="#503525" roughness={0.8} />;
    }

    if (materialType === "marble") {
      return isW ? (
        <meshPhysicalMaterial color="#f8f9fa" roughness={0.1} metalness={0.1} clearcoat={1} clearcoatRoughness={0.1} />
      ) : (
        <meshPhysicalMaterial color="#212529" roughness={0.1} metalness={0.1} clearcoat={1} clearcoatRoughness={0.1} />
      );
    }

    return <meshStandardMaterial color={isW ? "#ffffff" : "#222222"} />;
  };

  const material = getMaterial();

  const Base = () => (
    <group>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.38, 0.42, 0.1, 16]} />
        {material}
      </mesh>
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.32, 0.38, 0.1, 16]} />
        {material}
      </mesh>
    </group>
  );

  switch (type) {
    case "p":
      return (
        <group>
          <Base />
          <mesh position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.1, 0.25, 0.6, 20]} />
            {material}
          </mesh>
          <mesh position={[0, 0.8, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 0.05, 20]} />
            {material}
          </mesh>
          <mesh position={[0, 1.0, 0]}>
            <sphereGeometry args={[0.2, 20, 20]} />
            {material}
          </mesh>
        </group>
      );
    case "r":
      return (
        <group>
          <Base />
          <mesh position={[0, 0.55, 0]}>
            <cylinderGeometry args={[0.25, 0.3, 0.7, 24]} />
            {material}
          </mesh>
          <mesh position={[0, 0.95, 0]}>
            <cylinderGeometry args={[0.32, 0.32, 0.15, 24]} />
            {material}
          </mesh>
          {[0, 90, 180, 270].map((angle) => (
            <mesh
              key={angle}
              position={[
                0.22 * Math.cos((angle * Math.PI) / 180),
                1.1,
                0.22 * Math.sin((angle * Math.PI) / 180),
              ]}
            >
              <boxGeometry args={[0.12, 0.15, 0.12]} />
              {material}
            </mesh>
          ))}
        </group>
      );
    case "n":
      return (
        <group>
          <Base />
          <mesh position={[0, 0.4, 0]}>
            <cylinderGeometry args={[0.2, 0.3, 0.5, 20]} />
            {material}
          </mesh>
          <mesh position={[0, 0.8, 0.1]} rotation={[-0.4, 0, 0]}>
            <boxGeometry args={[0.28, 0.7, 0.45]} />
            {material}
          </mesh>
          <mesh position={[0, 1.0, 0.35]} rotation={[0.2, 0, 0]}>
            <boxGeometry args={[0.22, 0.25, 0.4]} />
            {material}
          </mesh>
          <mesh position={[0.1, 1.2, -0.05]}>
            <boxGeometry args={[0.08, 0.2, 0.08]} />
            {material}
          </mesh>
          <mesh position={[-0.1, 1.2, -0.05]}>
            <boxGeometry args={[0.08, 0.2, 0.08]} />
            {material}
          </mesh>
        </group>
      );
    case "b":
      return (
        <group>
          <Base />
          <mesh position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.1, 0.25, 0.8, 20]} />
            {material}
          </mesh>
          <mesh position={[0, 1.1, 0]} scale={[0.9, 1.3, 0.9]}>
            <sphereGeometry args={[0.25, 20, 20]} />
            {material}
          </mesh>
          <mesh position={[0, 1.45, 0]}>
            <sphereGeometry args={[0.06, 12, 12]} />
            {material}
          </mesh>
          <mesh position={[0, 1.15, 0.18]} rotation={[0.5, 0, 0]}>
            <boxGeometry args={[0.3, 0.05, 0.1]} />
            <meshStandardMaterial color={isW ? "#ccc" : "#333"} />
          </mesh>
        </group>
      );
    case "q":
      return (
        <group>
          <Base />
          <mesh position={[0, 0.7, 0]}>
            <cylinderGeometry args={[0.12, 0.28, 1.1, 24]} />
            {material}
          </mesh>
          <mesh position={[0, 1.3, 0]}>
            <sphereGeometry args={[0.28, 20, 20]} />
            {material}
          </mesh>
          <mesh position={[0, 1.45, 0]}>
            <cylinderGeometry args={[0.32, 0.2, 0.15, 8]} />
            {material}
          </mesh>
          <mesh position={[0, 1.6, 0]}>
            <sphereGeometry args={[0.08, 12, 12]} />
            {material}
          </mesh>
        </group>
      );
    case "k":
      return (
        <group>
          <Base />
          <mesh position={[0, 0.75, 0]}>
            <cylinderGeometry args={[0.15, 0.3, 1.2, 24]} />
            {material}
          </mesh>
          <mesh position={[0, 1.4, 0]}>
            <cylinderGeometry args={[0.3, 0.2, 0.2, 24]} />
            {material}
          </mesh>
          <group position={[0, 1.65, 0]}>
            <mesh>
              <boxGeometry args={[0.08, 0.4, 0.08]} />
              {material}
            </mesh>
            <mesh position={[0, 0.1, 0]}>
              <boxGeometry args={[0.25, 0.08, 0.08]} />
              {material}
            </mesh>
          </group>
        </group>
      );
    default:
      return null;
  }
}
