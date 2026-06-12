import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { propertyCards } from "../data/content.js";
import { NoteIcon } from "./ui/Shared.jsx";
import { PropertyCard } from "./ListingsSection.jsx";
import "./CardVariants.css";

const variants = [
  { id: "site", label: "1 вариант", title: "Current Joyzone" },
  { id: "wrapped", label: "2 вариант", title: "Wrapped Joyzone" },
  { id: "shop", label: "3 вариант", title: "Compact Booking" },
  { id: "resort", label: "4 вариант", title: "Wide Stay" },
  { id: "estate", label: "5 вариант", title: "Property Stats" },
  { id: "mini", label: "6 вариант", title: "Clean Mini" },
  { id: "spotlight", label: "7 вариант", title: "Spotlight" },
  { id: "ticket", label: "8 вариант", title: "Booking Ticket" }
];

const extraCards = [
  {
    title: "City Focus Studio",
    category: "Ofis",
    location: "Toshkent, Shayxontohur",
    price: "680 000 so'm",
    people: 10,
    area: 72,
    images: [
      "https://images.unsplash.com/photo-1604328698692-f76ea9498e76?auto=format&fit=crop&w=900&q=86",
      "https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=900&q=86",
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=86"
    ],
    promoted: false
  },
  {
    title: "Silk Road Boardroom",
    category: "Konferensiya",
    location: "Toshkent, Yakkasaroy",
    price: "430 000 so'm",
    people: 16,
    area: 96,
    images: [
      "https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=900&q=86",
      "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=900&q=86",
      "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=900&q=86"
    ],
    promoted: true
  }
];

const showcaseCards = [...propertyCards, ...extraCards];

function Icon({ type }) {
  const icons = {
    map: "M12 21s7-5.1 7-11a7 7 0 0 0-14 0c0 5.9 7 11 7 11ZM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
    star: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.9 6.4 21l1.1-6.2L3 10.4l6.2-.9L12 3Z",
    users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
    area: "M4 4h16v16H4zM8 8h8M8 12h5M8 16h8",
    bed: "M4 11V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5M4 11h16v7M4 18v2M20 18v2M8 11V8h8v3",
    bath: "M7 10V5a3 3 0 0 1 6 0v1M5 10h16v2a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5v-2ZM8 21h8",
    arrow: "M5 12h14M13 6l6 6-6 6",
    spark: "M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2ZM19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8L19 17Z",
    building: "M5 21V7l7-4 7 4v14M9 21v-6h6v6M9 9h.01M12 9h.01M15 9h.01M9 12h.01M12 12h.01M15 12h.01",
    calendar: "M7 3v4M17 3v4M4 8h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1ZM8 12h3M13 12h3M8 16h3M13 16h3",
    clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 6v6l4 2"
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={icons[type]} />
    </svg>
  );
}

function SaveButton() {
  const [saved, setSaved] = useState(false);
  const buttonRef = useRef(null);

  const toggle = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setSaved((value) => !value);
    gsap.fromTo(buttonRef.current, { scale: 0.84 }, { scale: 1, duration: 0.44, ease: "elastic.out(1, 0.48)" });
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      className={`variant-save-button ${saved ? "is-saved" : ""}`}
      onClick={toggle}
      aria-label={saved ? "Eslatmaga saqlandi" : "Eslatmaga saqlash"}
      aria-pressed={saved}
    >
      <NoteIcon filled={saved} />
    </button>
  );
}

function CardSlider({ item, index }) {
  const [active, setActive] = useState(0);
  const manualAt = useRef(0);
  const images = item.images;

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (Date.now() - manualAt.current < 4800) return;
      setActive((current) => (current + 1) % images.length);
    }, 3900 + index * 180);
    return () => window.clearInterval(timer);
  }, [images.length, index]);

  return (
    <>
      {images.map((image, imageIndex) => (
        <img
          key={`${item.title}-${imageIndex}`}
          src={image}
          alt={item.title}
          loading={imageIndex === 0 ? "eager" : "lazy"}
          className={imageIndex === active ? "is-active" : ""}
        />
      ))}
      <div className="variant-dots" aria-label="Rasmni tanlash">
        {images.map((_, imageIndex) => (
          <button
            key={`${item.title}-${imageIndex}-dot`}
            type="button"
            className={imageIndex === active ? "is-active" : ""}
            aria-label={`${imageIndex + 1}-rasm`}
            aria-pressed={imageIndex === active}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              manualAt.current = Date.now();
              setActive(imageIndex);
            }}
          />
        ))}
      </div>
    </>
  );
}

function Spec({ icon, children }) {
  return (
    <span className="variant-spec">
      <Icon type={icon} />
      {children}
    </span>
  );
}

function HoverSpecs({ item, compact = false }) {
  return (
    <div className={`variant-hover-specs ${compact ? "is-compact" : ""}`}>
      <Spec icon="users">{item.people} kishi</Spec>
      <Spec icon="area">{item.area} m2</Spec>
      <Spec icon="building">{item.category}</Spec>
    </div>
  );
}

