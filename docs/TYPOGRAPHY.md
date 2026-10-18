# Typography and sizing

> Generated from Claude 2.42304.0 (`8f4d3dec5e4f3ddf…`).
> Do not edit by hand — run `npm run docs`.

The type scale, its paired line-heights, the density ladders, and the
dark-mode font-weight correction.

## Type scale

Every size has a paired line-height token. The ratio column is what you want when re-implementing with a different base size.

| Role | Size | Line-height | Ratio | Size token |
|---|---|---|---|---|
| caption | 0.8125rem | 1.0625rem | 1.308 | `--cds-font-size-caption` |
| footnote | 0.8125rem | 1.0625rem | 1.308 | `--cds-font-size-footnote` |
| code | 0.8125rem | 1.1875rem | 1.462 | `--cds-font-size-code` |
| body | 0.9375rem | 1.375rem | 1.467 | `--cds-font-size-body` |
| prose | 1.125rem | 1.6875rem | 1.5 | `--cds-font-size-prose` |
| heading | 1rem | 1.5rem | 1.5 | `--cds-font-size-heading` |
| title | 1.375rem | 1.75rem | 1.273 | `--cds-font-size-title` |

## Text size preference

Claude exposes Small / Medium / Large transcript text. Rather than scaling one value, it re-points the whole scale per surface — note that `--textmd` only overrides body copy while `--textsm` and `--textlg` override the full set.

| Role | default | --textsm | --textmd | --textlg | --own |
|---|---|---|---|---|---|
| body | 0.9375 / 1.375 | 0.8125 / 1.1875 | 0.875 / 1.25 | 0.9375 / 1.375 | 0.875 / 1.25 |
| prose | 1.125 / 1.6875 | 0.9375 / 1.375 | — | 1.125 / 1.6875 | — |
| prose--xs | 0.9375 / 1.375 | 0.8125 / 1.1875 | — | 0.9375 / 1.375 | — |
| prose--sm | 1 / 1.5 | 0.875 / 1.25 | — | 1 / 1.5 | — |
| prose--lg | 1.125 / 1.6875 | 1 / 1.5 | — | 1.125 / 1.6875 | — |
| heading | 1 / 1.5 | 0.875 / 1.25 | — | 1 / 1.5 | — |

_Cells are `size / line-height` in rem._

## Weights

Light mode uses the plain font-weight property (wght tokens are "normal"). Dark mode switches to an explicit font-variation-settings wght axis, uniformly -40.

| Name | Light `font-weight` | Dark `wght` axis | Δ |
|---|---|---|---|
| regular | 400 | 360 | -40 |
| medium | 500 | 460 | -40 |
| semibold | 580 | 540 | -40 |
| bold | 600 | 560 | -40 |

Grade axis in dark mode: `semibold` = 180, `bold` = 200. Grade changes apparent weight without changing advance width, so nothing reflows on theme change.

Note the non-standard ramp: `semibold` is **580**, `bold` is **600**. Do not assume 600/700.

## Density ladder

`data-density="comfortable"` bumps the whole scale up one notch. The unset default is the compact one.

