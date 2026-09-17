import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

class NodeFileReader {
  result = null;
  onloadend = null;

  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = result;
      this.onloadend?.();
    });
  }

  readAsDataURL(blob) {
    blob.arrayBuffer().then((buffer) => {
      this.result = `data:${blob.type};base64,${Buffer.from(buffer).toString("base64")}`;
      this.onloadend?.();
    });
  }
}

globalThis.FileReader = NodeFileReader;

const DISPLAY_SHELF_SURFACES = [0.94, 2.02, 3.1];
const SIDE_SHELF_SURFACES = [0.85, 1.68, 2.51];
const TABLE_SURFACE = 1.64;
const DISPLAY_SAFE_DEPTH = { center: 0.3, min: -0.04, max: 0.64 };
const SIDE_SAFE_DEPTH = { center: 0.12, min: -0.18, max: 0.42 };

const palette = {
  blush: 0xe8a0b2,
  rose: 0xc96883,
  pale: 0xf5c7d0,
  cream: 0xfff0d2,
  ivory: 0xfff8e7,
  butter: 0xf2c76a,
  sage: 0x91aa82,
  brown: 0x754b44,
  caramel: 0xc77b48,
  jam: 0xcf6179,
  lemon: 0xecc85f,
  apple: 0x83a978,
  crumb: 0xd89a56,
};

function toyMaterial(name, color, roughness = 0.46) {
  return new THREE.MeshStandardMaterial({ name, color, roughness, metalness: 0 });
}

const material = {
  blush: toyMaterial("BlushPinkPaint", palette.blush, 0.43),
  rose: toyMaterial("DustyRosePaint", palette.rose, 0.46),
  pale: toyMaterial("PalePinkPaint", palette.pale, 0.42),
  cream: toyMaterial("CreamPlastic", palette.cream, 0.36),
  ivory: toyMaterial("IvoryPlastic", palette.ivory, 0.34),
  butter: toyMaterial("ButterYellowPaint", palette.butter, 0.45),
  sage: toyMaterial("SageGreenPaint", palette.sage, 0.5),
  brown: toyMaterial("WarmBrownPaint", palette.brown, 0.52),
  caramel: toyMaterial("CaramelPastry", palette.caramel, 0.47),
  crumb: toyMaterial("GoldenCakeCrumb", palette.crumb, 0.52),
  jam: toyMaterial("StrawberryJam", palette.jam, 0.28),
  lemon: toyMaterial("LemonJam", palette.lemon, 0.3),
  apple: toyMaterial("AppleJam", palette.apple, 0.32),
  eye: toyMaterial("DarkGloss", 0x241c20, 0.12),
  pink: toyMaterial("HamsterPink", 0xef91aa, 0.32),
  glass: new THREE.MeshPhysicalMaterial({ name: "ToyJarClearPlastic", color: 0xffeee8, roughness: 0.16, metalness: 0, transparent: true, opacity: 0.48, depthWrite: false }),
};

function roundedRectShape(width, height, radius) {
  const x = -width / 2;
  const y = -height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

function roundedPanel(name, width, height, depth, radius, mat, position, rotation = [0, 0, 0]) {
  const geometry = new THREE.ExtrudeGeometry(roundedRectShape(width, height, radius), {
    depth,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: Math.min(0.045, radius * 0.35),
    bevelThickness: Math.min(0.045, depth * 0.2),
    curveSegments: 8,
  });
  geometry.translate(0, 0, -depth / 2);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function turnedMesh(name, points, segments, mat, position, rotation = [0, 0, 0]) {
  const geometry = new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), segments);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function knob(name, position, mat = material.cream, scale = 1) {
  return turnedMesh(name, [[0.1 * scale, 0], [0.13 * scale, 0.06 * scale], [0.08 * scale, 0.14 * scale], [0, 0.16 * scale]], 20, mat, position, [Math.PI / 2, 0, 0]);
}

function makeStrawberryMotif(name, position, scale = 1) {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(...position);
  group.scale.setScalar(scale);
  group.add(
    turnedMesh(`${name}Berry`, [[0.02, 0], [0.17, 0.07], [0.21, 0.2], [0.14, 0.34], [0, 0.42]], 24, material.jam, [0, 0, 0]),
  );
  [-0.07, 0.07].forEach((x, index) => {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), material.sage);
    leaf.name = `${name}Leaf${index + 1}`;
    leaf.position.set(x, 0.39, 0);
    leaf.scale.set(1.5, 0.25, 0.7);
    leaf.rotation.z = index ? -0.5 : 0.5;
    group.add(leaf);
  });
  return group;
}