function VariantCard({ item, index, variant }) {
  const rating = (4.6 + (index % 4) * 0.1).toFixed(1);

  if (variant.id === "shop") {
    return (
      <article className="variant-card variant-shop" style={{ "--delay": `${index * 0.045}s` }}>
        <div className="variant-media">
          <CardSlider item={item} index={index} />
          <span className="variant-pill">Top joy</span>
          <SaveButton />
          <HoverSpecs item={item} compact />
        </div>
        <div className="variant-body">
          <small>{item.category}</small>
          <h3>{item.title}</h3>
          <p>{item.location}</p>
          <div className="variant-shop-bottom">
            <strong>{item.price}</strong>
            <a href="#login">Bron <Icon type="arrow" /></a>
          </div>
        </div>
      </article>
    );
  }

  if (variant.id === "resort") {
    return (
      <article className="variant-card variant-resort" style={{ "--delay": `${index * 0.045}s` }}>
        <div className="variant-media">
          <CardSlider item={item} index={index} />
          <SaveButton />
          <HoverSpecs item={item} />
        </div>
        <div className="variant-resort-foot">
          <div>
            <h3>{item.title}</h3>
            <p><Icon type="map" /> {item.location}</p>
          </div>
          <div>
            <strong>{item.price}</strong>
            <span><Icon type="star" /> {rating}</span>
          </div>
        </div>
      </article>
    );
  }

  if (variant.id === "estate") {
    return (
      <article className="variant-card variant-estate" style={{ "--delay": `${index * 0.045}s` }}>
        <div className="variant-media">
          <CardSlider item={item} index={index} />
          <span className="variant-pill">Guest favourite</span>
          <SaveButton />
        </div>
        <div className="variant-body">
          <div className="variant-title-row">
            <h3>{item.title}</h3>
            <strong>{item.price}</strong>
          </div>
          <p>{item.location}</p>
          <div className="variant-spec-row">
            <Spec icon="users">{item.people} kishi</Spec>
            <Spec icon="bath">2</Spec>
            <Spec icon="area">{item.area} m2</Spec>
          </div>
        </div>
      </article>
    );
  }

  if (variant.id === "mini") {
    return (
      <article className="variant-card variant-mini" style={{ "--delay": `${index * 0.045}s` }}>
        <div className="variant-media">
          <CardSlider item={item} index={index} />
          <SaveButton />
          <HoverSpecs item={item} compact />
        </div>
        <div className="variant-body">
          <span className="variant-category-chip">{item.category}</span>
          <h3>{item.title}</h3>
          <p><Icon type="map" /> {item.location}</p>
          <div className="variant-price-line">
            <strong>{item.price}</strong>
            <span>{item.people} kishi</span>
          </div>
        </div>
      </article>
    );
  }

  if (variant.id === "spotlight") {
    return (
      <article className="variant-card variant-spotlight" style={{ "--delay": `${index * 0.045}s` }}>
        <div className="variant-media">
          <CardSlider item={item} index={index} />
          <SaveButton />
          <div className="variant-spotlight-copy">
            <span><Icon type="spark" /> Joyzone pick</span>
            <h3>{item.title}</h3>
            <p>{item.location}</p>
            <div>
              <strong>{item.price}</strong>
              <small><Icon type="star" /> {rating}</small>
            </div>
          </div>
          <HoverSpecs item={item} />
        </div>
      </article>
    );
  }

  return (
    <article className="variant-card variant-ticket" style={{ "--delay": `${index * 0.045}s` }}>
      <div className="variant-media">
        <CardSlider item={item} index={index} />
        <span className="variant-pill">{item.category}</span>
        <SaveButton />
        <HoverSpecs item={item} compact />
      </div>
      <div className="variant-body">
        <div className="variant-ticket-top">
          <span>JOYZONE</span>
          <strong>{rating}</strong>
        </div>
        <h3>{item.title}</h3>
        <p>{item.location}</p>
        <div className="variant-ticket-bottom">
          <strong>{item.price}</strong>
          <a href="#login">Bron</a>
        </div>
      </div>
    </article>
  );
}

function WrappedPropertyCard({ item, index }) {
  return (
    <div className="variant-card-frame" style={{ "--delay": `${index * 0.045}s` }}>
      <PropertyCard item={item} index={index} href="#card-variants" />
    </div>
  );
}

function CardVariants() {
  const [active, setActive] = useState(0);
  const activeVariant = variants[active];
  const stageRef = useRef(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.documentElement.scrollLeft = 0;
    document.body.scrollLeft = 0;
    const cards = stage.querySelectorAll(".property-card, .variant-card, .variant-card-frame");
    gsap.fromTo(
      cards,
      { y: 18, opacity: 0, scale: 0.975, filter: "blur(8px)" },
      { y: 0, opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.48, stagger: 0.035, ease: "power3.out" }
    );
    return undefined;
  }, [active]);

  return (
    <main className="card-variants-page">
      <nav className="card-variants-topbar" aria-label="Card variants">
        <a className="card-variants-back" href="#home">Home</a>
        <div className="card-variants-switcher">
          {variants.map((variant, index) => (
            <button
              key={variant.id}
              type="button"
              className={index === active ? "is-active" : ""}
              onClick={() => setActive(index)}
              aria-pressed={index === active}
              title={variant.title}
            >
              {variant.label}
            </button>
          ))}
        </div>
      </nav>

      <section ref={stageRef} className={`card-variants-stage variant-mode-${activeVariant.id}`} aria-label={activeVariant.title}>
        <div className="card-variants-row">
          {activeVariant.id === "site"
            ? showcaseCards.map((item, index) => (
                <PropertyCard key={`site-${item.title}`} item={item} index={index} href="#card-variants" />
              ))
            : activeVariant.id === "wrapped"
            ? showcaseCards.map((item, index) => (
                <WrappedPropertyCard key={`wrapped-${item.title}`} item={item} index={index} />
              ))
            : showcaseCards.map((item, index) => (
                <VariantCard key={`${activeVariant.id}-${item.title}`} item={item} index={index} variant={activeVariant} />
              ))}
        </div>
      </section>
    </main>
  );
}

export default CardVariants;
