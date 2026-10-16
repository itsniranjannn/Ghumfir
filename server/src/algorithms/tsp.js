// Visiting-order optimisation: Nearest-Neighbour construction + 2-opt improvement.
// The tour starts and ends at the start city (index 0 of `nodes`).

/** Total cost of a closed tour [0, ...route, 0]. */
export function tourCost(route, cost) {
  let total = 0;
  for (let i = 0; i < route.length - 1; i++) total += cost(route[i], route[i + 1]);
  return total;
}

/** Greedy tour: always move to the closest unvisited node. O(n^2). */
export function nearestNeighbour(n, cost) {
  const visited = new Array(n).fill(false);
  const route = [0];
  visited[0] = true;
  for (let step = 1; step < n; step++) {
    const last = route[route.length - 1];
    let best = -1, bestCost = Infinity;
    for (let j = 0; j < n; j++) {
      if (!visited[j] && cost(last, j) < bestCost) { best = j; bestCost = cost(last, j); }
    }
    route.push(best);
    visited[best] = true;
  }
  route.push(0);
  return route;
}

/**
 * 2-opt local search: reverse any segment whose reversal shortens the tour,
 * repeat until no improving move exists. Endpoints (start city) stay fixed.
 */
export function twoOpt(route, cost) {
  let best = route.slice();
  let improved = true;
  let passes = 0;
  while (improved && passes < 100) {
    improved = false;
    passes++;
    for (let i = 1; i < best.length - 2; i++) {
      for (let k = i + 1; k < best.length - 1; k++) {
        const delta =
          cost(best[i - 1], best[k]) + cost(best[i], best[k + 1]) -
          cost(best[i - 1], best[i]) - cost(best[k], best[k + 1]);
        if (delta < -1e-9) {
          best = [...best.slice(0, i), ...best.slice(i, k + 1).reverse(), ...best.slice(k + 1)];
          improved = true;
        }
      }
    }
  }
  return best;
}

/**
 * Optimises visiting order. `nodes[0]` is the start city.
 * Returns the order (without the start city at the ends) and a trace for the UI.
 */
export function optimiseRoute(nodes, costFn) {
  const cost = (i, j) => costFn(nodes[i], nodes[j]);
  const given = [0, ...nodes.slice(1).map((_, i) => i + 1), 0];
  if (nodes.length <= 2) {
    return { order: nodes.slice(1), trace: { givenHours: tourCost(given, cost), nnHours: tourCost(given, cost), finalHours: tourCost(given, cost) } };
  }
  const nn = nearestNeighbour(nodes.length, cost);
  const opt = twoOpt(nn, cost);
  return {
    order: opt.slice(1, -1).map((i) => nodes[i]),
    trace: {
      givenHours: round1(tourCost(given, cost)),
      nnHours: round1(tourCost(nn, cost)),
      finalHours: round1(tourCost(opt, cost)),
    },
  };
}

const round1 = (x) => Math.round(x * 10) / 10;
