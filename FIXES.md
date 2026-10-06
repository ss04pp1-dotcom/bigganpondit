# Fixed build notes

This package is a fixed revision of the supplied Biggan Pondit project.

## Security fixes
- Teacher result queries now reject explicitly requested subjects outside the teacher permission set.
- Teacher queries with zero subject permissions no longer fall back to all subjects.
- Student edit validates class/division consistency server-side.

## Result/report fixes
- Monthly individual reports now include each exam row followed by the subject aggregate.
- Shared result calculations remain centralized.

## Student management
- Student creation now returns the new student ID and the UI can upload a photo immediately after creation.

## Dependency cleanup
- Removed unused Prisma and NextAuth runtime dependencies from package.json; this project uses D1 and its own Worker-compatible session layer.

## v3 follow-up fixes
- Student edit no longer fails when the password field is left blank (password is omitted from the PATCH payload).
- Pending student photo preview now uses a memoized object URL that is revoked on change/unmount (no leak).
- Photo upload after student creation is wrapped in try/catch with a 5 MB client-side check; ImageUpload revokes its temporary object URL.
- Removed stray tsconfig.tsbuildinfo from the package.
- NOTE: bun.lock still lists Prisma/NextAuth; run `bun install` once to regenerate it.

## Verification
- Source-level review completed.
- A full Cloudflare production build should be run after installing dependencies in a network-enabled environment.
