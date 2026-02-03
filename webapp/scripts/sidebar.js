import { embeddings, cosineSimilarity } from "./embeddings.js";
import { focusArtist } from "./ui.js";
import { drawSimilarityLines } from "./similarlines.js";
import { artistBios, artistLinks, artistTags } from "./galaxy.js";

const sidebar = document.querySelector(".sidebar");

export function showSidebar(name) {
  const artistEmbedding = embeddings.get(name);
  const key = name.trim().toLowerCase();
  const bio = artistBios.get(key);
  const links = artistLinks.get(key);
  const tags = artistTags.get(key);

  if (!artistEmbedding) {
    sidebar.innerHTML = `<h2>${name}</h2>`;
    sidebar.style.display = "block";
    return;
  }

  const scores = [];
  embeddings.forEach((embed, artistName) => {
    if (artistName === name) return;
    scores.push({ artistName, score: cosineSimilarity(artistEmbedding, embed) });
  });

  scores.sort((a, b) => b.score - a.score);
  const top10 = scores.slice(0, 10);

  drawSimilarityLines(name, top10);

  const bioHTML = bio
  ? `<div class="bio">${bio}</div>`
  : `<div class="bio"><p>No bio available.</p></div>`;

  let linksHTML = "";
  const spotifyLogo = "<i class='bi bi-spotify'></i>"
  const youtubeLogo = "<i class='bi bi-youtube'></i>"
  const appleLogo = "<i class='bi bi-apple'></i>"
  
  if (links && Object.values(links).some(v => v)) {
    linksHTML = `
      <div class="links">
        <h3>Links:</h3>
        <ul>
          ${Object.entries(links)
            .filter(([_, url]) => url)
            .map(([platform, url]) => `
              <div class="linkbttn">
                <li>
                  <a href="${url}" target="_blank" rel="noopener">
                    ${platform.replace("spotify", spotifyLogo).replace("youtube", youtubeLogo).replace("apple_music", appleLogo)}
                  </a>
                </li>
              </div>
            `)
            .join("")}
        </ul>
      </div>
    `;
  }

  let tagsHTML = "";
  if (tags && Object.keys(tags).length > 0) {
    tagsHTML = `
      <div class="tags">
        <h3>Tags:</h3>
        <ul class="tag-list">
          ${Object.entries(tags)
            .sort((a, b) => b[1] - a[1])
            .map(([tag, count]) => `
              <li class="tag">
                ${tag}
                <span class="tag-count">${count}</span>
              </li>
            `)
            .join("")}
        </ul>
      </div>
    `;
  }

  sidebar.innerHTML = `
    <div class="sidebar-header"><h2>${name}</h2></div>
      <hr>
      <div class="sidebar-content">
        ${bioHTML}
        ${linksHTML}
        ${tagsHTML}
        <div class="similar">
          <h3>Similar artists:</h3>
          <ul>
          ${top10.map(item => `
            <li>
            <button class="similar-item" data-name="${item.artistName}">
              ${item.artistName}
              <span class="score">${item.score.toFixed(3)}</span>
            </button>
            </li>
            `).join("")}
            </ul>
        </div>
      </div>
    </div>
   `;

  sidebar.querySelectorAll(".similar-item").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      focusArtist(btn.dataset.name);
    });
  });

  sidebar.style.display = "block";
}
