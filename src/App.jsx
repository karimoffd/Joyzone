import React, { useEffect, useState, createContext } from "react";
import axios from "axios";
import { gsap } from "gsap";
import HomeHero from "./components/HomeHero.jsx";

export const LanguageContext = createContext({
  lang: 'uz',
  setLang: () => {},
  content: null,
  isEditMode: false,
});
import FilterPage from "./components/FilterPage.jsx";
import PartnerOnboarding from "./components/PartnerOnboarding.jsx";
import JoySlider from "./components/JoySlider.jsx";
import SpaceDetail from "./components/SpaceDetail.jsx";
import AgentDetail from "./components/AgentDetail.jsx";
import UserProfile, { ProfileQuestionnaireEdit } from "./components/UserProfile.jsx";
import AccountSettings from "./components/AccountSettings.jsx";
import HostDashboard from "./components/HostDashboard.jsx";
import CardVariants from "./components/CardVariants.jsx";
import AdminDashboardIntegration from "../admin-dashboard-example/admin-integration.jsx";
import AdminApp from "./admin/AdminApp.jsx";
import { AboutUsPage, PartnerGuidePage, FooterVariantPage } from "./components/StaticInfoPages.jsx";
import MobileInfoPage from "./components/MobileInfoPage.jsx";
import { AuthForm, LoginForm, ForgotPasswordForm, VerifyCodeForm } from "./components/AuthScreens.jsx";
import { propertyCards } from "./data/content.js";
import JoyLoader from "./components/JoyLoader.jsx";
import BookingCheckout from "./components/BookingCheckout.jsx";
import FloatingBookingWidget from "./components/FloatingBookingWidget.jsx";
import { slides } from "./data/content.js";
import { defaultContent } from "./data/defaultContent.js";

