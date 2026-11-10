# Arcade Circle

A mid-fidelity web prototype for the Sydney arcade rhythm game community.

It started as a queue tracker. After talking to players we moved it towards the
problem underneath the queue, which is connection. The app still tracks queues,
but the point of it is getting people to the same cabinet at the same time.

Built from the lo-fi workflow in `Fig3_LoFi_Prototype_Workflow.jpg`, three field
interviews at Sydney arcades, and a review of the early prototype.

```bash
npm install
npm run dev
npm run lint    # catches undefined references before they blank a screen
npm run build   # also the quickest check that every screen still renders
```

Stack: React, Vite and Tailwind.

## What the interviews told us

We ran three sessions. One at an arcade on a Wednesday, and two on 21 August.
Five findings shaped the build.

### 1. A queue number is useless without a timestamp

Right now players check a queue by messaging a group chat about an hour before
they travel. Replies take *"thirty or forty five minutes"*, and sometimes nobody
answers at all.

So every queue figure in the app shows how old it is. Anything older than 15
minutes gets marked `Stale` and is left out of the ranking. We would rather show
an honest gap than a confident wrong number.

### 2. Players pick a venue on throughput, not on queue length

One player told us he goes to the busier arcade on purpose, because *"there's
more cabs, so it can move more quickly"*. He called the extra travel *"the
moving cost"* and said he pays it happily.

So wait time is queue load divided by machine count, and the best option is
worked out from wait rather than from queue size. On the real cabinet counts
this flips the obvious answer. KOKO Town Hall wins with 10 parties queued while
Central Park loses with 7, because KOKO runs five maimai cabinets to Central
Park's two. KOKO is also the furthest away. The compare table exists to make
that trade-off visible.

### 3. Nobody can tell whose turn it is

The clearest quote we got was about people walking up and asking *"who's
next?"*, and nobody being sure. Another player called the queue *"very messy,
especially when it gets busy"*. People waiting are *"scrolling phones and
they're not paying attention"*, so they miss their turn.

So the checked-in screen shows your position and the full running order. You do
not have to ask anyone, and nobody has to answer. That matters for the player
who described herself as *"very introverted"*.

### 4. If check-in is not one tap, it will not happen

The arcade already has a paper queue board and it has failed. One player said
*"no one uses it because it's like lazy"*, and the marker was dead anyway. He
described it as *"dry"*, with *"no ink left"*. When we asked what would work he
said *"with a QR code"*, or tapping your phone.

So check-in is ordered QR, then NFC, then Manual. Manual is clearly marked as a
fallback for a broken sticker or a phone without NFC.

