# Payment selection and deck refresh

Apply over the Online Timers / Free Parking / UI patch. Include all files and preserve paths; restart the Studio dev server for the backend engine update.

Payment selections no longer reset when another simultaneous payer resolves first. Paying may break a full set; the warning explicitly says this is allowed. Normal payment value requirements still apply; 0M all-color and Expansion wilds cannot pay bills.

Each time an empty draw pile is replenished from the discard pile, create 10 extra standard all-color Property Wilds (multicolor_wildcard), each 0M with a unique ID. Shuffle them together with the recycled cards. Repeat on every later refresh. These are regular movable all-color wilds, not Expansion Properties. The initial deck remains 150 cards. No cards are created if both draw and discard piles are empty.

Verified: TypeScript check, production build, existing npm test suite including 30 bot matches, dedicated payment/reshuffle regressions, and an actual local Chromium reproduction. The browser test confirmed the selection previously cleared after another payer finished, now stays selected, and permits payment from a complete set.

Optional regression: node test-payment-refresh.cjs
