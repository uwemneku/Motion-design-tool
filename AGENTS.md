# Coding Rules

## Formatting

- Use TypeScript strict mode patterns.
- Prefer single quotes.
- Use trailing commas where valid.
- Max line length: 100.
- Use semicolons.
- No default exports except React page/layout components.
- Always comment functions with concise purpose/behavior notes.

## React

- Use function components + hooks only.
- Move business logic to hooks in `src/app/features/**`.

## Styling

- Tailwind utility classes only.
- No new plain CSS files unless explicitly approved.

## Imports

- Group imports: external, internal, relative.
- Keep imports sorted alphabetically inside groups.

## Safety

- Do not use `any` unless unavoidable; add a comment when used.
- Avoid non-null assertions (`!`) unless necessary.
