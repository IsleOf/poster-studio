# poster-studio — Project State

Format: Agentic Universe project graph v1 · Graph: `knowledge/graph/poster-studio_project_graph.json` · Date: 2026-09-08

Evidence-base commit: `65e3a2da58d7287834ace69bf3d1d77aacb453dc` · Branch: `codex/backup-current-state-20260501`

Mapping-content commit: `ccecfef2470acc37296e828dc30290c02355bc53` (both artifacts). This SHA is recorded by a metadata-only follow-up so the document does not pretend to contain its own final commit hash. Find the latest delivery commit with `git log -1 --format=%H -- docs/PROJECT_STATE.md`.

Validate from the repository root: `python3 -B /mnt/c/Agents/agentic-universe/repo/docs/project_audit_kit/project_graph_scaffold.py validate knowledge/graph/poster-studio_project_graph.json`

Read this document and the graph first in a cold session. They supersede dated handovers as the map of current work, not as authority over VPS data. Historical evidence is preserved, not deleted. Only these two artifacts are changed in this mapping pass; no application repair, regeneration, synchronization, deployment, service restart or credential inspection is included.

## What it is

Poster Studio is The Mapped Moment's browser poster designer, order service and adjacent Etsy listing-image factory. React/Vite renders star, monochrome street and colored street designs; Express and SQLite handle saved designs, templates, listings and orders. The separate factory prepares mockup scenes and invokes a repository CLI to create Etsy drafts. See `package.json`, `server/index.js:123`, `server/db.js:18`, `server/scripts/factory-create-etsy-draft.js:207`.

**The VPS is ground truth for existing templates, orders, saved designs and other production data.** The owner explicitly reaffirmed this on 2026-09-08. Local DB copies, source defaults and historical notes do not establish current production values. The production-authority policy is also recorded in `docs/AGENT_RUNBOOK.md:42` and `docs/PRODUCTION_DATA_AND_RESILIENCE_PLAN.md:129`. No VPS data was read or changed for this map.

The map separates local code, documented historical observations and unknown runtime state. An `active` component is implemented/documented, not a claim that its process is running or its code is deployed.

## Current state

The active delivery problem is **unfinished replacement imagery for 12 existing listings / 231 archived ranks**, not a new product-family expansion. The September 8 incident handover says no gallery is upload-ready and no upload is authorized. The run ledger says no final image was regenerated in its latest implementation slice. These are dated local records, not a fresh visual inspection or Etsy query. Evidence: `docs/HANDOVER-2026-09-08-LISTING-IMAGE-RECOVERY.md:18`, `docs/TASKLIST-listing-factory-active.md:1373`, `reports/listing-image-run-ledger-20260908.md:62`.

Protected approvals remain image-specific: listing **4560493743 ranks 01, 03, 04, 07–14, 16–20** in the historical `etsy-listing-candidates-production-grounded-20260905-monochrome-repaired` version. That is 16 images, not whole-gallery approval, and never approval of changed bytes. SMBW 4528873697 rank 01 is a layout reference, not approval of the rejected September 7 gallery. The board's hardcoded wording claiming the CSM gallery is user-approved and the heart-star gallery unreviewed conflicts with the incident ledger; badges are not authoritative. Evidence: handover sections “Candidate roots” and “Current authoritative user feedback”; `scripts/serve-listing-review.mjs:27`.

The rank-specific incident ledger remains `docs/HANDOVER-2026-09-08-LISTING-IMAGE-RECOVERY.md:109`. Its unresolved scopes include:

| Scope | Recorded defect; not repaired by this map |
| --- | --- |
| Forest star 4528873303, all 15 | White edge stripes, dark-frame gaps, incorrect placement |
| SMBW 4528873697, 02–17 | Name/romantic-line semantics, casing, text spacing/vertical position |
| Colored heart 4528873509 and house 4528873891 | Blank/partial tiles, insufficient blue water **with streets**, repeated/bland variants; heart rank 15 distortion |
| Star families | Design001 names replaced by romantic text, specific dark blending and bottom-line alignment failures; requested inset-line removal |
| Heart star 4559850545, all 20 | Wrong product/design and compressed hero |
| CSM 4560493743, 02/05/06/15 only | Incompatible frames / horizontal distortion; preserve the 16 approved ranks |

