import { ARCADES } from '../data.js'

/* Check-in codes.

   What a sticker on a machine carries, whether it is read as a printed QR
   code or off an NFC tag: an ordinary link to this app that names the
   arcade and the game, and nothing else.

     https://arcade-circle.vercel.app/?checkin=koko-town-hall&game=maimai

   It is a plain https link on purpose. That is the one thing every phone
   already knows what to do with: the iPhone camera, Android's camera and
   Lens, and both systems' own NFC readers all open it in the browser
   without this app being open first, which is what lets a player who has
   never launched it today still join with one scan or one tap. (iPhones
   from the XS on read the tag in the background and offer the link as a
   notification; Android opens it, or asks once, depending on version.)
   The app reads the two parameters when the page opens and joins that
   queue with the account signed in to that browser. It is not always
   the one the player uses: the phone opens links in the browser, never
   in a Home Screen copy of the app, and on an iPhone the two keep
   separate sign-ins. So a link that arrives signed out is held through
   signing in and used straight after (lib/pendingCheckIn.js). The same
   link read inside the app - its own viewfinder, or Web NFC on Android -
   goes through the same two functions below, so a code that works one way
   works the other.

   Nothing in the link is a secret and nothing in it identifies a person.
   It is the physical scan that says you are standing at the machine, as
   the field study asked (finding C); a link is no stronger proof than the
   sticker it was printed on, and the prototype does not pretend otherwise.

   The parameters are deliberately not called `code`: the auth client reads
   a `code` parameter on page load as a sign-in callback.

   Kept free of the browser and of Vite, so it runs under plain Node with
   the other rules in this folder. */

/* Where the printed codes point: the production deployment. Preview
   deployments sit behind a team sign-in, so a code printed for one would
   open a login page on a player's phone. */
export const APP_URL = 'https://arcade-circle.vercel.app'

export const VENUE_PARAM = 'checkin'
export const GAME_PARAM = 'game'

/* Only the production Arcade Circle origin and local development
   addresses are trusted for check-in links and QR print sheets.
   External deployments, embedded credentials, and insecure
   remote HTTP links are rejected. */
export function trustedBaseOrigin(raw) {
  const text = String(raw ?? '').trim()
  if (text === '' || text.startsWith('//')) return null
  let url
  try {
    url = new URL(text)
  } catch {
    return null
  }
  if (url.username !== '' || url.password !== '') return null
  const host = url.hostname.toLowerCase()
  if (host === 'localhost' || host === '127.0.0.1') {
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.origin : null
  }
  if (url.protocol !== 'https:') return null
  if (host === 'arcade-circle.vercel.app') {
    return url.origin
  }
  return null
}

/* The link for one game's queue at one arcade. */
export function checkInUrl(venueId, gameId, base = APP_URL) {
  const origin = trustedBaseOrigin(base) ?? APP_URL
  const url = new URL('/', origin)
  url.searchParams.set(VENUE_PARAM, venueId)
  url.searchParams.set(GAME_PARAM, gameId)
  return url.toString()
}

/* The arcade and game a code names, read from whatever a camera or a tag
   hands over: the full link, a link to another deployment of the app, or
   the query on its own. Null when it is not a check-in code at all - a
   profile code, a menu, a web page. Ids are normalised but not checked
   here; resolveCheckIn() says whether they mean anything. */
export function readCheckInCode(text) {
  const raw = String(text ?? '').trim()
  if (raw === '' || raw.startsWith('//')) return null
  let url
  try {
    url = new URL(raw, APP_URL)
  } catch {
    return null
  }
  if (!trustedBaseOrigin(url.href) || url.pathname !== '/') return null
  const venueId = clean(url.searchParams.get(VENUE_PARAM))
  if (!venueId) return null
  return { venueId, gameId: clean(url.searchParams.get(GAME_PARAM)) }
}

function clean(value) {
  const id = String(value ?? '').trim().toLowerCase()
  return id === '' ? null : id
}

/* What a code can do here, checked against the real venue list:

     ok        an arcade and a game it runs - join that queue
     venue     a known arcade, but no game, or one it does not run -
               open the arcade and let the person choose
     unknown   nothing this app knows

   Membership is checked as an own property, so an id such as
   "constructor" cannot match something every object inherits. */
export function resolveCheckIn(code, arcades = ARCADES) {
  if (!code?.venueId) return { status: 'unknown' }
  const arcade = arcades.find((a) => a.id === code.venueId)
  if (!arcade) return { status: 'unknown' }
  if (!code.gameId || !Object.hasOwn(arcade.games, code.gameId)) {
    return { status: 'venue', venueId: arcade.id }
  }
  return { status: 'ok', venueId: arcade.id, gameId: code.gameId }
}

/* A link with the two check-in parameters taken out and everything else
   left where it was, relative to the site, so the address bar can be
   rewritten without a reload. Once read, the parameters have done their
   job: left in place, a reload or a shared screenshot of the address
   would join the queue again. */
export function withoutCheckInParams(href) {
  const url = new URL(href)
  url.searchParams.delete(VENUE_PARAM)
  url.searchParams.delete(GAME_PARAM)
  const path = url.pathname.replace(/^\/+/, '/')
  return `${path}${url.search}${url.hash}`
}
