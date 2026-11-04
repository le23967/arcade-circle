import { useEffect, useRef, useState } from 'react'
import { ARCADES, GAMES } from '../data.js'
import { APP_URL, checkInUrl, trustedBaseOrigin } from '../lib/checkinLink.js'
import { QrCode } from '../components/QrCode.jsx'
import { PrimaryButton, Seg, ViewSwitch, Toggle, GameDot, Info } from '../components/ui.jsx'
import { Qr, Nfc, Users } from '../components/Icons.jsx'

/* The check-in stickers, ready to print.

   This is the organiser's page, not a player's, so the app never links to
   it: it is opened by address, at /print.html, on a laptop to print the
   stickers for the machines, or on a phone to copy each link into NFC Tools
   when writing the tags. One sticker per game at each arcade, because a
   queue belongs to a game and not to a machine (data.js); or one for every
   machine, so each machine of that game can carry its own copy of the same
   code.

   Every code is a plain https link to the production app, built by the same
   function the app reads it back with (lib/checkinLink.js), so a sticker
   and the app can never disagree about what it says. A phone's own camera
   opens it with the app closed, which is the point of it. It is printed in
   words under the code as well: for NFC Tools, for anyone checking a
   sticker by eye, and for the day a camera will not focus.

   The codes are drawn for the place they will live. Error correction is
   level Q, which survives a quarter of the code being scuffed or covered -
   arcade machines get leant on and wiped down - and the quiet zone is the
   full four modules the standard asks for, drawn in white as part of the
   code so a trim cannot eat into it. The longest link is a version 6 code,
   41 modules across; at 47 mm with its margin that is just under a
   millimetre a module, comfortably readable from a phone held at arm's
   length.

   The sticker says what to do in five words and nothing else. "Tap" joins
   the line only when an NFC tag will sit behind it, which the organiser
   switches on here. */

const PER_PAGE = 6

/* Every queue the app knows: each arcade, and each game it runs, in the
   order of the game chips everywhere else. */
const CODES = ARCADES.flatMap((arcade) =>
  GAMES.filter((g) => Object.hasOwn(arcade.games, g.id)).map((g) => ({
    key: `${arcade.id}/${g.id}`,
    venueId: arcade.id,
    venue: arcade.short,
    gameId: g.id,
    game: g.label,
    color: g.color,
    machines: arcade.games[g.id].cabinets,
  }))
)

/* Codes for another deployment, for testing one: ?base=https://host. Only
   an http or https origin is taken, and the header says so whenever it is
   in use, so a test sheet cannot be printed by mistake. */
const BASE = baseFromAddress()

function baseFromAddress() {
  try {
    const raw = new URLSearchParams(window.location.search).get('base')
    return raw ? trustedBaseOrigin(raw) : null
  } catch {
    return null
  }
}

