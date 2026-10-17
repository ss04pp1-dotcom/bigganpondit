# V3 Reference Design Update

This version keeps the existing Next.js + Cloudflare Workers + D1 + R2 + Auth functionality and applies a UI redesign based on the supplied 10-panel reference image.

Updated areas:
- Compact navy sidebar and white top bar
- Reference blue primary controls
- Compact white cards/tables/forms
- Reference-style dashboard heading, statistics, merit table and quick actions
- Reference-style teacher login composition using a crop of the user-supplied reference as the branding background
- Student dashboard changed to a light profile card with three quick-action cards
- Mobile responsive behavior retained

Functional code was intentionally preserved except for UI markup changes needed for the reference layout.

Build note: dependencies were not available in the sandbox and `npm install` timed out, so a full production build could not be completed in this environment.
