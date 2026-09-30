import { useContext, useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { useReactFlow, type Node, type NodeProps } from '@xyflow/react'
import { AnimatePresence, motion, useSpring, useTransform } from 'motion/react'
import {
  ME_SECTIONS,
  SHARED_IDS,
  TEMPLATES,
  type Icon,
  type Item,
  type Round,
  type Section,
  type Stats,
  type Template,
} from './templates'
import { STAT_FIELDS } from './profile'
import { StoreCtx, type Store } from './store'
import { countdown, daysLeft, groupsOf, nextMilestone, nextStep, progress, sectionDone, upcoming, usedBy, when, zoneTime } from './lib'

// open — какой раздел развёрнут справа (null — карточка свёрнута).
export type UniData = { tpl: string; round: string; status?: string; open?: string | null }
export type MeData = { open?: string | null }
export type UniNodeT = Node<UniData, 'uni'>
export type MeNodeT = Node<MeData, 'me'>
export type AppNode = UniNodeT | MeNodeT

export const NAV_W = 300
export const DRAWER_W = 440
export const GAP = 60
export const ME_W = 4 * NAV_W + 3 * GAP // главная — по ширине ряда из четырёх свёрнутых уников
const CARD_H = 620


type GlyphName = Icon | 'plus' | 'zin' | 'zout' | 'fit' | 'trash' | 'out' | 'clock' | 'close' | 'chev' | 'next'

const ICONS: Record<GlyphName, ReactNode> = {
  form: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="3.5" />
      <path d="M9 9h6M9 13h6M9 17h3" />
    </>
  ),
  pen: (
    <>
      <path d="M5 19l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L9 18z" />
      <path d="M14.5 6.5l3 3" />
    </>
  ),
  id: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="3" />
      <circle cx="9" cy="11" r="2" />
      <path d="M6 15.5c.9-1.3 5.1-1.3 6 0M14.5 10h3M14.5 13.5h3" />
    </>
  ),
  chart: <path d="M6 19v-6M12 19V6M18 19v-9" />,
  mail: (
    <>
      <rect x="3.5" y="6" width="17" height="12" rx="3" />
      <path d="M4.5 7.5l7.5 5.5 7.5-5.5" />
    </>
  ),
  star: <path d="M12 4.5l2.3 4.7 5.2.8-3.8 3.6.9 5.2L12 16.4l-4.6 2.4.9-5.2-3.8-3.6 5.2-.8z" />,
  flag: <path d="M6 21V4M6 4.5h11l-2.2 4 2.2 4H6" />,
  cash: (
    <>
      <rect x="3.5" y="6.5" width="17" height="11" rx="2.5" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  send: <path d="M4.5 11.5L19.5 4.5l-5 15-3-6.5zM11.5 13l8-8.5" />,
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 19.5c1.2-3.3 3.8-5 7-5s5.8 1.7 7 5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  zin: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20l-4.5-4.5M8.5 11h5M11 8.5v5" />
    </>
  ),
  zout: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20l-4.5-4.5M8.5 11h5" />
    </>
  ),
  fit: (
    <path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15" />
  ),
  trash: <path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" />,
  out: <path d="M8 16L16 8M9.5 8H16v6.5" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4.5l3 2" />
    </>
  ),
  close: <path d="M7 7l10 10M17 7L7 17" />,
  chev: <path d="M10 7l5 5-5 5" />,
  next: <path d="M5 12h13M13 7l5 5-5 5" />,
}

export const Glyph = ({ name }: { name: GlyphName }) => (
  <svg className="glyph" viewBox="0 0 24 24" aria-hidden="true">
    {ICONS[name]}
  </svg>
)

export const accent = (t: { color: string; tint: string }) => ({ '--accent': t.color, '--tint': t.tint }) as CSSProperties
const ME_ACCENT = { color: '#1C2033', tint: '#ECEEF5' }

function useNow() {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [])
  return now
}

