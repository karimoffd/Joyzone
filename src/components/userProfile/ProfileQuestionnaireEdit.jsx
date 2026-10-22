import { BACKEND_PROFILE_DRAFT_KEYS, initialProfile, getCompletion, ProfileIcon, profileSections } from "./helpers.jsx";
import React, { useMemo, useState, useEffect } from "react";
import api, { getApiErrorMessage } from "../../api/client.js";
import { Header as JoyNavbar } from "../HomeHero.jsx";
import { cacheProfile, normalizeProfile, profileToUserState, questionnaireFromProfile, questionnaireToDetails } from "../../utils/profileMapper.js";
import { readJsonStorage, removeStorageItem, STORAGE_KEYS } from "../../utils/storageKeys.js";

export function ProfileEditFormSection({ section, draft, onDraftChange }) {
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
            <span>
              {field.label}
              {!BACKEND_PROFILE_DRAFT_KEYS.has(field.key) ? " · faqat shu qurilmada" : ""}
            </span>
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

export function ProfileQuestionnaireEdit({ userState, setUserState }) {
  const [draft, setDraft] = useState(initialProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const completion = useMemo(() => getCompletion(draft), [draft]);

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await api.get("/api/auth/profile/");
        if (!active) return;
        const profile = normalizeProfile(response.data);
        // Older builds kept the questionnaire in localStorage; it is moved to the account on the next save.
        const legacyLocal = readJsonStorage(STORAGE_KEYS.profile.localQuestionnaire, {});
        setDraft({
          ...initialProfile,
          ...questionnaireFromProfile(response.data, legacyLocal),
          name: profile.full_name,
          firstName: profile.first_name,
          lastName: profile.last_name,
          email: profile.email,
          phone: profile.phone_number,
        });
      } catch (requestError) {
        if (active) setError(getApiErrorMessage(requestError, "Profilni yuklab bo'lmadi"));
      } finally {
        if (active) setLoading(false);
      }
    };
    loadProfile();
    return () => { active = false; };
  }, []);

  const updateDraft = (key, value) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const saveProfile = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await api.patch("/api/auth/profile/", {
        first_name: draft.firstName.trim(),
        last_name: draft.lastName.trim(),
        email: draft.email.trim(),
        phone_number: draft.phone.trim(),
        profile_details: questionnaireToDetails(draft),
      });
      const profile = cacheProfile(response.data);
      setUserState?.(profileToUserState(profile, userState));
      removeStorageItem(STORAGE_KEYS.profile.localQuestionnaire);
      setSuccess("Profil saqlandi");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Profilni saqlab bo'lmadi"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="user-profile-shell profile-edit-page-shell">
      <JoyNavbar userState={userState} setUserState={setUserState} activeIndex={-1} variant="dashboard" />
      <section className="profile-unified-panel profile-editor-panel">
        <div className="profile-editor-top">
          <a href="/profile" className="profile-cancel-action">
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
            <h3>{`${draft.firstName} ${draft.lastName}`.trim() || "Profilingiz"}</h3>
            <p>{draft.city || "Shahar"} · {draft.work || "Soha"}</p>
            <div>
              <span>{draft.languages || "Tillar"}</span>
              <span>{draft.interests || "Qiziqishlar"}</span>
            </div>
          </aside>

          <div className="profile-edit-list">
            {loading ? <p role="status">Profil yuklanmoqda...</p> : null}
            {error ? <p role="alert" style={{ color: "#b91c1c", fontWeight: 700 }}>{error}</p> : null}
            {success ? <p role="status" style={{ color: "#15803d", fontWeight: 700 }}>{success}</p> : null}
            {!loading && profileSections.map((section) => (
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
          <a href="/profile" className="profile-cancel-action">Bekor qilish</a>
          <button type="button" className="profile-save-action" onClick={saveProfile} disabled={loading || saving}>
            {saving ? "Saqlanmoqda..." : success || "Saqlash"}
          </button>
        </div>
      </section>
    </main>
  );
}
