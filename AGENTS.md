# Coding Rules

## Formatting

- Use TypeScript strict mode patterns.
- Prefer double quotes.
- Use trailing commas where valid.
- Max line length: 100.
- Use semicolons.
- Use Prettier as the source of truth for formatting. Run `npm run format` to write formatting changes and `npm run format:check` to verify them.
- Always comment functions with concise purpose/behavior notes.

## React

- Use function components + hooks only.
- Move business logic to hooks in `src/app/features/**`.
- Keep UI components lean; extract non-UI logic to hooks/util files.
- Side-effect-only hooks can be mounted via a small component that returns `null` (for example, seek/update hooks).

## Styling

- Tailwind utility classes only.
- No new plain CSS files unless explicitly approved.

## Imports

- Group imports: external, internal, relative.
- Keep imports sorted alphabetically inside groups.
- Always use project store hooks (`useAppSelector`, `useAppDispatch`) instead of raw Redux hooks.

## UI Testing

- Use Playwright for Chromium-based UI and visual testing.
- Run `npm run test:ui` for the default Chromium suite.
- Run `npm run test:ui:visual` to capture design review screenshots for the editor.
- Run `npm run test:ui:headed` when you need to watch the browser while iterating on UI.
- Run `npm run test:ui:update` only when intentionally accepting new visual baselines.
- Visual screenshots are emitted under `test-results/playwright/**`; review those images before making UI follow-up changes.
- When working on layout or styling, prefer this loop: run visual test, inspect screenshots, adjust UI, rerun.

## Safety

- Do not use `any` unless unavoidable; add a comment when used.
- Avoid non-null assertions (`!`) unless necessary.
- Derive related types from source-of-truth types instead of duplicating unions by hand. For example, derive keyframe-field unions from `AnimatableProperties` rather than re-listing the same property names.

## Canvas/Fabric Patterns

- Fabric canvas instance ownership should live in `CanvasAppContext`.
- Prefer consuming Fabric refs from context (`useCanvasAppContext`) instead of prop-drilling canvas refs through multiple layers.
- Split large canvas logic into focused modules (for example, `hooks/util.ts`, `util/video-guide.ts`) and keep each file scoped.
- Use non-interactive Fabric guide/overlay objects (`selectable: false`, `evented: false`) for visual helpers.

## Export Conventions

- Default exports are allowed for React components and hooks when they improve local usage consistency in this project.