| Token | Default | comfortable |
|---|---|---|
| `--cds-font-size-text-entry-floor` | 16px | — |
| `--cds-radius` | 0.375rem | 0.5rem |
| `--cds-radius-composer` | 0.75rem | 0.875rem |
| `--cds-h-control` | 1.5rem | 2rem |
| `--cds-h-control-nested` | 1.125rem | 1.375rem |
| `--cds-icon` | 1rem | 1.25rem |
| `--cds-pad-xs` | 0.25rem | 0.375rem |
| `--cds-pad-sm` | 0.375rem | 0.5rem |
| `--cds-pad-md` | 0.5rem | 0.75rem |
| `--cds-pad-lg` | 0.75rem | 1rem |
| `--cds-pad-xl` | 1.25rem | 1.5rem |
| `--cds-gap-xs` | 0.375rem | 0.5rem |
| `--cds-gap-sm` | 0.5rem | 0.75rem |
| `--cds-gap-md` | 0.75rem | 1rem |
| `--cds-gap-lg` | 1.25rem | 1.75rem |
| `--cds-gap-xl` | 2rem | 2.5rem |
| `--cds-font-size-caption` | 0.6875rem | 0.75rem |
| `--cds-font-size-footnote` | 0.75rem | 0.8125rem |
| `--cds-font-size-code` | 0.75rem | 0.8125rem |
| `--cds-font-size-body` | 0.8125rem | 0.875rem |
| `--cds-font-size-prose` | 0.875rem | 1rem |
| `--cds-font-size-heading` | 0.875rem | 0.9375rem |
| `--cds-font-size-title` | 1.25rem | 1.375rem |
| `--cds-radius--xs` | 0.3125rem | 0.375rem |
| `--cds-radius--sm` | 0.3125rem | 0.4375rem |
| `--cds-radius--lg` | 0.4375rem | 0.625rem |
| `--cds-h-control--xs` | 1.25rem | 1.5rem |
| `--cds-h-control--sm` | 1.25rem | 1.75rem |
| `--cds-h-control--lg` | 1.75rem | 2.5rem |
| `--cds-h-control-nested--xs` | 1rem | 1.125rem |
| `--cds-h-control-nested--sm` | 1rem | 1.25rem |
| `--cds-h-control-nested--lg` | 1.25rem | 1.75rem |
| `--cds-icon--xs` | 0.75rem | 1rem |
| `--cds-icon--sm` | 0.75rem | 1rem |
| `--cds-icon--lg` | 1rem | 1.5rem |
| `--cds-pad-xs--xs` | 0.125rem | 0.25rem |
| `--cds-pad-xs--sm` | 0.125rem | 0.375rem |
| `--cds-pad-xs--lg` | 0.375rem | 0.5rem |
| `--cds-pad-sm--xs` | 0.25rem | 0.375rem |
| `--cds-pad-sm--sm` | 0.25rem | 0.5rem |
| `--cds-pad-sm--lg` | 0.5rem | 0.75rem |
| `--cds-pad-md--xs` | 0.375rem | 0.5rem |
| `--cds-pad-md--sm` | 0.375rem | 0.625rem |
| `--cds-pad-md--lg` | 0.625rem | 1rem |
| `--cds-pad-lg--xs` | 0.625rem | 0.75rem |
| `--cds-pad-lg--sm` | 0.625rem | 0.875rem |
| `--cds-pad-lg--lg` | 0.875rem | 1.25rem |
| `--cds-pad-xl--xs` | 0.875rem | 1.25rem |
| `--cds-pad-xl--sm` | 0.875rem | 1.375rem |
| `--cds-pad-xl--lg` | 1.375rem | 1.75rem |
| `--cds-font-size-caption--xs` | 0.625rem | 0.6875rem |
| `--cds-font-size-caption--sm` | 0.625rem | 0.75rem |
| `--cds-font-size-caption--lg` | 0.75rem | 0.8125rem |
| `--cds-font-size-body--xs` | 0.75rem | 0.8125rem |
| `--cds-font-size-body--sm` | 0.75rem | 0.875rem |
| `--cds-font-size-body--lg` | 0.875rem | 0.9375rem |
| `--cds-font-size-prose--xs` | 0.8125rem | 0.875rem |
| `--cds-font-size-prose--sm` | 0.8125rem | 0.9375rem |
| `--cds-font-size-prose--lg` | 0.9375rem | 1.125rem |
| `--cds-font-size-body--textsm` | 0.8125rem | 0.8125rem |
| `--cds-font-size-body--textmd` | 0.875rem | 0.875rem |
| `--cds-font-size-body--textlg` | 0.9375rem | 0.9375rem |
| `--cds-font-size-body--own` | 0.8125rem | 0.875rem |
| `--cds-font-size-prose--textsm` | 0.8125rem | 0.9375rem |
| `--cds-font-size-prose--xs--textsm` | 0.8125rem | 0.8125rem |
| `--cds-font-size-prose--sm--textsm` | 0.8125rem | 0.875rem |
| `--cds-font-size-prose--lg--textsm` | 0.875rem | 1rem |
| `--cds-font-size-prose--textlg` | 0.9375rem | 1.125rem |
| `--cds-font-size-prose--xs--textlg` | 0.875rem | 0.9375rem |
| `--cds-font-size-prose--sm--textlg` | 0.875rem | 1rem |
| `--cds-font-size-prose--lg--textlg` | 1rem | 1.125rem |
| `--cds-font-size-heading--textsm` | 0.8125rem | 0.875rem |
| `--cds-font-size-heading--textlg` | 0.9375rem | 1rem |
| `--cds-leading-caption` | — | 1.0625rem |
| `--cds-leading-footnote` | — | 1.0625rem |
| `--cds-leading-code` | — | 1.1875rem |
| `--cds-leading-body` | — | 1.25rem |
| `--cds-leading-prose` | — | 1.5rem |
| `--cds-leading-heading` | — | 1.25rem |
| `--cds-leading-title` | — | 1.75rem |
| `--cds-avatar-xs` | — | 1.25rem |
| `--cds-avatar-sm` | — | 1.5rem |
| `--cds-avatar-md` | — | 2rem |
| `--cds-avatar-lg` | — | 2.5rem |
| `--cds-avatar-text-xs` | — | 0.5625rem |
| `--cds-checkbox` | — | 1.25rem |
| `--cds-checkbox-glyph` | — | 1rem |
| `--cds-checkbox-radius` | — | 0.3125rem |
| `--cds-panel-radius` | — | 0.75rem |
| `--cds-switch-h` | — | 1.25rem |
| `--cds-leading-body--xs` | — | 1.1875rem |
| `--cds-leading-body--sm` | — | 1.25rem |
| `--cds-leading-body--lg` | — | 1.375rem |
| `--cds-leading-prose--xs` | — | 1.25rem |
| `--cds-leading-prose--sm` | — | 1.375rem |
| `--cds-leading-prose--lg` | — | 1.6875rem |
| `--cds-checkbox--xs` | — | 1rem |
| `--cds-checkbox--sm` | — | 1.125rem |
| `--cds-checkbox--lg` | — | 1.5rem |
| `--cds-checkbox-glyph--xs` | — | 1rem |
| `--cds-checkbox-glyph--sm` | — | 1rem |
| `--cds-checkbox-glyph--lg` | — | 1.25rem |
| `--cds-checkbox-radius--xs` | — | 0.25rem |
| `--cds-checkbox-radius--sm` | — | 0.3125rem |
| `--cds-checkbox-radius--lg` | — | 0.375rem |
| `--cds-switch-h--xs` | — | 1rem |
| `--cds-switch-h--sm` | — | 1.125rem |
| `--cds-switch-h--lg` | — | 1.5rem |
| `--cds-leading-body--textsm` | — | 1.1875rem |
| `--cds-leading-body--textmd` | — | 1.25rem |
| `--cds-leading-body--textlg` | — | 1.375rem |
| `--cds-leading-body--own` | — | 1.25rem |
| `--cds-leading-prose--textsm` | — | 1.375rem |
| `--cds-leading-prose--xs--textsm` | — | 1.1875rem |
| `--cds-leading-prose--sm--textsm` | — | 1.25rem |
| `--cds-leading-prose--lg--textsm` | — | 1.5rem |
| `--cds-leading-prose--textlg` | — | 1.6875rem |
| `--cds-leading-prose--xs--textlg` | — | 1.375rem |
| `--cds-leading-prose--sm--textlg` | — | 1.5rem |
| `--cds-leading-prose--lg--textlg` | — | 1.6875rem |
| `--cds-leading-heading--textsm` | — | 1.25rem |
| `--cds-leading-heading--textlg` | — | 1.5rem |

