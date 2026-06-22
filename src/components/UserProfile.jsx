import React, { useMemo, useState, useEffect } from "react";
import axios from "axios";

import { Header as JoyNavbar } from "./HomeHero.jsx";
import { JoyFooter, PropertyCard } from "./ListingsSection.jsx";
import { propertyCards } from "../data/content.js";
import "./UserProfile.css";
import "./HostDashboard.css";

const initialProfile = {
  name: "Aziz Karimov",
  role: "Founder, product jamoasi",
  city: "Toshkent",
  birthYear: "",
  languages: "Uzbek, Russian",
  email: "aziz.karimov@mail.com",
  phone: "",
  work: "Product jamoasi asoschisi",
  company: "",
  interests: "",
  about: "Ish uchrashuvlari va jamoa sessiyalari uchun tinch, qulay joylarni tanlayman."
};

const profileSections = [
  {
    id: "identity",
    label: "Asosiy",
    title: "Ismingiz",
    description: "Ism va qisqa tavsif profilida ko'rinadi.",
    fields: [
      { key: "name", label: "Ism va familiya", type: "text", placeholder: "Aziz Karimov" },
      { key: "role", label: "Qisqa tavsif", type: "text", placeholder: "Founder, product jamoasi" }
    ]
  },
  {
    id: "location",
    label: "Shahar",
    title: "Qayerdasiz",
    description: "Shahar hamkorlar uchun kontekstni tezroq tushunishga yordam beradi.",
    fields: [
      { key: "city", label: "Shahar", type: "text", placeholder: "Toshkent" },
      { key: "birthYear", label: "Tug'ilgan yil", type: "text", placeholder: "1996" }
    ]
  },
  {
    id: "work",
    label: "Ish",
    title: "Siz nima bilan shug'ullanasiz",
    description: "Bu ofis, kovorking yoki zal formatini tanlashga yordam beradi.",
    fields: [
      { key: "work", label: "Ish yoki soha", type: "text", placeholder: "Product jamoasi asoschisi" },
      { key: "company", label: "Kompaniya yoki jamoa", type: "text", placeholder: "Joyzone client" }
    ]
  },
  {
    id: "languages",
    label: "Tillar",
    title: "Qaysi tillarda gaplashasiz",
    description: "Tillarni vergul bilan ajrating.",
    fields: [
      { key: "languages", label: "Tillar", type: "text", placeholder: "Uzbek, Russian, English" }
    ]
  },
  {
    id: "about",
    label: "O'zim haqimda",
    title: "O'zingiz haqingizda ayting",
    description: "Qisqa matn profilni aniqroq va jonliroq qiladi.",
    fields: [
      { key: "about", label: "Tavsif", type: "textarea", placeholder: "Qaysi joylarni odatda izlashingiz haqida..." }
    ]
  },
  {
    id: "interests",
    label: "Qiziqishlar",
    title: "Sizga nima qiziqarli",
    description: "Eng ko'p tanlaydigan joy formatlari.",
    fields: [
      { key: "interests", label: "Qiziqishlar", type: "textarea", placeholder: "Kovorkinglar, workshop zallari..." }
    ]
  },
  {
    id: "contacts",
    label: "Kontaktlar",
    title: "Aloqa ma'lumotlari",
    description: "Arizalar va bronlar bo'yicha muloqot uchun ishlatiladi.",
    fields: [
      { key: "email", label: "Email", type: "email", placeholder: "name@mail.com" },
      { key: "phone", label: "Telefon", type: "tel", placeholder: "+998 90 123 45 67" }
    ]
  }
];

const bookings = [
  {
    title: "Atlas Meeting Room",
    type: "Konferensiya zali",
    date: "12 may 2026",
    time: "10:00 - 14:00",
    location: "Toshkent, Yunusobod",
    status: "Yakunlangan",
    href: "#space-atlas-meeting-room"
  },
  {
    title: "Quiet Work Studio",
    type: "Kovorking",
    date: "28 aprel 2026",
    time: "09:00 - 18:00",
    location: "Toshkent, Mirobod",
    status: "Yakunlangan",
    href: "#space-quiet-work-studio"
  }
];

