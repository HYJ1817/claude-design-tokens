# Notice

## What this repository is

A set of **design values** — colour codes, spacing numbers, durations, easing
curves, and `@keyframes` bodies — read out of the publicly distributed Claude
desktop application, plus the tooling that reads them.

It exists so that people building Claude-compatible or Claude-adjacent interfaces
can match the visual language without guessing hex codes off screenshots.

## What this repository is not

- **Not Anthropic source code.** No JavaScript, TypeScript, or JSX from the
  application is reproduced. The extractor reads only CSS custom-property
  declarations, `@keyframes` blocks, and `@font-face` descriptors.
- **Not a redistribution of assets.** No font binaries, no icon fonts
  (`anthropicons`), no images, no audio.
- **Not affiliated with or endorsed by Anthropic.** "Claude" and "Anthropic" are
  trademarks of Anthropic PBC. This project is unaffiliated.

## Legal position

Design tokens are functional values — a hex code and a duration are facts about
how a product looks, not creative expression. Publishing them is comparable to
publishing a colour picker reading or a measured layout spec.

That said, this is a judgement call, not a legal guarantee. If you are Anthropic
and you want something here changed or removed, open an issue and it will be
handled promptly.

**The extracted values are provided as-is for interoperability and study.** The
MIT licence below covers the tooling in `scripts/` and `src/`. It does not purport
to grant rights over Anthropic's visual design, trademarks, or fonts.

## Trademarks

Do not use this repository to imply that your project is Claude, is made by
Anthropic, or is endorsed by Anthropic. If you build something with these tokens,
name it your own thing.

## Fonts

`--cds-font-sans` and `--font-anthropic-sans` reference Anthropic's typefaces by
name. Those binaries are **not** included and are not redistributable. The token
definitions carry a full system fallback chain, so nothing breaks without them.

## Third-party content

`data/report.json` and `data/tokens.json` contain values from Tailwind CSS v4
runtime variables (`--tw-*`). Those are filtered out of the generated
stylesheets and retained in the raw dump only for completeness. Tailwind CSS is
MIT licensed.
