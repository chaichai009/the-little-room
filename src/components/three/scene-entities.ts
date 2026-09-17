export const sceneEntities = {
  displayCase: { id: "display-case", futureActions: ["open", "take-pastry"] },
  table: { id: "cafe-table", futureActions: ["place-item"] },
  drinkMachine: { id: "drink-machine", futureActions: ["fill-cup"] },
  hamster: { id: "hamster-mascot", futureActions: ["wander", "react"] },
} as const;

export type SceneEntityId = (typeof sceneEntities)[keyof typeof sceneEntities]["id"];
