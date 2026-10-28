import React, { useEffect, useRef, useState } from "react";
import { Icon } from "./parts.jsx";

const DEFAULT_CENTER = [41.2995, 69.2401];

export function AddressStep({ address, setAddress, lat, setLat, lng, setLng, confirmed, setConfirmed }) {
  const mapRef = useRef(null);
  const myMap = useRef(null);
  const myMarker = useRef(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const reverseGeocode = async (nextLat, nextLng) => {
    setAddress("Поиск адреса...");
    setConfirmed(false);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${nextLat}&lon=${nextLng}&accept-language=ru`);
      const data = await response.json();
      setLat(nextLat);
      setLng(nextLng);
      if (data?.display_name) {
        setAddress(data.display_name);
        setConfirmed(true);
      } else {
        setAddress("");
        setSearchError("Адрес не найден — впишите его вручную.");
      }
    } catch {
      setAddress("");
      setSearchError("Не удалось определить адрес — впишите его вручную.");
    }
  };

  useEffect(() => {
    const initMap = () => {
      if (myMap.current || !mapRef.current) return;
      const L = window.L;
      const center = [Number(lat) || DEFAULT_CENTER[0], Number(lng) || DEFAULT_CENTER[1]];
      myMap.current = L.map(mapRef.current, { zoomControl: true }).setView(center, 14);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(myMap.current);
      myMarker.current = L.marker(center, { draggable: true }).addTo(myMap.current);

      myMap.current.on("click", (event) => {
        myMarker.current.setLatLng(event.latlng);
        setSearchError("");
        reverseGeocode(event.latlng.lat, event.latlng.lng);
      });
      myMarker.current.on("dragend", () => {
        const coords = myMarker.current.getLatLng();
        setSearchError("");
        reverseGeocode(coords.lat, coords.lng);
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
    // The map is created once; later coordinates move the marker instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const searchAddress = async () => {
    const query = address.trim();
    if (!query) return;
    setSearching(true);
    setSearchError("");
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=uz&accept-language=ru&q=${encodeURIComponent(query)}`);
      const [found] = await response.json();
      if (!found) {
        setSearchError("Ничего не нашли. Уточните адрес или поставьте точку на карте.");
        return;
      }
      const nextLat = Number(found.lat);
      const nextLng = Number(found.lon);
      setLat(nextLat);
      setLng(nextLng);
      setAddress(found.display_name);
      setConfirmed(true);
      myMarker.current?.setLatLng([nextLat, nextLng]);
      myMap.current?.setView([nextLat, nextLng], 16);
    } catch {
      setSearchError("Поиск недоступен. Поставьте точку на карте вручную.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="pow-address">
      <div className="pow-address-search">
        <span className="pow-address-input">
          <Icon name="pin" />
          <input
            data-testid="onboarding-address"
            value={address}
            onChange={(event) => { setAddress(event.target.value); setConfirmed(false); setSearchError(""); }}
            onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); searchAddress(); } }}
            placeholder="Улица, дом, район"
          />
        </span>
        <button type="button" className="pow-btn is-outline-dark" disabled={!address.trim() || searching} onClick={searchAddress}>
          {searching ? "Ищем..." : "Найти"}
        </button>
      </div>
      <div className="pow-map" ref={mapRef} />
      <div className="pow-address-foot">
        {searchError ? <span className="pow-field-error">{searchError}</span> : confirmed ? (
          <span className="pow-confirmed"><Icon name="check-circle" />Адрес подтверждён</span>
        ) : (
          <span className="pow-muted">Найдите адрес, кликните по карте или подтвердите вписанный адрес.</span>
        )}
        <button
          type="button"
          data-testid="onboarding-address-confirm"
          className="pow-btn is-small"
          disabled={!address.trim() || confirmed}
          onClick={() => setConfirmed(true)}
        >
          {confirmed ? "Подтверждено" : "Подтвердить адрес"}
        </button>
      </div>
    </div>
  );
}
