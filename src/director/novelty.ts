/**
 * Novelty Engine for Red Team Scenario Generator.
 * Complies strictly with ARCHITECTURE.md 5.2 and Rules.md AC-6.
 */

/**
 * Computes dot product of two L2-normalized 33-dimensional feature vectors (Cosine Similarity).
 */
export function computeCosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
  }
  return dot;
}

/**
 * Checks if candidate feature vector maintains novelty against previous scenarios (max cosine < 0.85).
 */
export function isNovel(candidateFeatures: number[], historyFeatures: number[][]): boolean {
  for (const hist of historyFeatures) {
    const sim = computeCosineSimilarity(candidateFeatures, hist);
    if (sim >= 0.85) return false;
  }
  return true;
}
