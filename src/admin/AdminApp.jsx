import React, { useState, useEffect } from "react";
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

const PAGES = {
  overview:   { title: "Обзор",          eyebrow: "Главная",      component: OverviewPage },
  bookings:   { title: "Бронирования",   eyebrow: "Управление",   component: BookingsPage },
  spaces:     { title: "Пространства",   eyebrow: "Управление",   component: SpacesPage },
  moderation: { title: "Модерация мест", eyebrow: "Проверка",     component: ModerationPage },
  users:      { title: "Пользователи",   eyebrow: "Управление",   component: UsersPage },
  messages:   { title: "Сообщения",      eyebrow: "Коммуникация", component: MessagesPage },
  reviews:    { title: "Отзывы",         eyebrow: "Репутация",    component: ReviewsPage },
  finance:    { title: "Финансы",        eyebrow: "Аналитика",    component: FinancePage },
  tariffs:    { title: "Тарифы",         eyebrow: "Платформа",    component: TariffsPage },
  categories: { title: "Категории",       eyebrow: "Платформа",    component: CategoriesPage },
  amenities:  { title: "Список удобств",  eyebrow: "Платформа",    component: AmenitiesPage },
  parameters: { title: "Счетчики и х-ки", eyebrow: "Платформа",    component: ParametersPage },
  discounts:  { title: "Скидки",           eyebrow: "Платформа",    component: DiscountsPage },
  content:    { title: "Контент сайта",  eyebrow: "CMS",          component: ContentPage },
  settings:   { title: "Настройки",      eyebrow: "Профиль",      component: SettingsPage },
};

export default function AdminApp() {
  const [page, setPage] = useState("overview");

  // Auto-login as Admin during development to enable immediate moderation tests
  useEffect(() => {
    const checkAndLoginAdmin = async () => {
      const token = localStorage.getItem("joyzone-access");
      let isAdmin = false;
      
      if (token) {
        try {
          const res = await fetch("http://localhost:8000/api/auth/profile/", {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const profile = await res.json();
            if (profile.role === 'admin' || profile.role === 'moderator' || profile.is_superuser || profile.is_staff) {
              isAdmin = true;
            }
          }
        } catch (e) {
          console.warn("Profile check failed:", e);
        }
      }
      
      if (!isAdmin) {
        try {
          const res = await fetch("http://localhost:8000/api/auth/dev-admin-login/", {
            method: "POST"
          });
          if (res.ok) {
            const data = await res.json();
            localStorage.setItem("joyzone-access", data.access);
            localStorage.setItem("joyzone-refresh", data.refresh);
            console.log("Automatically authenticated as developer admin!");
            window.location.reload();
          }
        } catch (e) {
          console.warn("Dev admin autologin failed:", e);
        }
      }
    };
    
    checkAndLoginAdmin();
  }, []);

  const currentPage = PAGES[page] || PAGES.overview;
  const PageComponent = currentPage.component;

  return (
    <AdminLayout
      page={page}
      setPage={setPage}
      title={currentPage.title}
      eyebrow={currentPage.eyebrow}
    >
      <PageComponent setPage={setPage} />
    </AdminLayout>
  );
}
