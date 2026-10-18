# Motion reference

> Generated from Claude 2.42304.0 (`8f4d3dec5e4f3ddf…`).
> Do not edit by hand — run `npm run docs`.

Durations, easings, springs, and every `@keyframes` block, verbatim.

## Durations

| Token | Value | Role |
|---|---|---|
| `--cds-dur-fast` | `60ms` | instant feedback, icon reveals |
| `--cds-dur-snap` | `.12s` | geometric snap: segmented controls, checkboxes |
| `--cds-dur-base` | `.2s` | default transition: cards, chips, pills |
| `--cds-dur-sheet` | `.3s` | drawers and panels sliding in |
| `--cds-dur-slow` | `.45s` | slow cross-fades |

## Easings

| Token | Value | Character |
|---|---|---|
| `--cds-ease-out` | `cubic-bezier(.165, .84, .44, 1)` | standard ease-out; the default for almost everything |
| `--cds-ease-overshoot` | `cubic-bezier(.34, 1.3, .64, 1)` | elastic overshoot for entrances (bubbles, pills) |
| `--cds-ease-snap` | `cubic-bezier(.32, .72, 0, 1)` | mechanical snap; no overshoot |

## Springs

Button press feedback is a CSS `linear()` easing, not a JS spring. This is worth copying: it gives you spring physics with zero runtime cost.

```css
--cds-btn-spring: linear(0, .2459, .6526, .9468, 1.0764, 1.0915, 1.0585, 1.0219, .9993, .9914, .9921, .9957, .9988, 1.0004, 1);
```

Read the curve: it rises past 1.0 around the 4th–6th stop, peaks near `1.0915`, then settles back to `1`. That overshoot is what makes the press feel bouncy rather than linear.

## Keyframes

58 blocks, grouped by purpose.

### Entrances

<details><summary><code>cds-chip-in</code></summary>

```css
@keyframes cds-chip-in { 0%{opacity:0;filter:blur(2px);transform:scale(.8)} }
```

</details>

<details><summary><code>cds-drop-icon-rise</code></summary>

```css
@keyframes cds-drop-icon-rise { 0%{opacity:0;transform:translateY(12px)} }
```

</details>

<details><summary><code>cds-drop-ring-in</code></summary>

```css
@keyframes cds-drop-ring-in { 0%{opacity:0;transform:scale(1.005)} }
```

</details>

<details><summary><code>cds-fade-in</code></summary>

```css
@keyframes cds-fade-in { 0%{opacity:0} }
```

</details>

<details><summary><code>cds-morph-in</code></summary>

```css
@keyframes cds-morph-in { 0%{opacity:0;transform:translateY(3px)} }
```

</details>

<details><summary><code>cds-page-tabs-arrive</code></summary>

```css
@keyframes cds-page-tabs-arrive { 0%{translate:var(--cds-page-header-tabs-pull);animation-timing-function:cubic-bezier(.45,0,.55,1)}.005%,to{translate:0} }
```

</details>

<details><summary><code>cds-page-title-leaves</code></summary>

```css
@keyframes cds-page-title-leaves { 0%{opacity:1;transform:none}.001%,to{opacity:0;transform:translateY(20px)scale(.96)} }
```

</details>

<details><summary><code>cds-placeholder-reveal</code></summary>

```css
@keyframes cds-placeholder-reveal { 0%{opacity:0}to{opacity:1} }
```

</details>

<details><summary><code>cds-reveal-in</code></summary>

```css
@keyframes cds-reveal-in { 0%{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none} }
```

</details>

<details><summary><code>cds-reveal-out</code></summary>

```css
@keyframes cds-reveal-out { 0%{opacity:1;transform:none}to{opacity:0;transform:translateY(4px)} }
```

</details>

<details><summary><code>cds-scroll-fade-bottom</code></summary>

```css
@keyframes cds-scroll-fade-bottom { 0%{--cds-scroll-fade-bottom-raw:var(--cds-scroll-fade-size)}to{--cds-scroll-fade-bottom-raw:0px} }
```

</details>

<details><summary><code>cds-scroll-fade-left</code></summary>

```css
@keyframes cds-scroll-fade-left { 0%{--cds-scroll-fade-left-raw:0px}to{--cds-scroll-fade-left-raw:var(--cds-scroll-fade-size)} }
```

</details>

<details><summary><code>cds-scroll-fade-right</code></summary>

```css
@keyframes cds-scroll-fade-right { 0%{--cds-scroll-fade-right-raw:var(--cds-scroll-fade-size)}to{--cds-scroll-fade-right-raw:0px} }
```

</details>

<details><summary><code>cds-scroll-fade-strip-active</code></summary>

```css
@keyframes cds-scroll-fade-strip-active { 0%,to{--cds-scroll-fade-strip-active:1} }
```

</details>

<details><summary><code>cds-scroll-fade-strip-in</code></summary>

