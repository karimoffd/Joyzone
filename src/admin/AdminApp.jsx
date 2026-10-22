import React, { useEffect, useMemo, useState } from "react";
import { getStorageItem, setStorageItem, STORAGE_KEYS } from "../utils/storageKeys.js";
import "./admin.css";
import AdminLayout from "./AdminLayout.jsx";
import OverviewPage from "./pages/OverviewPage.jsx";
import BookingsPage from "./pages/BookingsPage.jsx";
import SpacesPage from "./pages/SpacesPage.jsx";
import UsersPage from "./pages/UsersPage.jsx";
import FinancePage from "./pages/FinancePage.jsx";
import ReviewsPage from "./pages/ReviewsPage.jsx";
import ContentPage from "./pages/ContentPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import MessagesPage from "./pages/AdminMessagesPage.jsx";
import ModerationPage from "./pages/ModerationPage.jsx";
import TariffsPage from "./pages/TariffsPage.jsx";
import CategoriesPage from "./pages/CategoriesPage.jsx";
import ParametersPage from "./pages/ParametersPage.jsx";
import AmenitiesPage from "./pages/AmenitiesPage.jsx";
import DiscountsPage from "./pages/DiscountsPage.jsx";
import AuditLogPage from "./pages/AuditLogPage.jsx";
import BannersPage from "./pages/BannersPage.jsx";

// adminOnly mirrors core.permissions.ADMIN_ONLY_SECTIONS; the backend sends the
// exact list in profile.admin_sections, this is only a fallback for old caches.
export const PAGES = {
  overview:   { title: "Обзор",               eyebrow: "Дашборд",      component: OverviewPage },
  bookings:   { title: "Бронирования",        eyebrow: "Операции",     component: BookingsPage },
  spaces:     { title: "Пространства",        eyebrow: "Операции",     component: SpacesPage },
  moderation: { title: "Модерация мест",      eyebrow: "Операции",     component: ModerationPage },
  messages:   { title: "Сообщения",           eyebrow: "Общение",      component: MessagesPage },
  reviews:    { title: "Отзывы",              eyebrow: "Общение",      component: ReviewsPage },
  content:    { title: "Контент сайта",       eyebrow: "Сайт",         component: ContentPage },
  banners:    { title: "Баннеры",             eyebrow: "Сайт",         component: BannersPage },
  users:      { title: "Пользователи",        eyebrow: "Управление",   component: UsersPage, adminOnly: true },
  finance:    { title: "Финансы",             eyebrow: "Управление",   component: FinancePage, adminOnly: true },
  audit:      { title: "Журнал действий",     eyebrow: "Управление",   component: AuditLogPage, adminOnly: true },
  tariffs:    { title: "Тарифы",              eyebrow: "Справочники",  component: TariffsPage, adminOnly: true },
  categories: { title: "Категории",           eyebrow: "Справочники",  component: CategoriesPage, adminOnly: true },
  amenities:  { title: "Удобства",            eyebrow: "Справочники",  component: AmenitiesPage, adminOnly: true },
  parameters: { title: "Счётчики и характеристики", eyebrow: "Справочники", component: ParametersPage, adminOnly: true },
  discounts:  { title: "Скидки",              eyebrow: "Справочники",  component: DiscountsPage, adminOnly: true },
  settings:   { title: "Мой профиль",         eyebrow: "Аккаунт",      component: SettingsPage },
};

export function hasAdminShellAccess(profile) {
  return Boolean(
    profile
    && (
      profile.role === "admin"
      || profile.role === "moderator"
      || profile.is_staff
      || profile.is_superuser
    )
  );
}

export function isFullAdmin(profile) {
  return Boolean(profile && (profile.role === "admin" || profile.is_staff || profile.is_superuser));
}

export function getAllowedAdminPages(profile) {
  if (!hasAdminShellAccess(profile)) return [];
  if (Array.isArray(profile.admin_sections)) {
    return Object.keys(PAGES).filter((id) => profile.admin_sections.includes(id));
  }
  const hasFullAccess = isFullAdmin(profile);
  return Object.keys(PAGES).filter((id) => hasFullAccess || !PAGES[id].adminOnly);
}

export default function AdminApp({ profile: initialProfile }) {
  const [profile, setProfile] = useState(initialProfile);
  const allowedPages = useMemo(() => getAllowedAdminPages(profile), [profile]);
  const [page, setPage] = useState(() => {
    const savedPage = getStorageItem(STORAGE_KEYS.workflow.adminPage);
    return PAGES[savedPage] ? savedPage : "overview";
  });
  const safePage = allowedPages.includes(page) ? page : (allowedPages[0] || "overview");

  useEffect(() => setProfile(initialProfile), [initialProfile]);

  // Settings saves the profile; keep the sidebar name and photo in sync.
  useEffect(() => {
    const handleProfileUpdate = (event) => {
      if (event.detail) setProfile((current) => ({ ...current, ...event.detail }));
    };
    window.addEventListener("joyzone-profile-update", handleProfileUpdate);
    return () => window.removeEventListener("joyzone-profile-update", handleProfileUpdate);
  }, []);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
    setStorageItem(STORAGE_KEYS.workflow.adminPage, safePage);
  }, [page, safePage]);

  const currentPage = PAGES[safePage] || PAGES.overview;
  const PageComponent = currentPage.component;
  const selectPage = (nextPage) => {
    if (allowedPages.includes(nextPage)) {
      setPage(nextPage);
      window.scrollTo({ top: 0 });
    }
  };

  return (
    <AdminLayout
      page={safePage}
      setPage={selectPage}
      title={currentPage.title}
      eyebrow={currentPage.eyebrow}
      allowedPages={allowedPages}
      profile={profile}
    >
      <PageComponent setPage={selectPage} profile={profile} allowedPages={allowedPages} />
    </AdminLayout>
  );
}
