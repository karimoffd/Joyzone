import React, { useState, useEffect } from "react";
import axios from "axios";
import { io } from "socket.io-client";

// Backend server manzillari
const API_URL = "http://localhost:5000/api";
const SOCKET_URL = "http://localhost:5000";

export default function AdminDashboardIntegration() {
  // ----------------------------------------------------
  // 1. STATELAR (Mock ma'lumotlar o'rniga real server statelari)
  // ----------------------------------------------------
  
  // Real-time statelar (WebSocket orqali keladigan ma'lumotlar)
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [trafficLogs, setTrafficLogs] = useState([]);
  
  // REST API orqali boshqariladigan ma'lumotlar
  const [bookings, setBookings] = useState([]);
  const [banners, setBanners] = useState([]);
  const [spaces, setSpaces] = useState([]);
  
  // Yuklanish va xatolik statelari
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Yangi banner qo'shish uchun vaqtinchalik state formasi
  const [newBanner, setNewBanner] = useState({
    title: "",
    img: "",
    redirect: "",
    platform: "All",
    status: "Active"
  });

  // ----------------------------------------------------
  // 2. WEBSOCKET (SOCKET.IO) REAL-TIME INTEGRATSIYASI
  // ----------------------------------------------------
  useEffect(() => {
    // WebSocket ulanishini o'rnatish
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"]
    });

    socket.on("connect", () => {
      console.log("WebSocket serverga ulandi! Socket ID:", socket.id);
    });

    // A. "Live Traffic Monitor" - Onlayn foydalanuvchilar soni
    socket.on("online_users_update", (count) => {
      console.log("Onlayn foydalanuvchilar soni yangilandi:", count);
      setOnlineUsers(count);
    });

    // B. "Live Traffic Monitor" - Mijozlar harakatlari logi (view, search, booking)
    socket.on("new_traffic_log", (logEntry) => {
      console.log("Yangi mijoz harakati qabul qilindi:", logEntry);
      
      // Yangi kelgan logni ro'yxatning boshiga qo'shish (oxirgi 30 ta harakatni saqlab qolamiz)
      setTrafficLogs((prevLogs) => [logEntry, ...prevLogs.slice(0, 29)]);
    });

    socket.on("disconnect", () => {
      console.log("WebSocket ulanishi uzildi");
    });

    // Ulanish yopilganda resurslarni tozalash (Cleanup)
    return () => {
      socket.disconnect();
    };
  }, []);

  // ----------------------------------------------------
  // 3. REST API ENDPOINTS (AXIOS BILAN BOG'LANISH)
  // ----------------------------------------------------
  useEffect(() => {
    // Sahifa yuklanganda dastlabki ma'lumotlarni serverdan yuklab olish
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        
        // Bir vaqtda barcha API chaqiruvlarini amalga oshiramiz
        const [bookingsRes, bannersRes, spacesRes] = await Promise.all([
          axios.get(`${API_URL}/bookings`),
          axios.get(`${API_URL}/banners`),
          axios.get(`${API_URL}/spaces`)
        ]);

        setBookings(bookingsRes.data);
        setBanners(bannersRes.data);
        setSpaces(spacesRes.data);
        
        setLoading(false);
      } catch (err) {
        console.error("Ma'lumotlarni yuklashda xatolik yuz berdi:", err);
        setError("Server bilan bog'lanishda xatolik: " + err.message);
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // ----------------------------------------------------
  // 4. REST API FUNKSIYALARI (BANNERS CRUD & BOOKING MANAGEMENT)
  // ----------------------------------------------------

  // A. Banner qo'shish (Create)
  const handleAddBanner = async (e) => {
    e.preventDefault();
    if (!newBanner.title || !newBanner.img || !newBanner.redirect) {
      alert("Iltimos, barcha zarur maydonlarni to'ldiring!");
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/banners`, newBanner);
      // Yangi bannerni ro'yxat boshiga qo'shib qo'yamiz
      setBanners((prevBanners) => [response.data, ...prevBanners]);
      
      // Formani tozalaymiz
      setNewBanner({
        title: "",
        img: "",
        redirect: "",
        platform: "All",
        status: "Active"
      });
      alert("Banner muvaffaqiyatli qo'shildi!");
    } catch (err) {
      console.error("Bannerni qo'shishda xato:", err);
      alert("Bannerni qo'shib bo'lmadi: " + (err.response?.data?.message || err.message));
    }
  };

  // B. Banner holatini o'zgartirish Active/Inactive (Update)
  const handleToggleBannerStatus = async (bannerId, currentStatus) => {
    const nextStatus = currentStatus === "Active" ? "Inactive" : "Active";
    try {
      const response = await axios.put(`${API_URL}/banners/${bannerId}`, {
        status: nextStatus
      });
      
      // State-ni yangilash
      setBanners((prevBanners) =>
        prevBanners.map((b) => (b.id === bannerId ? response.data : b))
      );
    } catch (err) {
      console.error("Banner holatini o'zgartirishda xato:", err);
      alert("Banner holatini yangilab bo'lmadi.");
    }
  };

  // C. Bannerni o'chirish (Delete)
  const handleDeleteBanner = async (bannerId) => {
    if (!window.confirm("Haqiqatan ham ushbu bannerni o'chirmoqchimisiz?")) return;

    try {
      await axios.delete(`${API_URL}/banners/${bannerId}`);
      // State-dan o'chirilgan bannerni olib tashlaymiz
      setBanners((prevBanners) => prevBanners.filter((b) => b.id !== bannerId));
      alert("Banner muvaffaqiyatli o'chirildi!");
    } catch (err) {
      console.error("Bannerni o'chirishda xato:", err);
      alert("Bannerni o'chirib bo'lmadi.");
    }
  };

  // D. Booking statusini o'zgartirish (Paid/Cancelled)
  const handleUpdateBookingStatus = async (bookingId, nextStatus) => {
    try {
      const response = await axios.put(`${API_URL}/bookings/${bookingId}/status`, {
        status: nextStatus
      });
      
      // State-dagi booking statusini yangilash
      setBookings((prevBookings) =>
        prevBookings.map((bk) => (bk.id === bookingId ? response.data : bk))
      );
      alert(`Bron statusi "${nextStatus}" ga yangilandi!`);
    } catch (err) {
      console.error("Bron statusini o'zgartirishda xato:", err);
      alert("Bron statusini yangilab bo'lmadi.");
    }
  };

  // ----------------------------------------------------
  // 5. INTERFEYS RENDERING (DIZAYNGA TASIR QILMAYDIGAN INTEGRATSIYA)
  // ----------------------------------------------------
  if (loading) return <div className="admin-loading">Yuklanmoqda...</div>;
  if (error) return <div className="admin-error">{error}</div>;

  return (
    <div className="admin-dashboard-container" style={{ padding: "24px", color: "#fff", background: "#0a0a0c", minHeight: "100vh" }}>
      
      {/* HEADER SECTION */}
      <header style={{ marginBottom: "32px", borderBottom: "1px solid #222", paddingBottom: "16px" }}>
        <h1>Joyzone Admin Control Center</h1>
        <p style={{ color: "#888" }}>Real-time foydalanuvchilar harakati va ma'lumotlar bazasi boshqaruvi</p>
      </header>

      {/* METRICS & LIVE TRAFFIC MONITOR GRID */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px", marginBottom: "32px" }}>
        
        {/* Real-time Online count */}
        <section style={{ background: "#111", padding: "24px", borderRadius: "12px", border: "1px solid #333" }}>
          <h2 style={{ fontSize: "16px", color: "#888", textTransform: "uppercase" }}>Online Users</h2>
          <div style={{ fontSize: "64px", fontWeight: "bold", color: "#38ef7d", margin: "16px 0" }}>
            {onlineUsers}
          </div>
          <p style={{ color: "#666", fontSize: "14px" }}>Hozirgi vaqtda saytda faol bo'lgan mijozlar soni</p>
        </section>

        {/* Live Traffic Monitor Activity Logs */}
        <section style={{ background: "#111", padding: "24px", borderRadius: "12px", border: "1px solid #333" }}>
          <h2>Live Traffic Monitor</h2>
          <p style={{ color: "#666", fontSize: "14px", marginBottom: "16px" }}>Mijozlarning real vaqtdagi faolligi (WebSocket orqali avtomatik keladi)</p>
          
          <div className="logs-list" style={{ maxHeight: "200px", overflowY: "auto", border: "1px solid #222", borderRadius: "6px", padding: "8px", background: "#08080a" }}>
            {trafficLogs.length === 0 ? (
              <p style={{ color: "#555", fontStyle: "italic", textAlign: "center" }}>Hozircha hech qanday harakat qayd etilmadi...</p>
            ) : (
              trafficLogs.map((log) => (
                <div key={log.id} style={{ padding: "8px", borderBottom: "1px solid #1a1a1f", display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                  <span style={{ color: "#ff8e53", minWidth: "80px" }}>[{log.time}]</span>
                  <strong style={{ color: "#38ef7d", minWidth: "120px" }}>{log.event}</strong>
                  <span style={{ color: "#ccc", flexGrow: 1, marginLeft: "12px" }}>{log.description}</span>
                  <small style={{ color: "#555" }}>IP: {log.userIp}</small>
                </div>
              ))
            )}
          </div>
        </section>

      </div>

      {/* REST DATA MANAGEMENT GRID */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        
        {/* Bookings List Section */}
        <section style={{ background: "#111", padding: "24px", borderRadius: "12px", border: "1px solid #333" }}>
          <h2>Bookings Manager</h2>
          <p style={{ color: "#666", fontSize: "14px", marginBottom: "16px" }}>Mijozlar tomonidan qilingan dacha/ofis bronlari ro'yxati</p>
          
          <div style={{ maxHeight: "400px", overflowY: "auto" }}>
            {bookings.length === 0 ? (
              <p style={{ color: "#555", fontStyle: "italic" }}>Bronlar mavjud emas</p>
            ) : (
              bookings.map((booking) => (
                <article key={booking.id} style={{ padding: "12px", marginBottom: "12px", background: "#1a1a1f", borderRadius: "8px", border: "1px solid #222" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <strong>Space: {booking.space_id?.name || "Noma'lum joy"}</strong>
                    <span style={{ 
                      padding: "2px 8px", 
                      borderRadius: "4px", 
                      fontSize: "12px",
                      background: booking.status === "Paid" ? "#38ef7d" : booking.status === "Cancelled" ? "#ff4e50" : "#ffbd22",
                      color: "#000",
                      fontWeight: "bold"
                    }}>{booking.status}</span>
                  </div>
                  <p style={{ fontSize: "14px", color: "#ccc", margin: "4px 0" }}>
                    User ID: {booking.user_id} | Jami: {booking.total_price.toLocaleString()} so'm
                  </p>
                  <small style={{ color: "#888" }}>
                    Sana: {new Date(booking.start_date).toLocaleDateString()} - {new Date(booking.end_date).toLocaleDateString()}
                  </small>
                  
                  {/* Status update actions */}
                  <div style={{ marginTop: "10px", display: "flex", gap: "8px" }}>
                    {booking.status === "Pending" && (
                      <>
                        <button onClick={() => handleUpdateBookingStatus(booking.id, "Paid")} style={{ background: "#38ef7d", color: "#00", border: "none", padding: "4px 8px", borderRadius: "4px", cursor: "pointer" }}>Tasdiqlash (Paid)</button>
                        <button onClick={() => handleUpdateBookingStatus(booking.id, "Cancelled")} style={{ background: "#ff4e50", color: "#fff", border: "none", padding: "4px 8px", borderRadius: "4px", cursor: "pointer" }}>Bekor qilish</button>
                      </>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        {/* Banners CRUD & List Section */}
        <section style={{ background: "#111", padding: "24px", borderRadius: "12px", border: "1px solid #333" }}>
          <h2>Banners (Sliderlar) Manager</h2>
          <p style={{ color: "#666", fontSize: "14px", marginBottom: "16px" }}>Bosh sahifadagi slider rasmlarini tahrirlash, qo'shish va o'chirish</p>
          
          {/* Add Banner Form */}
          <form onSubmit={handleAddBanner} style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "12px", background: "#18181e", borderRadius: "8px", marginBottom: "20px" }}>
            <h3>Yangi banner qo'shish</h3>
            <input type="text" placeholder="Sarlavha (Title)" value={newBanner.title} onChange={(e) => setNewBanner({...newBanner, title: e.target.value})} style={{ padding: "8px", background: "#0a0a0c", color: "#fff", border: "1px solid #333", borderRadius: "4px" }} />
            <input type="text" placeholder="Rasm URL (img)" value={newBanner.img} onChange={(e) => setNewBanner({...newBanner, img: e.target.value})} style={{ padding: "8px", background: "#0a0a0c", color: "#fff", border: "1px solid #333", borderRadius: "4px" }} />
            <input type="text" placeholder="Yo'naltiruvchi Space ID" value={newBanner.redirect} onChange={(e) => setNewBanner({...newBanner, redirect: e.target.value})} style={{ padding: "8px", background: "#0a0a0c", color: "#fff", border: "1px solid #333", borderRadius: "4px" }} />
            <div style={{ display: "flex", gap: "10px" }}>
              <select value={newBanner.platform} onChange={(e) => setNewBanner({...newBanner, platform: e.target.value})} style={{ padding: "8px", background: "#0a0a0c", color: "#fff", border: "1px solid #333", borderRadius: "4px", flexGrow: 1 }}>
                <option value="All">Barcha platformalar (All)</option>
                <option value="Web">Faqat Web</option>
                <option value="App">Faqat App</option>
              </select>
              <button type="submit" style={{ background: "#ff8e53", color: "#000", fontWeight: "bold", border: "none", padding: "8px 16px", borderRadius: "4px", cursor: "pointer" }}>Qo'shish</button>
            </div>
          </form>

          {/* Banners List */}
          <div style={{ maxHeight: "250px", overflowY: "auto" }}>
            {banners.map((banner) => (
              <div key={banner.id} style={{ display: "flex", gap: "12px", padding: "8px", borderBottom: "1px solid #222", alignItems: "center" }}>
                <img src={banner.img} alt="" style={{ width: "60px", height: "40px", objectFit: "cover", borderRadius: "4px" }} />
                <div style={{ flexGrow: 1 }}>
                  <h4 style={{ margin: 0, fontSize: "14px" }}>{banner.title}</h4>
                  <small style={{ color: "#666" }}>Platforma: {banner.platform} | Status: {banner.status}</small>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button onClick={() => handleToggleBannerStatus(banner.id, banner.status)} style={{ background: banner.status === "Active" ? "#38ef7d" : "#555", color: "#000", border: "none", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", cursor: "pointer" }}>
                    {banner.status === "Active" ? "Faol" : "Nofaol"}
                  </button>
                  <button onClick={() => handleDeleteBanner(banner.id)} style={{ background: "#ff4e50", color: "#fff", border: "none", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", cursor: "pointer" }}>
                    O'chirish
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>

    </div>
  );
}
