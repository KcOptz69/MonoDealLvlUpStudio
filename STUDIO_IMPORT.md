# Import this complete project

Extract this ZIP and use its contents as the project root. Keep public/artwork, src, package.json, package-lock.json, vite.config.ts and the backend modules together. Do not nest the files inside another project folder.

Run npm ci, then npm run dev. Development uses Vite with the existing Node room API plugin. Production uses npm run build followed by npm start.

Instruction to Studio:
> Use this complete source project. Run npm ci and npm run dev. Preserve all approved binary card artwork in public/artwork and direct mappings in src/cardArt.ts. Preserve our game rules, React UI, music module and Node online-room API. Do not regenerate cards or convert the engine back to a browser CommonJS import. The frontend imports src/engine.ts; the backend uses engine.js/engine.cjs. Do not remove the lobby/music changes.

For Cloud Run use the included Dockerfile, a single instance, request timeout 3600 seconds and concurrency sufficient for all players. Rooms are in memory and do not survive a server restart.
