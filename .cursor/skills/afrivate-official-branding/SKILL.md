---
name: afrivate-official-branding
description: >-
  Produces AfriVate official documents in the locked brand system (purple logo header, meta card, A4 PDF).
  Use when creating, rebranding, or restyling any letter, form, memo, policy, handbook, shooting guide,
  appraisal, scorecard, job post, engagement letter, Word/DOCX, PDF, or “branded” / “official” document.
  Also use when the user says make it look like AfriVate, match our branding, or other Grok bots failed
  to match the official look.
---

# AfriVate official document branding

Do not invent a look. Do not use Canva, Google Docs themes, markdown-as-the-deliverable, or a different purple.

The locked system lives in `docs/official/render/brandedGuide.mjs`. Call it.

## Tokens (do not change)

| Token | Value |
|---|---|
| Purple | `#8d4087` |
| Ink | `#1f1f1f` |
| Muted | `#5f5f5f` |
| Line | `#ebdceb` |
| Soft | `#f8f3f8` |
| Type | Inter, Segoe UI, Arial, sans-serif |
| Logo | `docs/official/brand/afrivate-logo-long-purple.png` |
| Legal | AfriVate Technologies Ltd · RC 9210092 |
| Contact | hr@afrivate.org |

Chip text (right of logo), always:

```
Official Document
AfriVate Technologies Ltd
RC: 9210092
```

## Workflow

1. Write the body as HTML in `docs/official/render/content/<name>-body.mjs`.
2. Create `docs/official/render/render-<name>.mjs` that calls `renderOfficialDocument` from `brandedGuide.mjs`.
3. Run `node docs/official/render/render-<name>.mjs`.
4. Deliver HTML + PDF under the matching `docs/official/` folder. Copy the PDF to Downloads.
5. If the user needs to fill it in, also generate DOCX with the same logo header (see [reference.md](reference.md)).

```js
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderOfficialDocument } from './brandedGuide.mjs'
import { myBody } from './content/my-body.mjs'

const officialRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

await renderOfficialDocument({
  title: 'Document Title',
  metaRows: [
    ['Document Code', 'AFRI-XXX-01'],
    ['Status', 'Official — …'],
    ['Applies To', '…'],
    ['Issued', '12 September 2026'],
    ['Owner', 'People &amp; Culture'],
    ['Contact', 'hr@afrivate.org'],
  ],
  body: myBody,
  outDir: path.join(officialRoot, 'policies'), // or ops / hiring / …
  outBase: 'Afrivate-Document-Title',
  footerLeft: 'hr@afrivate.org · AFRI-XXX-01',
})
```

## Shell (must appear)

1. Logo left + chip right, purple 2px rule under the row
2. Centred uppercase `h1`
3. Soft rounded **meta** card (label 140px / value)
4. Body: purple uppercase `h2` with hairline; `.note` callouts; tables with purple header text on soft fill
5. Sign-off from `hr-signature.mjs` when the document is issued
6. PDF footer: left `hr@afrivate.org · …` · right `RC: 9210092 · Page n of n`

Gold-standard examples: `docs/official/ops/Afrivate-CEO-Video-Series-Shooting-Guide.html`, `docs/official/policies/Afrivate-Performance-Appraisal-Form.html`.

## Copy rules

- Default person: **Team Member**, not Employee (Employee only if a paid contract exists)
- Slack coordinates; Portal is the system of record; WhatsApp is informal/emergency only
- Most internal people are unpaid Internal Contributors under AFRI-ICEF-01 — say so when the document could be read as creating employment or pay
- Import signatories from `docs/official/render/hr-signature.mjs` — do not invent names
- Extra CSS is allowed (forms, shoot cards). Extra colours are not. Stay on the five tokens.

## Where files go

| Kind | Folder |
|---|---|
| Policies, handbooks, forms | `docs/official/policies/` |
| Ops briefs, shooting guides | `docs/official/ops/` |
| Letters, job posts, kits | `docs/official/hiring/…` |

Code pattern: `AFRI-XXX-01`. Filename: `Afrivate-<Title>.html/.pdf` (+ `.docx` if fillable).

## Forbidden

- Dropping the logo or chip
- A different purple, navy-gold “corporate” palette, or stock templates
- Hand-rolled CSS that replaces `GUIDE_CSS`
- Markdown or unstyled HTML as the finished document
- Fake office photography as brand decoration