function ProfileIcon({ type }) {
  const paths = {
    edit: ["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"],
    user: ["M20 21a8 8 0 0 0-16 0", "M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"],
    calendar: ["M7 3v4M17 3v4", "M4 8h16v13H4z", "M8 12h.01M12 12h.01M16 12h.01M8 16h.01"],
    heart: ["M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 1 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z"],
    check: ["m5 13 4 4L19 7"],
    empty: ["M4 5h16v14H4z", "M8 9h8M8 13h5"],
    arrow: ["M5 12h14", "m13 6 6 6-6 6"],
    close: ["M18 6 6 18", "M6 6l12 12"],
    listing: ["M4 5h16v14H4z", "M8 9h8M8 13h8M8 17h4"]
  };

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {(paths[type] || paths.user).map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}

function EmptyState({ title, text, action, href }) {
  return (
    <div className="profile-empty-state">
      <span><ProfileIcon type="empty" /></span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action ? <a href={href}>{action}<ProfileIcon type="arrow" /></a> : null}
    </div>
  );
}

function getCompletion(data) {
  const keys = ["name", "role", "city", "birthYear", "languages", "email", "phone", "work", "company", "interests", "about"];
  const filled = keys.filter((key) => String(data[key] || "").trim()).length;
  return Math.round((filled / keys.length) * 100);
}

