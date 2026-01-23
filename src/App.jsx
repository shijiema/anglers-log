import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Home, 
  PlusCircle, 
  BarChart3, 
  Trash2, 
  MapPin, 
  Calendar, 
  Fish, 
  Scale,
  Camera,
  X,
  Navigation,
  HardDrive,
  Edit2,
  CheckCircle2,
  Circle,
  Download,
  Upload,
  Wind,
  CloudSun,
  Thermometer,
  FileSpreadsheet,
  Clock,
  Menu,
  FileText,
  Share2
} from 'lucide-react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

// --- IndexedDB Configuration & Utils ---
const DB_NAME = 'AnglersLogDB';
const DB_VERSION = 1;
const STORE_NAME = 'catches';

const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const compressImage = (base64Str, maxWidth = 800, maxHeight = 800) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.6));
    };
  });
};

const App = () => {
  const [view, setView] = useState('dashboard');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingLog, setEditingLog] = useState(null);
  const [filters, setFilters] = useState({
    location: 'All',
    startDate: '',
    endDate: ''
  });

  const [dashboardLimit, setDashboardLimit] = useState(10);
  const [reportLimit, setReportLimit] = useState(10);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  
  // Sharing States
  const [sharingLog, setSharingLog] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const canvasRef = useRef(null);
  
  const menuRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const db = await openDB();
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => {
          const sorted = request.result.sort((a, b) => new Date(b.date) - new Date(a.date));
          setLogs(sorted);
          setLoading(false);
        };
      } catch (err) {
        console.error("Local DB load failed", err);
        setLoading(false);
      }
    };
    loadData();

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const saveLog = async (logData) => {
    try {
      const db = await openDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      let request;
      if (editingLog) {
        const updatedLog = { ...logData, id: editingLog.id };
        request = store.put(updatedLog);
        request.onsuccess = () => {
          setLogs(prev => prev.map(l => l.id === editingLog.id ? updatedLog : l).sort((a, b) => new Date(b.date) - new Date(a.date)));
          setEditingLog(null);
          setView('dashboard');
        };
      } else {
        request = store.add(logData);
        request.onsuccess = () => {
          setLogs(prev => [ { ...logData, id: request.result }, ...prev].sort((a, b) => new Date(b.date) - new Date(a.date)));
          setView('dashboard');
        };
      }
    } catch (e) {
      console.error("Local save failed", e);
    }
  };

  const deleteLogs = async (idsToDelete) => {
    const count = idsToDelete.length;
    if (window.confirm(`Delete ${count} catch${count > 1 ? 'es' : ''}?`)) {
      try {
        const db = await openDB();
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        idsToDelete.forEach(id => store.delete(id));
        transaction.oncomplete = () => {
          setLogs(prev => prev.filter(log => !idsToDelete.includes(log.id)));
          setSelectedIds([]);
          setIsSelectMode(false);
        };
      } catch (e) {
        console.error("Local delete failed", e);
      }
    }
  };

  // --- Sharing Logic ---
  const generateShareCard = (log) => {
    setSharingLog(log);
    setIsGenerating(true);

    setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const width = 1080;
      const height = 1920;
      canvas.width = width;
      canvas.height = height;

      // Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // Header Gradient
      const grad = ctx.createLinearGradient(0, 0, 0, 450);
      grad.addColorStop(0, '#1e3a8a');
      grad.addColorStop(1, '#3b82f6');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, 450);

      const drawContent = (img = null) => {
        // Photo Area
        const photoY = 220;
        const photoH = 800;
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(80, photoY, width - 160, photoH, 40);
        ctx.clip();
        
        if (img) {
          const aspect = img.width / img.height;
          const targetAspect = (width - 160) / photoH;
          let drawW, drawH, drawX, drawY;
          if (aspect > targetAspect) {
            drawH = photoH; drawW = photoH * aspect;
            drawX = 80 - (drawW - (width - 160)) / 2; drawY = photoY;
          } else {
            drawW = width - 160; drawH = (width - 160) / aspect;
            drawX = 80; drawY = photoY - (drawH - photoH) / 2;
          }
          ctx.drawImage(img, drawX, drawY, drawW, drawH);
        } else {
          ctx.fillStyle = '#f1f5f9';
          ctx.fillRect(80, photoY, width - 160, photoH);
          ctx.fillStyle = '#cbd5e1';
          ctx.font = '40px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('No Photo Attached', width/2, photoY + photoH/2);
        }
        ctx.restore();

        // Species & Stats
        ctx.textAlign = 'left';
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 90px sans-serif';
        ctx.fillText(log.species, 80, 1120);
        
        ctx.font = '60px sans-serif';
        ctx.fillStyle = '#3b82f6';
        ctx.fillText(`${log.weight} lbs`, 80, 1200);

        ctx.font = '40px sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText(new Date(log.date).toLocaleString(), 80, 1260);

        // Notes
        if (log.notes) {
          ctx.font = 'italic 36px sans-serif';
          ctx.fillStyle = '#475569';
          const words = log.notes.split(' ');
          let line = '';
          let y = 1340;
          for(let n = 0; n < words.length; n++) {
            let testLine = line + words[n] + ' ';
            if (ctx.measureText(testLine).width > width - 200 && n > 0) {
              ctx.fillText(line, 80, y);
              line = words[n] + ' ';
              y += 50;
            } else { line = testLine; }
          }
          ctx.fillText(line, 80, y);
        }

        // Map Section
        const mapY = 1500;
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.roundRect(80, mapY, width - 160, 320, 30);
        ctx.fill();
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2;
        for(let i=50; i<320; i+=50) {
          ctx.beginPath(); ctx.moveTo(80, mapY+i); ctx.lineTo(width-80, mapY+i); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(80+i, mapY); ctx.lineTo(80+i, mapY+320); ctx.stroke();
        }

        // Pin
        ctx.fillStyle = '#ef4444';
        const mx = width/2; const my = mapY + 120;
        ctx.beginPath(); ctx.arc(mx, my, 35, 0, Math.PI, true); ctx.lineTo(mx, my + 70); ctx.fill();
        ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(mx, my, 12, 0, Math.PI*2); ctx.fill();

        ctx.textAlign = 'center';
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 45px sans-serif';
        ctx.fillText(log.location, width/2, mapY + 240);
        
        if (log.coords) {
          ctx.font = '32px sans-serif';
          ctx.fillStyle = '#94a3b8';
          ctx.fillText(`GPS: ${log.coords.lat.toFixed(5)}, ${log.coords.lng.toFixed(5)}`, width/2, mapY + 285);
        }

        ctx.font = 'bold 32px sans-serif';
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText("ANGLER'S LOG • CATCH RECORD", width/2, height - 60);

        setIsGenerating(false);
      };

      if (log.photos && log.photos.length > 0) {
        const img = new Image();
        img.src = log.photos[0];
        img.onload = () => drawContent(img);
      } else {
        drawContent();
      }
    }, 100);
  };

  const shareGeneratedImage = async () => {
    try {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'my-catch.png', { type: 'image/png' });

      if (navigator.share) {
        await navigator.share({
          files: [file],
          title: `My ${sharingLog.species} Catch`,
        });
      } else {
        const link = document.createElement('a');
        link.download = 'my-catch.png';
        link.href = dataUrl;
        link.click();
      }
    } catch (e) { console.error(e); }
  };

  const exportJSON = () => {
    const dataStr = JSON.stringify(logs, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `anglers-log-backup-${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    if (logs.length === 0) return;
    const headers = ["ID", "Species", "Weight_Lbs", "Date_Time", "Location", "Bait_Lure", "Air_Temp_F", "Wind_MPH", "Notes", "Lat", "Lng"];
    const rows = logs.map(l => [
      l.id, `"${l.species?.replace(/"/g, '""')}"`, l.weight || 0, l.date, `"${l.location?.replace(/"/g, '""')}"`,
      `"${l.bait?.replace(/"/g, '""')}"`, l.temp || "", l.wind || "", `"${(l.notes || "").replace(/"/g, '""')}"`,
      l.coords?.lat || "", l.coords?.lng || ""
    ]);
    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `anglers-log-${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
    URL.revokeObjectURL(url);
  };

  const importData = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedLogs = JSON.parse(event.target.result);
        if (Array.isArray(importedLogs) && window.confirm(`Import ${importedLogs.length} logs?`)) {
          const db = await openDB();
          const transaction = db.transaction(STORE_NAME, 'readwrite');
          const store = transaction.objectStore(STORE_NAME);
          importedLogs.forEach(log => {
            const { id, ...logWithoutId } = log;
            store.add(logWithoutId);
          });
          transaction.oncomplete = () => window.location.reload();
        }
      } catch (err) { alert("Invalid backup file."); }
    };
    reader.readAsText(file);
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const logDate = log.date.split('T')[0];
      const isAfterStart = !filters.startDate || logDate >= filters.startDate;
      const isBeforeEnd = !filters.endDate || logDate <= filters.endDate;
      const isLocationMatch = filters.location === 'All' || log.location === filters.location;
      return isAfterStart && isBeforeEnd && isLocationMatch;
    });
  }, [logs, filters]);

  const speciesStats = useMemo(() => {
    const counts = {};
    filteredLogs.forEach(l => { counts[l.species] = (counts[l.species] || 0) + 1; });
    return {
      labels: Object.keys(counts),
      datasets: [{
        data: Object.values(counts),
        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
        borderWidth: 0,
      }]
    };
  }, [filteredLogs]);

  const timelineStats = useMemo(() => {
    const days = {};
    filteredLogs.forEach(l => { 
      const day = l.date.split('T')[0];
      days[day] = (days[day] || 0) + 1; 
    });
    const sortedDates = Object.keys(days).sort();
    return {
      labels: sortedDates,
      datasets: [{
        label: 'Catches',
        data: sortedDates.map(d => days[d]),
        backgroundColor: '#3b82f6',
        borderRadius: 4,
      }]
    };
  }, [filteredLogs]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700 font-sans pb-24">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 px-4 py-3 shadow-sm flex justify-between items-center">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          Angler's Log <span className="text-2xl">🎣</span>
        </h1>
        <div className="flex items-center gap-3">
          <div className="relative" ref={menuRef}>
            <button onClick={() => setShowMenu(!showMenu)} className={`flex items-center justify-center w-9 h-9 rounded-full transition-all ${showMenu ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
              <Menu className="w-5 h-5" />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-[60] overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                <button onClick={() => { exportJSON(); setShowMenu(false); }} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3 border-b border-slate-50"><Download className="w-4 h-4 text-blue-500" /> Export JSON</button>
                <button onClick={() => { exportCSV(); setShowMenu(false); }} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3 border-b border-slate-50"><FileSpreadsheet className="w-4 h-4 text-emerald-500" /> Export CSV</button>
                <button onClick={() => { fileInputRef.current.click(); setShowMenu(false); }} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3"><Upload className="w-4 h-4 text-amber-500" /> Restore JSON</button>
                <input type="file" ref={fileInputRef} onChange={importData} accept=".json" className="hidden" />
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] font-bold uppercase tracking-widest">Waking Database...</p>
          </div>
        ) : (
          <>
            {view === 'dashboard' && (
              <Dashboard 
                logs={logs} onDelete={deleteLogs} 
                onEdit={(l) => { setEditingLog(l); setView('log'); }}
                onShare={generateShareCard}
                limit={dashboardLimit} setLimit={setDashboardLimit} 
                selectedIds={selectedIds} isSelectMode={isSelectMode}
                setIsSelectMode={setIsSelectMode}
                toggleSelection={(id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])}
              />
            )}
            {view === 'log' && <LogForm onSave={saveLog} editingLog={editingLog} onCancel={() => { setEditingLog(null); setView('dashboard'); }} />}
            {view === 'analysis' && <Analysis logs={filteredLogs} filters={filters} setFilters={setFilters} locations={['All', ...new Set(logs.map(l => l.location))]} speciesStats={speciesStats} timelineStats={timelineStats} limit={reportLimit} setLimit={setReportLimit} />}
          </>
        )}
      </main>

      {sharingLog && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 flex justify-between items-center border-b">
              <h3 className="font-bold text-sm">Share Preview</h3>
              <button onClick={() => setSharingLog(null)} className="p-2 bg-slate-100 rounded-full"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex flex-col items-center">
              {isGenerating ? (
                <div className="py-20 flex flex-col items-center gap-4 text-slate-400">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs font-bold uppercase">Designing Card...</p>
                </div>
              ) : (
                <div className="shadow-2xl rounded-xl overflow-hidden w-full border-4 border-white">
                  <canvas ref={canvasRef} className="w-full h-auto block" />
                </div>
              )}
            </div>
            <div className="p-6 bg-white space-y-3">
              <button onClick={shareGeneratedImage} disabled={isGenerating} className="w-full bg-blue-600 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2">
                <Share2 size={18} /> Share to Socials
              </button>
              <p className="text-[10px] text-center text-slate-400 leading-tight">Native sharing will trigger. On desktop, this will download the image.</p>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 shadow-lg z-50">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <NavButton active={view === 'dashboard'} icon={<Home />} label="Home" onClick={() => setView('dashboard')} />
          <NavButton active={view === 'log'} icon={<PlusCircle />} label="Log" onClick={() => { setEditingLog(null); setView('log'); }} />
          <NavButton active={view === 'analysis'} icon={<BarChart3 />} label="Report" onClick={() => setView('analysis')} />
        </div>
      </nav>
    </div>
  );
};

const NavButton = ({ active, icon, label, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-blue-600 scale-110' : 'text-slate-400'}`}>
    {React.cloneElement(icon, { className: "w-6 h-6" })}
    <span className="text-[10px] font-bold uppercase tracking-tight">{label}</span>
  </button>
);

