#!/usr/bin/env node
// Recompute the front page's rank from the saved reads.
//
// The formula is served in the front response's own weighted_votes_note:
//   top order ranks by (1 + weighted_votes) / (hours_since_post + 2) ^ 1.8
// This script checks that formula against the served unpinned order, then runs
// the counterfactual that tests the tenure weight: keep the rank function,
// replace weighted_votes with votes. It also records what happens if the time
// decay is dropped, which is a different test.
import fs from "node:fs";

const D = new URL("./data/", import.meta.url);
const read = (f) => JSON.parse(fs.readFileSync(new URL(f, D), "utf8"));
const front = read("front-limit-300.json");
const now = front.now;

const byId = new Map();
for (let p = 1; p <= 4; p++) {
  for (const row of read("new-p" + p + ".json").posts) {
    if (!byId.has(row.id)) byId.set(row.id, row);
  }
}
const all = [...byId.values()].sort((a, b) => b.created_at - a.created_at || b.id - a.id);
const pool = all.slice(0, 300);
const rank = (v, created) => (1 + v) / Math.pow(Math.max(0, (now - created) / 3_600_000) + 2, 1.8);
const order = (field) => pool
  .filter((p) => !p.pinned)
  .map((p) => ({ ...p, _r: rank(p[field], p.created_at) }))
  .sort((a, b) => b._r - a._r || b.created_at - a.created_at || b.id - a.id);

const served = front.posts.filter((p) => !p.pinned);
const actual = order("weighted_votes");
const swapped = order("votes");
const pure = pool.filter((p) => !p.pinned)
  .sort((a, b) => b.votes - a.votes || b.created_at - a.created_at || b.id - a.id);

const mismatches = served.reduce((n, p, i) => n + (actual[i] && actual[i].id !== p.id ? 1 : 0), 0);
const top = (rows) => rows.slice(0, 30).map((p) => p.id);
const a30 = top(actual), s30 = top(swapped), p30 = top(pure);
const set = (ids) => new Set(ids);
const enters = (a, b) => b.filter((id) => !set(a).has(id));
const positionChanges = (a, b) => {
  const pos = new Map(b.map((id, i) => [id, i]));
  return a.filter((id, i) => pos.has(id) && pos.get(id) !== i).length;
};

console.log("front", front.now_utc, "ranked_count", front.ranked_count, "board_total", front.board_total);
console.log("pool", pool.length, "pins", pool.filter((p) => p.pinned).map((p) => p.id).join(","));
console.log("served unpinned", served.length, "order mismatches", mismatches);
console.log("top 30 weighted == votes:", actual.slice(0, 30).every((p) => p.votes === p.weighted_votes));
console.log("top 30 vote sum", actual.slice(0, 30).reduce((n, p) => n + p.votes, 0),
  "weighted sum", actual.slice(0, 30).reduce((n, p) => n + p.weighted_votes, 0));
console.log("swap weighted_votes -> votes, keep decay:",
  "enters", enters(a30, s30).length, "leaves", enters(s30, a30).length,
  "position changes", positionChanges(a30, s30));
console.log("drop the decay (raw votes):",
  "enters", enters(a30, p30).length, "leaves", enters(p30, a30).length,
  "position changes", positionChanges(a30, p30));
console.log("pool posts weighted != votes:",
  pool.filter((p) => p.votes !== p.weighted_votes)
    .map((p) => "#" + p.id + " " + p.votes + "->" + p.weighted_votes)
    .join(", ") || "none");
