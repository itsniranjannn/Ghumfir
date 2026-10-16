// Trip planner: turns (start city, destinations, days, budget, style, pace, interests)
// into a costed, day-by-day itinerary.
//
// Pipeline
//  1. Recommender ranks destinations (used for auto-pick and for deciding what to drop).
//  2. Each leg gets realistic road time + transport options; one mode is chosen by style.
//  3. TSP (nearest neighbour + 2-opt) orders the stops to minimise total travel hours.
//  4. Days are fitted: long legs become travel days, stays start at min_days and spare
//     days go to the highest-value stops.
//  5. Per stop, 0/1 knapsack picks attractions that fit the sightseeing hours
//     (three packages: everything / skip pricey extras / free only).
//  6. Multiple-choice knapsack picks one (hotel x attraction package) per stop to
//     maximise value inside the budget left after transport, food and permits.
//  7. Attractions are ordered by a nearest-neighbour walk and packed into days.

import { createRoadGraph, legOptions, chooseMode, haversine, MONSOON_MONTHS } from './geo.js';
import { optimiseRoute, nearestNeighbour } from './tsp.js';
import { knapsack01, multipleChoiceKnapsack } from './knapsack.js';
import { recommend, splitList } from './recommender.js';

export const STYLES = ['budget', 'standard', 'premium'];
export const PACES = { relaxed: 5, balanced: 7, packed: 9 }; // sightseeing hours per day
export const INTEREST_TAGS = [
  'culture', 'heritage', 'spiritual', 'nature', 'adventure', 'trekking', 'wildlife',
  'lakes', 'mountains', 'food', 'village', 'relaxation', 'photography',
];
const FOOD_MULT = { budget: 1, standard: 1.6, premium: 2.8 };
// How much a traveller of each style values each hotel tier.
const TIER_VALUE = {
  budget: { budget: 30, standard: 18, premium: 4 },
  standard: { budget: 10, standard: 30, premium: 20 },
  premium: { budget: 0, standard: 14, premium: 30 },
};
const LONG_LEG_HOURS = 5; // longer legs take a whole travel day
const SHORT_RETURN_HOURS = 3; // shorter final legs happen on the evening of the last day
const CONTINGENCY = 0.05;
const DEPART_HOUR = 7;
const DAY_START_HOUR = 9;
const TRANSFER_HOURS = 0.5; // walking / taxi time between sights
const SUNRISE_HOUR = 5.5;
const SUNSET_HOUR = 18;
const isSunrise = (a) => /sunrise/i.test(a.name);
const isSunset = (a) => /sunset/i.test(a.name);

export class PlanError extends Error {
  constructor(message) { super(message); this.status = 400; }
}