// Открыть/закрыть панель. Соседи справа в том же ряду отъезжают, чтобы панель их не накрыла,
// и возвращаются при закрытии; камера встаёт на развёрнутую карточку.
function useDrawer(id: string, open: string | null, x: number, y: number) {
  const { updateNodeData, setNodes, setCenter, getInternalNode } = useReactFlow<AppNode>()
  return (next: string | null) => {
    updateNodeData(id, { open: next })
    if (!next === !open) return // переключение раздела — ширина карточки та же
    const dx = next ? DRAWER_W : -DRAWER_W
    setNodes((ns) =>
      ns.map((n) =>
        n.type === 'uni' && n.id !== id && n.position.x > x && Math.abs(n.position.y - y) < CARD_H
          ? { ...n, position: { x: n.position.x + dx, y: n.position.y } }
          : n,
      ),
    )
    if (!next) return
    const h = getInternalNode(id)?.measured.height ?? CARD_H
    const zoom = Math.min(1, (window.innerWidth - 80) / (NAV_W + DRAWER_W), (window.innerHeight - 180) / h)
    setCenter(x + (NAV_W + DRAWER_W) / 2, y + h / 2 + 18 / zoom, { zoom, duration: 600 })
  }
}

const R = 34
const C = 2 * Math.PI * R

function Ring({ value }: { value: number }) {
  const v = useSpring(0, { stiffness: 90, damping: 18 })
  useEffect(() => v.set(value), [v, value])
  const offset = useTransform(v, (x) => C * (1 - x))
  const pct = useTransform(v, (x) => Math.round(x * 100))
  return (
    <div className={'ring' + (value >= 1 ? ' ready' : '')} role="img" aria-label={`Готово ${Math.round(value * 100)}%`}>
      <svg viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={R} className="ring-track" />
        <motion.circle cx="40" cy="40" r={R} className="ring-bar" strokeDasharray={C} style={{ strokeDashoffset: offset }} />
      </svg>
      <span className="ring-num">
        <span>
          <motion.span>{pct}</motion.span>
          <small>%</small>
        </span>
      </span>
    </div>
  )
}

// Статус раздела: пустой кружок → дуга прогресса → зелёный кружок с галочкой.
function Status({ n, total, complete }: { n: number; total: number; complete: boolean }) {
  const c = 2 * Math.PI * 8
  return (
    <span className={'status' + (complete ? ' complete' : n ? '' : ' zero')} aria-hidden="true">
      <svg viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="8" className="status-track" />
        <circle
          cx="10"
          cy="10"
          r="8"
          className="status-arc"
          transform="rotate(-90 10 10)"
          strokeDasharray={c}
          style={{ strokeDashoffset: c * (1 - n / total) }}
        />
        <path d="M6.3 10.2l2.5 2.5 4.9-5.3" className="status-check" pathLength={1} />
      </svg>
    </span>
  )
}

const Mark = ({ name }: { name: GlyphName }) => (
  <span className="status symbol">
    <Glyph name={name} />
  </span>
)

function NavRow(props: { active: boolean; onClick: () => void; icon: ReactNode; title: string; meta: string; className?: string }) {
  return (
    <button className={(props.className ?? 'nav-row') + (props.active ? ' active' : '')} onClick={props.onClick} aria-expanded={props.active}>
      {props.icon}
      <span className="nav-title">{props.title}</span>
      <span className="nav-meta">{props.meta}</span>
      <Glyph name="chev" />
    </button>
  )
}

function SectionNav({ sections, done, open, onFlip }: { sections: Section[]; done: string[]; open: string | null; onFlip: (id: string) => void }) {
  return groupsOf(sections).map((g) => (
    <div key={g.label}>
      <p className="nav-label">{g.label}</p>
      {g.sections.map((s) => {
        const n = s.items.filter((i) => done.includes(i.id)).length
        return (
          <NavRow
            key={s.id}
            active={open === s.id}
            onClick={() => onFlip(s.id)}
            icon={<Status n={n} total={s.items.length} complete={sectionDone(s, done)} />}
            title={s.title}
            meta={`${n}/${s.items.length}`}
          />
        )
      })}
    </div>
  ))
}

