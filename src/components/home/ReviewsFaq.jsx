import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/client.js";
import { getPlacesFromApiResponse } from "../../utils/placeMapper.js";
import { cmsList, phoneHref } from "../../utils/cmsLinks.js";
import { VideoModal } from "./VideoModal.jsx";
import "./reviewsFaq.css";

// Demo quotes are shown only in local development when there are no reviews.
const DEV_REVIEWS = [
  { id: "d1", name: "Malika", text: "Vorkshop uchun zalni 7 daqiqada topdik. Joy, narx va sig'im bir qarashda tushunarli.", rating: 5, place: "Sharq konferens-zali" },
  { id: "d2", name: "Akmal", text: "Kartochkalar aniq: darhol narx, joylashuv va imkoniyatlarni ko'rasan.", rating: 5, place: "Bunyod Coworking" },
  { id: "d3", name: "Dilshod", text: "Partner sifatida joy qo'shdik va birinchi so'rovlar o'sha kuniyoq keldi.", rating: 4, place: "Kamalak mini-ofis" },
  { id: "d4", name: "Sevara", text: "Bron oqimi oddiy, mijozlarga ortiqcha tushuntirish kerak bo'lmadi.", rating: 5, place: "Oqtepa meeting" },
];

function Stars({ value = 5 }) {
  return (
    <span className="rfq-stars" aria-label={`${value} / 5`}>
      {Array.from({ length: 5 }, (_, index) => (
        <svg key={index} width="14" height="14" viewBox="0 0 24 24" className={index < value ? "is-on" : ""} aria-hidden="true">
          <path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-2.9-5.4 2.9 1.1-6L3.2 9.6l6.1-.8z" fill="currentColor" />
        </svg>
      ))}
    </span>
  );
}

