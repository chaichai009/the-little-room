"use client";

import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import type { InteractionRuntimeStore } from "../interaction/runtime-store";
import { HamsterModel } from "../models/BakeryModels";
import { sceneEntities } from "../scene-entities";
import { isCakeAttentionPhase, type MascotBehaviorState } from "./reaction-state";
import { mascotAnchorById } from "./wander-anchors";

const START_ANCHOR_ID = "home";
const DEFAULT_YAW = 0.45;
const MAX_WATCH_YAW = 0.52;
const PLACED_WATCH_SECONDS = 1.6;
const PET_DURATION = 1.45;
const PET_COOLDOWN = 2.1;
const WANDER_SPEED = 0.46;

type BlinkPart = { object: THREE.Object3D; baseScaleY: number };

function shortestAngle(from: number, to: number) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

export function MascotActor({ runtimeStore }: { runtimeStore: InteractionRuntimeStore }) {
  const actorRef = useRef<THREE.Group>(null);
  const visualRef = useRef<THREE.Group>(null);
  const heartRefs = useRef<Array<THREE.Group | null>>([]);
  const blinkPartsRef = useRef<BlinkPart[]>([]);
  const blushMaterialsRef = useRef<THREE.Material[]>([]);
  const behaviorRef = useRef<MascotBehaviorState>("pauseAtSpot");
  const previousPhaseRef = useRef(runtimeStore.current.phase);
  const placedWatchUntilRef = useRef(0);
  const watchBaseYawRef = useRef(DEFAULT_YAW);
  const currentAnchorIdRef = useRef(START_ANCHOR_ID);
  const targetAnchorIdRef = useRef<string | null>(null);
  const nextMoveAtRef = useRef(2.5);
  const nextBlinkAtRef = useRef(3.4);
  const blinkStartedAtRef = useRef(-1);
  const petStartedAtRef = useRef(-1);
  const petUntilRef = useRef(-1);
  const petCooldownUntilRef = useRef(0);
  const petCountRef = useRef(0);
  const visibleHeartCountRef = useRef(0);
  const elapsedRef = useRef(0);
  const { gl } = useThree();

  const setBehavior = (behavior: MascotBehaviorState) => {
    if (behaviorRef.current === behavior) return;
    behaviorRef.current = behavior;
    if (actorRef.current) actorRef.current.userData.behaviorState = behavior;
    gl.domElement.dataset.mascotBehavior = behavior;
    gl.domElement.dataset.mascotReaction = behavior;
  };

  useLayoutEffect(() => {
    const visual = visualRef.current;
    if (!visual) return;
    gl.domElement.dataset.mascotBehavior = "pauseAtSpot";
    gl.domElement.dataset.mascotReaction = "pauseAtSpot";
    gl.domElement.dataset.mascotPetCount = "0";
    gl.domElement.dataset.mascotAnchor = START_ANCHOR_ID;
    const blinkParts: BlinkPart[] = [];
    const blushMaterials = new Set<THREE.Material>();
    visual.traverse((object) => {
      if (object.name.startsWith("Eye")) blinkParts.push({ object, baseScaleY: object.scale.y });
      if (object.name.startsWith("CheekBlush") && object instanceof THREE.Mesh) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
          material.transparent = true;
          material.opacity = 0.04;
          blushMaterials.add(material);
        }
      }
    });
    blinkPartsRef.current = blinkParts;
    blushMaterialsRef.current = [...blushMaterials];
  }, [gl]);

  useFrame(({ clock }, delta) => {
    const actor = actorRef.current;
    const visual = visualRef.current;
    if (!actor || !visual) return;

    const elapsed = clock.elapsedTime;
    elapsedRef.current = elapsed;
    const interaction = runtimeStore.current;
    if (interaction.phase !== previousPhaseRef.current) {
      if (interaction.phase === "placed") placedWatchUntilRef.current = elapsed + PLACED_WATCH_SECONDS;
      previousPhaseRef.current = interaction.phase;
    }

    const petActive = elapsed < petUntilRef.current;
    const cakeAttention = isCakeAttentionPhase(interaction.phase)
      || (interaction.phase === "placed" && elapsed < placedWatchUntilRef.current);

    if (petActive) {
      setBehavior("reactToPet");
    } else if (cakeAttention) {
      if (behaviorRef.current !== "watchCake") watchBaseYawRef.current = actor.rotation.y;
      setBehavior("watchCake");
    } else if (behaviorRef.current === "reactToPet" || behaviorRef.current === "watchCake") {
      nextMoveAtRef.current = elapsed + 1.1;
      setBehavior("pauseAtSpot");
    }

    let targetYaw = actor.rotation.y;
    if (behaviorRef.current === "watchCake") {
      const lookYaw = Math.atan2(
        interaction.position.x - actor.position.x,
        interaction.position.z - actor.position.z,
      );
      targetYaw = watchBaseYawRef.current + THREE.MathUtils.clamp(
        shortestAngle(watchBaseYawRef.current, lookYaw),
        -MAX_WATCH_YAW,
        MAX_WATCH_YAW,
      );
    } else if (behaviorRef.current === "wander") {
      const targetAnchor = targetAnchorIdRef.current ? mascotAnchorById.get(targetAnchorIdRef.current) : null;
      if (targetAnchor) {
        const deltaX = targetAnchor.position[0] - actor.position.x;
        const deltaZ = targetAnchor.position[2] - actor.position.z;
        const distance = Math.hypot(deltaX, deltaZ);
        if (distance <= 0.035) {
          actor.position.x = targetAnchor.position[0];
          actor.position.z = targetAnchor.position[2];
          currentAnchorIdRef.current = targetAnchor.id;
          targetAnchorIdRef.current = null;
          nextMoveAtRef.current = elapsed + 1.7 + Math.random() * 1.5;
          gl.domElement.dataset.mascotAnchor = targetAnchor.id;
          setBehavior("pauseAtSpot");
        } else {
          targetYaw = Math.atan2(deltaX, deltaZ);
          const step = Math.min(distance, WANDER_SPEED * delta);
          actor.position.x += (deltaX / distance) * step;
          actor.position.z += (deltaZ / distance) * step;
        }
      }
    } else if (behaviorRef.current === "pauseAtSpot" && elapsed >= nextMoveAtRef.current) {
      const currentAnchor = mascotAnchorById.get(currentAnchorIdRef.current);
      if (currentAnchor) {
        const candidates = currentAnchor.neighbors;
        targetAnchorIdRef.current = candidates[Math.floor(Math.random() * candidates.length)];
        setBehavior("wander");
      } else {
        currentAnchorIdRef.current = START_ANCHOR_ID;
        nextMoveAtRef.current = elapsed + 1;
      }
    }

    actor.rotation.y += shortestAngle(actor.rotation.y, targetYaw) * (1 - Math.exp(-3.1 * delta));

    const breath = Math.sin(elapsed * 1.15);
    const wanderBob = behaviorRef.current === "wander" ? Math.sin(elapsed * 8) * 0.008 : 0;
    const petProgress = petActive ? THREE.MathUtils.clamp((elapsed - petStartedAtRef.current) / PET_DURATION, 0, 1) : 1;
    const petPulse = petActive ? Math.sin(Math.min(1, petProgress / 0.38) * Math.PI) * (1 - petProgress * 0.35) : 0;
    visual.position.y = breath * 0.006 + wanderBob + petPulse * 0.012;
    visual.scale.set(
      1 + breath * 0.0025 + petPulse * 0.045,
      1 + breath * 0.004 - petPulse * 0.055,
      1 + breath * 0.0025 + petPulse * 0.035,
    );
    visual.rotation.z = petActive ? Math.sin(petProgress * Math.PI * 3) * 0.035 * (1 - petProgress) : 0;

    if (elapsed >= nextBlinkAtRef.current && blinkStartedAtRef.current < 0) blinkStartedAtRef.current = elapsed;
    const blinkElapsed = blinkStartedAtRef.current < 0 ? -1 : elapsed - blinkStartedAtRef.current;
    const idleBlink = blinkElapsed >= 0 && blinkElapsed <= 0.16 ? Math.sin((blinkElapsed / 0.16) * Math.PI) : 0;
    const petBlink = petActive ? Math.sin(petProgress * Math.PI) * 0.82 : 0;
    const blinkAmount = Math.max(idleBlink, petBlink);
    for (const part of blinkPartsRef.current) {
      part.object.scale.y = part.baseScaleY * THREE.MathUtils.lerp(1, 0.12, blinkAmount);
    }
    if (blinkElapsed > 0.16) {
      blinkStartedAtRef.current = -1;
      nextBlinkAtRef.current = elapsed + 4.8 + Math.random() * 2.2;
    }
    for (const material of blushMaterialsRef.current) {
      material.opacity = 0.04 + (petActive ? Math.sin(petProgress * Math.PI) * 0.26 : 0);
    }

    let visibleHearts = 0;
    for (let index = 0; index < heartRefs.current.length; index += 1) {
      const heart = heartRefs.current[index];
      if (!heart) continue;
      const heartProgress = petStartedAtRef.current < 0 ? 2 : (elapsed - petStartedAtRef.current - index * 0.09) / 1.25;
      const visible = heartProgress >= 0 && heartProgress <= 1;
      heart.visible = visible;
      if (!visible) continue;
      visibleHearts += 1;
      heart.position.set((index - 1) * 0.38, 1.9 + heartProgress * 0.55 + index * 0.055, 0.92);
      const heartScale = 0.82 + Math.sin(heartProgress * Math.PI) * 0.24;
      heart.scale.setScalar(heartScale);
      heart.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          (object.material as THREE.MeshBasicMaterial).opacity = Math.sin(heartProgress * Math.PI) * 0.82;
        }
      });
    }
    if (visibleHearts !== visibleHeartCountRef.current) {
      visibleHeartCountRef.current = visibleHearts;
      gl.domElement.dataset.mascotHearts = String(visibleHearts);
    }
  });

  const handlePet = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    const elapsed = elapsedRef.current;
    if (elapsed < petCooldownUntilRef.current) return;
    petStartedAtRef.current = elapsed;
    petUntilRef.current = elapsed + PET_DURATION;
    petCooldownUntilRef.current = elapsed + PET_COOLDOWN;
    petCountRef.current += 1;
    gl.domElement.dataset.mascotPetCount = String(petCountRef.current);
  };

  const startAnchor = mascotAnchorById.get(START_ANCHOR_ID)!;

  return (
    <group
      ref={actorRef}
      position={startAnchor.position}
      rotation={[0, DEFAULT_YAW, 0]}
      name={sceneEntities.hamster.id}
      userData={{ futureActions: sceneEntities.hamster.futureActions, assetStatus: "final-v2", behaviorState: "pauseAtSpot" }}
      onPointerOver={(event) => { event.stopPropagation(); document.body.style.cursor = "pointer"; }}
      onPointerOut={(event) => { event.stopPropagation(); document.body.style.cursor = "auto"; }}
      onPointerDown={handlePet}
    >
      <group ref={visualRef}>
        <mesh position={[0, 0.7, 0.05]} visible>
          <boxGeometry args={[1.65, 1.5, 1.55]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
        </mesh>
        <HamsterModel />
      </group>
      <group name="pet-heart-feedback">
        {[0, 1, 2].map((index) => (
          <group
            key={index}
            ref={(heart) => { heartRefs.current[index] = heart; }}
            visible={false}
            scale={1}
            rotation={[0, 0, index === 1 ? 0.08 : index === 2 ? -0.08 : 0]}
          >
            {[-0.065, 0.065].map((x) => (
              <mesh key={x} position={[x, 0.065, 0]} scale={[1, 0.9, 0.55]} raycast={() => null} renderOrder={10}>
                <sphereGeometry args={[0.13, 14, 10]} />
                <meshBasicMaterial color={index === 1 ? "#d95d82" : "#b9476c"} transparent opacity={0} depthTest={false} depthWrite={false} />
              </mesh>
            ))}
            <mesh position={[0, -0.055, 0]} rotation={[0, 0, Math.PI]} scale={[1, 1, 0.55]} raycast={() => null} renderOrder={10}>
              <coneGeometry args={[0.175, 0.29, 4]} />
              <meshBasicMaterial color={index === 1 ? "#d95d82" : "#b9476c"} transparent opacity={0} depthTest={false} depthWrite={false} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}
