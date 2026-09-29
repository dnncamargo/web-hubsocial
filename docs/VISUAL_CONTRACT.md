# Canonical Visual Contract

Status: **normative**

This document defines the visual, layout, responsive, interaction, and motion rules for the application.

The goal is a mature software interface: dense enough to be useful, calm enough to remain readable, and consistent across desktop and mobile.

The interface must not resemble a marketing/landing page.

## 1. Product layout principle

The application is an operational workspace.

Primary question:

> What deserves the user's attention now?

The home page is not a collection of decorative dashboard cards.

Information hierarchy is:

```text
Actions of the Day   → primary
This Week            → secondary
This Month           → tertiary
Context/automation   → supporting information
```

## 2. Mobile-first

Mobile behavior is designed from the first implementation checkpoint.

Do not build desktop first and shrink it later.

### Mobile navigation
Use a persistent bottom navigation for primary destinations.

A compact create action may sit in or near this navigation.

Do not reproduce the desktop sidebar as a drawer unless evidence shows a drawer is necessary.

### Desktop navigation
Use a persistent left sidebar.

The sidebar may collapse to an icon rail.

The main content should use available workspace width and must not be artificially centered like a landing page.

## 3. Canonical desktop shell

Target structure:

```text
┌───────────────┬──────────────────────────────────────────────┐
│ sidebar       │ contextual top bar                           │
│               ├──────────────────────────────────────────────┤
│ Today         │ Actions of the Day                           │
│ Agenda        │                                              │
│ Tasks         │ primary operational content                  │
│ Events        │                                              │
│ People        ├──────────────────────┬───────────────────────┤
│               │ This Week            │ Context               │
│               ├──────────────────────┴───────────────────────┤
│               │ This Month                                   │
└───────────────┴──────────────────────────────────────────────┘
```

The shell should feel like professional software, not a centered website.

## 4. Canonical mobile shell

Target structure:

```text
┌─────────────────────────────┐
│ Today · date        context │
├─────────────────────────────┤
│ Actions of the Day          │
│                             │
│ primary action list         │
│                             │
│ This Week                   │
│                             │
│ This Month                  │
├─────────────────────────────┤
│ Today Agenda  +  Tasks ...  │
└─────────────────────────────┘
```

Content remains the same domain projection. Navigation presentation changes by viewport.

## 5. Visual direction

Canonical direction: **quiet productivity**.

Characteristics:

- restrained, sober neutral backgrounds;
- subtle surface separation;
- thin 1 px borders as the primary separator;
- very restrained shadows, reserved for real elevation;
- predominantly square or only slightly rounded corners;
- strong typographic hierarchy;
- compact but comfortable spacing;
- semantic color used intentionally and sparingly;
- linear icons;
- low visual noise;
- regular alignment and predictable grids over decorative masonry layouts.

Avoid:

- landing-page hero sections;
- excessive centered content;
- oversized headings;
- decorative gradients as structure;
- glassmorphism throughout the app;
- bento cards for every section;
- excessive pills;
- excessive rounding;
- large empty whitespace used only for visual drama.

## 6. CSS architecture

Canonical styling stack:

```text
native CSS
CSS custom properties
CSS Modules
small global foundation
```

Tailwind is not part of the target visual stack.

### Global CSS owns

- reset;
- semantic tokens;
- typography foundation;
- app-shell primitives;
- accessibility/focus defaults;
- truly shared visual contracts.

### CSS Modules own

- component-specific layout;
- local states;
- domain-specific presentation;
- component variants that are not global contracts.

Avoid generic utility-class recreation.

## 7. Tokens

Use semantic custom properties rather than raw palette names.

Canonical categories:

```css
:root {
  /* surfaces */
  --color-background;
  --color-surface;
  --color-surface-elevated;
  --color-surface-muted;

  /* text */
  --color-text-primary;
  --color-text-secondary;
  --color-text-muted;

  /* borders */
  --color-border;
  --color-border-strong;

  /* semantic */
  --color-accent;
  --color-success;
  --color-warning;
  --color-danger;
  --color-focus-ring;

  /* domain accents */
  --color-events;
  --color-tasks;
  --color-people;

  /* radii */
  --radius-sm;
  --radius-md;
  --radius-lg;

  /* shadows */
  --shadow-sm;
  --shadow-md;

  /* spacing */
  --space-1;
  --space-2;
  --space-3;
  --space-4;
  --space-6;
  --space-8;

  /* motion */
  --duration-fast;
  --duration-standard;
  --duration-structural;
}
```

Do not create dozens of speculative tokens.

A token should describe meaning, not merely duplicate a CSS value.

## 8. Color

The default palette is neutral and desaturated. Saturated color must not define large surfaces, navigation chrome, dialogs, or cards.

Domain accents remain useful:

- Events: event accent;
- Tasks: task accent;
- People: people accent.

These colors are accents, not full-page backgrounds. Prefer narrow markers, icons, text accents, selection state, or subtle tinted backgrounds over solid saturated fills.

Black surfaces should not be used as a generic modal/dialog treatment. Dialogs should normally use the same neutral surface system as the rest of the application.

Automation/relevance highlighting should use a separate semantic treatment and must not overwrite entity identity.

Color must never be the only signal conveying meaning.

Task status colors are semantic system tokens, not per-task persisted data. A task row may project status through a narrow 1–2 px accent line and the status icon while keeping the row surface neutral.

Future configurable category and relationship colors should belong to the category/relationship definition, not be duplicated on each Event or Person. Prefer a constrained sober palette with verified contrast over unrestricted decorative color picking.

## 9. Typography

Use a small, predictable hierarchy:

```text
page title
section title
card/list title
body
secondary
caption
```

