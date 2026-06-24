import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Chart from 'react-apexcharts';
import { useAppContext } from '../../context/AppContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { STEPS } from '../../utils/workflowConstants';
import { WorkflowStatus, StageType, Role } from '../../types';
import { TrendingUp, Users, FileText, CheckCircle, Clock, AlertCircle, Briefcase, DollarSign, Building2, ArrowLeft, Filter, X, Globe, Users2, BarChart2 } from 'lucide-react';

const getStatusColor = (status: WorkflowStatus) => {
  switch (status) {
    case WorkflowStatus.COMPLETED: return '#10b981';
    case WorkflowStatus.REJECTED: return '#ef4444';
    case WorkflowStatus.CANCELLED: return '#64748b';
    case WorkflowStatus.DRAFT: return '#94a3b8';
    case WorkflowStatus.COMPLEMENT_REQUIRED: return '#f59e0b';
    default: return '#6366f1';
  }
};

export const SuperadminAnalyticsView = () => {
  const navigate = useNavigate();
  const { records, users, systemConfig } = useAppContext();
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedFiliere, setSelectedFiliere] = useState<string>('all');

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const matchesDept = selectedDept === 'all' || r.data.department === selectedDept;
      const matchesFiliere = selectedFiliere === 'all' || r.data.filiere === selectedFiliere;
      return matchesDept && matchesFiliere;
    });
  }, [records, selectedDept, selectedFiliere]);

  const stats = useMemo(() => {
    const totalConventions = filteredRecords.length;
    const completedConventions = filteredRecords.filter(r => r.status === WorkflowStatus.COMPLETED).length;
    const pendingConventions = filteredRecords.filter(r => ![WorkflowStatus.COMPLETED, WorkflowStatus.REJECTED, WorkflowStatus.CANCELLED].includes(r.status)).length;
    
    const remunereCount = filteredRecords.filter(r => r.data.isRemunere).length;
    const preEmbaucheCount = filteredRecords.filter(r => r.data.isPreEmbauche).length;
    const internationalCount = filteredRecords.filter(r => r.data.isInternational).length;
    const binomeCount = filteredRecords.filter(r => r.data.isBinome).length;
    const uniqueCompanies = new Set(filteredRecords.map(r => r.data.companyName)).size;

    // Filière Performance Analysis
    const filierePerformance = systemConfig.filieres.map(filiere => {
      const filiereRecords = filteredRecords.filter(r => r.data.filiere === filiere);
      const total = filiereRecords.length;
      const international = filiereRecords.filter(r => r.data.isInternational).length;
      const remunerated = filiereRecords.filter(r => r.data.isRemunere).length;
      const preEmbauche = filiereRecords.filter(r => r.data.isPreEmbauche).length;
      
      return {
        name: filiere,
        total,
        international,
        remunerated,
        preEmbauche,
      };
    }).filter(f => f.total > 0).sort((a, b) => b.total - a.total);

    // Find winners for Top Cards
    const winners = {
      international: [...filierePerformance].sort((a, b) => b.international - a.international)[0],
      remunerated: [...filierePerformance].sort((a, b) => b.remunerated - a.remunerated)[0],
      preEmbauche: [...filierePerformance].sort((a, b) => b.preEmbauche - a.preEmbauche)[0]
    };

    // ... existing top companies and bottlenecks logic ...
    const companyCounts: Record<string, number> = {};
    filteredRecords.forEach(r => {
      companyCounts[r.data.companyName] = (companyCounts[r.data.companyName] || 0) + 1;
    });
    const topCompanies = Object.entries(companyCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const bottlenecks = Object.values(WorkflowStatus)
      .filter(status => ![WorkflowStatus.COMPLETED, WorkflowStatus.REJECTED, WorkflowStatus.CANCELLED, WorkflowStatus.DRAFT].includes(status))
      .map(status => ({
        name: status,
        count: filteredRecords.filter(r => r.status === status).length
      }))
      .filter(b => b.count > 0)
      .sort((a, b) => b.count - a.count);

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
      const count = filteredRecords.filter(r => {
        const createdAt = new Date(r.history[0]?.updatedAt || 0).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
        return createdAt === dateStr;
      }).length;
      return { date: dateStr, count };
    }).reverse();

    return {
      totalConventions,
      completedConventions,
      pendingConventions,
      remunereCount,
      preEmbaucheCount,
      internationalCount,
      binomeCount,
      uniqueCompanies,
      last7Days,
      filierePerformance,
      topCompanies,
      bottlenecks,
      winners
    };
  }, [filteredRecords]);

  const chartTheme = {
    mode: 'light' as const,
    palette: 'palette1',
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] pt-4 md:pt-8 pb-48 md:pb-56 px-4 md:px-8 space-y-12 transition-all">
      <header className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                if (window.history.state && window.history.state.idx > 0) {
                  navigate(-1);
                } else {
                  navigate('/dashboard');
                }
              }}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-[10px] font-bold uppercase tracking-widest mr-4"
            >
              <ArrowLeft size={14} /> Retour
            </button>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Pilotage Analytique</h1>
              <p className="text-xs font-bold text-slate-500 tracking-[0.2em] uppercase mt-1">Données brutes pour l'administration</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
              <Filter size={14} className="text-slate-400" />
              <select 
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="bg-transparent text-[10px] font-bold uppercase tracking-widest outline-none border-none cursor-pointer"
              >
                <option value="all">Tous les Départements</option>
                {systemConfig.departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
              <Filter size={14} className="text-slate-400" />
              <select 
                value={selectedFiliere}
                onChange={(e) => setSelectedFiliere(e.target.value)}
                className="bg-transparent text-[10px] font-bold uppercase tracking-widest outline-none border-none cursor-pointer"
              >
                <option value="all">Toutes les Filières</option>
                {systemConfig.filieres.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            {(selectedDept !== 'all' || selectedFiliere !== 'all') && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => { setSelectedDept('all'); setSelectedFiliere('all'); }}
                className="text-rose-600 hover:bg-rose-50 rounded-xl flex items-center justify-center shrink-0"
                aria-label="Réinitialiser"
              >
                <X size={24} strokeWidth={2.5} className="mr-2 shrink-0" />
                Réinitialiser
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Top Insights Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-white border-l-4 border-l-blue-500 shadow-sm rounded-2xl flex flex-col justify-between h-full">
           <div className="space-y-1">
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
               <Globe size={10} className="text-blue-500" /> Leader International
             </p>
             <h4 className="text-sm font-black text-slate-900 leading-tight uppercase truncate">{stats.winners.international?.name || '---'}</h4>
           </div>
           <div className="mt-4 flex items-end justify-between">
             <span className="text-3xl font-black text-blue-600 tabular-nums">{stats.winners.international?.international || 0}</span>
             <span className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest leading-none">Stages (Mobilité)</span>
           </div>
        </Card>
        
        <Card className="p-6 bg-white border-l-4 border-l-emerald-500 shadow-sm rounded-2xl flex flex-col justify-between h-full">
           <div className="space-y-1">
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
               <DollarSign size={10} className="text-emerald-500" /> Leader Rémunéré
             </p>
             <h4 className="text-sm font-black text-slate-900 leading-tight uppercase truncate">{stats.winners.remunerated?.name || '---'}</h4>
           </div>
           <div className="mt-4 flex items-end justify-between">
             <span className="text-3xl font-black text-emerald-600 tabular-nums">{stats.winners.remunerated?.remunerated || 0}</span>
             <span className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest leading-none">Stages payés</span>
           </div>
        </Card>

        <Card className="p-6 bg-white border-l-4 border-l-rose-500 shadow-sm rounded-2xl flex flex-col justify-between h-full">
           <div className="space-y-1">
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
               <Briefcase size={10} className="text-rose-500" /> Leader Embauche
             </p>
             <h4 className="text-sm font-black text-slate-900 leading-tight uppercase truncate">{stats.winners.preEmbauche?.name || '---'}</h4>
           </div>
           <div className="mt-4 flex items-end justify-between">
             <span className="text-3xl font-black text-rose-600 tabular-nums">{stats.winners.preEmbauche?.preEmbauche || 0}</span>
             <span className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest leading-none">Pré-embauches</span>
           </div>
        </Card>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Volume Total" 
          value={stats.totalConventions} 
          icon={<FileText className="text-indigo-600" />} 
          trend="Conventions actives" 
        />
        <StatCard 
          title="Filières" 
          value={stats.filierePerformance.length} 
          icon={<Users className="text-indigo-600" />} 
          trend="En activité" 
        />
        <StatCard 
          title="Collaboration" 
          value={stats.binomeCount} 
          icon={<Users2 className="text-blue-600" />} 
          trend="Projets en binôme" 
        />
        <StatCard 
          title="Réseau" 
          value={stats.uniqueCompanies} 
          icon={<Building2 className="text-amber-600" />} 
          trend="Entreprises d'accueil" 
        />
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Analytics Table - Detailed Filiere Performance */}
        <Card className="p-8 bg-white border-slate-200 lg:col-span-2 space-y-8 shadow-sm rounded-3xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 flex items-center gap-2">
                <BarChart2 size={16} className="text-indigo-600" /> 
                Performance Détaillée par Filière
              </h3>
              <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wider">Indicateurs de succès et attractivité par formation</p>
            </div>
          </div>
          
          <div className="overflow-x-auto -mx-8 px-8">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-100 italic">
                  <th className="text-left py-4 text-[10px] uppercase tracking-widest text-slate-400 font-bold">Filière</th>
                  <th className="text-center py-4 text-[10px] uppercase tracking-widest text-slate-400 font-bold px-4">Total</th>
                  <th className="text-center py-4 text-[10px] uppercase tracking-widest text-blue-500 font-bold px-4">Inter.</th>
                  <th className="text-center py-4 text-[10px] uppercase tracking-widest text-emerald-500 font-bold px-4">Rémun.</th>
                  <th className="text-center py-4 text-[10px] uppercase tracking-widest text-rose-500 font-bold px-4">Embauche</th>
                  <th className="text-right py-4 text-[10px] uppercase tracking-widest text-slate-400 font-bold">Progression</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {stats.filierePerformance.map((f) => (
                  <tr key={f.name} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="py-4">
                      <div className="text-xs font-black text-slate-900 uppercase">{f.name}</div>
                    </td>
                    <td className="py-4 text-center">
                      <span className="text-sm font-mono font-bold text-slate-900">{f.total}</span>
                    </td>
                    <td className="py-4 text-center">
                      <span className="text-sm font-mono font-bold text-blue-600">{f.international}</span>
                    </td>
                    <td className="py-4 text-center">
                      <span className="text-sm font-mono font-bold text-emerald-600">{f.remunerated}</span>
                    </td>
                    <td className="py-4 text-center">
                      <span className="text-sm font-mono font-bold text-rose-600">{f.preEmbauche}</span>
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-indigo-500 h-full rounded-full transition-all duration-1000" 
                            style={{ width: `${(f.total / stats.filierePerformance[0].total) * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">{Math.round((f.total / stats.totalConventions) * 100)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Global Distribution - Donut Chart */}
        <Card className="p-8 bg-white border-slate-200 space-y-8 shadow-sm rounded-3xl">
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900">Distribution par Caractère</h3>
            <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wider">Répartition des types de stages</p>
          </div>
          
          <div className="h-[300px]">
            <Chart
              options={{
                chart: { type: 'donut' },
                labels: ['Standard', 'International', 'Rémunéré', 'Pré-embauche'],
                colors: ['#e2e8f0', '#3b82f6', '#10b981', '#f43f5e'],
                plotOptions: {
                  pie: {
                    donut: {
                      size: '75%',
                      labels: {
                        show: true,
                        total: {
                          show: true,
                          label: 'TOTAL',
                          formatter: () => stats.totalConventions.toString(),
                          fontSize: '12px',
                          fontWeight: 900
                        }
                      }
                    }
                  }
                },
                dataLabels: { enabled: false },
                legend: { position: 'bottom', fontSize: '10px', fontWeight: 700, fontFamily: 'monospace' },
                theme: chartTheme
              }}
              series={[
                stats.totalConventions - (stats.internationalCount + stats.remunereCount + stats.preEmbaucheCount),
                stats.internationalCount,
                stats.remunereCount,
                stats.preEmbaucheCount
              ]}
              type="donut"
              height="100%"
            />
          </div>
        </Card>

        {/* Top Partners Table Style */}
        <Card className="p-8 bg-white border-slate-200 space-y-8 shadow-sm rounded-3xl">
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900">Top Partenaires</h3>
            <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wider">Volume d'accueil par entreprise</p>
          </div>
          
          <div className="space-y-4">
            {stats.topCompanies.map((company, index) => (
              <div key={company.name} className="group flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-slate-950 text-white flex items-center justify-center font-black text-[10px] shadow-lg shadow-slate-900/10">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black text-slate-900 uppercase truncate">{company.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 bg-slate-100 h-1 rounded-full overflow-hidden">
                      <div 
                        className="bg-slate-900 h-full rounded-full transition-all duration-1000" 
                        style={{ width: `${(company.count / stats.topCompanies[0].count) * 100}%` }}
                      />
                    </div>
                    <span className="text-[9px] font-mono text-slate-400">{company.count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Workflow Bottlenecks */}
        <Card className="p-8 bg-white border-slate-200 space-y-8 shadow-sm rounded-3xl">
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900">Goulots d'Étranglement</h3>
            <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wider">Analyse des flux de validation</p>
          </div>
          
          <div className="h-[250px]">
            <Chart
              options={{
                chart: { type: 'bar', toolbar: { show: false } },
                plotOptions: { 
                  bar: { 
                    horizontal: true, 
                    borderRadius: 4, 
                    barHeight: '30%',
                    distributed: true
                  } 
                },
                dataLabels: { enabled: true, style: { fontSize: '10px', fontWeight: 700, fontFamily: 'monospace' } },
                xaxis: { 
                  categories: stats.bottlenecks.map(b => b.name.substring(0, 15) + '...'), 
                  labels: { style: { fontSize: '9px', fontWeight: 600, fontFamily: 'monospace' } } 
                },
                colors: ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'],
                tooltip: { theme: 'light' },
                theme: chartTheme,
                legend: { show: false }
              }}
              series={[{ name: 'Dossiers', data: stats.bottlenecks.map(b => b.count) }]}
              type="bar"
              height="100%"
            />
          </div>
        </Card>

        {/* Submission Flow */}
        <Card className="p-8 bg-white border-slate-200 space-y-8 shadow-sm rounded-3xl">
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900">Activité Temporelle</h3>
            <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wider">Soumissions des 7 derniers jours</p>
          </div>
          
          <div className="h-[250px]">
            <Chart
              options={{
                chart: { type: 'line', toolbar: { show: false } },
                stroke: { curve: 'straight', width: 2 },
                xaxis: { 
                  categories: stats.last7Days.map(d => d.date), 
                  labels: { style: { fontSize: '9px', fontWeight: 600, fontFamily: 'monospace' } } 
                },
                yaxis: { show: false },
                markers: { size: 4, strokeWidth: 2, hover: { size: 6 } },
                colors: ['#0f172a'],
                dataLabels: { enabled: false },
                tooltip: { theme: 'light', x: { show: true } },
                theme: chartTheme
              }}
              series={[{ name: 'Dossiers', data: stats.last7Days.map(d => d.count) }]}
              type="line"
              height="100%"
            />
          </div>
        </Card>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, trend }: { title: string, value: string | number, icon: React.ReactNode, trend: string }) => (
  <Card className="p-8 bg-white border-slate-200 flex items-start justify-between group hover:border-indigo-500/50 transition-all hover:shadow-xl hover:shadow-indigo-500/5 rounded-[2rem] shadow-sm">
    <div className="space-y-6 w-full">
      <div className="bg-slate-50 w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm border border-slate-100">
        {icon}
      </div>
      <div className="space-y-2">
        <p className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em]">{title}</p>
        <h4 className="text-4xl font-black text-slate-900 tracking-tighter">{value}</h4>
      </div>
      <div className="pt-4 border-t border-slate-100">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{trend}</p>
      </div>
    </div>
  </Card>
);
