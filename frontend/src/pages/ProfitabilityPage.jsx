import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  TrendingDown,
  Loader2, 
  AlertCircle,
  Package,
  IndianRupee,
  Percent,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  HelpCircle
} from 'lucide-react';
import ExpandableName from '../components/ExpandableName';

export default function ProfitabilityPage() {
  const [summary, setSummary] = useState(null);
  const [products, setProducts] = useState([]);
  const [lossReasons, setLossReasons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // all, profitable, loss, missing_cost
  // Loss cards are collapsed to the first 6 by default; "View all N" reveals the rest.
  const [showAllLoss, setShowAllLoss] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
      return;
    }
    
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
      const [summaryRes, productsRes, lossReasonsRes] = await Promise.all([
        fetch('http://127.0.0.1:8000/api/analytics/profit-summary', { headers }),
        fetch('http://127.0.0.1:8000/api/analytics/product-profitability', { headers }),
        fetch('http://127.0.0.1:8000/api/analytics/loss-reasons', { headers })
      ]);

      if (!summaryRes.ok || !productsRes.ok) {
        throw new Error('Failed to load profitability analytics.');
      }

      const summaryData = await summaryRes.json();
      const productsData = await productsRes.json();

      setSummary(summaryData);
      setProducts(productsData);

      // Loss reasons are enrichment for the loss cards only. If this call fails
      // for any reason, the page still works — the cards fall back to the basic
      // Settlement / Cost / Loss view.
      if (lossReasonsRes.ok) {
        const lossData = await lossReasonsRes.json();
        setLossReasons(lossData.loss_products || []);
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Search filter
      const matchesSearch = 
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (p.product_name && p.product_name.toLowerCase().includes(searchQuery.toLowerCase()));
        
      if (!matchesSearch) return false;
      
      // Mode filter
      if (filterMode === 'missing_cost') return !p.has_cost;
      if (filterMode === 'profitable') return p.has_cost && p.estimated_profit >= 0;
      if (filterMode === 'loss') return p.has_cost && p.estimated_profit < 0;
      
      return true;
    });
  }, [products, searchQuery, filterMode]);

  const lossMakingProducts = useMemo(() => {
    return products.filter(p => p.has_cost && p.estimated_profit < 0);
  }, [products]);

  // Map SKU -> loss-reason breakdown (from /loss-reasons) so each loss card can
  // show WHY it lost money. Keyed by a normalised SKU (trim + lowercase) to match
  // the backend's SKU identity exactly.
  const lossReasonsBySku = useMemo(() => {
    const map = {};
    for (const r of lossReasons) {
      map[(r.sku || '').trim().toLowerCase()] = r;
    }
    return map;
  }, [lossReasons]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-lg font-medium">Loading profitability analytics...</span>
        </div>
      </div>
    );
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

  if (!summary) return null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          <TrendingUp className="h-6 w-6 text-indigo-600" />
          Profitability Analytics
        </h1>
        <p className="mt-1 text-slate-500">Track estimated gross profit and product margins based on your configured costs.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard 
          title="Total Settlement" 
          value={`₹${summary.total_settlement.toFixed(2)}`} 
          icon={IndianRupee} 
          color="indigo" 
        />
        <KPICard
          title="Product Cost"
          value={summary.total_product_cost === null ? 'N/A' : `₹${summary.total_product_cost.toFixed(2)}`}
          icon={Package}
          color="slate"
        />
        <KPICard
          title="Gross Profit"
          value={summary.estimated_gross_profit === null ? 'N/A' : `₹${summary.estimated_gross_profit.toFixed(2)}`}
          icon={summary.estimated_gross_profit === null ? Package : (summary.estimated_gross_profit >= 0 ? TrendingUp : TrendingDown)}
          color={summary.estimated_gross_profit === null ? 'slate' : (summary.estimated_gross_profit >= 0 ? 'emerald' : 'red')}
        />
        <KPICard
          title="Profit Margin"
          value={summary.profit_margin === null ? 'N/A' : `${summary.profit_margin}%`}
          icon={Percent}
          color="blue"
        />
        <KPICard 
          title="Configured" 
          value={summary.products_with_cost} 
          icon={CheckCircle2} 
          color="emerald" 
          subtitle="Products with cost"
        />
        <KPICard 
          title="Cost Required" 
          value={summary.products_without_cost} 
          icon={AlertTriangle} 
          color="amber" 
          subtitle="Products missing cost"
        />
      </div>

      {/* Loss Making Products Warning */}
      {lossMakingProducts.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <h3 className="text-lg font-bold text-red-900">Products Requiring Attention</h3>
          </div>
          <p className="text-red-700 mb-4 text-sm font-medium">
            The following products have an estimated profit less than zero based on your configured costs and final settlement amounts.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {(showAllLoss ? lossMakingProducts : lossMakingProducts.slice(0, 6)).map(p => {
              const detail = lossReasonsBySku[(p.sku || '').trim().toLowerCase()];
              const settlementVal = detail ? detail.settlement : p.settlement;
              const cogsVal = detail ? detail.product_cost : p.product_cost;
              const lossVal = detail ? detail.loss_amount : Math.abs(p.estimated_profit);
              return (
                <div key={p.sku} className="bg-white p-4 rounded-lg border border-red-100 shadow-sm flex flex-col min-w-0">
                  {/* Identity: SKU + full product name. Long names use the shared
                      ExpandableName (Read more / Read less) so a card never overflows. */}
                  <span className="font-mono text-xs font-semibold text-slate-500 mb-1 truncate" title={p.sku}>{p.sku}</span>
                  <div className="mb-3">
                    <ExpandableName
                      name={p.product_name}
                      lines={2}
                      valueClass="text-sm font-semibold text-slate-900"
                    />
                  </div>

                  {/* Order composition — Returns and RTO are shown SEPARATELY, never combined */}
                  {detail ? (
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      <MiniStat label="Orders" value={detail.total_orders} />
                      <MiniStat label="Delivered" value={detail.delivered} tone="emerald" />
                      <MiniStat label="Returns" value={detail.returns} tone="amber" />
                      <MiniStat label="RTO" value={detail.rto} tone="orange" />
                    </div>
                  ) : (
                    <p className="mb-3 text-xs text-slate-400">Order composition is not available from the payment data.</p>
                  )}

                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Settlement received:</span>
                      <span className="font-medium">₹{Number(settlementVal).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Product COGS:</span>
                      <span className="font-medium">₹{Number(cogsVal).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t border-red-100 pt-1 mt-1">
                      <span className="text-red-700 font-semibold">Loss:</span>
                      <span className="text-red-700 font-bold">₹{Number(lossVal).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Why is this a loss? — plain-language explanation built ONLY from real
                      DB values (backend /loss-reasons). If the breakdown is unavailable we say
                      so rather than guessing a reason. */}
                  <div className="mt-3 rounded-md bg-red-50 border border-red-100 p-3">
                    <p className="text-xs font-bold text-red-800 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                      <HelpCircle className="h-3.5 w-3.5" />
                      Why is this a loss?
                    </p>
                    <p className="text-xs text-red-900 leading-relaxed">
                      {detail && detail.reason ? detail.reason : 'Reason cannot be determined from available data.'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          {lossMakingProducts.length > 6 && (
            <button
              onClick={() => setShowAllLoss(v => !v)}
              className="mt-4 text-sm font-semibold text-red-700 hover:text-red-800"
            >
              {showAllLoss
                ? 'Show fewer'
                : `View all ${lossMakingProducts.length} loss-making products →`}
            </button>
          )}
        </div>
      )}

      {/* Main Table Section */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
        {/* Table Header Controls */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-900">Product Profitability Breakdown</h2>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            {/* Filter */}
            <div className="relative w-full sm:w-auto flex items-center bg-white rounded-lg border border-slate-200 p-1">
              <Filter className="h-4 w-4 text-slate-400 ml-2 mr-1" />
              <select
                value={filterMode}
                onChange={(e) => setFilterMode(e.target.value)}
                className="border-0 bg-transparent py-1.5 pl-2 pr-8 text-sm font-medium text-slate-700 focus:ring-0 cursor-pointer"
              >
                <option value="all">All Products</option>
                <option value="profitable">Profitable</option>
                <option value="loss">Loss / Negative</option>
                <option value="missing_cost">Missing Cost</option>
              </select>
            </div>
            
            {/* Search */}
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

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-900 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold">SKU / Product</th>
                <th className="px-6 py-4 font-semibold text-right">Orders</th>
                <th className="px-6 py-4 font-semibold text-right">Units</th>
                <th className="px-6 py-4 font-semibold text-right">Settlement</th>
                <th className="px-6 py-4 font-semibold text-right">Product Cost</th>
                <th className="px-6 py-4 font-semibold text-right">Estimated Profit</th>
                <th className="px-6 py-4 font-semibold text-right">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <Search className="h-8 w-8 text-slate-300 mb-3" />
                      <p className="text-lg font-medium text-slate-900">No products found</p>
                      <p className="mt-1">Try adjusting your filters or search query.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((item) => (
                  <tr key={item.sku} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-mono text-xs font-semibold text-slate-500 mb-0.5">{item.sku}</div>
                      <div className="font-medium text-slate-900 line-clamp-1" title={item.product_name}>
                        {item.product_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-medium">{item.orders}</td>
                    <td className="px-6 py-4 text-right">{item.units_sold}</td>
                    <td className="px-6 py-4 text-right font-medium text-slate-900">
                      ₹{item.settlement.toFixed(2)}
                    </td>
                    
                    {/* Cost, Profit, Margin Columns */}
                    {!item.has_cost ? (
                      <td colSpan="3" className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 text-amber-600 bg-amber-50 rounded-lg px-3 py-1.5 ml-auto w-max border border-amber-200/50">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="font-medium text-xs uppercase tracking-wider">Cost Required</span>
                        </div>
                      </td>
                    ) : (
                      <>
                        <td className="px-6 py-4 text-right text-slate-500">
                          ₹{item.product_cost.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right font-bold">
                          <span className={item.estimated_profit >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                            {item.estimated_profit >= 0 ? '+' : ''}₹{item.estimated_profit.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold ${
                            item.profit_margin >= 20 ? 'bg-emerald-100 text-emerald-700' :
                            item.profit_margin > 0 ? 'bg-emerald-50 text-emerald-600' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {item.profit_margin}%
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
          Showing {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}

// Subcomponents

function KPICard({ title, value, icon: Icon, color, subtitle }) {
  const colorStyles = {
    slate: 'bg-slate-100 text-slate-600',
    blue: 'bg-blue-50 text-blue-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
        <div className={`rounded-lg p-2 ${colorStyles[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-900 truncate">{value}</p>
      {subtitle && <p className="mt-2 text-xs font-medium text-slate-400">{subtitle}</p>}
    </div>
  );
}

// Compact count tile used inside the loss cards to show the order composition
// (Total Orders / Delivered / Returns / RTO). Returns and RTO stay separate.
function MiniStat({ label, value, tone = 'slate' }) {
  const toneStyles = {
    slate: 'text-slate-700',
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
    orange: 'text-orange-600',
  };
  return (
    <div className="rounded-md bg-slate-50 border border-slate-100 px-1.5 py-1.5 text-center">
      <div className={`text-base font-bold leading-none ${toneStyles[tone] || toneStyles.slate}`}>{value}</div>
      <div className="mt-1 text-[10px] font-medium text-slate-400 uppercase tracking-wide truncate">{label}</div>
    </div>
  );
}
