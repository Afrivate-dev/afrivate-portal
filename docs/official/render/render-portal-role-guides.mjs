/**
 * Staff + Team Lead Portal User Guides → HTML + PDF.
 * Run: node docs/official/render/render-portal-role-guides.mjs
 */
import { renderBrandedGuides } from './brandedGuide.mjs'

await renderBrandedGuides([
  {
    title: 'AfriVate Team Space — Staff Portal Guide',
    code: 'AFRI-PUG-02',
    audience: 'Team members (ordinary staff)',
    lastUpdated: '14 August 2026',
    bodyFile: 'portal-user-guide-staff-body.html',
    outBase: 'Afrivate-Portal-User-Guide-Staff',
  },
  {
    title: 'AfriVate Team Space — Team Lead Portal Guide',
    code: 'AFRI-PUG-03',
    audience: 'Team leads and assistant leads',
    lastUpdated: '14 August 2026',
    bodyFile: 'portal-user-guide-lead-body.html',
    outBase: 'Afrivate-Portal-User-Guide-Team-Lead',
  },
])
