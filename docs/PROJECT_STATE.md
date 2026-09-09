# poster-studio — Project State

Format: Agentic Universe project graph v1 · Graph: `knowledge/graph/poster-studio_project_graph.json` · Date: 2026-09-09

Expansion evidence-base commit: `e500b2bd73b8c21aba515c0781eeb06ae546f6e3` · Branch: `codex/backup-current-state-20260501`

Expanded mapping-content commit: `14f96a06417a2e40dcba46c7281535a58890905f` (both artifacts). Previous compact-map content commit: `ccecfef2470acc37296e828dc30290c02355bc53`. This header is finalized by a metadata-only follow-up; use `git log -1 --format=%H -- docs/PROJECT_STATE.md` for its delivery revision.

Validate from the repository root: `python tools/knowledge_graph.py validate` (this WSL has only `python3`, so use `python3 -B tools/knowledge_graph.py validate`). The mapping-only local validator checks node/edge vocabulary, evidence file/commit existence, duplicate relations, confidence, orphans and dangling endpoints. This increment explicitly extends the earlier scaffold vocabulary with `refines` and optional `verification_state`; the old scaffold is not the validator for this increment.

Read this document and the graph first in a cold session. They supersede dated handovers as the map of current work, not as authority over VPS data. Historical evidence is preserved, not deleted. This increment changes the graph, this document and a mapping-only validator; no application repair, regeneration, synchronization, deployment, service restart or credential inspection is included.

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

### Expanded coverage and authority boundaries — 2026-09-09

The owner explicitly removed the earlier 15–40-node limit: **workflow coverage now takes priority over that size bound**. The expanded graph includes 80 nodes / 105 edges. Every node still needs real evidence and every edge must connect existing nodes. This expansion reads offline factory/harness code as well as repository code; it does not run stages, cleaning, rendering, review writers, order jobs or API operations.

There are **three separate systems**, not one pipeline:

| System | Authoritative state | Entry points and boundaries |
| --- | --- | --- |
| Customer application and orders | Existing templates, saved designs, orders and operational data on the **VPS** | React editor → design/template API → Etsy order intake/recovery → size confirmation/render queue → download/email or guarded print fulfillment |
| New-listing factory | Candidate manifest/history for local stage work; human font/template/draft decisions; VPS for existing catalog/template data | Competitor source → extraction/font confirmation → approved new template/catalog integration → scenes/design variants → reviewed draft → human publication |
| Existing-image recovery | Exact archived Etsy ranks plus original user feedback and byte-specific approvals; VPS for existing design layers | Freeze rank mapping → clean **blank** backgrounds → native A4 design exports → composition → critique/full-size review → approved release package → separately authorized image replacement |

Folder stage, a draft ID, an image sidecar, the local SQLite copy and a review badge each describe different things. None can substitute for another.

Offline external code locations (plain Windows paths; each graph citation retains its exact filesystem evidence path):

