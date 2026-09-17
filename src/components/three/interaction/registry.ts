import type { DropZoneDefinition, PickupEntityDefinition } from "./types";

export const pickupRegistry = {
  strawberryCake: {
    id: "strawberry-cake",
    type: "cake",
    originalTransform: {
      position: [0.43, 3.25, -1.8],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    },
    originalContainer: "display-case",
    originalSurface: "display-shelf-3",
    pickupable: true,
    allowedDropZones: ["cafe-table-top", "display-shelf-home"],
    carryHeight: 2.5,
  },
} satisfies Record<string, PickupEntityDefinition>;

export const dropZoneRegistry = {
  cafeTableTop: {
    id: "cafe-table-top",
    acceptedTypes: ["cake"],
    container: "cafe-table",
    surface: "table-top",
    shape: "circle",
    center: [3.42, 1.79, 1.5],
    radius: 0.62,
    surfaceY: 1.79,
  },
  displayShelfHome: {
    id: "display-shelf-home",
    acceptedTypes: ["cake"],
    container: "display-case",
    surface: "display-shelf-3",
    shape: "circle",
    center: [0.43, 3.25, -1.8],
    radius: 0.46,
    surfaceY: 3.25,
    snapToCenter: true,
    carryPreviewZ: -1.02,
    carryPreviewLift: 0.1,
  },
} satisfies Record<string, DropZoneDefinition>;
