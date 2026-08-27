import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3, RefreshCcw, Activity, AlertCircle, ArrowDownRight, Wallet,
  TrendingDown, ShoppingCart, Award, RotateCcw, Undo2, Coins
} from 'lucide-react';
import ExpandableName from '../components/ExpandableName';

export default function PeriodAnalysisPage() {
  const navigate = useNavigate();

  const [availablePeriods, setAvailablePeriods] = useState([]);
  const [selectedPeriodYear, setSelectedPeriodYear] = useState("");
  const [selectedPeriodMonth, setSelectedPeriodMonth] = useState("");
  const [periodAnalysis, setPeriodAnalysis] = useState(null);
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false);
  const [isLoadingPeriods, setIsLoadingPeriods] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAvailablePeriods = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const res = await fetch('http://127.0.0.1:8000/api/analytics/available-periods', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.status === 401) {
          localStorage.removeItem('access_token');
          navigate('/login');
          return;
        }
        let periods = [];
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) periods = data;
        } else {
          setError(`Could not load available periods (server responded ${res.status}).`);
        }
        setAvailablePeriods(periods);
        if (periods.length > 0 && !selectedPeriodYear) {
          setSelectedPeriodYear(periods[0].year);
          setSelectedPeriodMonth(periods[0].months[0]);
        }
      } catch (err) {
        console.error("Failed to load available periods", err);
        setError("Network error: could not reach the server. Is the backend running on port 8000?");
      } finally {
        setIsLoadingPeriods(false);
      }
    };
    fetchAvailablePeriods();
  }, [navigate]);

  const generatePeriodAnalysis = async () => {
    if (!selectedPeriodYear || !selectedPeriodMonth) return;
    setIsGeneratingAnalysis(true);
    setPeriodAnalysis(null);
    setError(null);
    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/analytics/period-analysis?year=${selectedPeriodYear}&month=${selectedPeriodMonth}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) {
        localStorage.removeItem('access_token');
        navigate('/login');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setPeriodAnalysis(data);
      } else {
        let detail = '';
        try { detail = (await res.json()).detail || ''; } catch { /* ignore */ }
        setError(`Failed to generate analysis (server responded ${res.status}). ${detail}`);
      }
    } catch (err) {
      console.error("Failed to generate period analysis", err);
      setError("Network error while generating analysis. Is the backend running on port 8000?");
    } finally {
      setIsGeneratingAnalysis(false);
    }
  };

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
  // Deduction lines carry a sign: negative = charged to the seller, positive = credited back.
  const formatSigned = (amount) => {
    if (amount === undefined || amount === null) return 'N/A';
    const sign = amount < 0 ? '−' : '+';
    return `${sign}${formatMoney(Math.abs(amount))}`;
  };

  if (isLoadingPeriods) {
    return <div className="flex items-center justify-center text-slate-500" style={{ minHeight: '50vh' }}>Loading periods...</div>;
  }

  const overall = periodAnalysis?.overall;
  const highlights = periodAnalysis?.highlights || {};
  const products = Array.isArray(periodAnalysis?.product_performance) ? periodAnalysis.product_performance : [];
  const periodLabel = periodAnalysis?.period?.label;

  // Settlement waterfall (always reconciles: Gross Sales - Total Deductions = Settlement)
  const grossSales = overall?.total_sales ?? 0;
  const settlement = overall?.settlement_amount ?? 0;
  const totalDeductions = overall?.settlement_difference ?? (grossSales - settlement);
  // Itemised, source-backed deduction lines (each a direct sum of a real payment
  // report column for this period). Empty when the backend provides none.
  const deductionBreakdown = Array.isArray(overall?.deduction_breakdown) ? overall.deduction_breakdown : [];

  // Best & Worst Products — one row per metric, rendered as a responsive table
  // (Metric | Product | SKU | Value). Each metric maps to a real highlights entry
  // from the backend; a missing metric renders as "Not available".
  const bestWorst = [
    { title: 'Highest Sales', icon: Coins, chip: 'bg-emerald-50 text-emerald-600', valueClass: 'text-emerald-600', product: highlights.highest_selling, valueKey: 'sales', format: formatMoney },
    { title: 'Most Orders', icon: ShoppingCart, chip: 'bg-indigo-50 text-indigo-600', valueClass: 'text-indigo-600', product: highlights.highest_orders, valueKey: 'orders', format: formatNumber },
    { title: 'Most Profitable', icon: Award, chip: 'bg-emerald-50 text-emerald-600', valueClass: 'text-emerald-600', product: highlights.most_profitable, valueKey: 'profit', format: formatMoney },
    { title: 'Highest Loss', icon: TrendingDown, chip: 'bg-rose-50 text-rose-600', valueClass: 'text-rose-600', product: highlights.highest_loss, valueKey: 'profit', format: formatMoney },
    { title: 'Highest RTO', icon: RotateCcw, chip: 'bg-amber-50 text-amber-600', valueClass: 'text-amber-600', product: highlights.highest_rto, valueKey: 'rto', format: formatNumber },
    { title: 'Highest Returns', icon: Undo2, chip: 'bg-rose-50 text-rose-600', valueClass: 'text-rose-600', product: highlights.highest_return, valueKey: 'returns', format: formatNumber },
  ];

  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Period Analysis</h1>
        <p className="text-sm text-slate-500 mt-1">Deep dive into a single month's performance — every number below is calculated only from that month's records.</p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Select Period</h3>
            <p className="text-sm text-slate-500 mt-1">Choose a year and month, then generate the analysis.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedPeriodYear}
              onChange={e => {
                setSelectedPeriodYear(e.target.value);
                const p = availablePeriods.find(x => x.year.toString() === e.target.value);
                if (p && p.months.length > 0) setSelectedPeriodMonth(p.months[0]);
              }}
              className="rounded-lg border-slate-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
            >
              {availablePeriods.map(p => (
                <option key={p.year} value={p.year}>{p.year}</option>
              ))}
            </select>

            <select
              value={selectedPeriodMonth}
              onChange={e => setSelectedPeriodMonth(e.target.value)}
              className="rounded-lg border-slate-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
            >
              {(availablePeriods.find(p => p.year.toString() === selectedPeriodYear?.toString())?.months || []).map(m => (
                <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
              ))}
            </select>

            <button
              onClick={generatePeriodAnalysis}
              disabled={isGeneratingAnalysis || availablePeriods.length === 0}
              className={`inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors ${isGeneratingAnalysis ? 'opacity-75 cursor-not-allowed' : ''}`}
            >
              {isGeneratingAnalysis ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
              Generate Analysis
            </button>
          </div>
        </div>

        {periodAnalysis && overall ? (
          <div className="space-y-8 animate-in fade-in duration-500">

            {/* Selected period banner */}
            <div className="flex items-center gap-3 rounded-xl bg-indigo-50 border border-indigo-100 px-5 py-3">
              <div className="rounded-lg bg-indigo-600 p-2 text-white"><BarChart3 className="h-5 w-5" /></div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500">Selected Period</p>
                <p className="text-lg font-bold text-slate-900">{periodLabel}</p>
              </div>
            </div>

            {/* Overall Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Gross Sales</p>
                <p className="text-xl font-bold text-slate-900">{formatMoney(overall.total_sales)}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Orders</p>
                <p className="text-xl font-bold text-slate-900">{formatNumber(overall.total_orders)}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Settlement Received</p>
                <p className="text-xl font-bold text-indigo-600">{formatMoney(overall.settlement_amount)}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 border-l-2 border-l-emerald-500">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Gross Profit</p>
                <div className="flex items-end gap-2">
                  <p className="text-xl font-bold text-emerald-600">{formatMoney(overall.gross_profit)}</p>
                  <span className="text-sm font-medium text-emerald-600 mb-0.5">{formatPercent(overall.profit_margin)}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Settlement waterfall - "Where did the money go?" (itemised, source-backed) */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2"><Wallet className="h-4 w-4 text-indigo-500" /> Where did the money go?</h4>
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 text-sm">Gross Sales</span>
                    <span className="font-semibold text-slate-900 tabular-nums">{formatMoney(overall.total_sales)}</span>
                  </div>

                  {/* Actual deduction categories taken directly from the payment report.
                      Only real, non-zero columns are shown; nothing is derived by subtraction. */}
                  {deductionBreakdown.length > 0 ? (
                    <div className="rounded-lg bg-slate-50 border border-slate-100 divide-y divide-slate-100">
                      {deductionBreakdown.map((d) => (
                        <div key={d.key} className="flex justify-between items-start gap-3 px-3 py-2">
                          <span className="min-w-0">
                            <span className="block text-slate-600 text-sm leading-snug">{d.label}</span>
                            {d.source_column && (
                              <span className="block text-xs text-slate-400 font-mono leading-snug mt-0.5 break-words">
                                {d.source_column}
                              </span>
                            )}
                          </span>
                          <span className={`text-sm font-medium tabular-nums shrink-0 ${d.amount < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {formatSigned(d.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
                      <p className="text-xs text-slate-400">No itemised deduction categories are available in the source data for this period.</p>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-1">
                    <span className="text-slate-700 text-sm font-semibold flex items-center gap-1.5"><ArrowDownRight className="h-3.5 w-3.5 text-rose-500" /> Total Deductions</span>
                    <span className={`font-semibold tabular-nums ${totalDeductions >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {totalDeductions >= 0 ? `−${formatMoney(totalDeductions)}` : `+${formatMoney(Math.abs(totalDeductions))}`}
                    </span>
                  </div>

                  <div className="flex justify-between items-center border-t border-slate-200 pt-3 mt-1">
                    <span className="text-slate-900 text-sm font-bold">Settlement Received</span>
                    <span className="font-bold text-indigo-600 text-lg tabular-nums">{formatMoney(overall.settlement_amount)}</span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed pt-1">
                    Each line is a direct sum of the named column in your Meesho settlement report for this period — the grey monospaced text is the exact report column it was summed from. Together they reconcile Gross Sales down to Settlement Received. Nothing is estimated or derived by subtraction: if the report has no separate platform-fee or commission column for this period, none is shown, rather than relabelling a shipping or tax charge as a platform fee.
                  </p>
                </div>
              </div>

              {/* Returns & RTO (kept strictly separate; counts only — the source data has
                  no separate per-RTO monetary amount, so none is invented) */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2"><RefreshCcw className="h-4 w-4 text-rose-500" /> Returns &amp; RTO</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-rose-50 border border-rose-100 p-4">
                    <p className="text-xs font-semibold text-rose-500 uppercase tracking-wider">Returns</p>
                    <p className="text-2xl font-bold text-rose-600 mt-1">{formatNumber(overall.returns)}</p>
                    <p className="text-xs text-rose-400 mt-1">{formatPercent(overall.return_rate)} of orders</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 border border-amber-100 p-4">
                    <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">RTO</p>
                    <p className="text-2xl font-bold text-amber-600 mt-1">{formatNumber(overall.rto)}</p>
                    <p className="text-xs text-amber-500 mt-1">{formatPercent(overall.rto_rate)} of orders</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed pt-3">
                  Returns and RTO (Return-To-Origin) are counted separately, based on each order's status in your payment report. RTO orders settle to ₹0 in the source data, so no RTO deduction amount is shown.
                </p>
              </div>
            </div>

            {/* Best & Worst Products — clean grid of 6 equal cards */}
            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2"><Activity className="h-4 w-4 text-indigo-500" /> Best &amp; Worst Products</h4>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse" style={{ minWidth: '620px' }}>
                  <thead>
                    <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <th className="px-4 py-3" style={{ width: '190px' }}>Metric</th>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3 whitespace-nowrap" style={{ width: '150px' }}>SKU</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap" style={{ width: '130px' }}>Value</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-100 bg-white">
                    {bestWorst.map((row) => {
                      const Icon = row.icon;
                      return (
                        <tr key={row.title} className="hover:bg-slate-50 transition-colors align-top">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className={`rounded-lg p-1.5 shrink-0 ${row.chip}`}><Icon className="h-4 w-4" /></span>
                              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 leading-tight">{row.title}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3" style={{ maxWidth: '340px' }}>
                            {row.product ? (
                              <ExpandableName name={row.product.product_name || row.product.sku} lines={2} valueClass="font-medium text-slate-900 text-sm" />
                            ) : (
                              <span className="text-sm text-slate-400">Not available</span>
                            )}
                          </td>
                          <td className="px-4 py-3 align-middle">
                            {row.product ? (
                              <span className="text-xs text-slate-500 font-mono break-all">{row.product.sku}</span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className={`px-4 py-3 text-right font-bold tabular-nums whitespace-nowrap align-middle ${row.product ? row.valueClass : 'text-slate-400'}`}>
                            {row.product ? row.format(row.product[row.valueKey]) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {!highlights.most_profitable && (
                <p className="text-xs text-slate-400 leading-relaxed pt-3">
                  Profit-based highlights (Most Profitable / Highest Loss) appear once you add product costs (COGS) on the <span className="font-semibold">Product Costs</span> page.
                </p>
              )}
            </div>

            {/* SKU Table */}
            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-3">Product / SKU Performance <span className="font-normal text-slate-400">({products.length} products this period)</span></h4>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <div className="overflow-y-auto" style={{ maxHeight: '560px' }}>
                  <table className="w-full text-left border-collapse" style={{ minWidth: '880px' }}>
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                        <th className="px-4 py-3 bg-slate-50" style={{ minWidth: '260px' }}>Product / SKU</th>
                        <th className="px-4 py-3 text-right whitespace-nowrap bg-slate-50">Orders</th>
                        <th className="px-4 py-3 text-right whitespace-nowrap bg-slate-50">Units</th>
                        <th className="px-4 py-3 text-right whitespace-nowrap bg-slate-50">Sales</th>
                        <th className="px-4 py-3 text-right whitespace-nowrap bg-slate-50">Settlement</th>
                        <th className="px-4 py-3 text-right whitespace-nowrap bg-slate-50">Ret</th>
                        <th className="px-4 py-3 text-right whitespace-nowrap bg-slate-50">RTO</th>
                        <th className="px-4 py-3 text-right whitespace-nowrap bg-slate-50">COGS</th>
                        <th className="px-4 py-3 text-right whitespace-nowrap bg-slate-50">Profit</th>
                        <th className="px-4 py-3 text-right whitespace-nowrap bg-slate-50">Margin</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-slate-100 bg-white">
                      {products.length === 0 ? (
                        <tr><td colSpan="10" className="p-6 text-center text-slate-400">No products for this period.</td></tr>
                      ) : products.map((sku, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors align-top">
                          <td className="px-4 py-3" style={{ maxWidth: '340px' }}>
                            <ExpandableName name={sku.product_name} lines={2} valueClass="font-medium text-slate-900 text-sm" />
                            <div className="mt-1 text-xs text-slate-400 font-mono flex flex-wrap items-center gap-1.5">
                              <span>SKU: {sku.sku}</span>
                              {(sku.sku === highlights.highest_selling?.sku) && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">Best Seller</span>}
                              {(sku.sku === highlights.highest_rto?.sku && sku.rto > 0) && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-rose-100 text-rose-800">High RTO</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600 tabular-nums whitespace-nowrap">{formatNumber(sku.orders)}</td>
                          <td className="px-4 py-3 text-right text-slate-500 tabular-nums whitespace-nowrap">{formatNumber(sku.units_sold)}</td>
                          <td className="px-4 py-3 text-right text-slate-600 tabular-nums whitespace-nowrap">{formatMoney(sku.sales)}</td>
                          <td className="px-4 py-3 text-right text-indigo-600 font-medium tabular-nums whitespace-nowrap">{formatMoney(sku.settlement)}</td>
                          <td className="px-4 py-3 text-right text-slate-500 tabular-nums whitespace-nowrap">{sku.returns > 0 ? sku.returns : '—'}</td>
                          <td className="px-4 py-3 text-right text-slate-500 tabular-nums whitespace-nowrap">{sku.rto > 0 ? sku.rto : '—'}</td>
                          <td className="px-4 py-3 text-right text-slate-500 tabular-nums whitespace-nowrap">{sku.has_cost ? formatMoney(sku.cogs) : <span className="text-amber-500 text-xs">Add cost</span>}</td>
                          <td className={`px-4 py-3 text-right font-semibold tabular-nums whitespace-nowrap ${sku.profit > 0 ? 'text-emerald-600' : sku.profit < 0 ? 'text-rose-600' : 'text-slate-400'}`}>{sku.has_cost ? formatMoney(sku.profit) : '—'}</td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-700 tabular-nums whitespace-nowrap">{sku.has_cost ? formatPercent(sku.margin) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400">
            <BarChart3 className="h-10 w-10 mb-3 opacity-20" />
            <p className="text-sm font-medium">
              {availablePeriods.length === 0
                ? 'No periods available yet — upload order data to get started.'
                : 'Select a period and generate analysis to view insights.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// (HighlightCard removed — Best & Worst Products now render as a responsive
// Metric | Product | SKU | Value table inline above.)
