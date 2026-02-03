import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { scene } from "./scene.js";
import { artistPositions } from "./galaxy.js";

let lines = null;

export function clearSimilarityLines() {
  if (lines) {
    scene.remove(lines);
    lines.geometry.dispose();
    lines.material.dispose();
    lines = null;
  }
}

export function drawSimilarityLines(centerArtist, similarArtists) {
  clearSimilarityLines();

  const centerPos = artistPositions.get(centerArtist.toLowerCase());
  if (!centerPos) return;

  const positions = [];

  similarArtists.forEach(({ artistName }) => {
    const targetPos = artistPositions.get(artistName.toLowerCase());
    if (!targetPos) return;

    positions.push(
      centerPos.x, centerPos.y, centerPos.z,
      targetPos.x, targetPos.y, targetPos.z
    );
  });

  if (!positions.length) return;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );

  const material = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending,
  });

  lines = new THREE.LineSegments(geometry, material);
  scene.add(lines);
}