const Dashboard = ({ 
  logs, onDelete, onEdit, onShare, limit, setLimit, selectedIds, isSelectMode, setIsSelectMode, toggleSelection
}) => {
  const displayedLogs = logs.slice(0, limit);
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <StatCard count={logs.length} label="Total Catches" color="bg-blue-600" />
        <StatCard count={[...new Set(logs.map(l => l.location))].length} label="Unique Spots" color="bg-emerald-600" />
      </div>
      <div className="space-y-4">
        <div className="flex justify-between items-end px-1">
          <h2 className="font-bold text-lg text-slate-800">⏱️ Recent Activity</h2>
          {logs.length > 0 && (
            <button onClick={() => setIsSelectMode(!isSelectMode)} className="text-[10px] font-bold uppercase px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg">
              {isSelectMode ? 'Cancel' : 'Manage List'}
            </button>
          )}
        </div>
        {isSelectMode && selectedIds.length > 0 && (
          <button onClick={() => onDelete(selectedIds)} className="w-full py-3 bg-red-500 text-white rounded-xl font-bold text-xs uppercase shadow-lg shadow-red-200 animate-in zoom-in-95">
            Delete {selectedIds.length} Selected Entries
          </button>
        )}
        {logs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-300 font-bold uppercase text-xs tracking-widest">Logbook Empty</div>
        ) : (
          <>
            {displayedLogs.map(log => (
              <div key={log.id} className="flex items-center gap-3">
                {isSelectMode && (
                  <button onClick={() => toggleSelection(log.id)} className={`transition-colors ${selectedIds.includes(log.id) ? 'text-blue-600' : 'text-slate-300'}`}>
                    {selectedIds.includes(log.id) ? <CheckCircle2 className="w-6 h-6 fill-blue-50" /> : <Circle className="w-6 h-6" />}
                  </button>
                )}
                <div className="flex-1">
                  <LogCard log={log} onDelete={isSelectMode ? null : () => onDelete([log.id])} onEdit={isSelectMode ? null : onEdit} onShare={isSelectMode ? null : onShare} />
                </div>
              </div>
            ))}
            {logs.length > limit && <button onClick={() => setLimit(l => l + 10)} className="w-full py-4 bg-white border border-slate-200 rounded-2xl text-slate-500 font-bold text-sm">Load More</button>}
          </>
        )}
      </div>
    </div>
  );
};

