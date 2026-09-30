export type Icon = 'form' | 'pen' | 'id' | 'chart' | 'mail' | 'star' | 'flag' | 'cash' | 'send' | 'user'
// limit — подпись лимита как есть: «300 зн.», «650 слов».
export type Item = { id: string; title: string; hint?: string; limit?: string; optional?: boolean }
// group — своя группа в навигации; без неё раздел попадает в «Обязательно» или «По желанию».
export type Section = { id: string; title: string; icon: Icon; group?: string; tag?: string; note?: string; items: Item[] }
// at без смещения — дедлайн по времени заявителя (так у Common App); approx — дата примерная.
export type Milestone = { label: string; at: string; time?: boolean; approx?: boolean }
export type Round = { id: string; label: string; note: string; milestones: Milestone[] }
export type Stats = Record<string, string>
export type Check = { label: string; test: (s: Stats) => boolean | null }
export type Template = {
  id: string
  name: string
  place: string
  portal: string
  guide: string
  color: string
  tint: string
  tz?: string // пояс, в котором уник назначил время дедлайна
  tzName?: string
  rounds: Round[]
  sections: Section[]
  checks?: Check[] // сравнение твоих баллов с требованиями
}

const num = (v?: string) => {
  const n = parseFloat((v ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
const atLeast = (key: string, min: number) => (s: Stats) => {
  const n = num(s[key])
  return n === null ? null : n >= min
}

// ---------- общее: один id в нескольких униках — отмечается один раз, галочка видна везде ----------

export const SHARED = {
  passport: { id: 'passport', title: 'Паспорт', hint: 'Цветной скан: видны фото, номер, даты выдачи и срока' },
  transcript: { id: 'transcript', title: 'Транскрипт с переводом', hint: 'Официальный, оценки за 2–3 года, включая текущие' },
  awards: { id: 'awards', title: 'Подтверждения наград', hint: 'Сканы дипломов олимпиад и конкурсов' },
  ielts: { id: 'ielts', title: 'Сдать IELTS Academic', hint: 'В центре — домашние версии берут не везде' },
  sat: { id: 'sat', title: 'Сдать SAT', hint: 'Отчёт в каждый уник отправляется отдельно' },
  teachers: { id: 'rec-ask', title: 'Договориться с учителями', hint: 'Двое: математика или информатика и ещё один предмет' },
  css: { id: 'css', title: 'Заполнить CSS Profile', hint: 'Анкета о доходах семьи на College Board — одна на все уники' },
  caProfile: { id: 'ca-profile', title: 'О себе и семье', hint: 'Контакты, гражданство, родители' },
  caSchool: { id: 'ca-school', title: 'Школа, оценки, награды', hint: 'Шкала оценок, текущие предметы, до 5 наград' },
  caTests: { id: 'ca-tests', title: 'Баллы тестов', hint: 'Впиши SAT и IELTS, которые хочешь показать' },
  caActivities: { id: 'ca-activities', title: 'Активности', hint: 'До 10 пунктов, описание каждого — до 150 знаков' },
  caEssay: { id: 'ca-essay', title: 'Главное эссе', hint: 'Одно на все уники из Common App', limit: '650 слов' },
  caConsent: { id: 'ca-consent', title: 'Согласие о рекомендациях', hint: 'Подписать до того, как пригласишь учителей' },
  caCounselor: { id: 'ca-counselor', title: 'Отчёт консультанта', hint: 'Консультант загружает транскрипт, профиль школы и отзыв' },
  caTeacher1: { id: 'ca-teacher-1', title: 'Письмо первого учителя', hint: 'Учитель загружает сам, письмо уходит во все уники' },
  caTeacher2: { id: 'ca-teacher-2', title: 'Письмо второго учителя', hint: 'Нужно не всем уникам' },
  caMidyear: { id: 'ca-midyear', title: 'Оценки за полугодие', hint: 'Консультант отправит зимой', optional: true },
} satisfies Record<string, Item>

export const SHARED_IDS = new Set(Object.values(SHARED).map((i) => i.id))

const S = SHARED
const commonApp = (testsOptional = false): Section => ({
  id: 'ca',
  title: 'Common App',
  icon: 'flag',
  tag: 'общая',
  note: 'Одна анкета на все уники из Common App — отмечается сразу везде.',
  items: [S.caProfile, S.caSchool, testsOptional ? { ...S.caTests, optional: true } : S.caTests, S.caActivities, S.caEssay],
})

// ---------- главная карточка ----------

export const ME_SECTIONS: Section[] = [
  { id: 'me-docs', title: 'Документы', icon: 'id', group: 'Нужно почти везде', items: [S.passport, S.transcript, S.awards] },
  { id: 'me-tests', title: 'Тесты', icon: 'chart', group: 'Нужно почти везде', items: [S.ielts, S.sat] },
  { id: 'me-teachers', title: 'Учителя', icon: 'mail', group: 'Нужно почти везде', items: [S.teachers] },
  {
    id: 'me-ca',
    title: 'Общая анкета',
    icon: 'flag',
    group: 'Common App',
    note: 'Эти пункты заполняются один раз и уходят во все уники из Common App.',
    items: [
      S.caProfile,
      S.caSchool,
      S.caTests,
      S.caActivities,
      S.caEssay,
      S.caConsent,
      S.caCounselor,
      S.caTeacher1,
      S.caTeacher2,
      S.caMidyear,
    ],
  },
  { id: 'me-aid', title: 'CSS Profile', icon: 'cash', group: 'Финпомощь', items: [S.css] },
]

// ---------- уники ----------

// KAIST: официальный Admissions Guide for 2027 admission (admission.kaist.ac.kr).
const kaist: Template = {
  id: 'kaist',
  name: 'KAIST',
  place: 'Корея · Тэджон',
  portal: 'https://univapply.kaist.ac.kr/interapply/',
  guide: 'https://admission.kaist.ac.kr/intl-undergraduate/application/ApplicationGuide/guide',
  color: '#2B59E8',
  tint: '#E8EEFF',
  tz: 'Asia/Seoul',
  tzName: 'по Сеулу',
  rounds: [
    {
      id: 'early',
      label: 'Early',
      note: 'Старт весной или осенью 2027',
      milestones: [
        { label: 'Подача заявки', at: '2026-10-22T18:00:00+09:00', time: true },
        { label: 'Рекомендации', at: '2026-10-29T18:00:00+09:00', time: true },
        { label: 'Интервью, если позовут', at: '2026-12-22T12:00:00+09:00' },
        { label: 'Результаты', at: '2027-01-07T12:00:00+09:00' },
      ],
    },
    {
      id: 'regular',
      label: 'Regular',
      note: 'Старт осенью 2027',
      milestones: [
        { label: 'Подача заявки', at: '2027-01-14T18:00:00+09:00', time: true },
        { label: 'Рекомендации', at: '2027-01-21T18:00:00+09:00', time: true },
        { label: 'Интервью, если позовут', at: '2027-03-03T12:00:00+09:00' },
        { label: 'Результаты', at: '2027-03-25T12:00:00+09:00' },
      ],
    },
  ],
  sections: [
    {
      id: 'form',
      title: 'Анкета',
      icon: 'form',
      items: [
        { id: 'form-bio', title: 'Личные данные и учёба', hint: 'Имя как в паспорте, все школы, дата выпуска' },
        { id: 'form-track', title: 'Трек и семестр', hint: 'Spring — только при выпуске до 28 февраля 2027' },
        { id: 'kaist-upload', title: 'Загрузить документы в портал', hint: 'Транскрипт, паспорт, IELTS, награды — PDF, A4' },
        { id: 'form-fee', title: 'Взнос 80 USD', hint: 'После оплаты трек уже не поменять' },
      ],
    },
    {
      id: 'essays',
      title: 'Эссе',
      icon: 'pen',
      note: 'Лимит — в знаках с пробелами, но портал режет по байтам. Держи запас.',
      items: [
        { id: 'q1a', title: 'Q1 · Твой вопрос в STEM', hint: 'Вопрос, который отличает тебя от других', limit: '300 зн.' },
        { id: 'q1b', title: 'Q1 · Откуда этот вопрос', hint: 'Что подтолкнуло его задать. Не пересказывай R&E-проект', limit: '1 600 зн.' },
        { id: 'q2', title: 'Q2 · До трёх активностей', hint: 'Чему научили учёба или внеклассное', limit: '1 500 зн.' },
        { id: 'q3', title: 'Q3 · Не как все', hint: 'Когда твой подход отличался и к чему это привело', limit: '1 500 зн.' },
        { id: 'q4', title: 'Q4 · Забота и команда', hint: 'Помощь, сотрудничество или разрешение конфликта', limit: '1 500 зн.' },
        { id: 'q5', title: 'Q5 · Семья и трудности', hint: 'Если есть, что важно знать о твоём пути', limit: '1 000 зн.', optional: true },
      ],
    },
    {
      id: 'docs',
      title: 'Документы',
      icon: 'id',
      note: 'Сканы в PDF, A4, всё читаемо. Не на английском — перевод, заверенный бюро или нотариусом.',
      items: [S.transcript, S.passport],
    },
    {
      id: 'tests',
      title: 'Тесты',
      icon: 'chart',
      note: 'Вместо SAT подойдут ACT, AP, IB или A-level. IELTS 6.5+ рекомендуют; Duolingo и домашние версии не берут.',
      items: [S.sat, { id: 'kaist-sat-send', title: 'Отправить SAT в KAIST', hint: 'Код 4433, идёт 1–2 недели' }, S.ielts],
    },
    {
      id: 'recs',
      title: 'Рекомендации',
      icon: 'mail',
      tag: 'очень советуют',
      items: [
        { ...S.teachers, optional: true },
        { id: 'rec-sent', title: 'Письма загружены', hint: 'Ссылка придёт учителям после оплаты взноса. До двух писем', optional: true },
      ],
    },
    {
      id: 'extra',
      title: 'Бонусы',
      icon: 'star',
      items: [
        { ...S.awards, optional: true },
        { id: 'profile', title: 'Профиль школы', hint: 'Брошюра школы или министерства, до 5 страниц', optional: true },
        { id: 'report', title: 'School Report', hint: 'Документ школы о системе оценок и твоём месте в ней', optional: true },
      ],
    },
  ],
  checks: [{ label: 'IELTS 6.5+', test: atLeast('ielts', 6.5) }],
}

// MBZUAI: undergraduate Fall 2027 — сверено по официальной странице admissions (EA), 2026-09-29.
const mbzuai: Template = {
  id: 'mbzuai',
  name: 'MBZUAI',
  place: 'ОАЭ · Абу-Даби',
  portal: 'https://apply.mbzuai.ac.ae',
  guide: 'https://mbzuai.ac.ae/admissions/undergraduate-admissions',
  color: '#0E7490',
  tint: '#E0F2F6',
  tz: 'Asia/Dubai',
  tzName: 'по Абу-Даби',
  rounds: [
    {
      id: 'ea',
      label: 'EA',
      note: 'Не обязывает. Смотрят по мере поступления — лучше раньше',
      milestones: [
        { label: 'Подача заявки', at: '2026-11-01T17:00:00+04:00', time: true },
        { label: 'Решение', at: '2027-01-15T17:00:00+04:00' },
      ],
    },
    {
      id: 'rd',
      label: 'RD',
      note: 'За цикл можно подать только одну заявку',
      milestones: [
        { label: 'Подача заявки', at: '2027-02-01T12:00:00Z' },
        { label: 'Решение', at: '2027-04-01T12:00:00Z' },
      ],
    },
  ],
  sections: [
    {
      id: 'mbz-form',
      title: 'Анкета',
      icon: 'form',
      items: [
        { id: 'mbz-account', title: 'Аккаунт и заявка', hint: 'apply.mbzuai.ac.ae — одна заявка за цикл' },
        { id: 'mbz-bio', title: 'Личные данные', hint: 'Имя в точности как в паспорте' },
        { id: 'mbz-program', title: 'Программа', hint: 'AI Engineering — технический трек, AI Business — без кода' },
        { id: 'mbz-grades', title: 'Школа и оценки', hint: 'Средний балл — ровно как в транскрипте, без перевода в 4.0' },
        { id: 'mbz-activities', title: 'Достижения и активности', hint: 'Олимпиады, стартап, лидерство — с подтверждением' },
      ],
    },
    {
      id: 'mbz-writing',
      title: 'Эссе и CV',
      icon: 'pen',
      items: [
        { id: 'mbz-ps', title: 'Personal statement', hint: 'Почему AI и MBZUAI, цели, достижения. Не копия эссе Common App' },
        { id: 'mbz-cv', title: 'CV', hint: '1–2 страницы: проекты, олимпиады, стартап, лидерство' },
        { id: 'mbz-portfolio', title: 'GitHub и проекты', hint: '4–6 сильных проектов со ссылками', optional: true },
        { id: 'mbz-video', title: 'Видео о себе', hint: 'Ссылка: YouTube с доступом по ссылке, Vimeo или диск', optional: true },
      ],
    },
    {
      id: 'mbz-docs',
      title: 'Документы',
      icon: 'id',
      note: 'Всё не на английском — с заверенным переводом. Аттестат донесёшь после зачисления.',
      items: [
        S.transcript,
        { id: 'mbz-predicted', title: 'Текущие и прогнозные оценки', hint: 'Подаёшься из 12 класса — аттестат ждать не нужно' },
        { id: 'mbz-reports', title: 'Табели прошлых лет', hint: 'Если портал попросит', optional: true },
        { ...S.passport, optional: true },
      ],
    },
    {
      id: 'mbz-tests',
      title: 'Тесты',
      icon: 'chart',
      note: 'Домашние версии не берут. Duolingo (120) — только если другие тесты недоступны.',
      items: [
        S.ielts,
        { id: 'mbz-english', title: 'Результат IELTS в портале', hint: 'Минимум 6.5, должен действовать на момент подачи' },
        { ...S.sat, optional: true },
        { id: 'mbz-waiver', title: 'Освобождение от экзамена', hint: 'SAT Math 760+ и сумма 1400+ — приложи подтверждение', optional: true },
        { id: 'mbz-screening', title: 'Онлайн-экзамен', hint: 'Если освобождения нет: математика, логика, код, данные', optional: true },
      ],
    },
    {
      id: 'mbz-recs',
      title: 'Рекомендации',
      icon: 'mail',
      tag: 'до двух',
      items: [
        { ...S.teachers, optional: true },
        { id: 'mbz-refs', title: 'Рекомендатели в портале', hint: 'Учитель математики или информатики и ментор проекта', optional: true },
      ],
    },
    {
      id: 'mbz-send',
      title: 'Отправка',
      icon: 'send',
      items: [
        { id: 'mbz-fee', title: 'Взнос AED 200 или освобождение', hint: 'Снимают вместе с экзаменом — не плати заранее' },
        { id: 'mbz-submit', title: 'Проверить и отправить', hint: 'После отправки можно добавить только новые баллы и транскрипт' },
      ],
    },
    {
      id: 'mbz-after',
      title: 'После подачи',
      icon: 'user',
      group: 'Потом',
      items: [{ id: 'mbz-interview', title: 'Онлайн-интервью', hint: 'Если позовут: мотивация, математика, решение задач', optional: true }],
    },
  ],
  checks: [
    { label: 'IELTS 6.5+', test: atLeast('ielts', 6.5) },
    {
      label: 'без экзамена: SAT Math 760+ и 1400+',
      test: (s) => {
        const math = num(s.satMath)
        const total = num(s.satTotal)
        return math === null || total === null ? null : math >= 760 && total >= 1400
      },
    },
  ],
}

const binding = 'Обязывающее: если примут, отзываешь остальные заявки. ED — только в один уник'

// Dartmouth: admissions.dartmouth.edu, Class of 2031.
const dartmouth: Template = {
  id: 'dartmouth',
  name: 'Dartmouth',
  place: 'США · Ганновер',
  portal: 'https://apply.commonapp.org',
  guide: 'https://admissions.dartmouth.edu/apply-dartmouth',
  color: '#1B6B45',
  tint: '#E4F1EA',
  rounds: [
    {
      id: 'ed',
      label: 'ED',
      note: binding,
      milestones: [
        { label: 'Подача заявки', at: '2026-11-01T23:59:00', time: true },
        { label: 'Документы на финпомощь', at: '2026-11-01T12:00:00Z' },
        { label: 'Решение', at: '2026-12-15T12:00:00Z', approx: true },
      ],
    },
    {
      id: 'rd',
      label: 'RD',
      note: 'Не обязывает',
      milestones: [
        { label: 'Подача заявки', at: '2027-01-01T23:59:00', time: true },
        { label: 'Документы на финпомощь', at: '2027-02-01T12:00:00Z' },
        { label: 'Решение', at: '2027-04-01T12:00:00Z', approx: true },
      ],
    },
  ],
  sections: [
    commonApp(),
    {
      id: 'dart-q',
      title: 'Вопросы Dartmouth',
      icon: 'form',
      items: [
        { id: 'dart-questions', title: 'Вопросы колледжа в Common App', hint: 'Раунд, интересы, связи с Dartmouth' },
        { id: 'dart-ed', title: 'Соглашение ED', hint: 'Только для ED: подписывают ты, родитель и консультант', optional: true },
      ],
    },
    {
      id: 'dart-essays',
      title: 'Эссе Dartmouth',
      icon: 'pen',
      note: 'Эссе Dartmouth отправляются отдельно от основной анкеты.',
      items: [
        { id: 'dart-why', title: 'Почему Dartmouth', hint: 'Что привлекает в учёбе, сообществе или кампусе', limit: '100 слов' },
        { id: 'dart-q2', title: 'Эссе о себе', hint: 'Одна тема из двух: откуда ты или просто представься', limit: '250 слов' },
        { id: 'dart-q3', title: 'Эссе на выбор', hint: 'Одна тема из шести', limit: '250 слов' },
      ],
    },
    {
      id: 'dart-tests',
      title: 'Тесты',
      icon: 'chart',
      note: 'Вместо SAT подойдут три экзамена AP, IB, A-level или национальный экзамен.',
      items: [
        S.sat,
        { id: 'dart-sat-send', title: 'Отправить SAT в Dartmouth', hint: 'Код College Board — 3351' },
        S.ielts,
        { id: 'dart-english', title: 'Отправить IELTS в Dartmouth', hint: 'Нужен, если последние 2 года учишься не на английском' },
      ],
    },
    {
      id: 'dart-recs',
      title: 'Рекомендации',
      icon: 'mail',
      items: [
        S.teachers,
        S.caConsent,
        S.caCounselor,
        S.caTeacher1,
        S.caTeacher2,
        { id: 'dart-peer', title: 'Рекомендация от друга', hint: 'Одноклассник пишет о тебе — советуют, но не обязательно', optional: true },
        S.caMidyear,
      ],
    },
    {
      id: 'dart-aid',
      title: 'Финпомощь',
      icon: 'cash',
      group: 'Если нужна финпомощь',
      note: 'Dartmouth не смотрит на финансы семьи при отборе и закрывает 100% подтверждённой нужды.',
      items: [
        { ...S.css, optional: true },
        { id: 'dart-css', title: 'Добавить Dartmouth в CSS Profile', hint: 'Код 3351', optional: true },
        { id: 'dart-tax', title: 'Налоговые документы родителей', hint: 'Подписанные декларации за 2025 — через IDOC', optional: true },
      ],
    },
    {
      id: 'dart-send',
      title: 'Отправка',
      icon: 'send',
      items: [
        { id: 'dart-fee', title: 'Взнос или fee waiver', hint: 'Waiver можно попросить, если взнос не по карману' },
        { id: 'dart-submit', title: 'Отправить анкету и эссе', hint: 'Это две отдельные отправки' },
      ],
    },
    {
      id: 'dart-after',
      title: 'После подачи',
      icon: 'user',
      group: 'Потом',
      items: [{ id: 'dart-interview', title: 'Интервью с выпускником', hint: 'Если пригласят — не обязательно', optional: true }],
    },
  ],
  checks: [{ label: 'IELTS 7+ у поступивших', test: atLeast('ielts', 7) }],
}

// NYU: nyu.edu/admissions, первокурсники на осень 2027.
const nyu: Template = {
  id: 'nyu',
  name: 'NYU',
  place: 'США · Нью-Йорк',
  portal: 'https://apply.commonapp.org',
  guide: 'https://www.nyu.edu/admissions/undergraduate-admissions/how-to-apply/all-freshmen-applicants.html',
  color: '#57068C',
  tint: '#F1E6F8',
  rounds: [
    {
      id: 'ed1',
      label: 'ED I',
      note: binding,
      milestones: [
        { label: 'Подача заявки', at: '2026-11-01T23:59:00', time: true },
        { label: 'CSS Profile', at: '2026-11-10T12:00:00Z' },
        { label: 'Решение', at: '2026-12-15T12:00:00Z' },
      ],
    },
    {
      id: 'ed2',
      label: 'ED II',
      note: binding,
      milestones: [
        { label: 'Подача заявки', at: '2027-01-01T23:59:00', time: true },
        { label: 'CSS Profile', at: '2027-01-10T12:00:00Z' },
        { label: 'Решение', at: '2027-02-15T12:00:00Z' },
      ],
    },
    {
      id: 'rd',
      label: 'RD',
      note: 'Не обязывает',
      milestones: [
        { label: 'Подача заявки', at: '2027-01-05T23:59:00', time: true },
        { label: 'CSS Profile', at: '2027-02-01T12:00:00Z' },
        { label: 'Решение', at: '2027-04-01T12:00:00Z' },
      ],
    },
  ],
  sections: [
    commonApp(true),
    {
      id: 'nyu-q',
      title: 'Вопросы NYU',
      icon: 'form',
      note: 'Отдельного эссе NYU не просит.',
      items: [{ id: 'nyu-questions', title: 'Вопросы NYU в Common App', hint: 'Кампус (Нью-Йорк, Абу-Даби, Шанхай), школа и программа, раунд' }],
    },
    {
      id: 'nyu-tests',
      title: 'Тесты',
      icon: 'chart',
      note: 'SAT по желанию. Английский нужен, если последние 3 года учишься не только на английском.',
      items: [
        S.ielts,
        { id: 'nyu-english', title: 'Отправить IELTS в NYU', hint: 'В IELTS выбери «New York University». Конкурентно — 7.5+' },
        { ...S.sat, optional: true },
        { id: 'nyu-sat-send', title: 'Отправить SAT в NYU', hint: 'Код 2562 — если результат сильный', optional: true },
      ],
    },
    {
      id: 'nyu-recs',
      title: 'Рекомендации',
      icon: 'mail',
      note: 'Минимум одно письмо — подойдёт и отзыв консультанта. Максимум три.',
      items: [S.caConsent, S.caCounselor, { ...S.teachers, optional: true }, { ...S.caTeacher1, optional: true }, S.caMidyear],
    },
    {
      id: 'nyu-aid',
      title: 'Финпомощь',
      icon: 'cash',
      group: 'Если нужна финпомощь',
      note: 'Стипендии по нужде для иностранцев есть, но только через CSS Profile в срок.',
      items: [{ ...S.css, optional: true }, { id: 'nyu-css', title: 'Добавить NYU в CSS Profile', hint: 'Код 2562', optional: true }],
    },
    {
      id: 'nyu-send',
      title: 'Отправка',
      icon: 'send',
      items: [
        { id: 'nyu-fee', title: 'Взнос $85 или waiver', hint: 'Не возвращается' },
        { id: 'nyu-submit', title: 'Отправить заявку', hint: 'До 23:59 по твоему времени' },
      ],
    },
    {
      id: 'nyu-after',
      title: 'После подачи',
      icon: 'user',
      group: 'Потом',
      items: [
        { id: 'nyu-stars', title: 'Форма STARS', hint: 'Придёт приглашение — перенести оценки из транскрипта' },
        { id: 'nyu-finances', title: 'Подтверждение финансов', hint: 'После зачисления: чем оплатишь 4 года', optional: true },
      ],
    },
  ],
  checks: [{ label: 'IELTS 7.5+ конкурентно', test: atLeast('ielts', 7.5) }],
}

export const TEMPLATES: Record<string, Template> = { kaist, mbzuai, dartmouth, nyu }
