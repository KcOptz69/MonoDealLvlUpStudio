# Mobile layout audit

Audited the latest approved source, including the debugging fixes and combined swipe/Arrange patch. This download contains affected files only.

## Fixes

1. **Payment artwork on short screens:** selection cards could be taller than the visible payment list. The modal now has a definite viewport height and the artwork scales to the available list area. Payment controls remain separate from scrolling content. Accessible card names, values and selection states are retained.
2. **Expansion confirmation:** a large field and irrelevant special properties pushed the Attach control out of view. The selector now scrolls its field independently, keeps confirmation visible, hides the ineligible special-property row, and provides a compact Bank button.
3. **Field inspection controls:** scrolling a large opponent field could move its close control away. The field content now scrolls inside a stationary inspection frame. The artwork-only preview's close button also fits inside short landscape viewports.
4. **Payment Restore layering:** the restore tab could sit behind an inspected card or bank. It now stays above inspection layers; returning to payment dismisses the card inspection.
5. **Turn notices over open panels:** notices could obscure an open hand, field or prompt. Mobile notices stay hidden while those inspection/control overlays are open.

Additional polish: aligned horizontal field gestures with the swipe handler and added safe-area spacing for the home indicator/notch. Explicit Move properties dragging remains available. Desktop behavior remains scoped out of the mobile styles.

## Browser verification

Used a separate local Chromium 153 browser with mobile/touch emulation, not the cloud browser.

- Landscape viewports: **568×320, 667×375, 844×390, 1024×768**.
- **48 exploratory screen states:** payment with/without IOU, reaction, jail, Chance, discard, victory, Expansion selection, your field, unused-action prompt, Debt Collector targeting and Forced Deal selection.
- **16 interaction scenarios** across the four sizes: actual touch swipes in hand/mini-field/full field, payment restore above field-card artwork, visible close/confirmation controls, Expansion selection and bank access, tap-to-arrange and optional property dragging, portrait rotation block and landscape recovery.
- Separate local online check: live cooperation countdown, two-human Skip votes and synchronized dismissal, unread chat badge, receiving/sending messages, and a 568×220 reduced-height chat panel.
- No page exceptions in the completed browser checks.
- TypeScript, production build, local component rendering, Vite/API, input routing, swipe-handler and Arrange checks passed.

Stress fixtures included long names, an 18-card hand, seven property colors, eight special properties and 15 bank cards. Off-screen cards in intentional scroll regions are expected.

## Optional regression harness

`node test-mobile-layout-browser.cjs` requires Playwright and Chromium available in the testing environment. `CHROMIUM_PATH` can select an installed browser and `CHROMIUM_ARGS` can provide a JSON array of launch arguments. These are optional testing tools, not game runtime dependencies.

## Limits

Physical phones, iOS Safari and the deployed Google AI Studio instance were not exercised. Reduced-height chat testing is viewport emulation, not a physical software-keyboard test. Safe-area padding uses the platform's CSS environment values.
