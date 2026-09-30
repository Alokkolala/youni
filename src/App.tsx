import { useEffect, useMemo, useState } from 'react'
import { Background, BackgroundVariant, ReactFlow, ReactFlowProvider, useNodesState, useReactFlow } from '@xyflow/react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import '@xyflow/react/dist/base.css'
import { DEFAULT_STATS } from './profile'
import { TEMPLATES, type Stats } from './templates'
import { DRAWER_W, GAP, Glyph, ME_W, MeNode, NAV_W, UniNode, accent, type AppNode, type UniNodeT } from './nodes'
import { StoreCtx, type Store } from './store'
import { plural, progress } from './lib'

const nodeTypes = { uni: UniNode, me: MeNode }
const KEY = 'youni:v1'
const LAYOUT = 3 // главная сверху, уники рядом под ней; старые раскладки собираются заново
const CARD_W = NAV_W + DRAWER_W // карточка уника в развёрнутом виде
const START = ['kaist', 'mbzuai', 'dartmouth', 'nyu'] // уники, куда подаёшься, — стартовая доска

// Логотип сверху и док снизу занимают место — камера оставляет под них поля и не приближает больше 100%.
const PAD = { top: 72, bottom: 108, x: 40 }
const FIT = { padding: { top: `${PAD.top}px`, bottom: `${PAD.bottom}px`, x: `${PAD.x}px` }, maxZoom: 1 } as const

type Saved = { nodes: AppNode[]; done: string[]; stats: Stats }

const isUni = (n: AppNode): n is UniNodeT => n.type === 'uni'
const widthOf = (n: AppNode) => (n.type === 'me' ? ME_W : NAV_W + (n.data.open ? DRAWER_W : 0))
const ME: AppNode = { id: 'me', type: 'me', position: { x: 0, y: 0 }, data: { open: null }, draggable: false, selectable: false }

// Главная сверху, уники в ряд под ней (по вертикали их выравнивает эффект в Board), всё свёрнуто.
const freshBoard = (unis: { tpl: string; round?: string; status?: string }[]): AppNode[] => [
  ME,
  ...unis.map(
    ({ tpl, round, status }, i): UniNodeT => ({
      id: `${tpl}-${i}`,
      type: 'uni',
      position: { x: i * (NAV_W + GAP), y: 0 },
      data: { tpl, round: round ?? TEMPLATES[tpl].rounds[0].id, status: status ?? 'prep', open: null },
    }),
  ),
]

function load(): Saved {
  // Формат из localStorage проверяем руками: он мог остаться от любой прошлой версии.
  let raw: any = null
  try {
    raw = JSON.parse(localStorage.getItem(KEY) ?? 'null')
  } catch {
    // битые данные — соберём доску заново
  }
  const stats = { ...DEFAULT_STATS, ...raw?.stats }
  if (raw?.layout === LAYOUT && Array.isArray(raw.nodes)) {
    const nodes: AppNode[] = raw.nodes.filter((n: AppNode) => n.type === 'uni' && TEMPLATES[n.data?.tpl])
    return { nodes: [ME, ...nodes], done: Array.isArray(raw.done) ? raw.done : [], stats }
  }
  // Первый запуск или прошлая версия: собираем доску заново, сохраняя уники (в прежнем порядке),
  // их раунды и все отметки, и добавляем уники, которых ещё не было.
  const nodes: any[] = Array.isArray(raw) ? raw : Array.isArray(raw?.nodes) ? raw.nodes : []
  const old = nodes.filter((n) => n?.type === 'uni' && TEMPLATES[n.data?.tpl]).sort((a, b) => a.position.x - b.position.x)
  const tpls = [...new Set([...old.map((n) => n.data.tpl as string), ...START])]
  const byTpl = (tpl: string) => old.find((n) => n.data.tpl === tpl)?.data
  return {
    nodes: freshBoard(tpls.map((tpl) => ({ tpl, round: byTpl(tpl)?.round, status: byTpl(tpl)?.status }))),
    done: [...new Set<string>([...(Array.isArray(raw?.done) ? raw.done : []), ...old.flatMap((n) => n.data.done ?? [])])],
    stats,
  }
}

