import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import HeroSection from '../components/HeroSection';
import FeaturesSection from '../components/FeaturesSection';
import '../styles/LandingPage.css';

const LandingPage = () => {
  return (
    <div className="landing-wrapper fade-in">
      <div className="background-grid"></div>

      <Navbar />

      <main className="landing-main">
        {/* Hero Section */}
        <HeroSection />

        {/* Features Section */}
        <FeaturesSection />
        
        {/* How It Works Section */}
        <section className="how-it-works-section" id="how-it-works">
          <div className="section-container section-column">
            <h2 className="section-title">How Seller Insight Works</h2>
            <div className="timeline-container">
              <div className="timeline-step">
                <div className="step-number">1</div>
                <h3 className="step-title">Upload Orders.csv</h3>
              </div>
              <div className="timeline-connector">↓</div>
              <div className="timeline-step">
                <div className="step-number">2</div>
                <h3 className="step-title">Upload Payments.csv</h3>
              </div>
              <div className="timeline-connector">↓</div>
              <div className="timeline-step">
                <div className="step-number">3</div>
                <h3 className="step-title">System validates, cleans and merges reports using Sub Order No</h3>
              </div>
              <div className="timeline-connector">↓</div>
              <div className="timeline-step">
                <div className="step-number">4</div>
                <h3 className="step-title">View analytics dashboard with sales, settlements, returns and business insights</h3>
              </div>
            </div>
          </div>
        </section>

      </main>
      
      <Footer />
    </div>
  );
};

export default LandingPage;