The local review foundation is **partial, not acceptance-complete**:

- Implemented: candidate identifiers, versioned decision keys, one active modal clipboard listener, serialized writes and temporary-file rename, stale-candidate rejection, basic per-image gallery gate.
- Still broken by static inspection: image modal reads `image/<id>@<candidate>/<file>`, while decisions are stored without `image/`; saved comments can appear absent. `scripts/serve-listing-review.mjs:93,291,378`.
- Candidate identity trusts manifest hashes or stat metadata and is cached for process lifetime; it does not establish immutable served bytes. `candidateInfo` / `currentCandidates`, lines 47–87.
- Legacy migration binds old records to configured current roots and leaves active attachments empty; it does not prove historical image identity. Lines 156–188.
- Same-image concurrent edits have no expected review revision. Gallery eligibility is checked outside the serialized mutation and only against discovered files; complete rank coverage and nonempty galleries are not enforced. Lines 223–230 and 346–386.

Earlier notes declaring “PR 1 implemented” must not be read as passing the proposed migration/concurrency/crash/byte-identity acceptance suite. This pass did not run the board or write user review state. Its configured URL is `http://localhost:4175`, **not a verified running-service claim**.

The final export path also remains unfinished. `scripts/render-production-a4.mjs` is now diagnostic-only but still contains external map rasterization and the historical 150-DPI-normalized capture label. `scripts/render-production-a4-native-win.mjs` reads route-generated `window.__posterPng` and can reuse outputs by dimensions alone; it does not click the standard PNG button. The plan reports all 16 September 7 SMBW layers used the external-map/150-DPI-resize path. We verified the source mechanisms here, not those external PNGs/manifests again. Evidence: `docs/PR-LISTING-RECOVERY-IMPLEMENTATION-PLAN.md:41`; exporter lines 61/315/524 and native adapter 216/249.

The old commits were about draft retry handling: `913c895` added dry-run/resume safeguards and early draft-ID persistence; `65e3a2d` allowed dry-run validation of existing candidates. They do not implement September image recovery. Substantial current backend code is ignored by `.gitignore:6`; recovery scripts/docs are untracked. The mapping-only commit intentionally does not publish them. The published map describes an inspected working tree, **not a reproducible source release**.

Corrections to the first-pass map:

- Three-image Design004 status was superseded by a dated August 31 entry recording **20 draft images**. Neither is a current remote read or proof of human approval.
- Final-only SynthID was already deprecated by the reusable-base workflow: clean blanks first, layer untouched design exports afterward.
- The first pass missed the September recovery incident and partial review-board implementation. Its proposed next move, building an orchestrator interface, does not address the immediate loss of trustworthy feedback.
- “Machine gate blocks the commit” was not established: this checkout has only sample Git hooks and no configured `core.hooksPath`. Written contracts are not enforced hooks.
- The latest pre-map commit was nine days old, not “approximately a month.” “Four public listings,” free disk/VRAM figures, a healthy DB sync and an active factory cron were historical or unsupported current-state claims.
- Monochrome PBF/SVG rendering is a distinct code path, not simply the same MapLibre capture for every map.
- No independent AGY pass is established by the inspected September 8 ledger. A critique contract is not a completed critique.
- Peripheral first-pass persona/font/codebook nodes were folded out rather than promoted from stale records into current facts. All five original question IDs are retained.

## The single highest-value next move

**Run an isolated acceptance audit of the existing review-board v2 and repair its failed identity/comment/transaction gates before another listing batch.** Concretely, fixtures must cover reopening an existing image comment, changed bytes with unchanged manifest metadata, concurrent edits, historical-approval migration and incomplete gallery coverage. The code findings above already identify failing mechanisms.

