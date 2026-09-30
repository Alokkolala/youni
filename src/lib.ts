import type { Milestone, Round, Section, Template } from './templates'

const DAY = 864e5

export function plural(n: number, one: string, few: string, many: string) {
  const a = n % 10
  const b = n % 100
  if (a === 1 && b !== 11) return one
  return a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many
}

export function progress(tpl: Template, done: string[]) {
  const items = tpl.sections.flatMap((s) => s.items)
  const req = items.filter((i) => !i.optional)
  const opt = items.filter((i) => i.optional)
  const has = (i: { id: string }) => done.includes(i.id)
  return { req: req.length, reqDone: req.filter(has).length, opt: opt.length, optDone: opt.filter(has).length }
}

// Секция готова, когда закрыто всё обязательное; целиком необязательная — когда закрыто всё.
export function sectionDone(sec: Section, done: string[]) {
  const required = sec.items.filter((i) => !i.optional)
  return (required.length ? required : sec.items).every((i) => done.includes(i.id))
}

// Следующий шаг — первый незакрытый обязательный пункт по порядку разделов.
export function nextStep(tpl: Template, done: string[]) {
  for (const sec of tpl.sections) {
    const item = sec.items.find((i) => !i.optional && !done.includes(i.id))
    if (item) return { sec, item }
  }
}

// Группы навигации в порядке первого появления: своя группа раздела или «Обязательно» / «По желанию».
export function groupsOf(sections: Section[]) {
  const groups: { label: string; sections: Section[] }[] = []
  for (const s of sections) {
    const label = s.group ?? (s.items.some((i) => !i.optional) ? 'Обязательно' : 'По желанию')
    const g = groups.find((x) => x.label === label)
    if (g) g.sections.push(s)
    else groups.push({ label, sections: [s] })
  }
  return groups
}

// Какие уники на доске используют пункт (required — только те, где он обязателен).
export const usedBy = (itemId: string, tpls: Template[], required = false) =>
  tpls.filter((t) => t.sections.some((s) => s.items.some((i) => i.id === itemId && (!required || !i.optional))))

export const nextMilestone = (ms: Milestone[], now: number) => ms.find((m) => Date.parse(m.at) > now)

// Все будущие даты выбранных раундов, от ближайшей.
export function upcoming(board: { tpl: Template; round: Round }[], now: number) {
  return board
    .flatMap(({ tpl, round }) => round.milestones.filter((m) => Date.parse(m.at) > now).map((m) => ({ tpl, m })))
    .sort((a, b) => Date.parse(a.m.at) - Date.parse(b.m.at))
}

// Дни округляем вниз: для дедлайна лучше недосчитать, чем пересчитать.
export function countdown(at: string, now: number) {
  const ms = Date.parse(at) - now
  if (ms <= 0) return 'прошло'
  if (ms < DAY) {
    const h = Math.ceil(ms / 36e5)
    return `через ${h} ${plural(h, 'час', 'часа', 'часов')}`
  }
  const d = Math.floor(ms / DAY)
  return `через ${d} ${plural(d, 'день', 'дня', 'дней')}`
}

export const daysLeft = (at: string, now: number) => (Date.parse(at) - now) / DAY

const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('ru-RU', o)
const dateLocal = fmt({ day: 'numeric', month: 'short' })
// Даты без времени хранятся полднем и показываются как календарный день, без сдвига по поясам.
const dateOnly = fmt({ day: 'numeric', month: 'short', timeZone: 'UTC' })
const timeLocal = fmt({ hour: '2-digit', minute: '2-digit' })

// Дедлайны со временем — в поясе пользователя, остальные — просто календарной датой.
export function when(m: Milestone) {
  const d = new Date(m.at)
  if (!m.time) return (m.approx ? '≈ ' : '') + dateOnly.format(d).replace('.', '')
  return `${dateLocal.format(d).replace('.', '')}, ${timeLocal.format(d)}`
}

export const zoneTime = (at: string, timeZone: string) => fmt({ hour: '2-digit', minute: '2-digit', timeZone }).format(new Date(at))
