import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  APP_URL,
  checkInUrl,
  readCheckInCode,
  resolveCheckIn,
  trustedBaseOrigin,
  withoutCheckInParams,
} from './checkinLink.js'
import { ARCADES } from '../data.js'

test('a code is a plain https link to the production app', () => {
  assert.equal(
    checkInUrl('koko-town-hall', 'maimai'),
    'https://arcade-circle.vercel.app/?checkin=koko-town-hall&game=maimai'
  )
  assert.ok(checkInUrl('central-park', 'sdvx').startsWith(`${APP_URL}/?`))
  assert.equal(
    checkInUrl('market-city', 'ddr', 'http://localhost:5173'),
    'http://localhost:5173/?checkin=market-city&game=ddr'
  )
})

test('every queue the app knows round-trips through its own link', () => {
  for (const arcade of ARCADES) {
    for (const gameId of Object.keys(arcade.games)) {
      const code = readCheckInCode(checkInUrl(arcade.id, gameId))
      assert.deepEqual(code, { venueId: arcade.id, gameId })
      assert.deepEqual(resolveCheckIn(code), { status: 'ok', venueId: arcade.id, gameId })
    }
  }
})

test('a code is read however the camera or the tag hands it over', () => {
  const want = { venueId: 'koko-town-hall', gameId: 'maimai' }
  assert.deepEqual(readCheckInCode('  https://arcade-circle.vercel.app/?checkin=koko-town-hall&game=maimai \n'), want)
  assert.deepEqual(readCheckInCode('https://ARCADE-CIRCLE.vercel.app/?game=MAIMAI&checkin=KOKO-Town-Hall'), want)
  assert.deepEqual(readCheckInCode('http://localhost:5173/?checkin=koko-town-hall&game=maimai'), want)
  assert.deepEqual(readCheckInCode('/?checkin=koko-town-hall&game=maimai'), want)
  assert.deepEqual(readCheckInCode('?checkin=koko-town-hall&game=maimai'), want)
  assert.deepEqual(readCheckInCode('https://arcade-circle.vercel.app/?checkin=koko-town-hall&game=maimai#top'), want)
  assert.deepEqual(readCheckInCode('https://arcade-circle.vercel.app/?checkin=koko-town-hall'), {
    venueId: 'koko-town-hall',
    gameId: null,
  })
})

test('anything that is not a check-in code reads as nothing', () => {
  for (const text of [
    '',
    '   ',
    null,
    undefined,
    'hello',
    'https://arcade-circle.vercel.app/',
    'https://arcade-circle.vercel.app/?game=maimai',
    'https://arcade-circle.vercel.app/?checkin=&game=maimai',
    'arcadecircle://profile/7d0f3b8e-4a7e-4f0b-9b8a-2a7c3f9d1e11',
    'javascript:alert(1)//?checkin=koko-town-hall&game=maimai',
    'mailto:someone@example.com?checkin=koko-town-hall',
    'WIFI:S:arcade;T:WPA;P:secret;;',
  ]) {
    assert.equal(readCheckInCode(text), null, String(text))
  }
})

test('only real arcades and the games they run can be joined', () => {
  assert.deepEqual(resolveCheckIn({ venueId: 'central-park', gameId: 'sdvx' }), {
    status: 'ok',
    venueId: 'central-park',
    gameId: 'sdvx',
  })
  /* Central Park runs no DDR: the arcade opens instead of a queue. */
  assert.deepEqual(resolveCheckIn({ venueId: 'central-park', gameId: 'ddr' }), {
    status: 'venue',
    venueId: 'central-park',
  })
  assert.deepEqual(resolveCheckIn({ venueId: 'central-park', gameId: null }), {
    status: 'venue',
    venueId: 'central-park',
  })
  assert.deepEqual(resolveCheckIn({ venueId: 'timezone-george-st', gameId: 'maimai' }), { status: 'unknown' })
  assert.deepEqual(resolveCheckIn(null), { status: 'unknown' })
  assert.deepEqual(resolveCheckIn({}), { status: 'unknown' })
})

test('inherited property names are not games', () => {
  for (const gameId of ['constructor', '__proto__', 'tostring', 'hasownproperty', 'valueof']) {
    assert.equal(resolveCheckIn({ venueId: 'koko-town-hall', gameId }).status, 'venue', gameId)
  }
  assert.equal(resolveCheckIn(readCheckInCode('?checkin=__proto__&game=maimai')).status, 'unknown')
  assert.equal(resolveCheckIn(readCheckInCode('?checkin=constructor&game=maimai')).status, 'unknown')
})

test('reading a link takes out only its own two parameters', () => {
  assert.equal(
    withoutCheckInParams('https://arcade-circle.vercel.app/?checkin=koko-town-hall&game=maimai'),
    '/'
  )
  assert.equal(
    withoutCheckInParams('https://arcade-circle.vercel.app/?checkin=koko-town-hall&game=maimai&utm_source=sticker#x'),
    '/?utm_source=sticker#x'
  )
  assert.equal(withoutCheckInParams('http://localhost:5173/print.html?base=x'), '/print.html?base=x')
  assert.equal(
    withoutCheckInParams('https://arcade-circle.vercel.app//evil.example/?checkin=koko-town-hall&game=maimai'),
    '/evil.example/'
  )
})

test('untrusted origins, credentials, plain http and non-root paths are rejected', () => {
  assert.equal(trustedBaseOrigin('https://arcade-circle.vercel.app'), 'https://arcade-circle.vercel.app')
  assert.equal(
    trustedBaseOrigin('https://deploy-preview-3--arcade-comparison.netlify.app/print.html'),
    'https://deploy-preview-3--arcade-comparison.netlify.app'
  )
  assert.equal(trustedBaseOrigin('http://localhost:5173'), 'http://localhost:5173')
  assert.equal(trustedBaseOrigin('http://127.0.0.1:4173'), 'http://127.0.0.1:4173')
  assert.equal(trustedBaseOrigin('https://evil.example'), null)
  assert.equal(trustedBaseOrigin('http://arcade-circle.vercel.app'), null)
  assert.equal(trustedBaseOrigin('https://user:pass@arcade-circle.vercel.app'), null)
  assert.equal(trustedBaseOrigin('//evil.example'), null)

  for (const forged of [
    'https://evil.example/?checkin=koko-town-hall&game=maimai',
    '//evil.example/?checkin=koko-town-hall&game=maimai',
    'http://arcade-circle.vercel.app/?checkin=koko-town-hall&game=maimai',
    'https://user:pass@arcade-circle.vercel.app/?checkin=koko-town-hall&game=maimai',
    'https://arcade-circle.vercel.app/print.html?checkin=koko-town-hall&game=maimai',
  ]) {
    assert.equal(readCheckInCode(forged), null, forged)
  }

  assert.equal(
    checkInUrl('koko-town-hall', 'maimai', 'https://evil.example'),
    'https://arcade-circle.vercel.app/?checkin=koko-town-hall&game=maimai'
  )
})
