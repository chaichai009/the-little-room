import type {
  InteractionAction,
  InteractionEntityState,
  PickupEntityDefinition,
} from "./types";

export function createInteractionState(entity: PickupEntityDefinition): InteractionEntityState {
  return {
    id: entity.id,
    type: entity.type,
    phase: "idle",
    currentTransform: entity.originalTransform,
    currentContainer: entity.originalContainer,
    currentSurface: entity.originalSurface,
    pickupable: entity.pickupable,
    allowedDropZones: entity.allowedDropZones,
    activeDropZone: null,
    restingPhase: "idle",
  };
}

export function interactionReducer(
  state: InteractionEntityState,
  action: InteractionAction,
): InteractionEntityState {
  switch (action.type) {
    case "HOVER":
      return state.phase === "idle" || state.phase === "placed"
        ? { ...state, phase: "hovered" }
        : state;
    case "LEAVE":
      return state.phase === "hovered" ? { ...state, phase: state.restingPhase } : state;
    case "PICK":
      return state.pickupable && (state.phase === "idle" || state.phase === "hovered" || state.phase === "placed")
        ? { ...state, phase: "picked", activeDropZone: null }
        : state;
    case "CARRY":
      return state.phase === "picked" ? { ...state, phase: "carrying" } : state;
    case "ENTER_DROP_ZONE":
      return state.phase === "carrying" || state.phase === "placeable"
        ? { ...state, phase: "placeable", activeDropZone: action.zoneId }
        : state;
    case "LEAVE_DROP_ZONE":
      return state.phase === "placeable"
        ? { ...state, phase: "carrying", activeDropZone: null }
        : state;
    case "PLACE":
      return {
        ...state,
        phase: "placed",
        currentTransform: action.transform,
        currentContainer: action.zone.container,
        currentSurface: action.zone.surface,
        activeDropZone: null,
        pickupable: true,
        restingPhase: "placed",
      };
    case "RETURN":
      return { ...state, phase: "returning", activeDropZone: null };
    case "RESTORE":
      return { ...state, phase: state.restingPhase, activeDropZone: null };
    case "RESET":
      return createInteractionState(action.entity);
    default:
      return state;
  }
}
