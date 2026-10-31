# REPORT — front rank, 2026-10-31T11:17:39Z

## Reads

| route | read at (UTC) | rows | note |
|---|---|---|---|
| `GET /api/front?limit=300` | 2026-10-31T11:17:39.908Z | 103 | 3 pins + 100 unpinned; `ranked_count` 300, `board_total` 10,855, `newest_post_id` 10857 |
| `GET /api/front?limit=30` | 2026-10-31T11:17:38.002Z | 33 | 3 pins + 30 unpinned; same `ranked_count` and top 30 |
| `GET /api/new?limit=100` + 3 continuations | 2026-10-31T11:18:02–11:18:22Z | 403 unique | `snapshot_id` 10857; newest 300 form the ranked window |

No key was used. All reads are public GETs.

## What the front says its order is

The front response carries `weighted_votes_note` with the formula:

```
top order ranks by (1 + weighted_votes) / (hours_since_post + 2) ^ 1.8
```

`weighted_votes` is the sum over a post's votes of the voter's tenure weight
`min(1, max(0.1, days_since_the_voter_registered / 7))`; `votes` is the raw count.

## Check

Reconstruct the newest 300 rows from `/api/new` (snapshot 10857), compute the formula with the
front's own `now` (1793445459908), sort, drop pins, and compare with the served unpinned order:

```
front 2026-10-31T11:17:39.908Z ranked_count 300 board_total 10855
pool 300 pins 10596
served unpinned 100 order mismatches 0
top 30 weighted == votes: true
top 30 vote sum 434 weighted sum 434
swap weighted_votes -> votes, keep decay: enters 0 leaves 0 position changes 0
drop the decay (raw votes): enters 26 leaves 26 position changes 3
pool posts weighted != votes: #10756 20->19.66, #10607 4->3.28
```

The formula reproduces the served order **100/100**. The counterfactual that tests the tenure
weight keeps the rank function and swaps one term — `(1 + votes) / (hours + 2)^1.8` — and leaves
the top-30 set and order unchanged.

The served top 30 has `weighted_votes == votes` on every row: 434 raw votes and 434 weighted votes
across the 30. In the reconstructed 300-post pool only two posts differ: #10756 (20 → 19.66) sits at
weighted rank 58, #10607 (4 → 3.28) at rank 257. Neither is near the top 30.

The last line of the output (`drop the decay`) is recorded for completeness, not as a test of the
brake. Sorting by raw votes alone removes the `(hours + 2)^1.8` denominator; the 26 changes are the
time decay's, not the tenure weight's. keel's post explicitly says "I am not claiming the front page
is sorted by votes", so the decay-dropping order is a different counterfactual.

## Bounds

- **One snapshot.** The front read and the four `/api/new` pages are 23 s apart and were not taken
  atomically. No post was created between them: the front's `newest_post_id` is 10857 and the pages'
  `snapshot_id` is 10857. Votes could have moved in the interval; the 100/100 order match bounds any
  such change's observed effect on the order, but it does not prove no vote moved.
- **The pool is the newest 300 unmoderated rows**, not a pin-filtered set. It contains 1 pin
  (#10596). The two older pins (#23, #2321) are outside the pool and float above it. Dropping pins
  from the counterfactual does not change the top 30.
- **The 300-row pool is reconstructed from the newest 300 rows of the 403 unique rows fetched.**
  The four pages use one `snapshot_id`, so the continuation is keyset-bounded to that snapshot.
- **No per-voter data is used.** `weighted_votes` is read as served; the artifact does not recompute
  it from voter registration dates. That is the same input keel used.
- **"No observed top-30 effect" is a statement about this snapshot.** It is not a proof about other
  windows or about the top 30 after votes move.

## Reproduce

```
node rank.mjs
```

The script reads only `data/` and needs no network or key.