This is one bounded move, not authorization granted by this mapping pass. It beats another rendering batch or external-orchestrator integration because those would depend on review decisions that currently can be hidden, overwritten or associated with stale identity. After that gate, the documented first image pilot is 4528873697/02 against retained 01 and the authoritative VPS A4 template, using the standard PNG export. Do not skip directly to broad generation because an earlier ledger said PR1 was done.

## Hard constraints

- **VPS authority:** existing templates/defaults, orders and saved production data come from the VPS. Never “restore” them from local guesses. Existing customer design style is not a variable in listing repair.
- **Mapping scope:** no live-path or credential access; no production or Etsy mutation, DB sync, service restart or rendering. Only this document and its graph are staged and pushed.
- **Image recovery boundary:** temporary personalization must not overwrite production default templates, sibling settings or thumbnails. The user's standard PNG-button requirement is stricter than an automated render-route capture label. Do not change road weights/star density while preparing listings.
- **Geometry and quality:** retain A4 210:297 geometry, native exporter rounding, fonts and layout; do not resize low-DPI output into compliance or squeeze designs into incompatible frames. Inspect before/after at full size, including text, map coverage, variation, dark edges and measured perspective fit.
- **Clean-base only:** no VAE/SynthID on finished lettering. Use verified blank backgrounds plus exact archived rank/quad mapping; preserve original and rejected candidates.
- **User-only release:** no approval by AGY, contact sheet, hash, detector or badge. Preserve the 16 specified approved CSM images. No Etsy upload is authorized by the recovery or mapping status.
- **External artifacts:** native Windows browser, archived imagery, mockup profiles and AGY/Flow runtime are separate dependencies. Do not infer runtime health from dated paths or launch an unrelated Polybot worker. AGY failure permits documented direct-review fallback under the user's earlier instruction, never a fabricated independent pass.
- **Windows-facing paths:** use plain `C:\...` paths for drive artifacts, not `/mnt/c/...` links. Repository-only deliverables in this pass are identified by Git paths; no new Windows copy is created.
- **Unsafe sync:** `npm run prod:pull-state` currently points to raw SQLite file copy logic. Do not execute it assuming the August 30 snapshot repair made it WAL-safe.
- **Preserve the dirty tree:** no reset, wholesale staging, unrelated commit or deployment. Most local backend/recovery evidence will not accompany this two-file push.

## Open questions

All five first-pass IDs have an evidence disposition; four are resolved within the stated scope and one remains explicitly open. “Resolved” answers the question; it does not mean the underlying defect is fixed.

| Question node | Answer and evidence |
| --- | --- |
| `ps__q_factory_running` — **OPEN** | The external factory cron's current activity and draft 4565362214's current Etsy state are unknown without live access. Last inspected dated entry: August 31, draft with 20 images; September 8 recovery says no replacement gallery upload-ready. `docs/TASKLIST-listing-factory-active.md:1353`, `reports/listing-image-run-ledger-20260908.md:15`. App order polling in `server/index.js:198` is a different cron. |
| `ps__q_synthid_wanted` — resolved 2026-09-08 | Yes, for blank backgrounds; not finished designs. `docs/MOCKUP_AND_LISTING_IMAGE_WORKFLOW.md:5` and incident handover authority rules. |
| `ps__q_relation_to_etsy_branches` — resolved 2026-09-08, repo side only | Available seam: candidate-directory draft CLI, documented external `run_stage.py` / `POSTER_STUDIO_ROOT`, existing app routes. No dedicated orchestrator adapter is wired in inspected package scripts/server route mounts. External branch operation remains unverified, not an end-to-end integration claim. `server/scripts/factory-create-etsy-draft.js:10`, `docs/HANDOVER-2026-08-30-flow-resume.md:35`, `package.json:6`, `server/index.js:123`. |
| `ps__q_prod_db_sync_reliable` — resolved 2026-09-08 | **No reliable scripted snapshot established.** The one-time VACUUM repair is documented, but `scripts/pull-production-state.sh:21` still copies the main DB directly. WAL is enabled in `server/db.js:15`. `sync-listing-state.cjs` mutates catalog membership/defaults; it is not a backup transfer. |
| `ps__q_next_listings` — resolved 2026-09-08 | Recover existing candidates, first proving review-board behavior, then a bounded SMBW /02 pilot. Design004's historical draft is not new user approval or the latest finished recovery. Evidence: incident handover, implementation plan PR1/PR4, board source, August 31 tasklist. |