function initials(name) {
  return String(name || "?").trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function ReviewCard({ review }) {
  return (
    <article className="rfq-review">
      <svg className="rfq-quote" width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M10 7H6a3 3 0 0 0-3 3v4h5v-4H5.5A1.5 1.5 0 0 1 7 8.5h3zm11 0h-4a3 3 0 0 0-3 3v4h5v-4h-2.5A1.5 1.5 0 0 1 18 8.5h3z" /></svg>
      <p>{review.text}</p>
      <footer>
        <span className="rfq-avatar">{initials(review.name)}</span>
        <span className="rfq-who">
          <b>{review.name}</b>
          {review.place ? (
            review.placeId ? <a href={`/space-${review.placeId}`}>{review.place}</a> : <span>{review.place}</span>
          ) : null}
        </span>
        <Stars value={review.rating} />
      </footer>
    </article>
  );
}

function useTopReviews() {
  const [reviews, setReviews] = useState(() => (import.meta.env.DEV ? DEV_REVIEWS : []));
  useEffect(() => {
    let cancelled = false;
    api.get("/api/reviews/", { params: { min_rating: 4, limit: 12 }, skipAuth: true })
      .then((res) => {
        if (cancelled) return;
        const rows = getPlacesFromApiResponse(res.data).filter((review) => String(review.comment || "").trim());
        if (rows.length || !import.meta.env.DEV) {
          setReviews(rows.map((review) => ({
            id: review.id,
            name: review.user_name,
            text: review.comment,
            rating: review.rating,
            place: review.place_title,
            placeId: review.place,
          })));
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  return reviews;
}

// Two rows drifting in opposite directions; each row is doubled so the loop is seamless.
function ReviewsMarquee({ reviews }) {
  const rows = useMemo(() => {
    if (reviews.length < 4) return [reviews];
    const half = Math.ceil(reviews.length / 2);
    return [reviews.slice(0, half), reviews.slice(half)];
  }, [reviews]);
  const animate = reviews.length >= 3;

  return (
    <div className={`rfq-marquee ${animate ? "is-moving" : ""}`}>
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className={`rfq-row ${rowIndex % 2 ? "is-reverse" : ""}`} style={{ "--rfq-speed": `${Math.max(28, row.length * 9)}s` }}>
          <div className="rfq-track">
            {(animate ? [...row, ...row] : row).map((review, index) => (
              <div key={`${review.id}-${index}`} className="rfq-slot" aria-hidden={index >= row.length ? "true" : undefined}>
                <ReviewCard review={review} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Topics: a chip filter plus the icon shown next to each question.
const FAQ_TOPICS = [
  { id: "booking", label: "Bron", match: /bron|брон|book/i, icon: ["M4 6h16v14H4z", "M4 10h16", "M8 3v4M16 3v4"] },
  { id: "partner", label: "Hamkorlik", match: /partner|hamkor|партн|obyekt|объект|listing/i, icon: ["M5 21V8l7-4 7 4v13", "M9 21v-5h6v5"] },
  { id: "price", label: "Tarif va narx", match: /tarif|тариф|plan|narx|цен|price|to'lov|оплат|pay/i, icon: ["M4 8l4 4 4-7 4 7 4-4v10H4z"] },
  { id: "map", label: "Manzil", match: /xarita|карт|map|manzil|адрес|location/i, icon: ["M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z", "M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"] },
];
const QUESTION_ICON = ["M9.5 9.2a2.6 2.6 0 1 1 3.6 2.4c-.7.3-1.1.9-1.1 1.6v.3", "M12 17h.01", "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"];

function topicOf(item) {
  const text = `${item.question} ${item.answer}`;
  return FAQ_TOPICS.find((topic) => topic.match.test(text));
}

function LineIcon({ paths, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths.map((path) => <path key={path} d={path} />)}
    </svg>
  );
}

const QUICK_LINKS = [
  { key: "faq_link_catalog", label: "Joylar katalogi", href: "/filter" },
  { key: "faq_link_add", label: "Joy qo'shish", href: "/partner" },
  { key: "faq_link_guide", label: "Hamkorlar qo'llanmasi", href: "/partner-guide" },
  { key: "faq_link_profile", label: "Mening bronlarim", href: "/profile" },
];

export function ReviewsFaqSection({ cms = {} }) {
  const reviews = useTopReviews();
  const faqs = cmsList(cms, "faq_arr");
  const [openIndex, setOpenIndex] = useState(0);
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("");
  const [video, setVideo] = useState(null);

  const topicLabel = (item) => cms[`faq_topic_${item.id}`] || item.label;

  // Only topics that actually have questions get a chip.
  const topics = useMemo(
    () => FAQ_TOPICS.filter((item) => faqs.some((faq) => topicOf(faq)?.id === item.id)),
    [faqs]
  );

  const visibleFaqs = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return faqs
      .map((item, index) => ({ ...item, index, topic: topicOf(item) }))
      .filter((item) => !topic || item.topic?.id === topic)
      .filter((item) => !needle || `${item.question} ${item.answer}`.toLowerCase().includes(needle));
  }, [faqs, query, topic]);

  const telegram = cms.social_telegram;
  const phone = cms.support_phone;
  const filtering = Boolean(query.trim() || topic);

  return (
    <section className="rfq" id="faq">
      {reviews.length ? (
        <div className="rfq-reviews">
          <div className="rfq-head">
            <span className="rfq-kicker">{cms.rev_title || "Sharhlar"}</span>
            <h2>{cms.rev_heading || "Mijozlarimiz fikri"}</h2>
            <p>{cms.rev_sub || "Joyzone orqali joy band qilganlarning haqiqiy sharhlari."}</p>
          </div>
          <ReviewsMarquee reviews={reviews} />
        </div>
      ) : null}

      <div className="rfq-faq">
        <header className="rfq-faq-head">
          <span className="rfq-kicker">{cms.faq_kicker || "FAQ"}</span>
          <h2>{cms.faq_title || "Ko'p beriladigan savollar"}</h2>
          <p>{cms.faq_sub || "Bron, hamkorlik va platforma haqida asosiy javoblar bir joyda."}</p>
          <label className="rfq-search">
            <LineIcon paths={["M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z", "m20 20-3.5-3.5"]} />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={cms.faq_search || "Savolni qidiring..."}
              aria-label={cms.faq_search || "Savolni qidiring"}
            />
            {query ? (
              <button type="button" className="rfq-search-clear" onClick={() => setQuery("")} aria-label="Tozalash">
                <LineIcon paths={["M6 6l12 12", "M18 6 6 18"]} size={16} />
              </button>
            ) : null}
          </label>
          {topics.length > 1 ? (
            <div className="rfq-topics" role="group" aria-label="Mavzular">
              <button type="button" className={!topic ? "is-active" : ""} onClick={() => setTopic("")}>
                {cms.faq_topic_all || "Hammasi"}
              </button>
              {topics.map((item) => (
                <button key={item.id} type="button" className={topic === item.id ? "is-active" : ""} onClick={() => setTopic(topic === item.id ? "" : item.id)}>
                  <LineIcon paths={item.icon} size={15} />
                  {topicLabel(item)}
                </button>
              ))}
            </div>
          ) : null}
        </header>

        <div className="rfq-faq-body">
          <div className="rfq-list">
            {visibleFaqs.length ? visibleFaqs.map((item, position) => {
              const isOpen = openIndex === item.index || (filtering && visibleFaqs.length === 1);
              return (
                <article key={item.question} className={`rfq-item ${isOpen ? "is-open" : ""}`}>
                  <button type="button" onClick={() => setOpenIndex(isOpen ? -1 : item.index)} aria-expanded={Boolean(isOpen)}>
                    <span className="rfq-icon"><LineIcon paths={item.topic?.icon || QUESTION_ICON} /></span>
                    <span className="rfq-q">
                      <small>{item.topic ? topicLabel(item.topic) : String(position + 1).padStart(2, "0")}</small>
                      {item.question}
                    </span>
                    <span className="rfq-plus" aria-hidden="true" />
                  </button>
                  <div className="rfq-answer">
                    <div>
                      <p>{item.answer}</p>
                      {item.video ? (
                        <button type="button" className="rfq-video" onClick={() => setVideo({ url: item.video, title: item.question })}>
                          <span><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z" /></svg></span>
                          {cms.faq_video_label || "Videoda ko'rish"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            }) : (
              <div className="rfq-empty">
                <p>{cms.faq_empty || "Bunday savol topilmadi. Bizga yozing — javob beramiz."}</p>
                <button type="button" onClick={() => { setQuery(""); setTopic(""); }}>{cms.faq_reset || "Barcha savollar"}</button>
              </div>
            )}
          </div>

          <aside className="rfq-side">
            <div className="rfq-help">
              <span className="rfq-help-icon" aria-hidden="true">
                <LineIcon paths={["M21 12a8 8 0 0 1-8 8H7l-4 2 1.3-4.4A8 8 0 1 1 21 12Z", "M8 11h8M8 14h5"]} size={22} />
              </span>
              <b>{cms.faq_help_title || "Javob topmadingizmi?"}</b>
              <p>{cms.faq_help_text || "Qo'llab-quvvatlash jamoamiz savolingizga tez javob beradi."}</p>
              <div className="rfq-help-actions">
                {telegram ? <a href={telegram} target="_blank" rel="noreferrer">Telegram</a> : null}
                {phone ? <a href={phoneHref(phone)} className="is-ghost">{phone}</a> : null}
              </div>
            </div>
            <nav className="rfq-links" aria-label={cms.faq_links_title || "Tezkor havolalar"}>
              <b>{cms.faq_links_title || "Tezkor havolalar"}</b>
              {QUICK_LINKS.map((link) => (
                <a key={link.key} href={link.href}>
                  {cms[link.key] || link.label}
                  <LineIcon paths={["M5 12h14", "m13 6 6 6-6 6"]} size={16} />
                </a>
              ))}
            </nav>
          </aside>
        </div>
      </div>
      {video ? <VideoModal url={video.url} title={video.title} onClose={() => setVideo(null)} /> : null}
    </section>
  );
}
