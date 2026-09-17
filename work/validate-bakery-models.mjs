import { readFile } from "node:fs/promises";
import path from "node:path";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const files = [
  "display-cabinet.glb",
  "side-shelf.glb",
  "cafe-set.glb",
  "bakery-props.glb",
  "interactive-cake.glb",
  "hamster.glb",
  "room-decor.glb",
];

const loader = new GLTFLoader();
const loaded = new Map();
const failures = [];
let totalBytes = 0;
let totalMeshes = 0;
let totalTriangles = 0;
const allMaterials = new Set();
const allTextures = new Set();
const roughnessValues = [];
const round = (value) => Number(value.toFixed(3));
const bounds = (object) => {
  object.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  return {
    min: [round(box.min.x), round(box.min.y), round(box.min.z)],
    max: [round(box.max.x), round(box.max.y), round(box.max.z)],
    size: [round(size.x), round(size.y), round(size.z)],
    box,
  };
};
const boundsInParent = (object) => {
  object.updateWorldMatrix(true, true);
  const inverseParent = object.parent.matrixWorld.clone().invert();
  const box = new THREE.Box3().makeEmpty();
  const corner = new THREE.Vector3();
  object.traverse((child) => {
    if (!child.isMesh) return;
    child.geometry.computeBoundingBox();
    const childBox = child.geometry.boundingBox;
    for (const x of [childBox.min.x, childBox.max.x]) {
      for (const y of [childBox.min.y, childBox.max.y]) {
        for (const z of [childBox.min.z, childBox.max.z]) {
          corner.set(x, y, z).applyMatrix4(child.matrixWorld).applyMatrix4(inverseParent);
          box.expandByPoint(corner);
        }
      }
    }
  });
  return box;
};

for (const file of files) {
  const data = await readFile(path.join(process.cwd(), "public", "models", "bakery", file));
  totalBytes += data.byteLength;
  const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  const gltf = await loader.parseAsync(arrayBuffer, "");
  let meshes = 0;
  let triangles = 0;
  gltf.scene.traverse((object) => {
    if (!object.isMesh) return;
    meshes += 1;
    const positionCount = object.geometry?.attributes?.position?.count ?? 0;
    triangles += object.geometry?.index ? object.geometry.index.count / 3 : positionCount / 3;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.filter(Boolean).forEach((entry) => {
      allMaterials.add(entry.uuid);
      if (typeof entry.roughness === "number") roughnessValues.push(entry.roughness);
      Object.values(entry).forEach((value) => {
        if (value?.isTexture) allTextures.add(value.uuid);
      });
    });
  });
  totalMeshes += meshes;
  totalTriangles += triangles;
  const assetBounds = bounds(gltf.scene);
  loaded.set(file, gltf.scene);
  const root = gltf.scene.children[0];
  if (!root) failures.push(`${file} has no exported asset root`);
  if (root && (!root.position.equals(new THREE.Vector3()) || !root.scale.equals(new THREE.Vector3(1, 1, 1)) || root.rotation.x !== 0 || root.rotation.y !== 0 || root.rotation.z !== 0)) {
    failures.push(`${file} root transform is not normalized`);
  }
  console.log(`${file}: ${meshes} meshes, ${Math.round(triangles).toLocaleString()} triangles, ${(data.byteLength / 1024).toFixed(0)} KB, size ${assetBounds.size.join(" × ")}, minY ${assetBounds.min[1]}`);
}

if (totalBytes > 8 * 1024 * 1024) failures.push(`Total GLB payload ${(totalBytes / 1024 / 1024).toFixed(2)} MB exceeds the 8 MB mobile budget`);
if (totalTriangles > 180000) failures.push(`Scene draw geometry ${Math.round(totalTriangles).toLocaleString()} triangles exceeds the 180,000 triangle budget`);
if (allMaterials.size < 10) failures.push(`Only ${allMaterials.size} materials found; the final material system lacks sufficient differentiation`);
const roughnessRange = Math.max(...roughnessValues) - Math.min(...roughnessValues);
if (roughnessRange < 0.2) failures.push(`Material roughness range ${roughnessRange.toFixed(2)} is too uniform`);
console.log(`Scene budget: ${totalMeshes} meshes, ${Math.round(totalTriangles).toLocaleString()} triangles, ${(totalBytes / 1024 / 1024).toFixed(2)} MB, ${allMaterials.size} materials, ${allTextures.size} textures`);
console.log(`Material roughness range: ${Math.min(...roughnessValues).toFixed(2)}–${Math.max(...roughnessValues).toFixed(2)}`);