## Step ladder

Five steps of control sizing. `data-step="1"` through `"5"` set these on a subtree — useful for dense toolbars.

| Token | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| `--cds-radius` | 0.3125rem | 0.375rem | 0.4375rem | 0.5rem | 0.625rem |
| `--cds-h-control` | 1.25rem | 1.5rem | 1.75rem | 2rem | 2.5rem |
| `--cds-h-control-nested` | 1rem | 1.125rem | 1.25rem | 1.375rem | 1.75rem |
| `--cds-icon` | 0.75rem | 1rem | 1rem | 1.25rem | 1.5rem |
| `--cds-pad-xs` | 0.125rem | 0.25rem | 0.375rem | 0.375rem | 0.5rem |
| `--cds-pad-sm` | 0.25rem | 0.375rem | 0.5rem | 0.5rem | 0.75rem |
| `--cds-pad-md` | 0.375rem | 0.5rem | 0.625rem | 0.75rem | 1rem |

## Font stacks

### `--cds-font-sans`

```css
var(--cds-font-system)
```

### `--cds-font-sans-display`

```css
var(--cds-font-sans)
```

### `--cds-font-mono`

```css
var(--cds-font-mono-override,) var(--font-anthropic-mono,"SF Mono"), "SF Mono", ui-monospace, Menlo, Consolas, monospace
```

### `--cds-font-system`

```css
ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "PingFang SC", "PingFang TC", "Hiragino Sans", "Apple SD Gothic Neo", sans-serif
```

### `--cds-font-voice`

```css
var(--font-anthropic-serif,ui-serif), ui-serif, Georgia, "Times New Roman", serif
```
