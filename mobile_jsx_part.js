function MobileBottomMenu({ userState, isMenuOpen, setIsMenuOpen }) {
  const statusHref = userState.isAuthed ? (userState.isPartner ? "#partner" : "#profile") : "#login";

  return createPortal(
    <div className="mobile-bottom-menu">
      <a href="#home" className="mobile-menu-item active">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
        <span>Asosiy</span>
      </a>
      <a href="#filter" className="mobile-menu-item">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <span>Izlash</span>
      </a>
      <a href={statusHref} className="mobile-menu-item">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        <span>Profil</span>
      </a>
      <button className={`mobile-menu-item burger-btn ${isMenuOpen ? "active" : ""}`} onClick={() => setIsMenuOpen(!isMenuOpen)}>
        <MenuIcon open={isMenuOpen} />
        <span>Menyu</span>
      </button>
    </div>,
    document.body
  );
}

