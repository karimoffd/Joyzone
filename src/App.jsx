import React, { useEffect, useState } from "react";
import { gsap } from "gsap";
import HomeHero from "./components/HomeHero.jsx";
import FilterPage from "./components/FilterPage.jsx";
import JoySlider from "./components/JoySlider.jsx";
import { AuthForm, LoginForm, ForgotPasswordForm, VerifyCodeForm } from "./components/AuthScreens.jsx";
import JoyLoader from "./components/JoyLoader.jsx";
import { slides } from "./data/content.js";

function useAuthRoute() {
  const knownRoutes = new Set(["home", "filter", "register", "login", "forgot", "verify"]);
  const readRoute = () => {
    const hash = (window.location.hash || "#home").replace("#", "") || "home";
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
        isPartner: localStorage.getItem("joyzone-role") === "partner"
      };
    } catch (error) {
      return { isAuthed: false, isPartner: false };
    }
  };

  const [state, setState] = useState(readState);

  const updateState = (nextState) => {
    setState(nextState);
    try {
      localStorage.setItem("joyzone-auth", nextState.isAuthed ? "true" : "false");
      localStorage.setItem("joyzone-role", nextState.isPartner ? "partner" : "client");
    } catch (error) {
      // UI still updates if storage is unavailable.
    }
  };

  return [state, updateState];
}

function App() {
  const route = useAuthRoute();
  const [displayedRoute, setDisplayedRoute] = useState(route);
  const [bootLoading, setBootLoading] = useState(true);
  const [userState, setUserState] = useUserState();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setBootLoading(false);
    }, 1150);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (route === displayedRoute) return;
    const panel = document.querySelector(".auth-screen-panel");
    if (panel) {
      gsap.to(panel, {
        opacity: 0,
        y: -22,
        scale: 0.982,
        filter: "blur(10px)",
        duration: 0.24,
        ease: "power2.in"
      });
    }
    const swapTimer = window.setTimeout(() => {
      setDisplayedRoute(route);
    }, 260);
    return () => window.clearTimeout(swapTimer);
  }, [route, displayedRoute]);

  useEffect(() => {
    if (bootLoading) return;
    gsap.fromTo(
        ".auth-screen-panel",
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
  }, [displayedRoute, bootLoading]);

  const handleRegister = () => {
    setUserState({ isAuthed: true, isPartner: false });
    window.location.hash = "#home";
  };

  const handleLogin = () => {
    setUserState({ isAuthed: true, isPartner: false });
    window.location.hash = "#home";
  };

  if (displayedRoute === "home") {
    return (
      <>
        <HomeHero userState={userState} setUserState={setUserState} slides={slides} />
        <JoyLoader active={bootLoading} />
      </>
    );
  }

  if (displayedRoute === "filter") {
    return (
      <>
        <FilterPage />
        <JoyLoader active={bootLoading} />
      </>
    );
  }

  if (displayedRoute === "verify") {
    return (
      <>
        <div className="joy-auth-shell flex justify-center">
          <div className="auth-screen-panel joy-card joy-card-center overflow-hidden rounded-[26px]">
            <VerifyCodeForm />
          </div>
        </div>
        <JoyLoader active={bootLoading} />
      </>
    );
  }

  const formByRoute = {
    register: <AuthForm key="register" onRegister={handleRegister} />,
    login: <LoginForm key="login" onLogin={handleLogin} />,
    forgot: <ForgotPasswordForm key="forgot" />
  };

  return (
    <>
      <div className="joy-auth-shell flex justify-center">
        <div className="auth-screen-panel joy-card grid overflow-hidden rounded-[26px] min-[900px]:grid-cols-[49%_51%]">
          {displayedRoute === "register" ? (
            formByRoute.register
          ) : (
            <div className="order-1 min-h-[inherit] min-[900px]:order-2">{formByRoute[displayedRoute] || formByRoute.login}</div>
          )}
          <div className={displayedRoute === "register" ? "order-2 flex min-h-[420px] overflow-hidden p-2 sm:p-3 min-[900px]:order-1 min-[900px]:min-h-[660px] min-[1024px]:min-h-[820px] lg:p-2" : "flex min-h-[420px] overflow-hidden p-2 sm:p-3 min-[900px]:min-h-[660px] min-[1024px]:min-h-[820px] lg:p-2"}>
            <JoySlider items={slides} />
          </div>
        </div>
      </div>
      <JoyLoader active={bootLoading} />
    </>
  );
}

export default App;
