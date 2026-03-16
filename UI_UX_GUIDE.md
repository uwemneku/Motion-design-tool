# UI/UX Guide

This guide is the source of truth for visual and interaction decisions in this project.
Use it when designing, reviewing, or refactoring UI.

The intended standard is closer to a mature product design organization than a quick
prototype pass: quiet confidence, high clarity, careful hierarchy, and interaction polish.

## Core Principles

### Clarity First

- Every screen should make the primary action obvious within a few seconds.
- Prefer reducing noise over adding decoration.
- Use spacing, contrast, and grouping to communicate structure before using borders.
- Avoid solving hierarchy problems with more color.

### Calm, Premium Surfaces

- Favor restrained interfaces over flashy ones.
- Use a small number of neutral surfaces with subtle tonal separation.
- Keep accent colors purposeful. Accent should signal action, focus, state, or selection.
- Avoid accidental “tech demo” visuals: glowing edges, loud gradients, or overworked shadows.

### Precision in Small Details

- Radius, spacing, typography, icon size, and alignment must feel intentional.
- When a component feels “off,” assume the answer is usually proportion, spacing, or contrast.
- Small controls should feel mechanically precise, not soft or inflated.

### Interaction Should Feel Direct

- Hover, focus, press, selection, drag, and disabled states must be visually distinct.
- Menus and panels should feel stable under the pointer.
- Nested interactions should never fight each other.
- Motion should explain state changes, not decorate them.

## Product Personality

The product should feel:

- Focused
- Crisp
- Neutral
- Confident
- Quietly premium

It should not feel:

- Playful by default
- Over-rounded
- Over-glossy
- Over-animated
- Over-themed

## Color System

### Default Palette Strategy

- Build the UI mostly from graphite, charcoal, and soft gray neutrals.
- Use white and near-white for high-priority text only.
- Use muted grays for secondary labels and metadata.
- Use blue sparingly as an accent for:
  - primary actions
  - selected states
  - focus
  - timeline/video-area emphasis

### Color Rules

- If everything is accented, nothing is accented.
- Avoid mixing multiple competing accent colors in the same panel.
- Dropdowns, popovers, and overlays should belong to the same tonal family as the controls that launch them.
- Error, warning, and success colors should be clear but not fluorescent.

### Contrast

- Primary text must be easy to read at a glance.
- Secondary text should still be legible without strain.
- Borders should separate, not dominate.
- If a border is the first thing you notice, it is probably too strong.

## Typography

### General Rules

- Typography should do more hierarchy work than borders.
- Use a small, disciplined type scale.
- Labels, values, metadata, and section headings should each have a consistent role.
- Avoid unnecessary uppercase except for short utility labels and micro-headings.

### Font Selection

- Default app UI typography should stay in the Apple-system family first:
  - `SF Pro Display`
  - `SF Pro Text`
  - `-apple-system`
  - then platform fallbacks
- Use sans-serif UI fonts for most product surfaces.
- Prefer one UI family across the app shell rather than mixing multiple sans-serif personalities.
- Use monospaced fonts only where they improve precision:
  - time readouts
  - numeric inputs
  - values where alignment matters
- Avoid decorative display fonts in utility surfaces like:
  - inspectors
  - timelines
  - toolbars
  - menus
- If a custom font is introduced, it should have a clear product reason and should not reduce clarity.
- Dropdowns, popovers, badges, and panels should inherit the same font family as nearby controls unless there is a strong reason not to.
- Font choices should reinforce hierarchy through weight and size first, not through constantly changing families.
- When choosing between two fonts, prefer the one that feels:
  - calmer
  - more legible at small sizes
  - more neutral beside the rest of the interface

### Font Usage by Role

- Section titles:
  - primary UI family
  - semibold
  - slightly tighter tracking when needed
- Field labels and metadata:
  - primary UI family
  - regular or medium
  - quieter color instead of thinner weight
- Editable values:
  - primary UI family for general text inputs
  - monospaced family for compact numeric or time-based fields
- Buttons:
  - primary UI family
  - medium or semibold
  - avoid overly heavy weights on small buttons
- Menus and dropdown options:
  - primary UI family
  - consistent with the trigger
  - no novelty font treatment

### Hierarchy

- Section headings:
  - slightly larger
  - higher contrast
  - medium or semibold weight
- Field labels:
  - small
  - subdued
  - readable
- Values and editable text:
  - crisp
  - slightly higher contrast
  - aligned consistently

### Numeric Inputs

- Numeric values should feel precise and compact.
- Monospaced text is appropriate where alignment or motion clarity matters.
- Prefixes like `X`, `Y`, `W`, `H`, `R`, and `O` should read as controls, not decorative badges.

## Spacing and Layout

### Spacing Rules

- Prefer a consistent spacing system over one-off nudges.
- Tighter spacing is appropriate for utility-heavy panels, but never let controls touch visually.
- Interior padding must support readability; compact does not mean cramped.

### Panel Layout

- Panels should have clear section rhythm.
- Prefer section spacing and dividers over stacked card-within-card patterns.
- Use grouping to reduce scan time:
  - related controls should live together
  - unrelated controls should breathe apart

### Width and Density