Prefer weight, spacing, and contrast over large jumps in font size.

The product should feel information-dense, not editorial.

## 10. Spacing

Use a compact canonical scale.

Preferred base scale:

```text
4
8
12
16
24
32
```

Use arbitrary spacing only when a real layout constraint requires it.

## 11. Radius and shadows

Default to square corners or small radii. A visible radius should communicate a component boundary, not become the dominant visual language.

Cards, panels, dialogs, inputs, tags, and buttons must not look like oversized rounded capsules.

Fully rounded shapes are reserved for controls whose geometry requires them, such as switch tracks, status dots, avatars, or similarly compact indicators.

Shadows indicate elevation, not decoration, and should remain faint.

Most separation should come from:

1. background;
2. thin border;
3. spacing;
4. shadow only when elevation is meaningful.

## 12. Buttons

Canonical semantic variants:

```text
primary
secondary
danger
ghost
icon
```

Required states:

```text
default
hover
active
focus-visible
disabled
```

Hover must preserve semantic meaning.

A primary action must not become visually destructive on hover.

## 13. Forms

Inputs share canonical:

- height;
- padding;
- border;
- radius;
- typography;
- placeholder;
- focus;
- disabled;
- validation/error state.

Do not restyle the same input independently in every form.

Large forms may use grouped surfaces, but grouping must follow data meaning rather than decorative cards.

## 14. Lists before cards

Operational data should prefer compact rows/lists when users need to scan or act quickly.

Use cards when the content has meaningful internal structure.

Do not turn every task, event, setting, or statistic into an isolated card.

Actions of the Day should primarily be a compact operational list.

## 15. Actions of the Day

This is the dominant home surface.

A row may contain:

```text
status | title | relevant metadata | automation/context signal
```

Example:

```text
○  Wash clothes                 Today      ☀ Sunny
```

Automation match:

- the action remains in the same list;
- relevance increases through restrained styling;
- use subtle surface tone, a narrow accent marker, icon/state contrast, or equivalent;
- avoid blinking, pulsing, or persistent motion.

Automation mismatch:

- the action remains visible if manually scheduled;
- the condition may be shown as unmet with lower emphasis.

## 16. Week and month

Week and month must not compete visually with today.

Week is a compact planning layer.

Month is a tertiary planning layer and may use summary/calendar presentation.

The layout should allow them to become more detailed when the user navigates to Agenda without making the home page noisy.

## 17. Context information

Weather, upcoming events, birthdays, and automation explanations are supporting context.

Do not create a dominant weather widget on the home page.

Context should explain why something is highlighted.

Example:

```text
Sunny · 27°
2 actions are favored by today's weather
```

## 18. Automation UI

Automation should feel like system intelligence, not another dashboard.

Rules belong primarily in task/event editing.

Preferred structure:

```text
When:
[ Weather ] [ is ] [ Sunny ]

And:
[ Weekday ] [ is ] [ Saturday ]

Result:
Highlight in Actions of the Day
```

Start with explicit rules. Do not create a generic visual programming/rule-builder system before real requirements justify it.

## 19. Motion

Motion communicates state and continuity.

### Microinteraction
Target: approximately 120–180 ms.

Examples:

- button press;
- hover emphasis;
- check;
- toggle;
- focus transitions.

### Structural motion
Target: approximately 180–260 ms.

Examples:

- expand/collapse;
- sidebar transitions;
- contextual panel;
- list reordering.

### Navigation transition
Target: approximately 200–320 ms.

Examples:

- list → detail;
- Today → Agenda;
- panel → full editor.

These are target ranges, not rigid constants.

## 20. Motion behavior

Prefer:

- opacity;
- small transforms;
- shared-element continuity;
- height/size transitions when they help users understand structure.

Avoid:

- motion without information value;
- long easing sequences;
- bouncing UI chrome;
- constant ambient animation;
- large parallax effects.

Completing an action may animate briefly before list reordering so the user can perceive the state change.

## 21. Reduced motion

Respect `prefers-reduced-motion`.

When reduced motion is requested:

- remove non-essential movement;
- replace large translations with opacity/color changes;
- keep state changes immediate and understandable.

Accessibility takes precedence over decorative motion.

## 22. Responsive behavior

Breakpoints are content-driven.

Do not write layout logic around device labels when CSS can solve the problem.

JavaScript device detection is justified only when behavior, not merely visual arrangement, must differ.

## 23. Accessibility

Interactive controls require:

- semantic HTML;
- keyboard support;
- visible focus;
- accessible names;
- adequate contrast;
- reasonable target sizes.

Do not use color alone for automation status, completion, errors, or domain identity.

## 24. Empty, loading, error, and disabled states

Every major surface should deliberately support:

```text
loading
empty
error
disabled
partial data
```

Empty states should be concise and operational, not marketing copy.

## 25. Canonical implementation rule

When creating a new visual element:

1. check whether a shared contract already exists;
2. reuse it;
3. extend it only if the new case is genuinely compatible;
4. use a local CSS Module when the styling is specific;
5. promote to a global visual contract only after reuse is proven.

## 26. Visual migration rule

Existing Tailwind styles are legacy migration debt.

Do not mechanically translate utility strings one-to-one into CSS classes.

During migration:

1. identify repeated intent;
2. decide the modernized visual hierarchy instead of reproducing the Tailwind appearance;
3. define or reuse semantic tokens/contracts;
4. migrate representative surfaces;
5. validate mobile and desktop;
6. remove obsolete utilities;
7. only then expand to the next surface.

A Tailwind utility string is evidence of behavior and layout requirements, not a visual specification to preserve.

The redesign should reduce both visual inconsistency and code complexity.
