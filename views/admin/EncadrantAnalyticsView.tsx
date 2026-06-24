
import React, { useMemo, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from 'recharts';
import { 
  BarChart3, Users, Building2, Clock, 
  ArrowLeft, Filter, Calendar,
  CheckCircle2, AlertCircle, Briefcase, DollarSign, FileText
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { Role, WorkflowStatus, StageType } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useLocation, useNavigate } from 'react-router-dom';
import { BackButton } from '../../components/shared/BackButton';

export const EncadrantAnalyticsView = () => {
  const { records, currentUser } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') === 'archive' ? 'ARCHIVE' : 'CURRENT';
  
  const [timeframe, setTimeframe] = useState<'CURRENT' | 'ARCHIVE'>(initialTab);
  const [filterFiliere, setFilterFiliere] = useState<string>('ALL');
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const latestAcademicYear = '2024/2025';

  const filteredRecordsMain = useMemo(() => {
    if (!currentUser) return [];
    let filtered = records.filter(r => 
      r.data.fstTutorEmail?.toLowerCase() === currentUser.email?.toLowerCase()
    );

    if (timeframe === 'CURRENT') {
      filtered = filtered.filter(r => r.data.academicYear === latestAcademicYear);
    } else {
      filtered = filtered.filter(r => r.data.academicYear !== latestAcademicYear);
    }

    if (filterFiliere !== 'ALL') {
      filtered = filtered.filter(r => r.data.filiere === filterFiliere);
    }

    if (filterLevel !== 'ALL') {
      filtered = filtered.filter(r => r.data.currentLevel === filterLevel);
    }

    return filtered;
  }, [records, currentUser, timeframe, latestAcademicYear, filterFiliere, filterLevel]);

  const submissionStats = useMemo(() => {
    const submitted = filteredRecordsMain.filter(r => r.status !== WorkflowStatus.DRAFT).length;
    const drafts = filteredRecordsMain.filter(r => r.status === WorkflowStatus.DRAFT).length;
    return [
      { name: 'Soumis', value: submitted, color: 'var(--primary)' },
      { name: 'Brouillons', value: drafts, color: 'var(--muted-foreground)' }
    ];
  }, [filteredRecordsMain]);

  const companyStats = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRecordsMain.forEach(r => {
      const company = r.data.companyName || 'Inconnu';
      counts[company] = (counts[company] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredRecordsMain]);

  const stageTypeStats = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRecordsMain.forEach(r => {
      const type = r.data.stageType || StageType.PFA;
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredRecordsMain]);

  const remunerationStats = useMemo(() => {
    const remunere = filteredRecordsMain.filter(r => r.data.isRemunere).length;
    const nonRemunere = filteredRecordsMain.filter(r => !r.data.isRemunere).length;
    return [
      { name: 'Rémunéré', value: remunere, color: 'var(--primary)' },
      { name: 'Non Rémunéré', value: nonRemunere, color: 'var(--muted-foreground)' }
    ];
  }, [filteredRecordsMain]);

  const COLORS = ['var(--primary)', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const totalPages = Math.ceil(filteredRecordsMain.length / itemsPerPage);
  const paginatedRecords = useMemo(() => {
    return filteredRecordsMain.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredRecordsMain, currentPage]);

  return (
    <div className="container mx-auto px-4 md:px-6 pt-8 md:pt-12 pb-48 md:pb-64 max-w-7xl space-y-12 animate-in fade-in duration-500 bg-background min-h-screen transition-all">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-4">
          <BackButton to="/dashboard" />
          <div className="flex items-center gap-3">
            <BarChart3 className="text-primary" size={32} />
            <h2 className="text-4xl font-black text-foreground uppercase tracking-tighter">Analytiques Étudiants</h2>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            Visualisez les statistiques de vos étudiants pour {timeframe === 'CURRENT' ? "l'année en cours" : "les archives"}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Filters Panel */}
          <div className="flex flex-wrap items-center gap-3 bg-secondary/50 p-2 rounded-2xl mr-2">
            <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-xl border border-slate-200">
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Filière</span>
              <select 
                value={filterFiliere}
                onChange={(e) => setFilterFiliere(e.target.value)}
                className="text-[9px] font-bold uppercase bg-transparent outline-none cursor-pointer"
              >
                <option value="ALL">Toutes</option>
                {Array.from(new Set(records.map(r => r.data.filiere).filter(Boolean))).map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-xl border border-slate-200">
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Niveau</span>
              <select 
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="text-[9px] font-bold uppercase bg-transparent outline-none cursor-pointer"
              >
                <option value="ALL">Tous</option>
                {Array.from(new Set(records.map(r => r.data.currentLevel).filter(Boolean))).map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-2 p-1 bg-secondary rounded-2xl">
            <button 
              onClick={() => setTimeframe('CURRENT')}
              className={`px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${timeframe === 'CURRENT' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'}`}
            >
              Année en cours
            </button>
            <button 
              onClick={() => setTimeframe('ARCHIVE')}
              className={`px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${timeframe === 'ARCHIVE' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'}`}
            >
              Archives
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Étudiants" value={filteredRecordsMain.length} icon={<Users className="text-primary" />} />
        <StatCard label="Soumissions" value={filteredRecordsMain.filter(r => r.status !== WorkflowStatus.DRAFT).length} icon={<CheckCircle2 className="text-emerald-600" />} />
        <StatCard label="Entreprises" value={new Set(filteredRecordsMain.map(r => r.data.companyName)).size} icon={<Building2 className="text-primary" />} />
        <StatCard label="Rémunérés" value={filteredRecordsMain.filter(r => r.data.isRemunere).length} icon={<DollarSign className="text-amber-600" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Submission Status Chart */}
        <Card className="p-8 space-y-6 rounded-[2.5rem] bg-card border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">État des Soumissions</h3>
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <Clock size={20} />
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={submissionStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {submissionStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px', backgroundColor: 'var(--card)', color: 'var(--foreground)' }}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Company Distribution */}
        <Card className="p-8 space-y-6 rounded-[2.5rem] bg-card border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Top 5 Entreprises</h3>
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <Building2 size={20} />
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={companyStats} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" className="text-border" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fill: 'currentColor' }} className="text-muted-foreground" />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px', backgroundColor: 'var(--card)', color: 'var(--foreground)' }}
                />
                <Bar dataKey="value" fill="var(--primary)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Stage Types */}
        <Card className="p-8 space-y-6 rounded-[2.5rem] bg-card border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Types de Stage</h3>
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-600">
              <Briefcase size={20} />
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageTypeStats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'currentColor' }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 10, fill: 'currentColor' }} className="text-muted-foreground" />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px', backgroundColor: 'var(--card)', color: 'var(--foreground)' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {stageTypeStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>


        {/* Remuneration Stats */}
        <Card className="p-8 space-y-6 rounded-[2.5rem] bg-card border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Rémunération</h3>
            <div className="p-2 bg-amber-500/10 rounded-xl text-amber-600">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={remunerationStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {remunerationStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px', backgroundColor: 'var(--card)', color: 'var(--foreground)' }}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Detailed List for Archive if selected */}
      {timeframe === 'ARCHIVE' && (
        <Card className="p-8 rounded-[3rem] space-y-8 bg-card border-border">
          <h3 className="text-xl font-black uppercase tracking-tight text-foreground">Détails des Archives</h3>
          <div className="w-full">
            <table className="w-full text-left border-separate border-spacing-y-4">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  <th className="pb-4 pl-4">Étudiant</th>
                  <th className="pb-4 hidden sm:table-cell">Année Académique</th>
                  <th className="pb-4 hidden md:table-cell">Entreprise</th>
                  <th className="pb-4">Statut</th>
                  <th className="pb-4 pr-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.map(record => (
                  <tr key={record.id} className="group hover:translate-x-1 transition-transform duration-300">
                    <td className="py-4 pl-6 bg-secondary rounded-l-[2rem] border-y border-l border-border">
                      <p className="text-xs font-bold text-foreground uppercase tracking-tight truncate max-w-[150px] sm:max-w-none">{record.studentName}</p>
                    </td>
                    <td className="py-4 bg-secondary border-y border-border hidden sm:table-cell">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{record.data.academicYear}</p>
                    </td>
                    <td className="py-4 bg-secondary border-y border-border hidden md:table-cell max-w-[200px]">
                      <p className="text-[10px] font-bold text-foreground uppercase truncate">{record.data.companyName}</p>
                    </td>
                    <td className="py-4 bg-secondary border-y border-border min-w-[120px]">
                      <Badge status={record.status} />
                    </td>
                    <td className="py-4 pr-6 bg-secondary rounded-r-[2rem] border-y border-r border-border text-right">
                      <Button 
                        onClick={() => navigate(`/request/${record.id}`)} 
                        variant="ghost" 
                        size="sm" 
                        className="text-primary hover:bg-primary/10 rounded-xl font-bold text-[10px] uppercase tracking-widest"
                      >
                        Voir
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Page {currentPage} sur {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    className="px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest"
                  >
                    Précédent
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    className="px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest"
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

const StatCard = ({ label, value, icon }: any) => (
  <Card className="p-6 bg-card border-border shadow-xl rounded-[2rem] space-y-4 group hover:-translate-y-1 transition-all duration-300">
    <div className="flex justify-between items-start">
      <div className="p-3 bg-secondary rounded-2xl group-hover:scale-110 transition-transform text-primary">
        {icon}
      </div>
    </div>
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-3xl font-medium text-foreground tracking-tighter">{value}</p>
    </div>
  </Card>
);