- Factory: `C:\Agents\hermes-local\listing-factory\`
- Shared mockup tools: `C:\Agents\hermes-local\mockup_harness\bin\`
- Existing original-image archive: `C:\Agents\hermes-local\etsy-active-archive-20260831\`
- Candidate/review artifact area: `C:\Agents\hermes-local\etsy-active-images-20260831\`
- Profile source referenced by adapters: `C:\Agents\hermes-local\mockup_harness\config\mockup_profiles_verified_subset.json`

The factory README is a useful index but contains stale claims: manual-only sourcing is contradicted by `factory-source-competitor.mjs`; its two coarse folder gates do not express all four later human checkpoints in `AGENT_CONTRACT.md`; its “published” stage does not prove publication. The source runner is 430 lines and has **no daemon loop**. This resolves the runner's architecture, not whether some external scheduler is currently invoking it.

### Complete new-listing workflow

**Required flow:** N0 source → N1 extraction → N2 font choice → N3 app template approval → N4 catalog/size integration → N5–N12 design/scene/copy/media preparation → N13 reviewed Etsy draft → N14 human publication → N15 optional derivatives.

N5 design variation and N6–N9 scene preparation are separate branches that meet at N10 composition. Copy and video are supporting branches, not proof the image branch passed.

The table maps required work to actual mechanisms. “Implemented” means source inspected, not freshly executed or visually approved. Factory code under `server/scripts/` is mostly local-only; `run_stage.py` and shared harness code live outside this repository.

| Step / graph node | Inputs → outputs | Actual mechanism / gate / limitation |
| --- | --- | --- |
| N0 · `ps__source_competitor` | Listing reference + product line/occasion → downloaded ranked references, research data, candidate manifest and `source.png` | `factory-source-competitor.mjs` calls `researchListing`, seeds `competitor_images/`, refuses zero downloads. `source.png` is a byte copy and may actually be JPEG. This script exists separately from the runner's manual source prerequisite. No competitor API was queried in this map. |
| N1 · `ps__extraction` | Source photograph → `template.svg`, `template_manifest.json`, `font_guesses.json` | External runner stage001 invokes Claude/Sonnet with timeout; stage002 checks file presence, not visual accuracy. Geometry schema covers page, mask, pin and ordered text roles in mm. Guesses remain guesses. |
| N2 · `ps__font_resolution`, `ps__font_confirmation` | Source lettering crop + candidate font files → human-selected font(s) | Resolver produces actual font files for comparison on the **actual design text**. Contract gate1 is an explicit human choice. Commercial-acquisition flags are an additional shipping constraint; anonymized names do not confer rights. No font files or private answer keys were changed/read for this map. |
| Supporting · `ps__font_corpus` | Resolved corpus → blind specimens / role-named fonts and separate private labels | Factory README documents these identification/evaluation tools. They do not replace font confirmation or prove licensing; not a mandatory fresh corpus rebuild for each listing. |
| N3 · `ps__template_import`, `ps__template_review` | Confirmed extraction/font → **new local** template/group and app-rendered proof → human template approval | `factory-normalize-extraction.cjs` and `factory-create-template.cjs` translate into application fields. Natural-flow offsets are not absolute mm positions; this is a visual tuning boundary. Contract gate2 requires actual app proof. Never use this new-template importer to overwrite an existing VPS design during repair. |
| N4 · `ps__catalog_expansion`, `ps__catalog_parity` | Approved new design → correct family/standalone choice, 12 sizes, card assets, links/order | Expansion script creates an **inactive standalone** listing despite “publish” in its name. Family-link script instead adds a promoted sibling with the complete roster. loc001's standalone choice was historically corrected to street-map Design004. Thumbnail helper writes PNG and AVIF; parity checks matter. `sync-listing-state.cjs` is **mutating**, not a harmless audit. VPS promotion requires separate explicit scope and preserved originals. |
| N5 · `ps__variant_stories` | Approved design + independent examples → story states and design PNGs | Legacy `factory-render-variants.mjs` reads local DB and uses local `/render`. Do not call it VPS-grounded/native-button evidence. Required current design generation preserves confirmed layout and uses the agreed standard A4 PNG workflow. Names, romance wording, dates and geography vary deliberately; room variety is checked separately. |
| N6 · `ps__prompt_map` | Each reference image → individual analysis, original prompt, output directory and QA record | `competitor_prompt_map.json` covers every captured reference exactly once. Validator enforces unique filenames/ranks/prompts and basic structure. The spec forbids submitting competitor artwork/text/branding to Flow. A QA dictionary is not a visual pass. |
| N7 · `ps__flow_scene`, `ps__agy_generation_role` | Distinct prompt → native white room/frame image → matching green calibration | `flow_fresh_generate_mockup.py` drives AdsPower/Playwright separately. Expected native 16:9/2K output is retained. An AGY/pmux adapter can request a green edit; an existing green edit bypasses generation. **The stage004 handler does not run this complete scene branch.** |
| N8 · `ps__synthid_engine` | Raw white/green scene assets → separately cleaned assets and per-file detector sidecars | Wrapper's `flow-raw` mode accepts raw aspect; record actual input stage. Default is still historical `final`, so implicit defaults are unsafe for new work. Cleaning never touches the original or the completed design layer. Detector/model health is not established by this map. |
| N9 · `ps__reusable_geometry` | Clean white/green pair + raw quad → centered clean 4:3 files, remeasured quad/mask/overlay and scene manifest | `build_reusable_mockup.py` rejects clipped openings/badge-zone violations. Actual script also requires a design and composites in white-background mode; despite its docstring it is not a generic optional/dark-frame build-only adapter. Detector JSON is optional and not itself enforced as all-clear here. |
| N10 · `ps__composition_core` | Verified design PNG + exact clean base/quad/mask → ranked candidate JPEG and evidence | Shared harness performs perspective warp, profile-specific bleed/masks/blending and optional design badge. The **design number is not the story-image rank**. Historical loc001 “Design1–20” labels were wrong for 20 stories of Design004. Geometry and dark edges need full-size inspection, not generic inset assumptions. |
| N11 · `ps__seo_copy` | Product facts + independent copy brief + customer destination → `listing_copy.json` | Copy generator contains title/tag-length, tag-count and anti-copy checks; draft writer prefers saved copy but can fall back. Code limits are not a live Etsy-policy verification. Correct `/go/`/listing family and personalization semantics must be checked. |
| N12 · `ps__listing_video` | Reviewed source assets → optional local ffmpeg or Flow video | ffmpeg still-image motion and Flow browser generation are different paths. Historical correction requires blank-frame AI-video inputs to protect lettering. The current Flow script's default prompt still mentions preserving poster text; this must not override the blank-frame requirement. Video dimensions/duration and visual design integrity are separate checks. |
| N13 · `ps__etsy_draft_writer` | Correct links/copy/attributes/personalization + ordered accepted image set → draft ID and upload records | Stage005 calls the draft CLI and reloads its written manifest. CLI has dry-run and recorded-ID duplicate refusal; partial upload is manual recovery. It can fall back to `preview.png`; this is explicitly draft-quality, not a complete gallery. Image review/approval is not enforced merely by a successful call. |
| N14 · `ps__publish_gate` | Human-reviewed draft → human publication with authoritative evidence | Contract gate4: human publishes. Stage006 **does not publish or verify publication**; it only checks a draft ID and moves toward stage007. Do not treat that success string as a live fact. |
| N15 · `ps__pinterest_derivatives` | Published listing URL + source imagery → 1000×1500 derivatives and `pin_manifest.json` | Stage007 invokes `pinterest_export.py`; it creates local assets, never posts Pins. URL presence is not publication verification. |

**Four human checkpoints remain distinct:** font choice → template approval → mockup/copy/draft review → human publication. On rejection return to the stage owning the defect. The folder queue's `003-approved` is not sufficient evidence that all earlier decisions happened.

**Actual stage004 automation is narrower:** optional prompt-map validation (only if `source.reference_dir` is present) → template import → app preview → mutating catalog sync → advance to005. It does not automatically perform the full N5–N12 branch. That gap is explicitly `ps__bug_factory_gates`, not hidden behind “pipeline implemented.” A handled stage failure can still leave the CLI with exit0; a subprocess exception can bypass the ordinary failure-history path. Inspect history and actual artifacts, not exit status alone.

Video upload is another separate call: `factory-upload-etsy-video.mjs` uploads without changing listing state and can skip local revalidation when ffprobe is absent. No uploader execution is authorized here; a generated clip is not an uploaded, validated draft video.

**AGY orchestration is mapped by role, not assumed unavailable or all-powerful:**

- Historical new-scene/calibration adapter: pmux prompt, stable output-file wait, then green-mask detector; caller must establish correct worker identity/model.
- Extraction in the inspected runner: Claude CLI, not AGY.
- Existing-image independent critique: exact pair, read-only worker, acceptance/evidence/self-audit checkpoints under `docs/AGY_LISTING_IMAGE_CRITIQUE_CONTRACT.md`.
- A generated file, pane name or report heading cannot establish critique success. Earlier failed dispatches remain failures. No worker was launched in this mapping pass.

### Complete existing-listing image cleaning and rerendering workflow

**Current required flow:** R0 archive → R1 feedback/protected ranks → R2 exact mapping → R3 clean blank bases → R4 verify base/geometry → R5 temporary design variants → R6 native A4 export → R7 compose → R8 critique → R9 full-size/user review → R10 approved release manifest → R11 separately authorized anchor-safe replacement/readback.

The old “clean the finished JPEG” flow is preserved as **deprecated**, not a pending shortcut.

| Step / graph node | Inputs → outputs | Actual mechanism / gate / limitation |
| --- | --- | --- |
| R0 · `ps__repair_inventory` | Original listing ID/image IDs/ranks/bytes → immutable original archive and expected rank inventory | Dated cleanup document records counts totaling231. The physical-listing `archive-listings.js` has different default IDs and is not a substitute. No active Etsy inventory was refreshed here. |
| R1 · `ps__repair_feedback` | Chat/board comments and historical decisions → per-rank repair items and frozen approvals | Blank Needs Fix comments remain unresolved. Preserve 4560493743 approved01,03,04,07–14,16–20. SMBW01 is layout reference only. Stable imported issue/job records are still planned; current board versioning does not prove trustworthy migration. |
| R2 · `ps__repair_mapping` | Original/candidate rank + correct displayed design → exact template, clean-base name, profile/quad, defect classification | Dated replacement package and compositor mappings are pointers, not evidence every mapping is right. Related star listings show sibling designs; identify the actual rank's design. Unknown original/template/mockup mapping blocks that rank. |
| R3 · `ps__legacy_clean_bases`, `ps__synthid_engine` | **Blank** originals selected by verified profile → separate staging/clean root, sidecars and batch manifest | `prepare_clean_legacy_mockups.py` selects the documented canonical22 profile names and calls input-stage blank-mockup. Legacy aspect/sub-2K exceptions are explicit. Never feed finished text through VAE/SynthID. |
| R3 retry · `ps__synthid_retry` | Pending/nonverified blanks → bounded reprocessing with retained previous records | Wrapper can retry only unverified sidecars and rebuild all-input evidence. Current reuse uses sidecar status, not input/output hashes; changed inputs must not inherit an old pass. Separate roots avoid modifying original archive, but content-attested resume remains incomplete. |
| R4 · `ps__clean_base_gate`, `ps__reusable_geometry` | Clean image, manifest, matching geometry → accepted base/profile pair | Shared gate checks status, blank stage, dimensions, output paths/existence and exact profile coverage. Inspect actual clean geometry: cleaning may shift frame edges. New Flow-raw builder and legacy blank-manifest schemas differ; no silent interchange. Debug bypass flags are not final-listing paths. |
| R5 · `ps__variant_stories` | Read-only authoritative VPS A4 template + permitted story fields → temporary state and fingerprints | Keep source fonts, casing, positions, dimensions, map/star settings and hero constraints. Field semantics are design-family-specific: names top/romance bottom where specified; no repeated designs or copied customer data. Enumerate user-requested exceptions such as the inset-line removal. |
| R6 · `ps__native_export_contract`, `ps__map_visual_gate` | Temporary state + settled fonts/map → standard-button native PNG bytes and export evidence | Native Windows Chrome/Playwright and the ordinary PNG button are required. Existing route-reader script and diagnostic SVG/raster script are not proof of that. Verify map detail/coverage/zoom consistency, blue water with streets for colored variants and correct full stars before composing. Do not fake A4 through stretch/upscale. |
| R7 · `ps__dated_compositors`, `ps__composition_core` | Correct native PNG + clean mapped frame → new immutable candidate per rank | Existing broad/monochrome/SMBW adapters use dated fixed paths. Preserve approved outputs; replace incompatible frame under the existing user instruction instead of compressing artwork. Inspect dark blend and all four seams. Higher outer JPEG resolution does not imply distorted inner paper. |
| R8 · `ps__pair_critique` | Frozen original + candidate + design PNG + issue scope → genuine critique report | AGY gets one pair with bounded checkpoints and no mutation/approval authority. On failure record the missing independent review and use the authorized direct-review fallback; never invent an AGY pass. |
| R9 · `ps__fullsize_review` | Per-rank evidence + original/current full-size views → exact user decisions/comments/attachments | Visual checks cover product identity, names/fonts/casing/spacing, tiles/water, geometry, blending, stripes and variety. Contact sheets are not the approval UI. Replacement bytes require new review; gallery badge cannot inherit stale decisions. Existing board identity/modal/transaction bugs still block trustworthy signoff. |
| R10 · `ps__release_package`, `ps__repair_resume` | Complete coverage, resolved issues and exact image/gallery approvals → ranked release manifest and recoverable status | Proposed recovery PR3–5, not a proven implementation. Record template/story/exporter/base/profile/output hashes and stage checkpoints. Export failure must not become silently skipped coverage. WSL restart must preserve feedback and distinguish interrupted jobs from completed ones. |
| R11 · `ps__anchor_updater` | Separately authorized approved package + current authoritative Etsy state → replacement/readback evidence | Existing updater retains one old image, uploads replacement batch, deletes anchor, uploads final remainder and checks count/ranks. It does not create a listing or publish, but it **does mutate live images** and is not authorized by this mapping task. It does not itself check approval hashes; release authority must be established before invoking it. |

**Three inventories must not be conflated:** the231 archived finished listing images; the83 historical white mockups from the earlier broad cleanup; the22 profile-selected legacy blanks used by the later reusable-base preparation. The first two older status counts do not prove the third is clean today.

**Cleaning evidence is narrower than image quality.** The wrapper's `removed_verified` means its inspected local detector paths reported clear, not that lettering, image quality, source identity or frame fit passed. Current sidecars/clean gates lack content-attested immutability; `ps__bug_clean_attestation` records the gap. Its default input stage still being `final` is an especially important compatibility trap.

**Release rollback boundary:** archive originals and IDs before any separately approved replacement; anchor logic prevents an empty listing but is not an atomic rollback or a hash-based release authorization. Stop on upload/delete/count error. A failed or partial live replacement requires reconciliation against fresh authoritative remote state, never another blind batch.

### Customer application and order-service map

These are included so listing-generation work cannot accidentally cross into customer production operations.

| Boundary / graph nodes | Evidence-backed implementation | Separation from listing work |
| --- | --- | --- |
| Design editor/export · `webapp`, `svg_templates`, `street_maps` | React/Vite/Zustand, shared SVG star/text rendering, monochrome PBF vector path, MapLibre captures, physical print sizing and standard PNG button | Existing VPS design style/defaults are preserved; a local modification or health response is not a production visual regression pass. |
| Save/share/templates · `saved_design_api` | Save-design/token reads; template public reads and admin settings/sibling writes | Temporary design state and a production template are different records and authority scopes. |
| Catalog/entry links · `catalog_api` | Listing slugs, groups, membership/reordering and short-link services | Preserve family roster/positions and correct customer destination. New candidate folder is not a new live listing. |
| Paid-order intake · `order_intake` | Etsy polling/token extraction, deterministic personalization and optional LLM recovery | Customer order data stays on the VPS; never reuse buyer examples as listing variant source data. |
| Size enforcement · `order_size` | Purchased-size adaptation/confirmation, unit normalization and render enforcement | Do not alter real orders to obtain listing renders. |
| Render queue · `fulfillment` | SQLite queue claims/retries, renderer selection/resource guards, browser bridge and output validation | Order queue and factory queue are separate. Existing order state must not be changed during image repair. |
| Downloads/revisions · `download_revision` | Verification, signed-download route, status, confirm/edit/render endpoints | Customer-facing mutation/revision endpoints are not diagnostic playgrounds. |
| Physical print · `print_fulfillment` | Quote/profitability assessment, submit/release/fulfill code | Capability exists; current shop offerings and external orders remain unknown without authoritative access. Digital factory does not authorize print release. |
| Communication/analytics · `communications` | Lead capture, inbound messages/attachments, triage, provider/email webhooks and events | Contains sensitive customer data; excluded from this mapping pass and synthetic listing examples. |
| Admin/assets · `admin_assets_auth` | JWT/bcrypt admin handling, guarded asset writes and public font/CSS reads | Do not read credentials or mutate font/default assets to work around a listing render failure. |
| Tests/deploy · `test_surface`, `deployment_boundary` | Local Playwright preview/unit tests; distinct production checks and static/server deployment boundaries | Mapping validation is not product validation. Preserve unmanaged thumbnails/data and never deploy the dirty workspace as a mapping side effect. |

### Argument increment — 2026-09-09

Baseline: **80 nodes / 105 edges (1.3125 edges/node)**. This increment: **83 nodes / 186 edges (2.2410 edges/node)**; **+81 edges**, including **50 between original nodes**, with a ratio increase of **+0.9285 (+70.74%)**. All original 80 nodes and 105 edges are retained. Exactly three non-feature nodes were added: the failure mode, the run-receipt contract and the proposed ledger/gate port. No new stage or feature nodes.

Dependencies distinguish required workflow contracts from current enforcement: extraction/font confirmation, reviewed template/variants, clean blank/geometry/composition, draft/approval/publication, and original/candidate/review/release artifacts. They do not assert that the runner enforces those gates. Challenge edges connect missing stage004 orchestration, stage006's unsupported publication label, cleaning metadata and cached review identities to downstream claims. Six correction edges between existing nodes use `refines`; earlier nodes are preserved, not silently replaced.

**Named failure mode:** “a completion label is not evidence of completion — metadata checks do not read the artifact.” Agentic Universe's `tools/probe_substrate_adversarial.py:109` posts a fake done annotation while the authoritative task remains pending. Its `tools/gates.py:_evidence_basis` reports missing measurement as `None`, not a fabricated score. These are distinct demonstrations, not proof that AU already verifies Poster imagery. The new failure node challenges every mapped approval, cleaning and publication acceptance surface, including downstream releases/updates. A matching hash binds bytes; it still does not prove visual correctness.

**Factory receipt contract (unverified):** a proposed `candidate/receipts/<run-id>.json` must contain `run_id`, candidate and stage IDs, start/finish timestamps, executor/version, exit status, input hashes, outputs with path/byte count/SHA-256, check results and hash-bound approval references. Compute output hashes from files after execution; record failed/incomplete outcomes explicitly. Publication needs separately authorized remote readback, not a draft ID or a URL string. No receipt file is created by this mapping. The inspected external `run_stage.py` only writes timestamped `manifest.history` metadata; no conforming output-hash receipt emitter was found there. Absence across every other tool was not proven. No current job, output receipt or remote publication was verified.

**Concrete WOULD-CHANGE: port AU `tools/task_ledger.py` + `tools/gates.py`.** Source root: `/mnt/c/Agents/agentic-universe/repo/`. Reuse deterministic dependency scheduling, stale-claim recovery and audit records, plus evidence/release gates and their `tools/pheromone.py` dependency. Adapt tasks to listing/rank/candidate-hash identity and require actual run receipts. Close fragmented orchestration, stale approval identity, concurrent review updates, missing critique evidence, metadata-only cleaning, false publication and dropped resume work. These dependencies are explicit in the graph.

This is a proposed port, **not implemented integration**. AU's `Ledger.complete` trusts a caller-provided result reference; G4 trusts caller-supplied `computable_ok`. The adapters must independently read/hash artifacts, enforce review revisions, execute real checks and retain explicit owner approval. A validator quorum cannot replace that approval. Unknown evidence stays unknown. The review-board acceptance audit remains the first bounded implementation prerequisite, not permission for a new render batch.

**Validation scope:** local structural/evidence-reference checks only, not product tests, visual approval, remote state verification or receipt validation. The validator is a small stdlib project adaptation of AU's structural checks, not a copied application dependency. External evidence paths must exist on the auditing machine; this map still does not make the ignored/untracked source evidence reproducible from a clean clone. No VPS, credentials, images, review decisions or factory jobs were touched. The configured second-brain vault paths were unavailable on this machine; durable increment details are recorded here instead.

## The single highest-value next move

**Run an isolated acceptance audit of the existing review-board v2 and repair its failed identity/comment/transaction gates before another listing batch.** Concretely, fixtures must cover reopening an existing image comment, changed bytes with unchanged manifest metadata, concurrent edits, historical-approval migration and incomplete gallery coverage. The code findings above already identify failing mechanisms.

This is one bounded move, not authorization granted by this mapping pass. It beats another rendering batch or external-orchestrator integration because those would depend on review decisions that currently can be hidden, overwritten or associated with stale identity. After that gate, the documented first image pilot is 4528873697/02 against retained 01 and the authoritative VPS A4 template, using the standard PNG export. Do not skip directly to broad generation because an earlier ledger said PR1 was done.

## Hard constraints

- **VPS authority:** existing templates/defaults, orders and saved production data come from the VPS. Never “restore” them from local guesses. Existing customer design style is not a variable in listing repair.
- **Mapping scope:** no live-path or credential access; no production or Etsy mutation, DB sync, service restart or rendering. Only this document, its graph and the mapping-only validator may be staged for this increment; no application files.
- **Image recovery boundary:** temporary personalization must not overwrite production default templates, sibling settings or thumbnails. The user's standard PNG-button requirement is stricter than an automated render-route capture label. Do not change road weights/star density while preparing listings.
- **Geometry and quality:** retain A4 210:297 geometry, native exporter rounding, fonts and layout; do not resize low-DPI output into compliance or squeeze designs into incompatible frames. Inspect before/after at full size, including text, map coverage, variation, dark edges and measured perspective fit.
- **Clean-base only:** no VAE/SynthID on finished lettering. Use verified blank backgrounds plus exact archived rank/quad mapping; preserve original and rejected candidates.
- **User-only release:** no approval by AGY, contact sheet, hash, detector or badge. Preserve the 16 specified approved CSM images. No Etsy upload is authorized by the recovery or mapping status.
- **External artifacts:** native Windows browser, archived imagery, mockup profiles and AGY/Flow runtime are separate dependencies. Do not infer runtime health from dated paths or launch an unrelated Polybot worker. AGY failure permits documented direct-review fallback under the user's earlier instruction, never a fabricated independent pass.
- **Windows-facing paths:** use plain `C:\...` paths for drive artifacts, not `/mnt/c/...` links. Repository-only deliverables in this pass are identified by Git paths; no new Windows copy is created.
- **Unsafe sync:** `npm run prod:pull-state` currently points to raw SQLite file copy logic. Do not execute it assuming the August 30 snapshot repair made it WAL-safe.
- **Preserve the dirty tree:** no reset, wholesale staging, unrelated commit or deployment. Most local backend/recovery evidence will not accompany this two-file push.

## Open questions

All five first-pass IDs have scoped evidence dispositions. The factory question is now resolved as an evidence-contract question, with `verification_state: unverified`: neither a live job nor a conforming receipt has been observed. “Resolved” does not mean a service is running or a defect is fixed.

| Question node | Answer and evidence |
| --- | --- |
| `ps__q_factory_running` — resolved 2026-09-09, **runtime unverified** | The required observable is `ps__factory_run_receipt`, defined below. `run_stage.py:append_history` currently writes only `{stage,at,ok,note}` into `manifest.json.history`; it does not emit output hashes. No conforming receipt was confirmed. Current cron activity and Etsy state remain unknown. August 31's draft-with-20-images entry is historical, and the app order cron is separate. |
| `ps__q_synthid_wanted` — resolved 2026-09-08 | Yes, for blank backgrounds; not finished designs. `docs/MOCKUP_AND_LISTING_IMAGE_WORKFLOW.md:5` and incident handover authority rules. |
| `ps__q_relation_to_etsy_branches` — resolved 2026-09-08, repo side only | Available seam: candidate-directory draft CLI, documented external `run_stage.py` / `POSTER_STUDIO_ROOT`, existing app routes. No dedicated orchestrator adapter is wired in inspected package scripts/server route mounts. External branch operation remains unverified, not an end-to-end integration claim. `server/scripts/factory-create-etsy-draft.js:10`, `docs/HANDOVER-2026-08-30-flow-resume.md:35`, `package.json:6`, `server/index.js:123`. |
| `ps__q_prod_db_sync_reliable` — resolved 2026-09-08 | **No reliable scripted snapshot established.** The one-time VACUUM repair is documented, but `scripts/pull-production-state.sh:21` still copies the main DB directly. WAL is enabled in `server/db.js:15`. `sync-listing-state.cjs` mutates catalog membership/defaults; it is not a backup transfer. |
| `ps__q_next_listings` — resolved 2026-09-08 | Recover existing candidates, first proving review-board behavior, then a bounded SMBW /02 pilot. Design004's historical draft is not new user approval or the latest finished recovery. Evidence: incident handover, implementation plan PR1/PR4, board source, August 31 tasklist. |

Live status is intentionally unverified, not guessed to obtain five green flags. No additional live authority is needed to complete and deliver this mapping.

## What would make this wrong

1. **VPS drift:** current deployed renderer, settings, orders and Etsy state may differ from every local artifact. Only a separately scoped authoritative VPS/API investigation could settle that. We did not access live paths, DBs or credentials.
2. **Working-tree drift:** local source files, review manifests or reports may change after this audit. Re-check the cited symbols and hashes below before acting. Ignored/untracked sources may be absent in a fresh clone; their absence is not evidence the component never existed.
3. **Historical-record error:** earlier agents repeatedly overstated visual correctness and pipeline provenance. Counts/approvals here are attributed to the incident records, not re-certified. Original user feedback and exact historically reviewed bytes outrank narrative status and mutable board labels.
4. **External dependencies:** the configured second-brain vault index/file-map was absent during this session; no note could be read there. External factory/harness source was inspected on September 9, but factory/AGY runtime state and etsy-agentic-space wiring were not inspected as runtime systems.
5. **Validation limits:** the official validator checks graph vocabulary/structure, not real-world truth. The owner explicitly superseded the 15–40-node bound for full coverage on this expansion. Supplemental checks enforce complete fields, valid statuses, five question IDs, evidence-file/commit existence, no orphans and no dangling edges. They do not certify product quality.

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

Historical compact-map validation on 2026-09-08: official validator printed `VALID (31 nodes, 36 edges)`. Supplemental validation found **0 orphan nodes, 0 dangling edges, 29 real evidence files**, all five original question IDs, four dated resolved answers and one explicit open question, all six required document sections, and matching source fingerprints. These are mapping checks, not application or visual acceptance tests.

This map refreshes the first-pass audit stored at `/mnt/c/Agents/agentic-universe/repo/docs/audits/poster-studio/`; it does not modify that external copy. The provided validator is run directly with `-B` to avoid writing tool copies/bytecode outside the two requested artifacts.

Expanded-map validation on 2026-09-09: official validator prints **VALID (80 nodes, 105 edges)**. Supplemental checks verify zero orphans/dangling edges, all node evidence paths/commits, the five original question IDs (four scoped resolutions/one open), six required sections, and coverage of N0–N15 plus R0–R11. The former node ceiling is deliberately not enforced under the owner's expanded-scope instruction.

Additional external-source fingerprints, read on 2026-09-09 (paths are relative to the Windows roots listed above; source code only, not runtime credentials or approved images):

| External source | SHA-256 |
| --- | --- |
| Factory `run_stage.py` | `efaf09e2a81e8b7cea8411bb81da3c6a3ddb86e1185f3bae1981793b725560e2` |
| Factory `scripts/validate_competitor_prompt_map.py` | `df36add1f61504c6e97e331850c8c686a2cb3f42a015060611cc751808f6d8b9` |
| Harness `synthid_final_pass.py` | `2982ef62aac9e0d6738f6cc9aec1b341448b711ec2008fdfee448e5e8a609448` |
| Harness `prepare_clean_legacy_mockups.py` | `87842764df5de9b8a9981acd20ce97463b5560c50a79aaec98362bfc3ea982b9` |
| Harness `build_reusable_mockup.py` | `71ea987c797959bd023f83fc598fb324246f94467a1ce9ae0fd1cef56208f0ca` |
| Harness `etsy_mockup_pipeline_v3.py` | `3de5c0f7e2675f0abfcd6a881edc093830495f7924bcb735d86d07559117b804` |

Mapping-session outcome: two documentation artifacts only; no subagents used, no image/production/approval changes. Follow the single next move above only under a subsequent implementation instruction.
