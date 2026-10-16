// Destination search: tokenizer + BM25 ranking with field boosts and typo tolerance.

const STOPWORDS = new Set('a an and are as at be by for from in is it of on or the to with near best place places'.split(' '));

export function tokenize(text) {
  return (String(text || '').toLowerCase().match(/[a-z0-9]+/g) || []).filter((t) => !STOPWORDS.has(t));
}

/** Levenshtein edit distance (dynamic programming, two rows). */
export function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

const K1 = 1.4;
const B = 0.75;
const FIELDS = [
  ['name', 5], ['tags', 3], ['tagline', 2], ['province', 2], ['attractionNames', 2], ['description', 1],
];

/** docs: [{ id, name, tags, tagline, province, description, attractionNames }] -> [{ id, score, matched }] */
export function searchDestinations(docs, query) {
  const qTerms = tokenize(query);
  if (!qTerms.length) return [];

  const indexed = docs.map((d) => {
    const tf = new Map();
    let len = 0;
    for (const [field, boost] of FIELDS) {
      for (const t of tokenize(String(d[field] || '').replace(/,/g, ' '))) {
        tf.set(t, (tf.get(t) || 0) + boost);
        len += boost;
      }
    }
    return { id: d.id, tf, len };
  });
  const N = indexed.length;
  const avgLen = indexed.reduce((s, d) => s + d.len, 0) / (N || 1) || 1;
  const df = new Map();
  for (const d of indexed) for (const t of d.tf.keys()) df.set(t, (df.get(t) || 0) + 1);

  // Resolve each query term: exact, prefix ("pokh" -> "pokhara") or 1-2 typos.
  const vocab = [...df.keys()];
  const resolved = qTerms.map((q) => {
    if (df.has(q)) return { q, terms: [q] };
    const prefix = vocab.filter((v) => q.length >= 3 && v.startsWith(q));
    if (prefix.length) return { q, terms: prefix };
    const maxD = q.length >= 7 ? 2 : 1;
    const fuzzy = q.length >= 4 ? vocab.filter((v) => Math.abs(v.length - q.length) <= maxD && levenshtein(q, v) <= maxD) : [];
    return { q, terms: fuzzy };
  });

  const results = [];
  for (const d of indexed) {
    let score = 0;
    const matched = [];
    for (const { terms } of resolved) {
      for (const t of terms) {
        const f = d.tf.get(t);
        if (!f) continue;
        const n = df.get(t);
        const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
        score += idf * ((f * (K1 + 1)) / (f + K1 * (1 - B + (B * d.len) / avgLen)));
        matched.push(t);
      }
    }
    if (score > 0) results.push({ id: d.id, score: Math.round(score * 100) / 100, matched: [...new Set(matched)] });
  }
  return results.sort((a, b) => b.score - a.score);
}
