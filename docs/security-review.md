# Security and Privacy Review

This document records the Step 5 security and privacy review of the Arcade Circle repository. It covers five main risk areas across the database schema, the account deletion function, check-in links, location and presence sharing, and the Git commit history, along with the controls in place and the check-in origin validation fix added in this step.

## 1. Unauthorised access to accounts, messages, follows, and sessions

### Risk

The browser connects directly to Supabase using the project URL and publishable key (`src/lib/supabase.js`, lines 14 to 29). Because those two values are shipped to every client, a signed-in user or an anonymous visitor could call the PostgREST or Realtime APIs directly outside the React interface to read private conversations, forge sender identities, alter message contents, join private sessions, or watch when other players unfollow someone.

### Controls

Every table created in `supabase/migrations/` revokes all default grants from `anon`, grants only the minimum required table and column privileges to `authenticated`, and enables Row Level Security:

- **Profiles (`public.profiles`):** Created in `supabase/migrations/20260913140043_accounts_and_messaging.sql` (lines 29 to 37) with Row Level Security enabled at line 254. Signed-in users can read profiles to search for friends (`profiles_select`, lines 261 to 263), but can only insert or update their own row (`profiles_insert_own` and `profiles_update_own`, lines 266 to 274). Anonymous callers cannot read `profiles` at all; before sign-up, handle availability is checked through the `security definer` function `public.handle_available` (lines 51 to 65), which returns only a boolean.
- **Follows and realtime notices (`public.follows` and `public.follow_changes`):** `public.follows` enables Row Level Security at `supabase/migrations/20260913140043_accounts_and_messaging.sql` (line 255) and only lets a user view edges that touch them (`follows_select_own`, lines 280 to 282) or write edges where `follower_id = auth.uid()` (lines 285 to 292). Because Supabase Realtime cannot evaluate Row Level Security on `DELETE` events, `follows` is kept off the realtime publication (`supabase/migrations/20260913144547_follow_changes_realtime.sql`, lines 6 to 21). Instead, the trigger `follows_notify_change` (lines 73 to 76) writes insert-only notices into `public.follow_changes` (lines 27 to 33), where Row Level Security (`follow_changes_select_own`, lines 83 to 88) restricts delivery to `user_id = auth.uid()`.
- **Blocks (`public.blocks`):** Created in `supabase/migrations/20260914012517_message_requests_and_blocks.sql` (lines 86 to 92) with Row Level Security enabled at line 122. Clients have no direct `insert` or `delete` grant on `blocks` (lines 118 to 120). Blocking and unblocking run through `public.block_user` and `public.unblock_user` (lines 373 to 421), and `block_user` also removes follow edges in both directions (lines 396 to 398). Only the blocker can read their own block rows (`blocks_select_own`, lines 125 to 127), while `public.is_blocked_between` (lines 99 to 114) hides blocked threads from both sides without telling the blocked account that a block exists.
- **Conversations and messages (`public.conversations` and `public.messages`):** Row Level Security is enabled on both tables in `supabase/migrations/20260913140043_accounts_and_messaging.sql` (lines 256 to 257), with policies updated for message requests and blocks in `supabase/migrations/20260914012517_message_requests_and_blocks.sql` (lines 477 to 503). Clients have `select` only on `conversations` (`20260913140043_accounts_and_messaging.sql`, lines 243 to 244); opening a conversation and answering a request must go through `get_or_create_conversation` (lines 234 to 294), `accept_request` (lines 302 to 330), and `decline_request` (lines 332 to 364) in `20260914012517_message_requests_and_blocks.sql`. That function also caps a sender at 20 unanswered requests per day (lines 274 to 281), while the `messages_guard_request` trigger (lines 184 to 218) takes a transaction advisory lock and limits an unanswered request to a single message. On `messages`, authenticated users are only granted `update (read_at)` (`20260913140043_accounts_and_messaging.sql`, line 248) and the `messages_mark_read` policy (`20260914012517_message_requests_and_blocks.sql`, lines 499 to 502) only allows marking messages sent by the other participant, preventing anyone from editing message text or spoofing `sender_id`.
- **Sessions (`public.sessions` and `public.session_members`):** Created in `supabase/migrations/20260914051543_sessions_and_presence.sql` (lines 37 to 68) with Row Level Security enabled at lines 126 to 127. Closed sessions are visible only to the host and invited or going members (`can_view_session`, lines 80 to 101; `sessions_select_visible`, lines 134 to 136), and blocked users are excluded (line 91). The `session_members_lock_keys` trigger (lines 185 to 202) prevents a user from updating `session_id` or `user_id` on an existing membership row to sneak into a closed session.