- Narrow panels need simpler layouts, not smaller everything.
- In constrained side panels:
  - reduce duplication
  - use fewer competing affordances per row
  - collapse decorative extras first

## Shape Language

### Radius

- Use small radii by default.
- Controls should feel refined and precise, not bubble-like.
- For this project, compact controls should typically stay in the `4px` to `6px` range.
- Larger radii are reserved for bigger surfaces or special calls to action.

### Borders

- Prefer subtle borders with low alpha.
- Rely on border plus fill contrast together, not border alone.
- Avoid nested bordered containers unless each border represents a distinct structural level.

## Buttons

### Primary Buttons

- Primary buttons should be visually clear and high confidence.
- Use accent color with balanced contrast.
- Keep the silhouette simple.
- Avoid exaggerated radius on small buttons.

### Secondary Buttons

- Secondary actions should read as available without competing with primary actions.
- Use neutral surfaces with clear hover/press states.

### Icon Buttons

- Icons must be familiar, simple, and visually balanced.
- Avoid hand-drawn inconsistencies when a known icon library provides a better match.
- Icon buttons need:
  - clear hit area
  - stable alignment
  - visible hover and disabled states

## Inputs and Controls

### Input Styling

- Inputs should look compact, editable, and aligned.
- Use one shared visual language for:
  - text fields
  - numeric fields
  - selects
  - segmented controls

### Prefix + Value Fields

- The divider between prefix and value should be subtle.
- The value should not hug the divider or the outer edge.
- Prefix width should be just large enough to feel intentional.
- Scrubbable prefixes should read as interactive without becoming visually dominant.

### Dropdowns and Menus

- Custom dropdowns should feel like part of the same component family as the trigger.
- The opened surface should not look like it belongs to another theme.
- Option typography should match surrounding controls.
- Nested menus inside tooltips are discouraged; prefer a stable popover or menu container.

### Sliders

- Sliders should feel grounded and readable.
- Value badges and range labels should belong to the same style system as nearby fields.
- Avoid dropping in a generic control style if the panel has an established visual language.

## Motion

### Motion Principles

- Motion should support orientation and state change.
- Use short durations and calm easing.
- Avoid making dense panels feel busy with unnecessary movement.

### Appropriate Uses

- opening and closing surfaces
- inserting or removing content
- drag feedback
- progress indication
- tab or layout transitions

### Avoid

- decorative looping motion
- exaggerated bounce
- large-scale ambient motion in utility panels

## Icons

### Icon Selection

- Use a consistent library wherever possible.
- Prefer simple, geometric icons with clear recognition.
- If one icon feels odd, compare it against the surrounding set before changing only that one.

### Icon Sizing

- Icons should look optically aligned, not just mathematically centered.
- Small icons often need slightly different padding than text buttons.

## Overlays, Popovers, and Menus

### Behavioral Rules

- Overlays must remain stable during interaction.
- If the user needs to click inside a floating surface, that surface cannot behave like a fragile hover tooltip.
- Nested interactive surfaces need pointer-safe containment.

### Visual Rules

- The overlay should visually relate to its trigger.
- Use enough contrast to separate the overlay from the canvas.
- Keep shadow and blur restrained.

## Timeline and Canvas-Specific Guidance

### Canvas

- The canvas should remain visually dominant.
- Utility UI should frame it, not overpower it.
- Floating controls should stay compact and legible over dark backgrounds.

### Timeline

- Timeline density must still preserve legibility.
- Labels, ticks, playhead, and keyframes each need distinct visual roles.
- Sticky regions must remain visually and behaviorally stable while content scrolls.

### Inspector

- The inspector is a utility surface.
- It should feel highly usable, not ornamental.
- The right answer is usually tighter spacing, clearer grouping, and more consistent controls.

## Review Workflow

### Before Changing UI

- Understand the existing visual system first.
- Identify whether the problem is:
  - spacing
  - hierarchy
  - color
  - typography
  - radius
  - interaction model

### While Reviewing

- Use populated states, not empty shells.
- Add realistic content to the canvas.
- Navigate between relevant modes.
- Scroll panels.
- Open menus and popovers.
- Capture multiple screenshots when the issue spans states.

### When Something Feels Off

Check these in order:

1. spacing
2. alignment
3. radius
4. type scale
5. contrast
6. interaction stability
7. color usage

Most UI problems in this project should be solved before introducing a new visual treatment.

## Implementation Rules

- Reuse shared primitives before creating a one-off control.
- Prefer a small number of visual patterns repeated consistently.
- If a new component is added, consider whether it should become a shared primitive.
- Visual updates should avoid logic changes unless the interaction itself is broken.

## Anti-Patterns

Avoid these unless there is a strong reason:

- pill-shaped controls by default
- multiple accent colors in the same small panel
- nested cards with heavy borders
- tiny labels combined with oversized fields
- menus styled in a different language from their triggers
- tooltip behavior for controls that require further clicking inside
- visual fixes that hide interaction bugs instead of solving them

## Standard for Approval

A UI change is ready when:

- it looks coherent in populated states
- spacing feels intentional
- controls are easy to scan
- interactions are stable
- visual language is consistent across adjacent components
- screenshots support the decision, not just the code
