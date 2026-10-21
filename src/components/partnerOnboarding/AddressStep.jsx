import React, { useEffect, useRef } from "react";

export function AddressStep({ address, setAddress, lat, setLat, lng, setLng, confirmed, setConfirmed }) {
  const mapRef = useRef(null);
  const myMap = useRef(null);
  const myMarker = useRef(null);

  useEffect(() => {
    const initMap = () => {
      if (myMap.current) return;
      
      const L = window.L;
      
      // Initialize map
      myMap.current = L.map(mapRef.current).setView([lat || 41.2995, lng || 69.2401], 13);
      
      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(myMap.current);

      // Add draggable marker
      myMarker.current = L.marker([lat || 41.2995, lng || 69.2401], {
        draggable: true
      }).addTo(myMap.current);

      const getAddress = async (lat, lng) => {
        setAddress("Поиск адреса...");
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ru`);
          const data = await response.json();
          if (data && data.display_name) {
            setAddress(data.display_name);
            setLat(lat);
            setLng(lng);
            setConfirmed(true);
          } else {
            setAddress("Адрес не найден");
          }
        } catch (error) {
          console.error(error);
          setAddress("Ошибка поиска");
        }
      };

      // Map click event
      myMap.current.on('click', function(e) {
        const coords = e.latlng;
        myMarker.current.setLatLng(coords);
        getAddress(coords.lat, coords.lng);
      });

      // Marker drag event
      myMarker.current.on('dragend', function(e) {
        const coords = myMarker.current.getLatLng();
        getAddress(coords.lat, coords.lng);
      });
    };

    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    if (!window.L) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = initMap;
      document.head.appendChild(script);
    } else {
      initMap();
    }
    
    return () => {
      if (myMap.current) {
        myMap.current.remove();
        myMap.current = null;
      }
    };
  }, []);

  return (
    <div className="address-layout">
      <div className="address-copy">
        <p className="partner-eyebrow">Адрес</p>
        <h1>Укажите точку на карте</h1>
        <p>Передвиньте маркер на точное местоположение вашего пространства.</p>
        <div style={{marginTop: 20}}>
          <label className="linear-field">
            <span>Найденный адрес</span>
            <input data-testid="onboarding-address" value={address} onChange={e => { setAddress(e.target.value); setConfirmed(false); }} placeholder="Адрес определится автоматически" />
          </label>
          <button
            type="button"
            data-testid="onboarding-address-confirm"
            className="partner-next"
            disabled={!address.trim()}
            onClick={() => setConfirmed(true)}
            style={{ marginTop: 12 }}
          >
            Подтвердить указанный адрес
          </button>
        </div>
      </div>
      <div className="map-card" style={{height: 400}}>
        <div ref={mapRef} style={{width: '100%', height: '100%', borderRadius: 16, overflow: 'hidden'}} />
      </div>
    </div>
  );
}