```css
@keyframes cds-scroll-fade-strip-in { 0%{--cds-scroll-fade-strip-raw:0}to{--cds-scroll-fade-strip-raw:1} }
```

</details>

<details><summary><code>cds-scroll-fade-strip-out</code></summary>

```css
@keyframes cds-scroll-fade-strip-out { 0%{--cds-scroll-fade-strip-raw:1}to{--cds-scroll-fade-strip-raw:0} }
```

</details>

<details><summary><code>cds-scroll-fade-top</code></summary>

```css
@keyframes cds-scroll-fade-top { 0%{--cds-scroll-fade-top-raw:0px}to{--cds-scroll-fade-top-raw:var(--cds-scroll-fade-size)} }
```

</details>

<details><summary><code>cds-scroll-fade-x-active</code></summary>

```css
@keyframes cds-scroll-fade-x-active { 0%,to{--cds-scroll-fade-x-active:1} }
```

</details>

<details><summary><code>cds-scroll-fade-y-active</code></summary>

```css
@keyframes cds-scroll-fade-y-active { 0%,to{--cds-scroll-fade-y-active:1} }
```

</details>

<details><summary><code>cds-slide-in-end</code></summary>

```css
@keyframes cds-slide-in-end { 0%{opacity:0;transform:translate(12px)} }
```

</details>

<details><summary><code>cds-slide-in-start</code></summary>

```css
@keyframes cds-slide-in-start { 0%{opacity:0;transform:translate(-12px)} }
```

</details>

<details><summary><code>cq-fadeIn</code></summary>

```css
@keyframes cq-fadeIn { 0%{opacity:0} }
```

</details>

### Exits

<details><summary><code>cds-attachment-out</code></summary>

```css
@keyframes cds-attachment-out { to{opacity:0;transform:scale(.5)} }
```

</details>

<details><summary><code>cds-pill-out</code></summary>

```css
@keyframes cds-pill-out { 0%{opacity:1;transform:none} }
```

</details>

<details><summary><code>cds-pill-roll-out</code></summary>

```css
@keyframes cds-pill-roll-out { 0%{opacity:1;transform:none} }
```

</details>

### Collapse / expand

<details><summary><code>cds-grid-rows-in</code></summary>

```css
@keyframes cds-grid-rows-in { 0%{grid-template-rows:0fr} }
```

</details>

### Pills

<details><summary><code>cds-pill-dip-down</code></summary>

```css
@keyframes cds-pill-dip-down { to{transform:scale(.82)} }
```

</details>

<details><summary><code>cds-pill-dip-up</code></summary>

```css
@keyframes cds-pill-dip-up { 0%{transform:scale(.82)} }
```

</details>

<details><summary><code>cds-pill-in</code></summary>

```css
@keyframes cds-pill-in { 0%{transform:scale(.8)} }
```

</details>

<details><summary><code>cds-pill-pop-down</code></summary>

```css
@keyframes cds-pill-pop-down { 0%{transform:scale(1.32)} }
```

</details>

<details><summary><code>cds-pill-pop-up</code></summary>

```css
@keyframes cds-pill-pop-up { to{transform:scale(1.32)} }
```

</details>

<details><summary><code>cds-pill-roll-in-down</code></summary>

```css
@keyframes cds-pill-roll-in-down { 0%{opacity:0;transform:translateY(-70%)} }
```

</details>

<details><summary><code>cds-pill-roll-in-up</code></summary>

```css
@keyframes cds-pill-roll-in-up { 0%{opacity:0;transform:translateY(70%)} }
```

</details>

### Skeletons and shimmer

<details><summary><code>cds-shimmer</code></summary>

```css
@keyframes cds-shimmer { 0%{transform:translate(-100%)}to{transform:translate(100%)} }
```

</details>

<details><summary><code>cds-shimmer-text-band</code></summary>

```css
@keyframes cds-shimmer-text-band { 0%,15%{animation-timing-function:cubic-bezier(.714,.121,.211,.888);translate:-62.5%}85%,to{translate:-12.5%} }
```

</details>

<details><summary><code>cds-shimmer-text-band-rtl</code></summary>

```css
@keyframes cds-shimmer-text-band-rtl { 0%,15%{animation-timing-function:cubic-bezier(.714,.121,.211,.888);translate:-12.5%}85%,to{translate:-62.5%} }
```

</details>

<details><summary><code>cds-shimmer-text-band-strong</code></summary>

```css
@keyframes cds-shimmer-text-band-strong { 0%,5%{animation-timing-function:cubic-bezier(.4,.15,.6,.85);translate:-62.5%}95%,to{translate:-12.5%} }
```

</details>

<details><summary><code>cds-shimmer-text-band-strong-rtl</code></summary>

