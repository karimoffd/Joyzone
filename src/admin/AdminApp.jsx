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

const PAGES = {
  overview:   { title: "Обзор",          eyebrow: "Главная",      component: OverviewPage },
  bookings:   { title: "Бронирования",   eyebrow: "Управление",   component: BookingsPage },
  spaces:     { title: "Пространства",   eyebrow: "Управление",   component: SpacesPage },
  moderation: { title: "Модерация мест", eyebrow: "Проверка",     component: ModerationPage },
  users:      { title: "Пользователи",   eyebrow: "Управление",   component: UsersPage, adminOnly: true },
  messages:   { title: "Сообщения",      eyebrow: "Коммуникация", component: MessagesPage },
  reviews:    { title: "Отзывы",         eyebrow: "Репутация",    component: ReviewsPage },
  finance:    { title: "Финансы",        eyebrow: "Аналитика",    component: FinancePage, adminOnly: true },
  audit:      { title: "Журнал действий", eyebrow: "Безопасность", component: AuditLogPage },
  tariffs:    { title: "Тарифы",         eyebrow: "Платформа",    component: TariffsPage },
  categories: { title: "Категории",       eyebrow: "Платформа",    component: CategoriesPage },
  amenities:  { title: "Список удобств",  eyebrow: "Платформа",    component: AmenitiesPage },
  parameters: { title: "Счетчики и х-ки", eyebrow: "Платформа",    component: ParametersPage },
  discounts:  { title: "Скидки",           eyebrow: "Платформа",    component: DiscountsPage },
  content:    { title: "Контент сайта",  eyebrow: "CMS",          component: ContentPage },
  settings:   { title: "Настройки",      eyebrow: "Профиль",      component: SettingsPage },
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

export function getAllowedAdminPages(profile) {
  if (!hasAdminShellAccess(profile)) return [];
  const hasFullAccess = profile.role === "admin" || profile.is_staff || profile.is_superuser;
  return Object.keys(PAGES).filter((id) => hasFullAccess || !PAGES[id].adminOnly);
}

export default function AdminApp({ profile }) {
  const allowedPages = useMemo(() => getAllowedAdminPages(profile), [profile]);
  const [page, setPage] = useState(() => {
    const savedPage = getStorageItem(STORAGE_KEYS.workflow.adminPage);
    return PAGES[savedPage] ? savedPage : "overview";
  });
  const safePage = allowedPages.includes(page) ? page : (allowedPages[0] || "overview");

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
    setStorageItem(STORAGE_KEYS.workflow.adminPage, safePage);
  }, [page, safePage]);

  const currentPage = PAGES[safePage] || PAGES.overview;
  const PageComponent = currentPage.component;
  const selectPage = (nextPage) => {
    if (allowedPages.includes(nextPage)) setPage(nextPage);
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
      <PageComponent setPage={selectPage} />
    </AdminLayout>
  );
}
