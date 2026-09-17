import * as THREE from "three";
import type { DropZoneDefinition, PickupEntityDefinition } from "./types";

export function acceptsEntity(zone: DropZoneDefinition, entity: PickupEntityDefinition) {
  return entity.allowedDropZones.includes(zone.id) && zone.acceptedTypes.includes(entity.type);
}

export function containsDropPoint(zone: DropZoneDefinition, point: THREE.Vector3) {
  if (zone.shape !== "circle") return false;
  const deltaX = point.x - zone.center[0];
  const deltaZ = point.z - zone.center[2];
  return deltaX * deltaX + deltaZ * deltaZ <= zone.radius * zone.radius;
}

export function getDropPoint(
  ray: THREE.Ray,
  zone: DropZoneDefinition,
  target: THREE.Vector3,
) {
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -zone.surfaceY);
  return ray.intersectPlane(plane, target);
}
