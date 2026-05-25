import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import "./JoySlider.css";

function drawDistortion(canvas, intensity) {
  const context = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(rect.width * ratio));
  const height = Math.max(1, Math.floor(rect.height * ratio));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  context.clearRect(0, 0, width, height);
  context.globalAlpha = Math.min(0.5, intensity);

  for (let y = 0; y < height; y += 12 * ratio) {
    const wave = Math.sin(y * 0.035 + performance.now() * 0.008) * 18 * intensity * ratio;
    const gradient = context.createLinearGradient(wave, y, width + wave, y);
    gradient.addColorStop(0, "rgba(255,255,255,0)");
    gradient.addColorStop(0.45, "rgba(246,241,238,0.2)");
    gradient.addColorStop(0.52, "rgba(228,102,48,0.34)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(wave, y, width, 2 * ratio);
  }
}

export default function JoySlider({ items, interval = 4200 }) {
  const [active, setActive] = useState(0);
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const activeRef = useRef(0);
  const timerRef = useRef(null);
  const animationRef = useRef(null);
  const progressRef = useRef(null);

  const count = items.length;

  const goTo = (nextIndex) => {
    const next = (nextIndex + count) % count;
    if (next === activeRef.current) return;
    activeRef.current = next;
    setActive(next);
  };

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const panes = gsap.utils.toArray(root.querySelectorAll(".slider-pane"));
    const photos = gsap.utils.toArray(root.querySelectorAll(".slider-photo"));
    const glass = root.querySelector(".slider-glass");
    const progressBars = gsap.utils.toArray(root.querySelectorAll(".slider-dot span"));

    panes.forEach((pane, index) => {
      pane.classList.toggle("is-active", index === active);
      gsap.set(pane, { zIndex: index === active ? 2 : 1 });
    });
    gsap.killTweensOf([...panes, ...photos, glass, canvas, ...progressBars]);

    const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
    timeline
      .set(canvas, { opacity: 0.74 })
      .fromTo(
        panes[active],
        {
          opacity: 0,
          scale: 1.06,
          filter: "saturate(1.45) contrast(1.18)"
        },
        {
          opacity: 1,
          scale: 1,
          filter: "saturate(1.04) contrast(1.02)",
          duration: 0.98
        },
        0
      )
      .fromTo(photos[active], { xPercent: 5, yPercent: -3, scale: 1.18 }, { xPercent: 0, yPercent: 0, scale: 1.08, duration: 1.18 }, 0)
      .fromTo(glass, { xPercent: -62 }, { xPercent: 54, duration: 1.12, ease: "expo.out" }, 0.03)
      .to(canvas, { opacity: 0, duration: 0.42 }, 0.58);

    panes.forEach((pane, index) => {
      if (index !== active) {
        gsap.to(pane, { opacity: 0, scale: 1.03, duration: 0.42, ease: "power2.out" });
      }
    });

    let strength = 1;
    const render = () => {
      strength *= 0.9;
      drawDistortion(canvas, strength);
      if (strength > 0.04) animationRef.current = requestAnimationFrame(render);
    };
    cancelAnimationFrame(animationRef.current);
    render();

    progressBars.forEach((bar, index) => {
      gsap.set(bar, { scaleX: index === active ? 0 : index < active ? 1 : 0 });
    });

    progressRef.current = gsap.to(progressBars[active], {
      scaleX: 1,
      duration: interval / 1000,
      ease: "none"
    });

    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => goTo(active + 1), interval);

    return () => {
      timeline.kill();
      window.clearTimeout(timerRef.current);
      progressRef.current?.kill();
      cancelAnimationFrame(animationRef.current);
    };
  }, [active, count, interval, items]);

  return (
    <section ref={rootRef} className="slider-frame relative flex-1 overflow-hidden rounded-[18px] md:rounded-[20px]" aria-label="Joyzone property preview slider">
      {items.map((item, index) => (
        <article key={item.title} className={`slider-pane ${index === active ? "is-active" : ""}`} aria-hidden={index !== active}>
          <div key="photo" className="slider-photo" style={{ backgroundImage: `url("${item.image}")` }} />
        </article>
      ))}
      <div className="slider-glass" />
      <canvas ref={canvasRef} className="distortion-canvas" />
      <div className="slider-dots" role="tablist" aria-label="Slider navigation">
        {items.map((item, index) => (
          <button
            key={item.title}
            type="button"
            className="slider-dot"
            aria-label={`${index + 1}: ${item.eyebrow}`}
            aria-current={index === active ? "true" : "false"}
            onClick={() => goTo(index)}
          >
            <span />
          </button>
        ))}
      </div>
    </section>
  );
}
