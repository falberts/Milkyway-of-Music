export let embeddings = new Map();

export function initEmbeddings() {
  fetch("./data/node2vec_embeddings.json")
    .then(res => res.json())
    .then(data => {
      Object.entries(data).forEach(([artist, vector]) => {
        embeddings.set(artist, vector);
      });
    })
    .catch(err => console.error(err));
}


export function cosineSimilarity(a, b) {
  let dot = 0, mA = 0, mB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    mA += a[i] * a[i];
    mB += b[i] * b[i];
  }
  mA = Math.sqrt(mA);
  mB = Math.sqrt(mB);
  return dot / (mA * mB);
}
