import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "./BottomSheet.css";

export default function BottomSheet({ isOpen, onClose, title, children }) {
  const [translateY, setTranslateY] = useState(100);
  const [isDragging, setIsDragging] = useState(false);
  
  const startY = useRef(0);
  const currentTranslateY = useRef(100);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTranslateY(30); // 70% height (30% from top)
      currentTranslateY.current = 30;
      document.body.style.overflow = "hidden";
    } else {
      setTranslateY(100);
      currentTranslateY.current = 100;
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleTouchStart = (e) => {
    startY.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startY.current;
    
    // convert deltaY to percentage of viewport height
    const vh = window.innerHeight;
    let deltaPercent = (deltaY / vh) * 100;
    
    let newTranslateY = currentTranslateY.current + deltaPercent;
    
    // Limits: min 0 (100% height), max 100 (0% height/closed)
    if (newTranslateY < 0) newTranslateY = 0;
    if (newTranslateY > 100) newTranslateY = 100;
    
    setTranslateY(newTranslateY);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    
    // Snap logic
    if (translateY > 60) {
      // Snap down to close
      setTranslateY(100);
      currentTranslateY.current = 100;
      onClose();
    } else if (translateY < 15) {
      // Snap up to full screen
      setTranslateY(0);
      currentTranslateY.current = 0;
    } else {
      // Snap back to 70% height
      setTranslateY(30);
      currentTranslateY.current = 30;
    }
  };

  if (!mounted) return null;
  
  // Render nothing if closed and fully translated away
  if (!isOpen && translateY === 100 && !isDragging) return null;

  const content = (
    <div className={`bottom-sheet-overlay ${isOpen ? "is-open" : ""}`} onClick={onClose}>
      <div 
        className={`bottom-sheet-container ${isDragging ? "no-transition" : ""}`}
        style={{ transform: `translateY(${translateY}vh)` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          className="bottom-sheet-handle-area"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="bottom-sheet-handle"></div>
          <div className="bottom-sheet-header">
            <h3>{title}</h3>
            <button className="bottom-sheet-close" onClick={onClose}>&times;</button>
          </div>
        </div>
        <div className="bottom-sheet-content">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
