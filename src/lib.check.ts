// Запуск: node src/lib.check.ts
import assert from 'node:assert/strict'
import { countdown, groupsOf, nextStep, plural, progress, sectionDone, upcoming, usedBy, when } from './lib.ts'
import { SHARED, TEMPLATES } from './templates.ts'

const days = [1, 2, 5, 11, 12, 14, 21, 22, 25, 101, 111].map((n) => plural(n, 'день', 'дня', 'дней'))
assert.deepEqual(days, ['день', 'дня', 'дней', 'дней', 'дней', 'дней', 'день', 'дня', 'дней', 'день', 'дней'])

const now = Date.parse('2026-09-29T17:30:00Z')
assert.equal(countdown('2026-10-22T18:00:00+09:00', now), 'через 22 дня')
assert.equal(countdown('2026-09-30T05:00:00Z', now), 'через 12 часов')
assert.equal(countdown('2026-09-29T10:00:00Z', now), 'прошло')
assert.equal(when({ label: '', at: '2026-12-15T12:00:00Z' }), '15 дек')
assert.equal(when({ label: '', at: '2026-12-15T12:00:00Z', approx: true }), '≈ 15 дек')

const { kaist, mbzuai, dartmouth, nyu } = TEMPLATES
assert.deepEqual(progress(kaist, []), { req: 14, reqDone: 0, opt: 6, optDone: 0 })
assert.deepEqual(progress(kaist, ['q1a', 'q5', 'gone']), { req: 14, reqDone: 1, opt: 6, optDone: 1 })

const [essays, recs] = ['essays', 'recs'].map((id) => kaist.sections.find((s) => s.id === id)!)
assert.equal(sectionDone(essays, ['q1a', 'q1b', 'q2', 'q3', 'q4']), true) // Q5 необязательный
assert.equal(sectionDone(essays, ['q1a', 'q5']), false)
assert.equal(sectionDone(recs, ['rec-ask']), false) // целиком необязательная — нужны все
assert.equal(sectionDone(recs, ['rec-ask', 'rec-sent']), true)

// Общий пункт — один id во всех униках, поэтому одна отметка засчитывается везде.
const board = [kaist, mbzuai, dartmouth, nyu]
assert.deepEqual(usedBy(SHARED.ielts.id, board).map((t) => t.id), ['kaist', 'mbzuai', 'dartmouth', 'nyu'])
assert.deepEqual(usedBy(SHARED.sat.id, board, true).map((t) => t.id), ['kaist', 'dartmouth']) // в NYU и MBZUAI — по желанию
assert.deepEqual(usedBy(SHARED.caEssay.id, board).map((t) => t.id), ['dartmouth', 'nyu'])

assert.deepEqual(groupsOf(nyu.sections).map((g) => g.label), ['Обязательно', 'Если нужна финпомощь', 'Потом'])

assert.equal(nextStep(kaist, [])?.item.id, 'form-bio')
assert.equal(nextStep(kaist, ['form-bio', 'form-track'])?.item.id, 'kaist-upload')
assert.equal(nextStep(kaist, kaist.sections.flatMap((s) => s.items.map((i) => i.id))), undefined)

const next = upcoming(board.map((tpl) => ({ tpl, round: tpl.rounds[0] })), now)
assert.equal(next[0].tpl.id, 'kaist') // 22 октября — раньше всех

// Освобождение MBZUAI от экзамена: SAT Math 760+ и сумма 1400+.
const waiver = mbzuai.checks!.find((c) => c.label.startsWith('без экзамена'))!
assert.equal(waiver.test({ satMath: '780', satTotal: '1450' }), true)
assert.equal(waiver.test({ satMath: '750', satTotal: '1450' }), false)
assert.equal(waiver.test({ satMath: '', satTotal: '1450' }), null)

console.log('lib ok')