function Board() {
  const [saved] = useState(load)
  const [nodes, setNodes, onNodesChange] = useNodesState<AppNode>(saved.nodes)
  const [done, setDone] = useState(saved.done)
  const [stats, setStats] = useState(saved.stats)
  const { fitView, zoomIn, zoomOut, setCenter, getInternalNode } = useReactFlow<AppNode>()
  const [picker, setPicker] = useState(false)

  useEffect(() => {
    const slim = nodes.map(({ id, type, position, data }) => ({ id, type, position, data }))
    try {
      localStorage.setItem(KEY, JSON.stringify({ layout: LAYOUT, nodes: slim, done, stats }))
    } catch {
      // приватный режим браузера: работаем без сохранения
    }
  }, [nodes, done, stats])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPicker(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Главная растёт вниз (таблица, раскрытые разделы) — ряд уников держится на GAP под ней,
  // сохраняя взаимное расположение карточек.
  const meH = nodes.find((n) => n.type === 'me')?.measured?.height
  useEffect(() => {
    if (!meH) return
    setNodes((ns) => {
      const unis = ns.filter(isUni)
      if (!unis.length) return ns
      const delta = meH + GAP - Math.min(...unis.map((n) => n.position.y))
      return delta ? ns.map((n) => (isUni(n) ? { ...n, position: { x: n.position.x, y: n.position.y + delta } } : n)) : ns
    })
  }, [meH, setNodes])

  // Камера встаёт по центру места под развёрнутую карточку — панель справа потом откроется без сдвигов.
  const frame = (id: string, duration: number) => {
    const node = getInternalNode(id)
    if (!node) return
    const h = node.measured.height ?? 620
    const zoom = Math.min(1, (innerWidth - 2 * PAD.x) / CARD_W, (innerHeight - PAD.top - PAD.bottom) / h)
    const { x, y } = node.internals.positionAbsolute
    setCenter(x + CARD_W / 2, y + h / 2 + (PAD.bottom - PAD.top) / 2 / zoom, { zoom, duration })
  }

  // Ключ «какие уники, раунды и статусы на доске» — чтобы не пересобирать контекст на каждый кадр перетаскивания.
  const boardKey = nodes
    .filter(isUni)
    .sort((a, b) => a.position.x - b.position.x)
    .map((n) => [n.id, n.data.tpl, n.data.round, n.data.status ?? 'prep'].join('|'))
    .join(',')
  // frame зависит только от стабильных функций React Flow, поэтому в зависимостях его нет.
  const store = useMemo<Store>(
    () => ({
      done,
      stats,
      board: boardKey
        ? boardKey.split(',').map((k) => {
            const [id, t, r, status] = k.split('|')
            const tpl = TEMPLATES[t]
            return { id, tpl, round: tpl.rounds.find((x) => x.id === r) ?? tpl.rounds[0], status }
          })
        : [],
      toggle: (id) => setDone((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id])),
      setStat: (key, value) => setStats((s) => ({ ...s, [key]: value })),
      focus: (id) => frame(id, 700),
    }),
    [done, stats, boardKey],
  )

  const add = (tplId: string) => {
    setPicker(false)
    const existing = nodes.find((n) => isUni(n) && n.data.tpl === tplId)
    if (existing) {
      frame(existing.id, 800)
      return
    }
    const tpl = TEMPLATES[tplId]
    const id = `${tplId}-${Date.now().toString(36)}`
    const unis = nodes.filter(isUni)
    const x = unis.length ? Math.max(...unis.map((n) => n.position.x + widthOf(n))) + GAP : 0
    const y = unis.length ? Math.min(...unis.map((n) => n.position.y)) : 0
    setNodes((ns) => [...ns, { id, type: 'uni', position: { x, y }, data: { tpl: tplId, round: tpl.rounds[0].id, status: 'prep', open: null } }])
    // Через пару кадров карточка уже замерена — камера прилетает к ней.
    requestAnimationFrame(() => requestAnimationFrame(() => frame(id, 800)))
  }

  // Старт: главная во всю ширину экрана, прижата к верху — уники ниже, до них можно доскроллить.
  const [start] = useState(() => {
    const zoom = Math.min(1, (innerWidth - 2 * PAD.x) / ME_W)
    return { x: (innerWidth - ME_W * zoom) / 2, y: PAD.top, zoom }
  })

  return (
    <StoreCtx.Provider value={store}>
      <div className="app">
        <ReactFlow
          nodes={nodes}
          onNodesChange={onNodesChange}
          nodeTypes={nodeTypes}
          defaultViewport={start}
          minZoom={0.25}
          maxZoom={1.6}
          panOnScroll
          zoomOnDoubleClick={false}
          nodesConnectable={false}
          deleteKeyCode={null}
          onPaneClick={() => setPicker(false)}
          onNodeClick={() => setPicker(false)}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1.6} color="#c3ccdb" />
        </ReactFlow>

        <div className="brand">
          youni<small>доска поступления</small>
        </div>

        <div className="dock">
          <AnimatePresence>{picker && <Picker onBoard={new Set(store.board.map((b) => b.tpl.id))} onPick={add} />}</AnimatePresence>
          <button className="dock-add" onClick={() => setPicker((p) => !p)} aria-expanded={picker}>
            <Glyph name="plus" />
            Уники
          </button>
          <span className="dock-sep" />
          <button className="dock-btn" onClick={() => zoomOut({ duration: 250 })} aria-label="Отдалить">
            <Glyph name="zout" />
          </button>
          <button className="dock-btn" onClick={() => zoomIn({ duration: 250 })} aria-label="Приблизить">
            <Glyph name="zin" />
          </button>
          <button className="dock-btn" onClick={() => fitView({ ...FIT, duration: 600 })} aria-label="Показать всю доску">
            <Glyph name="fit" />
          </button>
        </div>
      </div>
    </StoreCtx.Provider>
  )
}

function Picker({ onBoard, onPick }: { onBoard: Set<string>; onPick: (id: string) => void }) {
  return (
    <motion.div
      className="picker"
      role="dialog"
      aria-label="Уники"
      initial={{ opacity: 0, y: 14, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
    >
      <p className="picker-title">Уники</p>
      {Object.values(TEMPLATES).map((t) => {
        const { req } = progress(t, [])
        return (
          <button key={t.id} className="pick" style={accent(t)} onClick={() => onPick(t.id)}>
            <span className="pick-tile">{t.name[0]}</span>
            <span className="pick-text">
              <b>{t.name}</b>
              <small>
                {t.place} · {req} {plural(req, 'шаг', 'шага', 'шагов')}
              </small>
            </span>
            <span className="pick-go">{onBoard.has(t.id) ? 'Показать' : 'Добавить'}</span>
          </button>
        )
      })}
    </motion.div>
  )
}

export default function App() {
  return (
    <ReactFlowProvider>
      <MotionConfig reducedMotion="user">
        <Board />
      </MotionConfig>
    </ReactFlowProvider>
  )
}
