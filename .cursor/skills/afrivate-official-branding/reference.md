# AfriVate official branding — reference

## Shared modules

- CSS + PDF writer: `docs/official/render/brandedGuide.mjs`
  - `GUIDE_CSS` — locked page chrome
  - `SIGN_CSS` — `.sign-block` / `.sign-row` / `.sign-card`
  - `BRAND` — tokens
  - `wrapOfficialDocument({ title, metaRows, body, extraCss })`
  - `renderOfficialDocument({ … })` — writes HTML + A4 PDF, copies PDF to Downloads
- Signatories: `docs/official/render/hr-signature.mjs`
- Logo (print): `docs/official/brand/afrivate-logo-long-purple.png`
- Logo (web-sized): `docs/official/brand/afrivate-logo-long-purple-web.png`
- Mark only: `docs/official/brand/afrivate-logo-mark-purple.png` — do not use in the letterhead in place of the long logo

## PDF settings (locked)

- Format A4
- `printBackground: true`
- Header empty
- Footer 9px `#666`, padding `0 18mm`, Segoe UI / Arial
- Margins `{ top: '14mm', right: '14mm', bottom: '16mm', left: '16mm' }`

## Useful extra CSS (still on-token)

```css
.note { /* already in GUIDE_CSS */ }
.split { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.box { border: 1px solid var(--line); border-radius: 8px; padding: 10px 12px; }
.pill {
  background: var(--soft); border: 1px solid var(--line); color: var(--purple);
  font-size: 9px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
  padding: 3px 9px; border-radius: 999px;
}
td.fill { height: 28px; background: #fff; }
.comment {
  min-height: 78px; border: 1px solid var(--line); border-radius: 8px; background: #fff;
}
```

## DOCX letterhead (when Word is required)

Use `docx` (`ImageRun`). Same purple `#8D4087`, soft `#F8F3F8`, line `#EBDCEB`.

Header row, no borders:

- Left: logo at 154×49 px from `afrivate-logo-long-purple.png`
- Right, muted 8–9pt, right-aligned:
  - Official Document
  - AfriVate Technologies Ltd
  - RC: 9210092
- Then a purple bottom border (size ~18, colour `8D4087`)
- Title: Calibri, all caps, purple, centred
- Meta: two-column table, soft fill
- Footer: `hr@afrivate.org · AFRI-XXX-01 · portal.afrivate.org` and `AfriVate Technologies Ltd · RC: 9210092`

See `docs/official/render/render-appraisal-form.mjs` and `docs/official/render/render-equity-engagement-letters-docx.py`.

## Meta rows (typical)

Always include Document Code and Contact. Add the rest that fit:

- Status
- Applies To / Audience
- Issued / Effective Date / Last updated
- Owner
- Related (other AFRI codes)
- To / From (letters and briefs)

## Body HTML habits

- `h2` numbered sections (`1. Title`)
- `.note` for how-to-use / status / legal ceiling
- Tables for anything tabular
- `People &amp; Culture` not “HR” in headings (HR is fine in “HR use only” boxes)
- Import `${hrSignBlockIssuedHtml}` at the end of issued instruments
