import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import gsap from "https://cdn.jsdelivr.net/npm/gsap@3.12.2/index.js";
import { scene, camera, controls } from "./scene.js";
import { artistList, artistPositions } from "./galaxy.js";
import { showSidebar } from "./sidebar.js";
import { clearSimilarityLines } from "./similarlines.js";

let points;

export function setPoints(p) {
  points = p;
}

const input = document.getElementById("artistSearch");
const clearBtn = document.getElementById("clearSearch");
const dropdown = document.getElementById("dropdown");

let activeIndex = -1;
let currentMatches = [];

const raycaster = new THREE.Raycaster();
raycaster.params.Points.threshold = 0.25;
const mouse = new THREE.Vector2();

let isDragging = false;
let mouseDownPos = new THREE.Vector2();

function flyTo(targetPos, zoomIn = true) {
  const targetDistance = zoomIn ? 0.5 : 20;
  const dir = new THREE.Vector3();
  dir.subVectors(camera.position, controls.target).normalize();

  const newCamPos = targetPos.clone().add(dir.multiplyScalar(targetDistance));

  gsap.to(camera.position, {
    x: newCamPos.x,
    y: newCamPos.y,
    z: newCamPos.z,
    duration: 1.4,
    ease: "power2.inOut"
  });

  gsap.to(controls.target, {
    x: targetPos.x,
    y: targetPos.y,
    z: targetPos.z,
    duration: 1.4,
    ease: "power2.inOut"
  });
}

export function focusArtist(name) {
  const pos = artistPositions.get(name.toLowerCase());
  if (!pos) return;

  flyTo(pos, true);
  showSidebar(name);
}

function showDropdown(matches) {
  dropdown.innerHTML = "";
  currentMatches = matches;
  activeIndex = -1;

  if (!matches.length) {
    dropdown.classList.add("hidden");
    return;
  }

  matches.slice(0, 8).forEach((name) => {
    const div = document.createElement("div");
    div.className = "item";
    div.textContent = name;

    div.addEventListener("click", () => {
      input.value = name;
      dropdown.classList.add("hidden");
      focusArtist(name);
    });

    dropdown.appendChild(div);
  });

  dropdown.classList.remove("hidden");
}

function updateHighlight() {
  const items = dropdown.querySelectorAll(".item");
  items.forEach((item, idx) => {
    item.classList.toggle("active", idx === activeIndex);
  });
}

export function initUI() {
  window.addEventListener("mousedown", (e) => {
    isDragging = false;
    mouseDownPos.set(e.clientX, e.clientY);
  });

  window.addEventListener("mousemove", (e) => {
    const dist = mouseDownPos.distanceTo(new THREE.Vector2(e.clientX, e.clientY));
    if (dist > 4) isDragging = true;
  });

  window.addEventListener("click", (event) => {
    if (event.target.closest("#ui")) return;
    if (isDragging) return;
    if (!points) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    raycaster.params.Points.threshold = 0.05;

    const intersects = raycaster.intersectObject(points);

    if (intersects.length > 0) {
      const idx = intersects[0].index;
      const artistName = artistList[idx];

      input.value = artistName;
      dropdown.classList.add("hidden");
      focusArtist(artistName);
    }
  });

  input.addEventListener("input", () => {
    const query = input.value.trim().toLowerCase();
    if (!query) {
      dropdown.classList.add("hidden");
      return;
    }

    const matches = artistList.filter(name => name.toLowerCase().includes(query));
    showDropdown(matches);
  });

  input.addEventListener("keydown", (e) => {
    if (dropdown.classList.contains("hidden")) return;

    const items = dropdown.querySelectorAll(".item");

    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeIndex = (activeIndex + 1) % items.length;
      updateHighlight();
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      activeIndex = (activeIndex - 1 + items.length) % items.length;
      updateHighlight();
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && currentMatches[activeIndex]) {
        const selected = currentMatches[activeIndex];
        input.value = selected;
        dropdown.classList.add("hidden");
        focusArtist(selected);
      }
    }
  });

  clearBtn.addEventListener("click", () => {
    input.value = "";
    dropdown.classList.add("hidden");
    flyTo(new THREE.Vector3(0, 0, 0), false);
    document.querySelector(".sidebar").style.display = "none";
    clearSimilarityLines(); 
  });
}