function useAuthRoute() {
  const knownRoutes = new Set(["home", "filter", "partner", "profile", "profile-edit", "settings", "card-variants", "about-us", "mobile-info", "partner-guide", "footer-variant", "host-today", "host-calendar", "host-listings", "host-messages", "register", "login", "forgot", "verify", "admin"]);
  const readRoute = () => {
    const hash = (window.location.hash || "#home").replace("#", "") || "home";
    if (hash.startsWith("space-")) return hash;
    if (hash.startsWith("agent-")) return hash;
    if (hash.startsWith("book-")) return hash;
    return knownRoutes.has(hash) ? hash : "home";
  };
  const [route, setRoute] = useState(readRoute);

  useEffect(() => {
    const onHashChange = () => setRoute(readRoute());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return route;
}

function useUserState() {
  const readState = () => {
    try {
      return {
        isAuthed: localStorage.getItem("joyzone-auth") === "true",
        isPartner: localStorage.getItem("joyzone-role") === "partner",
        name: localStorage.getItem("joyzone-name") || "Mehmon",
        email: localStorage.getItem("joyzone-email") || "",
        activeBooking: JSON.parse(localStorage.getItem("joyzone-booking") || "null")
      };
    } catch (error) {
      return { isAuthed: false, isPartner: false, name: "Mehmon", email: "", activeBooking: null };
    }
  };

  const [state, setState] = useState(readState);

  const updateState = (nextState) => {
    setState(nextState);
    try {
      localStorage.setItem("joyzone-auth", nextState.isAuthed ? "true" : "false");
      localStorage.setItem("joyzone-role", nextState.isPartner ? "partner" : "client");
      if (nextState.isAuthed) {
        if (nextState.name) localStorage.setItem("joyzone-name", nextState.name);
        if (nextState.email) localStorage.setItem("joyzone-email", nextState.email);
      } else {
        localStorage.removeItem("joyzone-name");
        localStorage.removeItem("joyzone-email");
        localStorage.removeItem("joyzone-access");
        localStorage.removeItem("joyzone-refresh");
      }
      if (nextState.activeBooking) {
        localStorage.setItem("joyzone-booking", JSON.stringify(nextState.activeBooking));
      } else {
        localStorage.removeItem("joyzone-booking");
      }
    } catch (error) {
      // UI still updates if storage is unavailable.
    }
  };

  return [state, updateState];
}

function AppContent() {
  const route = useAuthRoute();
  const [displayedRoute, setDisplayedRoute] = useState(route);
  const [bootLoading, setBootLoading] = useState(true);
  const [userState, setUserState] = useUserState();
  const [banners, setBanners] = useState(slides);
  // Language state moved to App component

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

  const handleAuthSuccess = (profile) => {
    setUserState({ 
      isAuthed: true, 
      isPartner: profile.role === "partner", 
      name: profile.first_name ? `${profile.first_name} ${profile.last_name}`.trim() : (profile.username || "Foydalanuvchi"), 
      email: profile.email || profile.phone_number 
    });
    window.location.hash = "#home";
  };

  if (displayedRoute === "admin") {
    return <AdminApp />;
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
        <FloatingBookingWidget activeBooking={userState.activeBooking} />
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
          <AccountSettings />
        </div>
        <JoyLoader active={bootLoading} />
      </>
    );
  }

  if (displayedRoute === "card-variants") {
    return (
      <>
        <div className="route-screen route-screen-card-variants app-route-shell">
          <CardVariants />
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

  if (displayedRoute === "footer-variant") {
    return (
      <>
        <div className="route-screen route-screen-footer-variant app-route-shell">
          <FooterVariantPage />
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

if (displayedRoute === "admin") {
  return (
    <>
      <div className="route-screen route-screen-admin app-route-shell">
        <AdminDashboardIntegration />
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
  const [lang, setLang] = useState(localStorage.getItem('joyzone-lang') || 'uz');
  const [content, setContent] = useState(defaultContent);
  const [isEditMode, setIsEditMode] = useState(false);
  const [placesLoaded, setPlacesLoaded] = useState(false);

  useEffect(() => {
    // Determine if we are inside an iframe
    if (window.self !== window.top) {
      setIsEditMode(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('joyzone-lang', lang);
  }, [lang]);

  useEffect(() => {
    // Fetch places first, then content
    axios.get("http://localhost:8000/api/places/")
      .then((res) => {
        const backendPlaces = (res.data?.results || res.data || []).map((place, idx) => ({
          id: place.id,
          title: place.title,
          category: place.category,
          location: place.location,
          price: place.price,
          prices: {
            soatlik: place.price.toLowerCase().includes("soat") ? place.price : null,
            kunlik: place.price.toLowerCase().includes("kun") ? place.price : place.price,
            haftalik: place.price.toLowerCase().includes("hafta") ? place.price : null,
            oylik: place.price.toLowerCase().includes("oy") ? place.price : null
          },
          people: place.people,
          area: place.area,
          images: place.images && place.images.length > 0 ? place.images : [
            "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80"
          ],
          promoted: place.promoted
        }));
        if (backendPlaces.length > 0) {
          propertyCards.splice(0, propertyCards.length, ...backendPlaces);
        }
        setPlacesLoaded(true);
      })
      .catch((err) => {
        console.error("Failed to fetch places", err);
        setPlacesLoaded(true);
      });
  }, []);

  useEffect(() => {
    axios.get("http://localhost:8000/api/content/")
      .then((res) => {
        const fetched = res.data || {};
        let dataToMerge = fetched;
        if (fetched.data) dataToMerge = fetched.data;

        const merged = { ...defaultContent };
        ['uz', 'ru', 'en'].forEach(l => {
          if (dataToMerge[l]) {
            merged[l] = { ...merged[l], ...dataToMerge[l] };
          }
        });
        setContent(merged);
      })
      .catch((err) => {
        console.error("Failed to fetch content", err);
        setContent(defaultContent);
      });
  }, []);

  useEffect(() => {
    const handleMessage = (e) => {
      // Future message handling if needed from iframe
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (!placesLoaded) {
    return <JoyLoader />;
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, content, isEditMode }}>
      <AppContent />
    </LanguageContext.Provider>
  );
}