function placeOnSurface(object, surfaceY, parentY = 0) {
  object.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(object);
  object.position.y += surfaceY - box.min.y;
  object.updateWorldMatrix(true, true);
  const alignedBox = new THREE.Box3().setFromObject(object);
  object.userData.surfaceYWorld = Number((surfaceY + parentY).toFixed(4));
  object.userData.alignedBottom = Number((alignedBox.min.y + parentY).toFixed(4));
  return object;
}

function makeDisplayCabinet() {
  const root = new THREE.Group();
  root.name = "DisplayCabinetAsset";
  root.userData = { assetStatus: "final-v1", width: 3.9, height: 4.5, shelfSurfaces: DISPLAY_SHELF_SURFACES };
  root.add(
    roundedPanel("CabinetBack", 3.72, 3.78, 0.25, 0.2, material.rose, [0, 2.08, -0.38]),
    roundedPanel("LeftFrame", 0.3, 3.9, 1.2, 0.12, material.rose, [-1.78, 2.04, 0.08]),
    roundedPanel("RightFrame", 0.3, 3.9, 1.2, 0.12, material.rose, [1.78, 2.04, 0.08]),
    roundedPanel("Crown", 4.08, 0.34, 1.5, 0.15, material.pale, [0, 4.08, 0]),
    roundedPanel("Plinth", 3.94, 0.5, 1.42, 0.14, material.rose, [0, 0.3, 0]),
  );
  [0.82, 1.9, 2.98].forEach((y, index) => root.add(
    roundedPanel(`Shelf${index + 1}`, 3.48, 0.16, 1.12, 0.065, index === 1 ? material.pale : material.blush, [0, y, 0.38]),
  ));
  [-0.92, 0, 0.92].forEach((x, index) => {
    root.add(roundedPanel(`Drawer${index + 1}`, 0.82, 0.3, 0.12, 0.07, material.pale, [x, 0.31, 0.8]));
    root.add(knob(`DrawerKnob${index + 1}`, [x, 0.31, 0.93], index === 1 ? material.sage : material.cream, 0.64));
  });
  [-1.55, 1.55].forEach((x, index) => root.add(turnedMesh(`TurnedFoot${index + 1}`, [[0.17, 0], [0.2, 0.1], [0.13, 0.28], [0.17, 0.42]], 20, material.brown, [x, 0, -0.18])));
  [-1.55, -0.78, 0, 0.78, 1.55].forEach((x, index) => root.add(
    roundedPanel(`AwningScallop${index + 1}`, 0.77, 0.43, 1.38, 0.17, index % 2 ? material.rose : material.cream, [x, 4.34, 0.03]),
  ));
  root.add(
    roundedPanel("BakerySign", 2.5, 0.66, 0.18, 0.3, material.cream, [0, 4.86, 0.1]),
    roundedPanel("BakerySignInset", 2.18, 0.42, 0.055, 0.2, material.pale, [0, 4.86, 0.225]),
    roundedPanel("BakerySignMedallion", 0.52, 0.2, 0.04, 0.1, material.rose, [0, 4.86, 0.29]),
    makeStrawberryMotif("LeftSignStrawberry", [-0.82, 4.69, 0.31], 0.42),
    makeStrawberryMotif("RightSignStrawberry", [0.82, 4.69, 0.31], 0.42),
  );
  [-1.82, 1.82].forEach((x, index) => root.add(
    turnedMesh(`CabinetFinial${index + 1}`, [[0.12, 0], [0.17, 0.08], [0.13, 0.22], [0, 0.34]], 24, index ? material.pale : material.cream, [x, 4.16, -0.08]),
  ));
  return root;
}

