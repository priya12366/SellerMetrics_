import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Loader2,
  AlertCircle,
  Save,
  Search,
  CheckCircle2,
  AlertTriangle,
  Trash2
} from 'lucide-react';

export default function ProductCostsPage() {
  const [costs, setCosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // State to hold temporary edits
  const [editValues, setEditValues] = useState({});

  const navigate = useNavigate();

  useEffect(() => {
    fetchCosts();
  }, [navigate]);

  const fetchCosts = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch('http://127.0.0.1:8000/api/product-costs/summary', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to load product costs.');
      
      const data = await response.json();
      setCosts(data);
      
      // Initialize edit values
      const initialEdits = {};
      data.forEach(item => {
        initialEdits[item.sku] = item.cost_per_unit || '';
      });
      setEditValues(initialEdits);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (sku, productName) => {
    const costValue = editValues[sku];
    if (costValue === '' || costValue === null || isNaN(costValue)) {
      alert('Please enter a valid cost.');
      return;
    }

    setSaving(sku);
    const token = localStorage.getItem('access_token');
    
    try {
      const response = await fetch('http://127.0.0.1:8000/api/product-costs/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sku: sku,
          product_name: productName,
          cost_per_unit: parseFloat(costValue)
        })
      });

      if (!response.ok) throw new Error('Failed to save cost.');

      const saved = await response.json();

      // Update local state to reflect configured (capture new id so Delete works immediately)
      setCosts(prev => prev.map(c =>
        c.sku === sku
          ? { ...c, cost_per_unit: parseFloat(costValue), is_configured: true, id: saved.id ?? c.id }
          : c
      ));

    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async (id, sku) => {
    if (!id) return;
    if (!window.confirm(`Remove the saved cost for SKU "${sku}"? This only clears the cost entry — your order and payment data are never touched.`)) {
      return;
    }

    setDeleting(sku);
    const token = localStorage.getItem('access_token');

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/product-costs/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok && response.status !== 204) throw new Error('Failed to delete cost.');

      // Reset this row back to "Cost Required" without removing the SKU from the list
      setCosts(prev => prev.map(c =>
        c.sku === sku
          ? { ...c, cost_per_unit: null, is_configured: false, id: null }
          : c
      ));
      setEditValues(prev => ({ ...prev, [sku]: '' }));

    } catch (err) {
      alert(err.message);
    } finally {
      setDeleting(null);
    }
  };

  const filteredCosts = costs.filter(c => 
    c.sku.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (c.product_name && c.product_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-lg font-medium">Loading product costs...</span>
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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Package className="h-6 w-6 text-indigo-600" />
            Product Costs
          </h1>
          <p className="mt-1 text-slate-500">Manage cost per unit for your SKUs to accurately calculate profit margins.</p>
        </div>
        
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Search by SKU or Product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full rounded-lg border-0 py-2 pl-10 pr-4 text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-900 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold">SKU</th>
                <th className="px-6 py-4 font-semibold">Product Name</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Cost Per Unit (₹)</th>
                <th className="px-6 py-4 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCosts.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                    No products found matching your search.
                  </td>
                </tr>
              ) : (
                filteredCosts.map((item) => {
                  const isModified = parseFloat(editValues[item.sku]) !== item.cost_per_unit;
                  
                  return (
                    <tr key={item.sku} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4 font-mono font-medium text-slate-900">{item.sku}</td>
                      <td className="px-6 py-4">
                        <div className="line-clamp-2 max-w-sm" title={item.product_name}>{item.product_name || '-'}</div>
                      </td>
                      <td className="px-6 py-4">
                        {item.is_configured ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Configured
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Cost Required
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end">
                          <input 
                            type="number" 
                            step="0.01"
                            value={editValues[item.sku]}
                            onChange={(e) => setEditValues({...editValues, [item.sku]: e.target.value})}
                            className={`w-28 text-right rounded-md border-0 py-1.5 px-3 text-slate-900 shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6 ${
                              isModified ? 'ring-indigo-300 focus:ring-indigo-600' : 'ring-slate-300 focus:ring-indigo-600'
                            }`}
                            placeholder="0.00"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleSave(item.sku, item.product_name)}
                            disabled={!isModified || saving === item.sku}
                            className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold transition-all ${
                              isModified
                                ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            {saving === item.sku ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                            Save
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.sku)}
                            disabled={!item.is_configured || !item.id || deleting === item.sku}
                            title={item.is_configured ? 'Remove saved cost' : 'No saved cost to remove'}
                            className={`inline-flex items-center justify-center rounded-md p-1.5 transition-all ${
                              item.is_configured && item.id
                                ? 'text-rose-600 hover:bg-rose-50'
                                : 'text-slate-300 cursor-not-allowed'
                            }`}
                          >
                            {deleting === item.sku ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
