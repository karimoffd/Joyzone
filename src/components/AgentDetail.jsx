import React, { useEffect, useMemo, useState } from "react";

import { Header as JoyNavbar } from "./HomeHero.jsx";
import { JoyFooter, PropertyCard } from "./ListingsSection.jsx";
import { partnerAgents } from "../data/content.js";
import api, { getApiErrorMessage } from "../api/client.js";
import { normalizePlace } from "../utils/placeMapper.js";
import { useSiteContent } from "../context/LanguageContext.jsx";
import { mailHref } from "../utils/cmsLinks.js";
import { setPageMeta } from "../utils/seo.js";

const PHOTO_PLACEHOLDER = "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=86";

function formatReviewDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("ru-RU");
}

// Route is agent-<partner id>. Old demo slugs (agent-it-park) only resolve in dev.
function demoPartner(route) {
  const slug = route.replace(/^agent-/, "");
  const index = Math.max(0, partnerAgents.findIndex((agent) => agent.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") === slug));
  const agent = partnerAgents[index];
  return { id: slug, name: agent.name, bio: agent.service, city: agent.city, places_count: agent.spaces, rating_avg: agent.rating, reviews_count: agent.reviews, places: [], reviews: [] };
}
import "./AgentDetail.css";

function AgentIcon({ type }) {
  const paths = {
    city: ["M4 21V7l8-4 8 4v14", "M8 21v-6h8v6", "M8 10h.01M12 10h.01M16 10h.01"],
    calendar: ["M7 3v4M17 3v4", "M4 8h16v13H4z", "M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01"],
    language: ["M4 5h9M9 3v2c0 4-2 7-5 9", "M5 9c1 3 3 5 7 6", "M13 21l4-9 4 9M15 17h4"],
    star: ["M12 3l2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1-4.4-4.3 6.1-.9z"],
    review: ["M4 5h16v11H8l-4 4z", "M8 9h8M8 12h5"],
    clock: ["M12 7v5l3 2", "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0"],
    shield: ["M12 3l8 3v6c0 5-3.4 8.1-8 9-4.6-.9-8-4-8-9V6z", "m9 12 2 2 4-5"],
    flag: ["M5 21V4", "M5 5h13l-2 4 2 4H5"],
    arrow: ["M5 12h14", "m13 6 6 6-6 6"],
    report: ["M12 9v4", "M12 17h.01", "M10.3 4.3 2.9-1.7 8 13.9A2 2 0 0 1 19.5 19h-15a2 2 0 0 1-1.7-3z"],
    share: ["M18 8a3 3 0 1 0-2.8-4", "M6 14a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z", "M18 16a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z", "m8.6 15.5 6.8-3.9M8.6 8.5l6.8 3.9"]
  };

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {(paths[type] || paths.star).map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}

function AgentReviews({ reviews }) {
  const [page, setPage] = useState(0);
  const [motion, setMotion] = useState("next");
  const [showAll, setShowAll] = useState(false);
  const maxPage = Math.max(0, reviews.length - 3);
  const visibleReviews = showAll ? reviews : reviews.slice(page, page + 3);
  const moveReviews = (direction) => {
    setMotion(direction > 0 ? "next" : "prev");
    setPage((value) => {
      if (direction < 0) return value <= 0 ? maxPage : value - 1;
      return value >= maxPage ? 0 : value + 1;
    });
  };

  return (
    <section className="agent-detail-section agent-review-section">
      <div className="agent-section-head">
        <div>
          <span>Sharhlar</span>
          <h2>Rezidentlar fikri</h2>
        </div>
        <div className="agent-review-controls">
          <button type="button" onClick={() => moveReviews(-1)} aria-label="Oldingi sharhlar">
            <AgentIcon type="arrow" />
          </button>
          <button type="button" onClick={() => moveReviews(1)} aria-label="Keyingi sharhlar">
            <AgentIcon type="arrow" />
          </button>
        </div>
      </div>

      <div className="agent-review-window">
        <div
          key={showAll ? "all-reviews" : `${page}-${motion}`}
          className={`agent-review-grid ${showAll ? "is-expanded" : `is-moving-${motion}`}`}
        >
          {visibleReviews.map((review) => (
            <article key={`${review.name}-${review.date}`} className="agent-review-card">
              <div>
                <strong>{review.name}</strong>
                <span>{review.date}</span>
              </div>
              <p>{review.text}</p>
              <b><AgentIcon type="star" /> {review.rating}</b>
            </article>
          ))}
        </div>
      </div>

      <button type="button" className="agent-show-all-btn" onClick={() => setShowAll((value) => !value)}>
        {showAll ? "Yopish" : "Посмотреть все отзывы"}
      </button>
    </section>
  );
}

function AgentDetail({ route, userState, setUserState }) {
  const { cms } = useSiteContent();
  const partnerId = route.replace(/^agent-/, "");
  const [partner, setPartner] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setPartner(null);
    setError("");
    if (!/^\d+$/.test(partnerId)) {
      if (import.meta.env.DEV) setPartner(demoPartner(route));
      else setError("Hamkor topilmadi.");
      return undefined;
    }
    api.get(`/api/partners/${partnerId}/`, { skipAuth: true })
      .then((res) => { if (!cancelled) setPartner(res.data); })
      .catch((err) => { if (!cancelled) setError(getApiErrorMessage(err, "Hamkor topilmadi.")); });
    return () => { cancelled = true; };
  }, [partnerId, route]);

  const agent = useMemo(() => ({
    name: partner?.name || "",
    service: partner?.bio || "",
    city: partner?.city || "",
    rating: partner?.rating_avg || 0,
    reviews: partner?.reviews_count || 0,
    spaces: partner?.places_count || 0,
    tone: "#294a6d",
  }), [partner]);
  const image = partner?.avatar || partner?.cover_image || PHOTO_PLACEHOLDER;
  const agentSpaces = useMemo(() => (partner?.places || []).map(normalizePlace), [partner]);
  const reviews = useMemo(() => (partner?.reviews || []).map((review) => ({
    name: review.user_name,
    date: formatReviewDate(review.created_at),
    text: review.comment,
    rating: review.rating,
  })), [partner]);
  const firstPlaceHref = agentSpaces[0]?.href || "/filter";

  useEffect(() => {
    if (partner?.name) setPageMeta({ title: `${partner.name} — Joyzone hamkori`, description: partner.bio, image });
  }, [partner, image]);

  const profileStats = [
    { icon: "city", label: "Shahar", value: agent.city || "—" },
    { icon: "flag", label: "Faol e'lonlar", value: agent.spaces },
    { icon: "star", label: "Reyting", value: agent.rating || "—" },
    { icon: "review", label: "Sharhlar", value: agent.reviews },
  ];

  const shareProfile = () => {
    if (navigator.share) navigator.share({ title: agent.name, url: window.location.href }).catch(() => {});
    else navigator.clipboard?.writeText(window.location.href);
  };

  if (error || !partner) {
    return (
      <main className="agent-detail-shell">
        <JoyNavbar userState={userState} setUserState={setUserState} activeIndex={0} />
        <section className="agent-detail-hero">
          <p style={{ color: error ? "#dc2626" : "#64748b", fontWeight: 700 }}>{error || "Yuklanmoqda..."}</p>
        </section>
        <JoyFooter cms={cms} />
      </main>
    );
  }

  return (
    <main className="agent-detail-shell">
      <JoyNavbar userState={userState} setUserState={setUserState} activeIndex={0} />

      <section className="agent-detail-hero">
        <div className="agent-hero-card">
          <div className="agent-hero-photo">
            <img src={image} alt={agent.name} />
          </div>
          <div className="agent-hero-copy">
            <p className="agent-kicker">Joyzone hamkori</p>
            <h1>{agent.name}</h1>
            <p>{agent.service}</p>
            <div className="agent-hero-actions">
              <a href={firstPlaceHref}>Bog'lanish</a>
              <a href="/filter">Bo'sh joylarni ko'rish</a>
            </div>
          </div>
        </div>

        <aside className="agent-trust-card">
          <div className="agent-avatar-mark" style={{ "--agent-tone": agent.tone }}>
            {agent.name.slice(0, 2)}
          </div>
          <h2>{agent.name}</h2>
          <div className="agent-rating-row">
            <strong><AgentIcon type="star" /> {agent.rating}</strong>
            <span>{agent.reviews} ta sharh</span>
          </div>
          <div className="agent-quick-facts">
            <span><AgentIcon type="shield" /> Joylari moderatsiyadan o'tgan</span>
            <span><AgentIcon type="flag" /> {agent.spaces} ta faol e'lon</span>
          </div>
        </aside>
      </section>

      <div className="agent-detail-content">
        <section className="agent-profile-grid" aria-label="Agent ma'lumotlari">
          {profileStats.map((stat) => (
            <article key={stat.label} className="agent-info-tile">
              <span><AgentIcon type={stat.icon} /></span>
              <p>{stat.label}</p>
              <strong>{stat.value}</strong>
            </article>
          ))}
        </section>

        {reviews.length ? <AgentReviews reviews={reviews} /> : null}

        <section className="agent-detail-section">
          <div className="agent-section-head">
            <div>
              <span>E'lonlar</span>
              <h2>Bu agent joylari</h2>
            </div>

          </div>
          <div className="agent-listings-grid">
            {agentSpaces.length > 0 ? (
              agentSpaces.map((item, cardIndex) => (
                <PropertyCard key={`${agent.name}-${item.id || item.title}`} item={item} index={cardIndex} href={item.href} />
              ))
            ) : (
              <p style={{ color: "#64748b", fontWeight: 700 }}>Bu agent uchun hozircha joylar topilmadi.</p>
            )}
          </div>
        </section>

        <section className="agent-detail-section agent-extra-section">
          <div className="agent-extra-card">
            <span>Premium support</span>
            <h2>Joy tanlashda agent yordam beradi</h2>
            <p>Maydon ko'rigi, bron va hujjat masalalarini bitta joyda kelishtiring. Joyzone profili orqali barcha muloqot tarixini saqlab borasiz.</p>
          </div>
          <div className="agent-safety-actions">
            <a href={mailHref(cms.footer_email) ? `${mailHref(cms.footer_email)}?subject=${encodeURIComponent(`Shikoyat: ${agent.name}`)}` : undefined}>
              <AgentIcon type="report" />
              Пожаловаться на агента
            </a>
            <button type="button" onClick={shareProfile}>
              <AgentIcon type="share" />
              Поделиться профилем
            </button>
          </div>
        </section>
      </div>

      <JoyFooter cms={cms} />
    </main>
  );
}

export default AgentDetail;