function makeSideShelf() {
  const root = new THREE.Group();
  root.name = "SideShelfAsset";
  root.userData = { assetStatus: "final-v1", shelfSurfaces: SIDE_SHELF_SURFACES };
  root.add(
    roundedPanel("ShelfBack", 1.64, 3.02, 0.23, 0.16, material.rose, [0, 1.67, -0.2]),
    roundedPanel("ShelfLeftPost", 0.22, 3.0, 0.7, 0.1, material.blush, [-0.73, 1.65, 0.16]),
    roundedPanel("ShelfRightPost", 0.22, 3.0, 0.7, 0.1, material.blush, [0.73, 1.65, 0.16]),
    roundedPanel("ShelfCrown", 1.86, 0.46, 0.78, 0.2, material.pale, [0, 3.28, 0.08]),
    roundedPanel("ShelfDrawer", 1.3, 0.4, 0.15, 0.09, material.pale, [0, 0.39, 0.51]),
  );
  [0.73, 1.56, 2.39].forEach((y, index) => root.add(roundedPanel(`ShelfBoard${index + 1}`, 1.08, 0.16, 0.78, 0.05, material.blush, [0, y, 0.25])));
  root.add(knob("ShelfDrawerKnob", [0, 0.4, 0.64], material.sage, 0.62));
  [-0.52, 0.52].forEach((x, index) => root.add(turnedMesh(`ShelfFoot${index + 1}`, [[0.13, 0], [0.17, 0.1], [0.11, 0.24], [0.14, 0.35]], 18, material.brown, [x, 0, -0.08])));
  return root;
}

function makeCafeSet() {
  const root = new THREE.Group();
  root.name = "CafeSetAsset";
  root.userData = { assetStatus: "final-v1", tableSurface: TABLE_SURFACE, seatSurface: 0.86 };
  const tableTop = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 0.88, 0.22, 64, 2, false),
    material.pale,
  );
  tableTop.name = "TableTop";
  tableTop.position.set(0, 1.53, 0);
  tableTop.castShadow = true;
  tableTop.receiveShadow = true;
  root.add(
    turnedMesh("TableBase", [[0, 0], [0.42, 0], [0.55, 0.035], [0.59, 0.1], [0.52, 0.17], [0.31, 0.2], [0, 0.2]], 40, material.rose, [0, 0, 0]),
    turnedMesh("TableColumn", [[0.29, 0], [0.3, 0.06], [0.22, 0.16], [0.17, 0.32], [0.16, 1.02], [0.21, 1.16], [0.24, 1.22]], 36, material.blush, [0, 0.2, 0]),
    tableTop,
  );
  const chair = new THREE.Group();
  chair.name = "CafeChair";
  chair.position.set(1.72, 0, 0.62);
  chair.rotation.y = Math.PI - 0.52;
  chair.add(
    roundedPanel("ChairSeat", 0.92, 0.18, 0.88, 0.12, material.blush, [0, 0.77, 0]),
    roundedPanel("ChairBack", 0.94, 1.05, 0.19, 0.26, material.rose, [0, 1.45, 0.36]),
    roundedPanel("ChairBackInset", 0.5, 0.58, 0.08, 0.2, material.cream, [0, 1.46, 0.47]),
  );
  [[-0.32, -0.28], [0.32, -0.28], [-0.32, 0.28], [0.32, 0.28]].forEach(([x, z], index) => chair.add(
    turnedMesh(`ChairLeg${index + 1}`, [[0.08, 0], [0.11, 0.08], [0.075, 0.62], [0.1, 0.7]], 16, material.brown, [x, 0, z]),
  ));
  root.add(chair);
  return root;
}

