import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Activity, FileText, Database, 
  Search, Layout, Layers, FileCheck, Trash2, ArrowRight,
  Shield, Clock, CheckCircle2, ChevronRight, AlertCircle,
  Zap, PieChart as PieChartIcon
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip 
} from 'recharts';
import { useAppContext } from '../../context/AppContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ConfirmModal } from '../../components/shared/ConfirmModal';
import { WorkflowStatus, Role } from '../../types';

export const SuperAdminDashboardView = () => {
  const { resetDatabase, records, users, currentUser } = useAppContext();
  const navigate = useNavigate();
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const stats = useMemo(() => ({
    totalConventions: records.length,
    totalUsers: users.length,
    students: users.filter(u => u.roles?.includes(Role.STUDENT)).length,
    staff: users.filter(u => !u.roles?.includes(Role.STUDENT)).length,
    pendingValidation: records.filter(r => 
      r.status !== WorkflowStatus.COMPLETED && 
      r.status !== WorkflowStatus.REJECTED && 
      r.status !== WorkflowStatus.CANCELLED
    ).length,
    completedToday: records.filter(r => 
      r.status === WorkflowStatus.COMPLETED && 
      new Date(r.history[r.history.length - 1]?.updatedAt || 0).toDateString() === new Date().toDateString()
    ).length
  }), [records, users]);

  const deptDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    records.forEach(r => {
      const dept = r.data.department || 'Inconnu';
      counts[dept] = (counts[dept] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [records]);

  const pendingRecords = useMemo(() => {
    return records
      .filter(r => r.status !== WorkflowStatus.COMPLETED && r.status !== WorkflowStatus.REJECTED && r.status !== WorkflowStatus.CANCELLED)
      .sort((a, b) => (b.history[b.history.length - 1]?.updatedAt || 0) - (a.history[a.history.length - 1]?.updatedAt || 0))
      .slice(0, 5);
  }, [records]);

  const menuItems: { title: string; description: string; icon: any; path: string; color: string; onClick?: () => void }[] = [
    {
      title: "Gestion des Conventions",
      description: "Contrôle total sur les dossiers: modification forcée et suppression.",
      icon: <FileText className="text-rose-600" />,
      path: "/superadmin/conventions",
      color: "bg-rose-50"
    },
    {
      title: "Gestion des Utilisateurs",
      description: "Gérer les comptes, rôles et permissions du système.",
      icon: <Users className="text-blue-600" />,
      path: "/superadmin/users",
      color: "bg-blue-50"
    },
    {
      title: "Configuration Système",
      description: "Modifier les départements, filières, semestres et années académiques.",
      icon: <Database className="text-cyan-600" />,
      path: "/superadmin/config",
      color: "bg-cyan-50"
    },
    {
      title: "Contrôle d'Éligibilité",
      description: "Définir les critères PFE/PFA et autoriser manuellement des étudiants.",
      icon: <Shield className="text-indigo-600" />,
      path: "/superadmin/eligibility",
      color: "bg-indigo-50"
    },
    {
      title: "Analytiques Avancées",
      description: "Statistiques détaillées sur les stages et conventions.",
      icon: <Activity className="text-emerald-600" />,
      path: "/superadmin/analytics",
      color: "bg-emerald-50"
    },
    {
      title: "Modèle de Convention",
      description: "Modifier le template PDF et les articles réglementaires.",
      icon: <FileText className="text-amber-600" />,
      path: "/superadmin/template",
      color: "bg-amber-100"
    },
    {
      title: "Gestion des Documents",
      description: "Consulter et modifier les documents des conventions.",
      icon: <FileCheck className="text-purple-600" />,
      path: "/documents",
      color: "bg-purple-50"
    },
    {
      title: "Traitement en Masse",
      description: "Signatures et validations groupées par département.",
      icon: <Layers className="text-indigo-600" />,
      path: "/bulk-processing",
      color: "bg-indigo-50"
    },
    {
      title: "Recherche & Historique",
      description: "Rechercher des conventions par Massar ou Nom.",
      icon: <Search className="text-muted-foreground" />,
      path: "/search",
      color: "bg-muted/30"
    }
  ];

  return (
    <div className="container mx-auto px-6 pt-12 pb-48 md:pb-56 max-w-7xl space-y-12 text-left animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Shield className="text-primary" size={20} />
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Administration Suprême</p>
          </div>
          <h2 className="text-4xl md:text-5xl text-foreground tracking-tighter uppercase font-medium">Super Admin Dashboard</h2>
          <p className="text-muted-foreground max-w-2xl">Bienvenue, {currentUser?.name}. Gérez l'ensemble de la plateforme, les utilisateurs et les configurations système depuis cet espace centralisé.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Button 
            onClick={() => navigate('/requests')} 
            variant="outline"
            className="flex-1 md:flex-none py-4 px-8 rounded-2xl uppercase text-[10px] tracking-widest font-bold border-2 border-border hover:border-primary"
          >
            <FileText size={16} className="mr-2" /> Mes Dossiers
          </Button>
        </div>
      </header>

      <ConfirmModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={() => {
          resetDatabase();
          setIsResetModalOpen(false);
        }}
        title="Réinitialisation du Système"
        message="Êtes-vous sûr de vouloir réinitialiser tout le système ? Toutes les données seront effacées et le système reviendra à son état initial."
        confirmText="Réinitialiser"
        variant="danger"
      />

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Conventions" value={stats.totalConventions} icon={<FileText className="text-blue-600" />} />
        <StatCard label="Utilisateurs" value={stats.totalUsers} icon={<Users className="text-emerald-600" />} subValue={`${stats.students} Étudiants, ${stats.staff} Staff`} />
        <StatCard label="En Attente" value={stats.pendingValidation} icon={<Clock className="text-amber-500" />} />
        <StatCard label="Terminées (Aujourd'hui)" value={stats.completedToday} icon={<CheckCircle2 className="text-indigo-600" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Navigation Grid */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-foreground uppercase tracking-tight">Outils d'Administration</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {menuItems.map((item) => (
              <Card 
                key={item.title}
                onClick={() => item.onClick ? item.onClick() : navigate(item.path!)}
                className="p-6 bg-card border-border hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group rounded-3xl"
              >
                <div className="flex items-start gap-4">
                  <div className={`p-4 rounded-2xl ${item.color} group-hover:scale-110 transition-transform`}>
                    {React.cloneElement(item.icon as React.ReactElement, { size: 24 })}
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-foreground uppercase tracking-tight flex items-center gap-2">
                      {item.title}
                      <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Mini Analytics for SuperAdmin */}
        {deptDistribution.length > 0 && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-foreground uppercase tracking-tight">Répartition</h3>
            </div>
            <Card className="p-6 bg-card border-border rounded-3xl shadow-sm space-y-6">
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deptDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {deptDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['var(--primary)', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--card)', color: 'var(--foreground)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Top Départements</p>
                {deptDistribution.sort((a, b) => b.value - a.value).slice(0, 5).map((s, i) => (
                  <div key={s.name} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['var(--primary)', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][i % 5] }} />
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-tight">{s.name}</span>
                    </div>
                    <span className="text-xs font-bold text-foreground">{s.value}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6 bg-primary text-primary-foreground rounded-3xl shadow-xl space-y-4 overflow-hidden relative">
              <div className="relative z-10 space-y-2">
                <h4 className="text-lg font-bold uppercase tracking-tight">Status Système</h4>
                <p className="text-xs opacity-80 leading-relaxed">Tous les services sont opérationnels. La base de données contient {records.length} dossiers actifs.</p>
                <div className="pt-4">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest bg-white/20 w-fit px-3 py-1 rounded-full">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    Live
                  </div>
                </div>
              </div>
              <AlertCircle className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10 rotate-12" />
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon, subValue }: any) => (
  <Card className="p-6 bg-card border-border shadow-sm rounded-3xl space-y-4 group hover:shadow-md transition-all">
    <div className="flex justify-between items-start">
      <div className="p-3 bg-muted rounded-2xl group-hover:scale-110 transition-transform">
        {icon}
      </div>
    </div>
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-3xl font-medium text-foreground tracking-tighter">{value}</p>
      {subValue && <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest">{subValue}</p>}
    </div>
  </Card>
);
