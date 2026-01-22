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
  Image as ImageIcon,
  X,
  Navigation,
  HardDrive,
  List,
  ChevronDown
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

// --- Image Compression Utility ---
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
  const [filters, setFilters] = useState({
    location: 'All',
    startDate: '',
    endDate: ''
  });

  // Pagination State
  const [dashboardLimit, setDashboardLimit] = useState(10);
  const [reportLimit, setReportLimit] = useState(10);

  // --- Initialize & Load Local DB Data ---
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
  }, []);

  // Reset pagination when filters change
  useEffect(() => {
    setReportLimit(10);
  }, [filters]);

  // --- Handlers ---
  const addLog = async (newLog) => {
    try {
      const db = await openDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(newLog);
      request.onsuccess = () => {
        setLogs(prev => [ { ...newLog, id: request.result }, ...prev].sort((a, b) => new Date(b.date) - new Date(a.date)));
        setView('dashboard');
      };
    } catch (e) {
      console.error("Local save failed", e);
    }
  };

  const deleteLog = async (id) => {
    if (window.confirm("Delete this catch from your device?")) {
      try {
        const db = await openDB();
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.delete(id);
        setLogs(prev => prev.filter(log => log.id !== id));
      } catch (e) {
        console.error("Local delete failed", e);
      }
    }
  };

  // --- Analytics Logic ---
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const isAfterStart = !filters.startDate || log.date >= filters.startDate;
      const isBeforeEnd = !filters.endDate || log.date <= filters.endDate;
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
    filteredLogs.forEach(l => { days[l.date] = (days[l.date] || 0) + 1; });
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

  const locations = ['All', ...new Set(logs.map(l => l.location))];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700 font-sans pb-24">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 px-4 py-3 shadow-sm flex justify-between items-center">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          Angler's Log <span className="text-2xl">🎣</span>
        </h1>
        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full uppercase">
          <HardDrive className="w-3 h-3" /> Device Storage
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] font-bold uppercase tracking-widest">Accessing Device DB...</p>
          </div>
        ) : (
          <>
            {view === 'dashboard' && (
              <Dashboard 
                logs={logs} 
                onDelete={deleteLog} 
                limit={dashboardLimit} 
                setLimit={setDashboardLimit} 
              />
            )}
            {view === 'log' && <LogForm onSave={addLog} />}
            {view === 'analysis' && (
              <Analysis 
                logs={filteredLogs} 
                filters={filters} 
                setFilters={setFilters} 
                locations={locations} 
                speciesStats={speciesStats} 
                timelineStats={timelineStats}
                limit={reportLimit}
                setLimit={setReportLimit}
              />
            )}
          </>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-50">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <NavButton active={view === 'dashboard'} icon={<Home />} label="Home" onClick={() => setView('dashboard')} />
          <NavButton active={view === 'log'} icon={<PlusCircle />} label="Log" onClick={() => setView('log')} />
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

const Dashboard = ({ logs, onDelete, limit, setLimit }) => {
  const displayedLogs = logs.slice(0, limit);
  const hasMore = logs.length > limit;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <StatCard count={logs.length} label="Total Catches" color="bg-blue-600" />
        <StatCard count={[...new Set(logs.map(l => l.location))].length} label="Unique Spots" color="bg-emerald-600" />
      </div>

      <div className="space-y-4">
        <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">⏱️ Recent Activity</h2>
        {logs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-slate-200 text-slate-400">
            No logs found on this device. Catch something!
          </div>
        ) : (
          <>
            {displayedLogs.map(log => <LogCard key={log.id} log={log} onDelete={onDelete} />)}
            {hasMore && (
              <button 
                onClick={() => setLimit(prev => prev + 10)}
                className="w-full py-4 bg-white border border-slate-200 rounded-2xl text-slate-500 font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
              >
                <ChevronDown className="w-4 h-4" /> Load More Catches
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const LogCard = ({ log, onDelete }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:border-blue-200 transition-all">
    {log.photos && log.photos.length > 0 && (
      <div className="flex gap-1 h-44 overflow-x-auto p-2 bg-slate-50 border-b border-slate-100 scrollbar-hide">
        {log.photos.map((img, i) => (
          <img key={i} src={img} alt="catch" className="h-full rounded-lg object-cover aspect-square flex-shrink-0" />
        ))}
      </div>
    )}
    <div className="p-4 flex justify-between items-start">
      <div className="flex gap-3">
        <div className="bg-blue-50 p-3 rounded-xl h-fit">
          <Fish className="w-6 h-6 text-blue-500" />
        </div>
        <div>
          <h3 className="font-bold text-slate-800 text-lg">{log.species}</h3>
          <p className="text-sm text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> {log.location}</p>
          <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">{log.date}</p>
        </div>
      </div>
      <div className="text-right flex flex-col items-end gap-2">
        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-bold">{log.weight} lbs</span>
        {onDelete && (
          <button onClick={() => onDelete(log.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
    {log.coords && (
      <div className="px-4 pb-4">
        <div className="text-[10px] font-bold text-blue-500 flex items-center gap-1 bg-blue-50 w-fit px-2 py-0.5 rounded">
          <Navigation className="w-3 h-3" /> GPS: {log.coords.lat.toFixed(4)}, {log.coords.lng.toFixed(4)}
        </div>
      </div>
    )}
  </div>
);

const LogForm = ({ onSave }) => {
  const [photos, setPhotos] = useState([]);
  const [coords, setCoords] = useState(null);
  const [gettingLoc, setGettingLoc] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleFile = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    if (photos.length + files.length > 2) {
      alert("Maximum 2 photos allowed per catch.");
      e.target.value = null;
      return;
    }
    setIsProcessing(true);
    for (const file of files) {
      const reader = new FileReader();
      const base64 = await new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
      const compressed = await compressImage(base64);
      setPhotos(prev => [...prev, compressed].slice(0, 2));
    }
    setIsProcessing(false);
    e.target.value = null;
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const getGPS = () => {
    setGettingLoc(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGettingLoc(false);
      },
      () => {
        alert("GPS unavailable locally.");
        setGettingLoc(false);
      }
    );
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6 pb-4">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="font-bold text-xl text-slate-800 mb-6 text-center">New Catch Log</h2>
        <form onSubmit={(e) => {
          e.preventDefault();
          if (isProcessing) return;
          const fd = new FormData(e.target);
          onSave({
            species: fd.get('species'),
            weight: fd.get('weight'),
            date: fd.get('date'),
            location: fd.get('location'),
            bait: fd.get('bait'),
            photos,
            coords
          });
        }} className="space-y-6">
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase text-slate-400 tracking-wider flex justify-between">
              <span>Local Photos (Max 2)</span>
              {isProcessing && <span className="text-blue-500 animate-pulse text-[10px]">Processing...</span>}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {photos.map((img, i) => (
                <div key={i} className="relative aspect-square">
                  <img src={img} className="w-full h-full object-cover rounded-xl" alt="Preview" />
                  <button type="button" onClick={() => removePhoto(i)} className="absolute -top-1 -right-1 bg-red-500 text-white p-1 rounded-full shadow-lg">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {photos.length < 2 && (
                <div className="flex gap-2 col-span-1">
                  <button type="button" onClick={() => cameraInputRef.current.click()} className="flex-1 aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400">
                    <Camera className="w-5 h-5" />
                    <span className="text-[8px] font-bold mt-1 uppercase">Camera</span>
                  </button>
                  <button type="button" onClick={() => fileInputRef.current.click()} className="flex-1 aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400">
                    <ImageIcon className="w-5 h-5" />
                    <span className="text-[8px] font-bold mt-1 uppercase">Album</span>
                  </button>
                </div>
              )}
            </div>
            <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
            <input type="file" ref={fileInputRef} accept="image/*" multiple className="hidden" onChange={handleFile} />
          </div>

          <div className="space-y-4">
            <InputField name="species" label="Species" placeholder="What was it?" required icon={<Fish className="w-4 h-4" />} />
            <div className="grid grid-cols-2 gap-4">
              <InputField name="weight" label="Weight (lbs)" placeholder="0.0" type="number" step="0.1" icon={<Scale className="w-4 h-4" />} />
              <InputField name="date" label="Date" type="date" defaultValue={new Date().toISOString().split('T')[0]} icon={<Calendar className="w-4 h-4" />} />
            </div>
            <div className="space-y-2">
              <InputField name="location" label="Location Name" placeholder="Lake/River" required icon={<MapPin className="w-4 h-4" />} />
              <button type="button" onClick={getGPS} disabled={gettingLoc} className="w-full py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 flex items-center justify-center gap-2">
                {gettingLoc ? "Locating..." : coords ? `📍 GPS SAVED` : "📌 ADD OFFLINE GPS"}
              </button>
            </div>
            <InputField name="bait" label="Bait/Lure" placeholder="Spinner, Fly, etc." icon={<Navigation className="w-4 h-4" />} />
          </div>
          <button type="submit" disabled={isProcessing} className={`w-full font-bold py-4 rounded-2xl shadow-xl transition-all ${isProcessing ? 'bg-slate-300' : 'bg-blue-600 text-white'}`}>
            {isProcessing ? 'Processing...' : 'Save Catch to Device'}
          </button>
        </form>
      </div>
    </div>
  );
};

const InputField = ({ label, icon, ...props }) => (
  <div>
    <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 flex items-center gap-1">
      {icon} {label}
    </label>
    <input className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all" {...props} />
  </div>
);

const Analysis = ({ logs, filters, setFilters, locations, speciesStats, timelineStats, limit, setLimit }) => {
  const displayedLogs = logs.slice(0, limit);
  const hasMore = logs.length > limit;

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h2 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-500" /> Catch Analysis
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <FilterSelect label="Spot" value={filters.location} options={locations} onChange={v => setFilters({...filters, location: v})} />
          <FilterSelect label="From" type="date" value={filters.startDate} onChange={v => setFilters({...filters, startDate: v})} />
          <FilterSelect label="To" type="date" value={filters.endDate} onChange={v => setFilters({...filters, endDate: v})} />
        </div>
      </div>

      {logs.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 text-center">Species Distribution</h3>
              <div className="h-48">
                <Doughnut data={speciesStats} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10, weight: 'bold' } } } } }} />
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 text-center">Catches Over Time</h3>
              <div className="h-48">
                <Bar data={timelineStats} options={{ maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }, plugins: { legend: { display: false } } }} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <List className="w-5 h-5 text-blue-500" /> Filtered Logs ({logs.length})
            </h3>
            <div className="space-y-4">
              {displayedLogs.map(log => <LogCard key={log.id} log={log} />)}
              {hasMore && (
                <button 
                  onClick={() => setLimit(prev => prev + 10)}
                  className="w-full py-4 bg-white border border-slate-200 rounded-2xl text-slate-500 font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
                >
                  <ChevronDown className="w-4 h-4" /> Load More Results
                </button>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 uppercase font-bold text-[10px] tracking-widest">
          No matches for selected filters.
        </div>
      )}
    </div>
  );
};

const FilterSelect = ({ label, type = 'select', value, options, onChange }) => (
  <div className="flex-1">
    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block tracking-wider">{label}</label>
    {type === 'select' ? (
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    ) : (
      <input type="date" value={value} onChange={e => onChange(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
    )}
  </div>
);

const StatCard = ({ count, label, color }) => (
  <div className={`${color} text-white p-6 rounded-2xl shadow-lg`}>
    <div className="text-4xl font-black">{count}</div>
    <div className="text-[10px] uppercase font-bold text-white/70 mt-1 tracking-widest">{label}</div>
  </div>
);

export default App;