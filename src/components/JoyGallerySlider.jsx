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

export default function JoyGallerySlider({ images, activeImage, onClick }) {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  
  // Keep track of the previously active image to animate correctly
  const prevActiveRef = useRef(activeImage);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const panes = gsap.utils.toArray(root.querySelectorAll(".slider-pane"));
    const photos = gsap.utils.toArray(root.querySelectorAll(".slider-photo"));
    const glass = root.querySelector(".slider-glass");

    panes.forEach((pane, index) => {
      pane.classList.toggle("is-active", index === activeImage);
      gsap.set(pane, { zIndex: index === activeImage ? 2 : 1 });
    });
    gsap.killTweensOf([...panes, ...photos, glass, canvas]);

    const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
    
    // Only play full intro animation if image actually changed
    if (prevActiveRef.current !== activeImage) {
      timeline
        .set(canvas, { opacity: 0.74 })
        .fromTo(
          panes[activeImage],
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
        .fromTo(photos[activeImage], { xPercent: 5, yPercent: -3, scale: 1.18 }, { xPercent: 0, yPercent: 0, scale: 1.08, duration: 1.18 }, 0)
        .fromTo(glass, { xPercent: -100 }, { xPercent: 150, duration: 1.12, ease: "expo.out" }, 0.03)
        .to(canvas, { opacity: 0, duration: 0.42 }, 0.58);

      panes.forEach((pane, index) => {
        if (index !== activeImage) {
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
    } else {
      // First render, just set it up
      gsap.set(panes[activeImage], { opacity: 1, scale: 1, filter: "saturate(1.04) contrast(1.02)" });
      gsap.set(photos[activeImage], { xPercent: 0, yPercent: 0, scale: 1.08 });
      gsap.set(glass, { xPercent: 54 });
      gsap.set(canvas, { opacity: 0 });
    }

    prevActiveRef.current = activeImage;

    return () => {
      timeline.kill();
      cancelAnimationFrame(animationRef.current);
    };
  }, [activeImage, images]);

  return (
    <div ref={rootRef} className="slider-frame relative flex-1 overflow-hidden w-full h-full" style={{ borderRadius: "inherit", cursor: onClick ? "zoom-out" : "default" }} onClick={onClick}>
      {images.map((image, index) => (
        <article key={index} className={`slider-pane ${index === activeImage ? "is-active" : ""}`} aria-hidden={index !== activeImage} style={{ position: "absolute", inset: 0 }}>
          <div className="slider-photo" style={{ backgroundImage: `url("${image}")`, position: "absolute", inset: 0, backgroundSize: "cover", backgroundPosition: "center" }} />
        </article>
      ))}
      <div className="slider-glass" style={{ position: "absolute", inset: 0, background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.4) 45%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0.4) 55%, transparent 60%)", opacity: 0.5, pointerEvents: "none" }} />
      <canvas ref={canvasRef} className="distortion-canvas" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />
    </div>
  );
}