function makeJar(name, x, z, jamMaterial, scale = 1) {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  group.userData = { interaction: "pickup", itemType: "jar", assetStatus: "final-v1" };
  group.add(
    turnedMesh(`${name}JamFill`, [[0.11, 0], [0.165, 0.045], [0.165, 0.29], [0.13, 0.35]], 28, jamMaterial, [0, 0.025, 0]),
    turnedMesh(`${name}Jar`, [[0.13, 0], [0.2, 0.04], [0.205, 0.32], [0.165, 0.4], [0.15, 0.44]], 30, material.glass, [0, 0, 0]),
    turnedMesh(`${name}Lid`, [[0.16, 0], [0.225, 0.025], [0.225, 0.1], [0.16, 0.12]], 28, material.cream, [0, 0.42, 0]),
    roundedPanel(`${name}Label`, 0.23, 0.17, 0.026, 0.055, material.ivory, [0, 0.23, 0.202]),
    roundedPanel(`${name}LabelDot`, 0.065, 0.065, 0.03, 0.03, jamMaterial, [0, 0.23, 0.222]),
  );
  return group;
}

function makeBread(name, x, z, scale = 1, loafMaterial = material.butter) {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  group.rotation.y = -0.08;
  group.userData = { interaction: "pickup", itemType: "pastry", assetStatus: "final-v1" };
  const shape = new THREE.Shape();
  shape.moveTo(-0.46, -0.2);
  shape.bezierCurveTo(-0.54, 0.02, -0.4, 0.31, -0.14, 0.33);
  shape.bezierCurveTo(0.09, 0.4, 0.46, 0.28, 0.5, -0.1);
  shape.bezierCurveTo(0.28, -0.29, -0.24, -0.3, -0.46, -0.2);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.43, bevelEnabled: true, bevelSegments: 5, bevelSize: 0.08, bevelThickness: 0.075, curveSegments: 14 });
  geometry.center();
  const loaf = new THREE.Mesh(geometry, loafMaterial);
  loaf.name = `${name}Body`;
  loaf.scale.set(1, 1, 0.92);
  loaf.rotation.set(-0.06, 0, -0.025);
  loaf.castShadow = true;
  group.add(loaf);
  [-0.2, 0, 0.2].forEach((cutX, index) => {
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(cutX - 0.035, 0.25, -0.22),
      new THREE.Vector3(cutX, 0.34, 0),
      new THREE.Vector3(cutX + 0.035, 0.25, 0.22),
    );
    const cut = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.018, 6, false), material.cream);
    cut.name = `${name}Score${index + 1}`;
    cut.castShadow = true;
    group.add(cut);
  });
  return group;
}

function makeBun(name, x, z, scale = 1, bunMaterial = material.butter) {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  group.userData = { interaction: "pickup", itemType: "pastry", assetStatus: "final-v1" };
  group.add(
    turnedMesh(`${name}Body`, [[0.28, 0], [0.42, 0.07], [0.48, 0.22], [0.42, 0.38], [0.25, 0.47], [0, 0.49]], 36, bunMaterial, [0, 0, 0]),
  );
  [-0.12, 0.12].forEach((xOffset, index) => {
    const score = roundedPanel(`${name}Score${index + 1}`, 0.035, 0.27, 0.03, 0.015, material.cream, [xOffset, 0.3, 0.405], [0, 0, index ? -0.3 : 0.3]);
    group.add(score);
  });
  return group;
}

function makeCupcake(name, x, z, wrapperMaterial = material.pale, scale = 1) {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  group.userData = { interaction: "pickup", itemType: "pastry", assetStatus: "final-v1" };
  group.add(
    turnedMesh(`${name}Wrapper`, [[0.2, 0], [0.24, 0.035], [0.29, 0.31], [0.27, 0.34]], 24, wrapperMaterial, [0, 0, 0]),
    turnedMesh(`${name}Cake`, [[0.22, 0], [0.28, 0.04], [0.29, 0.18], [0.22, 0.24]], 28, material.crumb, [0, 0.27, 0]),
    turnedMesh(`${name}Swirl`, [[0.04, 0], [0.2, 0.025], [0.25, 0.1], [0.2, 0.2], [0.15, 0.29], [0.08, 0.37], [0, 0.41]], 32, material.ivory, [0, 0.43, 0]),
    turnedMesh(`${name}Berry`, [[0.07, 0], [0.1, 0.05], [0.07, 0.15], [0, 0.18]], 20, material.jam, [0, 0.82, 0]),
  );
  return group;
}

