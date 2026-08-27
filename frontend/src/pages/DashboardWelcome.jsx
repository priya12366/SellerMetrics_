import React, { useState, useRef, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  UploadCloud, FileSpreadsheet, AlertCircle, CheckCircle2, X, FileText,
  TrendingUp, ShoppingCart, DollarSign, Percent, RefreshCcw, FileCheck2,
  PackageOpen, ChevronRight, Activity, BarChart3, Undo2, RotateCcw
} from 'lucide-react';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import ExpandableName from '../components/ExpandableName';

export default function DashboardWelcome() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const firstName = user?.full_name?.split(' ')[0] || 'Seller';

  // State for data
  const [summary, setSummary] = useState(null);
  const [profitSummary, setProfitSummary] = useState(null);
  const [matchingSummary, setMatchingSummary] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [chartDays, setChartDays] = useState(30);
  const [productPerformance, setProductPerformance] = useState([]);
  const [monthlySummary, setMonthlySummary] = useState([]);
  const [importHistory, setImportHistory] = useState(null);
  const [returnsRtoAnalysis, setReturnsRtoAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeductions, setShowDeductions] = useState(false);

  // State for Uploads
  const [ordersFiles, setOrdersFiles] = useState([]);
  const [paymentsFiles, setPaymentsFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState(null);
  const [reportingPeriod, setReportingPeriod] = useState("");
  const ordersInputRef = useRef(null);
  const paymentsInputRef = useRef(null);
  const uploadSectionRef = useRef(null);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
      return;
    }

    const headers = { 'Authorization': `Bearer ${token}` };

    try {
      const [
        summaryRes, profitRes, matchingRes, trendRes, productRes, monthlyRes, historyRes, returnsRtoRes
      ] = await Promise.all([
        fetch('http://127.0.0.1:8000/api/reports/summary', { headers }),
        fetch('http://127.0.0.1:8000/api/analytics/profit-summary', { headers }),
        fetch('http://127.0.0.1:8000/api/analytics/matching-summary', { headers }),
        fetch(`http://127.0.0.1:8000/api/analytics/historical-trend?days=${chartDays}`, { headers }),
        fetch('http://127.0.0.1:8000/api/analytics/product-profitability', { headers }),
        fetch('http://127.0.0.1:8000/api/analytics/monthly-summary', { headers }),
        fetch('http://127.0.0.1:8000/api/import-history', { headers }),
        fetch('http://127.0.0.1:8000/api/analytics/returns-rto-analysis', { headers })
      ]);

      if (summaryRes.status === 401) {
        localStorage.removeItem('access_token');
        navigate('/login');
        return;
      }

      setSummary(await summaryRes.json());
      setProfitSummary(await profitRes.json());
      setMatchingSummary(await matchingRes.json());
      setTrendData(await trendRes.json());
      setProductPerformance(await productRes.json());
      setMonthlySummary(await monthlyRes.json());
      setImportHistory(await historyRes.json());
      setReturnsRtoAnalysis(await returnsRtoRes.json());
      


    } catch (err) {
      console.error("Failed to load dashboard data", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [chartDays]);

  // Upload Handlers
  const handleOrdersChange = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(f => f.name.toLowerCase().endsWith('.csv'));
    if (validFiles.length !== files.length) {
      setUploadMessage({ type: 'error', text: 'Only .csv files are allowed for Orders.' });
    }
    setOrdersFiles(prev => [...prev, ...validFiles]);
    if (ordersInputRef.current) ordersInputRef.current.value = '';
  };

  const handlePaymentsChange = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(f => f.name.toLowerCase().endsWith('.xlsx'));
    if (validFiles.length !== files.length) {
      setUploadMessage({ type: 'error', text: 'Only .xlsx files are allowed for Payments.' });
    }
    setPaymentsFiles(prev => [...prev, ...validFiles]);
    if (paymentsInputRef.current) paymentsInputRef.current.value = '';
  };

  const removeOrderFile = (index) => setOrdersFiles(prev => prev.filter((_, i) => i !== index));
  const removePaymentFile = (index) => setPaymentsFiles(prev => prev.filter((_, i) => i !== index));

  const handleUpload = async () => {
    if (ordersFiles.length === 0 && paymentsFiles.length === 0) {
      setUploadMessage({ type: 'error', text: 'Please select at least one file to upload.' });
      return;
    }

    setIsUploading(true);
    setUploadMessage(null);
    const token = localStorage.getItem('access_token');

    let totalSuccess = 0;
    let errors = [];

    const uploadFile = async (file, endpoint) => {
      const formData = new FormData();
      formData.append('file', file);
      if (reportingPeriod.trim()) formData.append('reporting_period', reportingPeriod.trim());
      
      const res = await fetch(`http://127.0.0.1:8000${endpoint}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      if (res.status === 401) throw new Error('Unauthorized');
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Failed to upload ${file.name}`);
      return data;
    };

    try {
      for (const file of ordersFiles) {
        try { await uploadFile(file, '/api/orders/upload'); totalSuccess++; } 
        catch (err) { if (err.message === 'Unauthorized') { navigate('/login'); return; } errors.push(err.message); }
      }
      for (const file of paymentsFiles) {
        try { await uploadFile(file, '/api/payments/upload'); totalSuccess++; } 
        catch (err) { if (err.message === 'Unauthorized') { navigate('/login'); return; } errors.push(err.message); }
      }

      await fetchDashboardData();
      
      if (errors.length > 0) {
        setUploadMessage({ type: 'error', text: `Uploaded ${totalSuccess} files. Errors: ${errors.join(' | ')}` });
      } else {
        setUploadMessage({ type: 'success', text: 'Files uploaded successfully. Dashboard updated.' });
        setOrdersFiles([]);
        setPaymentsFiles([]);
        setReportingPeriod("");
      }
    } catch(err) {
       setUploadMessage({ type: 'error', text: 'A network error occurred during upload.' });
    } finally {
      setIsUploading(false);
    }
  };

  const scrollToUpload = () => {
    uploadSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };


  // Formatters
  const formatMoney = (amount) => {
    if (amount === undefined || amount === null) return 'N/A';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
  };
  const formatNumber = (num) => {
    if (num === undefined || num === null) return 'N/A';
    return new Intl.NumberFormat('en-IN').format(num);
  };
  const formatPercent = (pct) => {
    if (pct === undefined || pct === null) return 'N/A';
    return `${pct}%`;
  };

  if (isLoading && !summary) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">Loading Dashboard...</div>;
  }

  // Calculate Snapshot Values
  const grossSales = summary ? parseFloat(summary.matched_financials.gross_sale_amount) : 0;
  const finalSettlement = summary ? parseFloat(summary.matched_financials.final_settlement_amount) : 0;
  const productCost = profitSummary ? profitSummary.total_product_cost : 0;
  const netGrossProfit = profitSummary ? profitSummary.estimated_gross_profit : 0;

  // Real, source-backed platform deductions (Gross − Settlement), itemised by the
  // shared backend breakdown. Replaces the old "Platform Fees (Est)" that was
  // derived by subtraction: the total and every itemised line come straight from
  // the uploaded settlement report. Gross − COGS − Deductions == Net Gross Profit
  // (= Settlement − COGS) holds exactly, so the snapshot now reconciles.
  const matchedDeductions =
    summary && summary.matched_total_deductions != null
      ? parseFloat(summary.matched_total_deductions)
      : Math.max(0, grossSales - finalSettlement);
  const deductionBreakdown = summary?.matched_financials_breakdown || [];

  // Product-wise Returns and RTO (kept strictly separate — never summed).
  // Each card shows the worst offenders for its OWN metric, so we sort a copy
  // of the product list by that metric independently.
  const rrProducts = returnsRtoAnalysis?.products || [];
  const returnsProducts = [...rrProducts]
    .filter((p) => p.returns > 0)
    .sort((a, b) => b.returns - a.returns);
  const rtoProducts = [...rrProducts]
    .filter((p) => p.rto > 0)
    .sort((a, b) => b.rto - a.rto);
  const highestReturnProduct = returnsRtoAnalysis?.highest_return_product || null;
  const highestRtoProduct = returnsRtoAnalysis?.highest_rto_product || null;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12">
      
      {/* Hero Section */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                Welcome back, {firstName} 👋
              </h1>
              <p className="mt-2 text-slate-600 text-lg">
                Upload your seller reports and track your business performance in one place.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={fetchDashboardData}
                disabled={isLoading}
                className={`inline-flex items-center gap-2 rounded-lg bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
              </button>
              <button 
                onClick={scrollToUpload}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
              >
                <UploadCloud className="h-4 w-4" /> Upload Orders
              </button>
              <button 
                onClick={scrollToUpload}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
              >
                <FileSpreadsheet className="h-4 w-4" /> Upload Payments
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Gross Sales</span>
            </div>
            <p className="text-xl font-bold text-slate-900">{summary ? formatMoney(summary.all_payment_financials.gross_sale_amount) : 'N/A'}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <ShoppingCart className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Total Orders</span>
            </div>
            <p className="text-xl font-bold text-slate-900">{summary ? formatNumber(summary.total_orders) : 'N/A'}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-emerald-500">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Gross Profit</span>
            </div>
            <p className="text-xl font-bold text-emerald-600">{profitSummary ? formatMoney(profitSummary.estimated_gross_profit) : 'N/A'}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <Percent className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Profit Margin</span>
            </div>
            <p className="text-xl font-bold text-slate-900">{profitSummary ? formatPercent(profitSummary.profit_margin) : 'N/A'}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <RefreshCcw className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Returns / RTO</span>
            </div>
            <p className="text-xl font-bold text-rose-600">{summary ? formatNumber(summary.return_rto_orders) : 'N/A'}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <FileCheck2 className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Settlements</span>
            </div>
            <p className="text-xl font-bold text-slate-900">{summary ? formatMoney(summary.all_payment_financials.final_settlement_amount) : 'N/A'}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <Activity className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Match Rate</span>
            </div>
            <p className="text-xl font-bold text-slate-900">{matchingSummary ? formatPercent(matchingSummary.match_rate) : 'N/A'}</p>
          </div>
        </div>

        {/* Charts and Snapshot Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900">Sales vs Orders</h3>
              <div className="flex bg-slate-100 rounded-lg p-1">
                {[7, 30, 90, 180, 365].map(days => (
                  <button 
                    key={days}
                    onClick={() => setChartDays(days)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${chartDays === days ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {days === 7 ? '7D' : days === 30 ? '30D' : days === 90 ? '3M' : days === 180 ? '6M' : '1Y'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 w-full min-h-[300px]">
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748B'}} tickLine={false} axisLine={false} minTickGap={30} />
                    <YAxis yAxisId="left" tickFormatter={(val) => `₹${val/1000}k`} tick={{fontSize: 12, fill: '#64748B'}} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="right" orientation="right" tick={{fontSize: 12, fill: '#64748B'}} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{fill: '#F8FAFC'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                    <Legend iconType="circle" wrapperStyle={{fontSize: '12px'}} />
                    <Bar yAxisId="right" dataKey="orders" name="Orders" fill="#94A3B8" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Line yAxisId="left" type="monotone" dataKey="settlement" name="Sales Settlement" stroke="#4F46E5" strokeWidth={3} dot={false} activeDot={{r: 6}} />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                  <BarChart3 className="h-10 w-10 mb-2 opacity-20" />
                  <p className="text-sm font-medium">No trend data available for this period</p>
                </div>
              )}
            </div>
          </div>

          {/* Profit Snapshot */}
          <div className="lg:col-span-1 bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-6 flex flex-col text-white">
            <h3 className="text-lg font-bold text-white mb-6">Profit Snapshot</h3>
            
            <div className="space-y-5 flex-1">
              <div className="flex justify-between items-center pb-3 border-b border-slate-700/50">
                <span className="text-slate-400 text-sm">Gross Revenue</span>
                <span className="font-semibold">{formatMoney(grossSales)}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-700/50">
                <span className="text-slate-400 text-sm">Product Costs (COGS)</span>
                <span className={`font-semibold ${productCost === null || productCost === undefined ? 'text-slate-500' : 'text-rose-400'}`}>
                  {productCost === null || productCost === undefined ? 'N/A' : `-${formatMoney(productCost)}`}
                </span>
              </div>
              <div className="pb-3 border-b border-slate-700/50">
                <div className="flex justify-between items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowDeductions((v) => !v)}
                    className="flex items-center gap-1.5 text-slate-400 text-sm hover:text-slate-200 transition-colors min-w-0"
                  >
                    <span>Platform Deductions</span>
                    <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition-transform ${showDeductions ? 'rotate-90' : ''}`} />
                    <span className="text-xs font-semibold text-indigo-300 whitespace-nowrap">
                      {showDeductions ? 'Hide' : 'View details'}
                    </span>
                  </button>
                  <span className="font-semibold text-rose-400 whitespace-nowrap">-{formatMoney(matchedDeductions)}</span>
                </div>
                {showDeductions && (
                  <div className="mt-3 space-y-1.5 rounded-lg bg-slate-800/60 p-3">
                    {deductionBreakdown.length === 0 ? (
                      <p className="text-xs text-slate-400">Not separately available in payment data.</p>
                    ) : (
                      deductionBreakdown.map((d) => (
                        <div key={d.key} className="flex justify-between items-start gap-2 text-xs">
                          <span className="text-slate-400 min-w-0 break-words">{d.label}</span>
                          <span className={`font-medium tabular-nums whitespace-nowrap ${d.amount < 0 ? 'text-rose-300' : 'text-emerald-300'}`}>
                            {formatMoney(d.amount)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-700">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Net Gross Profit</p>
                  <p className="text-3xl font-bold text-emerald-400">{formatMoney(netGrossProfit)}</p>
                </div>
                <div className="bg-emerald-400/20 px-3 py-1.5 rounded-lg border border-emerald-400/30">
                  <span className="text-sm font-bold text-emerald-400">{profitSummary ? formatPercent(profitSummary.profit_margin) : 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
          
        </div>

        {/* Data Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Monthly View */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Monthly View</h3>
            {monthlySummary.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">
                      <th className="p-3 rounded-tl-lg">Month</th>
                      <th className="p-3 text-right">Total Sales</th>
                      <th className="p-3 text-right">Orders</th>
                      <th className="p-3 text-right">Settlements</th>
                      <th className="p-3 text-right">Returns</th>
                      <th className="p-3 text-right">RTO</th>
                      <th className="p-3 text-right">Gross Profit</th>
                      <th className="p-3 text-right rounded-tr-lg">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-100">
                    {monthlySummary.map((m, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-medium text-slate-900">{m.month}</td>
                        <td className="p-3 text-right text-slate-600">{formatMoney(m.gross_sales)}</td>
                        <td className="p-3 text-right text-slate-600">{formatNumber(m.orders)}</td>
                        <td className="p-3 text-right font-medium text-slate-600">{formatMoney(m.settlement)}</td>
                        <td className="p-3 text-right font-medium text-amber-600">{formatNumber(m.returns)}</td>
                        <td className="p-3 text-right font-medium text-rose-600">{formatNumber(m.rto)}</td>
                        <td className="p-3 text-right font-semibold text-emerald-600">{m.profit !== null ? formatMoney(m.profit) : 'N/A'}</td>
                        <td className="p-3 text-right font-semibold text-slate-700">{m.margin !== null ? formatPercent(m.margin) : 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-sm font-medium">No historical data available</p>
              </div>
            )}
          </div>

          {/* Product Performance */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Product Performance</h3>
            {productPerformance.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">
                      <th className="p-3 rounded-tl-lg">Product/SKU</th>
                      <th className="p-3 text-right">Orders</th>
                      <th className="p-3 text-right">Settlement</th>
                      <th className="p-3 text-right">Profit</th>
                      <th className="p-3 text-right rounded-tr-lg">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-100">
                    {productPerformance.slice(0, 5).map((p, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 align-top" style={{ maxWidth: '200px' }}>
                          <ExpandableName name={p.sku} lines={1} valueClass="font-semibold text-slate-900 text-sm" />
                          <ExpandableName name={p.product_name} lines={2} valueClass="text-xs text-slate-500" />
                        </td>
                        <td className="p-3 text-right text-slate-600">{formatNumber(p.orders)}</td>
                        <td className="p-3 text-right text-slate-600">{formatMoney(p.settlement)}</td>
                        <td className="p-3 text-right font-semibold text-emerald-600">{p.estimated_profit !== null ? formatMoney(p.estimated_profit) : 'N/A'}</td>
                        <td className="p-3 text-right font-semibold text-slate-700">{p.profit_margin !== null ? formatPercent(p.profit_margin) : 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <PackageOpen className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm font-medium">No product performance data</p>
              </div>
            )}
          </div>
          
        </div>

        {/* Product-wise Returns & RTO Analysis */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Product-wise Returns &amp; RTO</h2>
              <p className="mt-1 text-sm text-slate-500">
                Customer Returns and RTO are tracked separately for every product, across all your data.
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard/returns')}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              View all <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Highlight cards: highest-return and highest-RTO product (separate) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Highest Return Product */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-rose-500 p-5">
              <div className="flex items-center gap-2 text-rose-600 mb-3">
                <div className="rounded-lg bg-rose-50 p-2"><Undo2 className="h-4 w-4" /></div>
                <span className="text-xs font-semibold uppercase tracking-wider">Highest Return Product</span>
              </div>
              {highestReturnProduct ? (
                <>
                  <ExpandableName name={highestReturnProduct.product_name} lines={2} valueClass="text-lg font-bold text-slate-900" />
                  <p className="text-xs text-slate-500 font-mono mb-3 mt-0.5 truncate" title={highestReturnProduct.sku}>{highestReturnProduct.sku}</p>
                  <div className="flex items-baseline gap-3">
                    <span className="text-2xl font-bold text-rose-600">{formatNumber(highestReturnProduct.returns)}</span>
                    <span className="text-sm text-slate-500">Returns</span>
                    <span className="ml-auto inline-flex items-center rounded-full bg-rose-50 px-2.5 py-1 text-sm font-bold text-rose-700 border border-rose-200">
                      {highestReturnProduct.return_rate}%
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">out of {formatNumber(highestReturnProduct.total_orders)} orders</p>
                </>
              ) : (
                <p className="text-sm text-slate-400 py-4">No customer returns recorded yet.</p>
              )}
            </div>

            {/* Highest RTO Product */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-orange-500 p-5">
              <div className="flex items-center gap-2 text-orange-600 mb-3">
                <div className="rounded-lg bg-orange-50 p-2"><RotateCcw className="h-4 w-4" /></div>
                <span className="text-xs font-semibold uppercase tracking-wider">Highest RTO Product</span>
              </div>
              {highestRtoProduct ? (
                <>
                  <ExpandableName name={highestRtoProduct.product_name} lines={2} valueClass="text-lg font-bold text-slate-900" />
                  <p className="text-xs text-slate-500 font-mono mb-3 mt-0.5 truncate" title={highestRtoProduct.sku}>{highestRtoProduct.sku}</p>
                  <div className="flex items-baseline gap-3">
                    <span className="text-2xl font-bold text-orange-600">{formatNumber(highestRtoProduct.rto)}</span>
                    <span className="text-sm text-slate-500">RTO</span>
                    <span className="ml-auto inline-flex items-center rounded-full bg-orange-50 px-2.5 py-1 text-sm font-bold text-orange-700 border border-orange-200">
                      {highestRtoProduct.rto_rate}%
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">out of {formatNumber(highestRtoProduct.total_orders)} orders</p>
                </>
              ) : (
                <p className="text-sm text-slate-400 py-4">No RTO orders recorded yet.</p>
              )}
            </div>
          </div>

          {/* Two separate tables: Returns | RTO */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Product-wise Returns */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Undo2 className="h-5 w-5 text-rose-500" />
                <h3 className="text-lg font-bold text-slate-900">Product-wise Returns</h3>
              </div>
              {returnsProducts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">
                        <th className="p-3 rounded-tl-lg">Product/SKU</th>
                        <th className="p-3 text-right">Total Orders</th>
                        <th className="p-3 text-right">Returns</th>
                        <th className="p-3 text-right rounded-tr-lg">Return Rate</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-slate-100">
                      {returnsProducts.slice(0, 5).map((p, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 align-top" style={{ maxWidth: '200px' }}>
                            <ExpandableName name={p.product_name} lines={2} valueClass="font-semibold text-slate-900 text-sm" />
                            <p className="text-xs text-slate-500 font-mono truncate" title={p.sku}>{p.sku}</p>
                          </td>
                          <td className="p-3 text-right text-slate-600">{formatNumber(p.total_orders)}</td>
                          <td className="p-3 text-right font-semibold text-rose-600">{formatNumber(p.returns)}</td>
                          <td className="p-3 text-right font-semibold text-slate-700">{p.return_rate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Undo2 className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm font-medium">No customer returns found</p>
                </div>
              )}
            </div>

            {/* Product-wise RTO */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <RotateCcw className="h-5 w-5 text-orange-500" />
                <h3 className="text-lg font-bold text-slate-900">Product-wise RTO</h3>
              </div>
              {rtoProducts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">
                        <th className="p-3 rounded-tl-lg">Product/SKU</th>
                        <th className="p-3 text-right">Total Orders</th>
                        <th className="p-3 text-right">RTO</th>
                        <th className="p-3 text-right rounded-tr-lg">RTO Rate</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-slate-100">
                      {rtoProducts.slice(0, 5).map((p, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 align-top" style={{ maxWidth: '200px' }}>
                            <ExpandableName name={p.product_name} lines={2} valueClass="font-semibold text-slate-900 text-sm" />
                            <p className="text-xs text-slate-500 font-mono truncate" title={p.sku}>{p.sku}</p>
                          </td>
                          <td className="p-3 text-right text-slate-600">{formatNumber(p.total_orders)}</td>
                          <td className="p-3 text-right font-semibold text-orange-600">{formatNumber(p.rto)}</td>
                          <td className="p-3 text-right font-semibold text-slate-700">{p.rto_rate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <RotateCcw className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm font-medium">No RTO orders found</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Upload Center */}
        <div ref={uploadSectionRef} className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <UploadCloud className="h-6 w-6 text-indigo-600" />
            Upload Seller Data
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Orders Upload Area */}
            <div>
              <div className="group relative rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 p-6 text-center hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 shadow-sm group-hover:scale-105 transition-transform">
                  <FileSpreadsheet className="h-7 w-7 text-indigo-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">Orders</h3>
                <p className="text-sm text-slate-500 mb-4">Upload Orders CSV (Multiple allowed)</p>
                <input type="file" accept=".csv" multiple ref={ordersInputRef} onChange={handleOrdersChange} className="hidden" />
                <button 
                  onClick={() => ordersInputRef.current?.click()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                >
                  Browse Orders
                </button>
              </div>
              {ordersFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Selected Orders</p>
                  {ordersFiles.map((f, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileText className="h-4 w-4 text-indigo-500 shrink-0" />
                        <span className="text-sm font-medium text-slate-700 truncate">{f.name}</span>
                      </div>
                      <button onClick={() => removeOrderFile(i)} className="text-slate-400 hover:text-red-500 transition-colors"><X className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payments Upload Area */}
            <div>
              <div className="group relative rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 p-6 text-center hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 shadow-sm group-hover:scale-105 transition-transform">
                  <FileSpreadsheet className="h-7 w-7 text-indigo-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">Payments</h3>
                <p className="text-sm text-slate-500 mb-4">Upload Payments XLSX (Multiple allowed)</p>
                <input type="file" accept=".xlsx" multiple ref={paymentsInputRef} onChange={handlePaymentsChange} className="hidden" />
                <button 
                  onClick={() => paymentsInputRef.current?.click()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                >
                  Browse Payments
                </button>
              </div>
              {paymentsFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Selected Payments</p>
                  {paymentsFiles.map((f, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileText className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span className="text-sm font-medium text-slate-700 truncate">{f.name}</span>
                      </div>
                      <button onClick={() => removePaymentFile(i)} className="text-slate-400 hover:text-red-500 transition-colors"><X className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="w-full sm:w-1/2 md:w-1/3">
                <label htmlFor="reportingPeriod" className="block text-sm font-medium text-slate-700 mb-1">Reporting Month (Optional)</label>
                <input 
                  type="text" id="reportingPeriod" placeholder="e.g. April 2026" value={reportingPeriod} onChange={(e) => setReportingPeriod(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-shadow"
                />
              </div>
              <button 
                onClick={handleUpload}
                disabled={isUploading || (ordersFiles.length === 0 && paymentsFiles.length === 0)}
                className={`inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-8 py-2.5 text-sm font-bold text-white shadow-sm transition-all ${
                  isUploading || (ordersFiles.length === 0 && paymentsFiles.length === 0) ? 'opacity-60 cursor-not-allowed' : 'hover:bg-indigo-700 hover:shadow-md'
                }`}
              >
                {isUploading ? 'Uploading...' : 'Upload Files'}
              </button>
            </div>
            {uploadMessage && (
              <div className={`mt-6 flex items-start gap-3 rounded-xl p-4 text-sm border ${uploadMessage.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}`}>
                {uploadMessage.type === 'error' ? <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" /> : <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />}
                <p className="font-medium leading-relaxed">{uploadMessage.text}</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Imports Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Recent Imports</h2>
          {!importHistory ? (
            <div className="py-8 text-center text-slate-500 animate-pulse">Loading import history...</div>
          ) : importHistory.length === 0 ? (
            <div className="py-12 text-center text-slate-500 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
              No import history yet. Your uploaded reports will appear here.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">File Name</th>
                    <th className="py-3 px-4">Reporting Month</th>
                    <th className="py-3 px-4 text-right">Total Rows</th>
                    <th className="py-3 px-4 text-right">New Rows</th>
                    <th className="py-3 px-4 text-right">Duplicates</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Uploaded At</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-200">
                  {importHistory.slice(0, 10).map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-900 capitalize">{item.import_type}</td>
                      <td className="py-3 px-4 text-slate-600 truncate max-w-[200px]" title={item.original_filename}>{item.original_filename}</td>
                      <td className="py-3 px-4 text-slate-600">{item.reporting_period || <span className="text-slate-400 italic">Auto</span>}</td>
                      <td className="py-3 px-4 text-slate-600 text-right">{item.total_rows}</td>
                      <td className="py-3 px-4 text-emerald-600 font-semibold text-right">{item.inserted_rows}</td>
                      <td className="py-3 px-4 text-orange-500 font-semibold text-right">{item.duplicate_rows}</td>
                      <td className="py-3 px-4 text-center">
                        {item.status === 'success' ? (
                          item.inserted_rows === 0 && item.duplicate_rows > 0 ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-200">Skipped Dupes</span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">Success</span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 border border-red-200">Failed</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-xs">{new Date(item.uploaded_at + 'Z').toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
