"use client";

import { sceneEntities } from "../scene-entities";

const colors = {
  ivory: "#fff9e9",
  caramel: "#c87948",
  pink: "#ef91aa",
  nose: "#de7995",
  eye: "#282022",
};

export function HamsterBlockout() {
  const entity = sceneEntities.hamster;

  return (
    <group
      position={[1.55, 0.15, 1.55]}
      rotation={[0, -0.32, 0]}
      name={entity.id}
      userData={{ futureActions: entity.futureActions, assetStatus: "blockout" }}
    >
      <mesh position={[0, 0.7, 0]} scale={[0.85, 0.95, 0.7]} castShadow>
        <sphereGeometry args={[0.72, 28, 20]} />
        <meshStandardMaterial color={colors.ivory} roughness={0.34} />
      </mesh>
      <mesh position={[0, 1.35, 0.05]} scale={[0.72, 0.66, 0.63]} castShadow>
        <sphereGeometry args={[0.72, 28, 20]} />
        <meshStandardMaterial color={colors.ivory} roughness={0.32} />
      </mesh>
      <mesh position={[0, 1.62, 0.36]} scale={[0.62, 0.36, 0.18]} castShadow>
        <sphereGeometry args={[0.72, 24, 16]} />
        <meshStandardMaterial color={colors.caramel} roughness={0.35} />
      </mesh>
      {[-0.38, 0.38].map((x) => (
        <group key={x}>
          <mesh position={[x, 1.78, 0.08]} castShadow>
            <sphereGeometry args={[0.19, 20, 14]} />
            <meshStandardMaterial color={colors.pink} roughness={0.32} />
          </mesh>
          <mesh position={[x * 0.78, 1.4, 0.58]} castShadow>
            <sphereGeometry args={[0.085, 16, 12]} />
            <meshStandardMaterial color={colors.eye} roughness={0.14} />
          </mesh>
          <mesh position={[x * 0.58, 0.35, 0.52]} scale={[1.35, 0.65, 0.8]} castShadow>
            <sphereGeometry args={[0.16, 16, 12]} />
            <meshStandardMaterial color={colors.pink} roughness={0.32} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 1.18, 0.68]} castShadow>
        <sphereGeometry args={[0.075, 16, 12]} />
        <meshStandardMaterial color={colors.nose} roughness={0.28} />
      </mesh>
    </group>
  );
}
