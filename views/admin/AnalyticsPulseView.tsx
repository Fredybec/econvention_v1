import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, PieChart, Pie, Cell, BarChart, Bar 
} from 'recharts';
import { useAppContext } from '../../context/AppContext';
import { PFERecord } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { BackButton } from '../../components/shared/BackButton';
import { Filter, Search } from 'lucide-react';

export const AnalyticsPulseView = ({ records: propRecords }: { records?: PFERecord[] }) => {
  const { records: contextRecords, config } = useAppContext();
  const records = propRecords || contextRecords;
  const navigate = useNavigate();

  const [filterFiliere, setFilterFiliere] = useState<string>('ALL');
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [filterDept, setFilterDept] = useState<string>('ALL');

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const matchFiliere = filterFiliere === 'ALL' || r.data.filiere === filterFiliere;
      const matchLevel = filterLevel === 'ALL' || r.data.currentLevel === filterLevel;
      const matchDept = filterDept === 'ALL' || r.data.department === filterDept;
      return matchFiliere && matchLevel && matchDept;
    });
  }, [records, filterFiliere, filterLevel, filterDept]);

  const dataByStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRecords.forEach(r => {
      counts[r.status] = (counts[r.status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredRecords]);

  const dataByDepartment = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRecords.forEach(r => {
      const dept = r.data.department || 'Autre';
      counts[dept] = (counts[dept] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredRecords]);

  const timeSeriesData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    const data = months.map(month => ({ name: month, count: 0 }));
    
    filteredRecords.forEach(r => {
      const date = new Date(r.history[0]?.updatedAt || Date.now());
      if (date.getFullYear() === currentYear) {
        const monthIndex = date.getMonth();
        data[monthIndex].count++;
      }
    });
    
    return data;
  }, [filteredRecords]);

  const filiereAnalytics = useMemo(() => {
    const metrics: Record<string, { international: number, remunerated: number, preEmbauche: number, total: number }> = {};
    
    filteredRecords.forEach(r => {
      const filiere = r.data.filiere || 'Indéterminée';
      if (!metrics[filiere]) {
        metrics[filiere] = { international: 0, remunerated: 0, preEmbauche: 0, total: 0 };
      }
      
      metrics[filiere].total++;
      if (r.data.isInternational) metrics[filiere].international++;
      if (r.data.isRemunere) metrics[filiere].remunerated++;
      if (r.data.isPreEmbauche) metrics[filiere].preEmbauche++;
    });

    const chartData = Object.entries(metrics).map(([name, m]) => ({
      name,
      ...m
    }));

    const winners = {
      international: [...chartData].sort((a, b) => b.international - a.international)[0],
      remunerated: [...chartData].sort((a, b) => b.remunerated - a.remunerated)[0],
      preEmbauche: [...chartData].sort((a, b) => b.preEmbauche - a.preEmbauche)[0]
    };

    return { chartData, winners };
  }, [filteredRecords]);

  return (
    <div className="container mx-auto px-4 md:px-6 pt-8 md:pt-12 pb-48 md:pb-64 max-w-7xl space-y-12 text-left transition-all bg-background min-h-screen">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-4">
          <BackButton to="/dashboard" />
          <div className="space-y-1">
            <h2 className="text-4xl text-foreground tracking-tighter uppercase font-black">Analytics Pulse</h2>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Indicateurs de performance en temps réel</p>
          </div>
        </div>
        
        {/* Filters Panel */}
        <Card className="flex flex-wrap items-center gap-4 p-4 rounded-3xl bg-secondary/30 border-slate-200">
          <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-xl border border-slate-200 shadow-sm">
            <Filter size={14} className="text-primary" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Filière</span>
            <select 
              value={filterFiliere}
              onChange={(e) => setFilterFiliere(e.target.value)}
              className="text-[10px] font-bold uppercase bg-transparent outline-none cursor-pointer"
            >
              <option value="ALL">Toutes</option>
              {config?.filieres?.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 pl-1 border-l border-slate-200">Niveau</span>
            <select 
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="text-[10px] font-bold uppercase bg-transparent outline-none cursor-pointer"
            >
              <option value="ALL">Tous</option>
              {config?.niveaux?.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 pl-1 border-l border-slate-200">Dept.</span>
            <select 
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="text-[10px] font-bold uppercase bg-transparent outline-none cursor-pointer"
            >
              <option value="ALL">Tous</option>
              {config?.departments?.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </Card>
      </header>

      {/* Top Insights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-card border-border shadow-lg rounded-3xl space-y-2 border-l-4 border-l-blue-500">
          <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Top International</p>
          <h4 className="text-lg font-bold text-foreground leading-tight">{filiereAnalytics.winners.international?.name || 'N/A'}</h4>
          <p className="text-2xl font-black text-blue-600">{filiereAnalytics.winners.international?.international || 0} <span className="text-xs font-medium text-muted-foreground">stages</span></p>
        </Card>
        <Card className="p-6 bg-card border-border shadow-lg rounded-3xl space-y-2 border-l-4 border-l-emerald-500">
          <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Top Rémunéré</p>
          <h4 className="text-lg font-bold text-foreground leading-tight">{filiereAnalytics.winners.remunerated?.name || 'N/A'}</h4>
          <p className="text-2xl font-black text-emerald-600">{filiereAnalytics.winners.remunerated?.remunerated || 0} <span className="text-xs font-medium text-muted-foreground">stages</span></p>
        </Card>
        <Card className="p-6 bg-card border-border shadow-lg rounded-3xl space-y-2 border-l-4 border-l-purple-500">
          <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Top Pré-Embauche</p>
          <h4 className="text-lg font-bold text-foreground leading-tight">{filiereAnalytics.winners.preEmbauche?.name || 'N/A'}</h4>
          <p className="text-2xl font-black text-purple-600">{filiereAnalytics.winners.preEmbauche?.preEmbauche || 0} <span className="text-xs font-medium text-muted-foreground">stages</span></p>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="p-8 bg-card border-border shadow-xl rounded-[2.5rem] md:col-span-2 space-y-8">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Volume de Demandes (2025)</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeSeriesData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'currentColor' }} className="text-muted-foreground" />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'currentColor' }} className="text-muted-foreground" />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px', backgroundColor: 'var(--card)', color: 'var(--foreground)' }}
                />
                <Area type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-8 bg-card border-border shadow-xl rounded-[2.5rem] space-y-8">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Répartition par État</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dataByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {dataByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#6366f1'][index % 5]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px', backgroundColor: 'var(--card)', color: 'var(--foreground)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-8 bg-card border-border shadow-xl rounded-[2.5rem] md:col-span-3 space-y-8 text-left">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Performance par Filière</h3>
          <div className="h-[400px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filiereAnalytics.chartData} layout="vertical" margin={{ left: 10, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="currentColor" className="text-border opacity-50" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'currentColor' }} className="text-muted-foreground" />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={80} tick={{ fontSize: 8, fontWeight: 700, fill: 'currentColor' }} className="text-foreground md:text-[9px] md:font-bold" />
                <Tooltip 
                  cursor={{ fill: 'var(--secondary)', opacity: 0.4 }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px', backgroundColor: 'var(--card)', color: 'var(--foreground)' }}
                />
                <Bar dataKey="international" name="International" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={10} />
                <Bar dataKey="remunerated" name="Rémunéré" fill="#10b981" radius={[0, 4, 4, 0]} barSize={10} />
                <Bar dataKey="preEmbauche" name="Pré-Embauche" fill="#a855f7" radius={[0, 4, 4, 0]} barSize={10} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-8 bg-card border-border shadow-xl rounded-[2.5rem] md:col-span-3 space-y-8">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Activité par Département</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataByDepartment}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'currentColor' }} className="text-muted-foreground" />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'currentColor' }} className="text-muted-foreground" />
                <Tooltip 
                  cursor={{ fill: 'var(--secondary)' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px', backgroundColor: 'var(--card)', color: 'var(--foreground)' }}
                />
                <Bar dataKey="value" fill="#2563eb" radius={[8, 8, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};
