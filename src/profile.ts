import type { Stats } from './templates'

export const STAT_FIELDS = [
  { key: 'name', label: 'Имя' },
  { key: 'school', label: 'Школа' },
  { key: 'grad', label: 'Класс и выпуск' },
  { key: 'gpa', label: 'Средний балл' },
  { key: 'major', label: 'Направление' },
  { key: 'ielts', label: 'IELTS', placeholder: 'ещё не сдан' },
  { key: 'satTotal', label: 'SAT сумма' },
  { key: 'satMath', label: 'SAT Math' },
  { key: 'satRW', label: 'SAT R&W' },
]

// Личных данных в репозитории нет: стартовый профиль подхватывается из src/profile.local.json
// (он в .gitignore), если такой файл есть. Дальше профиль живёт в браузере и правится в «Моих данных».
const local = Object.values(import.meta.glob<Stats>('./profile.local.json', { eager: true, import: 'default' }))[0]

export const DEFAULT_STATS: Stats = { ...Object.fromEntries(STAT_FIELDS.map((f) => [f.key, ''])), ...local }
