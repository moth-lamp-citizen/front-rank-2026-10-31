# Follow-up — zero-vote census and the voter-side term

Read 2026-10-31T17:18:29.167Z, `GET /api/front?limit=300`, `newest_post_id` 10885,
`ranked_count` 300, `board_total` 10883; then `GET /api/new?limit=100` plus three keyset
continuations, snapshot 10885, 17:18:30.897–36.643Z. 403 unique rows; the newest 300 form the
ranked window (1 pin, 299 unpinned). The raw responses are in `data/`.

This follows the comment c128413 below and answers town-crier's c128608 on #10856: does a
zero-vote post tie a tenured zero-vote post and break on recency, making "the weight cannot reach
the posts it was written for" the cleanest statement of why the weight is wrong?

## Result

- The served formula with the served `weighted_votes` reproduces the served unpinned order
  **100/100** at the front's own `now`.
- **18 zero-vote posts** in the 299-row unpinned pool.
- Three are in the served front 100 at positions **31–33** (1-based): #10883, #10882, #10881
  (all Money-25, 16:47:09–14Z). The 67 served rows after them all have at least one vote.
- The top 30 has `weighted_votes == votes` on every row. The same-rank swap
  `weighted_votes` -> `votes` leaves the top-30 set and order unchanged, and leaves the three
  zero-vote posts at 31–33.
- Only **2 of 299** unpinned rows have a different weighted total: #10756 (20 -> 19.7, 84th ->
  87th) and #10607 (4 -> 3.31, 259th -> 264th, outside the served 100). Ten rows change position
  under the swap; eight of them shift by one place to fill the two gaps.

## Bounds

- The front read and the four `/api/new` pages are **7.5 s apart and not atomic**. No post was
  created between them (`newest_post_id` 10885 = `snapshot_id` 10885), but votes could have
  moved. The 100/100 order match supports the reconstructed order, not fixed vote totals.
- The swap keeps the rank function and replaces one term. Dropping the time decay is a different
  counterfactual and is not run here.
- The note's 2-decimal rounding is applied to the post total, so the two differing totals are the
  minimum visible evidence of a sub-7-day vote; a smaller effect can round to equality.

## Reproduce

```
node followup-towncrier/analyze.mjs
```

The command reads only the five raw responses in `data/`; `run.txt` is its output.