// Общий каркас: слева шапка и разделы, справа выезжающая панель.
function Card(props: {
  style: CSSProperties
  eyebrow: string
  title: string
  value: number
  due: string
  tone: string
  nav: ReactNode
  foot?: ReactNode
  open: string | null
  children: ReactNode
}) {
  return (
    <motion.article
      className="uni"
      style={props.style}
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
    >
      <div className="uni-nav">
        <header className="uni-head">
          <div>
            <p className="eyebrow">{props.eyebrow}</p>
            <h2 className={'uni-name' + (props.title.length > 7 ? ' long' : '')}>{props.title}</h2>
          </div>
          <Ring value={props.value} />
        </header>
        <p className={'due ' + props.tone}>{props.due}</p>
        <nav className="nav nodrag">{props.nav}</nav>
        {props.foot && <footer className="uni-foot nodrag">{props.foot}</footer>}
      </div>

      <motion.div
        className="drawer"
        initial={false}
        animate={{ width: props.open ? DRAWER_W : 0 }}
        transition={{ type: 'spring', stiffness: 240, damping: 30 }}
      >
        <div className="drawer-inner">
          <AnimatePresence mode="wait" initial={false}>
            {props.open && (
              <motion.div
                key={props.open}
                className="panel"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.18 }}
              >
                {props.children}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.article>
  )
}

function NextButton({ next, titleOf, onGo }: { next?: string; titleOf: (id: string) => string; onGo: (id: string | null) => void }) {
  return (
    <button className="next-btn nodrag" onClick={() => onGo(next ?? null)}>
      {next ? (
        <>
          Дальше: {titleOf(next)} <Glyph name="next" />
        </>
      ) : (
        'Свернуть'
      )}
    </button>
  )
}

const DATES = 'dates'

export function UniNode({ id, data, positionAbsoluteX: x, positionAbsoluteY: y }: NodeProps<UniNodeT>) {
  const { updateNodeData, setNodes } = useReactFlow<AppNode>()
  const { done, toggle } = useContext(StoreCtx)
  const now = useNow()
  const [confirm, setConfirm] = useState(false)
  const tpl = TEMPLATES[data.tpl]
  const round = tpl.rounds.find((r) => r.id === data.round) ?? tpl.rounds[0]
  const p = progress(tpl, done)
  const ready = p.reqDone === p.req
  const deadline = round.milestones[0]
  const status = data.status ?? 'prep'
  const openSec = tpl.sections.find((s) => s.id === data.open)
  const open = data.open === DATES || openSec ? data.open! : null
  const show = useDrawer(id, open, x, y)
  const flip = (sid: string) => show(open === sid ? null : sid)
  const order = [DATES, ...tpl.sections.map((s) => s.id)]
  const next = open ? order[order.indexOf(open) + 1] : undefined
  const titleOf = (sid: string) => (sid === DATES ? 'Сроки и раунд' : tpl.sections.find((s) => s.id === sid)!.title)
  // Убрали карточку — соседи справа съезжают на её место.
  const remove = () => {
    const w = NAV_W + (open ? DRAWER_W : 0) + GAP
    setNodes((ns) =>
      ns
        .filter((n) => n.id !== id)
        .map((n) =>
          n.type === 'uni' && n.position.x > x && Math.abs(n.position.y - y) < CARD_H ? { ...n, position: { x: n.position.x - w, y: n.position.y } } : n,
        ),
    )
  }

  return (
    <Card
      style={accent(tpl)}
      eyebrow={tpl.place}
      title={tpl.name}
      value={p.reqDone / p.req}
      due={status !== 'prep' ? STATUS_LABEL[status] : ready ? 'Всё обязательное готово' : `${round.label}: подача ${countdown(deadline.at, now)}`}
      tone={status !== 'prep' ? 'st-' + status : ready ? 'ready' : daysLeft(deadline.at, now) < 14 ? 'soon' : ''}
      open={open}
      nav={
        <>
          <NavRow active={open === DATES} onClick={() => flip(DATES)} icon={<Mark name="clock" />} title="Сроки и раунд" meta={round.label} />
          <SectionNav sections={tpl.sections} done={done} open={open} onFlip={flip} />
        </>
      }
      foot={
        confirm ? (
          <div className="confirm">
            <span>Убрать {tpl.name} с доски? Общие отметки останутся.</span>
            <button className="btn-danger" onClick={remove}>
              Убрать
            </button>
            <button className="btn-ghost" onClick={() => setConfirm(false)}>
              Отмена
            </button>
          </div>
        ) : (
          <>
            <a className="pill-link" href={tpl.portal} target="_blank" rel="noreferrer">
              Портал <Glyph name="out" />
            </a>
            <a className="pill-link" href={tpl.guide} target="_blank" rel="noreferrer">
              Гайд <Glyph name="out" />
            </a>
            <button className="icon-btn danger" onClick={() => setConfirm(true)} aria-label={`Убрать ${tpl.name} с доски`}>
              <Glyph name="trash" />
            </button>
          </>
        )
      }
    >
      {openSec ? (
        <SectionPanel
          sec={openSec}
          done={done}
          onToggle={toggle}
          onClose={() => show(null)}
          inline={(it) => SHARED_IDS.has(it.id) && <span className="chip link">общее</span>}
        />
      ) : (
        <DatesPanel tpl={tpl} round={round} now={now} onRound={(r) => updateNodeData(id, { round: r })} onClose={() => show(null)} />
      )}
      <NextButton next={next} titleOf={titleOf} onGo={show} />
    </Card>
  )
}