```css
@keyframes cds-shimmer-text-band-strong-rtl { 0%,5%{animation-timing-function:cubic-bezier(.4,.15,.6,.85);translate:-12.5%}95%,to{translate:-62.5%} }
```

</details>

<details><summary><code>cds-shimmer-text-shine</code></summary>

```css
@keyframes cds-shimmer-text-shine { 0%,15%{background-position:83.333% 0;animation-timing-function:cubic-bezier(.714,.121,.211,.888)}85%,to{background-position:16.667% 0} }
```

</details>

<details><summary><code>cds-shimmer-text-shine-rtl</code></summary>

```css
@keyframes cds-shimmer-text-shine-rtl { 0%,15%{background-position:16.667% 0;animation-timing-function:cubic-bezier(.714,.121,.211,.888)}85%,to{background-position:83.333% 0} }
```

</details>

<details><summary><code>cds-shimmer-text-shine-strong</code></summary>

```css
@keyframes cds-shimmer-text-shine-strong { 0%,5%{background-position:83.333% 0;animation-timing-function:cubic-bezier(.4,.15,.6,.85)}95%,to{background-position:16.667% 0} }
```

</details>

<details><summary><code>cds-shimmer-text-shine-strong-rtl</code></summary>

```css
@keyframes cds-shimmer-text-shine-strong-rtl { 0%,5%{background-position:16.667% 0;animation-timing-function:cubic-bezier(.4,.15,.6,.85)}95%,to{background-position:83.333% 0} }
```

</details>

<details><summary><code>cds-skeleton-breathe</code></summary>

```css
@keyframes cds-skeleton-breathe { 0%,to{opacity:1}50%{opacity:.6} }
```

</details>

<details><summary><code>cds-skeleton-sweep</code></summary>

```css
@keyframes cds-skeleton-sweep { 0%{transform:translate(-100%)}to{transform:translate(100%)} }
```

</details>

<details><summary><code>shimmer</code></summary>

```css
@keyframes shimmer { to{transform:translateX(100%)} }
```

</details>

### Working indicators

<details><summary><code>cds-dot-pulse</code></summary>

```css
@keyframes cds-dot-pulse { 0%,5%{opacity:.2857;animation-timing-function:cubic-bezier(.165,.84,.44,1)}15%,25%{opacity:1;animation-timing-function:cubic-bezier(.165,.84,.44,1)}65%,to{opacity:.2857} }
```

</details>

<details><summary><code>cds-working-dot-halo</code></summary>

```css
@keyframes cds-working-dot-halo { 50%{opacity:.3;transform:scale(1.5)} }
```

</details>

<details><summary><code>cds-working-dot-lands</code></summary>

```css
@keyframes cds-working-dot-lands { 0%{clip-path:circle(calc(.25rem * var(--cds-rem-scale,1)))}to{clip-path:circle(50%)} }
```

</details>

<details><summary><code>cds-working-dot-veil</code></summary>

```css
@keyframes cds-working-dot-veil { 0%{opacity:1} }
```

</details>

### Sticky edges

<details><summary><code>cds-sticky-edge-active</code></summary>

```css
@keyframes cds-sticky-edge-active { 0%,to{--cds-sticky-edge-active:1} }
```

</details>

<details><summary><code>cds-sticky-edge-end</code></summary>

```css
@keyframes cds-sticky-edge-end { 0%{--cds-sticky-edge-end:1}to{--cds-sticky-edge-end:0} }
```

</details>

<details><summary><code>cds-sticky-edge-start</code></summary>

```css
@keyframes cds-sticky-edge-start { 0%{--cds-sticky-edge-start:0}to{--cds-sticky-edge-start:1} }
```

</details>

### Check / resolve

<details><summary><code>cds-resolve-glyph</code></summary>

```css
@keyframes cds-resolve-glyph { 0%,74.9%{color:inherit}75%,to{color:var(--cds-on-accent)} }
```

</details>

<details><summary><code>cds-resolve-square</code></summary>

```css
@keyframes cds-resolve-square { 0%{stroke-dashoffset:52px;fill-opacity:0}50%{stroke-dashoffset:0;fill-opacity:0}to{stroke-dashoffset:0;fill-opacity:1} }
```

</details>

### Misc

<details><summary><code>cds-editor-comment-working</code></summary>

```css
@keyframes cds-editor-comment-working { 50%{background-color:var(--cds-bg-editor-comment-active)} }
```

</details>

<details><summary><code>cds-flipbook</code></summary>

```css
@keyframes cds-flipbook { 0%{transform:translate(0)}to{transform:translateX(var(--cds-flipbook-span))} }
```

</details>

<details><summary><code>cq-slipIn</code></summary>

```css
@keyframes cq-slipIn { 0%{opacity:0;transform:translateY(12px)} }
```

</details>

<details><summary><code>spin</code></summary>

```css
@keyframes spin { to{transform:rotate(360deg)} }
```

</details>
