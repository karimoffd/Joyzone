// Default values for list blocks that admins edit in "Контент сайта".
// The backend CMS overrides them per language; these are only the starting copy.

const socials = {
  social_telegram: "https://t.me/joyzone",
  social_instagram: "https://instagram.com/joyzone",
  social_facebook: "https://facebook.com/joyzone",
  social_linkedin: "",
  support_phone: "+998 71 123 45 67",
};

export const defaultLists = {
  uz: {
    ...socials,
    benefits_arr: [
      { icon: "interface", title: "Joyni tez tushunish", text: "Rasm, narx, manzil, sig'im va qulayliklar birinchi ko'rinishdayoq aniq ko'rinadi." },
      { icon: "search", title: "Aqlli qidiruv", text: "Shahar, format, narx va odam soni bo'yicha mos joylarni tez ajratib beradi." },
      { icon: "building", title: "Hamkor kabineti", text: "Partnerlar joy qo'shadi, tarif tanlaydi va so'rovlarni bitta kabinetda boshqaradi." },
      { icon: "shield", title: "Ishonch signallari", text: "Reyting, sharhlar va tasdiqlangan profil foydalanuvchiga xavfsiz tanlov beradi." },
      { icon: "crown", title: "Mos tariflar", text: "Tarif paketlari joy egasiga o'z o'sish bosqichini tanlash imkonini beradi." },
      { icon: "megaphone", title: "Ko'rinishni oshirish", text: "Reklama, tavsiya bloklari va yuqori joylashuv orqali obyekt ko'proq mijozga chiqadi." },
    ],
    faq_arr: [
      { question: "Obyektimni Joyzone'ga qo'sha olamanmi?", answer: "Ha. Partner sifatida ro'yxatdan o'tib, ofis, kovorking, zal yoki boshqa joyingizni kabinet orqali moderatsiyaga yuborasiz." },
      { question: "Joylar xaritada ko'rinadimi?", answer: "Joy manzili va hududi kartochkada ko'rinadi. Keyingi bosqichda xarita orqali yaqin joylarni tez tanlash oqimi ham qo'shiladi." },
      { question: "Bron qilish qanday ishlaydi?", answer: "Mijoz kerakli joyni tanlaydi, sanani yoki vaqtni belgilaydi va so'rov yuboradi. Partner kabinetda so'rovni tasdiqlaydi." },
      { question: "Partnerlar uchun tariflar bormi?", answer: "Ha, joy egasi o'sish bosqichiga qarab oddiy joylashtirish yoki ko'proq ko'rinish beradigan paketlarni tanlashi mumkin." },
    ],
    about_stats_arr: [
      { value: "120+", label: "joy kartalari" },
      { value: "24/7", label: "bron so'rovlari" },
      { value: "10 min", label: "tanlash va yuborish" },
      { value: "1 joy", label: "hamma formatlar" },
    ],
    about_values_arr: [
      { icon: "map", title: "Joyni tez tushunish", text: "Kartochkada rasm, manzil, narx, sig'im va format birinchi qarashdayoq ko'rinadi." },
      { icon: "shield", title: "Ishonchli tanlov", text: "Partner profili, sharhlar va moderatsiya signallari mijozga xavfsiz qaror qilishga yordam beradi." },
      { icon: "building", title: "Partnerlar uchun o'sish", text: "Joy egasi o'z maydonini chiroyli ko'rsatadi, so'rovlarni oladi va ko'rinishini oshiradi." },
    ],
    guide_steps_arr: [
      { step: "01", title: "Ariza yuborish", text: "Joy egasi yoki vakili asosiy ma'lumotlarni qoldiradi: tashkilot nomi, telefon, joy formati va manzil.", deliverable: "Kontakt va joy profili" },
      { step: "02", title: "Joyni tekshirish", text: "Joyzone jamoasi joy formati, sig'im, rasmlar sifati va mijoz uchun muhim bo'lgan shartlarni ko'rib chiqadi.", deliverable: "Moderatsiya statusi" },
      { step: "03", title: "Karta tayyorlash", text: "Rasmlar, narx, sig'im, qulayliklar, joy qoidalari va qisqa tavsif yagona karta ko'rinishiga keltiriladi.", deliverable: "Tayyor listing" },
      { step: "04", title: "Shartlarni kelishish", text: "Narx, bron qilish tartibi, bekor qilish qoidasi, aloqa va mas'uliyat chegaralari tasdiqlanadi.", deliverable: "Hamkorlik shartlari" },
      { step: "05", title: "E'longa chiqarish", text: "Karta katalogda ko'rinadi, foydalanuvchi joyni saqlashi, ko'rishi va bron so'rovini yuborishi mumkin.", deliverable: "Public ko'rinish" },
      { step: "06", title: "So'rovlar bilan ishlash", text: "Hamkor kelgan so'rovlarni ko'radi, tez javob beradi, band sanalarni yangilaydi va karta ma'lumotlarini dolzarb ushlab turadi.", deliverable: "Doimiy boshqaruv" },
    ],
    partner_terms_arr: [
      { title: "Joy egasi yoki vakolatli vakil", text: "Joyni platformaga joylashtirayotgan shaxs joy egasi bo'lishi yoki e'lon berishga ruxsatga ega bo'lishi kerak." },
      { title: "Aniq narx va real ma'lumot", text: "Narx, sig'im, manzil, qulayliklar va cheklovlar mijoz ko'rgan paytda amaldagi holatga mos bo'lishi kerak." },
      { title: "Sifatli rasmlar", text: "Rasmlar joyning haqiqiy ko'rinishini berishi, juda qorong'i, chalg'ituvchi yoki boshqa obyektga tegishli bo'lmasligi kerak." },
      { title: "Bron va bekor qilish qoidasi", text: "Tasdiqlash muddati, to'lov tartibi, bekor qilish sharti va qo'shimcha xizmatlar oldindan kelishiladi." },
      { title: "Xavfsizlik va tozalik", text: "Hamkor joyni foydalanuvchi keladigan vaqtda tayyor, toza va kelishilgan imkoniyatlar bilan ta'minlaydi." },
      { title: "Moderatsiya huquqi", text: "Joyzone karta matni, rasmlari yoki shartlari ishonchsiz bo'lsa, e'lonni tuzatish, pauza qilish yoki rad etish huquqini saqlaydi." },
    ],
  },
  ru: {
    ...socials,
    benefits_arr: [
      { icon: "interface", title: "Всё понятно с первого взгляда", text: "Фото, цена, адрес, вместимость и удобства видны сразу на карточке." },
      { icon: "search", title: "Умный поиск", text: "Быстро подбирает места по городу, формату, цене и количеству людей." },
      { icon: "building", title: "Кабинет партнёра", text: "Партнёры добавляют места, выбирают тариф и обрабатывают заявки в одном кабинете." },
      { icon: "shield", title: "Сигналы доверия", text: "Рейтинг, отзывы и проверенный профиль помогают выбрать безопасно." },
      { icon: "crown", title: "Подходящие тарифы", text: "Тарифные пакеты позволяют владельцу выбрать свой этап роста." },
      { icon: "megaphone", title: "Больше просмотров", text: "Реклама, блоки рекомендаций и высокие позиции приводят больше клиентов." },
    ],
    faq_arr: [
      { question: "Могу ли я добавить свой объект в Joyzone?", answer: "Да. Зарегистрируйтесь как партнёр и отправьте офис, коворкинг, зал или другое место на модерацию через кабинет." },
      { question: "Видны ли места на карте?", answer: "Адрес и район места указаны на карточке. Позже появится выбор ближайших мест через карту." },
      { question: "Как работает бронирование?", answer: "Клиент выбирает место, дату или время и отправляет заявку. Партнёр подтверждает её в кабинете." },
      { question: "Есть ли тарифы для партнёров?", answer: "Да, владелец может выбрать базовое размещение или пакеты с большей видимостью." },
    ],
    about_stats_arr: [
      { value: "120+", label: "карточек мест" },
      { value: "24/7", label: "заявки на бронь" },
      { value: "10 мин", label: "выбор и отправка" },
      { value: "1 место", label: "все форматы" },
    ],
    about_values_arr: [
      { icon: "map", title: "Понятное место", text: "Фото, адрес, цена, вместимость и формат видны на карточке с первого взгляда." },
      { icon: "shield", title: "Надёжный выбор", text: "Профиль партнёра, отзывы и модерация помогают клиенту принять безопасное решение." },
      { icon: "building", title: "Рост для партнёров", text: "Владелец красиво показывает своё пространство, получает заявки и повышает видимость." },
    ],
    guide_steps_arr: [
      { step: "01", title: "Заявка", text: "Владелец или представитель оставляет основные данные: название организации, телефон, формат и адрес места.", deliverable: "Контакт и профиль места" },
      { step: "02", title: "Проверка места", text: "Команда Joyzone проверяет формат, вместимость, качество фото и важные для клиента условия.", deliverable: "Статус модерации" },
      { step: "03", title: "Подготовка карточки", text: "Фото, цена, вместимость, удобства, правила и краткое описание собираются в единую карточку.", deliverable: "Готовое объявление" },
      { step: "04", title: "Согласование условий", text: "Утверждаются цена, порядок брони, правила отмены, связь и границы ответственности.", deliverable: "Условия партнёрства" },
      { step: "05", title: "Публикация", text: "Карточка появляется в каталоге: её можно сохранить, посмотреть и отправить заявку на бронь.", deliverable: "Публичная карточка" },
      { step: "06", title: "Работа с заявками", text: "Партнёр видит заявки, быстро отвечает, обновляет занятые даты и поддерживает данные актуальными.", deliverable: "Постоянное управление" },
    ],
    partner_terms_arr: [
      { title: "Владелец или представитель", text: "Человек, размещающий место, должен быть владельцем или иметь право размещать объявление." },
      { title: "Точная цена и реальные данные", text: "Цена, вместимость, адрес, удобства и ограничения должны соответствовать действительности." },
      { title: "Качественные фото", text: "Фото должны показывать реальный вид места, без сильного затемнения и чужих объектов." },
      { title: "Правила брони и отмены", text: "Срок подтверждения, порядок оплаты, условия отмены и доп. услуги согласуются заранее." },
      { title: "Безопасность и чистота", text: "Партнёр обеспечивает готовое, чистое место с оговорёнными удобствами к приходу клиента." },
      { title: "Право модерации", text: "Joyzone может исправить, приостановить или отклонить объявление, если данные недостоверны." },
    ],
  },
  en: {
    ...socials,
    benefits_arr: [
      { icon: "interface", title: "Clear at a glance", text: "Photos, price, address, capacity and amenities are visible right on the card." },
      { icon: "search", title: "Smart search", text: "Quickly filters spaces by city, format, price and number of people." },
      { icon: "building", title: "Partner dashboard", text: "Partners add spaces, choose a plan and manage requests in one place." },
      { icon: "shield", title: "Trust signals", text: "Ratings, reviews and verified profiles help users choose safely." },
      { icon: "crown", title: "Flexible plans", text: "Plans let owners pick the stage of growth that fits them." },
      { icon: "megaphone", title: "More visibility", text: "Ads, featured blocks and top placement bring the space to more customers." },
    ],
    faq_arr: [
      { question: "Can I list my space on Joyzone?", answer: "Yes. Sign up as a partner and send your office, coworking, hall or other space for moderation from the dashboard." },
      { question: "Are spaces shown on a map?", answer: "The address and area are shown on the card. A map view for nearby spaces is coming next." },
      { question: "How does booking work?", answer: "The customer picks a space, date or time and sends a request. The partner confirms it in the dashboard." },
      { question: "Are there plans for partners?", answer: "Yes, owners can choose a basic listing or packages with more visibility." },
    ],
    about_stats_arr: [
      { value: "120+", label: "space cards" },
      { value: "24/7", label: "booking requests" },
      { value: "10 min", label: "to choose and send" },
      { value: "1 place", label: "for every format" },
    ],
    about_values_arr: [
      { icon: "map", title: "Understand a space fast", text: "Photos, address, price, capacity and format are visible on the card at first glance." },
      { icon: "shield", title: "Reliable choice", text: "Partner profiles, reviews and moderation help customers decide safely." },
      { icon: "building", title: "Growth for partners", text: "Owners present their space well, receive requests and increase visibility." },
    ],
    guide_steps_arr: [
      { step: "01", title: "Apply", text: "The owner or a representative leaves basic details: organization, phone, space format and address.", deliverable: "Contact and space profile" },
      { step: "02", title: "Space review", text: "The Joyzone team checks the format, capacity, photo quality and conditions that matter to customers.", deliverable: "Moderation status" },
      { step: "03", title: "Prepare the card", text: "Photos, price, capacity, amenities, rules and a short description are combined into one card.", deliverable: "Ready listing" },
      { step: "04", title: "Agree on terms", text: "Price, booking flow, cancellation rules, contacts and responsibilities are confirmed.", deliverable: "Partnership terms" },
      { step: "05", title: "Publish", text: "The card appears in the catalog; users can save it, view it and send a booking request.", deliverable: "Public listing" },
      { step: "06", title: "Handle requests", text: "The partner sees requests, replies quickly, updates busy dates and keeps the card current.", deliverable: "Ongoing management" },
    ],
    partner_terms_arr: [
      { title: "Owner or authorized representative", text: "The person listing the space must own it or be allowed to publish the listing." },
      { title: "Accurate price and real data", text: "Price, capacity, address, amenities and restrictions must match reality." },
      { title: "Quality photos", text: "Photos must show the real space, not too dark, misleading or of another property." },
      { title: "Booking and cancellation rules", text: "Confirmation time, payment, cancellation terms and extra services are agreed in advance." },
      { title: "Safety and cleanliness", text: "The partner provides a ready, clean space with the agreed amenities when the customer arrives." },
      { title: "Moderation rights", text: "Joyzone may correct, pause or reject a listing if its details are unreliable." },
    ],
  },
};