function makeCake(name, x, z, frostingMaterial = material.cream, scale = 1) {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  group.userData = { interaction: "pickup", itemType: "pastry", assetStatus: "final-v1" };
  group.add(
    turnedMesh(`${name}Crumb`, [[0, 0], [0.3, 0], [0.37, 0.04], [0.38, 0.23], [0.34, 0.285], [0, 0.29]], 36, material.crumb, [0, 0, 0]),
    turnedMesh(`${name}FrostingLayer`, [[0, 0], [0.34, 0], [0.4, 0.035], [0.4, 0.15], [0.35, 0.19], [0, 0.195]], 36, frostingMaterial, [0, 0.292, 0]),
    turnedMesh(`${name}TopCream`, [[0, 0], [0.07, 0], [0.18, 0.025], [0.25, 0.09], [0.18, 0.17], [0.04, 0.215], [0, 0.22]], 30, material.ivory, [0, 0.489, 0]),
    turnedMesh(`${name}Strawberry`, [[0, 0], [0.1, 0], [0.14, 0.07], [0.1, 0.2], [0, 0.25]], 24, material.jam, [0, 0.7, 0]),
  );
  [-0.18, 0.18].forEach((xOffset, index) => group.add(
    turnedMesh(`${name}CreamDollop${index + 1}`, [[0, 0], [0.1, 0.02], [0.14, 0.07], [0.08, 0.135], [0, 0.165]], 20, material.ivory, [xOffset, 0.489, 0]),
  ));
  const leafGeometry = new THREE.SphereGeometry(0.07, 12, 8);
  leafGeometry.scale(1.6, 0.25, 0.7);
  [-0.04, 0.04].forEach((xOffset, index) => {
    const leaf = new THREE.Mesh(leafGeometry, material.sage);
    leaf.name = `${name}Leaf${index + 1}`;
    leaf.position.set(xOffset, 0.73, 0);
    leaf.rotation.z = index ? -0.45 : 0.45;
    group.add(leaf);
  });
  return group;
}

function makeGiftBox(name, x, z, boxMaterial, scale = 1) {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  group.userData = { interaction: "pickup", itemType: "package", assetStatus: "final-v1" };
  group.add(
    roundedPanel(`${name}Base`, 0.52, 0.4, 0.48, 0.075, boxMaterial, [0, 0.2, 0]),
    roundedPanel(`${name}Lid`, 0.58, 0.12, 0.54, 0.065, material.cream, [0, 0.46, 0]),
    roundedPanel(`${name}RibbonV`, 0.085, 0.53, 0.56, 0.025, material.rose, [0, 0.27, 0]),
    roundedPanel(`${name}LidEdge`, 0.6, 0.055, 0.56, 0.025, material.rose, [0, 0.42, 0]),
  );
  const bow = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.028, 8, 16, Math.PI * 1.65), material.rose);
  bow.name = `${name}Bow`;
  bow.position.set(0, 0.56, 0);
  bow.rotation.x = Math.PI / 2;
  group.add(bow);
  return group;
}

function addAligned(parent, object, surfaceY, parentWorldY) {
  parent.add(placeOnSurface(object, surfaceY, parentWorldY));
}

function moveShelfItemsToSafeDepth(parent, safeDepth) {
  parent.children.forEach((object) => {
    if (!object.userData.itemType) return;
    object.position.z = safeDepth.center;
    object.userData.safeDepthMin = safeDepth.min;
    object.userData.safeDepthMax = safeDepth.max;
  });
}

