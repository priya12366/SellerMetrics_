import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, AlertCircle, IndianRupee, TrendingDown, Wallet, ArrowDownRight,
  CheckCircle2, Copy, Package, RotateCcw, Undo2, Layers,
} from 'lucide-react';

/**
 * Reports
 * -------
 * A consolidated, read-only report built ONLY from real database endpoints:
 *   - /api/reports/summary          (processing + matched financial totals)
 *   - /api/reports/matching-summary (reconciliation + data quality)
 *   - /api/analytics/monthly-summary  (month-by-month breakdown)
 *
 * Nothing is invented. Financial totals are "matched orders only" (an order that
 * has a settlement row). Known fees are the deduction columns that actually exist
 * in the settlement report, so they are labelled as partial/known — they are not
 * forced to reconcile the full Gross → Settlement gap.
 */
export default function ReportsPage() {
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [matching, setMatching] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeductions, setShowDeductions] = useState(false);

  const money = (v) => {
    if (v === null || v === undefined || v === '') return '—';
    const n = parseFloat(v);
    if (Number.isNaN(n)) return '—';
    const s = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(Math.abs(n));
    return n < 0 ? `-${s}` : s;
  };

  useEffect(() => {
    const fetchAll = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        navigate('/login');
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };
      try {
        const [sRes, mRes, moRes] = await Promise.all([
          fetch('http://127.0.0.1:8000/api/reports/summary', { headers }),
          fetch('http://127.0.0.1:8000/api/reports/matching-summary', { headers }),
          fetch('http://127.0.0.1:8000/api/analytics/monthly-summary', { headers }),
        ]);
        if ([sRes, mRes, moRes].some((r) => r.status === 401)) {
          localStorage.removeItem('access_token');
          navigate('/login');
          return;
        }
        if (!sRes.ok || !mRes.ok || !moRes.ok) throw new Error('Failed to load report data');
        setSummary(await sRes.json());
        setMatching(await mRes.json());
        setMonthly(await moRes.json());
      } catch (err) {
        setError(err.message || 'An error occurred while building the report.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchAll();
  }, [navigate]);

  const fin = useMemo(() => {
    if (!summary) return null;
    const f = summary.matched_financials || {};
    const num = (k) => parseFloat(f[k] || 0);
    const gross = num('gross_sale_amount');
    const settlement = num('final_settlement_amount');
    // Total deductions come straight from the backend (Gross − Settlement),
    // itemised by the shared source-backed breakdown — never a client-side
    // partial sum of a hand-picked subset of columns.
    const totalDeductions =
      summary.matched_total_deductions != null
        ? parseFloat(summary.matched_total_deductions)
        : gross - settlement;
    return {
      gross,
      saleReturns: num('sale_return_amount'),
      settlement,
      totalDeductions,
      gap: gross - settlement,
    };
  }, [summary]);

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center text-slate-500">Building report...</div>;
  }
  if (error) {
    return (
      <div className="p-6">
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
  if (!summary || !fin) return null;

  const m = matching || {};
  const matchRate = m.matching?.match_rate ?? 0;

  // Source-backed, itemised deduction breakdown (matched scope). Each line is a
  // real settlement-report column; together they reconcile Gross → Settlement.
  const breakdown = summary.matched_financials_breakdown || [];
  const breakdownSum = breakdown.reduce((s, d) => s + (d.amount || 0), 0);

  return (
    <div className="mx-auto max-w-7xl py-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-indigo-50 p-2.5">
          <FileText className="h-6 w-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Reports</h1>
          <p className="mt-1 text-slate-600">A consolidated summary of your uploaded orders, settlements and reconciliation — all from your live data.</p>
        </div>
      </div>

      {/* Processing Overview */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">Processing Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <MiniStat label="Total Orders" value={summary.total_orders} icon={Package} />
          <MiniStat label="Matched" value={summary.matched_orders} icon={CheckCircle2} tone="emerald" />
          <MiniStat label="Unmatched Orders" value={summary.unmatched_orders} icon={ArrowDownRight} tone="amber" />
          <MiniStat label="Payment Rows" value={summary.total_payment_rows} icon={Layers} />
          <MiniStat label="Unmatched Pmts" value={summary.unmatched_payment_rows} icon={ArrowDownRight} tone="amber" />
          <MiniStat label="Delivered" value={summary.delivered_orders} icon={CheckCircle2} tone="emerald" />
          <MiniStat label="Return / RTO" value={summary.return_rto_orders} icon={Undo2} tone="rose" />
        </div>
      </section>

      {/* Financial Summary */}
      {/* block w-full overrides a global `section { display:flex; justify-content:center }`
          rule leaking in from LandingPage.css, which otherwise shrinks this grid to
          content width and truncates the card amounts. */}
      <section className="block w-full">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Financial Summary</h2>
          <span className="text-xs font-medium text-slate-400">Matched orders only</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <BigStat label="Gross Sales" value={money(fin.gross)} icon={IndianRupee} tone="slate" hint="Total order value before any deductions" />
          <BigStat label="Sale Returns" value={money(fin.saleReturns)} icon={Undo2} tone="rose" hint="Refunded to customers" />
          <BigStat label="Settlement Received" value={money(fin.settlement)} icon={Wallet} tone="indigo" hint="Actually paid out to you" />
          <BigStat label="Gross → Settlement Gap" value={money(fin.gap)} icon={TrendingDown} tone="amber" hint="Sales that never reached you" />
        </div>
        <p className="mt-3 text-xs text-slate-500 flex items-start gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span><strong>Gross Sales</strong> is not profit and not settlement. Settlement is what the platform actually paid you; profit additionally depends on your product costs (see Product Costs / Period Analysis).</span>
        </p>
      </section>

      {/* Where did the money go? */}
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Where did the money go?</h2>
          <span className="text-xs font-medium text-slate-400">Matched orders only</span>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 space-y-4">
            {/* Gross Sales */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-slate-100 p-2"><IndianRupee className="h-4 w-4 text-slate-500" /></div>
                <span className="text-sm font-semibold text-slate-900">Gross Sales</span>
              </div>
              <span className="text-lg font-bold text-slate-900">{money(fin.gross)}</span>
            </div>

            {/* Deductions (collapsible, itemised, reconciling) */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70">
              <button
                type="button"
                onClick={() => setShowDeductions((v) => !v)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <TrendingDown className="h-4 w-4 shrink-0 text-rose-500" />
                  <span className="text-sm font-semibold text-slate-900">Total Deductions</span>
                  <span className="text-xs font-semibold text-indigo-600 whitespace-nowrap">
                    {showDeductions ? 'Hide details' : 'View deduction details'}
                  </span>
                </div>
                <span className="text-lg font-bold text-rose-600 whitespace-nowrap">-{money(fin.totalDeductions)}</span>
              </button>
              {showDeductions && (
                <div className="border-t border-slate-200 px-4 py-3 space-y-2">
                  {breakdown.length === 0 ? (
                    <p className="text-sm text-slate-500">Not separately available in payment data.</p>
                  ) : (
                    <>
                      {breakdown.map((d) => (
                        <div key={d.key} className="flex justify-between items-center gap-3 text-sm">
                          <span className="text-slate-600 min-w-0">{d.label}</span>
                          <span className={`font-medium tabular-nums whitespace-nowrap ${d.amount < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{money(d.amount)}</span>
                        </div>
                      ))}
                      <div className="pt-2 mt-1 border-t border-slate-200 flex justify-between items-center">
                        <span className="text-sm font-semibold text-slate-900">Sum of the lines above</span>
                        <span className="text-sm font-bold text-rose-600 tabular-nums">{money(breakdownSum)}</span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Settlement Received */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-indigo-50 p-2"><Wallet className="h-4 w-4 text-indigo-600" /></div>
                <span className="text-sm font-semibold text-slate-900">Settlement Received</span>
              </div>
              <span className="text-lg font-bold text-indigo-600">{money(fin.settlement)}</span>
            </div>
          </div>

          <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 text-xs text-slate-500 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Every line above is a real column from your uploaded settlement report — nothing is estimated or invented. Together they reconcile <strong>Gross Sales → Settlement Received</strong>. Amounts in red were charged to you; green were credited back.</span>
          </div>
        </div>
      </section>

      {/* Reconciliation & Data Quality */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">Reconciliation &amp; Data Quality</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <MiniStat label="Match Rate" value={`${matchRate}%`} icon={CheckCircle2} tone="emerald" />
          <MiniStat label="Matched Orders" value={m.matching?.matched_orders ?? '—'} icon={CheckCircle2} tone="emerald" />
          <MiniStat label="Unmatched Orders" value={m.matching?.unmatched_orders ?? '—'} icon={ArrowDownRight} tone="amber" />
          <MiniStat label="Unmatched Pmt Rows" value={m.matching?.unmatched_payment_rows ?? '—'} icon={ArrowDownRight} tone="amber" />
          <MiniStat label="Duplicate Orders" value={m.data_quality?.duplicate_order_rows ?? '—'} icon={Copy} tone="rose" />
          <MiniStat label="Duplicate Pmts" value={m.data_quality?.duplicate_payment_rows ?? '—'} icon={Copy} tone="rose" />
        </div>
      </section>

      {/* Monthly Breakdown */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">Monthly Breakdown</h2>
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {monthly.length === 0 ? (
            <div className="py-16 text-center text-slate-500">No monthly data available yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-900 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Month</th>
                    <th className="px-6 py-4 font-semibold text-right">Orders</th>
                    <th className="px-6 py-4 font-semibold text-right">Gross Sales</th>
                    <th className="px-6 py-4 font-semibold text-right">Settlement</th>
                    <th className="px-6 py-4 font-semibold text-right">Returns</th>
                    <th className="px-6 py-4 font-semibold text-right">RTO</th>
                    <th className="px-6 py-4 font-semibold text-right">Profit*</th>
                    <th className="px-6 py-4 font-semibold text-right">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthly.map((row) => (
                    <tr key={row.month} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">{row.month}</td>
                      <td className="px-6 py-4 text-right">{row.orders}</td>
                      <td className="px-6 py-4 text-right">{money(row.gross_sales)}</td>
                      <td className="px-6 py-4 text-right font-medium text-slate-900">{money(row.settlement)}</td>
                      <td className="px-6 py-4 text-right text-rose-600">{row.returns}</td>
                      <td className="px-6 py-4 text-right text-orange-600">{row.rto}</td>
                      <td className="px-6 py-4 text-right font-bold">
                        <span className={row.profit === null || row.profit === undefined ? 'text-slate-400' : (row.profit >= 0 ? 'text-emerald-600' : 'text-red-600')}>{money(row.profit)}</span>
                      </td>
                      <td className="px-6 py-4 text-right">{row.margin === null || row.margin === undefined ? '—' : `${row.margin}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
            *Profit = settlement received − configured product cost (COGS). Any month with a SKU missing its configured Cost Per Unit shows Profit and Margin as N/A (—) rather than assuming zero cost.
          </div>
        </div>
      </section>
    </div>
  );
}

function MiniStat({ label, value, icon: Icon, tone = 'slate' }) {
  const tones = {
    slate: 'text-slate-500',
    emerald: 'text-emerald-500',
    amber: 'text-amber-500',
    rose: 'text-rose-500',
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-4 w-4 ${tones[tone]}`} />
        <p className="text-xs font-medium text-slate-500 truncate">{label}</p>
      </div>
      <p className="text-xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function BigStat({ label, value, icon: Icon, tone, hint }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    rose: 'bg-rose-50 text-rose-600',
    amber: 'bg-amber-50 text-amber-600',
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm min-w-0">
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="min-w-0 text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
        <div className={`shrink-0 rounded-lg p-2 ${tones[tone] || tones.slate}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-900 leading-tight tabular-nums break-words">{value}</p>
      {hint && <p className="mt-1 text-xs font-medium text-slate-400">{hint}</p>}
    </div>
  );
}
