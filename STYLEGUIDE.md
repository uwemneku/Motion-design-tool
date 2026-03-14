# Project Style Guide

This guide adapts current official recommendations to this codebase:

- React rendering and Hook purity
- Redux Toolkit state-management rules
- TypeScript ESLint shared configs
- Tailwind utility-first styling
- Playwright user-visible testing

It is intentionally project-specific. When this guide conflicts with generic style preferences, follow this guide.

## Source Principles

- React: keep render pure, move side effects outside render, and avoid mutating values created outside the current render.
- Redux: do not mutate state outside reducers, keep reducers side-effect free, avoid non-serializable values in store state, and prefer Redux Toolkit patterns.
- TypeScript ESLint: use recommended correctness rules first; add stylistic rules only where they improve consistency without creating churn.
- Tailwind: build UI from utility classes in markup instead of introducing new custom CSS by default.
- Playwright: test user-visible behavior, prefer resilient locators, and avoid implementation-detail assertions.

## TypeScript

- Prefer explicit, derived types over duplicated unions or hand-maintained mirrors.
- Keep function control flow linear and easy to scan.
- Use discriminated or narrow unions instead of `any`.
- Avoid non-null assertions unless there is no practical alternative.
- Keep runtime data models and form-state models separate when their needs differ.

## React

- Components should stay render-pure.
- Side effects belong in event handlers, effects, or dedicated side-effect components.
- Prefer small presentational components plus extracted hooks/helpers over one large mixed file.
- Keep component props focused on UI contracts; move canvas/store logic into hooks or utilities when it starts dominating the file.
- Use `useEffectEvent` when it improves clarity for event-driven effect code and avoids stale closures.

## Redux

- Keep Redux state serializable and UI-oriented.
- Do not place live Fabric objects, DOM nodes, or mutable class instances in Redux state.
- Use Redux Toolkit reducers for state updates and prefer store selectors as the source of truth.
- Keep store records minimal: store metadata needed by UI, not duplicated canvas internals.

## Canvas / Fabric

- `CanvasAppContext` owns live Fabric canvas and object-instance access.
- Fabric objects are runtime state, not app state.
- When a Fabric concern is shared across features, extract a focused helper instead of duplicating object mutation logic.
- Normalize transform behavior at the canvas/object layer when possible so design-panel edits, playback, and timeline logic stay consistent.

## Styling

- Use Tailwind utility classes as the default styling mechanism.
- Prefer utility composition over new CSS files or ad hoc global classes.
- Build repeated UI patterns from small reusable components when the markup structure repeats.
- Keep visual tokens and shared class strings in local utilities when they are reused across a feature.

## Testing

- Prefer Playwright tests that reflect user-visible behavior.
- Use accessible roles, visible labels, and explicit test IDs only when the user-facing surface is not stable enough.
- Treat timing tests as broad regression checks, not microbenchmarks.
- Add focused regression tests when fixing transport, timeline, canvas selection, or side-panel interaction bugs.

## Practical Defaults For This Repo

- Prettier is the formatting source of truth.
- ESLint enforces correctness first; avoid adding style-only lint churn unless the team explicitly wants it.
- Derive related types from source-of-truth model types.
- Keep UI components lean and move non-UI logic out as files grow.
- When changing layout or styling, run the Chromium visual/test loop and inspect the screenshots.
