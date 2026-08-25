-- Editable starter catalog so the storefront is useful from the first launch.
insert into public.products(
  category_id, slug, sku, name_ru, name_kg, name_en,
  description_ru, description_kg, description_en,
  price_on_request, seam, material, colors, sizes, stock_qty, production_days,
  status, is_featured, is_new, is_set, sort_order
)
values
  ((select id from public.categories where slug='sep'), 'sep-komplekt-nazik', 'SO-SEP-001',
   'Сеп-комплект «Назик»', '«Назик» сеп комплекти', 'Nazik dowry set',
   'Полный комплект для кызга сеп в нежной розовой палитре. Состав, размер, ткань и декор адаптируем под ваш заказ.',
   'Кызга сеп үчүн назик кызгылт түстөгү толук комплект. Курамы, өлчөмү, кездемеси жана жасалгасы буйрутмага ылайыкталат.',
   'A complete bridal dowry set in a delicate blush palette, customizable in size, fabric and details.',
   true, 'Декоративная стёжка', 'Премиальный текстиль', array['розовый','белый','чёрный'], array['индивидуально'], 0, 21,
   'published', true, true, true, 10),
  ((select id from public.categories where slug='jer-toshok'), 'jer-toshok-bordo', 'SO-JT-001',
   'Жер төшөк «Бордо»', '«Бордо» жер төшөк', 'Bordeaux floor bedding',
   'Плотный комплект жер төшөк с выразительным орнаментом. Подберём количество, наполнение и размеры.',
   'Көркөм оймо-чиймеси бар жер төшөк комплекти. Саны, толтурулушу жана өлчөмү тандалат.',
   'A rich burgundy floor-bedding set with ornament, made in your preferred quantity and size.',
   true, 'Кант и орнамент', 'Велюр', array['бордовый','бежевый'], array['индивидуально'], 0, 14,
   'published', true, false, true, 20),
  ((select id from public.categories where slug='jastyk'), 'jastyk-ornament', 'SO-JA-001',
   'Декоративные жастык', 'Декоративдүү жаздыктар', 'Decorative pillows',
   'Подушки ручной работы для готового комплекта или отдельного заказа. Можно повторить цвет и орнамент по вашему примеру.',
   'Даяр комплектке же өзүнчө буйрутмага кол менен жасалган жаздыктар. Түсү жана оймосу үлгүңүзгө жараша жасалат.',
   'Handmade pillows for a full set or an individual order, matched to your chosen palette and reference.',
   true, 'Декоративный кант', 'Велюр / жаккард', array['любой цвет'], array['40×40','50×50','индивидуально'], 0, 10,
   'published', false, true, false, 30),
  ((select id from public.categories where slug='sandyk'), 'sandyk-klassika', 'SO-SA-001',
   'Сандык «Классика»', '«Классика» сандыгы', 'Classic chest',
   'Сандык для сеп-комплекта с отделкой под выбранный текстиль. Цвет, размер и декоративные элементы согласуем заранее.',
   'Сеп комплектине ылайыкталган сандык. Түсү, өлчөмү жана жасалгасы алдын ала макулдашылат.',
   'A chest coordinated with the dowry set, customized in color, dimensions and decorative finish.',
   true, 'Ручная отделка', 'Дерево и текстиль', array['дерево','розовый','синий'], array['индивидуально'], 0, 25,
   'published', true, false, true, 40),
  ((select id from public.categories where slug='custom'), 'individualny-zakaz', 'SO-CU-001',
   'Индивидуальный пошив', 'Жеке тигүү', 'Custom tailoring',
   'Пришлите фото или идею — сделаем традиционный или современный комплект любой сложности. Срок рассчитывается после согласования.',
   'Сүрөт же идея жөнөтүңүз — салттуу же заманбап комплектти каалаган татаалдыкта жасайбыз. Мөөнөтү макулдашуудан кийин эсептелет.',
   'Send a photo or idea and we will create a traditional or modern set of any complexity.',
   true, 'По вашему примеру', 'На выбор', array['любая палитра'], array['по вашим размерам'], 0, 30,
   'published', true, false, false, 50)
on conflict (slug) do update set
  category_id=excluded.category_id,
  name_ru=excluded.name_ru,name_kg=excluded.name_kg,name_en=excluded.name_en,
  description_ru=excluded.description_ru,description_kg=excluded.description_kg,description_en=excluded.description_en,
  price_on_request=excluded.price_on_request,seam=excluded.seam,material=excluded.material,
  colors=excluded.colors,sizes=excluded.sizes,production_days=excluded.production_days,
  status=excluded.status,is_featured=excluded.is_featured,is_new=excluded.is_new,is_set=excluded.is_set,sort_order=excluded.sort_order;

insert into public.product_images(product_id,path,public_url,alt_text,sort_order)
select p.id, 'seed/' || p.slug || '.webp',
  case
    when p.slug='jer-toshok-bordo' then '/hero-toshok.webp'
    when p.slug='sandyk-klassika' then '/hero-sandyk.webp'
    else '/hero-sep.webp'
  end,
  p.name_ru, 0
from public.products p
where p.slug in ('sep-komplekt-nazik','jer-toshok-bordo','jastyk-ornament','sandyk-klassika','individualny-zakaz')
and not exists(select 1 from public.product_images pi where pi.product_id=p.id);
