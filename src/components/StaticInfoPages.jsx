import React from "react";
import logoImage from "../assets/img/Logo.png";
import "./StaticInfoPages.css";

function PageIcon({ type }) {
  const paths = {
    back: ["M19 12H5", "m12 19-7-7 7-7"],
    spark: ["M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9L12 2Z"],
    map: ["M12 21s7-5.1 7-11a7 7 0 0 0-14 0c0 5.9 7 11 7 11Z", "M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"],
    shield: ["M12 3 20 6v6c0 5-3.4 8.1-8 9-4.6-.9-8-4-8-9V6z", "m9 12 2 2 4-5"],
    building: ["M5 21V8l7-4 7 4v13", "M9 21v-5h6v5", "M9 10h.01M12 10h.01M15 10h.01M9 13h.01M12 13h.01M15 13h.01"],
    check: ["M20 6 9 17l-5-5"],
    chat: ["M21 12a8 8 0 0 1-8 8H7l-4 2 1.3-4.4A8 8 0 1 1 21 12Z", "M8 11h8M8 14h5"],
    eye: ["M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"],
    phone: ["M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.7.6 2.5a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6.4 6.4l1.3-1.3a2 2 0 0 1 2.1-.5c.8.3 1.6.5 2.5.6a2 2 0 0 1 1.7 2.1Z"],
    mail: ["M4 6h16v12H4z", "m4 7 8 6 8-6"],
    arrow: ["M5 12h14", "m13 6 6 6-6 6"],
    instagram: ["M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Z", "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z", "M17.5 6.5h.01"],
    telegram: ["M21 4 3 11.5l6.8 2.3L17 8.2l-4.7 7.1 5.2 4.7L21 4Z"],
    linkedin: ["M6 9v11", "M6 5v.01", "M10 20v-7a4 4 0 0 1 8 0v7"]
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {(paths[type] || paths.spark).map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}

function BackButton() {
  return (
    <a className="static-back-button" href="#home">
      <PageIcon type="back" />
      Ortga qaytish
    </a>
  );
}

const aboutStats = [
  ["120+", "joy kartalari"],
  ["24/7", "bron so'rovlari"],
  ["10 min", "tanlash va yuborish"],
  ["1 joy", "hamma formatlar"]
];

const aboutValues = [
  {
    icon: "map",
    title: "Joyni tez tushunish",
    text: "Kartochkada rasm, manzil, narx, sig'im va format birinchi qarashdayoq ko'rinadi."
  },
  {
    icon: "shield",
    title: "Ishonchli tanlov",
    text: "Partner profili, sharhlar va moderatsiya signallari mijozga xavfsiz qaror qilishga yordam beradi."
  },
  {
    icon: "building",
    title: "Partnerlar uchun o'sish",
    text: "Joy egasi o'z maydonini chiroyli ko'rsatadi, so'rovlarni oladi va ko'rinishini oshiradi."
  }
];

const guideSteps = [
  {
    step: "01",
    title: "Ariza yuborish",
    text: "Joy egasi yoki vakili asosiy ma'lumotlarni qoldiradi: tashkilot nomi, telefon, joy formati va manzil.",
    deliverable: "Kontakt va joy profili"
  },
  {
    step: "02",
    title: "Joyni tekshirish",
    text: "Joyzone jamoasi joy formati, sig'im, rasmlar sifati va mijoz uchun muhim bo'lgan shartlarni ko'rib chiqadi.",
    deliverable: "Moderatsiya statusi"
  },
  {
    step: "03",
    title: "Karta tayyorlash",
    text: "Rasmlar, narx, sig'im, qulayliklar, joy qoidalari va qisqa tavsif yagona karta ko'rinishiga keltiriladi.",
    deliverable: "Tayyor listing"
  },
  {
    step: "04",
    title: "Shartlarni kelishish",
    text: "Narx, bron qilish tartibi, bekor qilish qoidasi, aloqa va mas'uliyat chegaralari tasdiqlanadi.",
    deliverable: "Hamkorlik shartlari"
  },
  {
    step: "05",
    title: "E'longa chiqarish",
    text: "Karta katalogda ko'rinadi, foydalanuvchi joyni saqlashi, ko'rishi va bron so'rovini yuborishi mumkin.",
    deliverable: "Public ko'rinish"
  },
  {
    step: "06",
    title: "So'rovlar bilan ishlash",
    text: "Hamkor kelgan so'rovlarni ko'radi, tez javob beradi, band sanalarni yangilaydi va karta ma'lumotlarini dolzarb ushlab turadi.",
    deliverable: "Doimiy boshqaruv"
  }
];

const partnerTerms = [
  {
    title: "Joy egasi yoki vakolatli vakil",
    text: "Joyni platformaga joylashtirayotgan shaxs joy egasi bo'lishi yoki e'lon berishga ruxsatga ega bo'lishi kerak."
  },
  {
    title: "Aniq narx va real ma'lumot",
    text: "Narx, sig'im, manzil, qulayliklar va cheklovlar mijoz ko'rgan paytda amaldagi holatga mos bo'lishi kerak."
  },
  {
    title: "Sifatli rasmlar",
    text: "Rasmlar joyning haqiqiy ko'rinishini berishi, juda qorong'i, chalg'ituvchi yoki boshqa obyektga tegishli bo'lmasligi kerak."
  },
  {
    title: "Bron va bekor qilish qoidasi",
    text: "Tasdiqlash muddati, to'lov tartibi, bekor qilish sharti va qo'shimcha xizmatlar oldindan kelishiladi."
  },
  {
    title: "Xavfsizlik va tozalik",
    text: "Hamkor joyni foydalanuvchi keladigan vaqtda tayyor, toza va kelishilgan imkoniyatlar bilan ta'minlaydi."
  },
  {
    title: "Moderatsiya huquqi",
    text: "Joyzone karta matni, rasmlari yoki shartlari ishonchsiz bo'lsa, e'lonni tuzatish, pauza qilish yoki rad etish huquqini saqlaydi."
  }
];

const footerColumns = [
  {
    title: "Platforma",
    links: ["Joy qidirish", "Katalog", "Hamkorlar", "FAQ"]
  },
  {
    title: "Hamkorlik",
    links: ["Joy qo'shish", "Partner qo'llanmasi", "Moderatsiya", "Bron qoidalari"]
  },
  {
    title: "Kompaniya",
    links: ["Biz haqimizda", "Kontaktlar", "Shartlar", "Maxfiylik"]
  }
];

function AboutUsPage() {
  return (
    <main className="static-page static-about-page">
      <BackButton />
      <section className="static-hero">
        <div className="static-hero-copy">
          <span className="static-kicker">Joyzone haqida</span>
          <h1>Joy topishni oson qilamiz.</h1>
          <p>
            Joyzone ofis, kovorking, uchrashuv xonasi, konferensiya zali va tadbir maydonlarini bitta qulay
            platformada ko'rsatadi. Mijoz kerakli joyni tez tushunadi, partner esa o'z maydonini ishonchli
            ko'rinishda taqdim etadi.
          </p>
        </div>
        <div className="about-visual-panel" aria-label="Joyzone platformasi">
          <div className="about-browser-card">
            <div className="about-browser-top">
              <span />
              <span />
              <span />
              <strong>joyzone.uz</strong>
            </div>
            <div className="about-preview-grid">
              <b />
              <b />
              <b />
              <b />
            </div>
            <div className="about-preview-line">
              <i />
              <i />
              <i />
            </div>
          </div>
        </div>
      </section>

      <section className="about-stats-grid" aria-label="Joyzone raqamlari">
        {aboutStats.map(([value, label]) => (
          <article key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </article>
        ))}
      </section>

      <section className="about-values-grid">
        {aboutValues.map((item) => (
          <article key={item.title}>
            <div className="static-icon">
              <PageIcon type={item.icon} />
            </div>
            <h2>{item.title}</h2>
            <p>{item.text}</p>
          </article>
        ))}
      </section>

      <section className="about-story-section">
        <div>
          <span className="static-kicker">Nima uchun kerak</span>
          <h2>Ko'p joy bor, lekin tanlash doim ham oson emas.</h2>
        </div>
        <p>
          Bizning maqsadimiz oddiy: joy haqida asosiy savollarni birinchi ekranda javoblash. Qayerda joylashgan?
          Necha kishi sig'adi? Narxi qancha? Qanday ko'rinadi? Joyzone shu ma'lumotlarni tartibli karta, filtr va
          partner profili orqali foydalanuvchiga yaqinlashtiradi.
        </p>
      </section>
    </main>
  );
}

function PartnerGuidePage() {
  return (
    <main className="static-page partner-guide-page">
      <BackButton />
      <section className="partner-guide-hero">
        <div className="partner-guide-copy">
          <span className="static-kicker">Partner instruktsiyasi</span>
          <h1>Joyzone partner qo'llanmasi.</h1>
          <p>
            Hamkor bo'lish jarayoni qisqa va nazoratli. Quyida ariza, karta tayyorlash, shartlar, moderatsiya
            va bron so'rovlari tartibi keltirilgan.
          </p>
          <div className="partner-hero-metrics" aria-label="Partner jarayoni">
            <span><strong>6</strong> qadam</span>
            <span><strong>24 soat</strong> ko'rib chiqish</span>
            <span><strong>1</strong> tayyor karta</span>
          </div>
        </div>
        <aside className="partner-console" aria-label="Partner kabineti namunasi">
          <div className="partner-console-top">
            <span />
            <span />
            <span />
            <strong>Joyzone Partner</strong>
          </div>
          <div className="partner-console-body">
            <div className="partner-console-status">
              <small>Status</small>
              <b>Moderatsiyaga tayyor</b>
            </div>
            <div className="partner-console-row">
              <span>Rasmlar</span>
              <strong>8/8</strong>
            </div>
            <div className="partner-console-row">
              <span>Narx</span>
              <strong>499 000 so'm</strong>
            </div>
            <div className="partner-console-row">
              <span>Sig'im</span>
              <strong>24 kishi</strong>
            </div>
            <div className="partner-console-progress">
              <i />
            </div>
          </div>
        </aside>
      </section>

      <section className="partner-guide-layout">
        <aside className="partner-guide-sidebar">
          <span>Jarayon</span>
          <strong>Listing tayyorlash</strong>
          <p>Har bir qadam karta sifatini, mijoz ishonchini va bron konversiyasini oshirish uchun kerak.</p>
        </aside>
        <div className="partner-process-list">
          {guideSteps.map((item) => (
            <article className="partner-process-item" key={item.step}>
              <span>{item.step}</span>
              <div>
                <h2>{item.title}</h2>
                <p>{item.text}</p>
              </div>
              <b>{item.deliverable}</b>
            </article>
          ))}
        </div>
      </section>

      <section className="partner-terms-section">
        <div className="partner-terms-head">
          <span className="static-kicker">Hamkorlik shartlari</span>
          <h2>Hamkor bo'lish uchun asosiy qoidalar.</h2>
          <p>
            Bu blok kelishuvning qisqa ko'rinishi. Yakuniy shartlar alohida hujjat yoki forma orqali
            tasdiqlanishi mumkin.
          </p>
        </div>
        <div className="partner-terms-grid">
          {partnerTerms.map((term) => (
            <article key={term.title}>
              <h3>{term.title}</h3>
              <p>{term.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="partner-final-strip">
        <span>Keyingi qadam</span>
        <p>Ma'lumotlarni tayyorlang: joy nomi, manzil, 6-8 ta rasm, narx, sig'im, ish vaqti va bron qoidalari.</p>
      </section>
    </main>
  );
}

function FooterVariantPage() {
  return (
    <main className="static-page footer-variant-page">
      <BackButton />
      <section className="footer-variant-intro">
        <span className="static-kicker">Footer varianti</span>
        <h1>Minimal, lekin kuchli yakuniy blok.</h1>
        <p>
          Bu variant home sahifadagi hozirgi futerni almashtirmaydi. Timlid uchun alohida ko'rinish:
          jiddiyroq kompozitsiya, aniq navigatsiya, kontaktlar va kuchli CTA bitta joyda.
        </p>
      </section>

      <section className="footer-showcase" aria-label="Joyzone footer varianti">
        <footer className="footer-concept">
          <div className="footer-concept-main">
            <div className="footer-brand-block">
              <a className="footer-concept-logo" href="#home" aria-label="Joyzone bosh sahifa">
                <img src={logoImage} alt="Joyzone" />
              </a>
              <h2>Joy topish va bron qilishni tartibli qilamiz.</h2>
              <p>
                Ofis, kovorking, uchrashuv xonasi va tadbir maydonlari uchun aniq kartalar,
                tez aloqa va ishonchli bron oqimi.
              </p>
              <div className="footer-concept-actions">
                <a href="#filter">
                  Joy qidirish
                  <PageIcon type="arrow" />
                </a>
                <a href="#partner-guide">Hamkor bo'lish</a>
              </div>
            </div>

            <div className="footer-navigation-panel">
              {footerColumns.map((column) => (
                <nav key={column.title} aria-label={column.title}>
                  <strong>{column.title}</strong>
                  {column.links.map((link) => (
                    <a key={link} href="#home">{link}</a>
                  ))}
                </nav>
              ))}
            </div>
          </div>

          <div className="footer-contact-strip">
            <a href="tel:+998770444000">
              <PageIcon type="phone" />
              +998 77 044 40 00
            </a>
            <a href="mailto:info@joyzone.uz">
              <PageIcon type="mail" />
              info@joyzone.uz
            </a>
            <span>Toshkent, Uzbekistan</span>
          </div>

          <div className="footer-concept-bottom">
            <span>2026 JOY HUB. Barcha huquqlar himoyalangan.</span>
            <div className="footer-social-row" aria-label="Joyzone ijtimoiy tarmoqlari">
              <a href="#instagram" aria-label="Instagram"><PageIcon type="instagram" /></a>
              <a href="#telegram" aria-label="Telegram"><PageIcon type="telegram" /></a>
              <a href="#linkedin" aria-label="LinkedIn"><PageIcon type="linkedin" /></a>
            </div>
          </div>
        </footer>
      </section>
    </main>
  );
}

export { AboutUsPage, PartnerGuidePage, FooterVariantPage };
