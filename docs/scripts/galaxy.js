import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { scene, camera } from "./scene.js";
import { setPoints } from "./ui.js";

export let points = null;
export const artistList = [];
export const artistPositions = new Map();
export const artistBios = new Map();
export const artistLinks = new Map();
export const artistTags = new Map();

export let core = null;
export let coreGlow = null;
export const core_base_opacity = 0.8;
export const core_glow_base_opacity = 0.2;

const SCALE = 12;

const textureLoader = new THREE.TextureLoader();
const starTexture = textureLoader.load("./textures/star.png");

export function createGalaxy(data) {
  const count = Object.keys(data).length;
  const positions = new Float32Array(count * 3);

  let idx = 0;
  Object.entries(data).forEach(([artist, info]) => {
    const key = artist.trim().toLowerCase();
    const [x, z, y] = info.positions;

    positions[idx * 3 + 0] = x * SCALE;
    positions[idx * 3 + 1] = y * SCALE;
    positions[idx * 3 + 2] = z * SCALE;

    artistPositions.set(key, new THREE.Vector3(x * SCALE, y * SCALE, z * SCALE));
    artistBios.set(key, info.bio);
    artistLinks.set(key, info.links);
    artistTags.set(key, info.tags);
    artistList.push(artist.trim());
    idx++;
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
      size: 0.2,
      map: starTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
      sizeAttenuation: true,
    });

  points = new THREE.Points(geometry, material);
  scene.add(points);

  setPoints(points);

  const bloomPositions = [];
  const bloom_ratio = 0.04;

  for (let i = 0; i < count; i++) {
    if (Math.random() < bloom_ratio) {
      bloomPositions.push(
        positions[i * 3 + 0],
        positions[i * 3 + 1],
        positions[i * 3 + 2]
      );
    }
  }

  const bloomGeometry = new THREE.BufferGeometry();
  bloomGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(bloomPositions, 3)
  );

  const bloomShaderMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.NormalBlending,
    uniforms: {
      color: { value: new THREE.Color(0xd39bff) },
      size: { value: 10.0 },
    },
    precision: 'lowp',
    vertexShader: `
      uniform float size;
      void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = size * (300.0 / -mvPosition.z); 
      }
    `,
    fragmentShader: `
      uniform vec3 color;
      void main() {
        float dist = length(gl_PointCoord - vec2(0.5));
        float alpha = smoothstep(0.5, 0.0, dist);
        gl_FragColor = vec4(color, alpha*0.01);
      }
    `,
  });

  const bloomPoints = new THREE.Points(bloomGeometry, bloomShaderMaterial);
  scene.add(bloomPoints);

  const coreTexture = textureLoader.load("./textures/star.png");

  const coreMaterial = new THREE.SpriteMaterial({
    map: coreTexture,
    color: 0xf1c7ff,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: core_base_opacity,
  });

  const coreGlowMaterial = new THREE.SpriteMaterial({
    map: coreTexture,
    color: 0x9900ff,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: core_glow_base_opacity,
  });

  core = new THREE.Sprite(coreMaterial);
  core.position.set(0, 0, 0);
  coreGlow = new THREE.Sprite(coreGlowMaterial);
  coreGlow.position.set(0, 0, 0);

  core.scale.set(25, 25, 1);
  coreGlow.scale.set(75, 75, 1);

  scene.add(core);
  scene.add(coreGlow);
  
}


export function updateCoreVisibility(fadeStart = 10, fadeEnd = 5) {
    if (!core || !core.material || !coreGlow || !coreGlow.material) return;
    const dist = camera.position.distanceTo(core.position);
    const t = Math.max(0, Math.min(1, (dist - fadeEnd) / Math.max(0.0001, fadeStart - fadeEnd)));
    core.material.opacity = core_base_opacity * t;
    coreGlow.material.opacity = core_glow_base_opacity * t;
    core.material.needsUpdate = true;
    coreGlow.material.needsUpdate = true;
}
