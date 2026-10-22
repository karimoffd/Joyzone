import React, { lazy, Suspense, useCallback, useEffect, useState } from "react";
import api from "./api/client.js";
import { gsap } from "gsap";
import HomeHero from "./components/HomeHero.jsx";
import { LanguageContext } from "./context/LanguageContext.jsx";
import { mergeSiteContent } from "./utils/content.js";
import JoySlider from "./components/JoySlider.jsx";
import { AuthForm, LoginForm, ForgotPasswordForm, VerifyCodeForm } from "./components/AuthScreens.jsx";
import JoyLoader from "./components/JoyLoader.jsx";
import FloatingBookingWidget from "./components/FloatingBookingWidget.jsx";
import { ChatNotificationToast } from "./components/ChatNotificationToast.jsx";
import { FloatingNotificationBell } from "./components/FloatingNotificationBell.jsx";
import { DirectChatDrawer } from "./components/DirectChatDrawer.jsx";
import { syncChatsWithBackend } from "./utils/chatManager.js";
import { mergeAnonymousFavorites } from "./utils/favoritesManager.js";
import { cacheProfile, profileToUserState } from "./utils/profileMapper.js";
import {
  clearAccountStorage,
  getStorageItem,
  getStoredLanguage,
  readJsonStorage,
  removeStorageItem,
  setStorageItem,
  setStoredLanguage,
  STORAGE_KEYS,
  writeJsonStorage,
} from "./utils/storageKeys.js";
import { slides } from "./data/content.js";
import { defaultContent } from "./data/defaultContent.js";
import { currentRoute, navigate, useRoute } from "./utils/router.js";
import { setRouteMeta } from "./utils/seo.js";

// Screens other than home/auth load on demand, so visitors do not download the
// admin panel, partner dashboard and checkout up front.
const named = (loader, name) => lazy(() => loader().then((module) => ({ default: module[name] })));
const FilterPage = lazy(() => import("./components/FilterPage.jsx"));
const PartnerOnboarding = lazy(() => import("./components/PartnerOnboarding.jsx"));
const SpaceDetail = lazy(() => import("./components/SpaceDetail.jsx"));
const AgentDetail = lazy(() => import("./components/AgentDetail.jsx"));
const UserProfile = lazy(() => import("./components/UserProfile.jsx"));
const ProfileQuestionnaireEdit = named(() => import("./components/UserProfile.jsx"), "ProfileQuestionnaireEdit");
const AccountSettings = lazy(() => import("./components/AccountSettings.jsx"));
const HostDashboard = lazy(() => import("./components/HostDashboard.jsx"));
const AdminRouteGuard = lazy(() => import("./admin/AdminRouteGuard.jsx"));
const AboutUsPage = named(() => import("./components/StaticInfoPages.jsx"), "AboutUsPage");
const PartnerGuidePage = named(() => import("./components/StaticInfoPages.jsx"), "PartnerGuidePage");
const MobileInfoPage = lazy(() => import("./components/MobileInfoPage.jsx"));
const BookingCheckout = lazy(() => import("./components/BookingCheckout.jsx"));

