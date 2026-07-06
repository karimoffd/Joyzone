import React, { useMemo, useState, useEffect } from "react";
import axios from "axios";

import { Header as JoyNavbar } from "./HomeHero.jsx";
import { JoyFooter, SimpleFooter, PropertyCard } from "./ListingsSection.jsx";
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
    { id: "likes", label: "Saqlangan", count: likedSpaces.length, icon: "heart" }
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
          </div>
        </section>
      </section>

      <SimpleFooter />
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
      <SimpleFooter />
    </main>
  );
}

export { ProfileQuestionnaireEdit };
export default UserProfile;
