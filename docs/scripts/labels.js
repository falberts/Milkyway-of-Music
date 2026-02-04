import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { scene, camera } from "./scene.js";
import { points, artistList } from "./galaxy.js";

const LABEL_DISTANCE = 3;
const MAX_LABELS = 100;

const labelCache = new Map();
const labelPool = [];
const activeLabels = new Map();

const tmpVec3 = new THREE.Vector3();
const camPos = new THREE.Vector3();

function getLabelTexture(name) {
  if (labelCache.has(name)) return labelCache.get(name);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const fontSize = 40;
  const padding = 20;

  ctx.font = `${fontSize}px AudioWide`;
  const textWidth = ctx.measureText(name).width;

  canvas.width = textWidth + padding * 2;
  canvas.height = fontSize + padding * 2;

  ctx.font = `${fontSize}px AudioWide`;
  ctx.fillStyle = "white";

  ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  ctx.lineWidth = 6;
  ctx.strokeStyle = "rgba(0,0,0,0.9)";
  ctx.strokeText(name, padding, fontSize + padding / 2);

  ctx.fillText(name, padding, fontSize + padding / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;

  labelCache.set(name, texture);
  return texture;
}


function getLabelSprite(name) {
  const texture = getLabelTexture(name);

  let sprite;
  if (labelPool.length > 0) {
    sprite = labelPool.pop();
    sprite.material.map = texture;
  } else {
    sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      opacity: 0,
    }));
  }

  sprite.scale.set(texture.image.width * 0.0008, texture.image.height * 0.0008, 1);
  sprite.userData.name = name;
  return sprite;
}


function releaseLabelSprite(sprite) {
  sprite.material.opacity = 0;
  scene.remove(sprite);
  labelPool.push(sprite);
}


export function updateLabels() {
  if (!points) return;

  const positions = points.geometry.attributes.position.array;
  camPos.copy(camera.position);

  const nearby = [];
  for (let i = 0; i < positions.length; i += 3) {
    tmpVec3.set(positions[i], positions[i + 1], positions[i + 2]);
    const dist = camPos.distanceTo(tmpVec3);
    if (dist < LABEL_DISTANCE) {
      nearby.push({ name: artistList[i / 3], pos: tmpVec3.clone(), dist });
    }
  }

  nearby.sort((a, b) => a.dist - b.dist);

  const keep = new Set();
  for (let i = 0; i < Math.min(nearby.length, MAX_LABELS); i++) {
    const { name, pos } = nearby[i];
    keep.add(name);

    if (!activeLabels.has(name)) {
      const sprite = getLabelSprite(name);
      sprite.position.copy(pos).add(new THREE.Vector3(0, 0.1, 0));
      scene.add(sprite);
      activeLabels.set(name, sprite);
    }

    const sprite = activeLabels.get(name);
    sprite.position.copy(pos).add(new THREE.Vector3(0, 0.1, 0));
    sprite.material.opacity = 1;
  }

  for (const [name, sprite] of activeLabels) {
    if (!keep.has(name)) {
      activeLabels.delete(name);
      releaseLabelSprite(sprite);
    }
  }
}
