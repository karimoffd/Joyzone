import React, { useState, useEffect, useContext } from "react";
import api, { getAccessToken, getApiErrorMessage } from "../../api/client.js";
import { LanguageContext } from "../../context/LanguageContext.jsx";
import PaymentModal from "../PaymentModal.jsx";

export function HostTariffsPage({ showToast, profile, fetchProfile }) {
  const [tariffs, setTariffs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(null);
  const [paymentTarget, setPaymentTarget] = useState(null);
  const { lang } = useContext(LanguageContext);

  const fetchTariffs = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/tariffs/");
      setTariffs(res.data?.results || res.data || []);
    } catch (e) {
      showToast(getApiErrorMessage(e, "Не удалось загрузить тарифы."), "error");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTariffs();
  }, []);

  const handleSubscribe = async (tariff) => {
    const token = getAccessToken();
    if (!token) {
      showToast("Войдите в аккаунт, чтобы выбрать тариф.", "error");
      return;
    }
    setSubmitting(tariff.id);

    try {
      const res = await api.post(
        "/api/tariffs/subscribe/",
        { tariff_id: tariff.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.requires_payment) {
        if (!res.data?.subscription_id) {
          throw new Error("Backend не вернул subscription_id для оплаты.");
        }
        setPaymentTarget({
          ...tariff,
          subscriptionId: res.data?.subscription_id,
          subscriptionStatus: res.data?.status
        });
        return;
      }

      if (res.data?.status !== "active") {
        throw new Error("Backend не подтвердил активацию бесплатного тарифа.");
      }

      const refreshedProfile = await fetchProfile();
      if (!refreshedProfile) {
        throw new Error("Тариф активирован, но профиль не удалось обновить.");
      }

      showToast(`Тариф «${tariff.name_ru || tariff.name}» успешно активирован!`, "success");
    } catch (e) {
      const errMsg = getApiErrorMessage(e, "Не удалось выбрать тариф");
      showToast(`Ошибка: ${errMsg}`, "error");
    } finally {
      setSubmitting(null);
    }
  };

  const formatPrice = (t) => {
    if (t.is_free) return "Бесплатно";
    return new Intl.NumberFormat("ru-RU").format(t.price) + " UZS";
  };

  return (
    <section className="host-main-surface">
      {/* Current Tariff Info Card */}
      {profile && (
        <div className="host-current-tariff-card" style={{
          background: "linear-gradient(135deg, #1e1e38 0%, #111122 100%)",
          color: "#fff",
          padding: "24px 28px",
          borderRadius: "20px",
          marginBottom: "32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "20px",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.15)",
          border: "1px solid rgba(255, 255, 255, 0.08)"
        }}>
          <div>
            <span style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "1.5px", color: "var(--orange)", fontWeight: 700 }}>Текущий тариф</span>
            <h2 style={{ fontSize: "28px", fontWeight: 800, margin: "6px 0", color: "#fff" }}>
              {profile.tariff_details ? (profile.tariff_details.name_ru || profile.tariff_details.name) : "Базовый (Standard)"}
            </h2>
            <p style={{ color: "#94a3b8", fontSize: "14px", margin: 0 }}>
              Лимит: <strong>{profile.tariff_details ? profile.tariff_details.max_places : 1}</strong> активных объявлений
            </p>
          </div>
          {profile.tariff_expires_at && (
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "12px", color: "#94a3b8", display: "block" }}>Активен до:</span>
              <strong style={{ fontSize: "16px", color: "#22c55e" }}>
                {new Date(profile.tariff_expires_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
              </strong>
            </div>
          )}
        </div>
      )}

      <div className="host-section-head" style={{ marginBottom: "24px" }}>
        <div>
          <span>Сравнение тарифов</span>
          <h2>Тарифные планы</h2>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <div className="joy-spinner" style={{ display: "inline-block", width: 40, height: 40, border: "3px solid rgba(228, 102, 48, 0.2)", borderTopColor: "var(--orange)", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
        </div>
      ) : (
        <div className="host-tariffs-grid" style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "24px"
        }}>
          {tariffs.map(t => {
            const isCurrent = profile?.tariff === t.id || (!profile?.tariff && t.slug === 'standard');
            const name = t.name_ru || t.name;
            const features = t.features_ru || t.features || [];
            const isPremium = t.slug === 'premium';
            
            return (
              <div key={t.id} className={`tariff-card ${isPremium ? 'tariff-card--premium' : ''}`} style={{
                background: "#fff",
                border: isCurrent ? "2.5px solid var(--orange)" : "1px solid #e2e8f0",
                borderRadius: "20px",
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                position: "relative",
                boxShadow: isCurrent ? "0 10px 25px rgba(228, 102, 48, 0.12)" : "0 4px 12px rgba(0,0,0,0.03)",
                transition: "all 0.3s ease"
              }}>
                {isCurrent && (
                  <span style={{
                    position: "absolute",
                    top: "-12px",
                    left: "24px",
                    background: "var(--orange)",
                    color: "#fff",
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "3px 12px",
                    borderRadius: "10px",
                    textTransform: "uppercase"
                  }}>Активен</span>
                )}

                <div>
                  <h3 style={{ fontSize: "20px", fontWeight: 800, margin: "0 0 8px 0" }}>{name}</h3>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "4px", margin: "12px 0 20px 0" }}>
                    <strong style={{ fontSize: "24px", fontWeight: 800 }}>{formatPrice(t)}</strong>
                    {!t.is_free && <span style={{ color: "#64748b", fontSize: "13px" }}>/ мес</span>}
                  </div>

                  <ul style={{ listStyle: "none", padding: 0, margin: "20px 0", display: "flex", flexDirection: "column", gap: "12px" }}>
                    <li style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 600 }}>
                      <span style={{ color: "var(--orange)" }}>✓</span>
                      Лимит мест: {t.max_places}
                    </li>
                    {features.map((f, i) => (
                      <li key={i} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#475569" }}>
                        <span style={{ color: "#22c55e" }}>✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => handleSubscribe(t)}
                  disabled={isCurrent || submitting === t.id}
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: "12px",
                    border: "none",
                    fontWeight: 700,
                    cursor: isCurrent ? "default" : "pointer",
                    background: isCurrent ? "#e2e8f0" : "var(--orange)",
                    color: isCurrent ? "#64748b" : "#fff",
                    transition: "all 0.2s ease"
                  }}
                >
                  {submitting === t.id ? "Обработка..." : isCurrent ? "Ваш текущий тариф" : "Выбрать тариф"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {paymentTarget && (
        <PaymentModal
          isOpen={!!paymentTarget}
          onClose={() => setPaymentTarget(null)}
          amount={formatPrice(paymentTarget)}
          title="Покупка тарифа"
          defaultPhone={profile?.phone_number}
          productDetails={{
            subscriptionId: paymentTarget.subscriptionId,
            name: paymentTarget.name_ru || paymentTarget.name,
            description: paymentTarget.description_ru || paymentTarget.description,
            limit: paymentTarget.max_places
          }}
          onSuccess={async () => {
            const t = paymentTarget;
            const refreshedProfile = await fetchProfile();
            if (!refreshedProfile) {
              throw new Error("Оплата прошла, но профиль не удалось обновить. Обновите страницу.");
            }
            showToast(`Тариф «${t.name_ru || t.name}» успешно оплачен и активирован!`, "success");
          }}
        />
      )}
    </section>
  );
}
