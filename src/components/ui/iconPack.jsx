import React from "react";

// Joyzone line icon pack (24x24, stroke). Parameters and amenities store the
// icon `name`; the admin picks it from this list, searching by any keyword.
export const ICON_PACK = [
  { name: "wifi", label: "Wi-Fi", keys: "internet wi-fi wifi tarmoq интернет сеть", d: "M5 13a10 10 0 0 1 14 0M8.5 16.5a5 5 0 0 1 7 0M2 9.5a15 15 0 0 1 20 0M12 20h.01" },
  { name: "wind", label: "Konditsioner", keys: "konditsioner havo кондиционер воздух air conditioner", d: "M9.6 4.6A2 2 0 1 1 11 8H2m10.6 11.4A2 2 0 1 0 14 16H2m15.7-8.3A2.5 2.5 0 1 1 19.5 12H2" },
  { name: "snowflake", label: "Sovutish", keys: "sovuq sovutish холод охлаждение cooling", d: "M12 2v20M4.9 6l14.2 12M19.1 6 4.9 18M9 4l3 2 3-2M9 20l3-2 3 2" },
  { name: "flame", label: "Isitish", keys: "isitish issiq отопление тепло heating", d: "M12 22a7 7 0 0 0 7-7c0-4-3-6-4-9-1 3-3 4-4 4 0-2-1-4-2-5-2 3-4 6-4 10a7 7 0 0 0 7 7Z" },
  { name: "tv", label: "Ekran / TV", keys: "tv ekran televizor monitor экран телевизор", d: "M2 5h20v12H2zM12 17v4M8 21h8" },
  { name: "projector", label: "Proyektor", keys: "proyektor taqdimot проектор презентация", d: "M2 8h20v8H2zM6 16v3M18 16v3M15 12a2 2 0 1 0 4 0 2 2 0 0 0-4 0M5 12h6" },
  { name: "board", label: "Doska", keys: "doska whiteboard flipchart доска флипчарт", d: "M3 4h18v12H3zM12 16v4M8 20h8M7 9h6M7 12h4" },
  { name: "mic", label: "Mikrofon", keys: "mikrofon ovoz микрофон звук sound", d: "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3ZM19 11a7 7 0 0 1-14 0M12 18v3" },
  { name: "speaker", label: "Ovoz tizimi", keys: "kolonka ovoz tizimi колонки звук акустика", d: "M6 3h12v18H6zM12 17a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12 7h.01" },
  { name: "video", label: "Videoqo'ng'iroq", keys: "kamera video qo'ng'iroq камера видеозвонок zoom", d: "M3 7h12v10H3zM15 11l6-3v8l-6-3" },
  { name: "printer", label: "Printer", keys: "printer skaner принтер сканер", d: "M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 9V3h12v6M6 14h12v7H6z" },
  { name: "laptop", label: "Kompyuter", keys: "kompyuter noutbuk компьютер ноутбук", d: "M4 5h16v10H4zM2 19h20" },
  { name: "plug", label: "Rozetka", keys: "rozetka quvvat elektr розетка зарядка электричество", d: "M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0zM12 18v4" },
  { name: "coffee", label: "Qahva", keys: "qahva kofe choy кофе чай coffee tea", d: "M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4ZM6 2v3M10 2v3M14 2v3" },
  { name: "utensils", label: "Oshxona", keys: "oshxona bufet ovqat кухня буфет еда", d: "M3 2v7a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V2M7 2v20M17 2c-2 2-3 5-3 8h3v12" },
  { name: "water", label: "Suv", keys: "suv kuler вода кулер water", d: "M12 2s6 7 6 12a6 6 0 0 1-12 0c0-5 6-12 6-12Z" },
  { name: "fridge", label: "Muzlatgich", keys: "muzlatgich холодильник fridge", d: "M6 2h12v20H6zM6 10h12M9 6v1M9 13v3" },
  { name: "parking", label: "Avtoturargoh", keys: "parkovka avtoturargoh mashina парковка авто", d: "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2ZM9 17V7h4a3 3 0 0 1 0 6H9" },
  { name: "car", label: "Mashina", keys: "mashina avto транспорт машина car", d: "M5 17h14M5 17v3M19 17v3M3 13l2-6h14l2 6v4H3zM7 14h.01M17 14h.01" },
  { name: "bike", label: "Velosiped", keys: "velosiped велосипед bike", d: "M5.5 18a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM18.5 18a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM5.5 14.5 9 7h5l4.5 7.5M12 14.5 9 7" },
  { name: "elevator", label: "Lift", keys: "lift elevator лифт", d: "M4 3h16v18H4zM9 9l3-3 3 3M9 15l3 3 3-3" },
  { name: "stairs", label: "Qavat", keys: "qavat zina этаж лестница floor", d: "M3 21h5v-5h5v-5h5V6h3" },
  { name: "accessible", label: "Nogironlar uchun", keys: "nogironlar kreslo доступная среда инвалид", d: "M12 5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM10 8v6h6l2 5M10 11h5M7.5 12.5a5 5 0 1 0 7 6" },
  { name: "key", label: "Kalit", keys: "kalit self check-in kirish ключ вход", d: "m21 2-2 2m-7.6 7.6a5.5 5.5 0 1 1-7.8 7.8 5.5 5.5 0 0 1 7.8-7.8Zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" },
  { name: "lock", label: "Xavfsizlik", keys: "qulf xavfsiz замок безопасность", d: "M5 11h14v11H5zM8 11V7a4 4 0 0 1 8 0v4" },
  { name: "shield", label: "Qo'riqlash", keys: "qo'riqlash himoya охрана защита security", d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" },
  { name: "cctv", label: "Kamera kuzatuv", keys: "videokuzatuv kamera видеонаблюдение cctv", d: "M3 7l14 4-2 4L3 11zM17 11l3 1M15 15l1 4H5M5 19v-6" },
  { name: "clock", label: "Vaqt", keys: "vaqt soat время часы", d: "M12 8v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" },
  { name: "access24", label: "24/7", keys: "24/7 kecha-kunduz круглосуточно access", d: "M12 21a9 9 0 1 1 9-9M12 7v5l3 2M16 17h5M18.5 15v5" },
  { name: "calendar", label: "Kalendar", keys: "kalendar sana календарь дата", d: "M7 3v4M17 3v4M4 9h16M4 5h16v16H4z" },
  { name: "users", label: "Sig'im", keys: "odam kishi sig'im люди вместимость гости", d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" },
  { name: "user", label: "Shaxsiy", keys: "shaxs foydalanuvchi человек user", d: "M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" },
  { name: "area", label: "Maydon", keys: "maydon kv.m площадь метраж area", d: "M4 4h16v16H4zM9 4v16M4 9h16" },
  { name: "ruler", label: "O'lcham", keys: "o'lcham uzunlik размер линейка ruler", d: "M3 17 17 3l4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2" },
  { name: "door", label: "Xonalar", keys: "xona eshik комната дверь rooms", d: "M5 21V3h11v18M16 5h3v16M3 21h18M12 12h.01" },
  { name: "desk", label: "Ish stoli", keys: "stol ish joyi стол рабочее место desk workplace", d: "M3 9h18M5 9v11M19 9v11M5 14h14M9 9V5h6v4" },
  { name: "chair", label: "Stul", keys: "stul kreslo стул кресло chair", d: "M7 3h10v9H7zM5 12h14M7 12v9M17 12v9M7 17h10" },
  { name: "meeting", label: "Muzokara xonasi", keys: "muzokara uchrashuv переговорная встреча meeting", d: "M4 12h16v3H4zM7 15v5M17 15v5M7 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM17 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" },
  { name: "building", label: "Bino", keys: "bino ofis biznes-markaz здание офис", d: "M4 21V5l8-3 8 3v16M2 21h20M9 9h.01M15 9h.01M9 13h.01M15 13h.01M10 21v-4h4v4" },
  { name: "home", label: "Uy", keys: "uy kvartira дом квартира home", d: "M3 11 12 3l9 8M5 9v12h14V9M10 21v-6h4v6" },
  { name: "restroom", label: "Hojatxona", keys: "hojatxona tualet wc туалет санузел", d: "M7 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM17 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM5 21v-7H4l1-5h4l1 5H9v7M15 21V9h4v12M12 3v18" },
  { name: "shower", label: "Dush", keys: "dush yuvinish душ shower", d: "M4 21V8a5 5 0 0 1 10 0M10 8h8M12 12v1M15 12v1M18 12v1M12 16v1M15 16v1M18 16v1" },
  { name: "bed", label: "Dam olish", keys: "dam olish yotoq kровать отдых bed", d: "M3 20V6M3 13h18v7M21 13a3 3 0 0 0-3-3h-7v3M7 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" },
  { name: "sofa", label: "Lounge zona", keys: "divan lounge dam diван зона отдыха sofa", d: "M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3M2 13a2 2 0 0 1 4 0v2h12v-2a2 2 0 0 1 4 0v5H2zM5 18v2M19 18v2" },
  { name: "plant", label: "Yashil zona", keys: "o'simlik yashil gul растения зелень plant", d: "M12 22V12M12 12C12 7 8 4 4 4c0 5 3 8 8 8ZM12 14c0-4 3-7 8-7 0 4-3 7-8 7ZM8 22h8" },
  { name: "sun", label: "Tabiiy yorug'lik", keys: "yorug' quyosh deraza свет солнце окно light", d: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" },
  { name: "window", label: "Panorama oyna", keys: "oyna deraza panorama окно панорама window", d: "M3 3h18v18H3zM12 3v18M3 12h18" },
  { name: "terrace", label: "Terrasa", keys: "terrasa balkon терраса балкон", d: "M2 10 12 4l10 6M4 10v10M20 10v10M2 20h20M8 20v-5h8v5M4 15h16" },
  { name: "music", label: "Musiqa", keys: "musiqa музыка music", d: "M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" },
  { name: "gamepad", label: "O'yinlar", keys: "o'yin playstation игры консоль game", d: "M6 12h4M8 10v4M15 13h.01M18 11h.01M17.3 5H6.7a4 4 0 0 0-4 3.6l-.7 6.3A3 3 0 0 0 7.1 17l1.9-2h6l1.9 2a3 3 0 0 0 5.1-2.1l-.7-6.3A4 4 0 0 0 17.3 5Z" },
  { name: "book", label: "Kutubxona", keys: "kitob kutubxona книги библиотека library", d: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15A2.5 2.5 0 0 0 6.5 22H20v-5" },
  { name: "dumbbell", label: "Sport zal", keys: "sport zal fitnes спортзал фитнес gym", d: "M6 5v14M18 5v14M3 8v8M21 8v8M6 12h12" },
  { name: "child", label: "Bolalar zonasi", keys: "bolalar детская зона дети kids", d: "M12 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM8 21l1-7-3-3 3-3h6l3 3-3 3 1 7M12 14v7" },
  { name: "pet", label: "Uy hayvonlari", keys: "hayvon it mushuk животные pets", d: "M5 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM9 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM15 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM19 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM12 11c-3 0-6 4-6 7a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3c0-3-3-7-6-7Z" },
  { name: "smoking", label: "Chekish joyi", keys: "chekish курение smoking", d: "M2 16h15v4H2zM20 16v4M17 8c0-2 2-2 2-4M21 12c0-3-2-4-2-6" },
  { name: "sparkles", label: "Tozalik", keys: "toza tozalash уборка чистота clean", d: "M12 3 10 9 4 11l6 2 2 6 2-6 6-2-6-2ZM19 3v4M17 5h4" },
  { name: "mail", label: "Pochta", keys: "pochta xat почта корреспонденция mail", d: "M3 5h18v14H3zM3 6l9 7 9-7" },
  { name: "phone", label: "Telefon", keys: "telefon qo'ng'iroq телефон звонок", d: "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" },
  { name: "help", label: "Yordam", keys: "yordam qo'llab-quvvatlash помощь поддержка support", d: "M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z" },
  { name: "reception", label: "Resepshn", keys: "resepshn administrator ресепшн администратор", d: "M2 20h20M4 20v-6h16v6M12 14V9M8 9h8M12 6a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" },
  { name: "locker", label: "Shkaf", keys: "shkaf saqlash шкаф хранение locker", d: "M4 3h16v18H4zM12 3v18M9 10v2M15 10v2" },
  { name: "wallet", label: "To'lov", keys: "to'lov karta оплата карта payment", d: "M3 6h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3zM3 6l13-3v3M17 13h.01" },
  { name: "map", label: "Joylashuv", keys: "manzil xarita локация карта location", d: "M12 21s7-4.7 7-11a7 7 0 0 0-14 0c0 6.3 7 11 7 11ZM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" },
  { name: "metro", label: "Metro", keys: "metro transport bekat метро станция", d: "M4 20 9 5l3 7 3-7 5 15M3 20h18" },
  { name: "cancel", label: "Bekor qilish", keys: "bekor rad xato отмена отказ cancel", d: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM15 9l-6 6M9 9l6 6" },
  { name: "bell", label: "Bildirishnoma", keys: "bildirishnoma xabar уведомление notification", d: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" },
  { name: "layers", label: "Boshqa", keys: "boshqa umumiy другое общее other", d: "m12 2 10 5-10 5L2 7zM2 12l10 5 10-5M2 17l10 5 10-5" },
  { name: "check", label: "Belgi", keys: "bor ha belgi галочка есть check", d: "M22 11v1a10 10 0 1 1-6-9.2M22 4 12 14l-3-3" },
  { name: "star", label: "Yulduz", keys: "yulduz premium звезда star", d: "m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 16.9l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" },
];

const BY_NAME = Object.fromEntries(ICON_PACK.map((icon) => [icon.name, icon]));

// Old/hand-typed names that existing records may still hold.
const ALIASES = {
  "check-circle": "check",
  "coffee_tea": "coffee",
  "access_24_7": "access24",
  "24-7": "access24",
  "whiteboard": "board",
  "air": "wind",
  "kitchen": "utensils",
};

// Pick an icon for a parameter that has none yet, from its slug or name.
const GUESSES = [
  [/wi-?fi|internet/i, "wifi"],
  [/konditsion|кондиц|air/i, "wind"],
  [/proyektor|проектор|projector/i, "projector"],
  [/park/i, "parking"],
  [/coffee|qahva|kofe|choy|кофе|чай/i, "coffee"],
  [/24/i, "access24"],
  [/meeting|muzokara|переговор/i, "meeting"],
  [/restroom|hojat|туалет|санузел|wc/i, "restroom"],
  [/floor|qavat|этаж/i, "stairs"],
  [/area|maydon|площад/i, "area"],
  [/capacity|sig'?im|вмест|people|kishi/i, "users"],
  [/room|xona|комнат/i, "door"],
  [/desk|workplace|ish o'?rin|ish stol|рабоч|стол/i, "desk"],
  [/printer|принтер/i, "printer"],
  [/kitchen|oshxona|кухн/i, "utensils"],
  [/lift|elevator|лифт/i, "elevator"],
  [/secur|xavfsiz|охран/i, "shield"],
];

export function resolveIconName(icon, ...hints) {
  const value = String(icon || "").trim();
  if (BY_NAME[value]) return value;
  if (ALIASES[value]) return ALIASES[value];
  const text = [value, ...hints].filter(Boolean).join(" ");
  const guess = GUESSES.find(([pattern]) => pattern.test(text));
  return guess ? guess[1] : "check";
}

export function PackIcon({ name, size = 22, strokeWidth = 2, className = "" }) {
  const icon = BY_NAME[name] || BY_NAME[ALIASES[name]] || BY_NAME.check;
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={icon.d} />
    </svg>
  );
}

export function searchIcons(query) {
  const words = String(query || "").toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return ICON_PACK;
  return ICON_PACK.filter((icon) => {
    const haystack = `${icon.name} ${icon.label} ${icon.keys}`.toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
}
