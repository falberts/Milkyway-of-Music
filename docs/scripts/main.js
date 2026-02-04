import { initScene, scene, renderer, camera, controls } from "./scene.js";
import { createGalaxy, updateCoreVisibility } from "./galaxy.js";
import { initUI } from "./ui.js";
import { initEmbeddings } from "./embeddings.js";
import { updateLabels } from "./labels.js";
import "./sidebar.js";

initScene();
initUI();
initEmbeddings();

fetch("./data/artist_galaxy.json")
  .then(res => res.json())
  .then(data => createGalaxy(data))
  .catch(err => console.error(err));

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  updateCoreVisibility();
  renderer.render(scene, camera);
  updateLabels();
}

animate();
