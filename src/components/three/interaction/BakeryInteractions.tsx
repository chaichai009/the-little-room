"use client";

import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import * as THREE from "three";
import { InteractiveCakeModel } from "../models/BakeryModels";
import { acceptsEntity, containsDropPoint, getDropPoint } from "./drop-zones";
import { createInteractionState, interactionReducer } from "./interaction-state";
import { dropZoneRegistry, pickupRegistry } from "./registry";
import type { InteractionRuntimeStore } from "./runtime-store";
import type { DropZoneDefinition, InteractionPhase } from "./types";

const cakeDefinition = pickupRegistry.strawberryCake;
const tableDropZone = dropZoneRegistry.cafeTableTop;
const shelfDropZone = dropZoneRegistry.displayShelfHome;
const cakeDropZones: DropZoneDefinition[] = [tableDropZone, shelfDropZone];
const carryPhases: InteractionPhase[] = ["picked", "carrying", "placeable"];
const CARRY_FOREGROUND_Z = -0.95;

function damp(current: number, target: number, delta: number, speed = 11) {
  return THREE.MathUtils.damp(current, target, speed, delta);
}

function DropZoneHint({ zone, visible }: { zone: DropZoneDefinition; visible: boolean }) {
  return (
    <mesh
      position={[zone.center[0], zone.surfaceY + 0.018, zone.center[2]]}
      rotation={[-Math.PI / 2, 0, 0]}
      visible={visible}
      raycast={() => null}
    >
      <ringGeometry args={[zone.radius * 0.72, zone.radius, 48]} />
      <meshBasicMaterial color="#fff0d2" transparent opacity={0.56} depthWrite={false} />
    </mesh>
  );
}