export function normaliseInput(input, byId) {
  const n = (v, lo, hi, def) => {
    const x = Number(v);
    return Number.isFinite(x) ? Math.min(hi, Math.max(lo, Math.round(x))) : def;
  };
  const startId = Number(input.startId);
  if (!byId.has(startId)) throw new PlanError('Choose a valid starting city');
  let startDate = null, month = n(input.month, 1, 12, new Date().getMonth() + 1);
  if (input.startDate) {
    const d = new Date(`${input.startDate}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) throw new PlanError('Invalid start date');
    startDate = d;
    month = d.getUTCMonth() + 1;
  }
  return {
    startId,
    destinationIds: [...new Set((input.destinationIds || []).map(Number))].filter((id) => byId.has(id) && id !== startId),
    days: n(input.days, 1, 30, 5),
    budget: n(input.budget, 1000, 10_000_000, 50000),
    travelers: n(input.travelers, 1, 20, 2),
    style: STYLES.includes(input.style) ? input.style : 'standard',
    pace: PACES[input.pace] ? input.pace : 'balanced',
    interests: splitList(input.interests).filter((t) => INTEREST_TAGS.includes(t)),
    startDate,
    month,
  };
}

/**
 * catalog: { destinations, attractionsByDest: Map, hotelsByDest: Map, roadLinks, cooc }
 */
export function createPlanner(catalog) {
  const byId = new Map(catalog.destinations.map((d) => [d.id, d]));
  const road = createRoadGraph(catalog.roadLinks);

  function plan(rawInput) {
    const opts = normaliseInput(rawInput, byId);
    const { days, travelers, style, interests, month } = opts;
    const paceHours = PACES[opts.pace];
    const rooms = Math.ceil(travelers / 2);
    const start = byId.get(opts.startId);

    const recList = recommend(catalog.destinations, {
      interests, month, cooc: catalog.cooc, seedIds: opts.destinationIds, includeSeeds: true,
      nameOf: (id) => byId.get(id)?.name,
    });
    const recScore = new Map(recList.map((r) => [r.id, r.score]));
    const valueOf = (d) => recScore.get(d.id) || 0;

    // ---- legs (cached per transport style) ----
    const legCache = new Map();
    const leg = (a, b, tStyle) => {
      const key = `${a.id}-${b.id}-${tStyle}`;
      if (!legCache.has(key)) {
        const info = legOptions(a, b, road, { travelers, month });
        info.chosen = chooseMode(info.options, tStyle);
        legCache.set(key, info);
      }
      return legCache.get(key);
    };

    // ---- day layout for a given visiting order ----
    function layoutDays(order, tStyle) {
      const stops = order.map((d, i) => {
        const from = i ? order[i - 1] : start;
        const l = leg(from, d, tStyle);
        return { dest: d, from, leg: l, long: l.chosen.hours > LONG_LEG_HOURS, stay: d.min_days };
      });
      const ret = leg(order[order.length - 1], start, tStyle);
      const retLong = ret.chosen.hours > SHORT_RETURN_HOURS;
      const needed = stops.reduce((s, x) => s + x.stay + (x.long ? 1 : 0), 0) + (retLong ? 1 : 0);
      return { stops, ret, retLong, needed };
    }

    // Cheapest possible cost of a layout (cheapest mode, cheapest hotel, base food):
    // a quick lower bound used to keep auto-picked trips affordable.
    function roughMinCost(layout) {
      const food = (d) => Math.round(d.daily_food_cost * FOOD_MULT[style]) * travelers;
      const cheapestLeg = (l) => Math.min(...l.options.map((o) => o.cost));
      let cost = cheapestLeg(layout.ret);
      for (const s of layout.stops) {
        const hotels = catalog.hotelsByDest.get(s.dest.id) || [];
        const night = hotels.length ? Math.min(...hotels.map((h) => h.price_per_night)) : 2000;
        cost += cheapestLeg(s.leg) + night * rooms * s.stay + food(s.dest) * (s.stay + (s.long ? 1 : 0)) + (s.dest.permit_fee || 0) * travelers;
      }
      return cost;
    }

    function autoSelect(tStyle) {
      const hoursBetween = (a, b) => leg(a, b, tStyle).chosen.hours;
      const chosen = [];
      const tried = new Set([start.id]);
      const maxStops = Math.min(6, Math.max(1, Math.floor(days / 2)));
      // Time on the move should stay under about a third of waking hours.
      const maxTravelHours = days * 5;
      // Distance penalty grows on short trips: a 14-hour leg is fine on a 3-week trip, not on 5 days.
      const perHour = 2.5 * Math.max(1, 8 / days);
      while (chosen.length < maxStops) {
        let best = null, bestScore = -Infinity;
        for (const d of recList) {
          if (tried.has(d.id)) continue;
          // Prefer high-scoring places close to the current cluster.
          const nearest = Math.min(...[start, ...chosen].map((c) => hoursBetween(c, byId.get(d.id))));
          const s = d.score - perHour * nearest;
          if (s > bestScore) { best = byId.get(d.id); bestScore = s; }
        }
        if (!best) break;
        tried.add(best.id);
        const trial = [...chosen, best];
        const { order, trace } = optimiseRoute([start, ...trial], hoursBetween);
        const layout = layoutDays(order, tStyle);
        if (layout.needed <= days && trace.finalHours <= maxTravelHours && roughMinCost(layout) <= opts.budget / (1 + CONTINGENCY)) {
          chosen.push(best);
        }
      }
      return chosen;
    }

    // ---- one full attempt for a fixed set of stops ----
    function build(selected, tStyle) {
      const warnings = [];
      const hoursBetween = (a, b) => leg(a, b, tStyle).chosen.hours;
      let route = optimiseRoute([start, ...selected], hoursBetween);
      let layout = layoutDays(route.order, tStyle);
      let stopsSel = selected.slice();
      const daysNeeded = layout.needed; // minimum for every requested stop, incl. travel days

      while (layout.needed > days && stopsSel.length > 1) {
        const drop = stopsSel.reduce((m, d) => (valueOf(d) < valueOf(m) ? d : m));
        warnings.push(`Dropped ${drop.name}: all your stops need at least ${daysNeeded} days including travel days, and you have ${days}.`);
        stopsSel = stopsSel.filter((d) => d.id !== drop.id);
        route = optimiseRoute([start, ...stopsSel], hoursBetween);
        layout = layoutDays(route.order, tStyle);
      }
      if (layout.needed > days) {
        const s = layout.stops[0];
        s.stay = Math.max(1, days - (s.long ? 1 : 0) - (layout.retLong ? 1 : 0));
        warnings.push(`${s.dest.name} usually needs ${s.dest.min_days}+ days plus travel; this plan is tight.`);
        layout.needed = s.stay + (s.long ? 1 : 0) + (layout.retLong ? 1 : 0);
      }

      // Spare days: first fill up to ideal_days, then up to ideal+2, by value per day.
      let extra = days - layout.needed;
      for (const capOf of [(s) => s.dest.ideal_days, (s) => s.dest.ideal_days + 2]) {
        while (extra > 0) {
          const cands = layout.stops.filter((s) => s.stay < capOf(s));
          if (!cands.length) break;
          const pick = cands.reduce((m, s) => (valueOf(s.dest) / s.stay > valueOf(m.dest) / m.stay ? s : m));
          pick.stay++;
          extra--;
        }
      }
      if (extra > 0) {
        const pick = layout.stops.reduce((m, s) => (valueOf(s.dest) > valueOf(m.dest) ? s : m));
        pick.stay += extra;
        warnings.push(`${extra} spare day(s) added to ${pick.dest.name} as free time.`);
      }

      // Nights and sightseeing hours per stop.
      const lastIdx = layout.stops.length - 1;
      layout.stops.forEach((s, i) => {
        const last = i === lastIdx;
        s.nights = s.stay + (s.long ? 1 : 0) - (last && !layout.retLong ? 1 : 0);
        s.dayCaps = Array.from({ length: s.stay }, () => paceHours);
        if (!s.long) s.dayCaps[0] -= s.leg.chosen.hours + TRANSFER_HOURS;
        if (last && !layout.retLong) s.dayCaps[s.stay - 1] -= layout.ret.chosen.hours + TRANSFER_HOURS;
        s.dayCaps = s.dayCaps.map((h) => Math.max(0, h));
        s.availHours = Math.max(1, s.dayCaps.reduce((a, b) => a + b, 0));
      });

      // Fixed costs (not optimised by the knapsack).
      const foodPerDay = (d) => Math.round(d.daily_food_cost * FOOD_MULT[style]) * travelers;
      let transport = layout.ret.chosen.cost, food = 0, permits = 0;
      for (const s of layout.stops) {
        transport += s.leg.chosen.cost;
        food += foodPerDay(s.dest) * (s.stay + (s.long ? 1 : 0));
        permits += (s.dest.permit_fee || 0) * travelers;
      }
      if (layout.retLong) food += foodPerDay(start);

      // Options per stop = hotel x attraction package.
      const groups = layout.stops.map((s) => {
        s.packages = attractionPackages(s);
        s.hotelOpts = hotelOptions(s);
        const options = [];
        s.hotelOpts.forEach((h, hi) =>
          s.packages.forEach((p, pi) =>
            options.push({ hi, pi, cost: h.cost + p.cost, value: h.value + p.value })));
        return options;
      });

      const spendable = Math.floor(opts.budget / (1 + CONTINGENCY));
      const available = spendable - transport - food - permits;
      const unit = opts.budget > 2_000_000 ? 1000 : 100;
      const mck = available > 0 ? multipleChoiceKnapsack(groups, available, unit) : { feasible: false };

      let choice = mck.choice;
      if (!mck.feasible) {
        // Cheapest option per stop, so we can still show how far over budget it is.
        choice = groups.map((g) => g.reduce((m, o, i) => (o.cost < g[m].cost ? i : m), 0));
      }
      return {
        feasible: mck.feasible, warnings, route, layout, groups, choice, daysNeeded,
        fixed: { transport, food, permits }, spendable, available, unit,
        dpCells: groups.length * (Math.floor(Math.max(0, available) / unit) + 1),
      };
    }

    function attractionPackages(s) {
      const list = catalog.attractionsByDest.get(s.dest.id) || [];
      const scored = list.map((a) => ({
        a,
        weight: Math.max(1, Math.round(Number(a.duration_hours) * 2)), // half-hour units
        value: Number(a.rating) ** 2 * (interests.includes(a.category) ? 1.8 : 1),
      }));
      const cap = Math.floor(s.availHours * 2);
      const run = (key, label, keep) => {
        const pool = scored.filter(keep);
        const r = knapsack01(pool, cap);
        const picked = r.picked.map((i) => pool[i]);
        return {
          key, label,
          items: picked.map((p) => p.a),
          value: Math.round(r.value * 10) / 10,
          cost: picked.reduce((t, p) => t + p.a.entry_fee, 0) * travelers,
        };
      };
      const pkgs = [
        run('full', 'Everything that fits', () => true),
        run('value', 'Skip pricey extras', (x) => x.a.entry_fee <= 500),
        run('free', 'Free sights only', (x) => x.a.entry_fee === 0),
      ];
      const seen = new Set();
      return pkgs.filter((p) => {
        const sig = p.items.map((a) => a.id).sort().join(',');
        if (seen.has(sig)) return false;
        seen.add(sig);
        return true;
      });
    }

    function hotelOptions(s) {
      if (s.nights <= 0) return [{ hotel: null, cost: 0, value: 0 }];
      const hotels = catalog.hotelsByDest.get(s.dest.id) || [];
      if (!hotels.length) return [{ hotel: null, cost: 2000 * rooms * s.nights, value: 0, estimated: true }];
      return hotels.map((h) => ({
        hotel: h,
        cost: h.price_per_night * rooms * s.nights,
        value: Number(h.rating) * 10 + TIER_VALUE[style][h.tier],
      }));
    }

    // ---- try, then relax: cheaper transport, then (auto plans only) fewer stops ----
    const autoPicked = opts.destinationIds.length === 0;
    let tStyle = style;
    let selected = autoPicked ? autoSelect(tStyle) : opts.destinationIds.map((id) => byId.get(id));
    if (!selected.length) throw new PlanError('No destination fits these days. Try more days or another start city.');
    const globalWarnings = [];
    let res;
    for (;;) {
      res = build(selected, tStyle);
      if (res.feasible) break;
      if (tStyle !== 'budget') {
        tStyle = 'budget';
        globalWarnings.push('Switched to cheaper transport to stay within budget.');
        // Slower transport changes which places fit, so auto-picked trips are re-picked.
        if (autoPicked) {
          const again = autoSelect(tStyle);
          if (again.length) selected = again;
        }
        continue;
      }
      if (autoPicked && selected.length > 1) {
        const drop = selected.reduce((m, d) => (valueOf(d) < valueOf(m) ? d : m));
        globalWarnings.push(`Left out ${drop.name} to stay within budget.`);
        selected = selected.filter((d) => d.id !== drop.id);
        continue;
      }
      break;
    }

    return assemble(res, { autoPicked, tStyle, warnings: [...globalWarnings, ...res.warnings], recList, opts, paceHours, rooms, start });
  }

  // ---- turn the chosen options into a day-by-day plan ----
  function assemble(res, ctx) {
    const { opts, paceHours, rooms, start } = ctx;
    const { travelers, style } = opts;
    const { layout } = res;
    const foodPerDay = (d) => Math.round(d.daily_food_cost * FOOD_MULT[style]) * travelers;
    const days = [];
    const pickDest = (d) => ({ id: d.id, slug: d.slug, name: d.name, name_np: d.name_np, lat: d.lat, lng: d.lng, altitude_m: d.altitude_m });
    const addDays = (n) => {
      if (!opts.startDate) return null;
      const d = new Date(opts.startDate);
      d.setUTCDate(d.getUTCDate() + n);
      return d.toISOString().slice(0, 10);
    };
    const newDay = (type, dest, title) => {
      const d = { day: days.length + 1, date: addDays(days.length), type, destination: pickDest(dest), title, items: [], cost: { transport: 0, stay: 0, food: 0, entry: 0, permits: 0 } };
      days.push(d);
      return d;
    };
    const fmt = (h) => {
      const hh = Math.floor(h), mm = Math.round((h - hh) * 60 / 15) * 15;
      return `${String(hh + Math.floor(mm / 60)).padStart(2, '0')}:${String(mm % 60).padStart(2, '0')}`;
    };
    const travelItem = (from, to, l, at) => ({
      time: fmt(at), kind: 'travel',
      title: `${l.chosen.label}: ${from.name} → ${to.name}`,
      detail: `${l.km} km · about ${l.chosen.hours} h${l.note ? ` · ${l.note}` : ''}${l.chosen.weatherRisk ? ' · Mountain flights are often delayed by weather; keep a buffer day.' : ''}`,
      hours: l.chosen.hours, cost: l.chosen.cost, mode: l.chosen.mode,
    });

    const stopsOut = [];
    const dropped = [];
    layout.stops.forEach((s, i) => {
      const opt = res.groups[i][res.choice[i]];
      const hotelOpt = s.hotelOpts[opt.hi];
      const pkg = s.packages[opt.pi];
      const full = s.packages[0];
      const last = i === layout.stops.length - 1;
      const nightCost = hotelOpt.hotel ? hotelOpt.hotel.price_per_night * rooms : hotelOpt.estimated ? 2000 * rooms : 0;
      let nightsLeft = s.nights;
      const chargeNight = (d) => { if (nightsLeft > 0) { d.cost.stay += nightCost; nightsLeft--; } };

      for (const a of catalog.attractionsByDest.get(s.dest.id) || []) {
        if (pkg.items.some((x) => x.id === a.id)) continue;
        const reason = full.items.some((x) => x.id === a.id) ? 'budget' : 'time';
        dropped.push({ destination: s.dest.name, name: a.name, fee: a.entry_fee, hours: Number(a.duration_hours), reason });
      }

      // Visit order inside the town: nearest-neighbour walk from the town centre.
      const pts = [s.dest, ...pkg.items];
      const walk = pkg.items.length > 1
        ? nearestNeighbour(pts.length, (x, y) => haversine(pts[x], pts[y])).slice(1, -1).map((k) => pts[k])
        : pkg.items.slice();
      // First-fit into days by duration. Sunrise sights can't go on a morning-arrival day.
      const buckets = s.dayCaps.map(() => []);
      const used = s.dayCaps.map(() => 0);
      for (const a of walk) {
        const h = Number(a.duration_hours) + TRANSFER_HOURS;
        const morningBlocked = (idx) => isSunrise(a) && idx === 0 && !s.long && s.stay > 1;
        let k = used.findIndex((u, idx) => !morningBlocked(idx) && u + h <= s.dayCaps[idx] + TRANSFER_HOURS);
        if (k < 0) k = used.indexOf(Math.min(...used));
        buckets[k].push(a);
        used[k] += h;
      }

      const permitCost = (s.dest.permit_fee || 0) * travelers;
      const addPermit = (d) => {
        if (!permitCost) return;
        d.cost.permits += permitCost;
        d.items.push({ time: null, kind: 'permit', title: s.dest.permit_note || 'Permit', detail: `Rs ${s.dest.permit_fee} per person`, cost: permitCost });
      };
      const checkIn = (d, at) => d.items.push({
        time: fmt(at), kind: 'stay',
        title: hotelOpt.hotel ? `Check in: ${hotelOpt.hotel.name}` : s.nights > 0 ? 'Check in (local guesthouse)' : 'Day visit',
        detail: hotelOpt.hotel ? `${hotelOpt.hotel.tier} · ${rooms} room(s) · Rs ${hotelOpt.hotel.price_per_night}/night` : '',
        image: hotelOpt.hotel?.image_url || '',
        cost: 0,
      });

      if (s.long) {
        const d = newDay('travel', s.dest, `Travel to ${s.dest.name}`);
        d.items.push(travelItem(s.from, s.dest, s.leg, DEPART_HOUR));
        d.cost.transport += s.leg.chosen.cost;
        checkIn(d, Math.min(21, DEPART_HOUR + s.leg.chosen.hours + 0.5));
        addPermit(d);
        d.cost.food += foodPerDay(s.dest);
        chargeNight(d);
      }
      for (let k = 0; k < s.stay; k++) {
        const items = buckets[k];
        const title = items.length ? items.slice(0, 2).map((a) => a.name).join(' · ') : `Slow day in ${s.dest.name}`;
        const d = newDay('explore', s.dest, title);
        let clock = DAY_START_HOUR;
        if (k === 0 && !s.long) {
          d.items.push(travelItem(s.from, s.dest, s.leg, DEPART_HOUR));
          d.cost.transport += s.leg.chosen.cost;
          clock = DEPART_HOUR + s.leg.chosen.hours + TRANSFER_HOURS;
          checkIn(d, clock);
          addPermit(d);
        }
        if (k === 0 && s.dest.altitude_m >= 3000) {
          d.items.push({ time: null, kind: 'note', title: `Altitude ${s.dest.altitude_m} m`, detail: 'Walk slowly, drink plenty of water and avoid alcohol on the first day.', cost: 0 });
        }
        // Sunrise sights go first at dawn, sunset sights last in the evening.
        const ordered = [...items.filter(isSunrise), ...items.filter((a) => !isSunrise(a) && !isSunset(a)), ...items.filter(isSunset)];
        for (const a of ordered) {
          const fee = a.entry_fee * travelers;
          let at = clock;
          if (isSunrise(a) && clock <= DAY_START_HOUR) at = SUNRISE_HOUR;
          if (isSunset(a)) at = Math.max(clock, SUNSET_HOUR - Number(a.duration_hours));
          d.items.push({ time: fmt(at), kind: 'visit', title: a.name, detail: a.description, category: a.category, hours: Number(a.duration_hours), cost: fee, attractionId: a.id });
          d.cost.entry += fee;
          clock = Math.max(clock, at + Number(a.duration_hours) + TRANSFER_HOURS);
        }
        if (!items.length) d.items.push({ time: fmt(clock), kind: 'free', title: 'Free time', detail: 'Wander, rest, or go back to a favourite spot.', cost: 0 });
        d.cost.food += foodPerDay(s.dest);
        if (last && k === s.stay - 1 && !layout.retLong) {
          d.items.push(travelItem(s.dest, start, layout.ret, Math.max(clock, 16)));
          d.cost.transport += layout.ret.chosen.cost;
        }
        chargeNight(d);
      }

      stopsOut.push({
        ...pickDest(s.dest),
        altitude_m: s.dest.altitude_m,
        nights: s.nights,
        stayDays: s.stay,
        arriveBy: { mode: s.leg.chosen.mode, label: s.leg.chosen.label, hours: s.leg.chosen.hours, km: s.leg.km, cost: s.leg.chosen.cost },
        hotel: hotelOpt.hotel ? { ...hotelOpt.hotel, total: hotelOpt.cost } : null,
        hotelAlternatives: s.hotelOpts.filter((h) => h.hotel && h !== hotelOpt).map((h) => ({ ...h.hotel, total: h.cost, delta: h.cost - hotelOpt.cost })),
        package: { key: pkg.key, label: pkg.label, count: pkg.items.length, cost: pkg.cost },
        sightseeingHours: Math.round(s.availHours * 10) / 10,
      });
    });

    if (layout.retLong) {
      const last = layout.stops[layout.stops.length - 1].dest;
      const d = newDay('return', start, `Return to ${start.name}`);
      d.items.push(travelItem(last, start, layout.ret, DEPART_HOUR));
      d.cost.transport += layout.ret.chosen.cost;
      d.cost.food += foodPerDay(start);
    }

    const breakdown = { transport: 0, stay: 0, food: 0, entry: 0, permits: 0 };
    for (const d of days) {
      d.total = Object.values(d.cost).reduce((a, b) => a + b, 0);
      for (const k of Object.keys(breakdown)) breakdown[k] += d.cost[k];
    }
    const subtotal = Object.values(breakdown).reduce((a, b) => a + b, 0);
    breakdown.contingency = Math.round(subtotal * CONTINGENCY);
    const total = subtotal + breakdown.contingency;

    const legs = [
      ...layout.stops.map((s) => ({ from: s.from.name, to: s.dest.name, ...legSummary(s.leg) })),
      { from: layout.stops[layout.stops.length - 1].dest.name, to: start.name, ...legSummary(layout.ret) },
    ];
    const warnings = ctx.warnings.slice();
    if (MONSOON_MONTHS.includes(opts.month)) warnings.push('Monsoon month: road times include a 30% delay allowance; check for landslide closures before you go.');
    for (const s of layout.stops) {
      const months = splitList(s.dest.best_months).map(Number);
      if (months.length && !months.includes(opts.month)) warnings.push(`${s.dest.name} is outside its best season in your month.`);
    }
    if (!res.feasible) warnings.unshift(`Even the leanest version is about Rs ${(total - opts.budget).toLocaleString('en-IN')} over budget.`);

    const t = res.route.trace;
    return {
      input: { ...opts, startDate: opts.startDate ? opts.startDate.toISOString().slice(0, 10) : null },
      start: pickDest(start),
      summary: {
        days: days.length,
        stops: stopsOut.length,
        totalCost: total,
        budget: opts.budget,
        remaining: opts.budget - total,
        withinBudget: total <= opts.budget,
        perPerson: Math.round(total / travelers),
        travelHours: Math.round(legs.reduce((s, l) => s + l.chosen.hours, 0) * 10) / 10,
        distanceKm: legs.reduce((s, l) => s + l.km, 0),
      },
      stops: stopsOut,
      legs,
      days,
      breakdown,
      dropped,
      warnings,
      trace: {
        autoPicked: ctx.autoPicked,
        daysNeeded: res.daysNeeded,
        transportStyle: ctx.tStyle,
        pace: { name: opts.pace, hoursPerDay: paceHours },
        tsp: {
          inputOrderHours: t.givenHours,
          nearestNeighbourHours: t.nnHours,
          twoOptHours: t.finalHours,
          hoursSaved: Math.round((t.givenHours - t.finalHours) * 10) / 10,
        },
        knapsack: {
          budget: opts.budget,
          contingencyReserve: opts.budget - res.spendable,
          fixed: res.fixed,
          availableForStaysAndSights: res.available,
          optionsPerStop: res.groups.map((g, i) => ({ stop: layout.stops[i].dest.name, options: g.length })),
          dpCells: res.dpCells,
          unit: res.unit,
          feasible: res.feasible,
        },
        recommendations: ctx.recList.slice(0, 6).map((r) => ({ id: r.id, name: r.name, score: r.score, reasons: r.reasons })),
      },
    };
  }

  return { plan };
}

function legSummary(l) {
  return {
    km: l.km, note: l.note, monsoon: l.monsoon, known: l.known,
    chosen: l.chosen,
    options: l.options,
  };
}
