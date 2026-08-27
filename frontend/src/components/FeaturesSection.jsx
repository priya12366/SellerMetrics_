import React from 'react';
import '../styles/FeaturesSection.css';

const FeaturesSection = () => {
  const features = [
    {
      icon: "📦",
      title: "Orders",
      description: "Manage and monitor all seller orders."
    },
    {
      icon: "💰",
      title: "Settlements",
      description: "Track settlements and payouts."
    },
    {
      icon: "↩️",
      title: "Returns",
      description: "Analyze return trends and losses."
    },
    {
      icon: "📊",
      title: "Analytics",
      description: "Visualize sales and business insights."
    },
    {
      icon: "💳",
      title: "Charges",
      description: "Monitor commissions and platform fees."
    },
    {
      icon: "📈",
      title: "Performance",
      description: "Measure business growth with KPIs."
    }
  ];

  return (
    <section className="features-wrapper fade-in-scroll">
      <div className="features-container">
        
        <div className="features-header">
          <h2 className="features-title">Everything you need to manage your business</h2>
          <p className="features-subtitle">All essential seller tools in one intelligent dashboard.</p>
        </div>

        <div className="features-grid">
          {features.map((feature, index) => (
            <div className="feature-card-modern" key={index}>
              <div className="feature-icon-wrapper">
                <span className="feature-icon-text">{feature.icon}</span>
              </div>
              <h3 className="feature-card-title">{feature.title}</h3>
              <p className="feature-card-desc">{feature.description}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default FeaturesSection;
