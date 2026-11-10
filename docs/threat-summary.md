# Threat Summary

## Authentication

Arcade Circle authenticates players with email and password through Supabase Auth (`signUp` and `signInWithPassword`). The browser holds only the public Supabase project URL and publishable key, and restores sessions through a bounded 15-second session resolver so a stalled profile fetch falls back to the signed-out screen instead of hanging. Signing out or switching accounts unmounts the main prototype component keyed by user ID, clearing all in-memory threads and navigation state from the screen. Privileged actions never run in the browser: account deletion runs in the `delete-account` Supabase Edge Function, which verifies the caller's session bearer token on the server and deletes only that caller's own account.

## Stored Data

- **Accounts:** Supabase stores email addresses and password hashes in `auth.users`, and stores each player's public username (`handle`), avatar colour (`avatar_hue`), and presence audience setting (`mutuals` or `followers`) in `public.profiles`, alongside `public.follows` and `public.blocks`. Sample players used for the unauthenticated demo remain in local client code and never mix with real accounts.
- **Messages:** Private chats and message requests are stored in `public.conversations` and `public.messages` (up to 1000 characters per message). Unanswered requests to non-mutual accounts are held to a single message by a database trigger, and declining or blocking tells the sender nothing. Deleting an account cascades and removes all of its conversations and messages.
- **Presence and location:** Live GPS coordinates from the browser Geolocation API stay strictly in memory on the player's own device to draw their position dot on the map and are never sent to Supabase. Shared check-ins in `public.presence` record only the arcade venue ID, game ID, queue position, and check-in time (filtered out after 6 hours), and are hidden whenever the player turns sharing off.
- **Check-in photos:** Camera video frames used to scan machine QR stickers or profile QR codes are read locally in the browser by `QrScanner` inside a `<video>` element. No check-in photos or video frames are ever saved to local storage or uploaded to any server, and the camera stream stops as soon as scanning completes or the screen closes.

## Third-Party Services

- **Supabase:** Hosts the PostgreSQL database, Row Level Security policies, Realtime change notifications, email authentication, and the `delete-account` Deno Edge Function.
- **Vercel:** Builds and serves the production web app (`arcade-circle.vercel.app`) and pull request preview deployments using only the public Supabase URL and publishable key.
- **Netlify:** Builds deploy previews (`arcade-comparison`) and runs header, redirect, and changed-page checks on pull requests, without access to any private backend keys.

## Three Key Controls

1. **Row Level Security and database functions on every table:** All eight tables in `public` revoke anonymous access and enforce Row Level Security so players can only access rows they own or are allowed to see, while sensitive state changes (opening threads, answering requests, blocking, and realtime follow or presence notices) are restricted to `security definer` functions and triggers.
2. **Server-side token verification for account deletion:** The `delete-account` Edge Function keeps the `service_role` key on the server, ignores all request body and query parameters, validates the caller's JWT with `admin.auth.getUser(token)`, and deletes only that authenticated user.
3. **Trusted-origin and own-property validation on check-in links:** Check-in links and print-sheet base URLs allow only HTTPS origins for the app's trusted deployments (or localhost in development) on the root path, verify venue and game IDs with `Object.hasOwn`, strip check-in parameters from the address bar immediately after reading, and expire pending links in `sessionStorage` after 10 minutes.

## Two Escalation Points

1. **Credential exposure or unauthorised access to player data:** If a Supabase `service_role` key, database password, or GitHub token is leaked, or if Row Level Security is bypassed and real account emails or private messages are exposed, notify the project leader and repository owner (`le23967`) immediately to rotate the credentials in Supabase, Vercel, and GitHub and revoke active sessions, and inform the UTS subject tutor and coordinator within 24 hours.
2. **Player safety, harassment, or research participant privacy concerns:** If a player or field study participant reports that presence sharing, messaging, or arcade QR stickers are being misused to track or harass someone at a venue, or asks to withdraw their data, contact the project leader and the UTS subject coordinator straight away so the offending account can be blocked or deleted, any affected stickers removed, and ethics requirements followed.
