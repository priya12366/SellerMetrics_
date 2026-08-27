import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Undo2, RotateCcw, AlertCircle, Search, Filter, Truck, Percent, Package } from 'lucide-react';

/**
 * Returns & RTO
 * --------------
 * Every row here comes from /api/settlements (matched Order + Payment rows).
 * We keep ONLY the rows whose live_order_status is "Return" or "RTO", so the
 * numbers stay consistent with the Dashboard / Period Analysis definitions.
 * Nothing on this page is invented — refund and return-shipping figures are the
 * actual values stored on the payment rows, and we show "—" when a value is
 * missing rather than a fake zero.
 */
export default function ReturnsPage() {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [totalSettled, setTotalSettled] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // All | Return | RTO

  const formatMoney = (amount) => {
    if (amount === null || amount === undefined || amount === '') return '—';
    const num = parseFloat(amount);
    if (Number.isNaN(num)) return '—';
    const isNegative = num < 0;
    const formatted = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(Math.abs(num));
    return isNegative ? `-${formatted}` : formatted;
  };

  const formatShortDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr + 'Z').toLocaleDateString();
  };

  const isRTO = (status) => (status || '').toUpperCase() === 'RTO';
  const isReturn = (status) => (status || '').toLowerCase() === 'return';

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        navigate('/login');
        return;
      }
      try {
        const res = await fetch('http://127.0.0.1:8000/api/settlements', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          localStorage.removeItem('access_token');
          navigate('/login');
          return;
        }
        if (!res.ok) throw new Error('Failed to fetch returns data');

        const data = await res.json();
        const all = data.settlements || [];
        setTotalSettled(all.length);
        // Only Return / RTO rows belong on this page.
        setRows(all.filter((s) => isReturn(s.live_order_status) || isRTO(s.live_order_status)));
      } catch (err) {
        setError(err.message || 'An error occurred while fetching returns.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [navigate]);

  const stats = useMemo(() => {
    let returnCount = 0;
    let rtoCount = 0;
    let refundTotal = 0;
    let returnShipTotal = 0;
    for (const r of rows) {
      if (isReturn(r.live_order_status)) returnCount += 1;
      if (isRTO(r.live_order_status)) rtoCount += 1;
      refundTotal += Math.abs(parseFloat(r.total_sale_return_amount || 0));
      returnShipTotal += Math.abs(parseFloat(r.return_shipping_charge || 0));
    }
    const combined = rows.length;
    const rate = totalSettled > 0 ? (combined / totalSettled) * 100 : null;
    return { returnCount, rtoCount, combined, refundTotal, returnShipTotal, rate };
  }, [rows, totalSettled]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter === 'Return' && !isReturn(r.live_order_status)) return false;
      if (statusFilter === 'RTO' && !isRTO(r.live_order_status)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match =
          r.sub_order_no?.toLowerCase().includes(q) ||
          r.product_name?.toLowerCase().includes(q) ||
          r.sku?.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [rows, statusFilter, searchQuery]);

  const statusBadge = (status) => {
    if (isRTO(status)) return 'bg-orange-50 text-orange-700 border-orange-200';
    if (isReturn(status)) return 'bg-rose-50 text-rose-700 border-rose-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  return (
    <div className="mx-auto max-w-7xl py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Returns &amp; RTO</h1>
        <p className="mt-2 text-lg text-slate-600">
          Orders returned by customers or sent back to origin (RTO), taken directly from your settlement data.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard label="Customer Returns" value={stats.returnCount} icon={Undo2} tone="rose" />
        <StatCard label="RTO Orders" value={stats.rtoCount} icon={RotateCcw} tone="orange" />
        <StatCard
          label="Return + RTO Rate"
          value={stats.rate === null ? 'N/A' : `${stats.rate.toFixed(2)}%`}
          icon={Percent}
          tone="indigo"
          subtitle={totalSettled > 0 ? `of ${totalSettled} settled orders` : undefined}
        />
        <StatCard label="Refund Amount" value={formatMoney(stats.refundTotal)} icon={Package} tone="slate" />
        <StatCard label="Return Shipping" value={formatMoney(stats.returnShipTotal)} icon={Truck} tone="slate" />
      </div>

      {/* Main */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col min-h-[400px]">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 p-5">
          <div className="relative w-full sm:w-96">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search by Sub Order No, Product, SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full sm:w-48 rounded-xl border border-slate-200 py-2.5 pl-3 pr-10 text-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="All">All (Return &amp; RTO)</option>
              <option value="Return">Customer Returns</option>
              <option value="RTO">RTO</option>
            </select>
          </div>
        </div>

        {/* Table / State */}
        <div className="flex-1">
          {isLoading ? (
            <div className="flex h-full items-center justify-center py-20 text-slate-500">Loading returns...</div>
          ) : error ? (
            <div className="m-6 rounded-xl bg-red-50 p-4 text-sm text-red-700 border border-red-200 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-20 px-4 text-center">
              <div className="mb-4 rounded-full bg-slate-50 p-4 border border-slate-100">
                <Undo2 className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No returns or RTO found</h3>
              <p className="mt-1 max-w-md text-sm text-slate-500">
                None of your matched orders have a Return or RTO status yet.
              </p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="py-20 text-center text-slate-500">No records match your search or filter.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-4 pl-6 pr-4">Sub Order No</th>
                    <th className="py-4 px-4">Order Date</th>
                    <th className="py-4 px-4">Product</th>
                    <th className="py-4 px-4">SKU</th>
                    <th className="py-4 px-4 text-center">Qty</th>
                    <th className="py-4 px-4">Status</th>
                    <th className="py-4 px-4 text-right">Sale Amount</th>
                    <th className="py-4 px-4 text-right">Refund</th>
                    <th className="py-4 px-4 text-right">Return Shipping</th>
                    <th className="py-4 pl-4 pr-6 text-right">Final Settlement</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filteredRows.map((s, idx) => (
                    <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 pl-6 pr-4 font-medium text-slate-900">{s.sub_order_no || '—'}</td>
                      <td className="py-4 px-4 text-slate-600">{formatShortDate(s.order_date)}</td>
                      <td className="py-4 px-4 text-slate-600">
                        <div className="truncate max-w-[180px]" title={s.product_name}>{s.product_name || '—'}</div>
                      </td>
                      <td className="py-4 px-4 font-mono text-xs text-slate-500">{s.sku || '—'}</td>
                      <td className="py-4 px-4 text-center text-slate-600">{s.quantity ?? '—'}</td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${statusBadge(s.live_order_status)}`}>
                          {s.live_order_status || 'Unknown'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right text-slate-900">{formatMoney(s.total_sale_amount)}</td>
                      <td className="py-4 px-4 text-right text-rose-600">{formatMoney(s.total_sale_return_amount)}</td>
                      <td className="py-4 px-4 text-right text-slate-600">{formatMoney(s.return_shipping_charge)}</td>
                      <td className="py-4 pl-4 pr-6 text-right font-bold text-slate-900">{formatMoney(s.final_settlement_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!isLoading && !error && filteredRows.length > 0 && (
          <div className="bg-slate-50 border-t border-slate-200 p-4 text-xs text-slate-500 text-center">
            Showing {filteredRows.length} of {rows.length} return/RTO record{rows.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone, subtitle }) {
  const tones = {
    rose: 'bg-rose-50 text-rose-600',
    orange: 'bg-orange-50 text-orange-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    slate: 'bg-slate-100 text-slate-600',
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
        <div className={`rounded-lg p-2 ${tones[tone] || tones.slate}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-900 truncate">{value}</p>
      {subtitle && <p className="mt-1 text-xs font-medium text-slate-400">{subtitle}</p>}
    </div>
  );
}
