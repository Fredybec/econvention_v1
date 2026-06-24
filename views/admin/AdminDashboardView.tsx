import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, Download, FileText, CheckCircle2, 
  Clock, AlertCircle, ChevronRight, BarChart3, 
  Users, Layers, ArrowUpRight, ArrowDownRight,
  Play, Trash2, QrCode, Layout, Shield, Zap,
  Bell, Activity, MessageSquare, Plus, Calendar
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { useAppContext } from '../../context/AppContext';
import { WorkflowStatus, Role, PFERecord } from '../../types';
import { canApprove } from '../../utils/workflow';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useNavigate } from 'react-router-dom';
import { ReviewerMode } from './ReviewerMode';
import { BulkProcessingPanel } from '../../components/admin/BulkProcessingPanel';

export const AdminDashboardView = () => {
  const { records, currentUser, users, activeRole, setActiveRole, notifications } = useAppContext();
  const navigate = useNavigate();
  
  // Role switching logic
  const adminRoles = useMemo(() => {
    const roles = currentUser?.roles?.filter(r => r !== Role.STUDENT) || [];
    return roles;
  }, [currentUser]);

  const [searchTerm, setSearchTerm] = useState('');
  
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [statusFilter, setStatusFilter] = useState<WorkflowStatus | 'ALL'>('ALL');
  const [deptFilter, setDeptFilter] = useState<string | 'ALL'>('ALL');
  const [filiereFilter, setFiliereFilter] = useState<string | 'ALL'>('ALL');
  const [levelFilter, setLevelFilter] = useState<string | 'ALL'>('ALL');

  const isEncadrantView = activeRole === Role.ENCADRANT_FST;
  const isRespoView = activeRole === Role.CHEF_DEPARTEMENT;
  
  const isStaff = currentUser?.roles?.some(r => [
    Role.CHEF_DEPARTEMENT, 
    Role.SCOLARITE, 
    Role.SERVICE_RECHERCHE_COOP, 
    Role.SECRETARIAT_DOYEN, 
    Role.VICE_DOYEN_RECHERCHE, 
    Role.VICE_DOYEN_PEDAGOGIE,
    Role.SUPERADMIN,
    Role.SUPPORT,
    Role.ENCADRANT_FST
  ].includes(r));

  // Filter records based on active role view and dropdown filters (this retains all statuses for stats calculations)
  const roleScopedRecords = useMemo(() => {
    let result = records;

    const centralRoles = [
      Role.SUPERADMIN, 
      Role.SUPPORT, 
      Role.SCOLARITE, 
      Role.SERVICE_RECHERCHE_COOP, 
      Role.SECRETARIAT_DOYEN, 
      Role.VICE_DOYEN_RECHERCHE, 
      Role.VICE_DOYEN_PEDAGOGIE
    ];

    if (activeRole && centralRoles.includes(activeRole as Role)) {
      // Central roles see everything
    } else {
      if (activeRole === Role.ENCADRANT_FST) {
        result = result.filter(r => r.data.fstTutorEmail?.toLowerCase() === currentUser?.email?.toLowerCase());
      } else if (activeRole === Role.CHEF_DEPARTEMENT) {
        // For department-specific roles, filter by department if the user has one
        if (currentUser?.department && !['Administration', 'Direction', 'Scolarité', 'Service Stage'].includes(currentUser.department)) {
          result = result.filter(r => r.data.department?.toLowerCase() === currentUser.department?.toLowerCase());
        }
      }
    }

    // Search and filters
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      result = result.filter(r => 
        r.studentName.toLowerCase().includes(s) || 
        r.id.toLowerCase() === s ||
        r.data.companyName.toLowerCase().includes(s)
      );
    }

    if (deptFilter !== 'ALL') {
      result = result.filter(r => r.data.department === deptFilter);
    }

    if (filiereFilter !== 'ALL') {
      result = result.filter(r => r.data.filiere === filiereFilter);
    }

    if (levelFilter !== 'ALL') {
      result = result.filter(r => r.data.currentLevel === levelFilter);
    }

    return result;
  }, [records, currentUser, activeRole, searchTerm, deptFilter, filiereFilter, levelFilter]);

  // Only show records that currently need this user's validation (Pending/In-progress), unless a specific status filter is active
  const filteredRecords = useMemo(() => {
    let result = roleScopedRecords;

    if (statusFilter !== 'ALL') {
      result = result.filter(r => r.status === statusFilter);
    } else {
      result = result.filter(r => {
        // Exclusive assignment logic: if assigned to someone else with the same role, hide it
        if (r.assignedTo && r.assignedTo.length > 0 && !r.assignedTo.includes(currentUser?.id || '')) {
          const assignedUsers = users.filter(u => r.assignedTo?.includes(u.id));
          const hasSameRoleAssigned = assignedUsers.some(u => u.roles.includes(activeRole as Role));
          if (hasSameRoleAssigned) return false;
        }

        const lastStatus = r.history.slice().reverse().find(h => h.status !== WorkflowStatus.COMPLEMENT_REQUIRED)?.status;
        const canApproveRecord = canApprove(r.status, activeRole ? [activeRole] : (currentUser?.roles || []), currentUser?.department, r.data.department, lastStatus, undefined, undefined, r.data.stageType, r.data.nature);
        
        // Encadrant FST should see their records in Pending tab even if they can't approve
        const isEncadrantRole = activeRole === Role.ENCADRANT_FST;
        const isTutor = r.data.fstTutorEmail?.toLowerCase() === currentUser?.email?.toLowerCase();
        
        // Hide completed/cancelled from dashboard needing-attention list
        const isClosed = r.status === WorkflowStatus.COMPLETED || r.status === WorkflowStatus.CANCELLED || r.status === WorkflowStatus.REJECTED;

        return !isClosed && (canApproveRecord || (isEncadrantRole && isTutor));
      });
    }

    return result;
  }, [roleScopedRecords, currentUser, activeRole, statusFilter, users]);

  const stats = useMemo(() => {
    const total = roleScopedRecords.length;
    const pending = roleScopedRecords.filter(r => r.status !== WorkflowStatus.COMPLETED && r.status !== WorkflowStatus.CANCELLED && r.status !== WorkflowStatus.REJECTED).length;
    const completed = roleScopedRecords.filter(r => r.status === WorkflowStatus.COMPLETED).length;
    const cancelled = roleScopedRecords.filter(r => r.status === WorkflowStatus.CANCELLED || r.status === WorkflowStatus.REJECTED).length;
    
    return { total, pending, completed, cancelled };
  }, [roleScopedRecords]);

  const pendingAttentionCount = useMemo(() => {
    return roleScopedRecords.filter(r => {
      // For ENCADRANT_FST, check for unread notifications on DRAFT records
      if (activeRole === Role.ENCADRANT_FST) {
        if (r.status !== WorkflowStatus.DRAFT) return false;
        const hasUnreadNotif = (notifications || []).some(n => 
          !n.isRead && 
          n.userId === currentUser?.id && 
          n.recordId === r.id && 
          n.role === Role.ENCADRANT_FST
        );
        return hasUnreadNotif;
      }

      // For other roles, use canApprove
      const lastStatus = r.history?.slice().reverse().find(h => h.status !== WorkflowStatus.COMPLEMENT_REQUIRED)?.status;
      return canApprove(
        r.status, 
        activeRole ? [activeRole] : (currentUser?.roles || []), 
        currentUser?.department, 
        r.data.department, 
        lastStatus, 
        undefined, 
        undefined, 
        r.data.stageType, 
        r.data.nature
      );
    }).length;
  }, [roleScopedRecords, activeRole, currentUser, notifications]);

  const departments = useMemo(() => {
    const depts = new Set(records.map(r => r.data.department));
    return Array.from(depts);
  }, [records]);

  const menuItems = useMemo(() => {
    const items: any[] = [];

    if (activeRole === Role.ENCADRANT_FST) {
      items.push(
        {
          title: "Suivi de mes Étudiants",
          description: "Consulter l'état d'avancement des dossiers de vos étudiants.",
          icon: <Users className="text-emerald-600" />,
          path: "/my-students",
          color: "bg-emerald-500/10"
        },
        {
          title: "Analytiques Étudiants",
          description: "Statistiques sur les stages, entreprises et soumissions.",
          icon: <BarChart3 className="text-primary" />,
          path: "/encadrant-analytics",
          color: "bg-primary/10"
        },
        {
          title: "Recherche Globale",
          description: "Rechercher des conventions par Massar ou Nom.",
          icon: <Search className="text-muted-foreground" />,
          path: "/search",
          color: "bg-secondary"
        }
      );
    } else if (activeRole === Role.SUPPORT) {
      items.push(
        {
          title: "Questions Support",
          description: "Répondre aux questions des étudiants et du personnel.",
          icon: <MessageSquare className="text-primary" />,
          path: "/support-questions",
          color: "bg-primary/10"
        },
        {
          title: "Recherche Globale",
          description: "Consulter les dossiers (Lecture seule).",
          icon: <Search className="text-muted-foreground" />,
          path: "/search",
          color: "bg-secondary"
        }
      );
    } else {
      // Admin roles (Responsable, Scolarité, etc.)
      items.push(
        {
          title: "Recherche Globale",
          description: "Rechercher des conventions par Massar ou Nom.",
          icon: <Search className="text-muted-foreground" />,
          path: "/search",
          color: "bg-secondary"
        },
        {
          title: "Gestion des Documents",
          description: "Consulter et modifier les documents des conventions.",
          icon: <FileText className="text-purple-600" />,
          path: "/documents",
          color: "bg-purple-500/10",
          hidden: activeRole !== Role.SUPERADMIN
        },
        {
          title: "Traitement en Masse",
          description: "Signatures et validations groupées par département.",
          icon: <Layers className="text-indigo-600" />,
          path: "/bulk-processing",
          color: "bg-indigo-500/10",
          hidden: activeRole === Role.CHEF_DEPARTEMENT && !currentUser?.roles?.includes(Role.SUPERADMIN)
        },
        {
          title: "Mode Revue Rapide",
          description: "Passer en revue les dossiers en attente un par un.",
          icon: <Play className="text-primary" />,
          onClick: () => setIsReviewMode(true),
          color: "bg-primary/10"
        },
        {
          title: "Analytiques Avancées",
          description: "Statistiques détaillées sur les stages et conventions.",
          icon: <Activity className="text-emerald-600" />,
          path: "/analytics",
          color: "bg-emerald-500/10"
        }
      );
    }

    // Filter duplicates by title
    return items.filter((item, index, self) => 
      index === self.findIndex((t) => t.title === item.title)
    );
  }, [activeRole, currentUser, setIsReviewMode]);

  if (isReviewMode) {
    const reviewableRecords = filteredRecords.filter(r => r.status !== WorkflowStatus.COMPLETED && r.status !== WorkflowStatus.CANCELLED);
    return <ReviewerMode records={reviewableRecords} onExit={() => setIsReviewMode(false)} />;
  }

  return (
    <div className="container mx-auto px-4 md:px-6 pt-8 md:pt-12 pb-48 md:pb-64 max-w-7xl space-y-8 md:space-y-12 text-left animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="text-primary" size={20} />
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Espace Administratif</p>
          </div>
          <h2 className="text-3xl md:text-5xl text-foreground tracking-tighter uppercase font-medium">Tableau de Bord</h2>
          
          {adminRoles.length > 1 && (
            <div className="flex gap-2 p-1 bg-secondary rounded-xl w-fit">
              {adminRoles.map(role => (
                <button
                  key={role}
                  onClick={() => setActiveRole(role)}
                  className={`px-4 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${activeRole === role ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {role === Role.ENCADRANT_FST ? 'Encadrant' : role === Role.CHEF_DEPARTEMENT ? 'Chef Dept' : role}
                </button>
              ))}
            </div>
          )}
          
          <p className="text-muted-foreground max-w-2xl text-sm md:text-base">
            Bienvenue, {currentUser?.name}. 
            {activeRole === Role.ENCADRANT_FST 
              ? " Suivez l'avancement des stages de vos étudiants." 
              : " Gérez les validations et le suivi des conventions de votre département."}
          </p>
        </div>

        <div className="flex flex-col items-end gap-4 w-full md:w-auto">
          {isStaff && (
            <div className="flex gap-3 w-full md:w-auto">
              <Button onClick={() => navigate('/requests')} variant="outline" className="flex-1 md:flex-none py-3 md:py-4 px-6 md:px-8 rounded-xl md:rounded-2xl uppercase text-[10px] tracking-widest font-bold border-2 border-border hover:border-primary">
                <FileText size={16} className="mr-2" /> Mes Dossiers
              </Button>
            </div>
          )}
        </div>
      </header>

      {isStaff && pendingAttentionCount > 0 && (activeRole === Role.ENCADRANT_FST || activeRole === Role.CHEF_DEPARTEMENT) && (
        <div className="mb-8 p-6 md:p-8 bg-amber-50 border-2 border-amber-100 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8 animate-in slide-in-from-top-4 duration-500 shadow-lg shadow-amber-500/5">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 md:w-16 md:h-16 bg-amber-500 text-white rounded-2xl md:rounded-3xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Zap size={32} className="fill-current animate-pulse" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xl md:text-2xl font-black text-amber-900 uppercase tracking-tighter">Travail en attente</h4>
              <p className="text-sm text-amber-700/80 font-medium max-w-md">
                Vous avez <span className="font-bold underline">{pendingAttentionCount} dossier(s)</span> qui nécessite(nt) votre attention immédiate pour ne pas bloquer les étudiants.
              </p>
            </div>
          </div>
          <Button 
            onClick={() => {
              if (activeRole === Role.ENCADRANT_FST) {
                navigate('/my-students');
              } else if (activeRole === Role.SECRETARIAT_DOYEN || activeRole === Role.VICE_DOYEN_PEDAGOGIE || activeRole === Role.VICE_DOYEN_RECHERCHE) {
                navigate('/bulk-processing');
              } else {
                setIsReviewMode(true);
              }
            }}
            className="w-full md:w-auto py-5 md:py-6 px-10 bg-amber-900 hover:bg-amber-950 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl transition-all"
          >
            Commencer maintenant <ChevronRight size={18} className="ml-2" />
          </Button>
        </div>
      )}

      {/* Stats Overview */}
      {isStaff && activeRole !== Role.SUPPORT && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <StatCard label="Total Demandes" value={stats.total} icon={<Layers className="text-primary" />} trend={stats.total > 0 ? "+12%" : null} trendUp={true} />
          <StatCard label="En Cours" value={stats.pending} icon={<Clock className="text-amber-600" />} trend={stats.pending > 0 ? `${stats.pending} active` : null} trendUp={true} />
          <StatCard label="Validées" value={stats.completed} icon={<CheckCircle2 className="text-emerald-600" />} trend={stats.completed > 0 ? "+5%" : null} trendUp={true} />
          <StatCard label="Annulées" value={stats.cancelled} icon={<AlertCircle className="text-rose-600" />} trend={stats.cancelled > 0 ? "-2%" : null} trendUp={false} />
        </div>
      )}

      {/* Pending Actions Summary for Staff */}
      {isStaff && activeRole !== Role.SUPPORT && pendingAttentionCount > 0 && (
        <Card className="p-0 bg-card border-0 shadow-2xl rounded-[2rem] md:rounded-[3rem] overflow-hidden relative group">
          <div className="flex flex-col lg:flex-row">
            <div className="lg:w-2/3 p-6 md:p-12 space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full">
                <Zap size={16} className="fill-current animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest">Action Prioritaire</span>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-3xl md:text-5xl font-black text-foreground uppercase tracking-tighter leading-[0.9]">
                  {pendingAttentionCount} Dossiers <br /> 
                  <span className="text-primary">En attente</span>
                </h3>
                <p className="text-muted-foreground text-base md:text-lg max-w-xl leading-relaxed">
                  Votre validation est l'étape critique pour permettre à ces étudiants de débuter leur stage. 
                  Prenez un moment pour passer en revue les demandes soumises.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 md:gap-4 pt-4">
                <Button 
                  onClick={() => navigate('/requests')}
                  className="w-full sm:w-auto py-4 md:py-6 px-6 md:px-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl transition-all flex items-center justify-center gap-3"
                >
                  <FileText size={18} /> Consulter les Dossiers <ChevronRight size={18} />
                </Button>
                {(currentUser?.roles?.includes(Role.SECRETARIAT_DOYEN) || 
                  currentUser?.roles?.includes(Role.SERVICE_RECHERCHE_COOP) ||
                  currentUser?.roles?.includes(Role.SCOLARITE) ||
                  currentUser?.roles?.includes(Role.VICE_DOYEN_RECHERCHE) ||
                  currentUser?.roles?.includes(Role.VICE_DOYEN_PEDAGOGIE)) && (
                  <Button 
                    variant="outline"
                    onClick={() => navigate('/bulk-processing')}
                    className="w-full sm:w-auto py-4 md:py-6 px-6 md:px-10 border-2 border-indigo-500/20 text-indigo-600 hover:border-indigo-600 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3"
                  >
                    <QrCode size={18} /> Traitement en Masse <ChevronRight size={18} />
                  </Button>
                )}
                <Button 
                  variant="outline"
                  onClick={() => setIsReviewMode(true)}
                  className="w-full sm:w-auto py-4 md:py-6 px-6 md:px-10 border-2 border-border hover:border-primary rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3"
                >
                  <Zap size={18} /> Mode Revue Rapide
                </Button>
              </div>
            </div>
            
            <div className="lg:w-1/3 bg-secondary/50 p-8 md:p-12 flex flex-col justify-center items-center text-center space-y-6 border-t lg:border-t-0 lg:border-l border-border">
              <div className="relative">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-8 border-primary/10 flex items-center justify-center">
                  <span className="text-4xl md:text-5xl font-black text-primary">{pendingAttentionCount}</span>
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 md:w-10 md:h-10 bg-amber-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                  <Bell size={18} className="text-white" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Charge de travail</p>
                <p className="text-sm font-bold text-foreground">
                  {pendingAttentionCount > 10 ? 'Volume Élevé' : 'Volume Modéré'}
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
        {/* Navigation Grid */}
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-lg md:text-xl font-bold text-foreground uppercase tracking-tight">Outils de Gestion</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {menuItems.filter(item => !item.hidden).map((item) => (
              <Card 
                key={item.title}
                onClick={() => item.onClick ? item.onClick() : navigate(item.path!)}
                className="p-5 md:p-6 bg-card border-border hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group rounded-2xl md:rounded-3xl"
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 md:p-4 rounded-xl md:rounded-2xl ${item.color} group-hover:scale-110 transition-transform`}>
                    {React.cloneElement(item.icon as React.ReactElement, { size: 24 })}
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-foreground uppercase tracking-tight flex items-center gap-2">
                      {item.title}
                      <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Analytics Mini View */}
        {isStaff && activeRole !== Role.ENCADRANT_FST && filteredRecords.length > 0 && (
          <div className="space-y-6 md:space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-lg md:text-xl font-bold text-foreground uppercase tracking-tight">Répartition</h3>
            </div>
            <Card className="p-5 md:p-6 bg-card border-border rounded-2xl md:rounded-3xl shadow-sm">
              <div className="h-[200px] md:h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={Object.entries(filteredRecords.reduce((acc, r) => {
                    const dept = r.data.department || 'Inconnu';
                    acc[dept] = (acc[dept] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)).map(([name, value]) => ({ name, value }))}>
                    <XAxis dataKey="name" hide />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--card)', color: 'var(--foreground)' }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {Object.entries(filteredRecords.reduce((acc, r) => {
                        const dept = r.data.department || 'Inconnu';
                        acc[dept] = (acc[dept] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>)).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['var(--primary)', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Top Départements</p>
                {Object.entries(filteredRecords.reduce((acc, r) => {
                  const dept = r.data.department || 'Inconnu';
                  acc[dept] = (acc[dept] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>))
                  .sort((a, b) => (b[1] as number) - (a[1] as number))
                  .slice(0, 3)
                  .map(([name, value]) => (
                    <div key={name} className="flex justify-between items-center">
                      <span className="text-xs font-medium text-muted-foreground">{name}</span>
                      <span className="text-xs font-bold text-foreground">{value}</span>
                    </div>
                  ))
                }
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon, trend, trendUp }: any) => (
  <Card className="p-5 md:p-6 bg-card border-border shadow-xl rounded-2xl md:rounded-[2rem] space-y-4 group hover:-translate-y-1 transition-all duration-300">
    <div className="flex justify-between items-start">
      <div className="p-3 bg-secondary rounded-xl md:rounded-2xl group-hover:scale-110 transition-transform text-primary">
        {icon}
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-[10px] font-bold ${trendUp ? 'text-emerald-600' : 'text-rose-600'}`}>
          {trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />} {trend}
        </div>
      )}
    </div>
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-2xl md:text-3xl font-medium text-foreground tracking-tighter">{value}</p>
    </div>
  </Card>
);
