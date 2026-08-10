export const money = (value, unit = 'сом') => {
  if (value === null || value === undefined || value === '') return '—'
  return `${new Intl.NumberFormat('ru-RU').format(Number(value))} ${unit}`
}

export const dateTime = (value) => {
  if (!value) return '—'
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

const translitMap = {
  а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',
  к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',
  х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',
  ң:'ng',ө:'o',ү:'u',
}

export const slugify = (value = '') =>
  value
    .toLowerCase()
    .split('')
    .map((char) => translitMap[char] ?? char)
    .join('')
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')

export const clampText = (text = '', length = 100) =>
  text.length > length ? `${text.slice(0, length).trim()}…` : text