const LogCard = ({ log, onDelete, onEdit, onShare }) => {
  const formattedDate = new Date(log.date).toLocaleString([], { 
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:border-blue-200 transition-all w-full group">
      {log.photos?.length > 0 && (
        <div className="flex gap-1 h-48 overflow-x-auto p-2 bg-slate-50 border-b border-slate-100 scrollbar-hide">
          {log.photos.map((img, i) => <img key={i} src={img} className="h-full rounded-lg object-cover aspect-square flex-shrink-0" alt="catch" />)}
        </div>
      )}
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div className="flex gap-3">
            <div className="bg-blue-50 p-3 rounded-xl h-fit"><Fish className="w-6 h-6 text-blue-500" /></div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">{log.species}</h3>
              <p className="text-sm text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> {log.location}</p>
              <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider flex items-center gap-1"><Clock className="w-3 h-3" /> {formattedDate}</p>
            </div>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
            <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-black">{log.weight} lbs</span>
            <div className="flex gap-1">
              {onShare && <button onClick={() => onShare(log)} className="p-2 text-slate-300 hover:text-emerald-500 transition-colors" title="Share Poster"><Share2 className="w-4 h-4" /></button>}
              {onEdit && <button onClick={() => onEdit(log)} className="p-2 text-slate-300 hover:text-blue-500 transition-colors"><Edit2 className="w-4 h-4" /></button>}
              {onDelete && <button onClick={onDelete} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-slate-50 pt-3">
          {log.coords && <div className="text-[9px] font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded flex items-center gap-1"><Navigation className="w-3 h-3" /> {log.coords.lat.toFixed(4)}, {log.coords.lng.toFixed(4)}</div>}
          {log.temp && <div className="text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded flex items-center gap-1"><Thermometer className="w-3 h-3" /> {log.temp}°F</div>}
          {log.wind && <div className="text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded flex items-center gap-1"><Wind className="w-3 h-3" /> {log.wind} mph</div>}
        </div>
        {log.notes && <div className="mt-2 text-xs text-slate-600 italic border-l-2 border-slate-100 pl-3 py-1">"{log.notes}"</div>}
      </div>
    </div>
  );
};

const LogForm = ({ onSave, editingLog, onCancel }) => {
  const [photos, setPhotos] = useState(editingLog?.photos || []);
  const [coords, setCoords] = useState(editingLog?.coords || null);
  const [gettingLoc, setGettingLoc] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);
  const defaultDateTime = editingLog?.date || new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 19);

  const handleFile = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    if (photos.length + files.length > 4) { alert("Max 4 photos."); return; }
    setIsProcessing(true);
    for (const file of files) {
      const reader = new FileReader();
      const base64 = await new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
      const compressed = await compressImage(base64);
      setPhotos(prev => [...prev, compressed].slice(0, 4));
    }
    setIsProcessing(false);
    e.target.value = null;
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6 pb-4">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <button onClick={onCancel} className="text-slate-400 p-2 bg-slate-50 rounded-full"><X className="w-5 h-5" /></button>
          <h2 className="font-black text-lg text-slate-800 uppercase tracking-tighter">{editingLog ? 'Edit Entry' : 'New Catch'}</h2>
          <div className="w-9" />
        </div>
        <form onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.target);
          onSave({ species: fd.get('species'), weight: fd.get('weight'), date: fd.get('date'), location: fd.get('location'), bait: fd.get('bait'), temp: fd.get('temp'), wind: fd.get('wind'), notes: fd.get('notes'), photos, coords });
        }} className="space-y-6">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-3">Photos ({photos.length}/4)</label>
            <div className="grid grid-cols-4 gap-2">
              {photos.map((img, i) => (
                <div key={i} className="relative aspect-square">
                  <img src={img} className="w-full h-full object-cover rounded-xl" alt="Preview" />
                  <button type="button" onClick={() => setPhotos(p => p.filter((_, idx) => idx !== i))} className="absolute -top-1 -right-1 bg-red-500 text-white p-1 rounded-full"><X className="w-3 h-3" /></button>
                </div>
              ))}
              {photos.length < 4 && <button type="button" onClick={() => fileInputRef.current.click()} className="aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-300"><Camera className="w-6 h-6" /></button>}
            </div>
            <input type="file" ref={fileInputRef} accept="image/*" multiple className="hidden" onChange={handleFile} />
          </div>
          <div className="space-y-4">
            <InputField name="species" label="Species" placeholder="e.g. Rainbow Trout" required icon={<Fish />} defaultValue={editingLog?.species} />
            <div className="grid grid-cols-2 gap-3">
              <InputField name="weight" label="Weight (lbs)" placeholder="0.0" type="number" step="0.01" icon={<Scale />} defaultValue={editingLog?.weight} />
              <InputField name="date" label="Date & Time" type="datetime-local" step="1" required icon={<Calendar />} defaultValue={defaultDateTime} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <InputField name="location" label="Location" placeholder="e.g. Blackwood River" required icon={<MapPin />} defaultValue={editingLog?.location} />
              <InputField name="bait" label="Bait / Lure" placeholder="e.g. Silver Spinner" icon={<CloudSun />} defaultValue={editingLog?.bait} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 px-1 flex items-center gap-2"><Navigation className="w-3 h-3" /> GPS Coordinates</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => {
                    setGettingLoc(true);
                    navigator.geolocation.getCurrentPosition(
                      (p) => { setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }); setGettingLoc(false); },
                      () => { alert("GPS Access Denied"); setGettingLoc(false); }
                    );
                  }} className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex-shrink-0 ${coords ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{gettingLoc ? "Wait..." : coords ? "Retag" : "Tag Location"}</button>
                <input type="text" readOnly placeholder="Not tagged" value={coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : ''} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-500 font-mono outline-none" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-50">
            <InputField name="temp" label="Temp °F" type="number" icon={<Thermometer />} defaultValue={editingLog?.temp} />
            <InputField name="wind" label="Wind MPH" type="number" icon={<Wind />} defaultValue={editingLog?.wind} />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase mb-1.5 flex items-center gap-2 px-1 text-slate-400"><FileText className="w-3 h-3" /> Notes (Optional)</label>
            <textarea name="notes" placeholder="Describe the fight..." defaultValue={editingLog?.notes} className="w-full p-4 rounded-xl border outline-none transition-all text-sm bg-slate-50 border-slate-200 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-200 h-24 resize-none" />
          </div>
          <button type="submit" disabled={isProcessing} className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-100 uppercase tracking-widest text-sm">{editingLog ? 'Update Entry' : 'Log Catch'}</button>
        </form>
      </div>
    </div>
  );
};