function UserProfile({ userState, setUserState }) {
  const [activeTab, setActiveTab] = useState("about");
  const profileData = initialProfile;
  const completion = 50;
  const likedSpaces = propertyCards;

  // Property states
  const [myObjects, setMyObjects] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Property Manager States
  const [selectedObject, setSelectedObject] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Add Object form states
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("Kovorking");
  const [newPrice, setNewPrice] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newPeople, setNewPeople] = useState(10);
  const [newArea, setNewArea] = useState(80);
  const [newDesc, setNewDesc] = useState("");
  const [newSpaceImages, setNewSpaceImages] = useState([]);

  // Calendar states
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(5); // June
  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd, setRangeEnd] = useState(null);
  const [blockingNote, setBlockingNote] = useState("");
  const [customPriceVal, setCustomPriceVal] = useState("");

  const fetchUserData = async () => {
    try {
      const currentEmail = userState?.email || "aziz.karimov@mail.com";
      const spacesRes = await axios.get("http://localhost:5000/api/spaces");
      const bookingsRes = await axios.get("http://localhost:5000/api/bookings");

      const spacesData = Array.isArray(spacesRes.data) ? spacesRes.data : [];
      const bookingsData = Array.isArray(bookingsRes.data) ? bookingsRes.data : [];

      const userSpaces = spacesData.filter(s => s && (s.owner_id === currentEmail || s.owner_id === "host_1" || s.owner_id === "host_2"));
      setMyObjects(userSpaces);
      setAllBookings(bookingsData);
    } catch (err) {
      console.warn("REST API loading error inside profile:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [userState?.email]);

  const handleAddSpace = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const defaultImages = [
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=86",
      "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=900&q=86"
    ];
    const finalImages = newSpaceImages.length > 0 ? newSpaceImages : defaultImages;

    const newSpaceData = {
      name: newName,
      type: newType,
      price: (() => {
        const cleanPrice = newPrice.replace(/\s/g, "");
        const numericPrice = Number(cleanPrice.replace(/[^0-9]/g, ""));
        return isNaN(numericPrice) || numericPrice === 0
          ? "350 000 so'm"
          : `${numericPrice.toLocaleString("uz-UZ")} so'm`;
      })(),
      status: "Active",
      owner_id: userState?.email || "aziz.karimov@mail.com",
      location: newLocation,
      people: Number(newPeople) || 10,
      area: Number(newArea) || 80,
      images: finalImages,
      promoted: false,
      priceOverrides: {}
    };

    try {
      await axios.post("http://localhost:5000/api/spaces", newSpaceData);
      setNewName("");
      setNewPrice("");
      setNewLocation("");
      setNewPeople(10);
      setNewArea(80);
      setNewDesc("");
      setNewSpaceImages([]);
      setShowAddForm(false);
      await fetchUserData();
    } catch (err) {
      console.error("Failed to add new property:", err);
      alert("Xatolik yuz berdi: obyektni qo'shib bo'lmadi.");
    }
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      axios.post("http://localhost:5000/api/upload", {
        filename: file.name,
        base64: reader.result
      })
      .then(res => {
        if (res.data && res.data.url) {
          setNewSpaceImages(prev => [...prev, res.data.url]);
        }
      })
      .catch(err => {
        console.error("Fayl yuklashda xatolik:", err);
        alert("Fayl yuklashda xatolik yuz berdi");
      });
    };
    reader.readAsDataURL(file);
  };

  const getDaysInMonth = (year, month) => {
    const date = new Date(Date.UTC(year, month, 1));
    const days = [];

    let startDay = date.getUTCDay();
    startDay = startDay === 0 ? 6 : startDay - 1;

    for (let i = 0; i < startDay; i++) {
      days.push({ label: "", dateStr: null, isMuted: true });
    }

    const totalDays = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ label: d, dateStr, isMuted: false });
    }
    return days;
  };

  const handleDayClick = (dateStr) => {
    if (!dateStr) return;
    if (rangeStart && !rangeEnd) {
      if (dateStr < rangeStart) {
        setRangeStart(dateStr);
      } else {
        setRangeEnd(dateStr);
      }
    } else {
      setRangeStart(dateStr);
      setRangeEnd(null);
    }
  };

  const handleManualBooking = async () => {
    if (!rangeStart) return;
    const currentEmail = userState?.email || "aziz.karimov@mail.com";
    const start = rangeStart;
    const end = rangeEnd || rangeStart;

    try {
      await axios.post("http://localhost:5000/api/bookings", {
        user_id: currentEmail,
        space_id: activeObject.id || activeObject._id,
        start_date: start,
        end_date: end,
        total_price: 0,
        status: "closed",
        note: blockingNote || "Mulkdor tomonidan yopilgan"
      });

      setBlockingNote("");
      setRangeStart(null);
      setRangeEnd(null);
      await fetchUserData();
      alert("Kunlar muvaffaqiyatli band qilindi / yopildi!");
    } catch (err) {
      console.error("Manual booking error:", err);
      alert("Xatolik yuz berdi: kunlarni yopib bo'lmadi.");
    }
  };

  const handleSavePriceOverrides = async () => {
    if (!rangeStart || !customPriceVal) return;
    const newOverrides = { ...(activeObject.priceOverrides || {}) };

    const startStr = rangeStart;
    const endStr = rangeEnd || rangeStart;

    const start = new Date(startStr + "T00:00:00Z");
    const end = new Date(endStr + "T00:00:00Z");

    let d = new Date(start);
    while (d <= end) {
      const dStr = d.toISOString().split("T")[0];
      newOverrides[dStr] = Number(customPriceVal);
      d.setUTCDate(d.getUTCDate() + 1);
    }

    try {
      await axios.put(`http://localhost:5000/api/spaces/${activeObject.id || activeObject._id}`, {
        priceOverrides: newOverrides
      });

      setCustomPriceVal("");
      setRangeStart(null);
      setRangeEnd(null);
      await fetchUserData();
      alert("Kunlik narx(lar) muvaffaqiyatli o'zgartirildi!");
    } catch (err) {
      console.error("Save price overrides error:", err);
      alert("Xatolik yuz berdi: narxni saqlab bo'lmadi.");
    }
  };

  const activeObject = selectedObject
    ? (myObjects.find(o => o.id === selectedObject.id || o._id === selectedObject.id) || selectedObject)
    : null;

  const spaceBookings = activeObject && Array.isArray(allBookings)
    ? allBookings.filter(b => {
        if (!b) return false;
        const spaceId = typeof b.space_id === "object" && b.space_id !== null ? b.space_id?.id || b.space_id?._id : b.space_id;
        return spaceId && (spaceId === activeObject.id || spaceId === activeObject._id);
      })
    : [];

  const calendarDays = selectedObject ? getDaysInMonth(currentYear, currentMonth) : [];

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
    setRangeStart(null);
    setRangeEnd(null);
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
    setRangeStart(null);
    setRangeEnd(null);
  };

  const monthNames = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];

  const formatMoney = (val) => {
    return `${new Intl.NumberFormat("uz-UZ").format(val)} so'm`;
  };

  const tabs = [
    { id: "about", label: "Profil", count: `${completion}%`, icon: "user" },
    { id: "history", label: "Tarix", count: bookings.length, icon: "calendar" },
    { id: "likes", label: "Saqlangan", count: likedSpaces.length, icon: "heart" },
    { id: "my-objects", label: "Obyektlarim", count: myObjects.length, icon: "listing" }
  ];

  return (
    <main className="user-profile-shell">
      <JoyNavbar userState={userState} setUserState={setUserState} activeIndex={-1} variant="dashboard" />

      <section className="profile-unified-panel">
        <section className="profile-content-panel">
          <aside className="profile-sidebar" aria-label="Profil bo'limlari">
            <span>Profil</span>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={activeTab === tab.id ? "is-active" : ""}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="profile-tab-label">
                  <ProfileIcon type={tab.icon} />
                  <b>{tab.label}</b>
                </span>
                <small>{tab.count}</small>
              </button>
            ))}
          </aside>

          <div className="profile-tab-content">
            {activeTab === "about" ? (
              <div className="profile-tab-panel" key="about">
                <section className="profile-hero-panel profile-edit-hero">
                  <div className="profile-main-card">
                    <div className="profile-avatar">AK</div>
                    <div className="profile-heading">
                      <span>Joyzone profile</span>
                      <h1>{profileData.name}</h1>
                      <p>{profileData.role}</p>
                    </div>
                    <a className="profile-edit-button" href="#profile-edit">
                      <ProfileIcon type="edit" />
                      Anketa tahrirlash
                    </a>
                  </div>
                </section>

                <section className="profile-questionnaire">
                  <div className="profile-completion-card profile-questionnaire-summary">
                    <div className="profile-progress-ring" style={{ "--profile-progress": `${completion}%` }}>
                      <strong>{completion}%</strong>
                    </div>
                    <div className="profile-completion-copy">
                      <span>Anketa</span>
                      <h2>Profilni to'ldiring</h2>
                      <p>Etishmayotgan ma'lumotlarni qo'shing — hamkorlar bronni tezroq tasdiqlaydi.</p>
                    </div>
                    <div className="profile-checklist">
                      <span className="is-done"><ProfileIcon type="check" /> Ism va kontaktlar</span>
                      <span className="is-done"><ProfileIcon type="check" /> Shahar</span>
                      <span><ProfileIcon type="check" /> O'zim haqimda</span>
                      <span><ProfileIcon type="check" /> Qiziqishlar</span>
                    </div>
                    <div className="profile-questionnaire-actions">
                      <a href="#profile-edit" className="profile-save-action">Boshlash</a>
                      <a href="#profile-edit" className="profile-cancel-action">Tahrirlash</a>
                    </div>
                  </div>
                </section>
              </div>
            ) : null}

            {activeTab === "history" ? (
              <div className="profile-tab-panel" key="history">
                <div className="profile-section-head">
                  <div>
                    <span>Tarix</span>
                    <h2>O'tgan bronlar</h2>
                  </div>
                  <a href="#filter">Joy bron qilish</a>
                </div>

                <div className="profile-bookings-grid">
                  {bookings.map((booking) => (
                    <article key={`${booking.title}-${booking.date}`} className="profile-booking-card">
                      <div>
                        <span>{booking.status}</span>
                        <h3>{booking.title}</h3>
                        <p>{booking.type}</p>
                      </div>
                      <dl>
                        <div>
                          <dt>Sana</dt>
                          <dd>{booking.date}</dd>
                        </div>
                        <div>
                          <dt>Vaqt</dt>
                          <dd>{booking.time}</dd>
                        </div>
                        <div>
                          <dt>Manzil</dt>
                          <dd>{booking.location}</dd>
                        </div>
                      </dl>
                      <a className="profile-booking-link" href={booking.href}>
                        Maydonni ochish
                        <ProfileIcon type="arrow" />
                      </a>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}

            {activeTab === "likes" ? (
              <div className="profile-tab-panel" key="likes">
                <div className="profile-section-head">
                  <div>
                    <span>Saqlangan</span>
                    <h2>Yoqtirilgan joylar</h2>
                  </div>
                  <a href="#filter">Barchasini ko'rish</a>
                </div>
                <div className="profile-liked-grid">
                  {likedSpaces.map((item, index) => (
                    <PropertyCard key={`liked-${item.title}`} item={item} index={index} />
                  ))}
                </div>
              </div>
            ) : null}

            {activeTab === "my-objects" ? (
              <div className="profile-tab-panel" key="my-objects">
                {!selectedObject ? (
                  <div className="profile-properties-list-container">
                    <div className="profile-section-head">
                      <div>
                        <span>Mening portfelim</span>
                        <h2>Obyektlarim ({myObjects.length})</h2>
                      </div>
                      <button
                        type="button"
                        className="profile-save-action"
                        onClick={() => setShowAddForm(!showAddForm)}
                        style={{ display: "flex", gap: "6px", alignItems: "center" }}
                      >
                        {showAddForm ? "Yopish" : "Yangi joy qo'shish"}
                      </button>
                    </div>

                    {showAddForm && (
                      <form onSubmit={handleAddSpace} className="profile-add-property-form" style={{ background: "#f8fafc", padding: "24px", borderRadius: "20px", border: "1px solid rgba(41, 74, 109, 0.1)", marginBottom: "28px" }}>
                        <h3 style={{ fontSize: "20px", fontWeight: "900", marginBottom: "18px", color: "#12283f" }}>Yangi Obyekt Qo'shish</h3>
                        <div className="profile-edit-form" style={{ marginBottom: "18px" }}>
                          <label>
                            <span>Uy nomi *</span>
                            <input type="text" required placeholder="Focus Hub, Quiet Villa va hokazo" value={newName} onChange={(e) => setNewName(e.target.value)} />
                          </label>
                          <label>
                            <span>Turi *</span>
                            <select value={newType} onChange={(e) => setNewType(e.target.value)} style={{ width: "100%", border: "1px solid rgba(41, 74, 109, 0.14)", borderRadius: "14px", padding: "13px 14px", outline: "none", fontSize: "14px", fontWeight: "650", color: "#12283f" }}>
                              <option value="Kovorking">Kovorking</option>
                              <option value="Dacha">Dacha</option>
                              <option value="Ofis">Ofis</option>
                              <option value="Konferensiya">Konferensiya zali</option>
                              <option value="Tadbir joyi">Tadbir joyi</option>
                            </select>
                          </label>
                          <label>
                            <span>Bazaviy narx (kuniga/soatiga) *</span>
                            <input type="text" required placeholder="Masalan: 350 000 so'm" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
                          </label>
                          <label>
                            <span>Lokatsiya / Manzil *</span>
                            <input type="text" required placeholder="Masalan: Toshkent, Mirobod" value={newLocation} onChange={(e) => setNewLocation(e.target.value)} />
                          </label>
                          <label>
                            <span>Sig'imi (Kishi) *</span>
                            <input type="number" required min="1" value={newPeople} onChange={(e) => setNewPeople(Number(e.target.value))} />
                          </label>
                          <label>
                            <span>Maydoni (m2) *</span>
                            <input type="number" required min="1" value={newArea} onChange={(e) => setNewArea(Number(e.target.value))} />
                          </label>
                          <label className="is-wide" style={{ gridColumn: "1 / -1" }}>
                            <span>Rasm yuklash (File)</span>
                            <input type="file" accept="image/*" onChange={handleImageUpload} style={{ border: "none", background: "transparent", padding: "8px 0" }} />
                            {newSpaceImages.length > 0 && (
                              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                                {newSpaceImages.map((img, i) => (
                                  <img key={i} src={img} alt="" style={{ width: "60px", height: "60px", borderRadius: "10px", objectFit: "cover", border: "1px solid #ddd" }} />
                                ))}
                              </div>
                            )}
                          </label>
                        </div>
                        <button type="submit" className="profile-save-action" style={{ padding: "12px 24px", borderRadius: "999px", fontWeight: "900", cursor: "pointer" }}>
                          Saqlash va E'lon qilish
                        </button>
                      </form>
                    )}

                    <div className="profile-properties-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "24px" }}>
                      {myObjects.length === 0 ? (
                        <div className="profile-empty-state" style={{ gridColumn: "1 / -1" }}>
                          <span><ProfileIcon type="empty" /></span>
                          <h3>Hozircha obyektlaringiz yo'q</h3>
                          <p>Arendaga berishni boshlash uchun yangi obyekt qo'shing.</p>
                        </div>
                      ) : (
                        myObjects.map((item) => (
                          <article key={item.id || item._id} className="profile-property-manager-card" style={{ background: "#ffffff", borderRadius: "24px", border: "1px solid rgba(41, 74, 109, 0.08)", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 8px 20px rgba(0,0,0,0.02)" }}>
                            <div style={{ height: "180px", width: "100%", overflow: "hidden" }}>
                              <img src={item.images?.[0] || "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=600&q=80"} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            </div>
                            <div style={{ padding: "18px", display: "flex", flexDirection: "column", flexGrow: 1 }}>
                              <span style={{ fontSize: "11px", fontWeight: "900", color: "#e46630", textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.type}</span>
                              <h3 style={{ fontSize: "18px", fontWeight: "900", color: "#12283f", margin: "6px 0" }}>{item.name}</h3>
                              <p style={{ fontSize: "13px", color: "rgba(18, 40, 63, 0.6)", marginBottom: "12px" }}>{item.location}</p>
                              <p style={{ fontSize: "14px", fontWeight: "650", color: "#12283f", marginBottom: "16px" }}>
                                Narxi: <strong style={{ color: "#e46630", fontWeight: "900" }}>{item.price}</strong>
                              </p>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", borderTop: "1px solid #f1f5f9", paddingTop: "14px" }}>
                                <span style={{ fontSize: "12px", fontWeight: "800", background: "rgba(56, 239, 125, 0.15)", color: "#22c55e", padding: "4px 10px", borderRadius: "999px" }}>
                                  {item.status === "Active" ? "Faol" : "Qoralama"}
                                </span>
                                <button
                                  type="button"
                                  className="profile-edit-inline"
                                  onClick={() => setSelectedObject(item)}
                                  style={{ padding: "6px 14px", display: "flex", gap: "6px", alignItems: "center", fontSize: "12px" }}
                                >
                                  Kalendar
                                </button>
                              </div>
                            </div>
                          </article>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  /* ============ CALENDAR MANAGER (host-calendar design) ============ */
                  <div className="profile-calendar-manager-container">
                    <button
                      type="button"
                      className="profile-cancel-action"
                      onClick={() => { setSelectedObject(null); setRangeStart(null); setRangeEnd(null); }}
                      style={{ marginBottom: "24px" }}
                    >
                      Ro'yxatga qaytish
                    </button>

                    {/* Header */}
                    <div className="host-calendar-top" style={{ marginBottom: "22px" }}>
                      <div>
                        <span>Kalendar va Narxlar</span>
                        <h2 style={{ fontSize: "clamp(22px,2.2vw,32px)", margin: 0 }}>{activeObject.name}</h2>
                        <p style={{ margin: "6px 0 0", fontSize: "15px", color: "rgba(17,24,32,0.6)" }}>{activeObject.location} · {activeObject.type}</p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <button type="button" className="profile-edit-inline" style={{ minWidth: "38px", height: "38px", padding: 0, borderRadius: "12px", fontSize: "20px" }} onClick={prevMonth}>&lsaquo;</button>
                        <strong style={{ fontSize: "16px", fontWeight: "900", color: "#111820", minWidth: "140px", textAlign: "center" }}>{monthNames[currentMonth]} {currentYear}</strong>
                        <button type="button" className="profile-edit-inline" style={{ minWidth: "38px", height: "38px", padding: 0, borderRadius: "12px", fontSize: "20px" }} onClick={nextMonth}>&rsaquo;</button>
                      </div>
                    </div>

                    {/* host-calendar layout */}
                    <div className="host-calendar-layout">

                      {/* LEFT: Controls */}
                      <aside className="host-price-panel">
                        <span>Boshqaruv</span>

                        {rangeStart ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "10px" }}>
                            <div style={{ padding: "12px 14px", borderRadius: "16px", background: "rgba(41,74,109,0.07)", border: "1px solid rgba(41,74,109,0.12)" }}>
                              <small style={{ display: "block", color: "#e46630", fontWeight: "900", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Tanlangan davr</small>
                              <p style={{ margin: "6px 0 0", fontSize: "16px", fontWeight: "900", color: "#111820", lineHeight: "1.3" }}>
                                {rangeStart}{rangeEnd && rangeEnd !== rangeStart ? ` - ${rangeEnd}` : ""}
                              </p>
                            </div>

                            <div>
                              <h4 style={{ margin: "0 0 6px", fontSize: "15px", fontWeight: "900", color: "#111820" }}>Joyni yopish (Oflayn)</h4>
                              <p style={{ margin: "0 0 10px", fontSize: "13px", color: "rgba(17,24,32,0.56)", lineHeight: "1.5" }}>Ushbu sanalarni qo'lda yopib qo'yish.</p>
                              <textarea
                                placeholder="Eslatma (Masalan: Ta'mirlash)"
                                value={blockingNote}
                                onChange={(e) => setBlockingNote(e.target.value)}
                                rows="2"
                                style={{ width: "100%", border: "1px solid rgba(41,74,109,0.14)", borderRadius: "14px", padding: "10px 14px", fontSize: "13px", outline: "none", resize: "none", marginBottom: "10px", fontFamily: "inherit", color: "#111820", background: "#f7f9fb", boxSizing: "border-box" }}
                              />
                              <button
                                type="button"
                                onClick={handleManualBooking}
                                style={{ display: "block", width: "100%", minHeight: "46px", border: "0", borderRadius: "16px", background: "#294a6d", color: "#fff", fontSize: "15px", fontWeight: "900", cursor: "pointer", fontFamily: "inherit" }}
                              >
                                Sanalarni yopish
                              </button>
                            </div>

                            <div style={{ borderTop: "1px solid rgba(41,74,109,0.1)", paddingTop: "16px" }}>
                              <h4 style={{ margin: "0 0 6px", fontSize: "15px", fontWeight: "900", color: "#111820" }}>Kunlik narxni o'zgartirish</h4>
                              <p style={{ margin: "0 0 10px", fontSize: "13px", color: "rgba(17,24,32,0.56)", lineHeight: "1.5" }}>Tanlangan sanalar uchun maxsus narx.</p>
                              <label className="host-price-input" style={{ marginBottom: "10px" }}>
                                <input
                                  type="number"
                                  placeholder="450000"
                                  inputMode="numeric"
                                  value={customPriceVal}
                                  onChange={(e) => setCustomPriceVal(e.target.value.replace(/\D/g, "").slice(0, 8))}
                                  aria-label="Kunlik narx"
                                  style={{ fontSize: "clamp(28px,3vw,42px)" }}
                                />
                                <small>so'm</small>
                              </label>
                              <button
                                type="button"
                                onClick={handleSavePriceOverrides}
                                style={{ display: "block", width: "100%", minHeight: "46px", border: "0", borderRadius: "16px", background: "#e46630", color: "#fff", fontSize: "15px", fontWeight: "900", cursor: "pointer", fontFamily: "inherit" }}
                              >
                                Narxni yangilash
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => { setRangeStart(null); setRangeEnd(null); }}
                              style={{ width: "100%", minHeight: "40px", border: "1px solid rgba(41,74,109,0.18)", borderRadius: "14px", background: "transparent", color: "rgba(17,24,32,0.58)", fontSize: "13px", fontWeight: "800", cursor: "pointer", fontFamily: "inherit" }}
                            >
                              Bekor qilish
                            </button>
                          </div>
                        ) : (
                          <div style={{ marginTop: "16px", padding: "22px 18px", borderRadius: "18px", background: "#f7f9fb", textAlign: "center", border: "1px solid rgba(41,74,109,0.08)" }}>
                            <div style={{ width: "52px", height: "52px", margin: "0 auto 14px", borderRadius: "16px", background: "rgba(41,74,109,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px" }}>&#128197;</div>
                            <p style={{ margin: 0, fontSize: "13px", color: "rgba(17,24,32,0.54)", lineHeight: "1.6" }}>
                              Kalendardan kun(lar)ni tanlang - keyin ularni yopish yoki narxini o'zgartirish mumkin.
                            </p>
                          </div>
                        )}
                      </aside>

                      {/* RIGHT: Calendar grid */}
                      <section className="host-calendar-panel">
                        <div className="host-calendar-top" style={{ marginBottom: "18px" }}>
                          <div>
                            <span>Mavjudlik va narxlar</span>
                            <h2>Kalendar</h2>
                          </div>
                          <div className="host-calendar-legend">
                            <span><i className="free" />Bo'sh</span>
                            <span><i className="booked" />Mijoz band</span>
                            <span><i className="blocked" />Yopilgan</span>
                          </div>
                        </div>

                        <div className="host-calendar-weekdays">
                          {["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"].map(w => <span key={w}>{w}</span>)}
                        </div>

                        <div className="host-calendar-grid">
                          {calendarDays.map((day, idx) => {
                            if (day.isMuted) return <div key={`m-${idx}`} className="host-day is-muted" />;

                            const dateStr = day.dateStr;
                            const hasOverride = activeObject?.priceOverrides?.[dateStr] !== undefined;
                            const currentPrice = hasOverride
                              ? formatMoney(activeObject.priceOverrides[dateStr])
                              : (activeObject?.price || "0");

                            const booking = spaceBookings.find(b => {
                              if (!b.start_date || !b.end_date) return false;
                              const s = String(b.start_date).split("T")[0];
                              const e = String(b.end_date).split("T")[0];
                              return dateStr >= s && dateStr <= e;
                            });

                            let dayStatus = "";
                            let tooltipText = "";
                            if (booking) {
                              if (booking.status === "booked" || booking.status === "closed") {
                                dayStatus = "blocked";
                                tooltipText = `Bloklangan: ${booking.note || "Mulkdor yopgan"}`;
                              } else if (booking.status === "Paid" || booking.status === "Pending") {
                                dayStatus = "booked";
                                tooltipText = `Mijoz bron: ${booking.user_id || ""}`;
                              }
                            }

                            const isSelected = rangeStart
                              ? (rangeEnd ? dateStr >= rangeStart && dateStr <= rangeEnd : dateStr === rangeStart)
                              : false;

                            const priceDisplay = String(currentPrice).replace(" so'm", "");

                            return (
                              <button
                                key={`day-${dateStr}`}
                                type="button"
                                title={tooltipText || undefined}
                                className={`host-day ${dayStatus} ${hasOverride ? "has-discount" : ""} ${isSelected ? "is-selected" : ""}`}
                                onClick={() => handleDayClick(dateStr)}
                              >
                                <strong>{day.label}</strong>
                                <small style={hasOverride ? { color: "#e46630" } : undefined}>{priceDisplay}</small>
                                {hasOverride && <em>custom</em>}
                              </button>
                            );
                          })}
                        </div>
                      </section>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </section>
      </section>

      <JoyFooter />
    </main>
  );
}

function ProfileEditFormSection({ section, draft, onDraftChange }) {
  return (
    <article className="profile-edit-section is-editing">
      <div className="profile-edit-section-head">
        <div>
          <span>{section.label}</span>
          <h3>{section.title}</h3>
          <p>{section.description}</p>
        </div>
      </div>
      <div className="profile-edit-form">
        {section.fields.map((field) => (
          <label key={field.key} className={field.type === "textarea" ? "is-wide" : ""}>
            <span>{field.label}</span>
            {field.type === "textarea" ? (
              <textarea
                value={draft[field.key] || ""}
                placeholder={field.placeholder}
                rows="4"
                onChange={(event) => onDraftChange(field.key, event.target.value)}
              />
            ) : (
              <input
                value={draft[field.key] || ""}
                type={field.type}
                placeholder={field.placeholder}
                onChange={(event) => onDraftChange(field.key, event.target.value)}
              />
            )}
          </label>
        ))}
      </div>
    </article>
  );
}

function ProfileQuestionnaireEdit({ userState, setUserState }) {
  const [draft, setDraft] = useState(initialProfile);
  const completion = useMemo(() => getCompletion(draft), [draft]);

  const updateDraft = (key, value) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const saveProfile = () => {
    window.location.hash = "#profile";
  };

  return (
    <main className="user-profile-shell profile-edit-page-shell">
      <JoyNavbar userState={userState} setUserState={setUserState} activeIndex={-1} variant="dashboard" />
      <section className="profile-unified-panel profile-editor-panel">
        <div className="profile-editor-top">
          <a href="#profile" className="profile-cancel-action">
            <ProfileIcon type="arrow" />
            Orqaga
          </a>
          <div>
            <span>Anketa</span>
            <h1>Profilni tahrirlash</h1>
            <p>Faqat kerakli bo'limlarnigina to'ldiring. Saqlagandan keyin profil sahifasiga qaytasiz.</p>
          </div>
          <div className="profile-mini-completion">
            <strong>{completion}%</strong>
            <span>to'ldirilgan</span>
          </div>
        </div>

        <div className="profile-editor-layout">
          <aside className="profile-preview-card">
            <div className="profile-preview-avatar">AK</div>
            <h3>{draft.name || "Profilingiz"}</h3>
            <p>{draft.city || "Shahar"} · {draft.work || "Soha"}</p>
            <div>
              <span>{draft.languages || "Tillar"}</span>
              <span>{draft.interests || "Qiziqishlar"}</span>
            </div>
          </aside>

          <div className="profile-edit-list">
            {profileSections.map((section) => (
              <ProfileEditFormSection
                key={section.id}
                section={section}
                draft={draft}
                onDraftChange={updateDraft}
              />
            ))}
          </div>
        </div>

        <div className="profile-editor-footer">
          <a href="#profile" className="profile-cancel-action">Bekor qilish</a>
          <button type="button" className="profile-save-action" onClick={saveProfile}>Saqlash</button>
        </div>
      </section>
    </main>
  );
}

export { ProfileQuestionnaireEdit };
export default UserProfile;
