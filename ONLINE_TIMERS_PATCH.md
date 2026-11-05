# Online timers and interface patch

Apply these files over the build with the combined debug/mobile audit patch. Preserve paths and include every file. Restart the Studio development server after importing backend changes.

- Free Parking: Bank (FREE) stays enabled at zero actions. Once per turn; no property banking.
- Smaller screens: opponent name, token, bank button and hand-count header shrink first to preserve property-card space.
- PC online: Hide cards button on the left conceals the hand, selected-card name/actions and preview. Show cards restores them. This is local screen privacy, not an online permission change.
- Played area: top-right Moves badge shows remaining/maximum actions, including Corporate Headquarters. Free actions do not consume moves.
- Online turn: 60 seconds, or 120 seconds for an empty-hand start-of-turn refill (5 cards, or 7 with Private Vault). Normal Investment Office draws do not extend the clock. Setup remains simultaneous and untimed.
- Turn time pauses for reactions, payments, the separate discard phase and the cooperation window.
- Turn timeout: pass without unused-action draws. If excess cards remain, a separate 30-second discard window opens.
- Online payment: 15 seconds per payer; on expiry randomly choose eligible bank cards first, then field assets if needed. Properties-only payments still exclude the bank. Each simultaneous payer retains their own deadline.
- Online discard: 30 seconds; randomly discard only excess hand cards on expiry.
- Host Pause/Resume freezes turn, payment, discard, reaction and cooperation clocks, and bot play. Chat, board inspection and exit remain available. Only the host can resume. Pause remains reachable while a payment/reaction prompt is open.
- Reconnecting uses server-owned clocks and retains the time remaining.
- Tough Luck: recipient sees a result prompt with artwork of received cards, or a no-matching-cards message. Other uninvolved players receive no private artwork.

## Validation
TypeScript check, production build, existing npm test rules/online suites (including 30 bot matches), React runtime/dev checks, new online timer regressions and a live server expiration callback passed. Actual local Chromium checks passed for zero-AP free banking, hide/show, move count, paused turn/payment clocks, Tough Luck results and controls fitting 568x320. No page errors observed. Physical phones, iOS Safari and the deployed Studio environment were not tested.

Optional regression: node test-online-timers.cjs
