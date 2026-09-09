# Poster Studio Test Suite Continuation

This repo already has a large Playwright estate, but it is not a good default gate for iterative work:

- `npx playwright test` currently expands to hundreds of tests with heavy overlap.
- Most browser coverage is mock-only and desktop-only.
- Helper logic is duplicated across many files.
- Failures can come from missing mocks rather than product regressions.

Use the continuation suite below as the default path for ongoing work.

## Recommended layers

1. `npm run test:unit`
   Fast logic checks. Currently covers `src/utils/applyTemplate.ts`.

2. `npm run test:continue`
   Small Playwright smoke suite with desktop and mobile coverage.
   Focuses on:
   - designer startup
   - listing switching
   - poster mode toggles
   - share-link roundtrip
   - verify flow
   - admin order detail notes/timeline

3. `npm run test:continue:update`
   Re-baselines the continuation visual snapshots only.

4. Targeted legacy runs when needed
   Example: `npx playwright test tests/listing-system.test.ts`

## Browser-use visual pass

Use `browser-use` for a manual visual audit after significant UI changes:

```bash
browser-use close --all
browser-use open http://127.0.0.1:4174
browser-use state
browser-use screenshot /tmp/poster-studio-home.png
browser-use click <index>
browser-use screenshot /tmp/poster-studio-next.png
```

Recommended manual checkpoints:

1. `/`
   Confirm the designer is visible, not stuck behind `Loading design...`.

2. `/verify`
   Confirm the form is visible without overflow on desktop and mobile widths.

3. `/admin/dashboard`
   Confirm cards render with real spacing and no broken layout.

4. `/l/star-map-night-we-met`
   Confirm the design picker and active size state are visible.

## Known limits

- Local preview without a working API will leave the public designer in a loading state.
- The legacy suite still contains useful scenarios, but it should be treated as a targeted regression catalog, not the default day-to-day gate.
- If `OrderDetailPage` grows new API calls, add them to `tests/fixtures/mockApi.ts` immediately or the mocked admin tests will hang behind the spinner.
