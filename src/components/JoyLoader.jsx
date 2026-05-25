import React, { useEffect } from "react";
import { gsap } from "gsap";
import "./JoyLoader.css";

export default function JoyLoader({ active }) {
  useEffect(() => {
    if (!active) return undefined;

    const context = gsap.context(() => {
      gsap.fromTo(".joy-loader-content", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.56, ease: "expo.out" });
      gsap.fromTo(".joy-loader-map span", { opacity: 0, scaleX: 0, transformOrigin: "left center" }, { opacity: 1, scaleX: 1, duration: 0.72, stagger: 0.06, ease: "power3.out" });
      gsap.to(".joy-loader-map", { x: 10, y: -6, duration: 3.2, repeat: -1, yoyo: true, ease: "sine.inOut" });
      gsap.fromTo(".joy-loader-progress span", { scaleX: 0, transformOrigin: "left center" }, { scaleX: 1, duration: 1.05, ease: "power2.inOut" });
    });

    return () => context.revert();
  }, [active]);

  if (!active) {
    return null;
  }

  return (
    <div className="joy-loader joy-loader-boot" role="status" aria-live="polite">
      <div className="joy-loader-map" aria-hidden="true">
        <span className="loader-line loader-line-1" />
        <span className="loader-line loader-line-2" />
        <span className="loader-line loader-line-3" />
        <span className="loader-line loader-line-4" />
        <span className="loader-line loader-line-5" />
        <span className="loader-line loader-line-6" />
      </div>
      <div className="joy-loader-content">
        <div className="joy-loader-brand">
          <span>JOY</span>
          <span className="joy-loader-pin" />
          <span>ZONE</span>
        </div>
        <div className="joy-loader-copy">Joylar tayyorlanmoqda</div>
        <div className="joy-loader-progress">
          <span />
        </div>
      </div>
    </div>
  );
}
