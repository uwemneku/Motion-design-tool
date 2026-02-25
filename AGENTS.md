# Coding Rules

## Formatting

- Use TypeScript strict mode patterns.
- Prefer double quotes.
- Use trailing commas where valid.
- Max line length: 100.
- Use semicolons.
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
- Prefer project store hooks (`useAppSelector`, `useAppDispatch`) over raw Redux hooks where available.

## Safety

- Do not use `any` unless unavoidable; add a comment when used.
- Avoid non-null assertions (`!`) unless necessary.

## Canvas/Fabric Patterns

- Fabric canvas instance ownership should live in `CanvasAppContext`.
- Prefer consuming Fabric refs from context (`useCanvasAppContext`) instead of prop-drilling canvas refs through multiple layers.
- Split large canvas logic into focused modules (for example, `hooks/util.ts`, `util/video-guide.ts`) and keep each file scoped.
- Use non-interactive Fabric guide/overlay objects (`selectable: false`, `evented: false`) for visual helpers.

## Export Conventions

- Default exports are allowed for React components and hooks when they improve local usage consistency in this project.