const props = loaded.get("bakery-props.glb");
let alignedProducts = 0;
props.traverse((object) => {
  if (typeof object.userData.surfaceYWorld !== "number") return;
  alignedProducts += 1;
  const itemBounds = bounds(object);
  const delta = Math.abs(itemBounds.box.min.y - object.userData.surfaceYWorld);
  if (delta > 0.002) failures.push(`${object.name} bottom differs from its shelf by ${delta.toFixed(4)}`);
});
console.log(`Box3-aligned products: ${alignedProducts}`);
if (alignedProducts !== 23) failures.push(`Expected 23 static Box3-aligned products after extracting the interactive cake, found ${alignedProducts}`);

const productGroups = [];
props.traverse((object) => {
  if (object.userData.itemType) productGroups.push(object);
});
for (let index = 0; index < productGroups.length; index += 1) {
  for (let compareIndex = index + 1; compareIndex < productGroups.length; compareIndex += 1) {
    const first = productGroups[index];
    const second = productGroups[compareIndex];
    if (first.parent !== second.parent) continue;
    const firstBox = bounds(first).box.clone().expandByScalar(-0.012);
    const secondBox = bounds(second).box.clone().expandByScalar(-0.012);
    if (firstBox.intersectsBox(secondBox)) failures.push(`${first.name} intersects ${second.name}`);
  }
}
console.log(`Product collision pairs checked: ${productGroups.length}`);

let depthCheckedProducts = 0;
for (const product of productGroups) {
  if (typeof product.userData.safeDepthMin !== "number" || typeof product.userData.safeDepthMax !== "number") continue;
  depthCheckedProducts += 1;
  const localBox = boundsInParent(product);
  if (localBox.min.z < product.userData.safeDepthMin - 0.002 || localBox.max.z > product.userData.safeDepthMax + 0.002) {
    failures.push(`${product.name} depth ${localBox.min.z.toFixed(3)}–${localBox.max.z.toFixed(3)} exceeds safe shelf range ${product.userData.safeDepthMin}–${product.userData.safeDepthMax}`);
  }
}
if (depthCheckedProducts !== 23) failures.push(`Expected safe-depth metadata on 23 static shelf products, found ${depthCheckedProducts}`);
if (props.getObjectByName("SageNapkin")) failures.push("Removed green table block is still present");
console.log(`Safe shelf depth products: ${depthCheckedProducts}; green table block removed: ${!props.getObjectByName("SageNapkin")}`);

const cafe = loaded.get("cafe-set.glb");
const tableBase = bounds(cafe.getObjectByName("TableBase"));
const tableColumn = bounds(cafe.getObjectByName("TableColumn"));
const tableTop = bounds(cafe.getObjectByName("TableTop"));
const chair = bounds(cafe.getObjectByName("CafeChair"));
if (tableBase.box.min.y < -0.002) failures.push("Table base extends below the floor");
if (Math.abs(tableColumn.box.min.y - tableBase.box.max.y) > 0.002) failures.push("Table base and column do not meet at a clean shared plane");
if (Math.abs(tableTop.box.min.y - tableColumn.box.max.y) > 0.002) failures.push("Table column and top do not meet at a clean shared plane");
if (chair.box.min.y < -0.002) failures.push("Chair extends below the floor");
if (tableTop.box.intersectsBox(chair.box)) failures.push("Chair bounding box intersects the table top");
const expectedChairRotation = Math.PI - 0.52;
const chairObject = cafe.getObjectByName("CafeChair");
const expectedChairQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, expectedChairRotation, 0));
if (chairObject.quaternion.angleTo(expectedChairQuaternion) > 0.002) failures.push("Chair is not rotated 180 degrees from its previous orientation");
console.log(`Table joints: base top ${tableBase.max[1]}, column ${tableColumn.min[1]}–${tableColumn.max[1]}, top bottom ${tableTop.min[1]}`);
console.log(`Chair orientation quaternion angle check: ${chairObject.quaternion.angleTo(expectedChairQuaternion).toFixed(4)} rad`);

const sideShelf = loaded.get("side-shelf.glb");
for (const boardName of ["ShelfBoard1", "ShelfBoard2", "ShelfBoard3"]) {
  const boardBox = bounds(sideShelf.getObjectByName(boardName)).box.clone().expandByScalar(-0.002);
  for (const postName of ["ShelfLeftPost", "ShelfRightPost"]) {
    const postBox = bounds(sideShelf.getObjectByName(postName)).box.clone().expandByScalar(-0.002);
    if (boardBox.intersectsBox(postBox)) failures.push(`${boardName} intersects ${postName}`);
  }
}
console.log("Side shelf board/post intersections checked: 3 boards × 2 posts");