export function BakeryInteractions({
  onCarryChange,
  runtimeStore,
}: {
  onCarryChange?: (active: boolean) => void;
  runtimeStore: InteractionRuntimeStore;
}) {
  const [runtime, dispatch] = useReducer(
    interactionReducer,
    cakeDefinition,
    createInteractionState,
  );
  const groupRef = useRef<THREE.Group>(null);
  const phaseRef = useRef<InteractionPhase>(runtime.phase);
  const restingPhaseRef = useRef<"idle" | "placed">("idle");
  const phaseElapsedRef = useRef(0);
  const activeZoneRef = useRef<DropZoneDefinition | null>(null);
  const dropPointRef = useRef(new THREE.Vector3());
  const targetRef = useRef(new THREE.Vector3(...cakeDefinition.originalTransform.position));
  const legalPositionRef = useRef(new THREE.Vector3(...cakeDefinition.originalTransform.position));
  const ignoreReleaseUntilRef = useRef(0);
  const localRaycaster = useMemo(() => new THREE.Raycaster(), []);
  const carryPlane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 1, 0), -cakeDefinition.carryHeight),
    [],
  );
  const carryPoint = useMemo(() => new THREE.Vector3(), []);
  const zonePoint = useMemo(() => new THREE.Vector3(), []);
  const releasePointer = useMemo(() => new THREE.Vector2(), []);
  const { camera, gl, pointer } = useThree();

  const setPhase = useCallback((phase: InteractionPhase) => {
    phaseRef.current = phase;
    phaseElapsedRef.current = 0;
    runtimeStore.current.phase = phase;
  }, [runtimeStore]);

  const resolveDropZone = useCallback((ray: THREE.Ray) => {
    for (const zone of cakeDropZones) {
      if (!acceptsEntity(zone, cakeDefinition)) continue;
      const zoneHit = getDropPoint(ray, zone, zonePoint);
      if (!zoneHit || !containsDropPoint(zone, zonePoint)) continue;
      dropPointRef.current.set(
        zone.snapToCenter ? zone.center[0] : zonePoint.x,
        zone.surfaceY,
        zone.snapToCenter ? zone.center[2] : zonePoint.z,
      );
      return zone;
    }
    return null;
  }, [zonePoint]);

  useEffect(() => {
    const canvas = gl.domElement;
    canvas.dataset.cakeState = runtime.phase;
    canvas.dataset.cakeContainer = runtime.currentContainer;
    canvas.dataset.cakeSurface = runtime.currentSurface;
    canvas.dataset.cakePosition = runtime.currentTransform.position.join(",");
  }, [gl, runtime]);

  useEffect(() => {
    const canvas = gl.domElement;
    const finishCarry = (event: PointerEvent) => {
      if (!carryPhases.includes(phaseRef.current) || performance.now() < ignoreReleaseUntilRef.current) return;
      const group = groupRef.current;
      if (!group) return;
      const rect = canvas.getBoundingClientRect();
      releasePointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      localRaycaster.setFromCamera(releasePointer, camera);
      const zone = resolveDropZone(localRaycaster.ray) ?? activeZoneRef.current;

      if (phaseRef.current === "placeable" && zone) {
        targetRef.current.copy(dropPointRef.current);
        legalPositionRef.current.copy(dropPointRef.current);
        restingPhaseRef.current = "placed";
        activeZoneRef.current = null;
        setPhase("placed");
        dispatch({
          type: "PLACE",
          zone,
          transform: {
            ...cakeDefinition.originalTransform,
            position: [dropPointRef.current.x, dropPointRef.current.y, dropPointRef.current.z],
          },
        });
      } else {
        targetRef.current.copy(legalPositionRef.current);
        activeZoneRef.current = null;
        setPhase("returning");
        dispatch({ type: "RETURN" });
      }
      document.body.style.cursor = "auto";
      onCarryChange?.(false);
    };

    canvas.addEventListener("pointerup", finishCarry);
    return () => canvas.removeEventListener("pointerup", finishCarry);
  }, [camera, gl, localRaycaster, onCarryChange, releasePointer, resolveDropZone, setPhase]);

  useEffect(() => () => {
    document.body.style.cursor = "";
  }, []);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const phase = phaseRef.current;
    phaseElapsedRef.current += delta;

    if (phase === "picked") {
      targetRef.current.copy(legalPositionRef.current);
      targetRef.current.y += 0.14;
      if (phaseElapsedRef.current >= 0.16) {
        setPhase("carrying");
        dispatch({ type: "CARRY" });
      }
    }

    if (phase === "carrying" || phase === "placeable") {
      localRaycaster.setFromCamera(pointer, camera);
      const ray = localRaycaster.ray;
      const matchedZone = resolveDropZone(ray);

      if (matchedZone) {
        targetRef.current.copy(dropPointRef.current);
        if (typeof matchedZone.carryPreviewZ === "number") {
          targetRef.current.z = matchedZone.carryPreviewZ;
        }
        activeZoneRef.current = matchedZone;
        if (phase !== "placeable") {
          setPhase("placeable");
          dispatch({ type: "ENTER_DROP_ZONE", zoneId: matchedZone.id });
        }
        targetRef.current.y += matchedZone.carryPreviewLift
          ?? 0.035 * Math.exp(-phaseElapsedRef.current * 12);
      } else {
        ray.intersectPlane(carryPlane, carryPoint);
        if (Number.isFinite(carryPoint.x)) {
          targetRef.current.copy(carryPoint);
          targetRef.current.z = Math.max(targetRef.current.z, CARRY_FOREGROUND_Z);
        }
        activeZoneRef.current = null;
        if (phase === "placeable") {
          setPhase("carrying");
          dispatch({ type: "LEAVE_DROP_ZONE" });
        }
      }
    } else if (phase === "hovered") {
      targetRef.current.copy(legalPositionRef.current);
      targetRef.current.y += 0.07;
    } else if (phase === "idle" || phase === "placed" || phase === "returning") {
      targetRef.current.copy(legalPositionRef.current);
    }

    const moveSpeed = phase === "returning"
      ? 7.5
      : phase === "carrying"
        ? 9
        : phase === "placeable" || phase === "placed"
          ? 15
          : 12;
    group.position.set(
      damp(group.position.x, targetRef.current.x, delta, moveSpeed),
      damp(group.position.y, targetRef.current.y, delta, moveSpeed),
      damp(group.position.z, targetRef.current.z, delta, moveSpeed),
    );

    const targetScale = phase === "hovered"
      ? 1.04
      : phase === "picked" || phase === "carrying"
        ? 1.035
        : phase === "placeable"
          ? 1.045
          : 1;
    const nextScale = damp(group.scale.x, targetScale, delta, 14);
    group.scale.setScalar(nextScale);

    runtimeStore.current.position.x = group.position.x;
    runtimeStore.current.position.y = group.position.y;
    runtimeStore.current.position.z = group.position.z;
    runtimeStore.current.activeDropZone = activeZoneRef.current?.id ?? null;

    if (phase === "returning" && group.position.distanceToSquared(legalPositionRef.current) < 0.00015) {
      group.position.copy(legalPositionRef.current);
      group.scale.setScalar(1);
      setPhase(restingPhaseRef.current);
      dispatch({ type: "RESTORE" });
    }
    if (phase === "placed" && group.position.distanceToSquared(dropPointRef.current) < 0.00008) {
      group.position.copy(dropPointRef.current);
    }
  });

  const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    if (phaseRef.current !== "idle" && phaseRef.current !== "placed") return;
    document.body.style.cursor = "grab";
    setPhase("hovered");
    dispatch({ type: "HOVER" });
  };

  const handlePointerOut = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    if (phaseRef.current !== "hovered") return;
    document.body.style.cursor = "auto";
    setPhase(restingPhaseRef.current);
    dispatch({ type: "LEAVE" });
  };

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    if (phaseRef.current !== "idle" && phaseRef.current !== "hovered" && phaseRef.current !== "placed") return;
    event.stopPropagation();
    ignoreReleaseUntilRef.current = performance.now() + 220;
    document.body.style.cursor = "grabbing";
    setPhase("picked");
    dispatch({ type: "PICK" });
    onCarryChange?.(true);
  };

  return (
    <group name="bakery-interaction-layer">
      <group
        ref={groupRef}
        name={runtime.id}
        position={cakeDefinition.originalTransform.position}
        rotation={cakeDefinition.originalTransform.rotation}
        scale={cakeDefinition.originalTransform.scale}
        userData={{
          interactionPhase: runtime.phase,
          entityType: runtime.type,
          currentContainer: runtime.currentContainer,
          currentSurface: runtime.currentSurface,
          pickupable: runtime.pickupable,
          allowedDropZones: runtime.allowedDropZones,
        }}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onPointerDown={handlePointerDown}
      >
        <mesh position={[0, 0.3, 0.08]} visible>
          <boxGeometry args={[0.7, 0.68, 0.7]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
        </mesh>
        <InteractiveCakeModel />
      </group>
      {cakeDropZones.map((zone) => (
        <DropZoneHint
          key={zone.id}
          zone={zone}
          visible={runtime.phase === "placeable" && runtime.activeDropZone === zone.id}
        />
      ))}
    </group>
  );
}
