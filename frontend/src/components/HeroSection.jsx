import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/HeroSection.css';

const ORBIT_ICONS = [
  { id: 1, emoji: '📦', title: 'Orders', desc: 'Manage and track seller orders.', angle: '0deg' },
  { id: 2, emoji: '💰', title: 'Settlements', desc: 'Monitor payouts and settlements.', angle: '60deg' },
  { id: 3, emoji: '📊', title: 'Analytics', desc: 'View sales reports and business insights.', angle: '120deg' },
  { id: 4, emoji: '📄', title: 'Reports', desc: 'Generate downloadable reports.', angle: '180deg' },
  { id: 5, emoji: '📈', title: 'Growth', desc: 'Track KPIs and business growth.', angle: '240deg' },
  { id: 6, emoji: '↩', title: 'Returns', desc: 'Manage customer return requests.', angle: '300deg' },
];

const HeroSection = () => {
  const [hoveredIcon, setHoveredIcon] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0, position: 'top' });
  const heroRef = useRef(null);
  const navigate = useNavigate();

  const handleMouseEnter = (e, icon) => {
    if (!heroRef.current) return;
    const iconRect = e.currentTarget.getBoundingClientRect();
    const heroRect = heroRef.current.getBoundingClientRect();
    
    // Position it horizontally centered above the icon
    const x = iconRect.left - heroRect.left + (iconRect.width / 2);
    let y = iconRect.top - heroRect.top;
    let position = 'top';

    // If too close to the top of the viewport, show it below the icon
    if (iconRect.top < 100) {
      y = iconRect.bottom - heroRect.top;
      position = 'bottom';
    }

    setTooltipPos({ x, y, position });
    setHoveredIcon(icon);
  };

  return (
    <section className="hero-section" id="home" ref={heroRef}>
      {/* Background Elements */}
      <div className="hero-bg-grid"></div>
      <div className="hero-bg-circle circle-left"></div>
      <div className="hero-bg-circle circle-right"></div>

      <div className="hero-container">
        
        {/* Left Content */}
        <div className="hero-content fade-in">
          <h1 className="hero-title">
            SMARTER SELLING.<br />
            BETTER INSIGHTS.
          </h1>
          <h2 className="hero-subtitle">E-Commerce Seller Analytics Platform</h2>
          <p className="hero-description">
            Manage orders, settlements, returns, fees, profits and business performance from one intelligent dashboard.
          </p>
          
          <div className="hero-buttons">
            <button className="btn-primary" onClick={() => navigate('/register')}>Get Started</button>
            <button className="btn-secondary">View Demo</button>
          </div>

          {/* Trust Indicator */}
          <div className="hero-trust-indicator fade-in-delayed">
            <div className="trust-item">
              <span className="check-icon">✓</span>
              <span>Built for Modern E-Commerce Sellers</span>
            </div>
            <div className="trust-item">
              <span className="check-icon">✓</span>
              <span>One Dashboard for Orders, Settlements & Analytics</span>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="hero-scroll-indicator">
            <div className="scroll-arrow">↓</div>
            <span>Scroll to Explore</span>
          </div>
        </div>

        {/* Right Illustration */}
        <div className="hero-illustration fade-in-delayed">
          <div className="hero-orbit-container">
            
            {/* Pulsing Breathing Glow */}
            <div className="hero-orbit-glow"></div>

            {/* Concentric Dashed Rings */}
            <div className="hero-orbit-rings"></div>

            {/* The main seller image */}
            <div className="hero-seller-image">
              <img src="/hero-seller-3d.png" alt="E-Commerce Seller working on a laptop" />
            </div>

            {/* Rotating Orbit with Icons */}
            <div className="hero-orbit">
              {ORBIT_ICONS.map((icon) => (
                <div className="orbit-icon-wrapper" style={{ '--angle': icon.angle }} key={icon.id}>
                  <div className="orbit-icon-reverse">
                    <div 
                      className="orbit-icon"
                      onMouseEnter={(e) => handleMouseEnter(e, icon)}
                      onMouseLeave={() => setHoveredIcon(null)}
                    >
                      <span className="orbit-emoji">{icon.emoji}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
          </div>
        </div>
      </div>

      {/* Floating Tooltip Portal overlay (relative to hero-section) */}
      {hoveredIcon && (
        <div 
          className="orbit-tooltip-portal"
          data-position={tooltipPos.position}
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
          }}
        >
          <div className="tooltip-title">{hoveredIcon.title}</div>
          <div className="tooltip-desc">{hoveredIcon.desc}</div>
        </div>
      )}
    </section>
  );
};

export default HeroSection;