const hamsterScene = loaded.get("hamster.glb");
const hamster = bounds(hamsterScene);
if (hamster.box.min.y < -0.01) failures.push("Hamster extends below the floor");
if (hamster.size[1] > 1.55 || hamster.size[1] < 1.3) failures.push(`Hamster height ${hamster.size[1]} is outside the Art Pass 2 toy scale target`);
const hamsterBody = hamsterScene.getObjectByName("ContinuousHamsterBody");
const hamsterBodyBounds = bounds(hamsterBody);
for (const eyeName of ["Eye1", "Eye2"]) {
  const eye = hamsterScene.getObjectByName(eyeName);
  const eyeBounds = bounds(eye);
  if (eyeBounds.size[0] < 0.17 || eyeBounds.box.max.z < 0.7) failures.push(`${eyeName} is not large or forward enough for clear facial readability`);
  if (eyeBounds.box.max.z > hamsterBodyBounds.box.max.z + 0.035) failures.push(`${eyeName} protrudes too far beyond the face`);
  const depthRatio = eyeBounds.size[2] / eyeBounds.size[0];
  if (depthRatio < 0.82) failures.push(`${eyeName} is flattened into a disc instead of an embedded spherical eye`);
}
for (const pawName of ["FrontPaw1", "FrontPaw2"]) {
  const pawBounds = bounds(hamsterScene.getObjectByName(pawName));
  if (pawBounds.size[1] > 0.14 || pawBounds.size[2] > 0.1) failures.push(`${pawName} is too long or cylindrical`);
}
const bodyPositions = hamsterBody.geometry.getAttribute("position");
let topY = -Infinity;
for (let index = 0; index < bodyPositions.count; index += 1) topY = Math.max(topY, bodyPositions.getY(index));
let topCapRadius = 0;
for (let index = 0; index < bodyPositions.count; index += 1) {
  if (bodyPositions.getY(index) < topY - 0.001) continue;
  topCapRadius = Math.max(topCapRadius, Math.hypot(bodyPositions.getX(index), bodyPositions.getZ(index)));
}
if (topCapRadius > 0.003) failures.push(`Hamster crown remains open with radius ${topCapRadius.toFixed(4)}`);
hamsterScene.traverse((object) => {
  if (!object.isMesh || !object.material?.name?.includes("HamsterPink")) return;
  const objectBounds = bounds(object);
  const centerX = (objectBounds.box.min.x + objectBounds.box.max.x) / 2;
  if (objectBounds.box.max.y > 1.31 && Math.abs(centerX) < 0.15) {
    failures.push(`${object.name} creates an unintended pink dot at the hamster crown`);
  }
});
console.log(`Hamster face checks: embedded eyes, dumpling paws, sealed crown radius ${topCapRadius.toFixed(4)}`);

const interactiveCakeScene = loaded.get("interactive-cake.glb");
const interactiveCake = bounds(interactiveCakeScene);
if (Math.abs(interactiveCake.box.min.y) > 0.002) failures.push(`Interactive cake origin is not bottom-aligned: minY ${interactiveCake.min[1]}`);
const cakeCrumb = bounds(interactiveCakeScene.getObjectByName("InteractiveStrawberryCakeCrumb"));
const cakeFrosting = bounds(interactiveCakeScene.getObjectByName("InteractiveStrawberryCakeFrostingLayer"));
const cakeCream = bounds(interactiveCakeScene.getObjectByName("InteractiveStrawberryCakeTopCream"));
if (cakeFrosting.box.min.y < cakeCrumb.box.max.y - 0.001) failures.push("Interactive cake frosting penetrates the cake crumb");
if (cakeFrosting.box.min.y > cakeCrumb.box.max.y + 0.003) failures.push("Interactive cake has a visible gap below the frosting");
if (cakeCream.box.min.y < cakeFrosting.box.max.y - 0.001) failures.push("Interactive cake top cream penetrates the frosting layer");
if (cakeCream.box.min.y > cakeFrosting.box.max.y + 0.003) failures.push("Interactive cake has a visible gap below the top cream");
console.log(`Interactive cake layer joints: crumb ${cakeCrumb.max[1]}, frosting ${cakeFrosting.min[1]}–${cakeFrosting.max[1]}, cream ${cakeCream.min[1]}`);

for (const file of ["display-cabinet.glb", "side-shelf.glb", "cafe-set.glb"]) {
  const asset = bounds(loaded.get(file));
  if (Math.abs(asset.box.min.y) > 0.002) failures.push(`${file} does not sit on its local floor: minY ${asset.min[1]}`);
}

const decor = bounds(loaded.get("room-decor.glb"));
if (decor.box.min.z < -4.21) failures.push(`Wall decor enters the back wall: minZ ${decor.min[2]}`);

if (failures.length) {
  console.error(`Validation failed:\n- ${failures.join("\n- ")}`);
  process.exitCode = 1;
} else {
  console.log("Final asset and layout validation passed.");
}