Live status is intentionally open, not guessed to obtain five green flags. No additional live authority is needed to complete and deliver this mapping.

## What would make this wrong

1. **VPS drift:** current deployed renderer, settings, orders and Etsy state may differ from every local artifact. Only a separately scoped authoritative VPS/API investigation could settle that. We did not access live paths, DBs or credentials.
2. **Working-tree drift:** local source files, review manifests or reports may change after this audit. Re-check the cited symbols and hashes below before acting. Ignored/untracked sources may be absent in a fresh clone; their absence is not evidence the component never existed.
3. **Historical-record error:** earlier agents repeatedly overstated visual correctness and pipeline provenance. Counts/approvals here are attributed to the incident records, not re-certified. Original user feedback and exact historically reviewed bytes outrank narrative status and mutable board labels.
4. **External dependencies:** the configured second-brain vault index/file-map was absent during this session; no note could be read there. External factory/AGY state and etsy-agentic-space wiring were not inspected as runtime systems.
5. **Validation limits:** the official validator checks graph vocabulary/structure, not real-world truth. Supplemental checks enforce 15–40 nodes, complete fields, valid statuses, five question IDs, evidence-file/commit existence, no orphans and no dangling edges. They do not certify product quality.

Evidence fingerprints (SHA-256, observed 2026-09-08; these are source/document hashes, **not approved image hashes**):

| Artifact | SHA-256 |
| --- | --- |
| `scripts/serve-listing-review.mjs` | `3b32aea99b9cf810bb38cd08ad308576c147617478559410158654ca15382aa0` |
| `scripts/render-production-a4.mjs` | `1f5cdb62d3195cdfcd414fd646858d49a071f800cae82afbcb07cfc55a7f4a6d` |
| `scripts/render-production-a4-native-win.mjs` | `497302a52d11b2eedc8097d5e653badef95790b60788006c5591acb01f3eb772` |
| `scripts/pull-production-state.sh` | `b31b1c05032edcc0353f49872c0ddbbb74a6ed3c00df3e4902e20d36cd9d4b15` |
| `docs/HANDOVER-2026-09-08-LISTING-IMAGE-RECOVERY.md` | `80b2e704e0de83e53bc1c9fd79f693dcd8491b4520976675857b76ccd87c9eb2` |
| `docs/PR-LISTING-RECOVERY-IMPLEMENTATION-PLAN.md` | `434d83471a1f1d48bb74b0c36bc7f794f84739c5f995df20ebe942a1ad9db444` |
| `reports/listing-image-run-ledger-20260908.md` | `f8d746e24340c59b857d2de760bdce600ae0045654d708eb07c85870bd9cbfa3` |
| `docs/TASKLIST-listing-factory-active.md` | `2db50ff9f7f604a1624515f000634434d90c6e6bc450b2c2a5379ee6f52c172a` |
| `server/index.js` | `2f14e0366eaa4a220389d728b72635f8b518526c32c7f1b36a9e0ef0929e95a9` |
| `server/db.js` | `a6ec51cb4ba72b7739a62ee4fcffcfcb5d9f9709aa5cc8582d6d229564167901` |

Validation observed on 2026-09-08: official validator printed `VALID (31 nodes, 36 edges)`. Supplemental validation found **0 orphan nodes, 0 dangling edges, 29 real evidence files**, all five original question IDs, four dated resolved answers and one explicit open question, all six required document sections, and matching source fingerprints. These are mapping checks, not application or visual acceptance tests.

This map refreshes the first-pass audit stored at `/mnt/c/Agents/agentic-universe/repo/docs/audits/poster-studio/`; it does not modify that external copy. The provided validator is run directly with `-B` to avoid writing tool copies/bytecode outside the two requested artifacts.

Mapping-session outcome: two documentation artifacts only; no subagents used, no image/production/approval changes. Follow the single next move above only under a subsequent implementation instruction.