function makeBakeryProps() {
  const root = new THREE.Group();
  root.name = "BakeryPropsAsset";
  root.userData = { assetStatus: "final-v1", placementMethod: "THREE.Box3 bottom alignment" };
  const display = new THREE.Group();
  display.name = "DisplayTreats";
  display.position.set(0, 0.15, -2.1);
  addAligned(display, makeBread("HoneyLoaf", -1.15, 0.88, 0.72), DISPLAY_SHELF_SURFACES[0], display.position.y);
  addAligned(display, makeBun("MilkBun", -0.38, 0.88, 0.62, material.caramel), DISPLAY_SHELF_SURFACES[0], display.position.y);
  addAligned(display, makeJar("AppleJam", 0.42, 0.96, material.apple, 0.82), DISPLAY_SHELF_SURFACES[0], display.position.y);
  addAligned(display, makeCupcake("BerryCupcake", 1.15, 0.9, material.pale, 0.62), DISPLAY_SHELF_SURFACES[0], display.position.y);
  addAligned(display, makeCake("CreamCake", -1.12, 0.9, material.pale, 0.63), DISPLAY_SHELF_SURFACES[1], display.position.y);
  addAligned(display, makeBun("RoundBrioche", -0.35, 0.88, 0.58), DISPLAY_SHELF_SURFACES[1], display.position.y);
  addAligned(display, makeGiftBox("IvoryGiftBox", 0.42, 0.88, material.ivory, 0.86), DISPLAY_SHELF_SURFACES[1], display.position.y);
  addAligned(display, makeJar("StrawberryJam", 1.13, 0.96, material.jam, 0.8), DISPLAY_SHELF_SURFACES[1], display.position.y);
  addAligned(display, makeGiftBox("SageTeaBox", -1.12, 0.88, material.sage, 0.82), DISPLAY_SHELF_SURFACES[2], display.position.y);
  addAligned(display, makeBread("TopLoaf", -0.36, 0.88, 0.6), DISPLAY_SHELF_SURFACES[2], display.position.y);
  addAligned(display, makeJar("LemonJam", 1.12, 0.96, material.lemon, 0.78), DISPLAY_SHELF_SURFACES[2], display.position.y);
  moveShelfItemsToSafeDepth(display, DISPLAY_SAFE_DEPTH);
  root.add(display);

  [-4.55, 4.55].forEach((x, sideIndex) => {
    const shelf = new THREE.Group();
    shelf.name = sideIndex ? "RightShelfProps" : "LeftShelfProps";
    shelf.position.set(x, 0.15, sideIndex ? -2.62 : -2.82);
    shelf.rotation.y = sideIndex ? -0.07 : 0.09;
    addAligned(shelf, makeJar(`${shelf.name}Jam1`, -0.31, 0.61, sideIndex ? material.lemon : material.apple, 0.72), SIDE_SHELF_SURFACES[0], shelf.position.y);
    addAligned(shelf, makeCupcake(`${shelf.name}Cupcake`, 0.29, 0.58, sideIndex ? material.pale : material.cream, 0.46), SIDE_SHELF_SURFACES[0], shelf.position.y);
    addAligned(shelf, makeJar(`${shelf.name}Jam2`, -0.29, 0.61, sideIndex ? material.jam : material.lemon, 0.7), SIDE_SHELF_SURFACES[1], shelf.position.y);
    addAligned(shelf, makeGiftBox(`${shelf.name}Box`, 0.3, 0.57, sideIndex ? material.cream : material.sage, 0.72), SIDE_SHELF_SURFACES[1], shelf.position.y);
    addAligned(shelf, makeGiftBox(`${shelf.name}TopBox`, -0.29, 0.57, sideIndex ? material.sage : material.cream, 0.7), SIDE_SHELF_SURFACES[2], shelf.position.y);
    addAligned(shelf, makeBun(`${shelf.name}Bun`, 0.29, 0.61, 0.46), SIDE_SHELF_SURFACES[2], shelf.position.y);
    moveShelfItemsToSafeDepth(shelf, SIDE_SAFE_DEPTH);
    root.add(shelf);
  });

  const table = new THREE.Group();
  table.name = "TableProps";
  table.position.set(3.42, 0.15, 1.5);
  root.add(table);
  return root;
}

function makeInteractiveCake() {
  const root = new THREE.Group();
  root.name = "InteractiveCakeAsset";
  root.userData = { assetStatus: "final-v1", interaction: "pickup", itemType: "cake" };
  const cake = makeCake("InteractiveStrawberryCake", 0, 0, material.ivory, 0.62);
  placeOnSurface(cake, 0, 0);
  root.add(cake);
  return root;
}

