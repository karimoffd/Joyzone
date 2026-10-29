import React from "react";
import { Header } from "./HomeHero.jsx";
import { BenefitsSection, ReviewsFaqSection, JoyFooter, FooterQuestionStrip } from "./ListingsSection.jsx";
import FloatingBookingWidget from "./FloatingBookingWidget.jsx";
import { useSiteContent } from "../context/LanguageContext.jsx";

export default function MobileInfoPage({ userState, setUserState }) {
  const { cms } = useSiteContent();
  return (
    <>
      <div className="mobile-info-page app-route-shell" style={{ overflowY: "auto", height: "100vh", backgroundColor: "#f4f7fb" }}>
        <Header userState={userState} setUserState={setUserState} activeIndex={-1} />
        <div style={{ paddingTop: "72px", paddingBottom: "40px" }}>
          <BenefitsSection cms={cms} />
          <ReviewsFaqSection cms={cms} />
          <div style={{ marginTop: "40px" }}>
            <FooterQuestionStrip cms={cms} />
            <JoyFooter cms={cms} />
          </div>
        </div>
      </div>
      <FloatingBookingWidget activeBooking={userState?.activeBooking} />
    </>
  );
}
