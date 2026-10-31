import { readFileSync } from 'node:fs';
const dir = 'followup-towncrier/data/';
const front = JSON.parse(readFileSync(dir + 'front-300.json', 'utf8'));
const now = front.now;
const served = front.posts.filter(p => !p.pinned);
console.log('front now_utc', front.now_utc, 'newest_post_id', front.newest_post_id, 'ranked_count', front.ranked_count, 'board_total', front.board_total);
const byId = new Map();
for (let p = 1; p <= 4; p++) {
  const j = JSON.parse(readFileSync(dir + 'new-p' + p + '.json', 'utf8'));
  for (const row of (j.posts || [])) if (!byId.has(row.id)) byId.set(row.id, row);
}
const all = [...byId.values()].sort((a, b) => b.created_at - a.created_at || b.id - a.id);
const pool = all.slice(0, 300);
console.log('unique', all.length, 'pool', pool.length, 'pool pins', pool.filter(p => p.pinned).length, 'newest', pool[0].id, 'oldest', pool[pool.length - 1].id);
const rank = (v, c) => (1 + v) / Math.pow(Math.max(0, (now - c) / 3600000) + 2, 1.8);
const ordered = pool.map(p => ({ ...p, _r: rank(p.weighted_votes, p.created_at) })).sort((a, b) => b._r - a._r || b.created_at - a.created_at || b.id - a.id);
const raw = pool.map(p => ({ ...p, _r: rank(p.votes, p.created_at) })).sort((a, b) => b._r - a._r || b.created_at - a.created_at || b.id - a.id);
const unpinned = ordered.filter(p => !p.pinned);
const rawUnpinned = raw.filter(p => !p.pinned);
console.log('computed top30 = served top30?', unpinned.slice(0, 30).every((p, i) => p.id === served[i].id), 'mismatches over 100:', unpinned.slice(0, 100).filter((p, i) => p.id !== served[i].id).length);
const zero = pool.filter(p => p.votes === 0);
console.log('zero-vote pool rows', zero.length);
for (const z of zero) {
  const pos = unpinned.findIndex(p => p.id === z.id);
  const spos = served.findIndex(p => p.id === z.id);
  console.log('  zero', z.id, z.author, new Date(z.created_at).toISOString(), 'weighted-pos', pos + 1, 'served-pos', spos < 0 ? 'outside served 100' : spos + 1);
}
const diff = pool.filter(p => p.weighted_votes !== p.votes);
console.log('weighted!=raw pool rows', diff.length);
for (const p of diff) console.log('  diff', p.id, p.author, 'votes', p.votes, 'weighted', p.weighted_votes, 'weighted-pos', unpinned.findIndex(x => x.id === p.id) + 1, 'raw-pos', rawUnpinned.findIndex(x => x.id === p.id) + 1);
const topA = unpinned.slice(0, 30).map(p => p.id);
const topB = rawUnpinned.slice(0, 30).map(p => p.id);
console.log('same-rank swap top30 identical?', topA.every((id, i) => id === topB[i]));
console.log('top30 all weighted==raw?', unpinned.slice(0, 30).every(p => p.weighted_votes === p.votes));
const wp = new Map(unpinned.map((p, i) => [p.id, i + 1]));
const moved = rawUnpinned.map((p, i) => ({ id: p.id, raw_pos: i + 1, weighted_pos: wp.get(p.id), votes: p.votes, weighted: p.weighted_votes })).filter(x => x.raw_pos !== x.weighted_pos);
console.log('rows whose position changes under the swap:', moved.length);
for (const m of moved) console.log('  ', m.id, 'raw', m.raw_pos, 'weighted', m.weighted_pos, 'votes', m.votes, 'weighted_votes', m.weighted);
console.log('served rows 31-33:', served.slice(30, 33).map(p => p.id + ':' + p.votes + '/' + p.weighted_votes).join(' '));
console.log('rows after 33 have min votes:', Math.min(...served.slice(33).map(p => p.votes)));
