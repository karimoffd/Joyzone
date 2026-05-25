import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { CategoryIcon, HeartIcon } from "./ui/Shared.jsx";
import { propertyCards } from "../data/content.js";
import "./ListingsSection.css";

function getSpaceHref(title) {
  return `#space-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

function PropertyCard({ item, index }) {
  const [activeImage, setActiveImage] = useState(0);
  const [liked, setLiked] = useState(false);
  const mediaRef = useRef(null);
  const likeRef = useRef(null);
  const manualSlideAt = useRef(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (Date.now() - manualSlideAt.current < 5200) return;
      setActiveImage((current) => (current + 1) % item.images.length);
    }, 5600 + index * 260);
    return () => window.clearInterval(timer);
  }, [index, item.images.length]);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return undefined;
    const glow = media.querySelector(".property-slide-glow");
    gsap.fromTo(glow, { xPercent: -95, opacity: 0.34 }, { xPercent: 105, opacity: 0, duration: 1.35, ease: "sine.out" });
    return undefined;
  }, [activeImage]);

  const toggleLike = () => {
    setLiked((value) => !value);
    gsap.fromTo(likeRef.current, { scale: 0.82 }, { scale: 1, duration: 0.46, ease: "elastic.out(1, 0.46)" });
  };

  const href = getSpaceHref(item.title);

  return (
    <article className="property-card" style={{ "--delay": `${index * 0.055}s` }}>
      <a className="property-card-link" href={href} aria-label={`${item.title} sahifasini ochish`} />
      <div ref={mediaRef} className="property-media">
        {item.images.map((image, imageIndex) => (
          <img
            key={image}
            src={image}
            alt={item.title}
            loading={imageIndex === 0 ? "eager" : "lazy"}
            className={`property-slide ${imageIndex === activeImage ? "is-active" : ""}`}
          />
        ))}
        <span className="property-slide-glow" />
        {item.promoted ? <span className="property-badge">Reklama</span> : null}
        <button
          ref={likeRef}
          type="button"
          className={`like-button ${liked ? "is-liked" : ""}`}
          onClick={toggleLike}
          aria-label={liked ? "Yoqtirildi" : "Yoqtirish"}
          aria-pressed={liked}
        >
          <HeartIcon filled={liked} />
        </button>
        <div className="property-slide-dots" aria-label="Rasmni tanlash">
          {item.images.map((_, imageIndex) => (
            <button
              key={`${imageIndex}-dot`}
              type="button"
              className={imageIndex === activeImage ? "is-active" : ""}
              aria-label={`${imageIndex + 1}-rasm`}
              aria-pressed={imageIndex === activeImage}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                manualSlideAt.current = Date.now();
                setActiveImage(imageIndex);
              }}
            />
          ))}
        </div>
        <div className="property-hover">
          <span className="spec-chip spec-chip-main">
            <CategoryIcon category={item.category} />
            {item.category}
          </span>
          <span className="spec-chip">{item.people} kishi</span>
          <span className="spec-chip">{item.area} m2</span>
        </div>
      </div>
      <div className="property-body">
        <div className="property-topline">
          <span>{item.category}</span>
        </div>
        <h3>{item.title}</h3>
        <p>{item.location}</p>
        <div className="property-bottom">
          <strong>{item.price}</strong>
        </div>
      </div>
    </article>
  );
}

function CatalogTrail() {
  const liftCards = () => {
    gsap.to(".property-card", {
      y: (index) => (index % 2 === 0 ? -10 : -6),
      scale: (index) => (index % 3 === 0 ? 1.018 : 1.01),
      duration: 0.52,
      stagger: { each: 0.025, from: "center" },
      ease: "power3.out"
    });
  };

  const settleCards = () => {
    gsap.to(".property-card", {
      y: 0,
      scale: 1,
      duration: 0.58,
      stagger: { each: 0.018, from: "center" },
      ease: "power3.out"
    });
  };

  return (
    <a className="catalog-trail" href="#spaces" onMouseEnter={liftCards} onFocus={liftCards} onMouseLeave={settleCards} onBlur={settleCards}>
      <span />
      <strong>Barcha joylarni ko'rish</strong>
      <b aria-hidden="true">→</b>
    </a>
  );
}

export default function ListingsSection() {
  return (
    <section className="listings-section">
      <div className="listings-inner">
        <div className="listings-head">
          <p>Joyzone tanlovi</p>
          <h2>
            <span>Har qanday</span> jamoa uchun joylar
          </h2>
          <p>Kovorking, ofis va uchrashuv xonalarini real ehtiyojga qarab tanlang.</p>
        </div>
        <div className="property-grid">
          {propertyCards.map((item, index) => (
            <PropertyCard key={item.title} item={item} index={index} />
          ))}
        </div>
        <div className="more-row">
          <CatalogTrail />
        </div>
      </div>
    </section>
  );
}