function makeRoomDecor() {
  const root = new THREE.Group();
  root.name = "RoomDecorAsset";
  root.userData = { assetStatus: "final-v1", density: "restrained" };

  const clock = new THREE.Group();
  clock.name = "StrawberryWallClock";
  clock.position.z = 0.13;
  clock.add(
    makeStrawberryMotif("ClockStrawberry", [-4.05, 4.75, -4.02], 1.45),
    roundedPanel("ClockFace", 0.4, 0.4, 0.06, 0.2, material.cream, [-4.05, 5.08, -3.77]),
    roundedPanel("ClockHandHour", 0.035, 0.14, 0.026, 0.012, material.brown, [-4.05, 5.12, -3.725], [0, 0, -0.55]),
    roundedPanel("ClockHandMinute", 0.035, 0.18, 0.026, 0.012, material.brown, [-4.0, 5.04, -3.722], [0, 0, 0.72]),
  );
  root.add(clock);

  const menu = new THREE.Group();
  menu.name = "BakeryMenuBoard";
  menu.add(
    roundedPanel("MenuFrame", 1.78, 1.16, 0.14, 0.15, material.cream, [3.55, 4.92, -4.04]),
    roundedPanel("MenuInset", 1.5, 0.9, 0.055, 0.1, material.brown, [3.55, 4.92, -3.92]),
    roundedPanel("MenuHeader", 0.82, 0.08, 0.025, 0.03, material.pale, [3.55, 5.18, -3.875]),
  );
  [4.96, 4.78, 4.6].forEach((y, index) => menu.add(
    roundedPanel(`MenuLine${index + 1}`, index === 1 ? 0.84 : 1.02, 0.045, 0.024, 0.018, index === 2 ? material.sage : material.cream, [3.55, y, -3.872]),
  ));
  root.add(menu);

  const sconce = new THREE.Group();
  sconce.name = "ToyWallSconce";
  sconce.add(
    roundedPanel("SconceBackplate", 0.38, 0.52, 0.12, 0.18, material.pale, [-2.35, 5.12, -4.0]),
    turnedMesh("SconceShade", [[0.3, 0], [0.26, 0.08], [0.16, 0.26], [0.08, 0.32]], 28, material.cream, [-2.35, 4.72, -3.75], [Math.PI / 2, 0, 0]),
  );
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.14, 20, 14), material.butter);
  bulb.name = "SconceBulb";
  bulb.position.set(-2.35, 4.83, -3.69);
  bulb.castShadow = true;
  sconce.add(bulb);
  root.add(sconce);
  return root;
}

