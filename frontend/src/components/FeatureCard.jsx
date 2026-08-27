import React from 'react';
import { motion } from 'framer-motion';
import '../styles/LandingPage.css';

const icons = {
  analytics: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 19V10" strokeLinecap="round" />
      <path d="M12 19V5" strokeLinecap="round" />
      <path d="M20 19v-7" strokeLinecap="round" />
    </svg>
  ),
  settlement: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="M8 9h8" strokeLinecap="round" />
      <path d="M8 13h5" strokeLinecap="round" />
    </svg>
  ),
  returns: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 7h10v10" strokeLinecap="round" />
      <path d="M17 7L7 7" strokeLinecap="round" />
      <path d="M7 17l3-3" strokeLinecap="round" />
    </svg>
  ),
  workflow: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 7h10" strokeLinecap="round" />
      <path d="M7 12h10" strokeLinecap="round" />
      <path d="M7 17h10" strokeLinecap="round" />
    </svg>
  ),
  growth: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 18L10 12l3 3 7-8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 7h4v4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  secure: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 12.5l1.6 1.6 3.4-3.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
};

const FeatureCard = ({ icon, title, description, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ delay: index * 0.08 }}
      whileHover={{ y: -6, scale: 1.01 }}
      className="glass-card rounded-[24px] p-6"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-emerald-500/20 text-violet-200">
        {icons[icon]}
      </div>
      <h3 className="mt-5 text-xl font-semibold text-white">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-400">{description}</p>
    </motion.div>
  );
};

export default FeatureCard;
