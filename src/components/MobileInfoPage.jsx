import React from "react";
import { Header } from "./HomeHero.jsx";
import { BenefitsSection, ReviewsFaqSection, JoyFooter } from "./ListingsSection.jsx";
import FloatingBookingWidget from "./FloatingBookingWidget.jsx";

export default function MobileInfoPage({ userState, setUserState }) {
  return (
    <>
      <div className="mobile-info-page app-route-shell" style={{ overflowY: "auto", height: "100vh", backgroundColor: "#f4f7fb" }}>
        <Header userState={userState} setUserState={setUserState} activeIndex={-1} />
        <div style={{ paddingTop: "72px", paddingBottom: "40px" }}>
          <BenefitsSection />
          <ReviewsFaqSection />
          <div style={{ marginTop: "40px" }}>
            <JoyFooter />
          </div>
        </div>
      </div>
      <FloatingBookingWidget activeBooking={userState?.activeBooking} />
    </>
  );
}