export const STATUSES = [
  { id: 'prep', label: 'Готовлюсь' },
  { id: 'sent', label: 'Подано' },
  { id: 'interview', label: 'Интервью' },
  { id: 'admit', label: 'Приняли' },
  { id: 'wait', label: 'Лист ожидания' },
  { id: 'reject', label: 'Отказ' },
]
const STATUS_LABEL: Record<string, string> = Object.fromEntries(STATUSES.map((s) => [s.id, s.label]))

const DEADLINES = 'deadlines'
const PROFILE = 'profile'

// Главная карточка — горизонтальная шапка доски: профиль, таблица уников и общие разделы,
// которые раскрываются вниз (уники под ней съезжают следом — см. App).
export function MeNode({ id, data }: NodeProps<MeNodeT>) {
  const { updateNodeData } = useReactFlow<AppNode>()
  const { done, stats, board, toggle, setStat, focus } = useContext(StoreCtx)
  const now = useNow()
  const tpls = board.map((b) => b.tpl)
  const openSec = ME_SECTIONS.find((s) => s.id === data.open)
  const open = data.open === DEADLINES || data.open === PROFILE || openSec ? data.open! : null
  const flip = (sid: string) => updateNodeData(id, { open: open === sid ? null : sid })
  const close = () => updateNodeData(id, { open: null })
  // Прогресс главной — по общим пунктам, которые обязательны хотя бы одному унику на доске.
  const needed = ME_SECTIONS.flatMap((s) => s.items).filter((it) => usedBy(it.id, tpls, true).length > 0)
  const value = needed.length ? needed.filter((it) => done.includes(it.id)).length / needed.length : 0
  const dates = upcoming(board, now)
  // Главное — ближайшая подача: первая дата раунда у каждого уника — это дедлайн заявки.
  const soonest = upcoming(board.map((b) => ({ ...b, round: { ...b.round, milestones: b.round.milestones.slice(0, 1) } })), now)[0]
  const filled = STAT_FIELDS.filter((f) => stats[f.key]?.trim()).length
  const facts = [stats.school, stats.grad, stats.gpa && `GPA ${stats.gpa}`, stats.satTotal && `SAT ${stats.satTotal}`, `IELTS ${stats.ielts?.trim() || '—'}`, stats.major]

  return (
    <motion.article
      className="me"
      style={accent(ME_ACCENT)}
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 26 }}
    >
      <header className="me-head">
        <div>
          <p className="eyebrow">Общее для всех уников</p>
          <h2 className="uni-name">{stats.name?.trim() || 'Главное'}</h2>
        </div>
        <ul className="facts">
          {facts.filter(Boolean).map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
        <p className={'due ' + (soonest && daysLeft(soonest.m.at, now) < 14 ? 'soon' : '')}>
          {soonest ? `${soonest.tpl.name}: подача ${countdown(soonest.m.at, now)}` : 'Добавь уники — здесь появятся сроки'}
        </p>
        <Ring value={value} />
      </header>

      <UniTable board={board} done={done} now={now} onFocus={focus} onStatus={(uid, s) => updateNodeData(uid, { status: s })} />

      <nav className="tabs nodrag" aria-label="Общие разделы">
        <NavRow className="tab" active={open === DEADLINES} onClick={() => flip(DEADLINES)} icon={<Mark name="clock" />} title="Все дедлайны" meta={String(dates.length)} />
        <NavRow className="tab" active={open === PROFILE} onClick={() => flip(PROFILE)} icon={<Mark name="user" />} title="Мои данные" meta={`${filled}/${STAT_FIELDS.length}`} />
        <span className="tabs-sep" />
        {ME_SECTIONS.map((s) => {
          const n = s.items.filter((i) => done.includes(i.id)).length
          return (
            <NavRow
              key={s.id}
              className="tab"
              active={open === s.id}
              onClick={() => flip(s.id)}
              icon={<Status n={n} total={s.items.length} complete={sectionDone(s, done)} />}
              title={s.title}
              meta={`${n}/${s.items.length}`}
            />
          )
        })}
      </nav>

      <motion.div className="me-panel" initial={false} animate={{ height: open ? 'auto' : 0 }} transition={{ type: 'spring', stiffness: 260, damping: 32 }}>
        <AnimatePresence mode="wait" initial={false}>
          {open && (
            <motion.div
              key={open}
              className="panel wide"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              {open === DEADLINES && <DeadlinesPanel dates={dates} now={now} onClose={close} />}
              {open === PROFILE && <ProfilePanel stats={stats} setStat={setStat} tpls={tpls} onClose={close} />}
              {openSec && (
                <SectionPanel sec={openSec} done={done} onToggle={toggle} onClose={close} below={(it) => <UsedBy tpls={usedBy(it.id, tpls)} />} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.article>
  )
}

// Таблица уников: раунд, ближайшая подача, прогресс, следующий шаг и статус заявки.
function UniTable(props: {
  board: Store['board']
  done: string[]
  now: number
  onFocus: (id: string) => void
  onStatus: (id: string, status: string) => void
}) {
  if (!props.board.length) return null
  return (
    <div className="table nodrag" role="table" aria-label="Все уники">
      <div className="t-row t-head" role="row">
        <span>Уник</span>
        <span>Раунд</span>
        <span>Подача</span>
        <span>Готово</span>
        <span>Следующий шаг</span>
        <span>Статус</span>
      </div>
      {props.board.map(({ id, tpl, round, status }) => {
        const p = progress(tpl, props.done)
        const deadline = round.milestones[0]
        const step = nextStep(tpl, props.done)
        return (
          <div key={id} className="t-row" role="row" style={accent(tpl)}>
            <button className="t-uni" onClick={() => props.onFocus(id)} title="Показать карточку">
              <i />
              {tpl.name}
            </button>
            <span className="t-round">{round.label}</span>
            <span className="t-date">
              {when(deadline)}
              <small className={daysLeft(deadline.at, props.now) < 14 ? 'soon' : undefined}>{countdown(deadline.at, props.now)}</small>
            </span>
            <span className="t-progress">
              <span className="t-bar">
                <span style={{ transform: `scaleX(${p.reqDone / p.req})` }} />
              </span>
              <b>{Math.round((p.reqDone / p.req) * 100)}%</b>
              <small>
                {p.reqDone}/{p.req}
              </small>
            </span>
            <span className="t-next">
              {step ? (
                <>
                  {step.item.title}
                  <small>{step.sec.title}</small>
                </>
              ) : (
                <em>Всё обязательное готово</em>
              )}
            </span>
            <select
              className={'status-select st-' + status}
              value={status}
              onChange={(e) => props.onStatus(id, e.target.value)}
              aria-label={`Статус заявки в ${tpl.name}`}
            >
              {STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        )
      })}
    </div>
  )
}

const UsedBy = ({ tpls }: { tpls: Template[] }) => (
  <span className="for">
    {tpls.length ? (
      tpls.map((t) => (
        <span key={t.id} style={accent(t)}>
          {t.name}
        </span>
      ))
    ) : (
      <span className="none">пока ни одному унику на доске</span>
    )}
  </span>
)

function PanelHead(props: { icon: ReactNode; title: string; tag?: string; count?: string; complete?: boolean; onClose: () => void }) {
  return (
    <header className={'panel-head' + (props.complete ? ' complete' : '')}>
      <span className="panel-icon">{props.icon}</span>
      <div className="panel-title">
        <h3>{props.title}</h3>
        {props.tag && <span className="tag">{props.tag}</span>}
      </div>
      {props.count && <span className="count">{props.count}</span>}
      <button className="icon-btn nodrag" onClick={props.onClose} aria-label="Свернуть раздел">
        <Glyph name="close" />
      </button>
    </header>
  )
}

function DatesPanel(props: { tpl: Template; round: Round; now: number; onRound: (id: string) => void; onClose: () => void }) {
  const { tpl, round, now } = props
  const next = nextMilestone(round.milestones, now)
  return (
    <>
      <PanelHead icon={<Glyph name="clock" />} title="Сроки и раунд" onClose={props.onClose} />
      <div className="seg nodrag" role="radiogroup" aria-label="Раунд подачи" style={{ '--n': tpl.rounds.length } as CSSProperties}>
        <span className="seg-pill" style={{ transform: `translateX(${tpl.rounds.indexOf(round) * 100}%)` }} />
        {tpl.rounds.map((r) => (
          <button key={r.id} role="radio" aria-checked={r === round} onClick={() => props.onRound(r.id)}>
            {r.label}
            <small>до {when(r.milestones[0])}</small>
          </button>
        ))}
      </div>
      <p className="start">{round.note}</p>
      <ol className="timeline">
        {round.milestones.map((m) => {
          const isNext = m === next
          const cls = Date.parse(m.at) <= now ? 'past' : isNext ? 'next' : undefined
          return (
            <li key={m.label} className={cls} title={m.time && tpl.tz ? `${zoneTime(m.at, tpl.tz)} ${tpl.tzName}` : undefined}>
              <span className="tl-dot" />
              <span className="tl-label">{m.label}</span>
              <span className="tl-date">{when(m)}</span>
              {isNext && <span className={'tl-count' + (daysLeft(m.at, now) < 14 ? ' soon' : '')}>{countdown(m.at, now)}</span>}
            </li>
          )
        })}
      </ol>
      <p className="tz">Время — по твоему часовому поясу</p>
    </>
  )
}

function DeadlinesPanel({ dates, now, onClose }: { dates: ReturnType<typeof upcoming>; now: number; onClose: () => void }) {
  return (
    <>
      <PanelHead icon={<Glyph name="clock" />} title="Все дедлайны" onClose={onClose} />
      <p className="start">По выбранным раундам всех уников на доске</p>
      <ol className="timeline colored cols">
        {dates.map(({ tpl, m }, i) => (
          <li key={tpl.id + m.label} className={i === 0 ? 'next' : undefined} style={accent(tpl)}>
            <span className="tl-dot" />
            <span className="tl-label">
              <b>{tpl.name}</b> · {m.label}
            </span>
            <span className="tl-date">{when(m)}</span>
            {i === 0 && <span className={'tl-count' + (daysLeft(m.at, now) < 14 ? ' soon' : '')}>{countdown(m.at, now)}</span>}
          </li>
        ))}
      </ol>
      <p className="tz">Время — по твоему часовому поясу</p>
    </>
  )
}

function ProfilePanel(props: { stats: Stats; setStat: (k: string, v: string) => void; tpls: Template[]; onClose: () => void }) {
  const { stats } = props
  const withChecks = props.tpls.filter((t) => t.checks?.length)
  return (
    <>
      <PanelHead icon={<Glyph name="user" />} title="Мои данные" onClose={props.onClose} />
      <div className="profile">
        <div className="fields">
          {STAT_FIELDS.map((f) => (
            <label key={f.key} className={'field' + (f.key.startsWith('sat') ? ' third' : '')}>
              <span>{f.label}</span>
              <input className="nodrag" value={stats[f.key] ?? ''} placeholder={f.placeholder} onChange={(e) => props.setStat(f.key, e.target.value)} />
            </label>
          ))}
        </div>
        {withChecks.length > 0 && (
          <div>
            <p className="nav-label">Против требований</p>
            <ul className="verdicts">
            {withChecks.map((t) => (
              <li key={t.id} style={accent(t)}>
                <b>{t.name}</b>
                {t.checks!.map((c) => {
                  const r = c.test(stats)
                  return (
                    <span key={c.label} className={'verdict ' + (r === null ? 'unknown' : r ? 'ok' : 'bad')}>
                      {r === null ? '? ' : r ? '✓ ' : '✕ '}
                      {c.label}
                    </span>
                  )
                })}
              </li>
            ))}
            </ul>
          </div>
        )}
      </div>
    </>
  )
}

function SectionPanel(props: {
  sec: Section
  done: string[]
  onToggle: (id: string) => void
  onClose: () => void
  inline?: (it: Item) => ReactNode
  below?: (it: Item) => ReactNode
}) {
  const { sec, done } = props
  const n = sec.items.filter((it) => done.includes(it.id)).length
  const complete = sectionDone(sec, done)
  const mixed = sec.items.some((it) => !it.optional)
  return (
    <>
      <PanelHead
        icon={<Glyph name={sec.icon} />}
        title={sec.title}
        tag={sec.tag}
        count={`${n}/${sec.items.length}`}
        complete={complete}
        onClose={props.onClose}
      />
      <div className={'bar' + (complete ? ' complete' : '')}>
        <span style={{ transform: `scaleX(${n / sec.items.length})` }} />
      </div>
      <ul className="rows">
        {sec.items.map((it, i) => (
          <motion.li key={it.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.035 }}>
            <Row
              item={it}
              on={done.includes(it.id)}
              optional={mixed && !!it.optional}
              onToggle={() => props.onToggle(it.id)}
              inline={props.inline?.(it)}
              below={props.below?.(it)}
            />
          </motion.li>
        ))}
      </ul>
      {sec.note && <p className="note">{sec.note}</p>}
    </>
  )
}

function Row(props: { item: Item; on: boolean; optional: boolean; onToggle: () => void; inline?: ReactNode; below?: ReactNode }) {
  const { item, on } = props
  return (
    <button className={'row nodrag' + (on ? ' on' : '')} onClick={props.onToggle} aria-pressed={on}>
      <span className="check">
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <motion.path
            d="M5.5 10.4l3.1 3.1 6-6.6"
            initial={false}
            animate={{ pathLength: on ? 1 : 0, opacity: on ? 1 : 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          />
        </svg>
      </span>
      <span className="row-text">
        <span className="row-title">
          <span className="strike">{item.title}</span>
          {item.limit && <span className="chip">{item.limit}</span>}
          {props.optional && <span className="chip soft">по желанию</span>}
          {props.inline}
        </span>
        {item.hint && <span className="row-hint">{item.hint}</span>}
        {props.below}
      </span>
    </button>
  )
}
