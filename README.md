# NewMotion

Motion editor built with React, TypeScript, Fabric.js, Redux Toolkit, and MediaBunny.

## Tech Stack

- React + Vite + TypeScript
- Fabric.js (canvas editing)
- Redux Toolkit (editor/timeline/history state)
- Tailwind CSS (UI styling)
- MediaBunny (video export)
- OpenAI integrations for scene automation

## Requirements

- Node.js 22
- pnpm

## Setup

```bash
nvm use 22
pnpm install
```

## Run

```bash
pnpm dev
```

Open the URL printed by Vite.

## Scripts

- `pnpm dev` - start dev server
- `pnpm build` - typecheck + production build
- `pnpm typecheck` - TypeScript project build checks
- `pnpm typecheck:watch` - watch-mode typecheck
- `pnpm lint` - ESLint
- `pnpm preview` - preview production build

## Project Structure

- `src/app/layout` - app shell layout
- `src/app/features/canvas` - editor canvas, tools, side panel, timeline, overlays
- `src/app/features/export` - export pipeline
- `src/app/features/ai` - AI chat and tool-call orchestration
- `src/app/store` - Redux store and slices
- `src/const.ts` - shared app constants and prompts

## Core UI Behavior

- Canvas tools are floating and draggable.
- Design/Animations panel is floating on desktop and stacked on smaller screens.
- Timeline supports play/pause, draggable playhead, keyframe rows, and resize.
- Video work area overlay marks the visible export region.

## Notes

- Fabric instance ownership lives in canvas context/hooks.
- Business logic should be kept in hooks/util files under `src/app/features/**`.
- Follow rules in `AGENTS.md` for formatting and architecture conventions.
