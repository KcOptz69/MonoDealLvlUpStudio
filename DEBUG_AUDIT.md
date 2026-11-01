# Monopoly Deal Lvl. Up — Debug audit

Audited the latest approved local source, including the mobile swipe, Arrange, smarter-bot and cooperation changes. This patch contains affected files only.

## Confirmed and fixed

| Bug | Reproduction and impact | Fix |
| --- | --- | --- |
| Failed global Just Say No changes the reaction queue | Attempt No against an all-player action without a No card. The method previously removed responders and changed the pending effect before throwing. | Validate the response and available card before modifying any shared reaction state. |
| Invalid I Owe You alters simultaneous payments | Offer a missing IOU while several players owe payment. The method previously moved the other debts into the queue before checking that the card exists. | Validate the payer, bill and IOU first, then change the payment queue. |
| Late Just Say No can bypass the deadline | Submit No after its deadline but before the timeout callback runs. The method previously consumed the card and accepted the late response. | Reject expired No responses without changing state. Allow/timeout resolution still works. IOU reactions also get their deadline immediately. |
| Rezoned Expansion Property cannot be rearranged | Rezone an Expansion to a supported new color, then move it into another existing set of that locked color. Its old expansionColor previously caused a false rejection. | Keep expansionColor synchronized with the permanent lock, and recognize locked colors in move validation, including older saves. |

All four cases failed against the pre-fix engine and pass after repair. The rejected all-player response test also verifies that the original action can continue normally.

## Verification

- TypeScript check and production build passed.
- Existing rule, HTTP/SSE room, reconnect, simultaneous-response/payment, artwork, cooperation, bot-pacing and motion suites passed.
- Existing 30 seeded bot simulations passed.
- 80 additional seeded matches completed: 16,192 actions. After every action, checks verified card conservation, unique card/group IDs, property colors and locks, Expansion ownership/support, building legality and defense consistency. Bot previews remained read-only.
- Local component render, Vite import/API, input routing, Arrange, mobile swipe, field scrolling and animation/privacy checks passed.

## Running the checks

- `npm test` includes the four new regressions.
- `npm run test:stress` runs the additional 80-match invariant audit.

## Scope

Actual Google AI Studio deployment and physical mobile-device interactions were not exercised. The visual/input checks used local component, handler and dev-server tests. The stress matches exercise the rules engine directly; separate room tests cover online scheduling and cooperation.
