import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Search, Filter, AlertCircle, X, ChevronRight, CheckCircle2 } from 'lucide-react';

export default function SettlementsPage() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  
  const [settlements, setSettlements] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [availableStatuses, setAvailableStatuses] = useState(['All']);
  
  const [selectedSettlement, setSelectedSettlement] = useState(null);
  const [showAllCharges, setShowAllCharges] = useState(false);
  const modalRef = React.useRef(null);

  useEffect(() => {
    if (selectedSettlement) {
      if (modalRef.current) {
        modalRef.current.scrollTop = 0;
      }
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedSettlement]);

  const formatMoney = (amount) => {
    if (!amount && amount !== 0) return '—';
    const num = parseFloat(amount);
    const isNegative = num < 0;
    const absValue = Math.abs(num);
    const formatted = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(absValue);
    return isNegative ? `-${formatted}` : formatted;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr + 'Z').toLocaleString();
  };
  
  const formatShortDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr + 'Z').toLocaleDateString();
  };

  const calculateDeductions = (item) => {
    const deductionFields = [
      'shipping_charge', 'return_shipping_charge', 'fixed_fee', 'warehousing_fee',
      'return_premium', 'return_premium_return', 'commission_amount', 'gold_platform_fee',
      'mall_platform_fee', 'tcs', 'tds', 'compensation', 'claims', 'recovery',
      'other_support_service_charges', 'net_other_support_service_charges',
      'gst_on_support_service_charges', 'gst_compensation', 'waivers'
    ];
    return deductionFields.reduce((sum, field) => {
      const val = parseFloat(item[field] || 0);
      return val < 0 ? sum + val : sum;
    }, 0);
  };

  const getCalculationLines = (s) => {
    const rev = parseFloat(s.total_sale_amount || 0);
    const ret = parseFloat(s.total_sale_return_amount || 0);
    const ded = calculateDeductions(s);
    const actualFinal = parseFloat(s.final_settlement_amount || 0);
    
    const expected = rev + ret + ded;
    const diff = actualFinal - expected;

    const lines = [];
    lines.push({ label: 'Sale Amount', value: rev });
    lines.push({ label: 'Returns / Refunds', value: ret });
    lines.push({ label: 'Total Deductions', value: ded });
    
    if (Math.abs(diff) > 0.01) {
      lines.push({ label: 'Other Adjustments', value: diff });
    }
    
    return lines;
  };

  useEffect(() => {
    const fetchSettlements = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        navigate('/login');
        return;
      }
      
      try {
        const res = await fetch('http://127.0.0.1:8000/api/settlements', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.status === 401) {
          localStorage.removeItem('access_token');
          navigate('/login');
          return;
        }
        
        if (!res.ok) throw new Error('Failed to fetch settlements');
        
        const data = await res.json();
        setSettlements(data.settlements || []);
        setTotal(data.total || 0);
        
        // Extract unique statuses
        const statuses = new Set();
        (data.settlements || []).forEach(s => {
          if (s.live_order_status) statuses.add(s.live_order_status);
        });
        setAvailableStatuses(['All', ...Array.from(statuses)]);
        
      } catch (err) {
        setError(err.message || 'An error occurred while fetching settlements.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSettlements();
  }, [navigate]);

  const filteredSettlements = settlements.filter(s => {
    if (statusFilter !== 'All' && s.live_order_status !== statusFilter) return false;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchOrder = s.sub_order_no?.toLowerCase().includes(q);
      const matchProduct = s.product_name?.toLowerCase().includes(q);
      const matchSku = s.sku?.toLowerCase().includes(q);
      if (!matchOrder && !matchProduct && !matchSku) return false;
    }
    
    return true;
  });

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'rto':
      case 'return':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'cancelled':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'shipped':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="mx-auto max-w-7xl py-6">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Settlements</h1>
        <p className="mt-2 text-lg text-slate-600">
          Track payouts, deductions and settlement details for your orders.
        </p>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Settlements</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{total}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col min-h-[500px]">
        
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
              {availableStatuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table / State */}
        <div className="flex-1">
          {isLoading ? (
            <div className="flex h-full items-center justify-center py-20 text-slate-500">
              Loading settlements...
            </div>
          ) : error ? (
            <div className="m-6 rounded-xl bg-red-50 p-4 text-sm text-red-700 border border-red-200 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          ) : settlements.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-20 px-4 text-center">
              <div className="mb-4 rounded-full bg-slate-50 p-4 border border-slate-100">
                <FileBarChart className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No settlements found</h3>
              <p className="mt-1 max-w-md text-sm text-slate-500">
                You haven't uploaded any matching orders and payments yet. Process your reports to see settlements here.
              </p>
            </div>
          ) : filteredSettlements.length === 0 ? (
            <div className="py-20 text-center text-slate-500">
              No settlements match your search or filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-4 pl-6 pr-4">Sub Order No</th>
                    <th className="py-4 px-4">Order Date</th>
                    <th className="py-4 px-4">Payment Date</th>
                    <th className="py-4 px-4">Product</th>
                    <th className="py-4 px-4">Status</th>
                    <th className="py-4 px-4 text-right">Sale Amount</th>
                    <th className="py-4 px-4 text-right">Deductions</th>
                    <th className="py-4 px-4 text-right">Final Settlement</th>
                    <th className="py-4 pl-4 pr-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filteredSettlements.map((s, idx) => (
                    <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 pl-6 pr-4 font-medium text-slate-900">{s.sub_order_no || '—'}</td>
                      <td className="py-4 px-4 text-slate-600">{formatShortDate(s.order_date)}</td>
                      <td className="py-4 px-4 text-slate-600">{formatShortDate(s.payment_date)}</td>
                      <td className="py-4 px-4 text-slate-600">
                        <div className="truncate max-w-[150px]" title={s.product_name}>{s.product_name || '—'}</div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${getStatusStyle(s.live_order_status)}`}>
                          {s.live_order_status || 'Unknown'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right text-slate-900">{formatMoney(s.total_sale_amount)}</td>
                      <td className="py-4 px-4 text-right text-rose-600">{formatMoney(calculateDeductions(s))}</td>
                      <td className="py-4 px-4 text-right font-bold text-emerald-700">{formatMoney(s.final_settlement_amount)}</td>
                      <td className="py-4 pl-4 pr-6 text-right">
                        <button 
                          onClick={() => setSelectedSettlement(s)}
                          className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Details Modal */}
      {selectedSettlement && (
        <div 
          ref={modalRef}
          className="fixed inset-0 z-50 overflow-y-auto bg-black/40"
        >
          <div className="min-h-full flex items-start justify-center p-4 sm:p-6">
            <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl relative">
              
              {/* Modal Header */}
              <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 px-6 py-5 bg-white rounded-t-2xl shadow-sm">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Settlement Details</h2>
                <p className="text-sm font-medium text-slate-500 mt-1">{selectedSettlement.sub_order_no || '—'}</p>
              </div>
              <button 
                onClick={() => {
                  setSelectedSettlement(null);
                  setShowAllCharges(false);
                }}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="px-6 py-5 space-y-6">
              
              {/* Section 1: Order Information */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="text-sm font-semibold text-slate-900 mb-3">Order Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Sub Order No</p>
                    <p className="text-sm font-medium text-slate-900">{selectedSettlement.sub_order_no || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Status</p>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold border uppercase tracking-wider ${getStatusStyle(selectedSettlement.live_order_status)}`}>
                      {selectedSettlement.live_order_status || '—'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Order Date</p>
                    <p className="text-sm font-medium text-slate-900">{formatShortDate(selectedSettlement.order_date)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Payment Date</p>
                    <p className="text-sm font-medium text-slate-900">{formatShortDate(selectedSettlement.payment_date)}</p>
                  </div>
                  
                  <div className="sm:col-span-2">
                    <p className="text-sm text-slate-500 mb-1">Product</p>
                    <p className="text-sm font-medium text-slate-900 line-clamp-2 break-words">{selectedSettlement.product_name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">SKU</p>
                    <p className="text-sm font-medium text-slate-900">{selectedSettlement.sku || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Qty</p>
                    <p className="text-sm font-medium text-slate-900">{selectedSettlement.quantity || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Section 2: Payout Summary */}
              <div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 min-w-0">
                    <p className="text-sm text-slate-500 mb-1">Sale Amount</p>
                    <p className="text-xl font-bold text-slate-900">{formatMoney(selectedSettlement.total_sale_amount)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 min-w-0">
                    <p className="text-sm text-slate-500 mb-1">Total Deductions</p>
                    <p className="text-xl font-bold text-rose-700">{formatMoney(calculateDeductions(selectedSettlement))}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 min-w-0">
                    <p className="text-sm text-slate-500 mb-1">Return / Refund</p>
                    <p className="text-xl font-bold text-slate-900">{formatMoney(selectedSettlement.total_sale_return_amount)}</p>
                  </div>
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 min-w-0">
                    <p className="text-sm text-indigo-700 mb-1">Final Settlement</p>
                    <p className="text-xl font-bold text-indigo-700">{formatMoney(selectedSettlement.final_settlement_amount)}</p>
                  </div>
                </div>
              </div>

              {/* Section 3: Settlement Breakdown */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-slate-900">Settlement Breakdown</h4>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <span className="text-sm text-slate-500 select-none">Show all charges</span>
                    <button 
                      type="button" 
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${showAllCharges ? 'bg-indigo-600' : 'bg-slate-200'}`} 
                      role="switch" 
                      aria-checked={showAllCharges} 
                      onClick={() => setShowAllCharges(!showAllCharges)}
                    >
                      <span aria-hidden="true" className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${showAllCharges ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </label>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden divide-y divide-slate-100">
                  
                  {/* Revenue */}
                  <div>
                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-100">
                      <h5 className="text-sm font-semibold text-slate-700">Revenue</h5>
                    </div>
                    <div className="px-4 py-1.5 divide-y divide-slate-50">
                      <div className="flex justify-between items-center py-1.5 text-sm">
                        <span className="text-slate-500">Total Sale Amount</span>
                        <span className="font-medium text-slate-900">{formatMoney(selectedSettlement.total_sale_amount)}</span>
                      </div>
                      <div className="flex justify-between items-center py-1.5 text-sm">
                        <span className="text-slate-500">Sale Return Amount</span>
                        <span className={`font-medium ${parseFloat(selectedSettlement.total_sale_return_amount||0) !== 0 ? 'text-rose-600' : 'text-slate-900'}`}>{formatMoney(selectedSettlement.total_sale_return_amount)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Platform Fees & Logistics */}
                  {(() => {
                    const fields = [
                      { k: 'shipping_charge', l: 'Shipping Charge' },
                      { k: 'return_shipping_charge', l: 'Return Shipping Charge' },
                      { k: 'fixed_fee', l: 'Fixed Fee' },
                      { k: 'warehousing_fee', l: 'Warehousing Fee' },
                      { k: 'commission_amount', l: 'Commission Amount' },
                      { k: 'return_premium', l: 'Return Premium' },
                      { k: 'return_premium_return', l: 'Return Premium Return' },
                      { k: 'mall_platform_fee', l: 'Mall Platform Fee' },
                      { k: 'net_other_support_service_charges', l: 'Net Support Charges' },
                      { k: 'other_support_service_charges', l: 'Other Support Service Charges' }
                    ];
                    const visible = fields.filter(f => showAllCharges || Math.abs(parseFloat(selectedSettlement[f.k] || 0)) > 0);
                    if (visible.length === 0) return null;
                    return (
                      <div className="border-t border-slate-100">
                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-100">
                          <h5 className="text-sm font-semibold text-slate-700">Platform Fees & Logistics</h5>
                        </div>
                        <div className="px-4 py-1.5 divide-y divide-slate-50">
                          {visible.map(f => {
                            const val = parseFloat(selectedSettlement[f.k] || 0);
                            return (
                              <div key={f.k} className="flex justify-between items-center py-1.5 text-sm">
                                <span className="text-slate-500">{f.l}</span>
                                <span className={`font-medium ${val < 0 ? 'text-rose-600' : (val === 0 && showAllCharges ? 'text-slate-400' : 'text-slate-900')}`}>{formatMoney(val)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Taxes */}
                  {(() => {
                    const fields = [
                      { k: 'tcs', l: 'TCS' },
                      { k: 'tds', l: 'TDS' },
                      { k: 'gst_on_support_service_charges', l: 'GST on Support Charges' },
                      { k: 'gst_compensation', l: 'GST Compensation' }
                    ];
                    const visible = fields.filter(f => showAllCharges || Math.abs(parseFloat(selectedSettlement[f.k] || 0)) > 0);
                    if (visible.length === 0) return null;
                    return (
                      <div className="border-t border-slate-100">
                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-100">
                          <h5 className="text-sm font-semibold text-slate-700">Taxes</h5>
                        </div>
                        <div className="px-4 py-1.5 divide-y divide-slate-50">
                          {visible.map(f => {
                            const val = parseFloat(selectedSettlement[f.k] || 0);
                            return (
                              <div key={f.k} className="flex justify-between items-center py-1.5 text-sm">
                                <span className="text-slate-500">{f.l}</span>
                                <span className={`font-medium ${val < 0 ? 'text-rose-600' : (val === 0 && showAllCharges ? 'text-slate-400' : 'text-slate-900')}`}>{formatMoney(val)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Adjustments */}
                  {(() => {
                    const fields = [
                      { k: 'claims', l: 'Claims' },
                      { k: 'recovery', l: 'Recovery' },
                      { k: 'compensation', l: 'Compensation' },
                      { k: 'waivers', l: 'Waivers' }
                    ];
                    const visible = fields.filter(f => showAllCharges || Math.abs(parseFloat(selectedSettlement[f.k] || 0)) > 0);
                    if (visible.length === 0) return null;
                    return (
                      <div className="border-t border-slate-100">
                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-100">
                          <h5 className="text-sm font-semibold text-slate-700">Adjustments</h5>
                        </div>
                        <div className="px-4 py-1.5 divide-y divide-slate-50">
                          {visible.map(f => {
                            const val = parseFloat(selectedSettlement[f.k] || 0);
                            return (
                              <div key={f.k} className="flex justify-between items-center py-1.5 text-sm">
                                <span className="text-slate-500">{f.l}</span>
                                <span className={`font-medium ${val < 0 ? 'text-rose-600' : (val === 0 && showAllCharges ? 'text-slate-400' : 'text-slate-900')}`}>{formatMoney(val)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                </div>
              </div>

              {/* Section 4: Settlement Calculation */}
              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-3">Settlement Calculation</h4>
                <div className="rounded-xl border border-slate-200 bg-slate-50 max-w-sm overflow-hidden">
                  <div className="px-4 py-3 divide-y divide-slate-200">
                    <div className="space-y-2 pb-2">
                      {getCalculationLines(selectedSettlement).map((line, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm">
                          <span className="text-slate-500">{line.label}</span>
                          <span className={`font-medium ${line.value < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                            {formatMoney(line.value)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 flex justify-between items-center">
                      <span className="text-sm font-semibold text-slate-900">Final Settlement</span>
                      <span className="text-base font-bold text-slate-900">{formatMoney(selectedSettlement.final_settlement_amount)}</span>
                    </div>
                  </div>
                </div>
              </div>

              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
