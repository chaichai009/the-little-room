export type MascotAnchor = {
  id: string;
  position: readonly [number, number, number];
  neighbors: readonly string[];
};

export const mascotAnchors: readonly MascotAnchor[] = [
  { id: "home", position: [1.35, 0.15, 1.72], neighbors: ["room-center", "display-front"] },
  { id: "left-shelf-front", position: [-3.15, 0.15, -0.75], neighbors: ["display-front"] },
  { id: "display-front", position: [-1.2, 0.15, 0.2], neighbors: ["home", "left-shelf-front", "right-shelf-front", "room-center"] },
  { id: "room-center", position: [0.05, 0.15, 2.55], neighbors: ["home", "display-front", "table-near"] },
  { id: "table-near", position: [1.55, 0.15, 3.35], neighbors: ["room-center"] },
  { id: "right-shelf-front", position: [2.72, 0.15, -0.62], neighbors: ["display-front"] },
] as const;

export const mascotAnchorById = new Map(mascotAnchors.map((anchor) => [anchor.id, anchor]));
