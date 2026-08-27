import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardLayout from './pages/DashboardLayout';
import DashboardWelcome from './pages/DashboardWelcome';
import OrdersPage from './pages/OrdersPage';
import SettlementsPage from './pages/SettlementsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ProductCostsPage from './pages/ProductCostsPage';
import UploadDataPage from './pages/UploadDataPage';
import ProfitabilityPage from './pages/ProfitabilityPage';
import ForecastingPage from './pages/ForecastingPage';
import PeriodAnalysisPage from './pages/PeriodAnalysisPage';
import ReturnsPage from './pages/ReturnsPage';
import ProductsPage from './pages/ProductsPage';
import ReportsPage from './pages/ReportsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        {/* Dashboard Routes */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          {/* Default dashboard view (index) */}
          <Route index element={<DashboardWelcome />} />
          
          {/* Actual routes for the sidebar items */}
          <Route path="upload" element={<UploadDataPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="settlements" element={<SettlementsPage />} />
          <Route path="returns" element={<ReturnsPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="product-costs" element={<ProductCostsPage />} />
          <Route path="period-analysis" element={<PeriodAnalysisPage />} />
          <Route path="profitability" element={<ProfitabilityPage />} />
          <Route path="forecasting" element={<ForecastingPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<div className="p-4 text-slate-500">Settings Page (Coming Soon)</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
