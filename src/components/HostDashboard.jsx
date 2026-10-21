import { pageMeta, navIndex, FALLBACK_TODAY_BOOKINGS, FALLBACK_UPCOMING_BOOKINGS, buildHostListingView, buildHostBookingView, FALLBACK_HOST_LISTINGS, DashboardHero, DashboardToast } from "./hostDashboard/shared.jsx";
import { TodayPage } from "./hostDashboard/TodayPage.jsx";
import { CalendarPage } from "./hostDashboard/CalendarPage.jsx";
import { ListingsPage } from "./hostDashboard/ListingsPage.jsx";
import { MessagesPage } from "./hostDashboard/MessagesPage.jsx";
import { HostTariffsPage } from "./hostDashboard/HostTariffsPage.jsx";
import React, { useMemo, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import api, { getAccessToken, getApiErrorMessage } from "../api/client.js";

import { Header as JoyNavbar } from "./HomeHero.jsx";
import { buildPartnerStats, selectTodayBookings, selectUpcomingBookings } from "../utils/partnerDashboard.js";
import { setStorageItem, STORAGE_KEYS } from "../utils/storageKeys.js";
import { cacheProfile } from "../utils/profileMapper.js";
import "./HostDashboard.css";
import { navigate } from "../utils/router.js";

function HostDashboard({ page = "today", userState, setUserState }) {
  const normalizedPage = pageMeta[page] ? page : "today";
  const [listings, setListings] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [listingsApiFailed, setListingsApiFailed] = useState(false);
  const [bookingsApiFailed, setBookingsApiFailed] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiErrors, setApiErrors] = useState({ profile: "", listings: "", bookings: "" });
  const [deleteConfirmSpace, setDeleteConfirmSpace] = useState(null);
  const [toast, setToast] = useState({ open: false, message: "", type: "success" });

  const showToast = (msg, type = "success") => {
    setToast({ open: true, message: msg, type });
  };

  const setApiError = useCallback((section, message) => {
    setApiErrors((current) => ({ ...current, [section]: message }));
  }, []);

  const fetchProfile = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    try {
      const res = await api.get("/api/auth/profile/", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const normalizedProfile = cacheProfile(res.data);
      setProfile(normalizedProfile);
      setApiError("profile", "");
      return normalizedProfile;
    } catch (e) {
      setApiError("profile", getApiErrorMessage(e, "Не удалось загрузить профиль партнёра."));
      return null;
    }
  }, [setApiError]);

  const fetchListings = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.get("/api/places/", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.data?.results || res.data || [];
      setListings(Array.isArray(data) ? data.map(buildHostListingView) : []);
      setListingsApiFailed(false);
      setApiError("listings", "");
    } catch (e) {
      setApiError("listings", getApiErrorMessage(e, "Не удалось загрузить ваши объекты."));
      setListings([]);
      setListingsApiFailed(true);
    }
    setLoading(false);
  }, [setApiError]);

  const fetchBookings = useCallback(async () => {
      const token = getAccessToken();
      if (!token) return;
      try {
        const res = await api.get("/api/bookings/", {
          params: { scope: "host" },
          headers: { Authorization: `Bearer ${token}` }
        });
      const data = res.data?.results || res.data || [];
      setBookings(Array.isArray(data) ? data : []);
      setBookingsApiFailed(false);
      setApiError("bookings", "");
    } catch (e) {
      setApiError("bookings", getApiErrorMessage(e, "Не удалось загрузить бронирования партнёра."));
      setBookings([]);
      setBookingsApiFailed(true);
    }
  }, [setApiError]);

  useEffect(() => {
    fetchProfile();
    fetchListings();
    fetchBookings();
  }, [fetchProfile, fetchListings, fetchBookings]);

  useEffect(() => {
    const refreshAfterPlaceSave = () => {
      fetchListings();
      fetchBookings();
    };
    window.addEventListener("joyzone-place-saved", refreshAfterPlaceSave);
    return () => window.removeEventListener("joyzone-place-saved", refreshAfterPlaceSave);
  }, [fetchListings, fetchBookings]);

  const listingsById = useMemo(() => (
    new Map(listings.map((item) => [String(item.id), item]))
  ), [listings]);

  const normalizedBookings = useMemo(
    () => bookings.map((booking) => buildHostBookingView(booking, listingsById)),
    [bookings, listingsById]
  );

  const usingListingsFallback = import.meta.env.DEV && listingsApiFailed;
  const usingBookingsFallback = import.meta.env.DEV && bookingsApiFailed;
  const usingFallbackData = usingListingsFallback || usingBookingsFallback;
  const displayListings = useMemo(
    () => usingListingsFallback ? FALLBACK_HOST_LISTINGS.map(buildHostListingView) : listings,
    [listings, usingListingsFallback],
  );
  const dashboardError = useMemo(
    () => Object.values(apiErrors).filter(Boolean).join(" "),
    [apiErrors],
  );

  const dashboardStats = useMemo(
    () => buildPartnerStats(listings, normalizedBookings),
    [listings, normalizedBookings]
  );

  const todayItems = useMemo(() => {
    if (import.meta.env.DEV && usingBookingsFallback) return FALLBACK_TODAY_BOOKINGS;
    return selectTodayBookings(normalizedBookings);
  }, [normalizedBookings, usingBookingsFallback]);

  const upcomingItems = useMemo(() => {
    const source = import.meta.env.DEV && usingBookingsFallback
      ? FALLBACK_UPCOMING_BOOKINGS
      : selectUpcomingBookings(normalizedBookings)
      .map((booking) => ({
        id: booking.id,
        date: booking.date,
        title: booking.space,
        type: booking.durationLabel,
      }));
    return source;
  }, [normalizedBookings, usingBookingsFallback]);

  const handleEdit = (item) => {
    setStorageItem(STORAGE_KEYS.workflow.editPlaceId, item.id);
    navigate("/partner");
  };

  const askDelete = (item) => {
    setDeleteConfirmSpace(item);
  };

  const performDelete = async (id) => {
    const token = getAccessToken();
    try {
      await api.delete(`/api/places/${id}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast("Пространство успешно удалено!", "success");
      setDeleteConfirmSpace(null);
      fetchListings();
      fetchBookings();
    } catch (e) {
      showToast(getApiErrorMessage(e, "Ошибка при удалении объекта"), "error");
      setDeleteConfirmSpace(null);
    }
  };

  return (
    <main className="host-dashboard-shell">
      <JoyNavbar userState={userState} setUserState={setUserState} activeIndex={navIndex[normalizedPage]} variant="dashboard" />
      <section className={`host-dashboard-container ${normalizedPage === "messages" ? "is-messages-page" : ""}`}>
        <DashboardHero page={normalizedPage} profile={profile} />
        {dashboardError ? (
          <div style={{ marginBottom: 16, padding: "10px 12px", borderRadius: 10, background: "#fef2f2", color: "#991b1b", fontSize: 13 }}>
            {dashboardError}
            {usingFallbackData ? " · DEV fallback data is shown." : ""}
          </div>
        ) : null}
        {normalizedPage === "today" ? (
          <TodayPage
            todayBookings={todayItems}
            upcomingBookings={upcomingItems}
            stats={dashboardStats}
            usingFallback={usingBookingsFallback}
          />
        ) : null}
        {normalizedPage === "calendar" ? (
          <CalendarPage
            listings={listings}
            usingFallback={usingListingsFallback}
            onBookingCreated={fetchBookings}
          />
        ) : null}
        {normalizedPage === "listings" ? (
          loading ? (
            <div style={{ textAlign: "center", padding: "80px 20px" }}>
              <div className="joy-spinner" style={{ display: "inline-block", width: 40, height: 40, border: "3px solid rgba(228, 102, 48, 0.2)", borderTopColor: "var(--orange)", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
              <p style={{ marginTop: 16, color: "#64748b" }}>Загрузка ваших объявлений...</p>
            </div>
          ) : (
            <ListingsPage listings={displayListings} onEdit={handleEdit} onDelete={askDelete} />
          )
        ) : null}
        {normalizedPage === "messages" ? <MessagesPage listings={displayListings} partnerId={profile?.id} /> : null}
        {normalizedPage === "tariffs" ? <HostTariffsPage showToast={showToast} profile={profile} fetchProfile={fetchProfile} /> : null}
      </section>

      {/* Beautiful Custom Alert Popup portal */}
      {deleteConfirmSpace && createPortal(
        <div className="host-custom-alert-overlay" onClick={() => setDeleteConfirmSpace(null)}>
          <div className="host-custom-alert-box animate-pop" onClick={e => e.stopPropagation()}>
            <div className="host-custom-alert-icon">⚠️</div>
            <h3>Удалить пространство?</h3>
            <p>Вы действительно хотите удалить <strong>«{deleteConfirmSpace.title}»</strong>? Это действие нельзя будет отменить.</p>
            <div className="host-custom-alert-buttons">
              <button className="host-alert-btn cancel" onClick={() => setDeleteConfirmSpace(null)}>Отмена</button>
              <button className="host-alert-btn confirm" onClick={() => performDelete(deleteConfirmSpace.id)}>Да, удалить</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Beautiful Toast alert portal */}
      {toast.open && createPortal(
        <DashboardToast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(prev => ({ ...prev, open: false }))} 
        />,
        document.body
      )}
    </main>
  );
}

export default HostDashboard;
