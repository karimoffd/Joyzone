import { initialProfile, CANCELLABLE_BOOKING_STATUSES, ACTIVE_BOOKING_STATUSES, ProfileIcon, EmptyState, buildProfileBookingView, formatBookingDateTime, formatBookingAmount, bookingStatusLabel, paymentStatusLabel, normalizeBookingResponse, normalizePaymentResponse, paymentSubject, formatPaymentAmount } from "./userProfile/helpers.jsx";
import { ProfileQuestionnaireEdit } from "./userProfile/ProfileQuestionnaireEdit.jsx";
import React, { useMemo, useState, useEffect, useRef } from "react";
import api, { getAccessToken, getApiErrorMessage } from "../api/client.js";

import { Header as JoyNavbar } from "./HomeHero.jsx";
import { PropertyCard } from "./ListingsSection.jsx";
import { HostListingDetailModal } from "./HostListingDetailModal.jsx";
import { normalizePlace } from "../utils/placeMapper.js";
import { fetchFavoritesFromBackend, getLocalFavorites } from "../utils/favoritesManager.js";
import { normalizeBooking } from "../utils/bookingMapper.js";
import { cacheProfile, profileToUserState } from "../utils/profileMapper.js";
import { getStorageItem, readJsonStorage, STORAGE_KEYS } from "../utils/storageKeys.js";
import "./UserProfile.css";
import "./HostDashboard.css";

