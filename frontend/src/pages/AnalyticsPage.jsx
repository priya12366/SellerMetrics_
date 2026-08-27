import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart2, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  XCircle,
  ShoppingBag,
  CreditCard,
  Percent,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Package,
  Activity,
  Lightbulb,
  ArrowRight,
  IndianRupee,
  ShieldCheck,
  RefreshCw,
  Info
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

export default function AnalyticsPage() {
  const [matchingSummary, setMatchingSummary] = useState(null);
  const [profitSummary, setProfitSummary] = useState(null);
  const [productPerformance, setProductPerformance] = useState([]);
  const [historicalData, setHistoricalData] = useState([]);
  
  const [unmatchedOrders, setUnmatchedOrders] = useState([]);
  const [uoTotal, setUoTotal] = useState(0);
  const [uoPage, setUoPage] = useState(0);
  
  const [unmatchedPayments, setUnmatchedPayments] = useState([]);
  const [upTotal, setUpTotal] = useState(0);
  const [upPage, setUpPage] = useState(0);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [chartPeriod, setChartPeriod] = useState(30); // 7, 30, 90
  
  const navigate = useNavigate();
  const PAGE_SIZE = 5; // User requested compact list (first 5 rows)
  
  const unmatchedOrdersRef = useRef(null);
  const unmatchedPaymentsRef = useRef(null);

  useEffect(() => {
    fetchDashboards();
  }, [navigate]);

  useEffect(() => {
    if (matchingSummary) fetchUnmatchedOrders();
  }, [uoPage]);

  useEffect(() => {
    if (matchingSummary) fetchUnmatchedPayments();
  }, [upPage]);

  useEffect(() => {
    fetchHistoricalData();
  }, [chartPeriod]);

  const getHeaders = () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
      throw new Error('Unauthorized');
    }
    return { 'Authorization': `Bearer ${token}` };
  };

  const fetchHistoricalData = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/analytics/historical-trend?days=${chartPeriod}`, { headers: getHeaders() });
      if (res.ok) {
        setHistoricalData(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDashboards = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const headers = getHeaders();
      const [matchingRes, profitRes, productRes, historicalRes] = await Promise.all([
        fetch('http://127.0.0.1:8000/api/analytics/matching-summary', { headers }),
        fetch('http://127.0.0.1:8000/api/analytics/profit-summary', { headers }),
        fetch('http://127.0.0.1:8000/api/analytics/product-profitability', { headers }),
        fetch(`http://127.0.0.1:8000/api/analytics/historical-trend?days=${chartPeriod}`, { headers })
      ]);
      
      if (!matchingRes.ok || !profitRes.ok || !productRes.ok) {
        throw new Error('Failed to load business intelligence data.');
      }
      
      setMatchingSummary(await matchingRes.json());
      setProfitSummary(await profitRes.json());
      setProductPerformance(await productRes.json());
      
      if (historicalRes.ok) {
        setHistoricalData(await historicalRes.json());
      }
      
      // Initialize tables
      fetchUnmatchedOrders();
      fetchUnmatchedPayments();
      
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchDashboards();
  };
  
  const fetchUnmatchedOrders = async () => {
    try {
      const skip = uoPage * PAGE_SIZE;
      const res = await fetch(`http://127.0.0.1:8000/api/analytics/unmatched-orders?skip=${skip}&limit=${PAGE_SIZE}`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setUnmatchedOrders(data.items);
        setUoTotal(data.total);
      }
    } catch (e) { console.error(e); }
  };

  const fetchUnmatchedPayments = async () => {
    try {
      const skip = upPage * PAGE_SIZE;
      const res = await fetch(`http://127.0.0.1:8000/api/analytics/unmatched-payments?skip=${skip}&limit=${PAGE_SIZE}`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setUnmatchedPayments(data.items);
        setUpTotal(data.total);
      }
    } catch (e) { console.error(e); }
  };

  const scrollToRef = (ref) => {
    if (ref && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (isLoading && !isRefreshing) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <span className="text-lg font-medium">Loading Business Intelligence...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700 flex items-start gap-4">
          <AlertCircle className="h-6 w-6 shrink-0" />
          <div>
            <h3 className="text-lg font-bold">Error</h3>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!matchingSummary || !profitSummary) return null;

  // Derived Business Logic
  const matchRate = matchingSummary.match_rate || 0;
  const totalProducts = profitSummary.products_with_cost + profitSummary.products_without_cost;
  const configRate = totalProducts > 0 ? (profitSummary.products_with_cost / totalProducts) * 100 : 100;
  const healthScore = Math.round((matchRate * 0.7) + (configRate * 0.3));

  const topProducts = [...productPerformance].sort((a, b) => b.settlement - a.settlement);
  const topRevenueProduct = topProducts[0];
  const topSellingProduct = [...productPerformance].sort((a, b) => b.units_sold - a.units_sold)[0];
  const lowMarginProduct = [...productPerformance].filter(p => p.has_cost).sort((a, b) => a.profit_margin - b.profit_margin)[0];

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 pb-20">
      
      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Activity className="h-6 w-6 text-indigo-600" />
            Business Intelligence & Reconciliation
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track performance, payment accuracy and business health.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button className="px-4 py-1.5 text-sm font-medium rounded-md bg-white text-indigo-700 shadow-sm border border-slate-200/50">All Time</button>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors border border-slate-200 shadow-sm disabled:opacity-50 w-full sm:w-auto"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* 1. KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <CompactKPICard title="Orders Processed" value={matchingSummary.total_orders} icon={ShoppingBag} color="blue" subtitle="Total Uploaded" />
        <CompactKPICard title="Total Settlement" value={`₹${profitSummary.total_settlement.toFixed(2)}`} icon={IndianRupee} color="emerald" subtitle="Reconciled Payouts" />
        <CompactKPICard title="Gross Profit" value={profitSummary.estimated_gross_profit === null ? 'N/A' : `₹${profitSummary.estimated_gross_profit.toFixed(2)}`} icon={TrendingUp} color="indigo" subtitle="Estimated Returns" />
        <CompactKPICard title="Profit Margin" value={profitSummary.profit_margin === null ? 'N/A' : `${profitSummary.profit_margin}%`} icon={Percent} color="amber" subtitle="Avg Margin" />
        <CompactKPICard title="Reconciliation Rate" value={`${matchingSummary.match_rate}%`} icon={CheckCircle2} color="teal" subtitle="Successfully Matched" />
        
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between min-w-0">
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">Business Health</p>
            <ShieldCheck className="h-4 w-4 text-indigo-500 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1">
            <p className="text-2xl font-bold text-slate-900 truncate">{healthScore}</p>
            <span className="text-slate-400 text-xs font-medium">/100</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 truncate" title="Based on match rate and configured product costs">Score Calculation</p>
        </div>
      </div>

      {/* 2. MAIN ANALYTICS ROW & NEEDS ATTENTION */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* PAYMENT RECONCILIATION */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col">
          <h2 className="text-base font-bold text-slate-900 mb-6 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-indigo-600" />
            Payment Reconciliation
          </h2>
          
          <div className="flex-1 flex flex-col justify-center">
            {/* Simple Visual Flow */}
            <div className="grid grid-cols-3 gap-2 mb-8 text-center relative">
              <div className="absolute top-1/2 left-[16%] right-[16%] h-[2px] bg-slate-100 -z-10 -translate-y-1/2"></div>
              
              <div className="bg-white">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 border-2 border-white ring-4 ring-blue-50 text-blue-600 font-bold text-lg mb-2">
                  {matchingSummary.total_orders}
                </div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Orders</div>
              </div>
              
              <div className="bg-white">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 border-2 border-white ring-4 ring-emerald-50 text-emerald-600 font-bold text-lg mb-2">
                  {matchingSummary.matched_orders}
                </div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reconciled</div>
              </div>
              
              <div className="bg-white">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 border-2 border-white ring-4 ring-amber-50 text-amber-600 font-bold text-lg mb-2">
                  {matchingSummary.unmatched_orders}
                </div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Needs Review</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                <div className="text-xs font-semibold text-slate-500 mb-1">Payment Records</div>
                <div className="text-lg font-bold text-slate-900">{matchingSummary.total_payment_rows}</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                <div className="text-xs font-semibold text-slate-500 mb-1">Unmatched Payments</div>
                <div className="text-lg font-bold text-amber-600">{matchingSummary.unmatched_payments}</div>
              </div>
            </div>

            <div className="flex gap-3 mt-auto">
              <button 
                onClick={() => scrollToRef(unmatchedOrdersRef)}
                className="flex-1 bg-white border border-slate-200 hover:border-indigo-300 text-slate-600 hover:text-indigo-700 text-xs font-bold py-2 px-3 rounded-lg transition-colors flex justify-center items-center"
              >
                Review Orders &rarr;
              </button>
              <button 
                onClick={() => scrollToRef(unmatchedPaymentsRef)}
                className="flex-1 bg-white border border-slate-200 hover:border-indigo-300 text-slate-600 hover:text-indigo-700 text-xs font-bold py-2 px-3 rounded-lg transition-colors flex justify-center items-center"
              >
                Review Payments &rarr;
              </button>
            </div>
          </div>
        </div>

        {/* PERFORMANCE TREND */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-indigo-600" />
              Performance Trend
            </h2>
            <div className="flex bg-slate-50 p-1 rounded-md border border-slate-200">
              <button onClick={() => setChartPeriod(7)} className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${chartPeriod === 7 ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>7D</button>
              <button onClick={() => setChartPeriod(30)} className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${chartPeriod === 30 ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>30D</button>
              <button onClick={() => setChartPeriod(90)} className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${chartPeriod === 90 ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>90D</button>
            </div>
          </div>

          <div className="h-64 w-full flex-1">
            {historicalData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-lg">
                <Activity className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm font-medium">Insufficient historical data for {chartPeriod} Days</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historicalData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10, fill: '#94a3b8' }} 
                    tickFormatter={(val) => {
                      const d = new Date(val);
                      return `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`;
                    }}
                    tickMargin={10} 
                    axisLine={false} 
                    tickLine={false}
                  />
                  <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(val) => `₹${val}`} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Line yAxisId="left" type="monotone" name="Settlement (₹)" dataKey="settlement" stroke="#4f46e5" strokeWidth={2} dot={{ r: 0 }} activeDot={{ r: 4 }} />
                  <Line yAxisId="right" type="monotone" name="Orders" dataKey="orders" stroke="#10b981" strokeWidth={2} dot={{ r: 0 }} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      {/* 3. THREE SMALL BUSINESS CARDS & NEEDS ATTENTION */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* NEEDS ATTENTION (Spans 1 col on LG) */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm flex flex-col">
          <h2 className="text-base font-bold text-amber-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Needs Attention
          </h2>
          <div className="space-y-3 flex-1">
            {matchingSummary.unmatched_orders > 0 && (
              <div className="bg-white p-3 rounded-lg border border-amber-100 shadow-sm flex items-start gap-3">
                <span className="text-lg font-bold text-amber-600 leading-none mt-0.5">⚠</span>
                <div>
                  <p className="text-xs font-bold text-slate-800">{matchingSummary.unmatched_orders} Orders without Payment</p>
                  <button onClick={() => scrollToRef(unmatchedOrdersRef)} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 mt-1">Review unmatched orders &rarr;</button>
                </div>
              </div>
            )}
            {matchingSummary.unmatched_payments > 0 && (
              <div className="bg-white p-3 rounded-lg border border-amber-100 shadow-sm flex items-start gap-3">
                <span className="text-lg font-bold text-amber-600 leading-none mt-0.5">⚠</span>
                <div>
                  <p className="text-xs font-bold text-slate-800">{matchingSummary.unmatched_payments} Payments without Order</p>
                  <button onClick={() => scrollToRef(unmatchedPaymentsRef)} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 mt-1">Review unmatched payments &rarr;</button>
                </div>
              </div>
            )}
            {profitSummary.products_without_cost > 0 && (
              <div className="bg-white p-3 rounded-lg border border-amber-100 shadow-sm flex items-start gap-3">
                <span className="text-lg font-bold text-amber-600 leading-none mt-0.5">⚠</span>
                <div>
                  <p className="text-xs font-bold text-slate-800">{profitSummary.products_without_cost} Products Missing Cost</p>
                  <button onClick={() => navigate('/dashboard/product-costs')} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 mt-1">Configure Product Costs &rarr;</button>
                </div>
              </div>
            )}
            {matchingSummary.unmatched_orders === 0 && matchingSummary.unmatched_payments === 0 && profitSummary.products_without_cost === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-emerald-600 opacity-80">
                <CheckCircle2 className="h-8 w-8 mb-2" />
                <p className="text-xs font-bold text-center">All caught up!<br/>No issues require attention.</p>
              </div>
            )}
          </div>
        </div>
        
        {/* TOP PERFORMING PRODUCTS */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2 flex flex-col min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Package className="h-4 w-4 text-indigo-600" />
              Top Performing Products
            </h2>
            <button onClick={() => navigate('/dashboard/profitability')} className="text-xs font-bold text-indigo-600 hover:text-indigo-800">
              View All &rarr;
            </button>
          </div>
          
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="pb-2 font-semibold">Product</th>
                  <th className="pb-2 font-semibold text-right">Orders</th>
                  <th className="pb-2 font-semibold text-right">Revenue</th>
                  <th className="pb-2 font-semibold text-right">Gross Profit</th>
                  <th className="pb-2 font-semibold text-right">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {topProducts.slice(0, 3).map(p => (
                  <tr key={p.sku} className="hover:bg-slate-50">
                    <td className="py-2.5 max-w-[180px]">
                      <div className="font-semibold text-slate-900 line-clamp-2 leading-snug" title={p.product_name}>
                        {p.product_name || p.sku}
                      </div>
                      {p.product_name && <div className="text-[10px] text-slate-400 font-mono mt-0.5">{p.sku}</div>}
                    </td>
                    <td className="py-2.5 text-right font-medium">{p.orders}</td>
                    <td className="py-2.5 text-right font-medium text-slate-900">₹{p.settlement.toFixed(2)}</td>
                    <td className="py-2.5 text-right font-medium">
                      {p.has_cost ? (
                        <span className={p.estimated_profit >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                          ₹{p.estimated_profit.toFixed(2)}
                        </span>
                      ) : <span className="text-slate-400">-</span>}
                    </td>
                    <td className="py-2.5 text-right font-medium">
                      {p.has_cost ? `${p.profit_margin}%` : <span className="text-slate-400">-</span>}
                    </td>
                  </tr>
                ))}
                {topProducts.length === 0 && (
                  <tr><td colSpan="5" className="text-center py-6 text-slate-400">No product data available</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SELLER INSIGHTS & DATA QUALITY */}
        <div className="space-y-6 flex flex-col min-w-0">
          
          <div className="rounded-xl border border-indigo-100 bg-gradient-to-b from-indigo-50/50 to-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-indigo-900 mb-3 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-indigo-600" />
              Seller Insights
            </h2>
            <div className="space-y-2">
              {topRevenueProduct ? (
                <div className="flex gap-2">
                  <span className="text-[9px] font-bold uppercase text-indigo-500 bg-indigo-100 px-1.5 py-0.5 rounded h-min shrink-0 mt-0.5">Insight</span>
                  <p className="text-xs text-slate-700 line-clamp-2" title={`Highest revenue: ${topRevenueProduct.product_name}`}>
                    <span className="font-semibold text-slate-900">Highest Revenue:</span> {topRevenueProduct.product_name || topRevenueProduct.sku}
                  </p>
                </div>
              ) : null}
              {topSellingProduct ? (
                <div className="flex gap-2">
                  <span className="text-[9px] font-bold uppercase text-indigo-500 bg-indigo-100 px-1.5 py-0.5 rounded h-min shrink-0 mt-0.5">Insight</span>
                  <p className="text-xs text-slate-700 line-clamp-2" title={`Most sold: ${topSellingProduct.product_name}`}>
                    <span className="font-semibold text-slate-900">Most Sold:</span> {topSellingProduct.product_name || topSellingProduct.sku}
                  </p>
                </div>
              ) : null}
              {lowMarginProduct && lowMarginProduct.profit_margin < 15 ? (
                <div className="flex gap-2">
                  <span className="text-[9px] font-bold uppercase text-amber-500 bg-amber-100 px-1.5 py-0.5 rounded h-min shrink-0 mt-0.5">Warning</span>
                  <p className="text-xs text-slate-700 line-clamp-2">
                    <span className="font-semibold text-slate-900">Low Margin ({lowMarginProduct.profit_margin}%):</span> {lowMarginProduct.sku}
                  </p>
                </div>
              ) : null}
              {(!topRevenueProduct && !topSellingProduct) && (
                <p className="text-xs text-slate-400 italic">Generate more data for intelligence insights.</p>
              )}
            </div>
            {/* AI Preparation Note */}
            <div className="mt-4 pt-3 border-t border-indigo-100/50">
              <p className="text-[10px] text-indigo-400 font-medium flex items-center gap-1">
                <Activity className="h-3 w-3" /> Ready for upcoming AI Sales Forecasting
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-3">Data Quality</h2>
            
            <div className="flex items-center gap-3 mb-4">
               {/* Progress Circle (Simple CSS implementation) */}
               <div className="relative h-12 w-12 rounded-full flex items-center justify-center shrink-0 bg-slate-100">
                 <svg className="h-12 w-12 -rotate-90 transform absolute">
                    <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-100" />
                    <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray="125.6" strokeDashoffset={125.6 - (125.6 * (healthScore / 100))} className="text-emerald-500" />
                 </svg>
                 <span className="text-[10px] font-bold text-slate-700">{healthScore}%</span>
               </div>
               <div>
                 <p className="text-xs font-bold text-slate-900">Overall Quality</p>
                 <p className="text-[10px] text-slate-500">Based on system checks</p>
               </div>
            </div>

            <div className="space-y-1.5 text-xs font-medium">
              <QualityRow label="Duplicate Orders" count={matchingSummary.duplicate_orders} />
              <QualityRow label="Duplicate Payments" count={matchingSummary.duplicate_payments} />
              <QualityRow label="Unmatched Orders" count={matchingSummary.unmatched_orders} isWarning={matchingSummary.unmatched_orders > 0} />
              <QualityRow label="Unmatched Payments" count={matchingSummary.unmatched_payments} isWarning={matchingSummary.unmatched_payments > 0} />
              <QualityRow label="Missing Costs" count={profitSummary.products_without_cost} isWarning={profitSummary.products_without_cost > 0} />
            </div>
          </div>

        </div>
      </div>

      {/* 5. UNMATCHED DATA */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pt-6">
        
        {/* UNMATCHED ORDERS */}
        <div ref={unmatchedOrdersRef} className="rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col overflow-hidden min-w-0">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Unmatched Orders</h2>
              <p className="text-xs text-slate-500 mt-0.5">{uoTotal} items require payment reconciliation</p>
            </div>
            <button className="text-xs font-bold text-indigo-600 hover:text-indigo-800">View All &rarr;</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-semibold">Sub Order No</th>
                  <th className="px-4 py-2 font-semibold">Date</th>
                  <th className="px-4 py-2 font-semibold">Product</th>
                  <th className="px-4 py-2 font-semibold text-right">Price</th>
                  <th className="px-4 py-2 font-semibold">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {unmatchedOrders.length === 0 ? (
                  <tr><td colSpan="5" className="text-center py-6 text-slate-400">All orders reconciled.</td></tr>
                ) : (
                  unmatchedOrders.map(order => (
                    <tr key={order.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 font-medium text-slate-900">{order.sub_order_no || '-'}</td>
                      <td className="px-4 py-2">{order.order_date ? new Date(order.order_date).toLocaleDateString() : '-'}</td>
                      <td className="px-4 py-2 max-w-[150px]">
                        <div className="truncate" title={order.product_name}>{order.product_name || '-'}</div>
                      </td>
                      <td className="px-4 py-2 text-right font-medium">
                        {order.supplier_listed_price !== null ? `₹${order.supplier_listed_price.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-4 py-2">{order.customer_state || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {uoTotal > PAGE_SIZE && (
            <div className="mt-auto px-5 py-3 border-t border-slate-100">
               <Pagination page={uoPage} total={uoTotal} pageSize={PAGE_SIZE} onPageChange={setUoPage} />
            </div>
          )}
        </div>

        {/* UNMATCHED PAYMENTS */}
        <div ref={unmatchedPaymentsRef} className="rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col overflow-hidden min-w-0">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Unmatched Payments</h2>
              <p className="text-xs text-slate-500 mt-0.5">{upTotal} items missing order record</p>
            </div>
            <button className="text-xs font-bold text-indigo-600 hover:text-indigo-800">View All &rarr;</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-semibold">Sub Order No</th>
                  <th className="px-4 py-2 font-semibold">Transaction ID</th>
                  <th className="px-4 py-2 font-semibold">Date</th>
                  <th className="px-4 py-2 font-semibold text-right">Amount</th>
                  <th className="px-4 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {unmatchedPayments.length === 0 ? (
                  <tr><td colSpan="5" className="text-center py-6 text-slate-400">No unmatched payments found.</td></tr>
                ) : (
                  unmatchedPayments.map(payment => (
                    <tr key={payment.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 font-medium text-slate-900">{payment.sub_order_no || '-'}</td>
                      <td className="px-4 py-2 font-mono text-[10px]">{payment.transaction_id || '-'}</td>
                      <td className="px-4 py-2">{payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : '-'}</td>
                      <td className="px-4 py-2 text-right font-medium text-indigo-600">
                        {payment.final_settlement_amount !== null ? `₹${payment.final_settlement_amount}` : '-'}
                      </td>
                      <td className="px-4 py-2"><span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-500">Needs Review</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {upTotal > PAGE_SIZE && (
            <div className="mt-auto px-5 py-3 border-t border-slate-100">
               <Pagination page={upPage} total={upTotal} pageSize={PAGE_SIZE} onPageChange={setUpPage} />
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

// Subcomponents

function CompactKPICard({ title, value, icon: Icon, color, subtitle }) {
  const colorStyles = {
    blue: 'text-blue-600 bg-blue-50',
    indigo: 'text-indigo-600 bg-indigo-50',
    emerald: 'text-emerald-600 bg-emerald-50',
    amber: 'text-amber-600 bg-amber-50',
    teal: 'text-teal-600 bg-teal-50',
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between min-w-0">
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate mr-2" title={title}>{title}</p>
        <div className={`rounded p-1.5 shrink-0 ${colorStyles[color]}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <p className="text-xl font-bold text-slate-900 truncate" title={value}>{value}</p>
      <p className="text-[10px] text-slate-400 mt-1 truncate" title={subtitle}>{subtitle}</p>
    </div>
  );
}

function QualityRow({ label, count, isWarning = false }) {
  const healthy = count === 0;
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-1.5">
        {healthy ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <AlertTriangle className={`h-3.5 w-3.5 ${isWarning ? 'text-amber-500' : 'text-red-500'}`} />}
        <span className="text-slate-600 truncate">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-bold text-slate-900">{count}</span>
        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${healthy ? 'bg-emerald-100 text-emerald-700' : isWarning ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
          {healthy ? 'Healthy' : 'Review'}
        </span>
      </div>
    </div>
  );
}

function Pagination({ page, total, pageSize, onPageChange }) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between w-full">
      <p className="text-[10px] text-slate-500 font-medium">
        {page * pageSize + 1}-{Math.min((page + 1) * pageSize, total)} of {total}
      </p>
      <div className="flex gap-1">
        <button disabled={page === 0} onClick={() => onPageChange(page - 1)} className="rounded border border-slate-200 p-1 text-slate-500 hover:bg-slate-50 disabled:opacity-50">
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <button disabled={page >= totalPages - 1} onClick={() => onPageChange(page + 1)} className="rounded border border-slate-200 p-1 text-slate-500 hover:bg-slate-50 disabled:opacity-50">
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
