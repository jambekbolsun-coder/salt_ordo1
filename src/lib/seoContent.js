export const SITE_ORIGIN = (import.meta.env.VITE_PUBLIC_SITE_URL || 'https://salt-ordo1.vercel.app').replace(/\/$/, '')

export const categoryLandingPages = [
  {
    slug: 'kyzga-sep-bishkek',
    categorySlug: 'sep',
    heroImage: '/atelier/chiy-kurak-960.webp',
    copy: {
      ru: {
        eyebrow: 'Кызга сеп · Бишкек',
        title: 'Кызга сеп в Бишкеке — готовые комплекты и пошив на заказ',
        description: 'Кызга сеп, төшөк, жууркан, жаздык и сандык в единой палитре. Ручная работа Salt Ordo, индивидуальная комплектация и доставка по Кыргызстану.',
        lead: 'Соберём приданое невесты в едином стиле: подберём ткань, цвет, размеры, количество предметов и оформление под вашу традицию и бюджет.',
        details: 'Можно выбрать готовые изделия из каталога или заказать полный сеп по фотографии и пожеланиям. До начала работы согласуем состав комплекта, стоимость и срок изготовления.',
        points: ['Единая палитра всего комплекта', 'Размеры и состав под вашу семью', 'Ручная работа в Бишкеке', 'Доставка по всему Кыргызстану'],
      },
      kg: {
        eyebrow: 'Кызга сеп · Бишкек',
        title: 'Бишкекте кызга сеп — даяр комплект жана жеке буйрутма',
        description: 'Кызга сеп, төшөк, жууркан, жаздык жана сандык бир палитрада. Salt Ordo кол эмгеги, жеке комплект жана Кыргызстан боюнча жеткирүү.',
        lead: 'Кыздын себин бир стилде даярдайбыз: кездемесин, түсүн, өлчөмүн жана комплекттин курамын салтыңызга жана бюджетиңизге ылайык тандайбыз.',
        details: 'Каталогдон даяр буюм тандасаңыз болот же сүрөт боюнча толук сепке буйрутма берсеңиз болот. Иш башталганга чейин баасын, курамын жана мөөнөтүн тактайбыз.',
        points: ['Комплект бир палитрада', 'Өлчөмү жана курамы сизге ылайык', 'Бишкекте кол менен жасалат', 'Кыргызстан боюнча жеткирүү'],
      },
      en: {
        eyebrow: 'Bridal dowry · Bishkek',
        title: 'Bridal dowry sets handmade in Bishkek',
        description: 'Coordinated bridal dowry sets, floor bedding, quilts, pillows and chests handmade by Salt Ordo with delivery across Kyrgyzstan.',
        lead: 'We compose a complete bridal dowry in one palette and adapt the fabric, dimensions and number of pieces to your family traditions.',
        details: 'Choose available pieces or order a complete custom set from a reference. Composition, price and production timing are confirmed before work begins.',
        points: ['One coordinated palette', 'Custom dimensions and composition', 'Handmade in Bishkek', 'Delivery across Kyrgyzstan'],
      },
    },
  },
  {
    slug: 'zher-toshok-bishkek',
    categorySlug: 'jer-toshok',
    heroImage: '/atelier/zher-toshok-960.webp',
    copy: {
      ru: {
        eyebrow: 'Жер төшөк · Бишкек',
        title: 'Жер төшөк в Бишкеке — купить готовый или заказать',
        description: 'Жер төшөк и кыргызские төшөктөр ручной работы в Бишкеке. Выбор ткани, цвета, размера и шва, изготовление на заказ и доставка по Кыргызстану.',
        lead: 'Изготавливаем мягкие жер төшөк для дома, гостей, кызга сеп и семейных событий. Подбираем материал, плотность, размер и оформление.',
        details: 'В каталоге указаны актуальные модели и цены. Если нужного цвета или размера нет, изготовим похожий вариант по вашему референсу.',
        points: ['Готовые модели и пошив на заказ', 'Ткань, размер и цвет на выбор', 'Аккуратный ручной пошив', 'Доставка по Бишкеку и регионам'],
      },
      kg: {
        eyebrow: 'Жер төшөк · Бишкек',
        title: 'Бишкекте жер төшөк — даярын сатып алуу же буйрутма берүү',
        description: 'Бишкекте кол менен тигилген жер төшөк. Кездеме, түс, өлчөм жана тигиш тандоо, жеке буйрутма жана Кыргызстан боюнча жеткирүү.',
        lead: 'Үйгө, конокко, кызга сепке жана үй-бүлөлүк иш-чараларга жумшак жер төшөк тигебиз. Материалын, калыңдыгын жана өлчөмүн чогуу тандайбыз.',
        details: 'Каталогдо даяр моделдер жана баалар көрсөтүлгөн. Керектүү түс же өлчөм жок болсо, сүрөтүңүз боюнча окшош вариант жасап беребиз.',
        points: ['Даяр моделдер жана жеке буйрутма', 'Кездеме, түс жана өлчөм тандоо', 'Тыкан кол эмгеги', 'Бишкек жана аймактарга жеткирүү'],
      },
      en: {
        eyebrow: 'Floor bedding · Bishkek',
        title: 'Handmade floor bedding in Bishkek',
        description: 'Handmade Kyrgyz floor bedding in Bishkek with custom fabric, color, size and delivery across Kyrgyzstan.',
        lead: 'Soft floor bedding for the home, guests, bridal dowries and family occasions, made to your preferred size and finish.',
        details: 'Browse available designs and prices or send a reference for a custom piece in another color or dimension.',
        points: ['Ready-made and custom options', 'Fabric, size and color selection', 'Careful hand finishing', 'Delivery across Kyrgyzstan'],
      },
    },
  },
  {
    slug: 'zhazdyk-bishkek',
    categorySlug: 'jastyk',
    heroImage: '/atelier/tambur-960.webp',
    copy: {
      ru: {
        eyebrow: 'Жаздык · Бишкек',
        title: 'Жаздык и декоративные подушки на заказ в Бишкеке',
        description: 'Жаздык и декоративные подушки Salt Ordo: индивидуальные размеры, ткани и цвета для дома и кызга сеп. Доставка по Кыргызстану.',
        lead: 'Подберём подушки к жер төшөк, сеп-комплекту или интерьеру, чтобы ткань, оттенки и декоративные детали сочетались между собой.',
        details: 'Изготавливаем отдельные подушки и комплекты. Размер, количество, наполнение и оформление согласуем до начала пошива.',
        points: ['Подбор к вашему комплекту', 'Разные размеры и ткани', 'Индивидуальное оформление', 'Заказ через WhatsApp'],
      },
      kg: {
        eyebrow: 'Жаздык · Бишкек',
        title: 'Бишкекте жаздык жана декоративдүү жаздыкчалар',
        description: 'Salt Ordo жаздыктары: үйгө жана кызга сепке жеке өлчөм, кездеме жана түс. Кыргызстан боюнча жеткирүү.',
        lead: 'Жаздыктарды жер төшөккө, сеп комплектине же интерьериңизге шайкеш кылып тандайбыз.',
        details: 'Өзүнчө жаздык же толук комплект тигебиз. Өлчөмүн, санын, толтуруусун жана жасалгасын алдын ала макулдашабыз.',
        points: ['Комплектке ылайык тандоо', 'Ар кандай өлчөм жана кездеме', 'Жеке жасалгалоо', 'WhatsApp аркылуу буйрутма'],
      },
      en: {
        eyebrow: 'Pillows · Bishkek',
        title: 'Custom decorative pillows in Bishkek',
        description: 'Custom pillows by Salt Ordo for interiors and bridal dowry sets, with delivery across Kyrgyzstan.',
        lead: 'Coordinate pillows with floor bedding, a dowry set or your interior in matching fabrics and colors.',
        details: 'Order a single pillow or a full set. Dimensions, quantity, filling and finish are confirmed in advance.',
        points: ['Matched to your set', 'Custom sizes and fabrics', 'Individual finishing', 'Order through WhatsApp'],
      },
    },
  },
  {
    slug: 'sandyk-kyzga-sep',
    categorySlug: 'sandyk',
    heroImage: '/atelier/sandyk-komplekt-960.webp',
    copy: {
      ru: {
        eyebrow: 'Сандык · Кызга сеп',
        title: 'Сандык для кызга сеп в Бишкеке',
        description: 'Сандык и сандык-комплекты для кызга сеп в Бишкеке. Индивидуальное оформление, размеры и текстиль Salt Ordo, доставка по Кыргызстану.',
        lead: 'Сандык становится центральной частью сеп-комплекта. Подберём размер, цвет, декор и текстиль, чтобы всё выглядело единым набором.',
        details: 'Можно заказать готовый вариант или согласовать индивидуальный дизайн. До изготовления уточняем комплектацию, стоимость и срок.',
        points: ['Для кызга сеп и семейных традиций', 'Индивидуальный цвет и оформление', 'Комплект с текстилем', 'Доставка по Кыргызстану'],
      },
      kg: {
        eyebrow: 'Сандык · Кызга сеп',
        title: 'Бишкекте кызга сепке сандык',
        description: 'Бишкекте кызга сепке сандык жана сандык комплекттери. Жеке жасалга, өлчөм жана Salt Ordo текстили, Кыргызстан боюнча жеткирүү.',
        lead: 'Сандык сеп комплектинин негизги бөлүгү. Өлчөмүн, түсүн, жасалгасын жана текстилин бир стилде тандайбыз.',
        details: 'Даяр вариантты тандасаңыз болот же жеке дизайнга буйрутма берсеңиз болот. Баасын, курамын жана мөөнөтүн алдын ала тактайбыз.',
        points: ['Кызга сеп жана үй-бүлөлүк салт үчүн', 'Жеке түс жана жасалга', 'Текстиль менен комплект', 'Кыргызстан боюнча жеткирүү'],
      },
      en: {
        eyebrow: 'Dowry chests · Bishkek',
        title: 'Custom bridal dowry chests in Bishkek',
        description: 'Custom bridal dowry chests and coordinated textile sets handmade in Bishkek with delivery across Kyrgyzstan.',
        lead: 'A chest anchors the complete dowry set. We coordinate its dimensions, color, finish and textiles.',
        details: 'Choose an available design or order a custom version. Composition, price and timing are confirmed in advance.',
        points: ['For bridal dowries and traditions', 'Custom color and finish', 'Coordinated textile set', 'Delivery across Kyrgyzstan'],
      },
    },
  },
  {
    slug: 'individualnyy-poshiv-bishkek',
    categorySlug: 'custom',
    heroImage: '/atelier/mamalak-toshok-960.webp',
    copy: {
      ru: {
        eyebrow: 'Индивидуальный пошив · Бишкек',
        title: 'Домашний текстиль на заказ по вашему фото или эскизу',
        description: 'Индивидуальный пошив төшөк, подушек и комплектов в Бишкеке. Salt Ordo адаптирует цвет, ткань, размер и детали по вашему референсу.',
        lead: 'Не ограничиваемся одним стилем: создаём национальные и современные комплекты по фотографии, эскизу или вашей идее.',
        details: 'Менеджер поможет определить состав, материал и размеры. После согласования фиксируем стоимость и срок изготовления.',
        points: ['Работа по фото и референсу', 'Любой стиль и палитра', 'Размеры под ваш запрос', 'Согласование до начала пошива'],
      },
      kg: {
        eyebrow: 'Жеке тигүү · Бишкек',
        title: 'Сүрөтүңүз же эскизиңиз боюнча үй текстили',
        description: 'Бишкекте төшөк, жаздык жана комплекттерди жеке тигүү. Salt Ordo түсүн, кездемесин, өлчөмүн жана деталдарын сиздин үлгүңүзгө ылайыкташтырат.',
        lead: 'Бир гана стиль менен чектелбейбиз: сүрөт, эскиз же идея боюнча улуттук жана заманбап комплект жасайбыз.',
        details: 'Менеджер курамын, материалын жана өлчөмүн тандоого жардам берет. Баасы менен мөөнөтү иш башталганга чейин такталат.',
        points: ['Сүрөт жана үлгү боюнча иш', 'Каалаган стиль жана түс', 'Сизге ылайык өлчөм', 'Тигүүдөн мурун толук макулдашуу'],
      },
      en: {
        eyebrow: 'Custom tailoring · Bishkek',
        title: 'Custom home textiles made from your reference',
        description: 'Custom floor bedding, pillows and textile sets made in Bishkek from your photo, sketch or idea.',
        lead: 'Traditional or modern, we adapt a reference around your preferred fabric, palette, dimensions and details.',
        details: 'Our manager helps define the set, materials and sizes, then confirms the price and production timing.',
        points: ['Made from a photo or reference', 'Any style and palette', 'Dimensions tailored to you', 'Everything agreed before production'],
      },
    },
  },
]

export const categoryPathBySlug = Object.fromEntries(categoryLandingPages.map((item) => [item.categorySlug, `/${item.slug}`]))

export function categoryLandingByPageSlug(slug) {
  return categoryLandingPages.find((item) => item.slug === slug) || null
}
