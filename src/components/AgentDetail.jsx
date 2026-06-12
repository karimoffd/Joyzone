import React, { useMemo, useState } from "react";

import { Header as JoyNavbar } from "./HomeHero.jsx";
import { JoyFooter, PropertyCard } from "./ListingsSection.jsx";
import { partnerAgents, propertyCards } from "../data/content.js";
import "./AgentDetail.css";

const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const routeToSlug = (hash) => hash.replace(/^agent-/, "");

const agentPhotos = [
  "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=86",
  "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=900&q=86",
  "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=900&q=86",
  "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=900&q=86",
  "https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&w=900&q=86",
  "https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=900&q=86",
  "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=900&q=86",
  "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=900&q=86"
];

const profileExtras = [
  {
    year: "2010",
    languages: ["Uzbek", "Russian", "English"],
    joined: "2 yil 7 oy",
    response: "12 daqiqa",
    verified: "Tasdiqlangan korporativ agent",
    role: "Korporativ ofislar kuratori"
  },
  {
    year: "2019",
    languages: ["Uzbek", "Russian", "English"],
    joined: "1 yil 11 oy",
    response: "18 daqiqa",
    verified: "Startup hub partneri",
    role: "Kovorking va meeting room menejeri"
  },
  {
    year: "2017",
    languages: ["Uzbek", "Russian"],
    joined: "1 yil 5 oy",
    response: "24 daqiqa",
    verified: "Kreativ maydonlar operatori",
    role: "Jamoaviy ish joylari bo'yicha agent"
  },
  {
    year: "2011",
    languages: ["Uzbek", "Russian", "English"],
    joined: "1 yil 2 oy",
    response: "31 daqiqa",
    verified: "Showroom va trening zallari",
    role: "Tadbir va prezentatsiya zonalari agenti"
  },
  {
    year: "2020",
    languages: ["Uzbek", "Russian", "English"],
    joined: "9 oy",
    response: "16 daqiqa",
    verified: "Premium loyiha xonalari",
    role: "Ofis bloklari koordinatori"
  },
  {
    year: "2021",
    languages: ["Uzbek", "Russian", "English"],
    joined: "8 oy",
    response: "14 daqiqa",
    verified: "Bank meeting room partneri",
    role: "Premium muzokara xonalari agenti"
  },
  {
    year: "2006",
    languages: ["Uzbek", "Russian"],
    joined: "1 yil",
    response: "27 daqiqa",
    verified: "Event space operatori",
    role: "Brend zonalar va tadbirlar agenti"
  },
  {
    year: "2018",
    languages: ["Uzbek", "Russian", "English"],
    joined: "1 yil 8 oy",
    response: "20 daqiqa",
    verified: "Seminar maydonlari partneri",
    role: "Konferensiya zallari kuratori"
  }
];

const reviewBank = [
  {
    name: "Dilshod Karimov",
    date: "May 2026",
    text: "Agent juda tez javob berdi. Ofisni ko'rish, shartlar va kirish qoidalari birinchi xabardayoq aniq bo'ldi.",
    rating: "5.0"
  },
  {
    name: "Madina Saidova",
    date: "April 2026",
    text: "Meeting room toza, yorug' va texnika tayyor edi. Bron jarayoni ortiqcha savollarsiz o'tdi.",
    rating: "4.9"
  },
  {
    name: "Azizbek Nurmatov",
    date: "April 2026",
    text: "Jamoamiz uchun kovorking joyini bir kunda topdik. Agent narx va vaqt bo'yicha mos variant taklif qildi.",
    rating: "5.0"
  },
  {
    name: "Sevara Tursunova",
    date: "March 2026",
    text: "Hudud, parking va kirish masalalarini oldindan tushuntirib berdi. Rasmlardagi holat real joyga mos keldi.",
    rating: "4.8"
  },
  {
    name: "Temur Olimov",
    date: "February 2026",
    text: "Bir nechta zalni solishtirib berdi, vaqtimizni tejadi. Keyingi seminar uchun ham shu agent bilan ishlaymiz.",
    rating: "4.9"
  },
  {
    name: "Lola Akramova",
    date: "January 2026",
    text: "Korporativ mijozlar bilan ishlash madaniyati yaxshi. Hujjatlar va to'lov bo'yicha hammasi tartibli.",
    rating: "5.0"
  }
];