function useUserState() {
  const readState = () => {
    try {
      return {
        isAuthed: Boolean(getStorageItem(STORAGE_KEYS.auth.access)),
        isPartner: getStorageItem(STORAGE_KEYS.profile.role) === "partner",
        name: getStorageItem(STORAGE_KEYS.profile.name, "Mehmon"),
        email: getStorageItem(STORAGE_KEYS.profile.email, ""),
        phone: getStorageItem(STORAGE_KEYS.profile.phone, ""),
        avatar: getStorageItem(STORAGE_KEYS.profile.avatar),
        activeBooking: readJsonStorage(STORAGE_KEYS.booking.active)
      };
    } catch (error) {
      return { isAuthed: false, isPartner: false, name: "Mehmon", email: "", phone: "", avatar: null, activeBooking: null };
    }
  };

  const [state, setState] = useState(readState);

  useEffect(() => {
    const handleSessionExpired = () => setState(readState());
    const handleProfileUpdate = (event) => {
      const profile = event.detail;
      if (!profile) return;
      setState((current) => ({
        ...current,
        id: profile.id ?? current.id,
        isAuthed: true,
        isPartner: profile.role === "partner",
        name: profile.full_name || profile.name || current.name,
        email: profile.email || "",
        phone: profile.phone_number || "",
        avatar: profile.avatar || null,
      }));
    };
    const handleStorage = (event) => {
      const watchedKeys = new Set([
        ...Object.values(STORAGE_KEYS.auth),
        ...Object.values(STORAGE_KEYS.profile),
        STORAGE_KEYS.booking.active,
      ]);
      if (!watchedKeys.has(event.key)) return;

      const nextState = readState();
      setState(nextState);
      if (event.key === STORAGE_KEYS.auth.generation && !nextState.isAuthed) {
        window.dispatchEvent(new CustomEvent("joyzone-session-expired", {
          detail: { reason: "remote_logout" },
        }));
        const protectedRoute = /^(?:profile|profile-edit|settings|book-|host-|admin)/.test(currentRoute());
        if (protectedRoute) navigate("/login");
      }
    };
    window.addEventListener("joyzone-session-expired", handleSessionExpired);
    window.addEventListener("joyzone-profile-update", handleProfileUpdate);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("joyzone-session-expired", handleSessionExpired);
      window.removeEventListener("joyzone-profile-update", handleProfileUpdate);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const updateState = (nextState) => {
    // A late profile response must not resurrect a session that was logged
    // out meanwhile (for example from another tab).
    if (nextState.isAuthed && !getStorageItem(STORAGE_KEYS.auth.access)) {
      setState(readState());
      return;
    }
    setState(nextState);
    try {
      if (nextState.isAuthed) {
        setStorageItem(STORAGE_KEYS.auth.authenticated, "true");
        setStorageItem(STORAGE_KEYS.profile.role, nextState.isPartner ? "partner" : "client");
        if (nextState.name) setStorageItem(STORAGE_KEYS.profile.name, nextState.name);
        setStorageItem(STORAGE_KEYS.profile.email, nextState.email || "");
        setStorageItem(STORAGE_KEYS.profile.phone, nextState.phone || "");
        if (nextState.avatar) {
          setStorageItem(STORAGE_KEYS.profile.avatar, nextState.avatar);
        } else if (nextState.avatar === null) {
          removeStorageItem(STORAGE_KEYS.profile.avatar);
        }
      } else {
        clearAccountStorage();
      }
      if (nextState.isAuthed && nextState.activeBooking) {
        writeJsonStorage(STORAGE_KEYS.booking.active, nextState.activeBooking);
      } else {
        removeStorageItem(STORAGE_KEYS.booking.active);
      }
      window.dispatchEvent(new Event("joyzone-auth-update"));
    } catch (error) {
      // UI still updates if storage is unavailable.
    }
  };

  return [state, updateState];
}

function SessionExpiredNotice({ message, onClose }) {
  if (!message) return null;
  return (
    <div
      role="status"
      data-testid="session-notice"
      style={{
        position: "fixed",
        left: "50%",
        top: 18,
        transform: "translateX(-50%)",
        zIndex: 10000,
        maxWidth: "calc(100vw - 32px)",
        padding: "12px 16px",
        borderRadius: 14,
        background: "#fff7ed",
        color: "#9a3412",
        boxShadow: "0 18px 60px rgba(15, 23, 42, 0.18)",
        border: "1px solid rgba(234, 88, 12, 0.22)",
        fontSize: 14,
        fontWeight: 800,
        display: "flex",
        alignItems: "center",
        gap: 12
      }}
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onClose}
        style={{
          border: 0,
          background: "transparent",
          color: "#9a3412",
          cursor: "pointer",
          fontWeight: 900,
          fontSize: 16,
          lineHeight: 1
        }}
        aria-label="Закрыть сообщение"
      >
        ×
      </button>
    </div>
  );
}

function AppContent() {
  const route = useRoute();
  const [displayedRoute, setDisplayedRoute] = useState(route);
  const [bootLoading, setBootLoading] = useState(true);
  const [userState, setUserState] = useUserState();
  const { lang } = React.useContext(LanguageContext);
  const [remoteBanners, setRemoteBanners] = useState(null);

  // Slider banners are managed in the admin panel (Контент → Баннеры). The
  // bundled slides are only a fallback when the API is unreachable.
  useEffect(() => {
    api.get("/api/content/banners/", { skipAuth: true })
      .then((res) => setRemoteBanners(Array.isArray(res.data) ? res.data : res.data?.results || []))
      .catch(() => setRemoteBanners(null));
  }, []);

  const banners = React.useMemo(() => {
    if (!remoteBanners?.length) return slides;
    return remoteBanners.map((banner) => ({
      id: banner.id,
      eyebrow: banner[`eyebrow_${lang}`] || banner.eyebrow_uz,
      title: banner[`title_${lang}`] || banner.title_uz,
      image: banner.image,
      link: banner.link,
    }));
  }, [remoteBanners, lang]);

  useEffect(() => {
    // Hide boot loader after short delay
    const timer = setTimeout(() => {
      setBootLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (route !== displayedRoute) {
      const currentScreen = document.querySelector(".route-screen");
      if (currentScreen) {
        gsap.to(currentScreen, {
          opacity: 0,
          y: 20,
          duration: 0.3,
          ease: "power2.in",
          onComplete: () => {
            setDisplayedRoute(route);
          }
        });
      } else {
        setDisplayedRoute(route);
      }
    }
  }, [route, displayedRoute]);

  useEffect(() => {
    setRouteMeta(displayedRoute);
  }, [displayedRoute]);

  useEffect(() => {
    if (bootLoading) return undefined;
    
    // Smooth scroll to hash or top on route mount
    const currentHash = window.location.hash.replace("#", "");
    const targetEl = currentHash ? document.getElementById(currentHash) : null;
    
    if (targetEl) {
      setTimeout(() => {
        targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } else {
      window.scrollTo({ top: 0, behavior: "instant" });
    }

    const screen = document.querySelector(".app-route-shell");
    if (screen) {
      gsap.killTweensOf(screen);
      gsap.fromTo(
        screen,
        {
          opacity: 0,
          y: 30,
          scale: 0.986,
          filter: "blur(12px)",
          clipPath: "inset(8% 0% 0% 0% round 24px)"
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          filter: "blur(0px)",
          clipPath: "inset(0% 0% 0% 0% round 0px)",
          duration: 0.64,
          ease: "expo.out",
          onComplete: () => {
            gsap.set(screen, { clearProps: "transform,scale,filter,clipPath" });
          }
        }
      );
    }
    return undefined;
  }, [displayedRoute, bootLoading]);

  useEffect(() => {
    if (bootLoading) return;
    
    const authPanel = document.querySelector(".auth-screen-panel");
    if (authPanel) {
      gsap.fromTo(
          authPanel,
          {
            opacity: 0,
            y: 34,
            scale: 0.965,
            rotateX: 3,
            filter: "blur(14px)",
            clipPath: "inset(12% 10% 12% 10% round 26px)"
          },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            rotateX: 0,
            filter: "blur(0px)",
            clipPath: "inset(0% 0% 0% 0% round 26px)",
            duration: 0.74,
            ease: "expo.out"
          }
        );
        gsap.fromTo(
          ".auth-screen-panel header, .auth-screen-panel h1, .auth-screen-panel p, .auth-screen-panel .form-field, .auth-screen-panel form button, .auth-screen-panel label, .auth-screen-panel main > button, .auth-screen-panel .otp-field, .auth-screen-panel .auth-motion-item, .auth-screen-panel .auth-link",
          { opacity: 0, y: 18, filter: "blur(7px)" },
          { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.52, stagger: 0.035, delay: 0.1, ease: "power3.out" }
        );
        gsap.fromTo(
          ".auth-screen-panel .slider-frame",
          { opacity: 0, scale: 1.035, x: displayedRoute === "register" ? 26 : -26, filter: "blur(10px)" },
          { opacity: 1, scale: 1, x: 0, filter: "blur(0px)", duration: 0.76, delay: 0.06, ease: "expo.out" }
        );
    }
  }, [displayedRoute, bootLoading]);

  useEffect(() => {
    const token = getStorageItem(STORAGE_KEYS.auth.access);
    if (token) {
      api.get("/api/auth/profile/")
        .then((res) => res.data)
        .then((profile) => {
          if (profile) {
            const normalized = cacheProfile(profile);
            setUserState(profileToUserState(normalized, userState));
          }
        })
        .catch((err) => console.warn("Failed to sync profile:", err));
    }
  }, []);

  const handleAuthSuccess = (profile) => {
    const normalized = cacheProfile(profile);
    setUserState(profileToUserState(normalized, userState));
    mergeAnonymousFavorites().catch((err) => console.warn("Failed to merge favorites after login:", err));
    navigate("/");
  };

  if (displayedRoute === "admin") {
    return <AdminRouteGuard />;
  }

  if (displayedRoute === "home") {
    return (
      <>
        <div className="route-screen route-screen-home app-route-shell">
          <HomeHero userState={userState} setUserState={setUserState} slides={banners} />
        </div>
        <JoyLoader active={bootLoading} />
        <FloatingBookingWidget activeBooking={userState.activeBooking} />
      </>
    );
  }

  if (displayedRoute === "filter") {
    return (
      <>
        <div className="route-screen route-screen-filter app-route-shell">
          <FilterPage userState={userState} setUserState={setUserState} />
        </div>
        <JoyLoader active={bootLoading} />
        <FloatingBookingWidget activeBooking={userState.activeBooking} />
      </>
    );
  }

  if (displayedRoute === "partner") {
    return (
      <>
        <div className="route-screen route-screen-partner app-route-shell">
          <PartnerOnboarding />
        </div>
        <JoyLoader active={bootLoading} />
      </>
    );
  }

  if (displayedRoute.startsWith("space-")) {
    return (
      <>
        <div className="route-screen route-screen-space-detail app-route-shell">
          <SpaceDetail route={displayedRoute} userState={userState} setUserState={setUserState} />
        </div>
        <JoyLoader active={bootLoading} />
        <FloatingBookingWidget activeBooking={userState.activeBooking} />
      </>
    );
  }

  if (displayedRoute.startsWith("agent-")) {
    return (
      <>
        <div className="route-screen route-screen-agent-detail app-route-shell">
          <AgentDetail route={displayedRoute} userState={userState} setUserState={setUserState} />
        </div>
        <JoyLoader active={bootLoading} />
        <FloatingBookingWidget activeBooking={userState.activeBooking} />
      </>
    );
  }

  if (displayedRoute.startsWith("book-")) {
    return (
      <>
        <div className="route-screen route-screen-booking-checkout app-route-shell">
          <BookingCheckout route={displayedRoute} userState={userState} setUserState={setUserState} />
        </div>
        <JoyLoader active={bootLoading} />
      </>
    );
  }

  if (displayedRoute === "profile") {
    return (
      <>
        <div className="route-screen route-screen-profile app-route-shell">
          <UserProfile userState={userState} setUserState={setUserState} />
        </div>
        <JoyLoader active={bootLoading} />
      </>
    );
  }

  if (displayedRoute === "profile-edit") {
    return (
      <>
        <div className="route-screen route-screen-profile-edit app-route-shell">
          <ProfileQuestionnaireEdit userState={userState} setUserState={setUserState} />
        </div>
        <JoyLoader active={bootLoading} />
      </>
    );
  }

  if (displayedRoute === "settings") {
    return (
      <>
        <div className="route-screen route-screen-settings app-route-shell">
          <AccountSettings userState={userState} setUserState={setUserState} />
        </div>
        <JoyLoader active={bootLoading} />
      </>
    );
  }

  if (displayedRoute === "about-us") {
    return (
      <>
        <div className="route-screen route-screen-about app-route-shell">
          <AboutUsPage />
        </div>
        <JoyLoader active={bootLoading} />
      </>
    );
  }

  if (displayedRoute === "mobile-info") {
    return (
      <>
        <div className="route-screen route-screen-mobile-info app-route-shell">
          <MobileInfoPage userState={userState} setUserState={setUserState} />
        </div>
        <JoyLoader active={bootLoading} />
      </>
    );
  }

  if (displayedRoute === "partner-guide") {
    return (
      <>
        <div className="route-screen route-screen-partner-guide app-route-shell">
          <PartnerGuidePage />
        </div>
        <JoyLoader active={bootLoading} />
      </>
    );
  }

  if (displayedRoute.startsWith("host-")) {
    return (
      <>
        <div className="route-screen route-screen-host app-route-shell">
          <HostDashboard page={displayedRoute.replace("host-", "")} userState={userState} setUserState={setUserState} />
        </div>
        <JoyLoader active={bootLoading} />
      </>
    );
  }

  if (displayedRoute === "verify") {
    return (
      <>
        <div className="auth-page-shell app-route-shell">
          <div className="joy-auth-shell flex justify-center">
            <div className="auth-screen-panel joy-card joy-card-center overflow-hidden rounded-[26px]">
              <VerifyCodeForm />
            </div>
          </div>
        </div>
        <JoyLoader active={bootLoading} />
      </>
    );
  }

  const formByRoute = {
    register: <AuthForm key="register" onSuccess={handleAuthSuccess} />,
    login: <LoginForm key="login" onSuccess={handleAuthSuccess} />,
    forgot: <ForgotPasswordForm key="forgot" />
  };

  return (
    <>
      <div className="auth-page-shell app-route-shell">
        <div className="joy-auth-shell flex justify-center">
          <div className="auth-screen-panel joy-card grid overflow-hidden rounded-[26px] min-[900px]:grid-cols-[49%_51%]">
            {displayedRoute === "register" ? (
              formByRoute.register
            ) : (
              <div className="order-1 min-h-[inherit] min-[900px]:order-2">{formByRoute[displayedRoute] || formByRoute.login}</div>
            )}
            <div className={displayedRoute === "register" ? "order-2 hidden min-[900px]:flex min-h-[420px] overflow-hidden p-2 sm:p-3 min-[900px]:order-1 min-[900px]:min-h-[660px] min-[1024px]:min-h-[820px] lg:p-2" : "hidden min-[900px]:flex min-h-[420px] overflow-hidden p-2 sm:p-3 min-[900px]:min-h-[660px] min-[1024px]:min-h-[820px] lg:p-2"}>
              <JoySlider items={banners} />
            </div>
          </div>
        </div>
      </div>
      <JoyLoader active={bootLoading} />
    </>
  );
}

export default function App() {
  const [lang, setLang] = useState(() => getStoredLanguage('uz'));
  const [content, setContent] = useState(defaultContent);
  const [contentLoading, setContentLoading] = useState(true);
  const [contentError, setContentError] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeChatId, setActiveChatId] = useState(null);
  const [sessionMessage, setSessionMessage] = useState("");

  useEffect(() => {
    // Determine if we are inside an iframe
    if (window.self !== window.top) {
      setIsEditMode(true);
    }
    syncChatsWithBackend();
  }, []);

  useEffect(() => {
    setStoredLanguage(lang);
  }, [lang]);

  const loadSiteContent = useCallback(async () => {
    setContentLoading(true);
    try {
      const response = await api.get("/api/content/", { skipAuth: true });
      setContent(mergeSiteContent(response.data));
      setContentError("");
    } catch (error) {
      console.error("Failed to fetch content", error);
      setContent(mergeSiteContent());
      setContentError("CMS content is unavailable; default content is shown.");
    } finally {
      setContentLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSiteContent();
    window.addEventListener("joyzone-content-updated", loadSiteContent);
    return () => window.removeEventListener("joyzone-content-updated", loadSiteContent);
  }, [loadSiteContent]);

  useEffect(() => {
    const handleMessage = (e) => {
      // Future message handling if needed from iframe
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    let noticeTimer;
    const showSessionMessage = (message) => {
      window.clearTimeout(noticeTimer);
      setSessionMessage(message);
      noticeTimer = window.setTimeout(() => setSessionMessage(""), 6000);
    };
    const handleSessionExpired = () => {
      showSessionMessage("Сессия истекла, войдите снова.");
    };
    const handleSessionError = (event) => {
      showSessionMessage(
        event.detail?.message
        || "Не удалось обновить сессию. Проверьте соединение и повторите действие."
      );
    };
    window.addEventListener("joyzone-session-expired", handleSessionExpired);
    window.addEventListener("joyzone-session-error", handleSessionError);
    return () => {
      window.clearTimeout(noticeTimer);
      window.removeEventListener("joyzone-session-expired", handleSessionExpired);
      window.removeEventListener("joyzone-session-error", handleSessionError);
    };
  }, []);

  return (
    <LanguageContext.Provider value={{ lang, setLang, content, contentLoading, contentError, isEditMode }}>
      <SessionExpiredNotice message={sessionMessage} onClose={() => setSessionMessage("")} />
      <Suspense fallback={<JoyLoader active={true} />}>
        <AppContent />
      </Suspense>
      <FloatingNotificationBell onOpenChat={(id) => setActiveChatId(id)} />
      <ChatNotificationToast onOpenChat={(id) => setActiveChatId(id)} />
      {activeChatId && (
        <DirectChatDrawer
          chatId={activeChatId}
          onClose={() => setActiveChatId(null)}
        />
      )}
    </LanguageContext.Provider>
  );
}
