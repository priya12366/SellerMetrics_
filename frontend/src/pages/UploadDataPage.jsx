import React, { useState, useRef, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { 
  UploadCloud, FileSpreadsheet, AlertCircle, CheckCircle2, X, FileText,
  ShoppingCart, CreditCard, Undo2, Package, Megaphone, Boxes, CircleDollarSign
} from 'lucide-react';

export default function UploadDataPage() {
  const { user } = useOutletContext();
  const navigate = useNavigate();

  const [ordersFiles, setOrdersFiles] = useState([]);
  const [paymentsFiles, setPaymentsFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState(null);
  const [reportingPeriod, setReportingPeriod] = useState("");
  
  const [importHistory, setImportHistory] = useState(null);

  const ordersInputRef = useRef(null);
  const paymentsInputRef = useRef(null);

  const fetchHistory = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    try {
      const res = await fetch('http://127.0.0.1:8000/api/import-history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setImportHistory(await res.json());
    } catch(err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

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

      await fetchHistory();
      
      if (errors.length > 0) {
        setUploadMessage({ type: 'error', text: `Uploaded ${totalSuccess} files. Errors: ${errors.join(' | ')}` });
      } else {
        setUploadMessage({ type: 'success', text: 'Files uploaded successfully.' });
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

  const uploadCategories = [
    {
      id: 'orders',
      title: 'Orders',
      description: 'Upload Orders CSV (Multiple allowed)',
      icon: ShoppingCart,
      color: 'indigo',
      accept: '.csv',
      isActive: true,
      files: ordersFiles,
      inputRef: ordersInputRef,
      onChange: handleOrdersChange,
      onRemove: removeOrderFile
    },
    {
      id: 'payments',
      title: 'Payments',
      description: 'Upload Payments XLSX (Multiple allowed)',
      icon: CreditCard,
      color: 'emerald',
      accept: '.xlsx',
      isActive: true,
      files: paymentsFiles,
      inputRef: paymentsInputRef,
      onChange: handlePaymentsChange,
      onRemove: removePaymentFile
    },
    {
      id: 'returns',
      title: 'Returns / RTO',
      description: 'Upload Returns reports (CSV)',
      icon: Undo2,
      color: 'rose',
      isActive: false
    },
    {
      id: 'products',
      title: 'Products / Catalog',
      description: 'Upload Product Catalog (CSV)',
      icon: Package,
      color: 'purple',
      isActive: false
    },
    {
      id: 'advertising',
      title: 'Advertising (PPC)',
      description: 'Upload Ad Spend reports (CSV)',
      icon: Megaphone,
      color: 'blue',
      isActive: false
    },
    {
      id: 'inventory',
      title: 'Inventory',
      description: 'Upload Stock Levels (CSV)',
      icon: Boxes,
      color: 'amber',
      isActive: false
    },
    {
      id: 'product_costs',
      title: 'Product Costs (COGS)',
      description: 'Upload Unit Costs (CSV)',
      icon: CircleDollarSign,
      color: 'slate',
      isActive: false
    }
  ];

  // Helper mapping colors
  const colorMap = {
    indigo: { bg: 'bg-indigo-50/50', border: 'border-indigo-200', text: 'text-indigo-600', iconBg: 'bg-indigo-100', hoverBg: 'hover:bg-indigo-50', hoverBorder: 'hover:border-indigo-400' },
    emerald: { bg: 'bg-emerald-50/50', border: 'border-emerald-200', text: 'text-emerald-600', iconBg: 'bg-emerald-100', hoverBg: 'hover:bg-emerald-50', hoverBorder: 'hover:border-emerald-400' },
    rose: { bg: 'bg-rose-50/50', border: 'border-rose-200', text: 'text-rose-600', iconBg: 'bg-rose-100', hoverBg: 'hover:bg-rose-50', hoverBorder: 'hover:border-rose-400' },
    purple: { bg: 'bg-purple-50/50', border: 'border-purple-200', text: 'text-purple-600', iconBg: 'bg-purple-100', hoverBg: 'hover:bg-purple-50', hoverBorder: 'hover:border-purple-400' },
    blue: { bg: 'bg-blue-50/50', border: 'border-blue-200', text: 'text-blue-600', iconBg: 'bg-blue-100', hoverBg: 'hover:bg-blue-50', hoverBorder: 'hover:border-blue-400' },
    amber: { bg: 'bg-amber-50/50', border: 'border-amber-200', text: 'text-amber-600', iconBg: 'bg-amber-100', hoverBg: 'hover:bg-amber-50', hoverBorder: 'hover:border-amber-400' },
    slate: { bg: 'bg-slate-50/50', border: 'border-slate-200', text: 'text-slate-600', iconBg: 'bg-slate-100', hoverBg: 'hover:bg-slate-50', hoverBorder: 'hover:border-slate-400' }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Upload Seller Data</h1>
        <p className="mt-2 text-slate-600 text-lg">
          Upload your raw seller reports across all categories to update your analytics.
        </p>
      </div>

      {/* Main Upload Grid */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
          
          {uploadCategories.map((cat) => {
            const colors = colorMap[cat.color];
            const Icon = cat.icon;

            return (
              <div key={cat.id} className="flex flex-col">
                <div className={`group relative rounded-xl border-2 border-dashed ${cat.isActive ? colors.border : 'border-slate-200'} ${cat.isActive ? colors.bg : 'bg-slate-50 opacity-60'} p-6 text-center ${cat.isActive ? colors.hoverBorder : ''} ${cat.isActive ? colors.hoverBg : ''} transition-colors flex-1 flex flex-col items-center justify-center`}>
                  
                  {!cat.isActive && (
                    <span className="absolute top-2 right-2 inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                      Coming Soon
                    </span>
                  )}

                  <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${cat.isActive ? colors.iconBg : 'bg-slate-200'} shadow-sm ${cat.isActive ? 'group-hover:scale-105 transition-transform' : ''}`}>
                    <Icon className={`h-6 w-6 ${cat.isActive ? colors.text : 'text-slate-400'}`} />
                  </div>
                  
                  <h3 className={`text-base font-semibold ${cat.isActive ? 'text-slate-900' : 'text-slate-500'} mb-1`}>{cat.title}</h3>
                  <p className="text-xs text-slate-500 mb-4">{cat.description}</p>
                  
                  {cat.isActive ? (
                    <>
                      <input type="file" accept={cat.accept} multiple ref={cat.inputRef} onChange={cat.onChange} className="hidden" />
                      <button 
                        onClick={() => cat.inputRef.current?.click()}
                        className={`inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:${colors.text} transition-colors mt-auto`}
                      >
                        Browse {cat.title}
                      </button>
                    </>
                  ) : (
                    <button disabled className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-100 border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-400 shadow-sm mt-auto cursor-not-allowed">
                      Unavailable
                    </button>
                  )}
                </div>

                {/* Selected Files List */}
                {cat.isActive && cat.files?.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {cat.files.map((f, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileText className={`h-3 w-3 ${colors.text} shrink-0`} />
                          <span className="text-xs font-medium text-slate-700 truncate">{f.name}</span>
                        </div>
                        <button onClick={() => cat.onRemove(i)} className="text-slate-400 hover:text-red-500 transition-colors">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          
        </div>

        {/* Global Upload Action */}
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
                {importHistory.slice(0, 15).map((item) => (
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
  );
}
