import { createContext } from 'react'
import type { Round, Stats, Template } from './templates'

// Общее состояние доски. Отметки одни на всех: общий пункт закрывается сразу во всех карточках.
// Живёт в своём модуле, чтобы горячая перезагрузка карточек не пересоздавала контекст.
export type Store = {
  done: string[]
  stats: Stats
  board: { id: string; tpl: Template; round: Round; status: string }[]
  toggle: (id: string) => void
  setStat: (key: string, value: string) => void
  focus: (id: string) => void // камера к карточке уника
}

export const StoreCtx = createContext<Store>(null!)