## 2. Privileged account deletion and service role isolation

### Risk

Deleting an account from `auth.users` requires the Supabase `service_role` key, which bypasses all Row Level Security policies. Shipping that key to the browser would expose every user's account and data. Even when kept in a server function, accepting a target user ID from the request body or query string would allow one signed-in user to delete another player's account.

### Controls

- **Server-only service key:** `src/lib/supabase.js` (lines 5 to 29) and `.env.example` (lines 1 to 5) only expose `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to the browser. Account deletion is handled by the Edge Function `supabase/functions/delete-account/index.ts`, which reads `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from the server runtime environment (`index.ts`, lines 43 to 48).
- **Caller verification from the bearer token alone:** `supabase/functions/delete-account/index.ts` rejects any method other than `POST` and `OPTIONS` (lines 37 to 38), extracts the bearer token from the `Authorization` header (lines 40 to 41), and verifies it via `admin.auth.getUser(token)` (lines 56 to 58). The function never reads the request body or URL query parameters; it passes `user.id` from the verified token straight to `admin.auth.admin.deleteUser(user.id)` (line 60), and error logging at line 63 prints only `user.id` and the error message, never the token or secret key.
- **Database cascade and client cleanup:** Deleting the `auth.users` row cascades through `profiles`, `follows`, `blocks`, `conversations`, `messages`, `sessions`, and `presence` (`supabase/migrations/20260913140043_accounts_and_messaging.sql`, lines 30, 109 to 110, 143 to 144, 216 to 217; `20260914012517_message_requests_and_blocks.sql`, lines 427 to 468). On the client, `src/screens/DeleteAccount.jsx` (lines 16 to 32, 52 to 66) requires the user to type their own handle before calling `deleteOwnAccount()` (`src/lib/accounts.js`, lines 569 to 578), and `src/lib/auth.jsx` (lines 172 to 183) immediately clears the local session and unmounts per-user state.

## 3. Forged check-in links, QR codes, and print-sheet base URLs

### Risk

Machine QR stickers and NFC tags carry plain HTTPS links (`?checkin=<venue>&game=<game>`) so phone cameras and system NFC readers can open them directly (`src/lib/checkinLink.js`, lines 5 to 37). This introduces two security risks:

1. A crafted QR code, NFC tag, or shared URL could attempt to inject a `javascript:` payload, prototype property names such as `__proto__` or `constructor`, an untrusted external phishing domain, a protocol-relative URL starting with two forward slashes, embedded URL credentials, an insecure `http:` link for a remote host, or a non-root path.
2. The organiser print sheet (`src/print/PrintCodes.jsx`, lines 55 to 66) reads an optional `?base=` query parameter to generate stickers for another deployment. Previously, `baseFromAddress()` accepted any `http:` or `https:` URL, so a crafted `?base=` link on `print.html` could cause an organiser to print official-looking stickers whose QR codes and NFC links pointed players to an external site. In addition, `withoutCheckInParams` in `src/lib/checkinLink.js` returned `url.pathname` directly, which could leave multiple leading slashes on the path passed to `window.history.replaceState` (`src/lib/pendingCheckIn.js`, line 52).

### Controls and Step 5 Fix

