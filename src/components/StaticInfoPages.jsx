import { cmsList, mailHref, phoneHref, socialLinks } from "../utils/cmsLinks.js";
import React, { useState, useEffect, useContext } from "react";
import api, { getAccessToken, getApiErrorMessage } from "../api/client.js";
import { LanguageContext, useSiteContent } from "../context/LanguageContext.jsx";
import { cacheProfile } from "../utils/profileMapper.js";
import PaymentModal from "./PaymentModal.jsx";
import logoImage from "../assets/img/Logo.png";
import "./StaticInfoPages.css";
import "./partner/partnerGuide.css";
import BecomePartnerForm from "./partner/BecomePartnerForm.jsx";
import { GUIDE_TEXT } from "./partner/guideText.js";
import { partnerEntryHref, useAccountRole } from "../utils/partnerAccess.js";
import { getPlacesFromApiResponse, normalizePlace } from "../utils/placeMapper.js";
import { ABOUT_TEXT } from "./about/aboutText.js";
import "./about/aboutPage.css";
import { navigate } from "../utils/router.js";

function PageIcon({ type }) {
  const paths = {
    back: ["M19 12H5", "m12 19-7-7 7-7"],
    spark: ["M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9L12 2Z"],
    map: ["M12 21s7-5.1 7-11a7 7 0 0 0-14 0c0 5.9 7 11 7 11Z", "M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"],
    shield: ["M12 3 20 6v6c0 5-3.4 8.1-8 9-4.6-.9-8-4-8-9V6z", "m9 12 2 2 4-5"],
    building: ["M5 21V8l7-4 7 4v13", "M9 21v-5h6v5", "M9 10h.01M12 10h.01M15 10h.01M9 13h.01M12 13h.01M15 13h.01"],
    check: ["M20 6 9 17l-5-5"],
    chat: ["M12 3.2c5 0 9 3.6 9 8s-4 8-9 8c-1.1 0-2.1-.2-3.1-.5L4.4 20.8l1.3-3.9C4 15.4 3 13.4 3 11.2c0-4.4 4-8 9-8Z", "M7.4 11.2a.6.6 0 1 0 1.2 0 .6.6 0 1 0-1.2 0", "M11.4 11.2a.6.6 0 1 0 1.2 0 .6.6 0 1 0-1.2 0", "M15.4 11.2a.6.6 0 1 0 1.2 0 .6.6 0 1 0-1.2 0"],
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
  const { cms } = useSiteContent();
  return (
    <a className="static-back-button" href="/" aria-label={cms.back_button || "Ortga qaytish"}>
      <PageIcon type="back" />
      <span>{cms.back_button || "Ortga qaytish"}</span>
    </a>
  );
}

// Up to three real listings with photos for the about page collage.
function useShowcasePlaces() {
  const [places, setPlaces] = useState([]);
  useEffect(() => {
    api.get("/api/places/popular/", { skipAuth: true })
      .then((res) => setPlaces(
        getPlacesFromApiResponse(res.data)
          .map((item) => normalizePlace(item))
          .filter((item) => /^https?:/.test(item.images?.[0] || ""))
          .slice(0, 3),
      ))
      .catch(() => setPlaces([]));
  }, []);
  return places;
}

function AboutUsPage() {
  const { cms } = useSiteContent();
  const { lang } = useContext(LanguageContext);
  const t = ABOUT_TEXT[lang] || ABOUT_TEXT.uz;
  const { role } = useAccountRole();
  const places = useShowcasePlaces();
  const partnerHref = partnerEntryHref(role);
  const isPartner = partnerHref === "/partner";
  const socials = socialLinks(cms).filter(([type]) => type === "telegram" || type === "instagram");

  return (
    <main className="static-page ab">
      <BackButton />

      <section className="ab-hero">
        <div className="ab-hero-copy">
          <h1>{cms.about_page_title}</h1>
          <p>{cms.about_page_text}</p>
          <div className="ab-actions">
            <a className="bp-btn is-primary" href="/filter">{t.findCta}<PageIcon type="arrow" /></a>
            <a className="bp-btn is-ghost" href={partnerHref}>{isPartner ? t.addCta : t.becomeCta}</a>
          </div>
        </div>

        <div className={`ab-collage${places.length ? "" : " is-empty"}`} aria-hidden="true">
          {[0, 1, 2].map((index) => {
            const place = places[index];
            return (
              <div key={index} className={`ab-shot ab-shot-${index + 1}`} style={place ? { backgroundImage: `url("${place.images[0]}")` } : undefined}>
                {place && index === 0 ? (
                  <span className="ab-shot-card">
                    <strong>{place.title}</strong>
                    <small><PageIcon type="map" />{place.location}</small>
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <section className="ab-stats" aria-label="Joyzone raqamlari">
        {cmsList(cms, "about_stats_arr").map(({ value, label }) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </section>

      <section className="ab-section">
        <header className="ab-head">
          <h2>{t.forTitle}</h2>
        </header>
        <div className="ab-audiences">
          {[["renters", "/filter", "eye"], ["owners", partnerHref, "building"]].map(([key, href, icon]) => {
            const block = t[key];
            return (
              <article key={key} className={`ab-audience is-${key}`}>
                <span className="ab-audience-icon"><PageIcon type={icon} /></span>
                <span className="ab-tag">{block.tag}</span>
                <h3>{block.title}</h3>
                <ul>
                  {block.points.map((point) => <li key={point}><PageIcon type="check" />{point}</li>)}
                </ul>
                <a href={href} className="ab-link">{block.cta}<PageIcon type="arrow" /></a>
              </article>
            );
          })}
        </div>
      </section>

      <section className="ab-section">
        <header className="ab-head is-center">
          <h2>{t.howTitle}</h2>
        </header>
        <ol className="ab-steps">
          {t.how.map((step, index) => (
            <li key={step.title}>
              <b>{index + 1}</b>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="ab-section ab-values-wrap">
        <header className="ab-head">
          <h2>{t.valuesTitle}</h2>
        </header>
        <div className="ab-values">
          {cmsList(cms, "about_values_arr").map((item) => (
            <article key={item.title}>
              <span className="ab-value-icon"><PageIcon type={item.icon} /></span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ab-section ab-story">
        <blockquote>
          <h2>{cms.about_story_title}</h2>
          <p>{cms.about_story_text}</p>
        </blockquote>
      </section>

      <section className="ab-section ab-contact">
        <div>
          <h2>{t.contactTitle}</h2>
          <p>{t.contactText}</p>
        </div>
        <div className="ab-contact-links">
          {cms.footer_phone ? <a href={phoneHref(cms.footer_phone)}><PageIcon type="phone" />{cms.footer_phone}</a> : null}
          {cms.footer_email ? <a href={mailHref(cms.footer_email)}><PageIcon type="mail" />{cms.footer_email}</a> : null}
          {socials.map(([type, label, href]) => (
            <a key={type} href={href} target="_blank" rel="noreferrer"><PageIcon type={type} />{label}</a>
          ))}
        </div>
      </section>
    </main>
  );
}

function PartnerGuidePage() {
  const { cms } = useSiteContent();
  const { lang } = useContext(LanguageContext);
  const t = GUIDE_TEXT[lang] || GUIDE_TEXT.uz;
  const account = useAccountRole();
  const isPartner = account.isAuthed && account.canListPlaces;

  // /partner-guide#become (from buttons and the promo) opens on the form.
  useEffect(() => {
    if (window.location.hash !== "#become") return undefined;
    const timer = setTimeout(() => document.getElementById("become")?.scrollIntoView({ behavior: "smooth", block: "start" }), 350);
    return () => clearTimeout(timer);
  }, []);

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <main className="static-page pg">
      <BackButton />

      <section className="pg-hero">
        <div className="pg-hero-copy">
          <h1>{cms.partner_guide_title}</h1>
          <p>{cms.partner_guide_text}</p>
          <div className="pg-actions">
            {isPartner ? (
              <button type="button" className="bp-btn is-primary" onClick={() => navigate("/partner")}>{t.addPlaceCta}<PageIcon type="arrow" /></button>
            ) : (
              <button type="button" className="bp-btn is-primary" onClick={() => scrollTo("become")}>{t.becomeCta}<PageIcon type="arrow" /></button>
            )}
            <button type="button" className="bp-btn is-ghost" onClick={() => scrollTo("tariffs")}>{t.tariffsCta}</button>
          </div>
          <ul className="pg-metrics" aria-label="Partner jarayoni">
            <li><strong>{cms.guide_metric1_value}</strong>{cms.guide_metric1_label}</li>
            <li><strong>{cms.guide_metric2_value}</strong>{cms.guide_metric2_label}</li>
            <li><strong>{cms.guide_metric3_value}</strong>{cms.guide_metric3_label}</li>
          </ul>
        </div>

        <div className="pg-cabinet" aria-hidden="true">
          <div className="pg-cabinet-top">
            <span className="pg-dots"><i /><i /><i /></span>
            <strong>{t.cabinetTitle}</strong>
          </div>
          <div className="pg-cabinet-stats">
            {t.cabinetStats.map(([label, value]) => (
              <div key={label}><b>{value}</b><small>{label}</small></div>
            ))}
          </div>
          <ul className="pg-requests">
            {t.cabinetRequests.map(([title, time], index) => (
              <li key={title} style={{ "--i": index }}>
                <span className="pg-request-avatar">{title[0]}</span>
                <span><strong>{title}</strong><small>{time}</small></span>
                <i />
              </li>
            ))}
          </ul>
          <span className="pg-cabinet-ping"><PageIcon type="spark" />{t.cabinetNew}</span>
        </div>
      </section>

      <section className="pg-section">
        <header className="pg-head">
          <h2>{t.whyTitle}</h2>
        </header>
        <div className="pg-why">
          {t.why.map((item) => (
            <article key={item.title}>
              <span className="pg-why-icon"><PageIcon type={item.icon} /></span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="pg-section pg-process">
        <aside className="pg-process-side">
          <h2>{cms.guide_sidebar_title}</h2>
          <p>{cms.guide_sidebar_text}</p>
        </aside>
        <ol className="pg-steps">
          {cmsList(cms, "guide_steps_arr").map((item) => (
            <li key={item.step}>
              <span className="pg-step-num">{item.step}</span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                {item.deliverable ? <b>{item.deliverable}</b> : null}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="pg-section pg-become" id="become">
        <div className="pg-become-copy">
          <h2>{t.becomeTitle}</h2>
          <p>{t.becomeText}</p>
          <h3>{t.afterTitle}</h3>
          <ol className="pg-after">
            {t.after.map((line) => <li key={line}>{line}</li>)}
          </ol>
          {cms.guide_next_text ? (
            <div className="pg-note">
              <PageIcon type="check" />
              <span><strong>{cms.guide_next_kicker}</strong>{cms.guide_next_text}</span>
            </div>
          ) : null}
        </div>
        <BecomePartnerForm />
      </section>

      <section className="pg-section">
        <header className="pg-head">
          <h2>{cms.partner_terms_title}</h2>
          <p>{cms.partner_terms_text}</p>
        </header>
        <div className="pg-terms">
          {cmsList(cms, "partner_terms_arr").map((term, index) => (
            <article key={term.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{term.title}</h3>
              <p>{term.text}</p>
            </article>
          ))}
        </div>
      </section>

      <TariffPlansSection />
    </main>
  );
}

function TariffPlansSection() {
  const [tariffs, setTariffs] = useState([]);
  const [submitting, setSubmitting] = useState(null);
  const [done, setDone] = useState(null);
  const [error, setError] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [usingFallback, setUsingFallback] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState(null);
  const { lang, content } = useContext(LanguageContext);
  const cms = content?.[lang] || {};

  const FALLBACK = [
    {
      id: 1, slug: 'standard', name: 'Standard', name_ru: 'Стандарт',
      price: 0, max_places: 1, is_free: true, duration_days: 36500,
      features: ["1 ta faol e'lon", "Asosiy profil", "Bron so'rovlari"],
      features_ru: ["1 активное объявление", "Базовый профиль", "Запросы бронирования"],
      features_en: ["1 active listing", "Basic profile", "Booking requests"],
    },
    {
      id: 2, slug: 'comfort', name: 'Comfort', name_ru: 'Комфорт',
      price: 99000, max_places: 5, is_free: false, duration_days: 30,
      features: ["5 ta faol e'lon", "Kengaytirilgan profil", "Statistika", "Reklama", "Ustuvor ko'rsatish"],
      features_ru: ["До 5 активных объявлений", "Расширенный профиль", "Статистика", "Реклама", "Приоритетный показ"],
      features_en: ["Up to 5 active listings", "Extended profile", "Statistics", "Advertising", "Priority showing"],
    },
    {
      id: 3, slug: 'premium', name: 'Premium', name_ru: 'Премиум',
      price: 199000, max_places: 10, is_free: false, duration_days: 30,
      features: ["10 ta faol e'lon", "Premium badge", "API integratsiya", "Ustuvor moderatsiya", "Shaxsiy menejer"],
      features_ru: ["До 10 активных объявлений", "Премиум значок", "API интеграция", "Приоритетная модерация", "Личный менеджер"],
      features_en: ["Up to 10 active listings", "Premium badge", "API integration", "Priority moderation", "Personal manager"],
    },
  ];

  useEffect(() => {
    api.get('/api/tariffs/', { skipAuth: true })
      .then(res => {
        setTariffs(res.data?.results || res.data || []);
        setLoadError("");
        setUsingFallback(false);
      })
      .catch((err) => {
        if (import.meta.env.DEV) {
          setTariffs(FALLBACK);
          setUsingFallback(true);
          setLoadError("DEV fallback tariffs");
        } else {
          setTariffs([]);
          setUsingFallback(false);
          setLoadError(getApiErrorMessage(err, "Tariflarni yuklab bo'lmadi."));
        }
      });
  }, []);

  const handleSelect = async (tariff) => {
    const token = getAccessToken();
    if (!token) { navigate('/login'); return; }
    setSubmitting(tariff.id);
    try {
      const res = await api.post(
        '/api/tariffs/subscribe/',
        { tariff_id: tariff.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.requires_payment) {
        if (!res.data?.subscription_id) {
          throw new Error("Backend не вернул subscription_id для оплаты.");
        }
        setPaymentTarget({
          ...tariff,
          subscriptionId: res.data.subscription_id,
        });
        return;
      }
      if (res.data?.status !== "active") {
        throw new Error("Backend не подтвердил активацию бесплатного тарифа.");
      }
      const profileResponse = await api.get('/api/auth/profile/');
      cacheProfile(profileResponse.data);
      setDone({ tariff, message: res.data.detail });
    } catch (e) {
      setError(getApiErrorMessage(e, "Tarifni faollashtirib bo'lmadi."));
    } finally {
      setSubmitting(null);
    }
  };

  const formatPrice = (tariff) => {
    if (tariff.is_free) return cms.tariffs_free || 'Bepul';
    return new Intl.NumberFormat('ru-RU').format(tariff.price);
  };

  return (
    <section className="tariff-section" id="tariffs">
      <div className="tariff-head">
        <h2>{cms.tariffs_title || "O'zingizga mos tarifni tanlang"}</h2>
        <p>{cms.tariffs_subtitle || "Bepul boshlang va biznes o'sishi bilan tarifni o'zgartiring."}</p>
      </div>

      {done ? (
        <div className="tariff-success">
          <div className="tariff-success-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h3>{(lang === 'ru' ? done.tariff.name_ru : lang === 'en' ? done.tariff.name_en : done.tariff.name) || done.tariff.name} tanlandi!</h3>
          <p>{done.message}</p>
          <button className="tariff-cta tariff-cta--accent" onClick={() => setDone(null)}>
            Yaxshi
          </button>
        </div>
      ) : (
        <div className="tariff-grid">
          {loadError ? (
            <div style={{ gridColumn: "1 / -1", color: "#dc2626", fontWeight: 800, fontSize: 13 }}>
              {loadError}
            </div>
          ) : null}
          {tariffs.map(tariff => {
            const isPremium = tariff.slug === 'premium';
            const name = (lang === 'ru' ? tariff.name_ru : lang === 'en' ? tariff.name_en : tariff.name) || tariff.name;
            const features = (lang === 'ru' ? tariff.features_ru : lang === 'en' ? tariff.features_en : tariff.features) || tariff.features || [];
            return (
              <div key={tariff.id} data-testid={`tariff-card-${tariff.slug || tariff.id}`} className={`tariff-card${isPremium ? ' tariff-card--premium' : ''}`}>
                {isPremium && <div className="tariff-badge-top">{cms.tariffs_best || "Eng yaxshi tanlov"}</div>}

                <div className="tariff-card-top">
                  <div className="tariff-slug">{tariff.slug}</div>
                  <div className="tariff-name">{name}</div>
                  <div className="tariff-price">
                    <strong>{formatPrice(tariff)}</strong>
                    {!tariff.is_free && <span>{cms.tariffs_per_month || "so'm / oy"}</span>}
                  </div>
                  <div className="tariff-meta">
                    {tariff.max_places} ta joy &bull; {tariff.is_free ? (cms.tariffs_unlimited || 'Muddatsiz') : `${tariff.duration_days} kun`}
                  </div>
                </div>

                <div className="tariff-features">
                  {features.map((f, i) => (
                    <div key={i} className="tariff-feature">
                      <div className="tariff-feature-check">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </div>
                      {f}
                    </div>
                  ))}
                </div>

                <div className="tariff-card-foot">
                  <button
                    data-testid={`tariff-select-${tariff.slug || tariff.id}`}
                    className={`tariff-cta${isPremium ? ' tariff-cta--accent' : ''}`}
                    onClick={() => handleSelect(tariff)}
                    disabled={submitting === tariff.id}
                  >
                    {submitting === tariff.id
                      ? 'Загрузка...'
                      : tariff.is_free
                        ? 'Bepul boshlash'
                        : 'Tanlash'}
                  </button>
                </div>
              </div>
            );
          })}
          {!loadError && tariffs.length === 0 ? (
            <div style={{ gridColumn: "1 / -1", color: "#64748b", fontWeight: 700 }}>
              Tariflar hozircha mavjud emas.
            </div>
          ) : null}
          {usingFallback ? (
            <div style={{ gridColumn: "1 / -1", color: "#dc2626", fontWeight: 800, fontSize: 12 }}>
              DEV fallback
            </div>
          ) : null}
        </div>
      )}

      <p className="tariff-footnote">
        Barcha tariflar uchun moderatsiya jarayoni bir xil &bull; Istalgan vaqtda tarif o'zgartirish mumkin
      </p>

      {error && (
        <div className="tariff-error-overlay" onClick={() => setError(null)}>
          <div className="tariff-error-box" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>⚠️</div>
            <h3>Xatolik yuz berdi</h3>
            <p>{error}</p>
            <button className="tariff-error-btn" onClick={() => setError(null)}>Yopish</button>
          </div>
        </div>
      )}

      {paymentTarget && (
        <PaymentModal
          isOpen={!!paymentTarget}
          onClose={() => setPaymentTarget(null)}
          amount={`${formatPrice(paymentTarget)} UZS`}
          title="Tarif uchun test to'lovi"
          productDetails={{
            subscriptionId: paymentTarget.subscriptionId,
            name: paymentTarget.name_ru || paymentTarget.name,
            limit: paymentTarget.max_places,
          }}
          onSuccess={async () => {
            const profileResponse = await api.get('/api/auth/profile/');
            cacheProfile(profileResponse.data);
            setDone({
              tariff: paymentTarget,
              message: "Test to'lovi tasdiqlandi va tarif faollashtirildi.",
            });
          }}
        />
      )}
    </section>
  );
}


export { AboutUsPage, PartnerGuidePage };
