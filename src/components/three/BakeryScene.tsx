"use client";

import { ContactShadows, OrbitControls, RoundedBox } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { BakeryInteractions } from "./interaction/BakeryInteractions";
import { pickupRegistry } from "./interaction/registry";
import { createInteractionRuntimeStore } from "./interaction/runtime-store";
import { MascotActor } from "./mascot/MascotActor";
import {
  BakeryPropsModel,
  CafeSetModel,
  DisplayCabinetModel,
  RoomDecorModel,
  SideShelfModel,
} from "./models/BakeryModels";
import { sceneEntities } from "./scene-entities";

const colors = {
  blush: "#eaa5b5", deepPink: "#c96883", palePink: "#f4c8d0", cream: "#fff1d8",
  ivory: "#fff9e9", butter: "#f0c76c", sage: "#91aa82", brown: "#724b45", caramel: "#c87948",
};

type Position = [number, number, number];

function ToyBox({ position, scale, color = colors.blush, radius = 0.08 }: { position: Position; scale: Position; color?: string; radius?: number }) {
  return <RoundedBox position={position} scale={scale} radius={radius} smoothness={3} castShadow receiveShadow><meshStandardMaterial color={color} roughness={0.55} metalness={0.02} /></RoundedBox>;
}

function RoomShell() {
  return <group name="room-shell"><ToyBox position={[0, 0, 0]} scale={[12, 0.3, 9]} color="#dc99aa" radius={0.04} /><ToyBox position={[0, 3.5, -4.35]} scale={[12, 7, 0.28]} color="#efbcc7" radius={0.04} />{[-5, -3, -1, 1, 3, 5].map((x, index) => <ToyBox key={x} position={[x, 3.55, -4.17]} scale={[0.52, 6.7, 0.05]} color={index % 2 ? "#f7ded9" : "#f3d4d5"} radius={0.01} />)}<ToyBox position={[0, 0.55, -4.04]} scale={[12, 0.45, 0.42]} color={colors.cream} radius={0.05} />{[-4, -2, 0, 2, 4].map((x) => <ToyBox key={`floor-${x}`} position={[x, 0.17, 0]} scale={[0.035, 0.03, 8.8]} color="#f8d4d6" radius={0.005} />)}</group>;
}

function CameraRig() {
  const { camera, size } = useThree();

  useLayoutEffect(() => {
    const perspectiveCamera = camera as typeof camera & { fov: number; updateProjectionMatrix: () => void };
    const isCompact = size.width < 760;
    perspectiveCamera.position.set(isCompact ? 14.6 : 10.5, isCompact ? 9.4 : 7.6, isCompact ? 19.6 : 13.5);
    perspectiveCamera.lookAt(0, 1.85, -0.82);
    perspectiveCamera.fov = isCompact ? 50 : 38;
    perspectiveCamera.updateProjectionMatrix();
  }, [camera, size.width]);

  return null;
}

export function BakeryScene({ onReady }: { onReady?: () => void }) {
  const [interactionActive, setInteractionActive] = useState(false);
  const interactionRuntime = useMemo(() => createInteractionRuntimeStore({
    entityId: pickupRegistry.strawberryCake.id,
    entityType: pickupRegistry.strawberryCake.type,
    phase: "idle",
    position: pickupRegistry.strawberryCake.originalTransform.position,
  }), []);

  useEffect(() => {
    onReady?.();
  }, [onReady]);

  return <>
    <color attach="background" args={["#f2b7c3"]} />
    <CameraRig />
    <ambientLight intensity={0.52} />
    <hemisphereLight args={["#fff8ed", "#aa7880", 0.66]} />
    <directionalLight position={[5, 9, 7]} intensity={1.42} color="#fff1dd" castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.00035} shadow-normalBias={0.035} shadow-camera-near={1} shadow-camera-far={24} shadow-camera-left={-7} shadow-camera-right={7} shadow-camera-top={7} shadow-camera-bottom={-3} />
    <rectAreaLight position={[-3.5, 6.5, 5]} rotation={[-0.72, -0.35, 0]} intensity={1.35} width={5.5} height={4.5} color="#fff4e6" />
    <directionalLight position={[-5, 4, 3]} intensity={0.34} color="#f3d9e3" />
    <RoomShell />
    <RoomDecorModel />
    <DisplayCabinetModel position={[0, 0.15, -2.1]} name="display-case" />
    <SideShelfModel position={[-4.55, 0.15, -2.82]} rotation={[0, 0.09, 0]} name="left-shelf" />
    <SideShelfModel position={[4.55, 0.15, -2.62]} rotation={[0, -0.07, 0]} name="right-shelf" />
    <CafeSetModel position={[3.42, 0.15, 1.5]} name={sceneEntities.table.id} userData={{ futureActions: sceneEntities.table.futureActions }} />
    <BakeryPropsModel />
    <BakeryInteractions onCarryChange={setInteractionActive} runtimeStore={interactionRuntime} />
    <MascotActor runtimeStore={interactionRuntime} />
    <ContactShadows position={[0, 0.17, 0]} opacity={0.23} scale={13} blur={3} far={4.5} resolution={512} color={colors.brown} />
    <OrbitControls makeDefault enabled={!interactionActive} enablePan={false} enableZoom minDistance={13} maxDistance={25} minPolarAngle={0.85} maxPolarAngle={1.35} minAzimuthAngle={-0.42} maxAzimuthAngle={0.42} target={[0, 1.85, -0.82]} />
  </>;
}