function findAgentByRoute(route) {
  const targetSlug = routeToSlug(route);
  const index = partnerAgents.findIndex((agent) => slugify(agent.name) === targetSlug);
  return {
    agent: partnerAgents[index] || partnerAgents[0],
    index: index >= 0 ? index : 0
  };
}

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
  const { agent, index } = useMemo(() => findAgentByRoute(route), [route]);
  const extra = profileExtras[index % profileExtras.length];
  const image = agentPhotos[index % agentPhotos.length];
  const agentSpaces = useMemo(() => {
    const selected = propertyCards.filter((_, cardIndex) => (cardIndex + index) % 2 === 0);
    return (selected.length >= 3 ? selected : propertyCards).slice(0, 4);
  }, [index]);
  const reviews = useMemo(
    () => reviewBank.map((review, reviewIndex) => ({ ...review, rating: reviewIndex % 2 === index % 2 ? agent.rating : review.rating })),
    [agent.rating, index]
  );

  const profileStats = [
    { icon: "calendar", label: "Год основания", value: extra.year },
    { icon: "city", label: "Город", value: agent.city },
    { icon: "language", label: "Языки", value: extra.languages.join(", ") },
    { icon: "clock", label: "У нас", value: extra.joined }
  ];

  return (
    <main className="agent-detail-shell">
      <JoyNavbar userState={userState} setUserState={setUserState} activeIndex={0} />

      <section className="agent-detail-hero">
        <div className="agent-hero-card">
          <div className="agent-hero-photo">
            <img src={image} alt={agent.name} />
            <span>{extra.verified}</span>
          </div>
          <div className="agent-hero-copy">
            <p className="agent-kicker">Joyzone agent</p>
            <h1>{agent.name}</h1>
            <p>{agent.service}</p>
            <div className="agent-hero-actions">
              <a href="#login">Bog'lanish</a>
              <a href="#filter">Bo'sh joylarni ko'rish</a>
            </div>
          </div>
        </div>

        <aside className="agent-trust-card">
          <div className="agent-avatar-mark" style={{ "--agent-tone": agent.tone }}>
            {agent.name.slice(0, 2)}
          </div>
          <h2>{extra.role}</h2>
          <div className="agent-rating-row">
            <strong><AgentIcon type="star" /> {agent.rating}</strong>
            <span>{agent.reviews} ta sharh</span>
          </div>
          <div className="agent-quick-facts">
            <span><AgentIcon type="shield" /> Hujjatlari tekshirilgan</span>
            <span><AgentIcon type="clock" /> O'rtacha javob: {extra.response}</span>
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

        <AgentReviews reviews={reviews} />

        <section className="agent-detail-section">
          <div className="agent-section-head">
            <div>
              <span>E'lonlar</span>
              <h2>Bu agent joylari</h2>
            </div>
            <a className="agent-section-link" href="#filter">Barchasini ko'rish</a>
          </div>
          <div className="agent-listings-grid">
            {agentSpaces.map((item, cardIndex) => (
              <PropertyCard key={`${agent.name}-${item.title}`} item={item} index={cardIndex} />
            ))}
          </div>
        </section>

        <section className="agent-detail-section agent-extra-section">
          <div className="agent-extra-card">
            <span>Premium support</span>
            <h2>Joy tanlashda agent yordam beradi</h2>
            <p>Maydon ko'rigi, bron va hujjat masalalarini bitta joyda kelishtiring. Joyzone profili orqali barcha muloqot tarixini saqlab borasiz.</p>
          </div>
          <div className="agent-safety-actions">
            <button type="button">
              <AgentIcon type="report" />
              Пожаловаться на агента
            </button>
            <button type="button">
              <AgentIcon type="share" />
              Поделиться профилем
            </button>
          </div>
        </section>
      </div>

      <JoyFooter />
    </main>
  );
}

export default AgentDetail;
