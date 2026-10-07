// null translations intentionally use Russian pending human review.
export const atelierCopy = {
  ru: {
    collections: 'Коллекции',
    materials: 'Материалы',
    order: 'Индивидуальный заказ',
    atelier: 'Ателье',
    works: 'Выполненные работы',
    selection: 'Моя подборка',
    care: 'Уход за изделиями',
  },
  kg: null,
  en: null,
}
export const atelierPages = {
  materials: {
    title: 'Материалы',
    description:
      'Ткань, цвет и детали будущего изделия. Подбор материала с мастером Salt Ordo в Бишкеке.',
  },
  'individual-order': {
    title: 'Создать свой комплект',
    description:
      'Индивидуальный заказ Salt Ordo: изделие, палитра, материал, орнамент и размеры. Передайте референс и обсудите идею с мастером.',
  },
  atelier: {
    title: 'Ателье Salt Ordo',
    description:
      'Готовые изделия и индивидуальный пошив в Бишкеке. Кыргызские традиции, работа с тканью и ваше представление о доме.',
  },
  works: {
    title: 'Выполненные работы',
    description:
      'Истории индивидуальных заказов Salt Ordo: от идеи и выбора ткани до готового комплекта.',
  },
  care: {
    title: 'Уход за изделиями',
    description:
      'Рекомендации для конкретного изделия Salt Ordo с учётом ткани, декора и наполнителя.',
  },
}
export const directions = [
  {
    id: 'sep',
    name: 'Кызга сеп',
    description: 'Комплект для новой семейной истории',
    image: 'chiy-kurak',
  },
  {
    id: 'jer-toshok',
    name: 'Жер төшөк',
    description: 'Текстиль для дома и тёплых встреч',
    image: 'zher-toshok',
  },
  {
    id: 'sandyk',
    name: 'Сандыки',
    description: 'Сандык и текстиль в одной композиции',
    image: 'sandyk-komplekt',
  },
  {
    id: 'jastyk',
    name: 'Жаздыки',
    description: 'Размер, оттенок и детали на ваш выбор',
    image: null,
  },
  {
    id: 'traditional',
    name: 'Традиционные комплекты',
    description: 'Цвет и орнамент в едином ритме',
    image: 'ming-kurak',
    query: 'category=sep',
  },
  {
    id: 'custom',
    name: 'Индивидуальные работы',
    description: 'Начните с идеи или любимого референса',
    image: null,
    path: '/individual-order',
  },
]
export const palettes = [
  { id: 'burgundy', name: 'Бордовый', hex: '#672a38' },
  { id: 'milk', name: 'Молочный', hex: '#e8dfcf' },
  { id: 'sage', name: 'Шалфейный', hex: '#929d89' },
  { id: 'powder', name: 'Пудровый', hex: '#bc9391' },
  { id: 'chocolate', name: 'Шоколадный', hex: '#554137' },
  { id: 'blue', name: 'Глубокий синий', hex: '#384c60' },
]
export const styles = [
  'Кыргызское наследие',
  'Современный национальный стиль',
  'Минимализм',
  'Восточная композиция',
  'Классический интерьер',
  'Дизайн по референсу',
]
export const processSteps = [
  ['Идея', 'Расскажите о доме, событии или комплекте, который представляете.'],
  ['Ткань и палитра', 'Обсудим образцы, оттенки и сочетания.'],
  ['Композиция', 'Согласуем орнамент, размеры и состав комплекта.'],
  ['Раскрой', 'От согласованных размеров — к деталям изделия.'],
  ['Пошив и декор', 'Соединяем ткань, отделку и выбранный рисунок.'],
  ['Проверка', 'Сверяем готовое изделие с согласованным заказом.'],
  ['Передача', 'Обсуждаем упаковку, получение и уход.'],
]
// Publish stories, portraits, material properties and process photos only after approval.
export const orderStories = []
export const atelierHistory = {
  story: null,
  founder: null,
  portrait: null,
  workshopPhoto: null,
  timeline: [],
  team: [],
  processPhotos: [],
}
export const materials = [
  {
    id: 'velvet',
    name: 'Стриженный бархат',
    confirmed: true,
    note: 'Указан в существующих карточках Salt Ordo. Состав и особенности конкретного образца уточняются при подборе.',
    macro: null,
    detail: null,
    composition: null,
    density: null,
    softness: null,
    finish: null,
    care: null,
    colors: [],
  },
]
export const materialCandidates = [
  'Велюр',
  'Жаккард',
  'Атлас',
  'Шёлк',
  'Парча',
  'Хлопковый сатин',
  'Ткань с вышивкой',
]
