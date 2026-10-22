// Map of every CMS text on the public site, grouped the way a person sees the
// site: page → block → field. Admin → «Контент сайта» renders this schema, so a
// new CMS key must be added here to become editable.
//
// Field types: text, textarea, phone, email, url, words (comma separated),
// links (label + href list) and list (objects described by itemFields).

const ICON_FIELD = {
  name: "icon",
  label: "Иконка",
  type: "select",
};

export const CONTENT_SCHEMA = [
  {
    id: "header",
    title: "Шапка и меню",
    icon: "menu",
    path: "/",
    description: "Верхняя панель на всех страницах и боковое меню, которое открывается кнопкой ☰.",
    sections: [
      {
        title: "Верхняя панель",
        where: "Самый верх сайта, на каждой странице.",
        fields: [
          { key: "nav_links_arr", label: "Ссылки в шапке", type: "links", hint: "Пункты в центре шапки на компьютере. Ссылка — путь страницы (/filter) или якорь блока (#faq)." },
          { key: "nav_login", label: "Кнопка «Войти»", type: "text", hint: "Справа в шапке, когда гость не вошёл в аккаунт." },
          { key: "nav_profile", label: "Кнопка «Кабинет»", type: "text", hint: "Справа в шапке, когда пользователь вошёл." },
        ],
      },
      {
        title: "Меню: левая колонка",
        where: "Тёмная колонка слева в открытом меню (на компьютере).",
        fields: [
          { key: "menu_tagline", label: "Маленькая надпись сверху", type: "text" },
          { key: "menu_headline", label: "Крупный слоган", type: "textarea" },
          { key: "menu_phone_label", label: "Подпись под телефоном", type: "text", hint: "Сам номер берётся из «Телефон поддержки» в разделе «Футер и контакты»." },
          { key: "menu_email_label", label: "Подпись под email", type: "text" },
        ],
      },
      {
        title: "Меню: пункты навигации",
        where: "Нумерованный список 01–04 в открытом меню.",
        fields: [
          { key: "menu_nav_eyebrow", label: "Заголовок над списком", type: "text" },
          { key: "menu_about_label", label: "01 · О нас — название", type: "text" },
          { key: "menu_about_desc", label: "01 · О нас — подпись", type: "text" },
          { key: "menu_about_info_label", label: "01 → Преимущества и FAQ", type: "text", hint: "Подпункт внутри «О нас»." },
          { key: "menu_about_info_desc", label: "01 → Преимущества и FAQ — подпись", type: "text" },
          { key: "menu_about_guide_label", label: "01 → Гид для партнёров", type: "text" },
          { key: "menu_about_guide_desc", label: "01 → Гид для партнёров — подпись", type: "text" },
          { key: "menu_spaces_label", label: "02 · Аренда мест — название", type: "text" },
          { key: "menu_spaces_desc", label: "02 · Аренда мест — подпись", type: "text" },
          { key: "menu_spaces_catalog_label", label: "02 → Каталог", type: "text" },
          { key: "menu_spaces_catalog_desc", label: "02 → Каталог — подпись", type: "text" },
          { key: "menu_spaces_add_label", label: "02 → Добавить место", type: "text" },
          { key: "menu_spaces_add_desc", label: "02 → Добавить место — подпись", type: "text" },
          { key: "menu_saved_label", label: "03 · Избранное — название", type: "text" },
          { key: "menu_saved_desc", label: "03 · Избранное — подпись", type: "text" },
          { key: "menu_contact_label", label: "04 · Контакты — название", type: "text" },
          { key: "menu_contact_desc", label: "04 · Контакты — подпись", type: "text" },
          { key: "menu_requires_auth", label: "Подпись «нужно войти»", type: "text", hint: "Показывается вместо подписи у «Избранного», если гость не вошёл." },
          { key: "menu_back", label: "Кнопка «Назад» в подменю", type: "text" },
          { key: "menu_submenu", label: "Надпись «Подменю»", type: "text" },
          { key: "menu_logout", label: "Пункт «Выйти»", type: "text" },
          { key: "menu_logout_desc", label: "Подпись пункта «Выйти»", type: "text" },
        ],
      },
      {
        title: "Меню на телефоне",
        where: "Верх открытого меню на телефоне: профиль и две быстрые кнопки.",
        fields: [
          { key: "menu_guest_mode", label: "Статус гостя", type: "text" },
          { key: "menu_account", label: "Статус вошедшего пользователя", type: "text" },
          { key: "menu_quick_find_label", label: "Быстрая кнопка 1", type: "text" },
          { key: "menu_quick_find_desc", label: "Быстрая кнопка 1 — подпись", type: "text" },
          { key: "menu_quick_add_label", label: "Быстрая кнопка 2", type: "text" },
          { key: "menu_quick_add_desc", label: "Быстрая кнопка 2 — подпись", type: "text" },
        ],
      },
      {
        title: "Меню: нижние карточки",
        where: "Низ открытого меню: блок входа и промо для партнёров.",
        fields: [
          { key: "menu_guest_text", label: "Текст для гостя", type: "textarea" },
          { key: "menu_register", label: "Кнопка «Регистрация»", type: "text" },
          { key: "menu_cabinet_link", label: "Кнопка «В кабинет»", type: "text", hint: "Видна, когда пользователь вошёл." },
          { key: "menu_partner_tag", label: "Промо партнёрам: метка", type: "text" },
          { key: "menu_partner_title", label: "Промо партнёрам: заголовок", type: "text" },
          { key: "menu_partner_text", label: "Промо партнёрам: текст", type: "textarea" },
          { key: "menu_partner_cta", label: "Промо партнёрам: кнопка", type: "text" },
        ],
      },
    ],
  },
  {
    id: "home",
    title: "Главная страница",
    icon: "home",
    path: "/",
    description: "Все блоки главной сверху вниз.",
    sections: [
      {
        title: "Первый экран",
        where: "Самый верх главной: большой заголовок, поиск и слайдер справа.",
        fields: [
          { key: "hero_title", label: "Заголовок", type: "textarea", hint: "Перенос строки (Enter) сохраняется. После заголовка печатаются «бегущие слова»." },
          { key: "hero_animated_words", label: "Бегущие слова", type: "words", hint: "Через запятую. Печатаются по очереди после заголовка." },
          { key: "hero_subtitle", label: "Подзаголовок", type: "textarea" },
          { key: "tab_all", label: "Вкладка «Все»", type: "text", hint: "Первая вкладка над поиском. Остальные вкладки — названия из раздела «Категории»." },
          { key: "hero_location_placeholder", label: "Поле адреса (пустое)", type: "text" },
          { key: "hero_location_title", label: "Заголовок окна выбора адреса", type: "text", hint: "На телефоне — шапка выезжающей панели." },
          { key: "hero_search_placeholder", label: "Подсказка в поиске", type: "text" },
          { key: "hero_cta", label: "Кнопка поиска", type: "text" },
          { key: "hero_empty_places", label: "Текст, если мест нет", type: "text", hint: "Вместо слайдера, пока нет одобренных мест." },
        ],
      },
      {
        title: "Промо под слайдером",
        where: "Карточка под слайдером на первом экране, ведёт на гид для партнёров.",
        fields: [
          { key: "home_partner_title", label: "Заголовок", type: "text" },
          { key: "home_partner_text", label: "Текст", type: "textarea" },
          { key: "home_partner_cta", label: "Кнопка", type: "text" },
        ],
      },
      {
        title: "Популярные места",
        where: "Сетка карточек мест под первым экраном.",
        fields: [
          { key: "popular_kicker", label: "Надпись над заголовком", type: "text" },
          { key: "popular_title", label: "Заголовок", type: "text" },
          { key: "popular_subtitle", label: "Подзаголовок", type: "text" },
          { key: "card_view_all", label: "Ссылка «Смотреть все»", type: "text", hint: "Под сеткой карточек." },
        ],
      },
      {
        title: "Преимущества",
        where: "Блок с карточками преимуществ. Те же карточки — на странице «Преимущества и FAQ».",
        fields: [
          { key: "about_title", label: "Заголовок", type: "text", hint: "Слово «Joyzone» в заголовке подсвечивается." },
          { key: "about_text", label: "Подзаголовок", type: "text" },
          {
            key: "benefits_arr", label: "Карточки преимуществ", type: "list", itemLabel: "Карточка",
            itemFields: [
              { name: "title", label: "Заголовок" },
              { name: "text", label: "Текст", multiline: true },
              { ...ICON_FIELD, options: ["interface", "search", "building", "shield", "crown", "megaphone"] },
            ],
          },
        ],
      },
      {
        title: "Как забронировать",
        where: "Блок с тремя шагами 01–02–03 и кнопкой «Начать».",
        fields: [
          { key: "how_title", label: "Метка над заголовком", type: "text" },
          { key: "partner_title", label: "Заголовок", type: "text", hint: "Часть после запятой показывается с новой строки и выделяется цветом." },
          { key: "partner_subtitle", label: "Текст", type: "textarea" },
          { key: "how_stat1_value", label: "Цифра 1", type: "text" },
          { key: "how_stat1_label", label: "Цифра 1 — подпись", type: "text" },
          { key: "how_stat2_value", label: "Цифра 2", type: "text" },
          { key: "how_stat2_label", label: "Цифра 2 — подпись", type: "text" },
          { key: "partner_cta", label: "Кнопка", type: "text" },
          { key: "how_step1_title", label: "Шаг 01 — заголовок", type: "text" },
          { key: "how_step1", label: "Шаг 01 — текст", type: "textarea" },
          { key: "how_step2_title", label: "Шаг 02 — заголовок", type: "text" },
          { key: "how_step2", label: "Шаг 02 — текст", type: "textarea" },
          { key: "how_step3_title", label: "Шаг 03 — заголовок", type: "text" },
          { key: "how_step3", label: "Шаг 03 — текст", type: "textarea" },
        ],
      },
      {
        title: "Партнёры Joyzone",
        where: "Слайдер с партнёрами. Сами партнёры настраиваются в «Пользователи» → профиль партнёра.",
        fields: [
          { key: "agent_title", label: "Заголовок", type: "text" },
          { key: "agent_sub", label: "Подзаголовок", type: "textarea" },
          { key: "agent_premium", label: "Метка на карточке", type: "text" },
          { key: "agent_reviews", label: "Слово после числа отзывов", type: "text", hint: "Например: «12 ta sharh»." },
          { key: "agent_profile", label: "Кнопка «Профиль»", type: "text" },
        ],
      },
      {
        title: "Отзывы и FAQ",
        where: "Предпоследний блок главной: облако отзывов и раскрывающиеся вопросы. Вопросы также на странице «Преимущества и FAQ».",
        fields: [
          { key: "rev_title", label: "Заголовок отзывов", type: "text", hint: "Сами отзывы — реальные, из раздела «Отзывы» (оценка 4–5)." },
          { key: "faq_kicker", label: "Метка над вопросами", type: "text" },
          { key: "faq_title", label: "Заголовок вопросов", type: "text" },
          {
            key: "faq_arr", label: "Вопросы и ответы", type: "list", itemLabel: "Вопрос",
            itemFields: [
              { name: "question", label: "Вопрос" },
              { name: "answer", label: "Ответ", multiline: true },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "footer",
    title: "Футер и контакты",
    icon: "phone",
    path: "/#contact",
    description: "Нижняя часть сайта и контакты, которые используются по всему сайту.",
    sections: [
      {
        title: "Контакты",
        where: "Футер, боковое меню, кнопка «Позвонить» на странице места.",
        fields: [
          { key: "footer_phone", label: "Телефон в футере", type: "phone" },
          { key: "support_phone", label: "Телефон поддержки", type: "phone", hint: "В боковом меню и на странице места, если у владельца нет телефона." },
          { key: "footer_email", label: "Email", type: "email" },
          { key: "social_telegram", label: "Telegram", type: "url", hint: "Полная ссылка. Пустое поле — иконка скрывается." },
          { key: "social_instagram", label: "Instagram", type: "url" },
          { key: "social_facebook", label: "Facebook", type: "url" },
          { key: "social_linkedin", label: "LinkedIn", type: "url" },
        ],
      },
      {
        title: "Полоса «Остались вопросы?»",
        where: "Над футером на компьютере.",
        fields: [
          { key: "help_kicker", label: "Метка", type: "text" },
          { key: "help_title", label: "Заголовок", type: "text" },
          { key: "help_text", label: "Текст", type: "text" },
          { key: "help_cta", label: "Кнопка", type: "text" },
          { key: "help_float", label: "Плавающая кнопка помощи", type: "text", hint: "Круглая кнопка в правом нижнем углу." },
        ],
      },
      {
        title: "Футер",
        where: "Тёмная карточка в самом низу каждой публичной страницы.",
        fields: [
          { key: "footer_cta", label: "Кнопка рядом с контактами", type: "text" },
          { key: "footer_about", label: "Текст о компании", type: "textarea" },
          { key: "footer_nav1", label: "Колонка 1 — заголовок", type: "text" },
          { key: "footer_link_about", label: "Колонка 1 → О нас", type: "text" },
          { key: "footer_link_dirs", label: "Колонка 1 → Направления", type: "text" },
          { key: "footer_link_contact", label: "Колонка 1 → Контакты", type: "text" },
          { key: "footer_link_privacy", label: "Колонка 1 → Политика", type: "text" },
          { key: "footer_nav2", label: "Колонка 2 — заголовок", type: "text" },
          { key: "footer_link_offices", label: "Колонка 2 → Офисы", type: "text" },
          { key: "footer_link_halls", label: "Колонка 2 → Залы", type: "text" },
          { key: "footer_link_partner", label: "Колонка 2 → Стать партнёром", type: "text" },
          { key: "footer_socials_title", label: "Колонка 3 — соцсети", type: "text" },
          { key: "footer_copyright", label: "Копирайт", type: "text" },
          { key: "footer_powered", label: "Подпись разработчика", type: "text" },
        ],
      },
    ],
  },
  {
    id: "auth",
    title: "Вход и регистрация",
    icon: "users",
    path: "/login",
    description: "Экраны входа по номеру телефона, кода из SMS и заполнения имени.",
    sections: [
      {
        title: "Шаг 1 · Номер телефона",
        where: "Страница /login — первый экран.",
        fields: [
          { key: "auth_login_title", label: "Заголовок", type: "text", hint: "Последнее слово выделяется цветом." },
          { key: "auth_login_sub", label: "Подзаголовок", type: "textarea" },
          { key: "auth_phone_placeholder", label: "Подсказка в поле телефона", type: "text" },
          { key: "auth_or", label: "Разделитель «или»", type: "text" },
          { key: "auth_google", label: "Кнопка Google", type: "text" },
          { key: "auth_get_code", label: "Кнопка «Получить код»", type: "text" },
        ],
      },
      {
        title: "Шаг 2 · Код подтверждения",
        where: "После ввода номера.",
        fields: [
          { key: "auth_otp_title", label: "Заголовок", type: "text" },
          { key: "auth_otp_sub", label: "Подзаголовок", type: "textarea" },
          { key: "auth_confirm", label: "Кнопка «Подтвердить»", type: "text" },
        ],
      },
      {
        title: "Шаг 3 · Имя и фамилия",
        where: "Только для новых пользователей, после кода.",
        fields: [
          { key: "auth_reg_title", label: "Заголовок", type: "text" },
          { key: "auth_reg_sub", label: "Подзаголовок", type: "textarea" },
          { key: "auth_first_name", label: "Подсказка «Имя»", type: "text" },
          { key: "auth_last_name", label: "Подсказка «Фамилия»", type: "text" },
          { key: "auth_finish", label: "Кнопка «Завершить»", type: "text" },
        ],
      },
      {
        title: "Восстановление доступа",
        where: "Страницы /forgot и /verify.",
        fields: [
          { key: "auth_forgot_title", label: "Заголовок восстановления", type: "text" },
          { key: "auth_forgot_sub", label: "Текст восстановления", type: "textarea" },
          { key: "auth_forgot_placeholder", label: "Подсказка в поле", type: "text" },
          { key: "auth_forgot_btn", label: "Кнопка отправки", type: "text" },
          { key: "auth_forgot_login", label: "Ссылка «Вспомнили? Войти»", type: "text", hint: "Текст после «?» становится ссылкой." },
          { key: "auth_verify_title", label: "Заголовок подтверждения", type: "text" },
          { key: "auth_verify_sub", label: "Текст подтверждения", type: "textarea" },
          { key: "auth_verify_btn", label: "Кнопка подтверждения", type: "text" },
          { key: "auth_verify_resend", label: "Ссылка «Отправить снова»", type: "text", hint: "Текст после «?» становится ссылкой." },
        ],
      },
    ],
  },
  {
    id: "about",
    title: "О нас",
    icon: "info",
    path: "/about-us",
    description: "Страница /about-us.",
    sections: [
      {
        title: "Верх страницы",
        where: "Первый экран страницы «О нас».",
        fields: [
          { key: "back_button", label: "Кнопка «Назад»", type: "text", hint: "Общая для страниц «О нас» и «Гид для партнёров»." },
          { key: "about_page_kicker", label: "Метка", type: "text" },
          { key: "about_page_title", label: "Заголовок", type: "text" },
          { key: "about_page_text", label: "Вводный текст", type: "textarea" },
        ],
      },
      {
        title: "Цифры и ценности",
        where: "Ряд с цифрами и карточки ценностей под первым экраном.",
        fields: [
          {
            key: "about_stats_arr", label: "Цифры", type: "list", itemLabel: "Цифра",
            itemFields: [
              { name: "value", label: "Значение" },
              { name: "label", label: "Подпись" },
            ],
          },
          {
            key: "about_values_arr", label: "Ценности", type: "list", itemLabel: "Ценность",
            itemFields: [
              { name: "title", label: "Заголовок" },
              { name: "text", label: "Текст", multiline: true },
              { ...ICON_FIELD, options: ["map", "shield", "building", "spark", "check", "chat", "eye"] },
            ],
          },
        ],
      },
      {
        title: "История",
        where: "Нижний блок страницы.",
        fields: [
          { key: "about_story_kicker", label: "Метка", type: "text" },
          { key: "about_story_title", label: "Заголовок", type: "text" },
          { key: "about_story_text", label: "Текст", type: "textarea" },
        ],
      },
    ],
  },
  {
    id: "partners",
    title: "Партнёрам и тарифы",
    icon: "building",
    path: "/partner-guide",
    description: "Страница /partner-guide: инструкция, условия и тарифы.",
    sections: [
      {
        title: "Верх страницы",
        where: "Первый экран гида для партнёров.",
        fields: [
          { key: "partner_guide_kicker", label: "Метка", type: "text" },
          { key: "partner_guide_title", label: "Заголовок", type: "text" },
          { key: "partner_guide_text", label: "Текст", type: "textarea" },
          { key: "guide_metric1_value", label: "Показатель 1", type: "text" },
          { key: "guide_metric1_label", label: "Показатель 1 — подпись", type: "text" },
          { key: "guide_metric2_value", label: "Показатель 2", type: "text" },
          { key: "guide_metric2_label", label: "Показатель 2 — подпись", type: "text" },
          { key: "guide_metric3_value", label: "Показатель 3", type: "text" },
          { key: "guide_metric3_label", label: "Показатель 3 — подпись", type: "text" },
        ],
      },
      {
        title: "Шаги подготовки",
        where: "Список шагов с боковой карточкой «Процесс».",
        fields: [
          { key: "guide_sidebar_kicker", label: "Боковая карточка: метка", type: "text" },
          { key: "guide_sidebar_title", label: "Боковая карточка: заголовок", type: "text" },
          { key: "guide_sidebar_text", label: "Боковая карточка: текст", type: "textarea" },
          {
            key: "guide_steps_arr", label: "Шаги", type: "list", itemLabel: "Шаг",
            itemFields: [
              { name: "step", label: "Номер" },
              { name: "title", label: "Заголовок" },
              { name: "text", label: "Текст", multiline: true },
              { name: "deliverable", label: "Результат шага" },
            ],
          },
        ],
      },
      {
        title: "Условия партнёрства",
        where: "Карточки условий и полоса «Следующий шаг».",
        fields: [
          { key: "partner_terms_kicker", label: "Метка", type: "text" },
          { key: "partner_terms_title", label: "Заголовок", type: "text" },
          { key: "partner_terms_text", label: "Текст", type: "textarea" },
          {
            key: "partner_terms_arr", label: "Условия", type: "list", itemLabel: "Условие",
            itemFields: [
              { name: "title", label: "Заголовок" },
              { name: "text", label: "Текст", multiline: true },
            ],
          },
          { key: "guide_next_kicker", label: "«Следующий шаг»: метка", type: "text" },
          { key: "guide_next_text", label: "«Следующий шаг»: текст", type: "textarea" },
        ],
      },
      {
        title: "Тарифы",
        where: "Внизу гида для партнёров и в кабинете партнёра. Сами тарифы — в разделе «Тарифы».",
        fields: [
          { key: "tariffs_kicker", label: "Метка", type: "text" },
          { key: "tariffs_title", label: "Заголовок", type: "text" },
          { key: "tariffs_subtitle", label: "Текст", type: "textarea" },
          { key: "tariffs_best", label: "Метка лучшего тарифа", type: "text" },
          { key: "tariffs_free", label: "Цена бесплатного тарифа", type: "text" },
          { key: "tariffs_per_month", label: "Подпись цены", type: "text" },
          { key: "tariffs_unlimited", label: "Срок бесплатного тарифа", type: "text" },
        ],
      },
    ],
  },
];

export const CONTENT_FIELDS = CONTENT_SCHEMA.flatMap((page) =>
  page.sections.flatMap((section) => section.fields.map((field) => ({ ...field, page, section }))),
);
