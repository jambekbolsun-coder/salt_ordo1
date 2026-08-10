<div align="center">

<img src="public/salt-ordo-logo.png" width="150" alt="Salt Ordo" />

# SALT ORDO

**Каталог домашнего текстиля · индивидуальные заказы · умный FAQ-помощник**

<img src="https://img.shields.io/badge/React-ffffff?style=flat-square&logo=react&logoColor=61DAFB" alt="React" />
<img src="https://img.shields.io/badge/Supabase-ffffff?style=flat-square&logo=supabase&logoColor=3ECF8E" alt="Supabase" />
<img src="https://img.shields.io/badge/Responsive-ffffff?style=flat-square&logo=googlechrome&logoColor=D47E99" alt="Responsive" />
<img src="https://img.shields.io/badge/RU%20·%20KG%20·%20EN-ffffff?style=flat-square" alt="Languages" />

</div>

---

## Что находится на сайте

| Покупатель | Администратор |
|---|---|
| Главная и каталог | Dashboard |
| Поиск, категории и фильтры | Товары и категории |
| Скидки и акции | Себестоимость, цена и маржа |
| Карточка товара + несколько фото | Акции и сроки скидок |
| Избранное и корзина | Чат-бот и частые вопросы |
| Быстрый переход в WhatsApp | Сотрудники и роли |
| Индивидуальный заказ в любом стиле | Настройки сайта |
| Доставка по всему Кыргызстану | Supabase Auth + RLS + Storage |
| Русский · Кыргызский · English | Тексты товара и FAQ RU · KG · EN |
| — | Доступ только через `/admin` |

---

## Логика

```text
Покупатель → Каталог → Товар → Корзина / WhatsApp
                         ↓
               FAQ-помощник справа

/admin → Авторизация → Товары / Категории / Чат-бот / Команда / Настройки
```

Каталог изначально пустой. Товары, категории, цены, скидки, фотографии и FAQ добавляются только из админ-панели.

---

## Технологии

**React · Vite · JavaScript · CSS · Supabase PostgreSQL · Auth · Storage · RLS · Edge Functions**

Адаптивность: **Desktop · Laptop · Tablet · Mobile**.
