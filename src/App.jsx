import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t, i18n } = useTranslation();
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
  const [shareImageUrl, setShareImageUrl] = useState(null);
  const canvasRef = useRef(null);

  const menuRef = useRef(null);
  const fileInputRef = useRef(null);

  // Update HTML lang attribute when language changes
  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

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
    if (window.confirm(t('confirm.deleteCatches', { count }))) {
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
    setShareImageUrl(null);

    // Use requestAnimationFrame to ensure the modal and canvas are rendered
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const canvas = canvasRef.current;
        if (!canvas) {
          console.error('Canvas not available');
          setIsGenerating(false);
          return;
        }

        const ctx = canvas.getContext('2d');
        const width = 1080;
        const height = 1920;
        canvas.width = width;
        canvas.height = height;

        const drawContent = (img = null) => {
          // Clear canvas (transparent background)
          ctx.clearRect(0, 0, width, height);

          // Subtle gradient background
          const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
          bgGrad.addColorStop(0, '#f8fafc');
          bgGrad.addColorStop(1, '#e2e8f0');
          ctx.fillStyle = bgGrad;
          ctx.fillRect(0, 0, width, height);

          // Photo Area - larger, starting from top
          const photoY = 60;
          const photoH = 920;
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(60, photoY, width - 120, photoH, 40);
          ctx.clip();

          if (img) {
            const aspect = img.width / img.height;
            const targetAspect = (width - 120) / photoH;
            let drawW, drawH, drawX, drawY;
            if (aspect > targetAspect) {
              drawH = photoH; drawW = photoH * aspect;
              drawX = 60 - (drawW - (width - 120)) / 2; drawY = photoY;
            } else {
              drawW = width - 120; drawH = (width - 120) / aspect;
              drawX = 60; drawY = photoY - (drawH - photoH) / 2;
            }
            ctx.drawImage(img, drawX, drawY, drawW, drawH);
          } else {
            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(60, photoY, width - 120, photoH);
            ctx.fillStyle = '#94a3b8';
            ctx.font = 'bold 48px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🎣', width/2, photoY + photoH/2 - 30);
            ctx.font = '36px sans-serif';
            ctx.fillText(t('shareModal.noPhoto'), width/2, photoY + photoH/2 + 40);
          }
          ctx.restore();

          // Content card overlay at bottom of photo
          const cardY = 1020;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.roundRect(60, cardY, width - 120, height - cardY - 60, 40);
          ctx.fill();

          // Add subtle shadow effect
          ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
          ctx.shadowBlur = 20;
          ctx.shadowOffsetY = -10;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.roundRect(60, cardY, width - 120, height - cardY - 60, 40);
          ctx.fill();
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.shadowOffsetY = 0;

          // Species title
          ctx.textAlign = 'left';
          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 72px sans-serif';
          ctx.fillText(log.species, 100, cardY + 80);

          // Weight badge
          ctx.fillStyle = '#3b82f6';
          ctx.beginPath();
          ctx.roundRect(100, cardY + 100, 180, 50, 25);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 32px sans-serif';
          ctx.fillText(`${log.weight || 0} lbs`, 130, cardY + 135);

          // Date/time
          ctx.fillStyle = '#64748b';
          ctx.font = '32px sans-serif';
          ctx.fillText(new Date(log.date).toLocaleString(), 300, cardY + 135);

          // Weather info row (temp and wind)
          let weatherY = cardY + 190;
          let weatherX = 100;

          if (log.temp) {
            // Temperature badge
            ctx.fillStyle = '#fef3c7';
            ctx.beginPath();
            ctx.roundRect(weatherX, weatherY, 140, 50, 25);
            ctx.fill();
            ctx.fillStyle = '#d97706';
            ctx.font = 'bold 28px sans-serif';
            ctx.fillText(`🌡 ${log.temp}°F`, weatherX + 20, weatherY + 35);
            weatherX += 160;
          }

          if (log.wind) {
            // Wind badge
            ctx.fillStyle = '#e0f2fe';
            ctx.beginPath();
            ctx.roundRect(weatherX, weatherY, 160, 50, 25);
            ctx.fill();
            ctx.fillStyle = '#0284c7';
            ctx.font = 'bold 28px sans-serif';
            ctx.fillText(`💨 ${log.wind} mph`, weatherX + 20, weatherY + 35);
          }

          // Notes section
          let notesEndY = weatherY + 70;
          if (log.notes) {
            ctx.font = 'italic 32px sans-serif';
            ctx.fillStyle = '#475569';
            const words = log.notes.split(' ');
            let line = '';
            let y = weatherY + 80;
            const maxWidth = width - 200;
            for (let n = 0; n < words.length; n++) {
              let testLine = line + words[n] + ' ';
              if (ctx.measureText(testLine).width > maxWidth && n > 0) {
                ctx.fillText(`"${line.trim()}"`, 100, y);
                line = words[n] + ' ';
                y += 45;
                if (y > cardY + 250) break; // Limit notes height
              } else {
                line = testLine;
              }
            }
            if (line.trim()) {
              ctx.fillText(`"${line.trim()}"`, 100, y);
              notesEndY = y + 20;
            }
          }

          // Location Map Section (if location provided)
          if (log.location) {
            const mapY = Math.max(notesEndY + 30, cardY + 280);
            const mapH = height - mapY - 140;
            const mapW = width - 160;

            // Map container with gradient
            const mapGrad = ctx.createLinearGradient(80, mapY, 80, mapY + mapH);
            mapGrad.addColorStop(0, '#dbeafe');
            mapGrad.addColorStop(0.5, '#bfdbfe');
            mapGrad.addColorStop(1, '#93c5fd');
            ctx.fillStyle = mapGrad;
            ctx.beginPath();
            ctx.roundRect(80, mapY, mapW, mapH, 30);
            ctx.fill();

            // Map grid lines (subtle)
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 1;
            const gridSpacing = 60;
            for (let i = gridSpacing; i < mapH; i += gridSpacing) {
              ctx.beginPath();
              ctx.moveTo(80, mapY + i);
              ctx.lineTo(80 + mapW, mapY + i);
              ctx.stroke();
            }
            for (let i = gridSpacing; i < mapW; i += gridSpacing) {
              ctx.beginPath();
              ctx.moveTo(80 + i, mapY);
              ctx.lineTo(80 + i, mapY + mapH);
              ctx.stroke();
            }

            // Location pin with shadow
            const pinX = width / 2;
            const pinY = mapY + mapH / 2 - 40;

            // Pin shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.beginPath();
            ctx.ellipse(pinX, pinY + 90, 30, 10, 0, 0, Math.PI * 2);
            ctx.fill();

            // Pin body
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(pinX, pinY, 40, Math.PI, 0, false);
            ctx.quadraticCurveTo(pinX + 40, pinY + 30, pinX, pinY + 80);
            ctx.quadraticCurveTo(pinX - 40, pinY + 30, pinX - 40, pinY);
            ctx.fill();

            // Pin inner circle
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(pinX, pinY, 16, 0, Math.PI * 2);
            ctx.fill();

            // Location name
            ctx.textAlign = 'center';
            ctx.fillStyle = '#1e3a8a';
            ctx.font = 'bold 42px sans-serif';
            const locationText = log.location.length > 25 ? log.location.substring(0, 25) + '...' : log.location;
            ctx.fillText(locationText, width / 2, mapY + mapH - 60);

            // GPS coordinates if available
            if (log.coords) {
              ctx.font = '28px sans-serif';
              ctx.fillStyle = '#3b82f6';
              ctx.fillText(`📍 ${log.coords.lat.toFixed(5)}, ${log.coords.lng.toFixed(5)}`, width / 2, mapY + mapH - 25);
            }
          }

          // Footer branding
          ctx.textAlign = 'center';
          ctx.font = 'bold 28px sans-serif';
          ctx.fillStyle = '#94a3b8';
          ctx.fillText(t('shareCard.appBranding'), width / 2, height - 25);

          // Convert canvas to image URL for preview
          const imageUrl = canvas.toDataURL('image/png');
          setShareImageUrl(imageUrl);
          setIsGenerating(false);
        };

        if (log.photos && log.photos.length > 0) {
          const img = new Image();
          img.onload = () => drawContent(img);
          img.onerror = () => {
            console.error('Failed to load photo, drawing without it');
            drawContent(null);
          };
          img.src = log.photos[0];
        } else {
          drawContent();
        }
      });
    });
  };

  const shareGeneratedImage = async () => {
    if (!shareImageUrl) return;

    try {
      const blob = await (await fetch(shareImageUrl)).blob();
      const file = new File([blob], 'my-catch.png', { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: t('shareCard.shareTitle', { species: sharingLog.species }),
          text: t('shareCard.shareText', { weight: sharingLog.weight || '', species: sharingLog.species, location: sharingLog.location }),
        });
      } else {
        // Fallback: download the image
        const link = document.createElement('a');
        link.download = `catch-${sharingLog.species.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.png`;
        link.href = shareImageUrl;
        link.click();
      }

      // Close modal after sharing
      setSharingLog(null);
      setShareImageUrl(null);
    } catch (e) {
      // User cancelled sharing - don't close modal
      if (e.name !== 'AbortError') {
        console.error('Share failed:', e);
      }
    }
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
        if (Array.isArray(importedLogs) && window.confirm(t('confirm.importLogs', { count: importedLogs.length }))) {
          const db = await openDB();
          const transaction = db.transaction(STORE_NAME, 'readwrite');
          const store = transaction.objectStore(STORE_NAME);
          importedLogs.forEach(log => {
            const { id, ...logWithoutId } = log;
            store.add(logWithoutId);
          });
          transaction.oncomplete = () => window.location.reload();
        }
      } catch (err) { alert(t('confirm.invalidBackup')); }
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
        label: t('analysis.catches'),
        data: sortedDates.map(d => days[d]),
        backgroundColor: '#3b82f6',
        borderRadius: 4,
      }]
    };
  }, [filteredLogs, t]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700 font-sans pb-24">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 px-4 py-3 shadow-sm flex justify-between items-center">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          {t('app.title')} <span className="text-2xl">🎣</span>
        </h1>
        <div className="flex items-center gap-3">
          <div className="relative" ref={menuRef}>
            <button onClick={() => setShowMenu(!showMenu)} className={`flex items-center justify-center w-9 h-9 rounded-full transition-all ${showMenu ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
              <Menu className="w-5 h-5" />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-[60] overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                <button onClick={() => { exportJSON(); setShowMenu(false); }} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3 border-b border-slate-50"><Download className="w-4 h-4 text-blue-500" /> {t('menu.exportJson')}</button>
                <button onClick={() => { exportCSV(); setShowMenu(false); }} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3 border-b border-slate-50"><FileSpreadsheet className="w-4 h-4 text-emerald-500" /> {t('menu.exportCsv')}</button>
                <button onClick={() => { fileInputRef.current.click(); setShowMenu(false); }} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3"><Upload className="w-4 h-4 text-amber-500" /> {t('menu.restoreJson')}</button>
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
            <p className="text-[10px] font-bold uppercase tracking-widest">{t('loading.wakingDatabase')}</p>
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

      {/* Hidden canvas for generating share image */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {sharingLog && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden flex flex-col max-h-[95vh]">
            <div className="p-3 flex justify-between items-center border-b flex-shrink-0">
              <h3 className="font-bold text-sm">{t('shareModal.sharePreview')}</h3>
              <button onClick={() => { setSharingLog(null); setShareImageUrl(null); }} className="p-2 bg-slate-100 rounded-full"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 bg-slate-100 min-h-0">
              {isGenerating ? (
                <div className="py-20 flex flex-col items-center gap-4 text-slate-400">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs font-bold uppercase">{t('loading.designingCard')}</p>
                </div>
              ) : shareImageUrl ? (
                <div className="shadow-2xl rounded-xl overflow-hidden border-4 border-white mx-auto" style={{ maxWidth: '300px' }}>
                  <img src={shareImageUrl} alt={t('shareModal.sharePreview')} className="w-full h-auto block" />
                </div>
              ) : null}
            </div>
            <div className="p-4 bg-white space-y-2 flex-shrink-0 border-t">
              <button onClick={shareGeneratedImage} disabled={isGenerating || !shareImageUrl} className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                <Share2 size={18} /> {t('shareModal.shareToSocials')}
              </button>
              <p className="text-[10px] text-center text-slate-400 leading-tight">{t('shareModal.helpText')}</p>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 shadow-lg z-50">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <NavButton active={view === 'dashboard'} icon={<Home />} label={t('nav.home')} onClick={() => setView('dashboard')} />
          <NavButton active={view === 'log'} icon={<PlusCircle />} label={t('nav.log')} onClick={() => { setEditingLog(null); setView('log'); }} />
          <NavButton active={view === 'analysis'} icon={<BarChart3 />} label={t('nav.report')} onClick={() => setView('analysis')} />
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
  const { t } = useTranslation();
  const displayedLogs = logs.slice(0, limit);
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <StatCard count={logs.length} label={t('dashboard.totalCatches')} color="bg-blue-600" />
        <StatCard count={[...new Set(logs.map(l => l.location))].length} label={t('dashboard.uniqueSpots')} color="bg-emerald-600" />
      </div>
      <div className="space-y-4">
        <div className="flex justify-between items-end px-1">
          <h2 className="font-bold text-lg text-slate-800">⏱️ {t('dashboard.recentActivity')}</h2>
          {logs.length > 0 && (
            <button onClick={() => setIsSelectMode(!isSelectMode)} className="text-[10px] font-bold uppercase px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg">
              {isSelectMode ? t('dashboard.cancel') : t('dashboard.manageList')}
            </button>
          )}
        </div>
        {isSelectMode && selectedIds.length > 0 && (
          <button onClick={() => onDelete(selectedIds)} className="w-full py-3 bg-red-500 text-white rounded-xl font-bold text-xs uppercase shadow-lg shadow-red-200 animate-in zoom-in-95">
            {t('dashboard.deleteSelected', { count: selectedIds.length })}
          </button>
        )}
        {logs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-300 font-bold uppercase text-xs tracking-widest">{t('dashboard.logbookEmpty')}</div>
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
            {logs.length > limit && <button onClick={() => setLimit(l => l + 10)} className="w-full py-4 bg-white border border-slate-200 rounded-2xl text-slate-500 font-bold text-sm">{t('dashboard.loadMore')}</button>}
          </>
        )}
      </div>
    </div>
  );
};

const LogCard = ({ log, onDelete, onEdit, onShare }) => {
  const { t } = useTranslation();
  const formattedDate = new Date(log.date).toLocaleString([], {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:border-blue-200 transition-all w-full group">
      {log.photos?.length > 0 && (
        <div className="flex gap-1 h-48 overflow-x-auto p-2 bg-slate-50 border-b border-slate-100 scrollbar-hide">
          {log.photos.map((img, i) => <img key={i} src={img} className="h-full rounded-lg object-cover aspect-square flex-shrink-0" alt={t('logCard.catch')} />)}
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
            <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-black">{log.weight} {t('logCard.lbs')}</span>
            <div className="flex gap-1">
              {onShare && <button onClick={() => onShare(log)} className="p-2 text-slate-300 hover:text-emerald-500 transition-colors" title={t('logCard.sharePoster')}><Share2 className="w-4 h-4" /></button>}
              {onEdit && <button onClick={() => onEdit(log)} className="p-2 text-slate-300 hover:text-blue-500 transition-colors"><Edit2 className="w-4 h-4" /></button>}
              {onDelete && <button onClick={onDelete} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-slate-50 pt-3">
          {log.coords && <div className="text-[9px] font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded flex items-center gap-1"><Navigation className="w-3 h-3" /> {log.coords.lat.toFixed(4)}, {log.coords.lng.toFixed(4)}</div>}
          {log.temp && <div className="text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded flex items-center gap-1"><Thermometer className="w-3 h-3" /> {log.temp}°F</div>}
          {log.wind && <div className="text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded flex items-center gap-1"><Wind className="w-3 h-3" /> {log.wind} {t('logCard.mph')}</div>}
        </div>
        {log.notes && <div className="mt-2 text-xs text-slate-600 italic border-l-2 border-slate-100 pl-3 py-1">"{log.notes}"</div>}
      </div>
    </div>
  );
};

const LogForm = ({ onSave, editingLog, onCancel }) => {
  const { t } = useTranslation();
  const [photos, setPhotos] = useState(editingLog?.photos || []);
  const [coords, setCoords] = useState(editingLog?.coords || null);
  const [gettingLoc, setGettingLoc] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);
  const defaultDateTime = editingLog?.date || new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 19);

  const handleFile = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    if (photos.length + files.length > 4) { alert(t('logForm.maxPhotos')); return; }
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
          <h2 className="font-black text-lg text-slate-800 uppercase tracking-tighter">{editingLog ? t('logForm.editEntry') : t('logForm.newCatch')}</h2>
          <div className="w-9" />
        </div>
        <form onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.target);
          onSave({ species: fd.get('species'), weight: fd.get('weight'), date: fd.get('date'), location: fd.get('location'), bait: fd.get('bait'), temp: fd.get('temp'), wind: fd.get('wind'), notes: fd.get('notes'), photos, coords });
        }} className="space-y-6">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-3">{t('logForm.photos', { count: photos.length })}</label>
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
            <InputField name="species" label={t('logForm.species')} placeholder={t('logForm.speciesPlaceholder')} required icon={<Fish />} defaultValue={editingLog?.species} requiredText={t('logForm.required')} />
            <div className="grid grid-cols-2 gap-3">
              <InputField name="weight" label={t('logForm.weight')} placeholder={t('logForm.weightPlaceholder')} type="number" step="0.01" icon={<Scale />} defaultValue={editingLog?.weight} />
              <InputField name="date" label={t('logForm.dateTime')} type="datetime-local" step="1" required icon={<Calendar />} defaultValue={defaultDateTime} requiredText={t('logForm.required')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <InputField name="location" label={t('logForm.location')} placeholder={t('logForm.locationPlaceholder')} required icon={<MapPin />} defaultValue={editingLog?.location} requiredText={t('logForm.required')} />
              <InputField name="bait" label={t('logForm.baitLure')} placeholder={t('logForm.baitPlaceholder')} icon={<CloudSun />} defaultValue={editingLog?.bait} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 px-1 flex items-center gap-2"><Navigation className="w-3 h-3" /> {t('logForm.gpsCoordinates')}</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => {
                    setGettingLoc(true);
                    navigator.geolocation.getCurrentPosition(
                      (p) => { setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }); setGettingLoc(false); },
                      () => { alert(t('logForm.gpsAccessDenied')); setGettingLoc(false); }
                    );
                  }} className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex-shrink-0 ${coords ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{gettingLoc ? t('logForm.wait') : coords ? t('logForm.retag') : t('logForm.tagLocation')}</button>
                <input type="text" readOnly placeholder={t('logForm.notTagged')} value={coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : ''} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-500 font-mono outline-none" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-50">
            <InputField name="temp" label={t('logForm.tempF')} type="number" icon={<Thermometer />} defaultValue={editingLog?.temp} />
            <InputField name="wind" label={t('logForm.windMph')} type="number" icon={<Wind />} defaultValue={editingLog?.wind} />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase mb-1.5 flex items-center gap-2 px-1 text-slate-400"><FileText className="w-3 h-3" /> {t('logForm.notesOptional')}</label>
            <textarea name="notes" placeholder={t('logForm.notesPlaceholder')} defaultValue={editingLog?.notes} className="w-full p-4 rounded-xl border outline-none transition-all text-sm bg-slate-50 border-slate-200 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-200 h-24 resize-none" />
          </div>
          <button type="submit" disabled={isProcessing} className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-100 uppercase tracking-widest text-sm">{editingLog ? t('logForm.updateEntry') : t('logForm.logCatch')}</button>
        </form>
      </div>
    </div>
  );
};

const InputField = ({ label, icon, required, requiredText, ...props }) => (
  <div className="flex-1">
    <label className={`text-[10px] font-black uppercase mb-1.5 flex items-center gap-2 px-1 ${required ? 'text-emerald-600' : 'text-slate-400'}`}>
      {React.cloneElement(icon, { className: "w-3 h-3" })} {label} {required && requiredText}
    </label>
    <input required={required} className={`w-full p-4 rounded-xl border outline-none transition-all text-sm ${required ? 'bg-emerald-50/30 border-emerald-100 focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:border-emerald-200' : 'bg-slate-50 border-slate-200 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-200'}`} {...props} />
  </div>
);

const Analysis = ({ logs, filters, setFilters, locations, speciesStats, timelineStats, limit, setLimit }) => {
  const { t } = useTranslation();
  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h2 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-blue-500" /> {t('analysis.stats')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FilterSelect label={t('analysis.spot')} value={filters.location} options={locations} onChange={v => setFilters({...filters, location: v})} allLabel={t('analysis.all')} />
          <FilterSelect label={t('analysis.from')} type="date" value={filters.startDate} onChange={v => setFilters({...filters, startDate: v})} />
          <FilterSelect label={t('analysis.to')} type="date" value={filters.endDate} onChange={v => setFilters({...filters, endDate: v})} />
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
      ) : <div className="text-center py-20 text-slate-300 font-bold uppercase text-xs">{t('analysis.noRecords')}</div>}
    </div>
  );
};

const FilterSelect = ({ label, type = 'select', value, options, onChange, allLabel }) => (
  <div className="flex-1">
    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">{label}</label>
    {type === 'select' ? (
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm">
        {options.map(o => <option key={o} value={o}>{o === 'All' && allLabel ? allLabel : o}</option>)}
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