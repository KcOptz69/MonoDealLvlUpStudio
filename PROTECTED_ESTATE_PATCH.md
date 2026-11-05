# Protected Estate and End Turn

Apply over the Payment and Wild Refresh patch. Replace all included paths and restart the Studio development server for engine/server changes. This is an affected-files patch, not a complete standalone game.

## Rules
- End Turn blinks red when no action points remain and the button is enabled. Reduced-motion settings use a steady red highlight.
- After voluntarily ending a normal turn from round 10 onward, if your bank holds at least 20M and you have not purchased Protected Estate, choose Buy or Pass before the turn advances. Any excess-hand discard is resolved first.
- One Protected Estate per player per game. Declining preserves the ability to buy on a later eligible turn.
- Bank cards only. Spend a minimum-value combination covering 20M; exact payment is preferred and overpayments receive no change. The prompt shows the cards and total before purchase. Spent bank cards enter the discard pile.
- The 0M card counts as one separate complete set toward defense, so two regular color sets plus Protected Estate meet the three-set condition. Standard defending timing still applies.
- It cannot be stolen, exchanged, moved, recolored, evicted or used as payment, and cannot receive buildings. Its 0M value adds nothing to round-limit scoring. It remains visible on the owner's field and in opponent inspection.
- It is a purchased field card, never shuffled into the draw deck. The initial 150-card deck and the 10-wild-per-refresh rule remain.
- Complete-set taxes count it as a full set; Empire Rent counts it as one property. It has no separate color-rent schedule.
- Online purchase choices use the remaining turn clock. Timeout passes without purchasing, and host pause freezes the clock. Reconnect preserves the prompt and ownership.
- The Extra Rules tab now includes Protected Estate and the deck-refresh rule, with card illustrations.

## Validation
TypeScript and production build passed. The 30 existing bot matches completed, and focused online, startup, artwork, React runtime/dev, payment, privacy, targeting and rules regressions passed. Dedicated Protected Estate tests cover round/bank gates, one-per-player ownership, bank-only spending, theft/transfer/payment immunity, defense, hand-limit ordering, score value, timeout and online reconnect/seat authorization.

Actual local Chromium checks passed on 1440x800 desktop and 568x320 mobile layout: red blink, 20M purchase prompt and artwork, visible purchase controls, spending, protected field display, 3/3 set count and new rules. Physical phones/iOS Safari and deployed Google Studio were not tested.

Optional test: node test-protected-estate.cjs