const InputField = ({ label, icon, required, ...props }) => (
  <div className="flex-1">
    <label className={`text-[10px] font-black uppercase mb-1.5 flex items-center gap-2 px-1 ${required ? 'text-emerald-600' : 'text-slate-400'}`}>
      {React.cloneElement(icon, { className: "w-3 h-3" })} {label} {required && '(Required)'}
    </label>
    <input required={required} className={`w-full p-4 rounded-xl border outline-none transition-all text-sm ${required ? 'bg-emerald-50/30 border-emerald-100 focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:border-emerald-200' : 'bg-slate-50 border-slate-200 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-200'}`} {...props} />
  </div>
);

const Analysis = ({ logs, filters, setFilters, locations, speciesStats, timelineStats, limit, setLimit }) => (
  <div className="animate-in fade-in duration-500 space-y-6">
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
      <h2 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-blue-500" /> Stats</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <FilterSelect label="Spot" value={filters.location} options={locations} onChange={v => setFilters({...filters, location: v})} />
        <FilterSelect label="From" type="date" value={filters.startDate} onChange={v => setFilters({...filters, startDate: v})} />
        <FilterSelect label="To" type="date" value={filters.endDate} onChange={v => setFilters({...filters, endDate: v})} />
      </div>
    </div>
    {logs.length > 0 ? (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 h-64"><Doughnut data={speciesStats} options={{ maintainAspectRatio: false }} /></div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 h-64"><Bar data={timelineStats} options={{ maintainAspectRatio: false }} /></div>
        </div>
        <div className="space-y-4">{logs.slice(0, limit).map(log => <LogCard key={log.id} log={log} />)}</div>
      </>
    ) : <div className="text-center py-20 text-slate-300 font-bold uppercase text-xs">No records found</div>}
  </div>
);

const FilterSelect = ({ label, type = 'select', value, options, onChange }) => (
  <div className="flex-1">
    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">{label}</label>
    {type === 'select' ? (
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm">
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    ) : <input type="date" value={value} onChange={e => onChange(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" />}
  </div>
);

const StatCard = ({ count, label, color }) => (
  <div className={`${color} text-white p-6 rounded-3xl shadow-lg relative overflow-hidden`}>
    <div className="relative z-10"><div className="text-4xl font-black">{count}</div><div className="text-[10px] uppercase font-bold text-white/70 mt-1 tracking-widest">{label}</div></div>
    <Fish className="absolute -right-4 -bottom-4 opacity-10 w-24 h-24 rotate-12" />
  </div>
);

export default App;