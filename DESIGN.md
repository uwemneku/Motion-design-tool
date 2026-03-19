# Design System Document: Editorial Motion Protocol

## 1. Overview & Creative North Star

### Creative North Star: "The Obsidian Loom"

This design system is engineered for the high-performance motion designer. It moves beyond
the "standard SaaS" aesthetic into a realm of **Precision Editorialism**. Like a loom, it is
a stable, structural framework designed to hold vibrant, moving threads. We achieve this
through a "dark-first" philosophy where depth is communicated via light and texture rather
than lines.

The design breaks the "template" look by using high-density layouts, intentional asymmetry in
the property panels, and a strict adherence to **Tonal Layering**. We avoid the visual noise
of traditional grids, opting instead for a workspace that feels like a singular, carved piece
of obsidian: refined, stable, and profoundly premium.

## 2. Colors

Our palette is rooted in deep charcoals and slate, providing a neutral stage that allows the
user’s creative content to take center stage.

- **Primary (`#8dabff`)**: Use for active keyframes, playback heads, and primary selection
  states.
- **Secondary (`#b686ff`)**: Reserved for secondary motion paths or specialized animation
  modifiers.
- **Neutral Roles**: The `surface` series defines our architectural depth.

### The "No-Line" Rule

**Explicit Instruction:** Designers are prohibited from using 1px solid borders to section off
major UI areas such as Timeline vs. Canvas vs. Properties. Boundaries must be defined solely
through background color shifts.

- **Example:** Use `surface-container-low` for the main workspace and transition to
  `surface-container-high` for the property inspector panels.

### Surface Hierarchy & Nesting

Treat the UI as a series of physical layers. Use the tiers to define importance:

1. **Level 0 (Base):** `surface` (`#0e0e10`) - The application shell.
2. **Level 1 (Panels):** `surface-container` (`#19191c`) - Main sidebars and timeline
   containers.
3. **Level 2 (In-Panel Elements):** `surface-container-highest` (`#262528`) - Input fields and
   nested property groups.

### The "Glass & Gradient" Rule

To add "soul" to the functional density, floating elements such as the central tool dock must
use **Glassmorphism**. Apply `surface-container` with a `backdrop-blur` and a `secondary` to
`primary` subtle linear gradient at 15% opacity for key CTA backgrounds to provide a
professional polish.

## 3. Typography

We use a dual-typeface system to balance technical precision with editorial authority.

- **Headlines (Manrope):** Chosen for its geometric stability. Use `headline-sm` for panel
  titles to command authority without occupying excessive vertical space.
- **Body & Labels (Inter):** The workhorse. `label-sm` (`0.6875rem`) is our primary tool for
  property labels. It is crisp, highly legible at small scales, and maintains clarity in
  high-density layouts.
- **Hierarchy:** High contrast between `on-surface` (white/off-white) and
  `on-surface-variant` (muted grey) is critical to guide the eye through dense property
  stacks.

## 4. Elevation & Depth

In a professional editor, "Flat" is confusing, but "Shadowy" is messy. We use
**Tonal Layering**.

### The Layering Principle

Depth is achieved by "stacking" surface tiers. Place a `surface-container-lowest` card on a
`surface-container-low` section to create a soft, natural recess.

### Ambient Shadows

For floating modals or context menus, use **Ambient Shadows**:

- **Blur:** 24px - 40px
- **Opacity:** 4% - 8%
- **Color:** Tint the shadow with `primary-dim` to mimic the glow of a high-end monitor rather
  than a dead grey drop shadow.

### The "Ghost Border" Fallback

If accessibility requires a container boundary, use a **Ghost Border**: `outline-variant` at
15% opacity. Never use 100% opaque borders.

## 5. Components

### Buttons

- **Primary:** Gradient fill (`primary` to `primary-dim`), `rounded-md`. No border.
- **Secondary:** `surface-container-highest` fill with a `primary` Ghost Border.
- **IconButton:** Minimalist. `on-surface-variant` by default, shifting to `primary` on hover.

### Input Fields (High-Density)

- **Style:** Use `surface-container-highest` for the background.
- **States:** Focus state is indicated by a 1px `primary` bottom-border only (the "Editorial
  Underline").
- **Spacing:** Use `spacing-2` (`0.4rem`) for internal padding to maintain the high-density
  requirements of creative tools.

### Timeline & Keyframes

- **The Playhead:** `primary` solid line with a `primary-container` glow.
- **Keyframes:** Diamond shapes using `primary` for active and `outline` for inactive. Use
  `spacing-0.5` for microscopic positioning precision.

### Lists & Property Rows

- **Forbid Dividers:** Do not use lines between property rows such as Position, Scale, and
  Rotation.
- **Separation:** Use `spacing-3` vertical white space or a subtle hover state shift to
  `surface-bright`.

## 6. Do's and Don'ts

### Do

- **Do** use `surface-container-lowest` for "cut-out" areas like the viewport to create a
  sense of focus.
- **Do** use `Manrope` for numeric values in the property panel to emphasize technical
  accuracy.
- **Do** utilize `rounded-sm` (`0.125rem`) for tool icons to maintain a sharp, professional
  feel.

### Don'ts

- **Don't** use pure black (`#000000`) for anything other than the deepest canvas
  backgrounds; it kills the "Obsidian" depth.
- **Don't** use standard select dropdowns. Use custom Ghost Border popovers that match the
  glassmorphic style.
- **Don't** use large rounded corners for panels. High-end tools feel more stable with
  `rounded-sm` or `rounded-md`. Save `rounded-full` exclusively for toggle switches or
  playhead handles.
