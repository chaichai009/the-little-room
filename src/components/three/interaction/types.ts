import type { EulerTuple, Vector3Tuple } from "three";

export type InteractionPhase =
  | "idle"
  | "hovered"
  | "picked"
  | "carrying"
  | "placeable"
  | "placed"
  | "returning";

export type EntityTransform = {
  position: Vector3Tuple;
  rotation: EulerTuple;
  scale: Vector3Tuple;
};

export type PickupEntityDefinition = {
  id: string;
  type: string;
  originalTransform: EntityTransform;
  originalContainer: string;
  originalSurface: string;
  pickupable: boolean;
  allowedDropZones: string[];
  carryHeight: number;
};

export type CircleDropZoneDefinition = {
  id: string;
  acceptedTypes: string[];
  container: string;
  surface: string;
  shape: "circle";
  center: Vector3Tuple;
  radius: number;
  surfaceY: number;
  snapToCenter?: boolean;
  carryPreviewZ?: number;
  carryPreviewLift?: number;
};

export type DropZoneDefinition = CircleDropZoneDefinition;

export type InteractionEntityState = {
  id: string;
  type: string;
  phase: InteractionPhase;
  currentTransform: EntityTransform;
  currentContainer: string;
  currentSurface: string;
  pickupable: boolean;
  allowedDropZones: string[];
  activeDropZone: string | null;
  restingPhase: "idle" | "placed";
};

export type InteractionAction =
  | { type: "HOVER" }
  | { type: "LEAVE" }
  | { type: "PICK" }
  | { type: "CARRY" }
  | { type: "ENTER_DROP_ZONE"; zoneId: string }
  | { type: "LEAVE_DROP_ZONE" }
  | { type: "PLACE"; zone: DropZoneDefinition; transform: EntityTransform }
  | { type: "RETURN" }
  | { type: "RESTORE" }
  | { type: "RESET"; entity: PickupEntityDefinition };
