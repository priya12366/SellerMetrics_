import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Navbar.css';

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  return (
    <header className="navbar fade-down">
      <div className="navbar-container">
        
        {/* Left: Logo */}
        <div className="navbar-brand">
          <div className="navbar-logo-icon">
            {/* Analytics Dashboard SVG Icon */}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="4" />
              <path d="M3 15h18" />
              <path d="M9 3v12" />
              <path d="M14 9l3-3m0 0l3 3m-3-3v8" />
            </svg>
          </div>
          <span className="navbar-logo-text">SellerMetrics</span>
        </div>
        
        {/* Center: Navigation (Desktop) */}
        <nav className="navbar-nav desktop-nav">
          <ul className="navbar-links">
            <li><a href="#home" className="active">Home</a></li>
            <li><a href="#features">Features</a></li>
            <li><a href="#workflow">Workflow</a></li>
            <li><a href="#analytics">Analytics</a></li>
            <li><a href="#faq">FAQ</a></li>
          </ul>
        </nav>
        
        {/* Search & Login Actions */}
        <div className="navbar-right-actions desktop-actions">
          <div className="navbar-search">
            <div className="search-icon">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
            <input type="text" placeholder="Search orders, reports..." className="navbar-search-input" />
          </div>
          
          <button className="nav-login-btn" onClick={() => navigate('/login')}>Login</button>
        </div>

        {/* Mobile Hamburger */}
        <button className="mobile-menu-btn" onClick={toggleMenu} aria-label="Toggle menu">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
            <path d={isMobileMenuOpen ? "M18 6L6 18M6 6l12 12" : "M3 12h18M3 6h18M3 18h18"} />
          </svg>
        </button>
        
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="mobile-nav-dropdown">
          <ul className="mobile-navbar-links">
            <li><a href="#home" className="active" onClick={toggleMenu}>Home</a></li>
            <li><a href="#features" onClick={toggleMenu}>Features</a></li>
            <li><a href="#workflow" onClick={toggleMenu}>Workflow</a></li>
            <li><a href="#analytics" onClick={toggleMenu}>Analytics</a></li>
            <li><a href="#faq" onClick={toggleMenu}>FAQ</a></li>
          </ul>
          <button className="nav-login-btn mobile-login-btn" onClick={() => { toggleMenu(); navigate('/login'); }}>Login</button>
        </div>
      )}
    </header>
  );
};

export default Navbar;
