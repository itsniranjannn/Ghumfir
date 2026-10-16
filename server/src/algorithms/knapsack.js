// Knapsack solvers used by the planner.

/**
 * 0/1 knapsack by dynamic programming.
 * items: [{ weight (integer), value }], capacity: integer.
 * Returns { value, picked: indices }.  Time O(n * capacity).
 */
export function knapsack01(items, capacity) {
  const n = items.length;
  capacity = Math.max(0, Math.floor(capacity));
  // dp[i][w] = best value using the first i items with weight limit w
  const dp = Array.from({ length: n + 1 }, () => new Float64Array(capacity + 1));
  for (let i = 1; i <= n; i++) {
    const { weight, value } = items[i - 1];
    for (let w = 0; w <= capacity; w++) {
      dp[i][w] = dp[i - 1][w];
      if (weight <= w && dp[i - 1][w - weight] + value > dp[i][w]) {
        dp[i][w] = dp[i - 1][w - weight] + value;
      }
    }
  }
  // Backtrack to find which items were taken.
  const picked = [];
  let w = capacity;
  for (let i = n; i >= 1; i--) {
    if (dp[i][w] !== dp[i - 1][w]) {
      picked.push(i - 1);
      w -= items[i - 1].weight;
    }
  }
  return { value: dp[n][capacity], picked: picked.reverse() };
}

/**
 * Multiple-choice knapsack: pick exactly ONE option from every group so that the
 * total cost stays within budget and total value is maximal.
 * groups: [[{ cost, value, ...}], ...]; costs are rounded up to `unit` NPR.
 * Returns { feasible, choice: [optionIndex per group], value, cost }.
 */
export function multipleChoiceKnapsack(groups, budget, unit = 100) {
  const cap = Math.max(0, Math.floor(budget / unit));
  const NEG = -Infinity;
  let dp = new Float64Array(cap + 1).fill(NEG);
  dp[0] = 0;
  const choiceTables = [];

  for (const group of groups) {
    const next = new Float64Array(cap + 1).fill(NEG);
    const choice = new Int16Array(cap + 1).fill(-1);
    group.forEach((opt, idx) => {
      const c = Math.ceil(opt.cost / unit);
      for (let w = c; w <= cap; w++) {
        if (dp[w - c] === NEG) continue;
        const v = dp[w - c] + opt.value;
        if (v > next[w]) { next[w] = v; choice[w] = idx; }
      }
    });
    choiceTables.push(choice);
    dp = next;
  }

  let bestW = -1;
  for (let w = 0; w <= cap; w++) if (dp[w] !== NEG && (bestW < 0 || dp[w] > dp[bestW])) bestW = w;
  if (bestW < 0) return { feasible: false, choice: null, value: 0, cost: 0 };

  // Walk back through the groups to recover the chosen option of each.
  const picks = new Array(groups.length);
  let w = bestW;
  for (let g = groups.length - 1; g >= 0; g--) {
    const idx = choiceTables[g][w];
    picks[g] = idx;
    w -= Math.ceil(groups[g][idx].cost / unit);
  }
  const cost = picks.reduce((s, idx, g) => s + groups[g][idx].cost, 0);
  return { feasible: true, choice: picks, value: dp[bestW], cost };
}
