"use client";

import { Clone, useGLTF } from "@react-three/drei";
import type { ThreeElements } from "@react-three/fiber";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const modelUrls = {
  displayCabinet: `${basePath}/models/bakery/display-cabinet.glb`,
  sideShelf: `${basePath}/models/bakery/side-shelf.glb`,
  cafeSet: `${basePath}/models/bakery/cafe-set.glb`,
  props: `${basePath}/models/bakery/bakery-props.glb`,
  interactiveCake: `${basePath}/models/bakery/interactive-cake.glb`,
  hamster: `${basePath}/models/bakery/hamster.glb`,
  roomDecor: `${basePath}/models/bakery/room-decor.glb`,
} as const;

type GroupProps = ThreeElements["group"];

type ModelProps = GroupProps & {
  asset: keyof typeof modelUrls;
};

function BakeryModel({ asset, ...props }: ModelProps) {
  const { scene } = useGLTF(modelUrls[asset]);

  return (
    <group {...props}>
      <Clone object={scene} castShadow receiveShadow />
    </group>
  );
}

export function DisplayCabinetModel(props: GroupProps) {
  return <BakeryModel asset="displayCabinet" {...props} />;
}

export function SideShelfModel(props: GroupProps) {
  return <BakeryModel asset="sideShelf" {...props} />;
}

export function CafeSetModel(props: GroupProps) {
  return <BakeryModel asset="cafeSet" {...props} />;
}

export function BakeryPropsModel(props: GroupProps) {
  return <BakeryModel asset="props" {...props} />;
}

export function InteractiveCakeModel(props: GroupProps) {
  return <BakeryModel asset="interactiveCake" {...props} />;
}

export function HamsterModel(props: GroupProps) {
  return <BakeryModel asset="hamster" {...props} />;
}

export function RoomDecorModel(props: GroupProps) {
  return <BakeryModel asset="roomDecor" {...props} />;
}

Object.values(modelUrls).forEach((url) => useGLTF.preload(url));
