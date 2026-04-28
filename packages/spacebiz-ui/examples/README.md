# Examples

Three minimal standalone Vite apps that consume `@spacebiz/ui`. Each example
lives in its own folder with its own `package.json`, `vite.config.ts`,
`index.html`, and `main.ts`.

To run an example:

```bash
cd examples/01-hello-button
npm install
npm run dev
```

Then open the URL Vite prints (typically `http://localhost:5173/`).

## Structure

Each example follows the same shape:

- `index.html` — single `<div id="game">` and a `<script type="module" src="./main.ts">`.
- `main.ts` — boots a `Phaser.Game` with a single scene.
- `package.json` — depends on `phaser` and `@spacebiz/ui` (workspace link
  inside this monorepo; `latest` when published).
- `vite.config.ts` — minimal Vite config; the `@spacebiz/ui` import resolves
  through node_modules normally.

## Examples

- **01-hello-button** — renders a single Button.
- **02-modal-dialog** — opens a Modal containing two Buttons.
- **03-data-table** — renders a DataTable populated with sample rows.