Both are real now. The sticker on a machine and the NFC tag beside it hold the
same ordinary link, so a player can scan it with the phone's own camera or tap
it with the app closed, and land in the queue already joined. See
[Check-in codes and NFC tags](#check-in-codes-and-nfc-tags).

### 5. The queue counts parties, not people

Players who came together queue together. One interviewee explained that at a
venue with two linked cabinets, *"people like playing together, so they queue
together"*. A pair also holds the machine longer, because playing as two buys a
bonus song. As she put it, *"you get to play more"*.

So Queue and Solo are reported and shown separately. The wait model charges a
pair 6 minutes against a solo player's 4.

## The social layer

The queue findings came up on their own. When we asked what the pain points
were, the first answer was *"queue organization"*, before we had suggested
anything. The social ideas mostly came out only after we described a concept
first. That gap set the scope, so we only built the things a participant raised
without being prompted.

### Score comparison with no cap

This is the strongest evidence we have. A player who has been going for six
years told us the official maimai score site lets you favourite 20 people, and
*"you can't have more than that"*. He said getting around that limit would be
worth having, and we had not mentioned it.

So the Scores leaderboard ranks all 28 people you follow and draws a line where
the official site stops. On our data that line hides 9 players, and two of them
are checked into an arcade at that moment. The point of the screen is that the
person standing next to you can be invisible on the tool you use today.

### Who is out, on a map

Players wanted an easy way to know when friends were already at an arcade. A
map makes that information useful without adding another presence list.

So the Circle tab opens on a real map. Friends show as avatars and venues show
as pins. You can drag, scroll or pinch, and the map can move beyond central
Sydney. Tapping a friend opens useful next steps, while tapping a venue opens
its queue details. The same people as a list, grouped by venue, is a sheet that
rises over the map from the card at the bottom.

### Activity, which answers a different question

A presence list tells you who is there now. Activity tells you whether you have
just missed someone. If a friend left 25 minutes ago there is no point going.

Every row ends in something you can do, such as Join them, Plan the next one, or
Send congrats. Knowing where someone is does not count for much until it leads
somewhere.

### Clips

Asked what he does while queued, one player said he watches videos. The
interviewer noted that this seemed to be the general trend. The problem is that
the watching happens in another app, which is how people miss their turn.

So the Watch tab keeps your queue position pinned above the feed, and interrupts
playback when you are up. A feed that cannot pull you out of itself would make
the original problem worse. Watching is also how people get into these games.
The introverted player told us she watched friends play for ages before trying,
because it *"looked so cool"*.

### Plan a session

Presence pays off when it turns into a time and a place. Plan a session lets you
pick a venue, a game and a time, then ask people: the accounts you follow are
listed, and anyone else can be found by username. The session is stored and
shared: it appears on each invited person's Later tab as it is sent, their
*I'm in* shows on yours, a changed time reaches them, and calling it off takes
it away. Each of those also arrives as a message in the conversation their
profile opens - a request if they do not follow you back - so nothing here
claims to have told someone without having done it.

Checking in works the same way. Joining a queue puts you on the map for the
people you follow both ways, live, with your queue position, and comes back
after a reload; *Join them* sends the person a message that you are on your
way, which lands as a banner on whatever screen they are looking at; checking
out takes you off their map. Who may see your arcade is your own choice under
Me: the people you follow back, or anyone who follows you. The default stays
mutual, which is what the research asked for; opening it wider is a decision
the person being seen makes, never the person looking. Without an account,
the map and Later show the prototype's sample players instead.

A session can also be opened to anyone on the app. The host picks *Anyone on
the app* instead of *People I ask*, adds a note if they want one, and it is
posted on Open as well as sent to whoever they asked. Nothing changes for a
closed session.

### Open sessions

Everything else on the Circle tab is mutual-only, and that is the right rule
for presence. It is the wrong rule for a first day. A player with nobody in
their circle opens Map, Now, Later and Activity and finds them all empty, and
the app is in effect telling them to come back once they have friends, which is
what they came here to make. The introverted players we spoke to are the ones
most likely to stay in that state.

*Open to anyone* is the one view not scoped to the people you follow. It is
the second filter on Later, and it lists every session anyone has posted for
anyone, filtered by game, with each row ending in *I'm in*. A venue page also
says how many open sessions are posted there, next to the row that names the
people you follow, so a new player sees a reason to go even when that second
row is missing.

This does not undo the research finding about strangers. Nobody is located and
nobody is approached. A host who posts an open session has chosen to be found,
in the same way a note on the arcade's pinboard would, and that is all a
stranger gets to see. Saying you are in opens a message thread with that host,
because they asked for anyone to reply. It is the only route in the app from a
stranger to a conversation, and the host controls it.

### Profiles and contact

Profiles show which games someone mainly plays and their favourite songs. Both
came up unprompted. Shared items are marked, so you can see what you have in
common before you say anything.

Messaging was limited to people you follow both ways for a long time. We took
it out at one point because of an interview finding, but that finding was about
strangers. Our own notes said the app *"can't force our users to just go up to
someone they haven't met"*, and that still shapes it: a message to someone who
does not follow you back arrives as a request, one message long, that they can
accept, decline or block, and declining tells the sender nothing. Between
people who follow each other it is an ordinary conversation from the first
word. Nobody is approached; the person on the other end decides.

Every real profile has a Message button. Add someone leads with a username
search, and a real QR code - your account id, nothing else - for the moment you
are standing next to the person. Accounts can be deleted from Me, with the
username typed to confirm.

## What we did not build

**Invite and earn events.** This was our idea in a team session, not something a
participant asked for. Four things argue against it.

1. The game already does it. Playing as two gets you a bonus song, which is
   immediate and free. An app level reward competes with that and loses.
2. It needs money we do not have. We flagged this ourselves at the time.
   Discounts need the arcade to pay for them, and our goal is not arcade profit.
3. It asks introverts to recruit. The most repeated trait in our interviews is
   reluctance to approach people.
4. It can work against the queue goal. Pushing players onto one day creates the
   crowding the rest of the app helps them avoid.

The best version of the idea is demand smoothing, moving players off the Friday
and weekend peak. That is worth testing, but it serves the venue before the
player and it still needs a partner. We would want a willing venue and evidence
that an event flattens the peak before building it.

**Avoid lists.** One player said he would go back to a venue he avoids if he
could reliably know certain people were not there. It is a real need, but it
needs tracking people who have not agreed to be tracked. The venue level crowd
count gives some of the value without the surveillance.

## Venue data

Venues, games and cabinet counts are real, checked in August 2026. Queue counts
and wait times are made up.

| Venue | Address | maimai | CHUNITHM | SDVX | GITADORA | Taiko | DDR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Timezone Central Park | Level 2, Central Park Mall, 28 Broadway, Chippendale | 2 | 1 | 1 | none | 2 | none |
| Timezone Haymarket | Level 3, Market City, 9 to 13 Hay St, Haymarket | 2 | 2 | 1 | 2 | 1 | 2 |
| KOKO Amusement Town Hall | 614 George Street, Sydney | 5 | 3 | 2 | 1 | 5 | 2 |

Two things came out of checking.

Timezone George St does not exist any more. The store at 505 George Street is
closed. The George Street rhythm arcade is KOKO Amusement Town Hall at 614
George Street, and it is by far the biggest of the three.

Central Park has neither GITADORA nor DDR, so it genuinely drops out of those
two filters.

Distances are walking distance from UTS Broadway, since that is where we were
based. Arcade line-ups change often, so check again before relying on this.

Sources: [SEGA maimai DX location finder](https://location.am-all.net/alm/location?gm=98&lang=en&ct=1012),
[Timezone Central Park](https://www.timezonegames.com/en-au/venues/nsw/timezone-central-park/),
[Zenius-i-vanisher: Central Park](https://zenius-i-vanisher.com/v5.2/arcade.php?id=4598),
[Haymarket](https://zenius-i-vanisher.com/v5.2/arcade.php?id=4114),
[KOKO Town Hall](https://zenius-i-vanisher.com/v5.2/arcade.php?id=5910).

## Screens

| Screen | Route | What it does |
| --- | --- | --- |
| Circle, Now | tab | Friends as avatars, venues as pins; the same people as a list in a sheet over the map, each row ending in Join. |
| Circle, Plans | tab | Your circle's sessions, or every session open to anyone, each row ending in I'm in. |
| Circle, Activity | tab | Secondary: what people did and when, each line ending in an action. |
| Circle, Scores | tab | Secondary: uncapped leaderboard with the 20 favourite limit drawn on it. |
| Watch | `watch` | Clips from people you follow, with your queue position pinned above. Opens from the queue screen, Liked and Activity. |
| Comments | modal | Comment thread on a clip. |
| Arcades, Best now and Compare all | tab | Recommends the quickest venue, then shows wait, report age, working machines and distance for every venue. |
| Detail | `detail` | The wait, three status chips and Check in & join queue; queue, machine reports, people, open sessions and other games below, each shut until opened. |
| Check-In | `checkin` | Solo or partner, sharing on or off, then Scan QR, Tap NFC, or Manual as a fallback. |
| Scan | `scan` | The back camera reads the sticker, or Web NFC reads the tag on Android; a code for a different queue asks first. |
| Confirm | `confirm` | Manual check-in: pre-filled count to confirm or correct before joining. |
| Checked In | `checkedin` | Your position, the running order, Solo or Pair, and Leave queue or Check out. |
| Check-in codes | `/print.html` | The QR stickers to print, one per game at each arcade or one per machine, each with its link for NFC Tools. Not linked from the app. |
| Session summary | `summary` | Session time and time queued. |
| Plan a session | `plan` | Venue, game, time, who can come, and who to ask. |
| Messages | sheet | Chats and requests over the tab they were opened from, with what is waiting counted on the way in. |
| Message | `chat` | A conversation, or a request in either direction; Accept, Decline and Block live on it. |
| Add someone | `addperson` | Search by username first; scan a QR code, or show yours. |
| Player profile | `player` | Games, songs, scores, and the actions. |
| Liked clips | `liked` | Clips you saved, reachable from Me. |
| Followers and Following | `follows` | Who can see you, and who you can see. |
| Directions | modal | Hands off to Apple Maps or Google Maps. |
| Me | tab | Player dashboard, progress, favourites, visibility and privacy. |

Screens 1 to 8 from the lo-fi sheet all still run end to end. The current screen
name prints under the phone frame so the prototype can be reviewed next to the
sheet.

Circle had six segments for a while and the bar stopped fitting the width. A
count of the tap targets on the map screen came to about thirty, and several
groups were answering one question more than once: Map and Here now were both
"who is out", Later and Open were both "what is coming up", and the bottom
card repeated the five avatars already drawn on the map. Each pair is one
segment now with the second answer a step inside the first, the map keeps one
control, and the card is a single way into the list. Fewer things to read
before the one you need.

The Week 9 critique said the same thing about the whole app: too much text,
and too much reading before anyone could act. The Sprint 4 pass cut
explanatory copy rather than rewording it. Status is shown as icon chips with
a few characters each ("Updated 6m ago", "5/5 working", "1.4 km"), longer
explanations sit behind the ? buttons, and secondary content on the arcade
page is collapsed below the primary action. Circle's switch is Now and Plans;
Activity and Scores stay one tap away as quieter tabs. Arcades' two views are
Best now and Compare all. The interface says "machine" throughout, never
"cabinet", and no longer shows prototype wording such as "(demo)".

The tab bar is Circle, Arcades, Me. The lo-fi sheet had Home, Compare, Maps
and Me. Home and Compare merged into Arcades, and Circle was added for the
social layer. Watch was a tab until the field study; clips are a way to pass
the time in a queue, not a reason to open the app, so it opens from the queue
screen instead. People come first because the project is about connection.

Maps is no longer its own tab. A venue directory would repeat Arcades, while a
map of friends and venues belongs with the community tools in Circle. Route
planning still hands off to the phone, where live traffic and transit data are
available.

## Check-in codes and NFC tags

Every queue has one link, and the QR sticker and the NFC tag for it hold the
same one:

```
https://arcade-circle.vercel.app/?checkin=koko-town-hall&game=maimai
```

It is a plain https link because that is what phones already open without any
app running: the iPhone and Android cameras, and both systems' own NFC readers.
When the app opens on one it joins that queue with the account signed in to the
browser, then takes the link out of the address bar so a reload does not join
again.

- Signed in: straight into the queue, solo, shared the way Me says. Pair is one
  tap on the queue screen for two people who came together.
- Already in that queue: it shows your place instead of putting you at the back.
  The tag doubles as the quickest way back to your position.
- In another queue: you are moved, and the old place is given back.
- Signed out: the sign-in screen names the queue, and it joins as soon as you
  are in. The link survives a reload while you look for a password.
- A game with no working machines opens the arcade page, which says why. A link
  the app does not recognise says so once.

Inside the app, Scan QR uses the back camera, and Tap NFC uses Web NFC, which
today means Chrome on Android. A code for a different queue than the screen
shows asks before joining it, since two games often stand side by side. iPhones
read the tag themselves (iPhone XS and later) and offer the link as a
notification.

### Printing the stickers

Open `/print.html`: https://arcade-circle.vercel.app/print.html once deployed,
or http://localhost:5173/print.html under `npm run dev`. The codes always point
at the production address, wherever the page is opened. Pick the games, choose
one sticker per game or one per machine, and print on A4 at 100% scale. Each
sticker prints its link underneath. Add `?base=https://another-host` to make
codes for a different deployment; the page says so in its header.

### Writing the NFC tags with NFC Tools

1. Open NFC Tools, then **Write → Add a record → URL / URI**.
2. Paste the link from the sticker or from the print page's Copy link button.
   If the field already shows `https://` in front, paste only the part after
   it, or the tag will hold `https://https://…`.
3. **Write**, and hold the tag to the phone until it finishes.
4. Check it in **Read**: one URI record holding exactly the link. Then tap it
   with a phone where it will be mounted.
5. Optional: **Other → Set password** stops anyone rewriting it and can be
   removed later. **Lock** is permanent.

Arcade machines are metal, which stops ordinary tags working. Use on-metal
(ferrite-backed) NTAG213 tags on the machine itself, or mount a plain tag on
plastic or glass away from it.

### Limits

- A tag or a code always opens the browser, never a copy of the app added to
  an iPhone Home Screen, and the two keep separate sign-ins. A player signed in
  only there signs in once in Safari; the check-in waits for them.
- On iPhone, use the Camera app. The Control Centre code scanner opens links in
  a private view with no sign-in.
- iPhone 7, 8 and X cannot read tags without a native app, so put the QR code
  next to every tag.
- A link is no stronger than the sticker it is printed on. The scan stands in
  for being at the machine; the prototype does not pretend it proves it.

## Fidelity

The current pass adds enough visual detail to test the experience, not only the
screen order. Colour, type, motion and depth now help users read status and find
the next action.

- **Colour.** An indigo brand colour for primary actions, semantic colours for
  fresh, stale and live, and one hue per game. Game colour is used on dots, bars
  and pins but never on body text, so contrast never depends on the hue. Tokens
  sit at the top of `src/index.css`.
- **Type.** Space Grotesk for headings and numbers, Inter for text.
- **Motion.** Screens enter, sheets rise, lists stagger, the like button reacts
  and live dots pulse. Everything is short and all of it turns off under
  `prefers-reduced-motion`.
- **Depth.** Elevation separates sheets, the tab bar and map pins from the page.
- **Assets.** The map uses OpenStreetMap tiles. Clip artwork is generated from
  the score data, and avatars are generated from each handle.
- **Text.** One short line of helper text per screen at most. Longer explanations
  sit behind a `?` tooltip, which measures itself against the frame and flips
  side so it cannot get clipped. Each screen also says in one line what it is
  for.

## Code

| Where | What |
| --- | --- |
| `src/data.js` | Venues, per game queues and map coordinates |
| `src/social.js` | People, clips, activity, planned sessions |
| `src/lib/queue.js` | Wait model, staleness, queue roster, venue resolvers |
| `src/lib/social.js` | Leaderboard, presence, follows, formatting |
| `src/lib/checkinLink.js` | Check-in links: built for the stickers, read from a scan or a tag |
| `src/lib/pendingCheckIn.js` | Holds the link a page was opened with until it is used |
| `src/components/ui.jsx` | Shared primitives |
| `src/screens/` | One file per screen |
| `src/print/` | The printable sheet of check-in codes |

Reporting a queue or checking in changes the shared state, so the list, the
compare table and the detail screen all move together.

Raw interview transcripts are not committed. Participants agreed to a university
project, not to publication. The findings above are the record we keep.

## Contributing workflow

Changes to `main` go through a short branch and pull request workflow so the
group can review updates before they trigger a live deployment:

1. Open an issue describing the bug fix or improvement and attach a label.
2. Create a feature branch from `main` and keep each commit focused on one
   logical change.
3. Run `npm ci`, `npm run lint`, `npm test` and `npm run build` locally before
   pushing the branch.
4. Open a pull request against `main` that links the issue it resolves (for
   example `Closes #4`).
5. Wait for the `CI` workflow in [`.github/workflows/ci.yml`](.github/workflows/ci.yml)
   to pass on the pull request before merging into `main`. Direct pushes to
   `main` are blocked by branch protection.

## Security and privacy notes

Accounts, follows, message requests, blocks, planned sessions and venue
presence are protected by Row Level Security in Supabase, while live GPS
coordinates from the browser stay on the player's own device and camera frames
used to scan QR codes are never stored or uploaded. Check-in links and
printable sticker URLs only accept trusted app origins and known venues and
games, and account deletion runs on the server after verifying the caller's
session token.

- Full security review with file and line references:
  [`docs/security-review.md`](docs/security-review.md)
- One-page threat summary covering authentication, stored data, third-party
  services, controls and escalation points:
  [`docs/threat-summary.md`](docs/threat-summary.md)