function UserProfile({ userState, setUserState }) {
  const [activeTab, setActiveTab] = useState("about");
  const [selectedListing, setSelectedListing] = useState(null);
  const [likedSpaces, setLikedSpaces] = useState(() => import.meta.env.DEV ? getLocalFavorites() : []);
  const [favoritesLoading, setFavoritesLoading] = useState(true);
  const [favoritesError, setFavoritesError] = useState("");
  const [favoritesUsingDevFallback, setFavoritesUsingDevFallback] = useState(false);
  const avatarInputRef = useRef(null);

  useEffect(() => {
    let active = true;
    setFavoritesLoading(true);
    setFavoritesError("");
    setFavoritesUsingDevFallback(false);

    if (!userState?.isAuthed || !getAccessToken()) {
      setLikedSpaces([]);
      setFavoritesLoading(false);
      setFavoritesError("Saqlangan joylarni ko'rish uchun tizimga kiring.");
      return undefined;
    }

    fetchFavoritesFromBackend({
      onDevFallback: () => active && setFavoritesUsingDevFallback(true),
    })
      .then((favorites) => {
        if (active) setLikedSpaces(favorites);
      })
      .catch((error) => {
        if (!active) return;
        setLikedSpaces([]);
        setFavoritesError(getApiErrorMessage(error, "Не удалось загрузить избранное"));
      })
      .finally(() => {
        if (active) setFavoritesLoading(false);
      });
    
    const handleUpdate = (event) => {
      setLikedSpaces(getLocalFavorites());
      if (event.detail?.source === "dev-fallback") setFavoritesUsingDevFallback(true);
      if (["backend", "backend-merge"].includes(event.detail?.source)) {
        setFavoritesError("");
        setFavoritesUsingDevFallback(false);
      }
    };
    window.addEventListener("joyzone-favorites-update", handleUpdate);
    return () => {
      active = false;
      window.removeEventListener("joyzone-favorites-update", handleUpdate);
    };
  }, [userState?.isAuthed]);

  const profileData = useMemo(() => {
    const activeName = userState?.name || getStorageItem(STORAGE_KEYS.profile.name) || "Foydalanuvchi";
    const activeEmail = userState?.email || getStorageItem(STORAGE_KEYS.profile.email, "");
    const activePhone = userState?.phone || getStorageItem(STORAGE_KEYS.profile.phone, "");
    const localOnly = readJsonStorage(STORAGE_KEYS.profile.localQuestionnaire, {});
    return {
      ...initialProfile,
      ...localOnly,
      name: activeName,
      email: activeEmail,
      phone: activePhone
    };
  }, [userState]);
  const completion = 50;
  const [profileError, setProfileError] = useState("");
  const [avatarSaving, setAvatarSaving] = useState(false);

  // Handle avatar upload and change
  const handleAvatarSelect = () => {
    if (!avatarSaving && avatarInputRef.current) {
      avatarInputRef.current.click();
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result;
      const token = getAccessToken();
      if (!token) {
        setProfileError("Profil rasmini saqlash uchun tizimga kiring.");
        return;
      }
      setAvatarSaving(true);
      try {
        const response = await api.patch("/api/auth/profile/", { avatar: base64Data });
        const profile = cacheProfile(response.data);
        setUserState?.(profileToUserState(profile, userState));
        setProfileError("");
      } catch (err) {
        setProfileError(getApiErrorMessage(err, "Не удалось обновить аватар"));
      } finally {
        setAvatarSaving(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarRemove = async () => {
    const token = getAccessToken();
    if (!token) {
      setProfileError("Profil rasmini o'chirish uchun tizimga kiring.");
      return;
    }
    setAvatarSaving(true);
    try {
      const response = await api.patch("/api/auth/profile/", { avatar: null });
      const profile = cacheProfile(response.data);
      setUserState?.(profileToUserState(profile, userState));
      setProfileError("");
    } catch (err) {
      setProfileError(getApiErrorMessage(err, "Не удалось удалить аватар"));
    } finally {
      setAvatarSaving(false);
    }
  };

  // Property states
  const [allBookings, setAllBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingsLoaded, setBookingsLoaded] = useState(false);
  const [bookingsError, setBookingsError] = useState("");
  const [bookingActionError, setBookingActionError] = useState("");
  const [bookingsSuccess, setBookingsSuccess] = useState("");
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [paymentsError, setPaymentsError] = useState("");
  const [cancellingBookingId, setCancellingBookingId] = useState(null);
  const [cancelBookingTarget, setCancelBookingTarget] = useState(null);
  const [cancelError, setCancelError] = useState("");

  const fetchUserData = async () => {
    if (!userState?.isAuthed || !getAccessToken()) {
      setAllBookings([]);
      setPayments([]);
      setBookingsLoading(false);
      setBookingsLoaded(false);
      setPaymentsLoading(false);
      setBookingsError("Bronlar tarixini ko'rish uchun tizimga kiring.");
      setPaymentsError("To'lovlar tarixini ko'rish uchun tizimga kiring.");
      return;
    }

    setBookingsLoading(true);
    setPaymentsLoading(true);
    setBookingsLoaded(false);
    const [bookingsResult, paymentsResult] = await Promise.allSettled([
      api.get("/api/bookings/", { params: { scope: "mine" } }),
      api.get("/api/payments/my/"),
    ]);

    if (bookingsResult.status === "fulfilled") {
      setAllBookings(normalizeBookingResponse(bookingsResult.value.data));
      setBookingsError("");
      setBookingsLoaded(true);
    } else {
      setAllBookings([]);
      setBookingsError(getApiErrorMessage(bookingsResult.reason, "Не удалось загрузить историю бронирований"));
    }

    if (paymentsResult.status === "fulfilled") {
      setPayments(normalizePaymentResponse(paymentsResult.value.data));
      setPaymentsError("");
    } else {
      setPayments([]);
      setPaymentsError(getApiErrorMessage(paymentsResult.reason, "Не удалось загрузить историю платежей"));
    }
    setBookingsLoading(false);
    setPaymentsLoading(false);
  };

  useEffect(() => {
    fetchUserData();
  }, [userState?.id, userState?.email, userState?.isAuthed]);

  useEffect(() => {
    if (!cancelBookingTarget) return undefined;
    const handleEscape = (event) => {
      if (event.key === "Escape" && !cancellingBookingId) setCancelBookingTarget(null);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [cancelBookingTarget, cancellingBookingId]);

  const openCancelBookingModal = (booking) => {
    if (!booking?.id || !CANCELLABLE_BOOKING_STATUSES.has(booking.status)) return;
    setCancelError("");
    setBookingActionError("");
    setBookingsSuccess("");
    setCancelBookingTarget(booking);
  };

  const closeCancelBookingModal = () => {
    if (cancellingBookingId) return;
    setCancelBookingTarget(null);
    setCancelError("");
  };

  const handleCancelBooking = async () => {
    const booking = cancelBookingTarget;
    if (!booking?.id || !CANCELLABLE_BOOKING_STATUSES.has(booking.status)) return;

    setCancellingBookingId(booking.id);
    setCancelError("");
    setBookingActionError("");
    setBookingsSuccess("");
    let cancellationConfirmed = false;
    try {
      const response = await api.post(`/api/bookings/${booking.id}/cancel/`);
      const cancelledBooking = normalizeBooking(response.data);
      if (cancelledBooking.status !== "cancelled") {
        throw new Error("Backend bronni bekor qilingan deb tasdiqlamadi.");
      }
      cancellationConfirmed = true;
      setAllBookings((current) => current.map((item) => (
        String(item.id) === String(cancelledBooking.id) ? cancelledBooking : item
      )));
      setCancelBookingTarget(null);

      setBookingsLoading(true);
      const refreshedBookingsResponse = await api.get("/api/bookings/", {
        params: { scope: "mine" },
      });
      setAllBookings(normalizeBookingResponse(refreshedBookingsResponse.data));
      setBookingsLoaded(true);
      setBookingsSuccess(`${cancelledBooking.place_title} broni muvaffaqiyatli bekor qilindi.`);
    } catch (err) {
      const message = getApiErrorMessage(
        err,
        cancellationConfirmed
          ? "Bron bekor qilindi, ammo tarixni qayta yuklab bo'lmadi."
          : "Bronni bekor qilib bo'lmadi"
      );
      setBookingActionError(message);
      if (!cancellationConfirmed) setCancelError(message);
    } finally {
      setCancellingBookingId(null);
      setBookingsLoading(false);
    }
  };

  const displayedBookings = allBookings.map(buildProfileBookingView);
  const activeBookingObj = [...displayedBookings]
    .filter((booking) => {
      if (!ACTIVE_BOOKING_STATUSES.has(booking.status)) return false;
      const endTime = new Date(booking.end_time).getTime();
      return !Number.isFinite(endTime) || endTime >= Date.now();
    })
    .sort((left, right) => new Date(left.start_time).getTime() - new Date(right.start_time).getTime())[0] || null;

  const totalVal = activeBookingObj?.amount || 0;
  const formattedTotal = `${new Intl.NumberFormat("uz-UZ").format(totalVal)} ${activeBookingObj?.currency || "UZS"}`;
  const activeBookingCacheKey = activeBookingObj
    ? `${activeBookingObj.id}:${activeBookingObj.status}:${activeBookingObj.payment_status}:${activeBookingObj.updated_at}`
    : "none";

  useEffect(() => {
    if (!bookingsLoaded || !userState?.isAuthed) return;
    const cached = userState?.activeBooking;
    if (
      String(cached?.id || "") === String(activeBookingObj?.id || "")
      && String(cached?.status || "") === String(activeBookingObj?.status || "")
      && String(cached?.payment_status || cached?.paymentStatus || "") === String(activeBookingObj?.payment_status || "")
    ) {
      return;
    }

    setUserState?.({
      ...userState,
      activeBooking: activeBookingObj ? {
        ...activeBookingObj,
        placeSnapshot: activeBookingObj.place_details,
        spaceTitle: activeBookingObj.place_title,
      } : null,
    });
  }, [bookingsLoaded, activeBookingCacheKey]);

  const tabs = [
    { 
      id: "about", 
      label: "Profil", 
      count: `${completion}%`, 
      icon: "user",
      badge: completion < 100 ? "To'ldirilmagan" : null
    },
    { id: "history", label: "Tarix", count: displayedBookings.length, icon: "calendar" },
    { id: "payments", label: "To'lovlar", count: payments.length, icon: "payment" },
    { id: "likes", label: "Saqlangan", count: likedSpaces.length, icon: "heart" }
  ];

  return (
    <main className="user-profile-shell">
      <JoyNavbar userState={userState} setUserState={setUserState} activeIndex={-1} variant="dashboard" />

      {profileError ? (
        <div style={{ maxWidth: 1180, margin: "18px auto 0", padding: "12px 16px", borderRadius: 14, background: "#fef2f2", color: "#991b1b", fontWeight: 700 }}>
          {profileError}
        </div>
      ) : null}

      <section className="profile-unified-panel">
        <section className="profile-content-panel">
          <aside className="profile-sidebar" aria-label="Profil bo'limlari">
            <span>Profilim</span>
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
                  {tab.badge && (
                    <span className="profile-tab-badge" style={{
                      background: "rgba(239, 68, 68, 0.15)",
                      color: "#ef4444",
                      fontSize: "8.5px",
                      fontWeight: "800",
                      padding: "2px 6px",
                      borderRadius: "6px",
                      marginLeft: "6px",
                      textTransform: "uppercase",
                      letterSpacing: "0.02em",
                      display: "inline-flex",
                      alignItems: "center",
                      whiteSpace: "nowrap",
                      flexShrink: 0
                    }}>
                      {tab.badge}
                    </span>
                  )}
                </span>
                <small>{tab.count}</small>
              </button>
            ))}
          </aside>

          <div className="profile-tab-content">
            {activeTab === "about" ? (
              <div className="profile-tab-panel" key="about">
                {/* Active booking is derived from the latest backend bookings response. */}
                {activeBookingObj && (
                  <div className="profile-active-alert" style={{
                    background: "rgba(249, 115, 22, 0.08)",
                    border: "1px solid rgba(249, 115, 22, 0.15)",
                    borderRadius: "18px",
                    padding: "16px 20px",
                    color: "#ea580c",
                    marginBottom: "24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "16px"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span className="profile-alert-pulse" style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: "#ea580c",
                        display: "inline-block"
                      }} />
                      <div>
                        <strong style={{ display: "block", fontSize: "14px", fontWeight: "700" }}>
                          {bookingStatusLabel(activeBookingObj.status)}
                        </strong>
                        <span style={{ fontSize: "12px", opacity: 0.85 }}>
                          {activeBookingObj.place_title} uchun faol bron mavjud.
                        </span>
                      </div>
                    </div>
                    <button onClick={() => setActiveTab("history")} style={{
                      background: "#ea580c",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "6px 12px",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}>
                      Tafsilotlar
                    </button>
                  </div>
                )}

                <section className="profile-hero-panel profile-edit-hero">
                  <div className="profile-main-card">
                    {/* Avatar with Progress Circle wrapper */}
                    <div className="profile-avatar-wrapper" onClick={handleAvatarSelect} style={{ cursor: "pointer" }} title="Rasm almashtirish uchun bosing">
                      <input 
                        type="file" 
                        ref={avatarInputRef} 
                        accept="image/*" 
                        onChange={handleAvatarChange} 
                        style={{ display: "none" }} 
                      />
                      <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: "rotate(-90deg)", position: "absolute", top: 0, left: 0 }}>
                        <circle cx="40" cy="40" r="36" fill="transparent" stroke="#e2e8f0" strokeWidth="3.5" />
                        <circle cx="40" cy="40" r="36" fill="transparent" stroke="#ea580c" strokeWidth="4" 
                          strokeDasharray={2 * Math.PI * 36}
                          strokeDashoffset={2 * Math.PI * 36 * (1 - completion / 100)}
                          style={{ transition: "stroke-dashoffset 0.5s ease" }}
                        />
                      </svg>
                      
                      <div className="profile-avatar" style={{
                        width: "66px",
                        height: "66px",
                        borderRadius: "50%",
                        background: userState?.avatar ? `url(${userState.avatar}) center/cover no-repeat` : "linear-gradient(135deg, #12283f, #294a6d)",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "18px",
                        fontWeight: "750",
                        position: "absolute",
                        top: "7px",
                        left: "7px",
                        boxShadow: "none",
                        overflow: "hidden"
                      }}>
                        {!userState?.avatar && (
                          userState?.name ? userState.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "AK"
                        )}
                      </div>

                      <div className="profile-avatar-tooltip">
                        {userState?.avatar ? "Almashtirish" : "Rasm yuklash"}
                      </div>
                    </div>

                    <div className="profile-heading">
                      <span>Joyzone profile</span>
                      <h1>{profileData.name}</h1>
                      <p>{profileData.role}</p>

                      {/* Interactive Avatar Action Buttons */}
                      <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
                        <button 
                          type="button" 
                          onClick={handleAvatarSelect}
                          style={{
                            background: "rgba(234, 88, 12, 0.12)",
                            color: "#ea580c",
                            border: "none",
                            borderRadius: "8px",
                            padding: "6px 12px",
                            fontSize: "12px",
                            fontWeight: "700",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            transition: "all 0.2s"
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                            <circle cx="12" cy="13" r="4"/>
                          </svg>
                          <span>{userState?.avatar ? "Rasm almashtirish" : "Rasm yuklash"}</span>
                        </button>

                        {userState?.avatar && (
                          <button 
                            type="button" 
                            onClick={handleAvatarRemove}
                            style={{
                              background: "rgba(239, 68, 68, 0.1)",
                              color: "#ef4444",
                              border: "none",
                              borderRadius: "8px",
                              padding: "6px 12px",
                              fontSize: "12px",
                              fontWeight: "700",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              transition: "all 0.2s"
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                            <span>O'chirish</span>
                          </button>
                        )}
                      </div>
                      {completion < 100 && (
                        <div className="profile-warning-badge" style={{
                          background: "#fffbeb",
                          border: "1px solid #fef3c7",
                          color: "#d97706",
                          padding: "6px 12px",
                          borderRadius: "12px",
                          fontSize: "11px",
                          fontWeight: "700",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          marginTop: "8px",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px"
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#d97706", display: "inline-block" }} />
                          Profil to'ldirilmagan ({completion}%)
                        </div>
                      )}
                    </div>
                    <a className="profile-edit-button" href="/profile-edit">
                      <ProfileIcon type="edit" />
                      Anketa tahrirlash
                    </a>
                  </div>
                </section>

                {activeBookingObj && (
                  <section className="profile-active-booking-section" style={{ marginTop: "32px" }}>
                    <div className="profile-section-head">
                      <div>
                        <span>Faol buyurtma</span>
                        <h2>Arizangiz holati</h2>
                      </div>
                    </div>
                    <div className="host-listings-grid" style={{ display: "grid", gap: "24px" }}>
                      <article className="host-listing-shell" style={{ overflow: "visible" }}>
                        <PropertyCard 
                          item={normalizePlace({
                            ...(activeBookingObj.place_details || {}),
                            id: activeBookingObj.place_id,
                            title: activeBookingObj.place_title || "Joyzone",
                            price: formattedTotal,
                            people: activeBookingObj.guests || 1,
                          })}
                          index={0} 
                          onClick={(targetItem) => setSelectedListing(targetItem)}
                        />
                        
                        <div className="host-listing-meta" style={{ padding: "20px" }}>
                          <span style={{ 
                            background: "rgba(249, 115, 22, 0.15)", 
                            color: "#ea580c", 
                            padding: "4px 10px", 
                            borderRadius: "8px", 
                            fontWeight: "700", 
                            textTransform: "uppercase", 
                            fontSize: "11px", 
                            display: "inline-block", 
                            marginBottom: "12px" 
                          }}>
                            {bookingStatusLabel(activeBookingObj.status)}
                          </span>
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px" }}>
                            <div style={{ fontSize: "13px", color: "#64748b" }}>
                              Sana: <strong style={{ color: "#1e293b" }}>{activeBookingObj.date}</strong>
                            </div>
                            <div style={{ fontSize: "13px", color: "#64748b" }}>
                              Vaqt: <strong style={{ color: "#1e293b" }}>{activeBookingObj.time}</strong>
                            </div>
                            <div style={{ fontSize: "13px", color: "#64748b" }}>
                              To'lov holati: <strong style={{ color: "#1e293b" }}>{paymentStatusLabel(activeBookingObj.payment_status)}</strong>
                            </div>
                          </div>
                        </div>
                      </article>
                    </div>
                  </section>
                )}
              </div>
            ) : null}

            {activeTab === "history" ? (
              <div className="profile-tab-panel" key="history">
                <div className="profile-section-head">
                  <div>
                    <span>Tarix</span>
                    <h2>Bronlar tarixi</h2>
                  </div>
                  <a href="/filter">Joy bron qilish</a>
                </div>

                {bookingsSuccess ? (
                  <div className="profile-bookings-state is-success" role="status">{bookingsSuccess}</div>
                ) : null}
                {bookingActionError ? (
                  <div className="profile-bookings-state is-error" role="alert">{bookingActionError}</div>
                ) : null}

                {bookingsLoading ? (
                  <div className="profile-bookings-state" role="status">Bronlar yuklanmoqda...</div>
                ) : bookingsError ? (
                  <div className="profile-bookings-state is-error" role="alert">
                    <p>{bookingsError}</p>
                    <button type="button" className="profile-booking-link" onClick={fetchUserData}>Qayta urinish</button>
                  </div>
                ) : displayedBookings.length === 0 ? (
                  <EmptyState
                    title="Hozircha bronlar yo'q"
                    text="Birinchi joyingizni tanlaganingizdan keyin bron shu yerda backend ma'lumotlari bilan ko'rinadi."
                    action="Joy tanlash"
                    href="/filter"
                  />
                ) : (
                  <div className="profile-bookings-grid">
                    {displayedBookings.map((booking) => (
                      <article key={booking.id} className="profile-booking-card">
                        <div>
                          <span>{bookingStatusLabel(booking.status)}</span>
                          <h3>{booking.place_title}</h3>
                          <p>{booking.durationLabel} ({booking.duration_type})</p>
                        </div>
                        <dl>
                          <div>
                            <dt>Boshlanish</dt>
                            <dd>{formatBookingDateTime(booking.start_time)}</dd>
                          </div>
                          <div>
                            <dt>Tugash</dt>
                            <dd>{formatBookingDateTime(booking.end_time)}</dd>
                          </div>
                          <div>
                            <dt>Muddat</dt>
                            <dd>{booking.durationLabel} ({booking.duration_type})</dd>
                          </div>
                          <div>
                            <dt>Summa</dt>
                            <dd>{formatBookingAmount(booking)}</dd>
                          </div>
                          <div>
                            <dt>Bron holati</dt>
                            <dd>{bookingStatusLabel(booking.status)}</dd>
                          </div>
                          <div>
                            <dt>To'lov</dt>
                            <dd>{paymentStatusLabel(booking.payment_status)}</dd>
                          </div>
                          <div>
                            <dt>Izoh</dt>
                            <dd>{booking.note || "Izoh yo'q"}</dd>
                          </div>
                        </dl>
                        <div className="profile-booking-actions">
                          <a className="profile-booking-link" href={booking.href}>
                            Maydonni ochish
                            <ProfileIcon type="arrow" />
                          </a>
                          {CANCELLABLE_BOOKING_STATUSES.has(booking.status) ? (
                            <button
                              type="button"
                              className="profile-booking-cancel"
                              disabled={cancellingBookingId === booking.id}
                              onClick={() => openCancelBookingModal(booking)}
                            >
                              {cancellingBookingId === booking.id ? "Bekor qilinmoqda..." : "Bronni bekor qilish"}
                            </button>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {activeTab === "payments" ? (
              <div className="profile-tab-panel" key="payments">
                <div className="profile-section-head">
                  <div>
                    <span>To'lovlar</span>
                    <h2>To'lovlar tarixi</h2>
                  </div>
                </div>

                {paymentsLoading ? (
                  <div className="profile-bookings-state" role="status">To'lovlar yuklanmoqda...</div>
                ) : paymentsError ? (
                  <div className="profile-bookings-state is-error" role="alert">
                    <p>{paymentsError}</p>
                    <button type="button" className="profile-booking-link" onClick={fetchUserData}>Qayta urinish</button>
                  </div>
                ) : payments.length === 0 ? (
                  <EmptyState
                    title="Hozircha to'lovlar yo'q"
                    text="Bron yoki tarif uchun backend orqali amalga oshirilgan to'lovlar shu yerda ko'rinadi."
                  />
                ) : (
                  <div className="profile-bookings-grid profile-payments-grid">
                    {payments.map((payment) => (
                      <article key={payment.id} className="profile-booking-card profile-payment-card">
                        <div>
                          <span>{paymentStatusLabel(payment.status)}</span>
                          <h3>{paymentSubject(payment)}</h3>
                          <p>{payment.provider === "test" ? "Test payment provider" : payment.provider}</p>
                        </div>
                        <dl>
                          <div>
                            <dt>Summa</dt>
                            <dd>{formatPaymentAmount(payment)}</dd>
                          </div>
                          <div>
                            <dt>Holat</dt>
                            <dd>{paymentStatusLabel(payment.status)}</dd>
                          </div>
                          <div>
                            <dt>Sana</dt>
                            <dd>{formatBookingDateTime(payment.created_at)}</dd>
                          </div>
                          <div>
                            <dt>Tranzaksiya</dt>
                            <dd>{payment.external_id || `#${payment.id}`}</dd>
                          </div>
                        </dl>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {activeTab === "likes" ? (
              <div className="profile-tab-panel" key="likes">
                <div className="profile-section-head">
                  <div>
                    <span>Saqlangan</span>
                    <h2>Saqlangan joylar</h2>
                  </div>
                </div>

                {favoritesUsingDevFallback ? <span className="profile-dev-fallback">DEV fallback</span> : null}
                {favoritesLoading ? (
                  <div className="profile-bookings-state">Saqlangan joylar yuklanmoqda...</div>
                ) : favoritesError ? (
                  <div className="profile-bookings-state is-error" role="alert">{favoritesError}</div>
                ) : likedSpaces.length === 0 ? (
                  <div className="profile-empty-state">
                    <span><ProfileIcon type="heart" /></span>
                    <h3>Hozircha saqlangan joylar yo'q</h3>
                    <p>Yoqtirgan joylaringizdagi saqlash tugmasini bosing.</p>
                  </div>
                ) : (
                  <div className="profile-liked-grid">
                    {likedSpaces.map((item, index) => (
                      <PropertyCard
                        key={`liked-${item.id || item.title}`}
                        item={item}
                        index={index}
                        onClick={(targetItem) => setSelectedListing(targetItem)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </section>
      </section>

      {selectedListing && (
        <HostListingDetailModal
          item={selectedListing}
          onClose={() => setSelectedListing(null)}
        />
      )}

      {cancelBookingTarget ? (
        <div className="profile-cancel-modal-overlay" onClick={closeCancelBookingModal}>
          <div
            className="profile-cancel-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-cancel-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="profile-cancel-modal-icon" aria-hidden="true">!</div>
            <div>
              <span>Bronni bekor qilish</span>
              <h2 id="profile-cancel-modal-title">Qaroringizni tasdiqlang</h2>
              <p>
                <strong>{cancelBookingTarget.place_title}</strong> uchun bron bekor qilinadi.
                Bu amal backend orqali bajariladi.
              </p>
            </div>
            {cancelError ? <div className="profile-cancel-modal-error" role="alert">{cancelError}</div> : null}
            <div className="profile-cancel-modal-actions">
              <button type="button" onClick={closeCancelBookingModal} disabled={Boolean(cancellingBookingId)}>
                Qaytish
              </button>
              <button
                type="button"
                className="is-danger"
                onClick={handleCancelBooking}
                disabled={Boolean(cancellingBookingId)}
              >
                {cancellingBookingId ? "Bekor qilinmoqda..." : "Ha, bronni bekor qilish"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export { ProfileQuestionnaireEdit };
export default UserProfile;
