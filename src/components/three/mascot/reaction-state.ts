import type { InteractionPhase } from "../interaction/types";

export type MascotBehaviorState =
  | "idle"
  | "wander"
  | "watchCake"
  | "reactToPet"
  | "pauseAtSpot";

export function isCakeAttentionPhase(phase: InteractionPhase) {
  return phase === "picked"
    || phase === "carrying"
    || phase === "placeable"
    || phase === "returning";
}
