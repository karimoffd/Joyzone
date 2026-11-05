import { defaultLists } from "./defaultLists.js";
import { siteTexts } from "./siteTexts.js";

const baseContent = {
  uz: {
    nav_links_arr: [
      { label: "Bosh sahifa", href: "/" },
      { label: "Biz haqimizda", href: "/about-us" },
      { label: "Katalog", href: "/filter" },
      { label: "FAQ", href: "#faq" },
      { label: "Kontaktlar", href: "#contact" }
    ],
    nav_login: "Kirish",
    nav_profile: "Kabinet",

    hero_title: "O'zbekiston bo'ylab\nqulay",
    hero_subtitle: "Ofis, do'kon va omborlarni ijaraga oling yoki sotib oling.",
    hero_cta: "Joy izlash",
    hero_animated_words: "ofislar, kovorking, zallar, do'konlar, omborlar",
    home_partner_title: "Joyzone — bu faqat ijara emas.",
    home_partner_text: "Ofis, do'kon yoki omboringizni joylashtiring: ijaraga bering yoki soting.",
    home_partner_cta: "Batafsil",
    
    tab_all: "Barchasi",


    popular_title: "Ommabop joylar",
    popular_subtitle: "Eng ko'p ko'rilgan ijara va sotuvdagi joylar",
    how_step1: "Telefon raqamingiz bilan kiring — SMS-koddan so'ng profilingiz tayyor.",
    how_step2: "Format, narx va qulayliklar bo'yicha saralang va o'zingizga mos joyni tanlang.",
    how_step3: "Ijara uchun sana va vaqtni tanlang, sotuvdagi joy bo'yicha esa sotuvchiga qo'ng'iroq qiling yoki yozing.",
    agent_title: "Top agentlar",
    agent_sub: "Joyzone'dagi eng faol va ishonchli joy egalari.",
    agent_badge_premium: "Premium agent",
    agent_badge_comfort: "Comfort agent",
    agent_reviews: "ta sharh",
    agent_profile: "Profil",

    rev_title: "Sharhlar",
    faq_kicker: "FAQ",
    faq_title: "Ko'p beriladigan savollar",

    
    auth_login_title: "Hush kelibsiz!",
    auth_login_sub: "Telefon raqamingizni kiriting — unga tasdiqlash kodini yuboramiz.",
    auth_reg_title: "Ro'yxatdan o'tish",
    auth_reg_sub: "Joyzone platformasida ishlash uchun akkaunt yarating.",
    auth_otp_title: "Kodni tasdiqlang",
    auth_otp_sub: "Telefon raqamingizga yuborilgan 6 xonali kodni kiriting.",
    auth_forgot_title: "Parolni tiklash",
    auth_forgot_sub: "Hisobingizga ulangan email yoki telefon raqamini kiriting. Parolni tiklash uchun tasdiqlash kodini yuboramiz.",
    auth_forgot_btn: "Tiklash kodini yuborish",
    auth_forgot_login: "Parolingiz esingizdami? Kirish",
    auth_verify_title: "Kodni tasdiqlang",
    auth_verify_sub: "Telefon raqamingizga yuborilgan 6 xonali kodni kiriting.",
    auth_verify_btn: "Tasdiqlash",
    auth_verify_resend: "Kod kelmadimi? Qayta yuborish",
    
    about_title: "Joyzone qulayliklari",
    about_text: "Har kim uchun oddiy va qulay platforma",
    about_page_kicker: "Joyzone haqida",
    about_page_title: "Joy topishni oson qilamiz.",
    about_page_text: "Joyzone ofis, kovorking, zal, do'kon, noturar joy va omborlarni bitta platformada jamlaydi. Ularni ijaraga olish yoki sotib olish mumkin. Mijoz kerakli joyni tez topadi, egasi esa uni ishonchli ko'rinishda taqdim etadi.",
    about_story_kicker: "Nima uchun kerak",
    about_story_title: "Ko'p joy bor, lekin tanlash doim ham oson emas.",
    about_story_text: "Maqsadimiz oddiy: joy haqidagi asosiy savollarga birinchi ekranda javob berish. Manzil, maydon, narx va rasmlar tartibli karta, filtr va egasining profili orqali ko'rsatiladi.",
    partner_guide_kicker: "Partner instruktsiyasi",
    partner_guide_title: "Joyzone partner qo'llanmasi.",
    partner_guide_text: "Hamkor bo'lish jarayoni qisqa va nazoratli. Quyida ariza, karta tayyorlash, shartlar, moderatsiya va bron so'rovlari tartibi keltirilgan.",
    partner_terms_title: "Hamkor bo'lish uchun asosiy qoidalar.",
    partner_terms_text: "Bu blok kelishuvning qisqa ko'rinishi. Yakuniy shartlar alohida hujjat yoki forma orqali tasdiqlanishi mumkin.",
    tariffs_title: "O'zingizga mos tarifni tanlang",
    tariffs_subtitle: "Bepul boshlang va biznes o'sishi bilan tarifni o'zgartiring.",
    
    footer_about: "Joyzone — O'zbekistonda tijorat joylarini ijaraga olish va sotib olish uchun platforma.",
    footer_phone: "+998 77 044 40 00",
    footer_email: "info@joyzone.uz",
    footer_nav1: "Ma'lumotlar",
    footer_link_about: "Biz haqimizda",
    footer_link_dirs: "Yo'nalishlar",
    footer_link_contact: "Kontaktlar",
    footer_col1_links: [
      { label: "Biz haqimizda", href: "/about-us" },
      { label: "Katalog", href: "/filter" },
      { label: "Savol-javob", href: "/#faq" },
      { label: "Hamkorlik shartlari", href: "/partner-guide" }
    ],
    footer_col2_links: [
      { label: "Ofislar", href: "/filter?category=ofis" },
      { label: "Kovorking", href: "/filter?category=kovorking" },
      { label: "Savdo maydonlari", href: "/filter?category=savdo" },
      { label: "Omborlar", href: "/filter?category=ombor" },
      { label: "Hamkor bo'lish", href: "/partner-guide#become" }
    ],
    
  },
  ru: {
    nav_links_arr: [
      { label: "Главная", href: "/" },
      { label: "О нас", href: "/about-us" },
      { label: "Каталог", href: "/filter" },
      { label: "FAQ", href: "#faq" },
      { label: "Контакты", href: "#contact" }
    ],
    nav_login: "Войти",
    nav_profile: "Кабинет",

    hero_title: "По всему Узбекистану —\nудобные",
    hero_subtitle: "Офисы, магазины и склады — в аренду и на продажу.",
    hero_cta: "Найти место",
    hero_animated_words: "офисы, коворкинги, залы, магазины, склады",
    home_partner_title: "Joyzone — это не только аренда.",
    home_partner_text: "Разместите офис, магазин или склад: сдайте в аренду или продайте.",
    home_partner_cta: "Подробнее",
    
    tab_all: "Все",


    popular_title: "Популярные места",
    popular_subtitle: "Самые просматриваемые места в аренду и на продажу",
    how_step1: "Войдите по номеру телефона — после SMS-кода профиль готов.",
    how_step2: "Отфильтруйте по формату, цене и удобствам и выберите подходящее место.",
    how_step3: "Для аренды выберите дату и время, а по объекту на продажу — позвоните или напишите продавцу.",
    agent_title: "Топ агенты",
    agent_sub: "Самые активные и надёжные владельцы мест на Joyzone.",
    agent_badge_premium: "Premium агент",
    agent_badge_comfort: "Comfort агент",
    agent_reviews: "отзывов",
    agent_profile: "Профиль",

    rev_title: "Отзывы",
    faq_kicker: "FAQ",
    faq_title: "Частые вопросы",

    
    auth_login_title: "Добро пожаловать!",
    auth_login_sub: "Введите номер телефона — мы отправим на него код подтверждения.",
    auth_reg_title: "Регистрация",
    auth_reg_sub: "Создайте аккаунт для работы на платформе Joyzone.",
    auth_otp_title: "Подтвердите код",
    auth_otp_sub: "Введите 6-значный код, отправленный на ваш номер телефона.",
    auth_forgot_title: "Сброс пароля",
    auth_forgot_sub: "Введите email или телефон, привязанный к аккаунту. Мы отправим код для сброса пароля.",
    auth_forgot_btn: "Отправить код",
    auth_forgot_login: "Вспомнили пароль? Войти",
    auth_verify_title: "Подтвердите код",
    auth_verify_sub: "Введите 6-значный код, отправленный на ваш номер телефона.",
    auth_verify_btn: "Подтвердить",
    auth_verify_resend: "Код не пришел? Отправить заново",
    
    about_title: "Удобства Joyzone",
    about_text: "Простая и удобная платформа для каждого",
    about_page_kicker: "О Joyzone",
    about_page_title: "Мы упрощаем поиск пространства.",
    about_page_text: "Joyzone собирает офисы, коворкинги, залы, магазины, нежилые помещения и склады на одной платформе — в аренду и на продажу. Клиент быстро находит нужное, а владелец показывает своё место надёжно и понятно.",
    about_story_kicker: "Зачем это нужно",
    about_story_title: "Пространств много, но выбирать не всегда просто.",
    about_story_text: "Наша задача — сразу ответить на главные вопросы о месте. Адрес, площадь, цена и фото собраны в понятной карточке, фильтрах и профиле владельца.",
    partner_guide_kicker: "Инструкция партнёра",
    partner_guide_title: "Руководство партнёра Joyzone.",
    partner_guide_text: "Подключение партнёра проходит коротко и прозрачно: заявка, подготовка карточки, условия, модерация и обработка бронирований.",
    partner_terms_title: "Основные условия сотрудничества.",
    partner_terms_text: "Здесь приведена краткая версия условий. Финальные договорённости могут подтверждаться отдельным документом или формой.",
    tariffs_title: "Выберите подходящий тариф",
    tariffs_subtitle: "Начните бесплатно и меняйте тариф по мере роста бизнеса.",
    
    footer_about: "Joyzone — платформа для аренды и покупки коммерческих помещений в Узбекистане.",
    footer_phone: "+998 77 044 40 00",
    footer_email: "info@joyzone.uz",
    footer_nav1: "Информация",
    footer_link_about: "О нас",
    footer_link_dirs: "Направления",
    footer_link_contact: "Контакты",
    footer_col1_links: [
      { label: "О нас", href: "/about-us" },
      { label: "Каталог", href: "/filter" },
      { label: "Вопросы и ответы", href: "/#faq" },
      { label: "Условия партнёрства", href: "/partner-guide" }
    ],
    footer_col2_links: [
      { label: "Офисы", href: "/filter?category=ofis" },
      { label: "Коворкинги", href: "/filter?category=kovorking" },
      { label: "Торговые площади", href: "/filter?category=savdo" },
      { label: "Склады", href: "/filter?category=ombor" },
      { label: "Стать партнёром", href: "/partner-guide#become" }
    ],
    
  },
  en: {
    nav_links_arr: [
      { label: "Home", href: "/" },
      { label: "About Us", href: "/about-us" },
      { label: "Catalog", href: "/filter" },
      { label: "FAQ", href: "#faq" },
      { label: "Contacts", href: "#contact" }
    ],
    nav_login: "Log In",
    nav_profile: "Profile",

    hero_title: "Across Uzbekistan —\nthe right",
    hero_subtitle: "Offices, shops and warehouses — to rent or to buy.",
    hero_cta: "Find a space",
    hero_animated_words: "offices, coworkings, halls, shops, warehouses",
    home_partner_title: "Joyzone is more than rentals.",
    home_partner_text: "List your office, shop or warehouse — rent it out or sell it.",
    home_partner_cta: "Learn more",
    
    tab_all: "All",


    popular_title: "Popular Spaces",
    popular_subtitle: "The most viewed spaces to rent and to buy",
    how_step1: "Sign in with your phone number — your profile is ready after the SMS code.",
    how_step2: "Filter by format, price and amenities and pick the space that fits.",
    how_step3: "For a rental pick the date and time; for a property on sale, call or message the seller.",
    agent_title: "Top agents",
    agent_sub: "The most active and trusted space owners on Joyzone.",
    agent_badge_premium: "Premium agent",
    agent_badge_comfort: "Comfort agent",
    agent_reviews: "reviews",
    agent_profile: "Profile",

    rev_title: "Reviews",
    faq_kicker: "FAQ",
    faq_title: "Frequently asked questions",

    
    auth_login_title: "Welcome Back!",
    auth_login_sub: "Enter your phone number and we'll send you a confirmation code.",
    auth_reg_title: "Sign Up",
    auth_reg_sub: "Create an account to start using the Joyzone platform.",
    auth_otp_title: "Verify Code",
    auth_otp_sub: "Enter the 6-digit code we sent to your phone.",
    auth_forgot_title: "Reset Password",
    auth_forgot_sub: "Enter your email or phone number. We'll send a code to reset your password.",
    auth_forgot_btn: "Send Verification Code",
    auth_forgot_login: "Remember your password? Login",
    auth_verify_title: "Verify Code",
    auth_verify_sub: "Enter the 6-digit code we sent to your phone.",
    auth_verify_btn: "Verify",
    auth_verify_resend: "Didn't receive code? Resend",
    
    about_title: "Joyzone Features",
    about_text: "A simple and convenient platform for everyone",
    about_page_kicker: "About Joyzone",
    about_page_title: "We make finding a space easier.",
    about_page_text: "Joyzone brings offices, coworkings, halls, shops, commercial premises and warehouses together, to rent or to buy. Clients find what they need fast, and owners present their space clearly and reliably.",
    about_story_kicker: "Why it matters",
    about_story_title: "There are many spaces, but choosing is not always easy.",
    about_story_text: "Our goal is to answer the key questions right away. Address, area, price and photos come together in a clear card, filters and the owner's profile.",
    partner_guide_kicker: "Partner guide",
    partner_guide_title: "The Joyzone partner guide.",
    partner_guide_text: "Becoming a partner is short and transparent: application, listing preparation, terms, moderation, and booking request management.",
    partner_terms_title: "Core partnership terms.",
    partner_terms_text: "This is a short overview of the agreement. Final terms may be confirmed through a separate document or form.",
    tariffs_title: "Choose the right plan",
    tariffs_subtitle: "Start free and change your plan as your business grows.",
    
    footer_about: "Joyzone is a platform to rent and buy commercial space in Uzbekistan.",
    footer_phone: "+998 77 044 40 00",
    footer_email: "info@joyzone.uz",
    footer_nav1: "Information",
    footer_link_about: "About Us",
    footer_link_dirs: "Categories",
    footer_link_contact: "Contact",
    footer_col1_links: [
      { label: "About us", href: "/about-us" },
      { label: "Catalog", href: "/filter" },
      { label: "FAQ", href: "/#faq" },
      { label: "Partner terms", href: "/partner-guide" }
    ],
    footer_col2_links: [
      { label: "Offices", href: "/filter?category=ofis" },
      { label: "Coworking", href: "/filter?category=kovorking" },
      { label: "Retail space", href: "/filter?category=savdo" },
      { label: "Warehouses", href: "/filter?category=ombor" },
      { label: "Become a partner", href: "/partner-guide#become" }
    ],
    
  }
};

export const defaultContent = Object.fromEntries(
  Object.entries(baseContent).map(([lang, values]) => [lang, { ...values, ...siteTexts[lang], ...defaultLists[lang] }]),
);
