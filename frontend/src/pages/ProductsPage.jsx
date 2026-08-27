import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Search, Filter, AlertCircle, CheckCircle2, AlertTriangle, ShoppingCart, Layers, ArrowRight } from 'lucide-react';

/**
 * Products
 * --------
 * A catalog of every SKU that appears in the seller's uploaded orders, with the
 * lifetime performance the database can actually support. Data comes from
 * /api/analytics/product-profitability (one row per matched SKU).
 *
 * COGS / Profit / Margin are shown ONLY when a Cost Per Unit has been configured
 * for that SKU (has_cost === true). When it hasn't, we show N/A — never a fake
 * zero profit. Per-month returns/RTO for a product live on Period Analysis, so we
 * link there instead of duplicating that logic here.
 */
export default function ProductsPage() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [costFilter, setCostFilter] = useState('all'); // all | configured | missing

  const money = (v) =>
    `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        navigate('/login');
        return;
      }
      try {
        const res = await fetch('http://127.0.0.1:8000/api/analytics/product-profitability', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          localStorage.removeItem('access_token');
          navigate('/login');
          return;
        }
        if (!res.ok) throw new Error('Failed to load products');
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message || 'An error occurred while loading products.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [navigate]);

  const summary = useMemo(() => {
    let units = 0;
    let orders = 0;
    let settlement = 0;
    let configured = 0;
    for (const p of products) {
      units += p.units_sold || 0;
      orders += p.orders || 0;
      settlement += p.settlement || 0;
      if (p.has_cost) configured += 1;
    }
    return {
      total: products.length,
      configured,
      missing: products.length - configured,
      units,
      orders,
      settlement,
    };
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (costFilter === 'configured' && !p.has_cost) return false;
      if (costFilter === 'missing' && p.has_cost) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match =
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          (p.product_name && p.product_name.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [products, searchQuery, costFilter]);

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center text-slate-500">Loading products...</div>;
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

  return (
    <div className="mx-auto max-w-7xl py-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Products</h1>
        <p className="mt-2 text-lg text-slate-600">
          Every product (SKU) from your uploaded orders, with lifetime performance and cost-configuration status.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Total Products" value={summary.total} icon={Package} tone="indigo" />
        <StatCard label="Total Orders" value={summary.orders} icon={ShoppingCart} tone="slate" />
        <StatCard label="Units Sold" value={summary.units} icon={Layers} tone="slate" />
        <StatCard label="Cost Configured" value={summary.configured} icon={CheckCircle2} tone="emerald" subtitle="have Cost Per Unit" />
        <StatCard label="Cost Missing" value={summary.missing} icon={AlertTriangle} tone="amber" subtitle="need Cost Per Unit" />
      </div>

      {/* Missing-cost hint */}
      {summary.missing > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-amber-800">
              <span className="font-semibold">{summary.missing}</span> product{summary.missing !== 1 ? 's have' : ' has'} no Cost Per Unit configured, so their COGS, Profit and Margin show as <span className="font-semibold">N/A</span>.
            </p>
            <button
              onClick={() => navigate('/dashboard/product-costs')}
              className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-amber-700 hover:text-amber-900"
            >
              Configure product costs <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-900">Product Catalog</h2>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto flex items-center bg-white rounded-lg border border-slate-200 p-1">
              <Filter className="h-4 w-4 text-slate-400 ml-2 mr-1" />
              <select
                value={costFilter}
                onChange={(e) => setCostFilter(e.target.value)}
                className="border-0 bg-transparent py-1.5 pl-2 pr-8 text-sm font-medium text-slate-700 focus:ring-0 cursor-pointer"
              >
                <option value="all">All Products</option>
                <option value="configured">Cost Configured</option>
                <option value="missing">Cost Missing</option>
              </select>
            </div>
            <div className="relative w-full sm:w-64">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search SKU or Product..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full rounded-lg border-0 py-2 pl-10 pr-4 text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-900 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold">SKU / Product</th>
                <th className="px-6 py-4 font-semibold text-right">Orders</th>
                <th className="px-6 py-4 font-semibold text-right">Units</th>
                <th className="px-6 py-4 font-semibold text-right">Settlement</th>
                <th className="px-6 py-4 font-semibold text-right">COGS</th>
                <th className="px-6 py-4 font-semibold text-right">Profit / Loss</th>
                <th className="px-6 py-4 font-semibold text-right">Margin</th>
                <th className="px-6 py-4 font-semibold text-center">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <Search className="h-8 w-8 text-slate-300 mb-3" />
                      <p className="text-lg font-medium text-slate-900">No products found</p>
                      <p className="mt-1">Try adjusting your filters or search query.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.sku} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-mono text-xs font-semibold text-slate-500 mb-0.5">{p.sku}</div>
                      <div className="font-medium text-slate-900 line-clamp-1" title={p.product_name}>{p.product_name}</div>
                    </td>
                    <td className="px-6 py-4 text-right font-medium">{p.orders}</td>
                    <td className="px-6 py-4 text-right">{p.units_sold}</td>
                    <td className="px-6 py-4 text-right font-medium text-slate-900">{money(p.settlement)}</td>

                    {p.has_cost ? (
                      <>
                        <td className="px-6 py-4 text-right text-slate-500">{money(p.product_cost)}</td>
                        <td className="px-6 py-4 text-right font-bold">
                          <span className={p.estimated_profit >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                            {p.estimated_profit >= 0 ? '+' : ''}{money(p.estimated_profit)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold ${
                            p.profit_margin >= 20 ? 'bg-emerald-100 text-emerald-700' :
                            p.profit_margin > 0 ? 'bg-emerald-50 text-emerald-600' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {p.profit_margin}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 inline" />
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 text-right text-slate-400 italic">N/A</td>
                        <td className="px-6 py-4 text-right text-slate-400 italic">N/A</td>
                        <td className="px-6 py-4 text-right text-slate-400 italic">N/A</td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center gap-1 text-amber-600 text-xs font-medium">
                            <AlertTriangle className="h-3.5 w-3.5" /> Missing
                          </span>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-slate-50 border-t border-slate-200 p-4 text-xs text-slate-500 text-center">
          Showing {filtered.length} of {summary.total} product{summary.total !== 1 ? 's' : ''} · For month-wise sales, returns &amp; RTO per product, see Period Analysis.
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone, subtitle }) {
  const tones = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
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
