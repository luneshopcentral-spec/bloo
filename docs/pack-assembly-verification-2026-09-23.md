# Pack assembly verification — 23 September 2026

## Behaviour

- Every case uses the dispensing form's warning-label dropdown. Only the labels chosen for each medicine appear on that medicine's assembly tray.
- Every case proceeds through dispensing, physical pack assembly, and patient consultation. The assembly bench offers the exact product plus lookalike choices, six carton views, an outer bag, a dispensing label, and the selected warning labels. Two-medicine prescriptions require two separately checked packs.
- Server grading checks the product, label positions, and that the placed warnings match the dispensing choices. The outer bag provides enough clear space for cases with several warnings.
- Report a problem now sits in the simulator title bar instead of covering the lower action buttons.
- The carton viewer keeps one six-face object mounted and rotates it between views. The selected face settles square to the screen for precise label placement; the outer bag opens as a separate surface. Reduced-motion settings switch views immediately.

## Verification

- `npx tsc --noEmit`, `npm run lint`, `npx vitest run`: 368 tests passed.
- `npm run build`: production build passed.
- Browser: Case 1 dropdown choices appeared on the assembly tray, with main and warning labels placed on separate views. Case 13 completed both pack benches. Cases 2–12 each advanced through assembly to consultation with their own products and selected warning trays. The guided Case 1 dropdown step advanced, and the report dialog opened and closed without blocking bench actions.
- A local grading fixture checked completed submissions for all 13 cases. Browser exercises used a synthetic student session and did not submit or save attempts.
- After the viewer refinement, browser checks covered all six face turns, label persistence across turns, selecting a warning before switching to the bag, and completing Case 1 and both packs in Case 13. The viewer and controls were visually checked at laptop widths of 1280 and 1366 pixels.

This verifies software behaviour, not clinical approval of case content or physical label dimensions. The outer bag is a simulated label surface; pharmacy placement rules and case answers still need professional review before treating the exercises as clinical instruction.
