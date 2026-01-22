import React, { useState, useEffect, useMemo } from 'react';
import { 
  Home, 
  PlusCircle, 
  BarChart3, 
  Trash2, 
  MapPin, 
  Calendar, 
  Fish, 
  Scale,
  ChevronRight,
  Filter
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

// Register ChartJS components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

const App = () => {
  const [view, setView] = useState('dashboard');
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState({
    location: 'All',
    startDate: '',
    endDate: ''
  });

  // --- Persistence & Initialization ---
  useEffect(() => {
    const saved = localStorage.getItem('fishing_spa_logs');
    if (saved) {
      setLogs(JSON.parse(saved));
    } else {
      // Seed data for first-time users
      const initialData = [
        { id: 1, species: "Largemouth Bass", weight: 4.2, location: "Lake Eerie", date: "2023-10-15", bait: "Spinner" },
        { id: 2, species: "Trout", weight: 2.1, location: "Blue River", date: "2023-10-18", bait: "Fly" },
        { id: 3, species: "Largemouth Bass", weight: 3.5, location: "Lake Eerie", date: "2023-10-20", bait: "Worm" }
      ];
      setLogs(initialData);
      localStorage.setItem('fishing_spa_logs', JSON.stringify(initialData));
    }
  }, []);

  useEffect(() => {
    if (logs.length > 0) {
      localStorage.setItem('fishing_spa_logs', JSON.stringify(logs));
    }
  }, [logs]);

  // --- Handlers ---
  const addLog = (newLog) => {
    setLogs(prev => [newLog, ...prev]);
    setView('dashboard');
  };

  const deleteLog = (id) => {
    setLogs(prev => prev.filter(log => log.id !== id));
  };

  const resetData = () => {
    if (window.confirm("Are you sure you want to clear all fishing logs?")) {
      setLogs([]);
      localStorage.removeItem('fishing_spa_logs');
    }
  };

  // --- Filtered Data & Analytics ---
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
    filteredLogs.forEach(l => {
      counts[l.species] = (counts[l.species] || 0) + 1;
    });
    return {
      labels: Object.keys(counts),
      datasets: [{
        data: Object.values(counts),
        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
        borderWidth: 0,
      }]
    };
  }, [filteredLogs]);

  const locationStats = useMemo(() => {
    const counts = {};
    filteredLogs.forEach(l => {
      counts[l.location] = (counts[l.location] || 0) + 1;
    });
    return {
      labels: Object.keys(counts),
      datasets: [{
        label: 'Catches',
        data: Object.values(counts),
        backgroundColor: '#10b981',
        borderRadius: 6,
      }]
    };
  }, [filteredLogs]);

  const locations = ['All', ...new Set(logs.map(l => l.location))];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700 font-sans pb-24">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 px-4 py-3 shadow-sm flex justify-between items-center">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          Angler's Log <span className="text-2xl">🎣</span>
        </h1>
        <button 
          onClick={resetData}
          className="text-xs font-bold text-red-400 border border-red-200 px-2 py-1 rounded hover:bg-red-50 transition-colors"
        >
          Reset Data
        </button>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-6">
        {view === 'dashboard' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <p className="text-sm text-slate-500">Welcome back! Here is a summary of your recent fishing activity.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-600 text-white p-5 rounded-xl shadow-md">
                <div className="text-3xl font-bold">{logs.length}</div>
                <div className="text-xs uppercase font-bold text-blue-100 mt-1">Total Catches</div>
              </div>
              <div className="bg-emerald-600 text-white p-5 rounded-xl shadow-md">
                <div className="text-3xl font-bold">{locations.length - 1}</div>
                <div className="text-xs uppercase font-bold text-emerald-100 mt-1">Locations</div>
              </div>
            </div>

            <div>
              <h2 className="font-bold text-lg text-slate-800 mb-3 flex items-center gap-2">⏱️ Recent Activity</h2>
              {logs.length === 0 ? (
                <div className="text-center py-10 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                  No catches logged yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {logs.slice(0, 5).map(log => (
                    <div key={log.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center group hover:border-blue-200 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-50 p-2 rounded-full">
                          <Fish className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">{log.species}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {log.location}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-700 text-sm">{log.weight} lbs</div>
                        <div className="text-[10px] text-slate-400">{log.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'log' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm mb-6">
              <h2 className="font-bold text-lg text-slate-800 mb-1">New Catch Entry</h2>
              <p className="text-sm text-slate-500">Log your latest success.</p>
            </div>

            <form 
              className="space-y-4 bg-white p-6 rounded-xl shadow-sm border border-slate-100"
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                addLog({
                  id: Date.now(),
                  species: formData.get('species'),
                  weight: parseFloat(formData.get('weight')) || 0,
                  date: formData.get('date'),
                  location: formData.get('location'),
                  bait: formData.get('bait')
                });
              }}
            >
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1 flex items-center gap-1">
                   Species
                </label>
                <input name="species" required placeholder="e.g. Largemouth Bass" className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Weight (lbs)</label>
                  <input type="number" step="0.1" name="weight" placeholder="0.0" className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Date</label>
                  <input type="date" name="date" defaultValue={new Date().toISOString().split('T')[0]} required className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Location</label>
                <input name="location" required placeholder="Lake, River, Spot..." className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Bait Used</label>
                <input name="bait" placeholder="Lure type..." className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              </div>

              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg mt-4 active:scale-95 transition-all">
                Save Catch
              </button>
            </form>
          </div>
        )}

        {view === 'analysis' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-blue-500" /> Fishing Activity Report
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Location</label>
                  <select 
                    value={filters.location}
                    onChange={(e) => setFilters(prev => ({...prev, location: e.target.value}))}
                    className="w-full p-2 bg-white border border-slate-200 rounded text-sm outline-none"
                  >
                    {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Start Date</label>
                  <input 
                    type="date" 
                    value={filters.startDate}
                    onChange={(e) => setFilters(prev => ({...prev, startDate: e.target.value}))}
                    className="w-full p-2 bg-white border border-slate-200 rounded text-sm" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">End Date</label>
                  <input 
                    type="date" 
                    value={filters.endDate}
                    onChange={(e) => setFilters(prev => ({...prev, endDate: e.target.value}))}
                    className="w-full p-2 bg-white border border-slate-200 rounded text-sm" 
                  />
                </div>
              </div>
            </div>

            {filteredLogs.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <h3 className="font-bold text-xs text-slate-400 uppercase mb-4 tracking-wider">Species Mix</h3>
                    <div className="h-64">
                      <Doughnut data={speciesStats} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <h3 className="font-bold text-xs text-slate-400 uppercase mb-4 tracking-wider">Hotspots</h3>
                    <div className="h-64">
                      <Bar data={locationStats} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                  <h3 className="font-bold text-xs text-slate-400 uppercase mb-4 tracking-wider">Detailed Log ({filteredLogs.length})</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                        <tr>
                          <th className="p-3">Date</th>
                          <th className="p-3">Species</th>
                          <th className="p-3">Loc</th>
                          <th className="p-3 text-right">Lbs</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredLogs.map(log => (
                          <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 text-slate-400 text-xs">{log.date}</td>
                            <td className="p-3 font-medium">{log.species}</td>
                            <td className="p-3 text-slate-500 text-xs truncate max-w-[100px]">{log.location}</td>
                            <td className="p-3 text-right font-bold text-blue-600">{log.weight}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed border-slate-200">
                <Filter className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 font-medium">No catches found for these filters.</p>
                <button 
                  onClick={() => setFilters({location: 'All', startDate: '', endDate: ''})}
                  className="mt-2 text-blue-500 text-sm font-bold"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-50">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <button 
            onClick={() => setView('dashboard')} 
            className={`flex flex-col items-center gap-1 transition-all ${view === 'dashboard' ? 'text-blue-600 scale-110' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Home className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-tight">Home</span>
          </button>
          
          <button 
            onClick={() => setView('log')} 
            className={`flex flex-col items-center gap-1 transition-all ${view === 'log' ? 'text-blue-600 scale-110' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <PlusCircle className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-tight">Log</span>
          </button>
          
          <button 
            onClick={() => setView('analysis')} 
            className={`flex flex-col items-center gap-1 transition-all ${view === 'analysis' ? 'text-blue-600 scale-110' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <BarChart3 className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-tight">Report</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default App;