function makeHamster() {
  const root = new THREE.Group();
  root.name = "HamsterToyAsset";
  root.userData = { assetStatus: "final-v1", modeling: "single continuous squishy body with integrated cheek deformation and vertex-color forehead blend" };
  const profile = [[0, 0], [0.43, 0], [0.64, 0.07], [0.75, 0.23], [0.78, 0.49], [0.76, 0.76], [0.7, 0.98], [0.6, 1.16], [0.43, 1.29], [0.2, 1.35], [0, 1.36]];
  const bodyGeometry = new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 64);
  bodyGeometry.scale(1, 1, 0.86);
  const positions = bodyGeometry.getAttribute("position");
  const colors = [];
  const ivory = new THREE.Color(palette.ivory);
  const orange = new THREE.Color(0xd38a55);
  const smoothstep = (min, max, value) => {
    const t = THREE.MathUtils.clamp((value - min) / (max - min), 0, 1);
    return t * t * (3 - 2 * t);
  };
  for (let i = 0; i < positions.count; i += 1) {
    const y = positions.getY(i);
    let x = positions.getX(i);
    let z = positions.getZ(i);
    const cheekBand = Math.exp(-Math.pow((y - 0.86) / 0.25, 2)) * smoothstep(0.02, 0.42, z);
    x *= 1 + cheekBand * 0.19;
    z += cheekBand * 0.105;
    positions.setXYZ(i, x, y, z);
    const patch = smoothstep(0.9, 1.25, y) * smoothstep(-0.24, 0.4, z);
    const color = ivory.clone().lerp(orange, patch * 0.92);
    colors.push(color.r, color.g, color.b);
  }
  positions.needsUpdate = true;
  bodyGeometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  bodyGeometry.computeVertexNormals();
  const bodyMaterial = new THREE.MeshPhysicalMaterial({ name: "IvoryAndOrangeSoftVinyl", vertexColors: true, roughness: 0.3, metalness: 0, clearcoat: 0.08, clearcoatRoughness: 0.72 });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.name = "ContinuousHamsterBody";
  body.castShadow = true;
  body.receiveShadow = true;
  root.add(body);
  [-0.39, 0.39].forEach((x, index) => {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.145, 24, 16), material.pink);
    ear.name = `Ear${index + 1}`;
    ear.position.set(x, 1.22, 0.1);
    ear.scale.set(0.92, 1, 0.4);
    ear.castShadow = true;
    root.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.092, 28, 20), material.eye);
    eye.name = `Eye${index + 1}`;
    eye.position.set(x * 0.49, 0.91, 0.65);
    eye.scale.set(1, 1.06, 1);
    eye.castShadow = true;
    root.add(eye);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.024, 12, 8), material.ivory);
    glint.name = `EyeGlint${index + 1}`;
    glint.position.set(x * 0.49 - 0.022, 0.94, 0.733);
    glint.scale.set(0.72, 0.82, 0.5);
    root.add(glint);
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.1, 22, 16), material.pink);
    paw.name = `FrontPaw${index + 1}`;
    paw.position.set(x * 0.34, 0.53, 0.665);
    paw.scale.set(0.72, 0.5, 0.36);
    paw.rotation.set(0, 0, index ? -0.18 : 0.18);
    paw.castShadow = true;
    root.add(paw);
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.12, 22, 16), material.pink);
    foot.name = `Foot${index + 1}`;
    foot.position.set(x * 0.73, 0.065, 0.34);
    foot.scale.set(1.05, 0.5, 0.72);
    foot.rotation.set(0, 0, index ? -0.12 : 0.12);
    foot.castShadow = true;
    root.add(foot);
  });
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.056, 22, 16), material.pink);
  nose.name = "PinkNose";
  nose.position.set(0, 0.8, 0.702);
  nose.scale.set(1.05, 0.75, 0.65);
  nose.castShadow = true;
  root.add(nose);
  const mouthCurve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.075, 0.745, 0.696), new THREE.Vector3(0, 0.7, 0.713), new THREE.Vector3(0.075, 0.745, 0.696));
  const mouth = new THREE.Mesh(new THREE.TubeGeometry(mouthCurve, 12, 0.009, 5, false), material.brown);
  mouth.name = "TinyMouth";
  root.add(mouth);
  const blushMaterial = new THREE.MeshStandardMaterial({ name: "PetReactionBlush", color: 0xef91aa, roughness: 0.4, transparent: true, opacity: 0.04, depthWrite: false });
  [-0.39, 0.39].forEach((x, index) => {
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.105, 18, 12), blushMaterial);
    cheek.name = `CheekBlush${index + 1}`;
    cheek.position.set(x, 0.72, 0.64);
    cheek.scale.set(1.25, 0.62, 0.25);
    root.add(cheek);
  });
  return root;
}

async function exportGlb(name, object) {
  const exporter = new GLTFExporter();
  const result = await exporter.parseAsync(object, { binary: true, onlyVisible: true });
  const destination = path.join(process.cwd(), "public", "models", "bakery", name);
  await writeFile(destination, Buffer.from(result));
  console.log(`${name}: ${Math.round(result.byteLength / 1024)} KB`);
}

await mkdir(path.join(process.cwd(), "public", "models", "bakery"), { recursive: true });
await exportGlb("display-cabinet.glb", makeDisplayCabinet());
await exportGlb("side-shelf.glb", makeSideShelf());
await exportGlb("cafe-set.glb", makeCafeSet());
await exportGlb("bakery-props.glb", makeBakeryProps());
await exportGlb("interactive-cake.glb", makeInteractiveCake());
await exportGlb("hamster.glb", makeHamster());
await exportGlb("room-decor.glb", makeRoomDecor());
