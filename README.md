# Monopoly Deal Lvl. Up — made by Kaze

Complete Google AI Studio project, version 2.8.0. Includes the approved card artwork and lobby/music updates. No previous patches are required.

## Run

Use Node 20 or newer. In the project root:

```
npm ci
npm run dev
```

The Vite development server runs on port 3000 by default. For a production build:

```
npm run build
npm start
```

The production server uses PORT or 3000. The ZIP also contains prebuilt dist files. Docker builds fresh and runs on port 8080.

## Included updates

- Online lobby opens first, with five slots, bots, readiness checks and room codes.
- Copy invite link; links prefill the room code. Tokens are never put into invite links.
- Leaving a lobby frees the seat; if the host leaves, another human becomes host.
- In-game Exit keeps the seat and cards reserved. The same browser automatically reconnects on reopening; the lobby also has a reconnect button. Do not clear the browser's saved data.
- Playing, Paying, Responding, Discarding, Defending and disconnected statuses.
- Original procedural music for the menu/lobby, gameplay and defending phase. Music begins after a tap/click and has a saved mute setting. Defending music starts whenever any player is defending three sets.
- Approved artwork lives in public/artwork. Do not replace it with generated SVG cards. src/cardArt.ts uses direct image paths. Both Vite and the production server serve these images.

Rooms live in server memory. Restarting/redeploying the server clears matches. Use one server instance for personal online play; multi-instance shared storage is not implemented.

## Checks

```
npm run check
npm test
npm run test:dev
```

Checks cover 42 rule tests, 30 complete bot simulations, online HTTP/SSE, readiness/bot slots, startup, artwork endpoints, lobby leave/host transfer, preserved reconnect seats and React development modules. Actual Google AI Studio import still needs verification in your workspace.