export default function PrintCodes() {
  const [chosen, setChosen] = useState(() => new Set(CODES.map((c) => c.key)))
  const [perMachine, setPerMachine] = useState(false)
  const [tap, setTap] = useState(false)

  const base = BASE ?? APP_URL
  const stickers = CODES.filter((c) => chosen.has(c.key)).flatMap((c) => {
    const url = checkInUrl(c.venueId, c.gameId, base)
    const copies = perMachine ? Math.max(1, c.machines) : 1
    return Array.from({ length: copies }, (_, i) => ({ ...c, url, id: `${c.key}#${i}` }))
  })
  const pages = []
  for (let i = 0; i < stickers.length; i += PER_PAGE) pages.push(stickers.slice(i, i + PER_PAGE))

  function toggle(key) {
    setChosen((set) => {
      const next = new Set(set)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="min-h-screen bg-page print:bg-white">
      {/* Only the name, the count and Print stay in view while scrolling;
          the choices scroll away, or on a phone they would cover the
          stickers they choose. */}
      <header className="sticky top-0 z-10 border-b border-line bg-surface/95 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-[210mm] items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl font-semibold tracking-tight text-ink">
              Check-in codes
            </h1>
            <p className="text-xs tabular-nums text-ink-muted">
              {count(stickers.length, 'sticker')} &middot; {count(pages.length, 'page')}
            </p>
          </div>
          <div className="w-32 flex-none">
            <PrimaryButton onClick={() => window.print()} disabled={stickers.length === 0}>
              Print
            </PrimaryButton>
          </div>
        </div>
      </header>

      <div className="border-b border-line bg-surface print:hidden">
        <div className="mx-auto flex max-w-[210mm] flex-col gap-4 px-4 py-4">
          {BASE && (
            <p className="rounded-xl border border-stale bg-stale-bg px-3 py-2 text-xs font-medium text-ink">
              Links point to {BASE}
            </p>
          )}

          <div className="space-y-2">
            {ARCADES.map((arcade) => (
              <div key={arcade.id} className="flex flex-wrap items-center gap-1.5">
                <span className="w-full flex-none text-xs font-semibold uppercase tracking-wide text-ink-muted sm:w-32">
                  {arcade.short}
                </span>
                {CODES.filter((c) => c.venueId === arcade.id).map((c) => (
                  <Seg
                    key={c.key}
                    on={chosen.has(c.key)}
                    accent={c.color}
                    aria-pressed={chosen.has(c.key)}
                    onClick={() => toggle(c.key)}
                    className="min-h-9"
                  >
                    {c.game}
                  </Seg>
                ))}
              </div>
            ))}
            <div className="flex gap-1 pt-1">
              <TextButton onClick={() => setChosen(new Set(CODES.map((c) => c.key)))}>All</TextButton>
              <TextButton onClick={() => setChosen(new Set())}>None</TextButton>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 sm:items-center">
            <ViewSwitch
              label="Copies"
              options={[
                { id: 'code', label: 'One per code' },
                { id: 'machine', label: 'One per machine' },
              ]}
              value={perMachine ? 'machine' : 'code'}
              onChange={(id) => setPerMachine(id === 'machine')}
            />
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <Toggle label="NFC tag too" checked={tap} onChange={setTap} />
              </div>
              <Info label="About NFC tags">
                For a tag stuck behind the sticker, written with the same link.
                The sticker then says scan or tap.
              </Info>
            </div>
          </div>
        </div>
      </div>

      <main className="px-4 py-6 print:p-0">
        {pages.length === 0 ? (
          <p className="py-16 text-center text-sm text-ink-muted print:hidden">No codes chosen</p>
        ) : (
          pages.map((page, i) => (
            <section key={i} aria-label={`Page ${i + 1}`} className="page">
              {page.map((s) => (
                <Sticker key={s.id} sticker={s} tap={tap} />
              ))}
            </section>
          ))
        )}
      </main>
    </div>
  )
}

function count(n, noun) {
  return `${n} ${noun}${n === 1 ? '' : 's'}`
}

function TextButton({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-9 rounded-md px-2 text-xs font-semibold text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-600"
    >
      {children}
    </button>
  )
}

/* One sticker: whose app, which arcade, which game, the code, what to do,
   and the link in words. Sized in millimetres for the sheet; on a narrow
   phone it may be drawn narrower, never wider. */
function Sticker({ sticker, tap }) {
  const linkRef = useRef(null)

  return (
    <article className="sticker relative flex h-[88mm] w-full max-w-[90mm] flex-col items-center overflow-hidden rounded-[3mm] border border-dashed border-line-strong bg-white px-[5mm] pb-[3mm] pt-[4mm] text-center">
      <p className="flex items-center gap-[1.5mm] font-display text-[8pt] font-semibold text-ink-muted">
        <span
          className="flex h-[4.5mm] w-[4.5mm] items-center justify-center rounded-[1.2mm] bg-gradient-to-br from-brand-700 via-brand-600 to-[#7c3aed] text-white"
          aria-hidden="true"
        >
          <Users size={11} />
        </span>
        Arcade Circle
      </p>

      <h2 className="mt-[2mm] w-full truncate font-display text-[17pt] font-bold leading-[1.15] tracking-tight text-ink">
        {sticker.venue}
      </h2>
      <p className="flex items-center gap-[1.5mm] text-[9.5pt] font-semibold text-ink">
        <GameDot color={sticker.color} className="h-[2.4mm] w-[2.4mm]" />
        {sticker.game}
      </p>

      <QrCode
        value={sticker.url}
        label={`Check-in code for ${sticker.venue}, ${sticker.game}`}
        level="Q"
        quiet={4}
        className="mt-[2mm] h-[47mm] w-[47mm] flex-none"
      />

      <p className="mt-[1.5mm] flex items-center gap-[1.2mm] text-[8.5pt] font-semibold text-ink">
        <Qr size={12} />
        {tap && <Nfc size={12} />}
        {tap ? 'Scan or tap to join the queue' : 'Scan to join the queue'}
      </p>
      <p ref={linkRef} className="mt-[0.8mm] w-full font-mono text-[6pt] leading-[1.3] text-ink-muted [overflow-wrap:anywhere]">
        <Breakable text={sticker.url} />
      </p>

      <CopyLink url={sticker.url} name={`${sticker.venue}, ${sticker.game}`} linkRef={linkRef} />
    </article>
  )
}

/* A link too long for one line breaks before its query and between its
   parameters - never inside "maimai" - so it can still be read off the
   sticker. The break points add nothing to the text that is copied. */
function Breakable({ text }) {
  const parts = text.split(/(?=[?&])/)
  return parts.map((part, i) => (
    <span key={i}>
      {i > 0 && <wbr />}
      {part}
    </span>
  ))
}

/* For writing a tag from a phone: copy here, paste in NFC Tools. Where the
   clipboard is refused, the link is selected instead, so a long press can
   copy it. Never printed. */
function CopyLink({ url, name, linkRef }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return undefined
    const timer = window.setTimeout(() => setCopied(false), 1500)
    return () => window.clearTimeout(timer)
  }, [copied])

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      const el = linkRef.current
      const selection = window.getSelection()
      if (!el || !selection) return
      const range = document.createRange()
      range.selectNodeContents(el)
      selection.removeAllRanges()
      selection.addRange(range)
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? 'Copied' : `Copy link for ${name}`}
      className="absolute right-[1.5mm] top-[1.5mm] min-h-8 rounded-full px-2.5 text-[11px] font-semibold text-brand-700 transition-colors duration-150 before:absolute before:-inset-1.5 before:content-[''] hover:bg-brand-50 print:hidden"
    >
      {copied ? 'Copied' : 'Copy link'}
    </button>
  )
}
