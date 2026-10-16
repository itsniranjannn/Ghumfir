// Unit tests for the algorithms. Run: npm test  (no database needed)
import test from 'node:test';
import assert from 'node:assert/strict';
import { haversine } from './geo.js';
import { nearestNeighbour, twoOpt, tourCost } from './tsp.js';
import { knapsack01, multipleChoiceKnapsack } from './knapsack.js';
import { bayesianRating, tagCosine, seasonFit } from './recommender.js';
import { searchDestinations, levenshtein } from './search.js';
import { buildCatalog } from '../catalog.js';
import { seedRows } from '../../db/rows.js';

const rows = seedRows();
const catalog = buildCatalog({ ...rows, tripStops: [] });
const id = rows.idOf;

test('haversine: Kathmandu to Pokhara is about 140 km in a straight line', () => {
  const ktm = rows.destinations.find((d) => d.slug === 'kathmandu');
  const pkr = rows.destinations.find((d) => d.slug === 'pokhara');
  const km = haversine(ktm, pkr);
  assert.ok(km > 130 && km < 150, `got ${km}`);
});

test('2-opt never makes a tour worse than nearest neighbour', () => {
  const pts = [[0, 0], [5, 5], [1, 0], [5, 0], [0, 5], [2, 2], [4, 1]];
  const cost = (i, j) => Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]);
  const nn = nearestNeighbour(pts.length, cost);
  const opt = twoOpt(nn, cost);
  assert.ok(tourCost(opt, cost) <= tourCost(nn, cost) + 1e-9);
  assert.equal(opt[0], 0);
  assert.equal(opt[opt.length - 1], 0);
  assert.equal(new Set(opt.slice(0, -1)).size, pts.length);
});

test('0/1 knapsack finds the optimum', () => {
  const items = [{ weight: 1, value: 1 }, { weight: 3, value: 4 }, { weight: 4, value: 5 }, { weight: 5, value: 7 }];
  const r = knapsack01(items, 7);
  assert.equal(r.value, 9);
  assert.deepEqual(r.picked, [1, 2]);
});

test('multiple-choice knapsack picks one option per group within budget', () => {
  const groups = [
    [{ cost: 1000, value: 1 }, { cost: 3000, value: 5 }],
    [{ cost: 500, value: 1 }, { cost: 2500, value: 4 }],
  ];
  const r = multipleChoiceKnapsack(groups, 4000, 100);
  assert.ok(r.feasible);
  assert.ok(r.cost <= 4000);
  assert.equal(r.value, 6);
  assert.equal(multipleChoiceKnapsack(groups, 1000, 100).feasible, false);
});

test('Bayesian rating trusts many reviews over one', () => {
  assert.ok(bayesianRating(4.6, 50, 4.2) > bayesianRating(5, 1, 4.2));
});

test('tag cosine and season fit', () => {
  assert.equal(tagCosine('a,b', 'a,b'), 1);
  assert.equal(tagCosine('a', 'b'), 0);
  assert.equal(seasonFit('10,11', 10), 1);
  assert.equal(seasonFit('10,11', 12), 0.5);
  assert.equal(seasonFit('10,11', 6), 0);
});

test('search ranks by relevance and tolerates typos', () => {
  const docs = rows.destinations.map((d) => ({ ...d, attractionNames: '' }));
  assert.equal(searchDestinations(docs, 'pokhra')[0].id, id.pokhara);
  assert.equal(searchDestinations(docs, 'rhino safari')[0].id, id.chitwan);
  assert.equal(levenshtein('kitten', 'sitting'), 3);
});

test('planner: route, days and budget are consistent', () => {
  const plan = catalog.planner.plan({
    startId: id.kathmandu,
    destinationIds: [id.chitwan, id.pokhara, id.bandipur],
    days: 7, budget: 120000, travelers: 2, style: 'standard', pace: 'balanced',
    interests: ['nature', 'wildlife'], startDate: '2026-11-02',
  });
  assert.equal(plan.days.length, 7);
  assert.equal(plan.days[0].date, '2026-11-02');
  assert.ok(plan.summary.withinBudget, `over budget: ${plan.summary.totalCost}`);
  // Bandipur sits between Pokhara and Chitwan, so the optimised tour should not be worse than the input order.
  assert.ok(plan.trace.tsp.twoOptHours <= plan.trace.tsp.inputOrderHours);
  const sum = Object.values(plan.breakdown).reduce((a, b) => a + b, 0);
  assert.equal(sum, plan.summary.totalCost);
});

test('planner: tight budget downgrades instead of failing', () => {
  const rich = catalog.planner.plan({ startId: id.kathmandu, destinationIds: [id.pokhara], days: 4, budget: 200000, travelers: 2, style: 'premium' });
  const poor = catalog.planner.plan({ startId: id.kathmandu, destinationIds: [id.pokhara], days: 4, budget: 30000, travelers: 2, style: 'premium' });
  assert.ok(poor.summary.totalCost < rich.summary.totalCost);
});

test('planner: auto-pick keeps short trips close and affordable', () => {
  // Regression: a 6-day Rs 60k nature trip used to become one 14-hour bus ride to Bardiya and back.
  const plan = catalog.planner.plan({ startId: id.kathmandu, days: 6, budget: 60000, travelers: 2, interests: ['nature', 'wildlife', 'lakes'], month: 10 });
  assert.ok(plan.summary.withinBudget, `over budget: ${plan.summary.totalCost}`);
  assert.ok(plan.summary.travelHours <= 6 * 5, `too much travel: ${plan.summary.travelHours} h`);
  assert.ok(plan.stops.length >= 2, `only ${plan.stops.map((s) => s.name)}`);
  assert.ok(!plan.warnings.some((w) => w.startsWith('Dropped')), plan.warnings.join(' | '));
});

test('planner: auto-pick fills the days when no destination is chosen', () => {
  const plan = catalog.planner.plan({ startId: id.kathmandu, days: 8, budget: 150000, travelers: 2, interests: ['culture', 'heritage'], month: 11 });
  assert.ok(plan.stops.length >= 2);
  assert.equal(plan.days.length, 8);
  assert.ok(plan.trace.autoPicked);
});