- **Scheme, venue, and own-property checks:** `resolveCheckIn` (`src/lib/checkinLink.js`, lines 119 to 127) checks the venue against `ARCADES` and verifies the game using `Object.hasOwn(arcade.games, code.gameId)` so inherited prototype properties (`__proto__`, `constructor`, `toString`) never resolve as games (`src/lib/checkinLink.test.js`, lines 88 to 94). Profile QR codes are separately constrained to the `arcadecircle:` profile scheme and validated against a strict UUID regular expression in `src/lib/accountRules.js` (lines 123 to 139).
- **One-time use and short expiry:** `takeCheckInLink` in `src/lib/pendingCheckIn.js` (lines 30 to 76) strips the `checkin` and `game` parameters from the browser address bar as soon as the page loads (line 52) so reloading or sharing a screenshot does not re-trigger the check-in, and expires any pending link held in `sessionStorage` during sign-in after 10 minutes (`KEEP_MS`, line 25 and line 64).
- **Trusted origin and path validation (Step 5 fix):** We added `trustedBaseOrigin` in `src/lib/checkinLink.js` (lines 51 to 74) and applied it across `checkInUrl` (lines 77 to 83), `readCheckInCode` (lines 90 to 103), `withoutCheckInParams` (lines 134 to 140), and `baseFromAddress` in `src/print/PrintCodes.jsx` (lines 3 and 59 to 66). Check-in links and print-sheet base origins now reject protocol-relative strings, URLs carrying a username or password, non-root paths, plain `http:` on non-local hosts, and any domain outside the project's trusted deployments (`arcade-circle.vercel.app`, `*.vercel.app`, `*.netlify.app`, and `localhost` or `127.0.0.1` for local development). `withoutCheckInParams` also collapses multiple leading slashes on `url.pathname` (line 138). Unit tests for all of these cases live in `src/lib/checkinLink.test.js` (lines 96 to 139).

## 4. Presence visibility and live location privacy

### Risk

Letting anyone see which arcade a player is at or broadcasting live GPS coordinates from their phone creates a personal safety and stalking risk. Field study participants stated that they only wanted people they know to see their arcade presence and did not want strangers approaching or tracking them (`README.md`, lines 163 to 186, 224 to 228).

### Controls

- **GPS coordinates never leave the device:** `src/screens/FriendsMap.jsx` (lines 250 to 276) uses `navigator.geolocation.watchPosition` only to update local component state (`me`) and draw the player's own marker on their screen. Coordinates are never written to Supabase, attached to a check-in, or sent to another browser (`src/screens/Scan.jsx`, line 98).
- **Coarse venue presence with expiry:** `public.presence` (`supabase/migrations/20260914051543_sessions_and_presence.sql`, lines 208 to 220) stores only `venue_id`, `game_id`, queue `position`, `active`, `visible`, and timestamps. `fetchPresence` in `src/lib/accounts.js` (lines 501 to 509) ignores check-ins older than 6 hours so a forgotten check-in does not stay on the map indefinitely.
- **Mutual-by-default audience and per-check-in opt-out:** Row Level Security on `public.presence` (`supabase/migrations/20260914062751_presence_audience.sql`, lines 37 to 69) and the realtime notice list `public.presence_audience_of` (lines 75 to 97) restrict visibility to mutual followers by default (`presence_audience = 'mutuals'`, lines 16 to 30). A player can widen their audience to `followers` or switch sharing off altogether under `Me` (`src/screens/MeTab.jsx`, lines 190 to 224), and can also turn sharing off for an individual check-in on `src/screens/CheckIn.jsx` (lines 123 to 168), which still counts them anonymously in the venue queue (`src/App.jsx`, lines 813 to 836).

## 5. Secrets and private research data in the Git history

### Risk

Committing `.env.local` files, Supabase `service_role` keys, database passwords, or raw interview transcripts would permanently leak credentials or identifiable participant statements in the public Git history.

### Controls

- **Git ignore rules and safe environment placeholders:** `.gitignore` (lines 1 to 22) blocks `.env` and `.env.*` while keeping `!.env.example`, and blocks `*.txt` and `*.pdf` so raw field interview transcripts and unit files cannot be staged accidentally (`README.md`, lines 428 to 429). `.env.example` (lines 1 to 5) holds only empty placeholders for `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- **Full history audit:** We inspected every commit and diff across all three branches (`main`, `feature/real-accounts-messaging`, and `sprint-4-less-text`). Only `.env.example` was ever committed (commit `5f21967`), and no real API key, service role secret, JWT, database password, or interview transcript exists anywhere in the repository history.
