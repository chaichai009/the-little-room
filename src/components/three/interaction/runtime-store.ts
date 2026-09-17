import type { InteractionPhase } from "./types";

export type InteractionRuntimeStore = {
  current: {
    entityId: string;
    entityType: string;
    phase: InteractionPhase;
    activeDropZone: string | null;
    position: { x: number; y: number; z: number };
  };
};

export function createInteractionRuntimeStore({
  entityId,
  entityType,
  phase,
  position,
}: {
  entityId: string;
  entityType: string;
  phase: InteractionPhase;
  position: readonly [number, number, number];
}): InteractionRuntimeStore {
  return {
    current: {
      entityId,
      entityType,
      phase,
      activeDropZone: null,
      position: { x: position[0], y: position[1], z: position[2] },
    },
  };
}
