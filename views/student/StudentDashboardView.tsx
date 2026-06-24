import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Layout, FileText, ChevronRight, Bell, Info, Clock, CheckCircle2,
  PieChart as PieChartIcon, Activity, Zap, AlertCircle, MessageSquare
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip 
} from 'recharts';
import { useAppContext } from '../../context/AppContext';
import { Role, WorkflowStatus, Notification } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

export const StudentDashboardView = () => {
  const { records, currentUser, notifications, markAsRead, checkEligibility, isStudentEligible, getStudentEligibilityInfo } = useAppContext();
  const navigate = useNavigate();

  const isEligible = useMemo(() => currentUser ? isStudentEligible(currentUser) : false, [currentUser, isStudentEligible]);

  useEffect(() => {
    // Eligibility check removed as per request
  }, [currentUser]);

  const myRecords = useMemo(() => records.filter(r => r.studentId === currentUser?.id), [records, currentUser]);
  const myNotifications = useMemo(() => notifications.filter(n => n.userId === currentUser?.id && !n.isRead).slice(0, 3), [notifications, currentUser]);
  
  const pendingActions = useMemo(() => {
    return myRecords.filter(r => 
      r.status === WorkflowStatus.COMPLEMENT_REQUIRED || 
      r.status === WorkflowStatus.PENDING_STUDENT_SIGNATURE ||
      r.status === WorkflowStatus.PENDING_TRANSFER_SERVICE_STAGE ||
      r.status === WorkflowStatus.PENDING_INSURANCE ||
      r.status === WorkflowStatus.READY_FOR_PICKUP
    );
  }, [myRecords]);

  const stats = useMemo(() => {
    const total = myRecords.length;
    const completed = myRecords.filter(r => r.status === WorkflowStatus.COMPLETED).length;
    const pending = myRecords.filter(r => ![WorkflowStatus.COMPLETED, WorkflowStatus.REJECTED, WorkflowStatus.CANCELLED, WorkflowStatus.DRAFT].includes(r.status)).length;
    const drafts = myRecords.filter(r => r.status === WorkflowStatus.DRAFT).length;
    return { total, completed, pending, drafts };
  }, [myRecords]);

  const statusDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    myRecords.forEach(r => {
      counts[r.status] = (counts[r.status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [myRecords]);

  const eligibilityInfo = useMemo(() => currentUser ? getStudentEligibilityInfo(currentUser) : null, [currentUser, getStudentEligibilityInfo]);

  const menuItems = [
    {
      title: "Nouvelle Demande",
      description: !isEligible
        ? "Vous n'êtes pas encore éligible pour créer une convention (Vérifiez votre niveau ou contactez l'administration)."
        : myRecords.length > 0 
          ? "Vous avez déjà une demande en cours pour cette année." 
          : `Initier une nouvelle demande de convention de stage (${eligibilityInfo?.type || 'PFA'}).`,
      icon: <Plus className={(!isEligible || myRecords.length > 0) ? "text-muted-foreground" : "text-primary"} />,
      path: (!isEligible || myRecords.length > 0) ? null : "/new-request",
      color: (!isEligible || myRecords.length > 0) ? "bg-muted" : "bg-primary/10",
      disabled: !isEligible || myRecords.length > 0
    },
    {
      title: "Mes Conventions",
      description: "Consulter l'historique et le statut de vos demandes.",
      icon: <FileText className="text-emerald-600" />,
      path: "/conventions",
      color: "bg-emerald-500/10"
    },
    {
      title: "Guide de Procédure",
      description: "Comprendre les étapes de validation et signatures.",
      icon: <Info className="text-amber-600" />,
      path: "/guide",
      color: "bg-amber-500/10"
    }
  ];

  return (
    <div className="container mx-auto px-4 md:px-6 pt-8 md:pt-12 pb-48 md:pb-64 max-w-7xl space-y-8 md:space-y-12 text-left animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Layout className="text-primary" size={20} />
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Portail Étudiant</p>
          </div>
          <h2 className="text-3xl md:text-5xl text-foreground tracking-tighter uppercase font-medium">Bonjour, {currentUser?.name?.split(' ')[0] || 'Étudiant'}</h2>
          <p className="text-muted-foreground max-w-2xl text-sm md:text-base">Bienvenue sur votre espace e-PFE. Suivez vos demandes de stage et gérez vos documents en toute simplicité.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Button onClick={() => navigate('/requests')} variant="outline" className="flex-1 md:flex-none py-3 md:py-4 px-6 md:px-8 rounded-xl md:rounded-2xl uppercase text-[10px] tracking-widest font-bold border-2 border-border hover:border-primary">
            <FileText size={16} className="mr-2" /> Mes Dossiers
          </Button>
        </div>
      </header>

      {/* Pending Actions Highlight */}
      {pendingActions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="text-amber-500 fill-amber-500" size={18} />
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">Actions Requises ({pendingActions.length})</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingActions.map(record => (
              <Card 
                key={record.id}
                onClick={() => navigate(`/request/${record.id}`)}
                className="p-0 bg-card border-border hover:border-amber-500/50 transition-all cursor-pointer rounded-3xl group relative overflow-hidden shadow-xl shadow-slate-200/50 flex"
              >
                <div className="w-2 bg-amber-500 shrink-0" />
                <div className="p-6 flex items-start gap-4 relative z-10 w-full">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
                    {record.status === WorkflowStatus.COMPLEMENT_REQUIRED ? <MessageSquare size={24} /> : 
                     record.status === WorkflowStatus.READY_FOR_PICKUP ? <CheckCircle2 size={24} /> :
                     <FileText size={24} />}
                  </div>
                  <div className="space-y-1 flex-1 min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">
                      {record.status === WorkflowStatus.COMPLEMENT_REQUIRED ? "Complément Requis" : 
                       record.status === WorkflowStatus.PENDING_STUDENT_SIGNATURE ? "Signature Attendue" :
                       record.status === WorkflowStatus.PENDING_TRANSFER_SERVICE_STAGE ? "Dépôt Physique Requis" :
                       record.status === WorkflowStatus.PENDING_INSURANCE ? "Assurance Requise" :
                       record.status === WorkflowStatus.READY_FOR_PICKUP ? "Document Prêt" :
                       "Action Requise"}
                    </p>
                    <h4 className="text-lg font-bold text-foreground uppercase tracking-tight truncate">{record.data.companyName}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                      {record.status === WorkflowStatus.COMPLEMENT_REQUIRED ? "Veuillez corriger votre dossier selon les observations." : 
                       record.status === WorkflowStatus.PENDING_STUDENT_SIGNATURE ? "Imprimez votre convention, signez-la, uploadez le scan et déposez l'original au Service Recherche." :
                       record.status === WorkflowStatus.PENDING_TRANSFER_SERVICE_STAGE ? "Veuillez déposer l'original de votre convention signée au Service Recherche pour validation finale." :
                       record.status === WorkflowStatus.PENDING_INSURANCE ? "Veuillez uploader votre attestation d'assurance." :
                       record.status === WorkflowStatus.READY_FOR_PICKUP ? "Votre convention est signée. Vous pouvez venir la récupérer." :
                       record.data.subject}
                    </p>
                    <div className="flex items-center gap-2 pt-2 text-[10px] font-bold text-primary uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                      Traiter maintenant <ChevronRight size={12} />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Note for Drafts */}
      {myRecords.some(r => r.status === WorkflowStatus.DRAFT) && (
        <Card className="p-6 md:p-8 border-2 border-dashed border-primary/30 bg-primary/5 rounded-[2rem] flex flex-col md:flex-row items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Info size={32} />
          </div>
          <div className="space-y-2 text-center md:text-left">
            <h4 className="text-lg font-bold uppercase tracking-tight text-primary">Note Importante : Dossier en Brouillon</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Vous avez un dossier enregistré en tant que <span className="font-bold text-foreground">Brouillon</span>. 
              Pour le soumettre à validation, vous devez :
              <br />
              <span className="font-bold text-primary">1.</span> Cliquer sur <span className="font-bold">"Mes Dossiers"</span>. 
              <span className="mx-2 font-bold text-primary">2.</span> Sélectionner votre dossier. 
              <span className="mx-2 font-bold text-primary">3.</span> Cliquer sur <span className="font-bold text-primary-foreground bg-primary px-2 py-0.5 rounded-lg">Modifier</span>. 
              <span className="mx-2 font-bold text-primary">4.</span> Cocher les cases de consentement et cliquer sur <span className="font-bold underline text-foreground">Envoyer pour validation</span>.
            </p>
          </div>
          <Button onClick={() => navigate('/requests')} className="md:ml-auto rounded-xl px-8 h-12 uppercase text-[10px] font-black tracking-widest">
            Aller vers mes dossiers
          </Button>
        </Card>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard label="Total Demandes" value={stats.total} icon={<FileText className="text-primary" />} />
        <StatCard label="En Cours" value={stats.pending} icon={<Clock className="text-amber-600" />} />
        <StatCard label="Validées" value={stats.completed} icon={<CheckCircle2 className="text-emerald-600" />} />
        <StatCard label="Brouillons" value={stats.drafts} icon={<Plus className="text-muted-foreground" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
        {/* Navigation Grid */}
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-lg md:text-xl font-bold text-foreground uppercase tracking-tight">Mes Services</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {menuItems.map((item) => (
              <Card 
                key={item.title}
                onClick={() => item.path && navigate(item.path)}
                className={`p-5 md:p-6 bg-card border-border transition-all rounded-2xl md:rounded-3xl ${item.disabled ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-xl hover:-translate-y-1 cursor-pointer group'}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 md:p-4 rounded-xl md:rounded-2xl ${item.color} ${!item.disabled && 'group-hover:scale-110'} transition-transform`}>
                    {React.cloneElement(item.icon as React.ReactElement, { size: 24 })}
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-foreground uppercase tracking-tight flex items-center gap-2">
                      {item.title}
                      {!item.disabled && <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />}
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
        
        {/* Mini Analytics for Student */}
        <div className="space-y-6 md:space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-lg md:text-xl font-bold text-foreground uppercase tracking-tight">Répartition</h3>
          </div>
          <Card className="p-5 md:p-6 bg-card border-border rounded-2xl md:rounded-3xl shadow-sm space-y-6">
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
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
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Statut des Demandes</p>
              {statusDistribution.map((s, i) => (
                <div key={s.name} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['var(--primary)', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][i % 5] }} />
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-tight">{s.name.replace(/_/g, ' ')}</span>
                  </div>
                  <span className="text-xs font-bold text-foreground">{s.value}</span>
                </div>
              ))}
            </div>
          </Card>

          <div className="flex items-center justify-between">
            <h3 className="text-lg md:text-xl font-bold text-foreground uppercase tracking-tight">Notifications</h3>
          </div>
          <div className="space-y-3 md:space-y-4">
            {myNotifications.length === 0 ? (
              <div className="p-6 md:p-8 text-center bg-card rounded-2xl md:rounded-3xl border border-border opacity-60">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tout est à jour</p>
              </div>
            ) : (
              myNotifications.map(notif => (
                <Card 
                  key={notif.id} 
                  onClick={() => {
                    markAsRead(notif.id);
                    if (notif.recordId) navigate(`/request/${notif.recordId}`);
                  }}
                  className="p-4 hover:shadow-md transition-all cursor-pointer group rounded-xl md:rounded-2xl border-border"
                >
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Bell size={14} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-foreground uppercase tracking-tight">{notif.title}</p>
                      <p className="text-[11px] text-muted-foreground leading-tight line-clamp-2">{notif.message}</p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          <Card className="p-6 md:p-8 bg-primary text-primary-foreground rounded-[2rem] md:rounded-[2.5rem] shadow-xl space-y-4 overflow-hidden relative">
             <div className="relative z-10 space-y-2">
               <h4 className="text-lg font-bold uppercase tracking-tight">Besoin d'aide ?</h4>
               <p className="text-xs opacity-80 leading-relaxed">Consultez le guide de procédure pour comprendre les étapes de validation.</p>
               <Button variant="ghost" onClick={() => navigate('/guide')} className="w-full bg-primary-foreground text-primary hover:bg-primary-foreground/90 rounded-xl text-[10px] font-bold uppercase tracking-widest mt-4">Voir le guide</Button>
             </div>
             <Info className="absolute -right-4 -bottom-4 w-24 h-24 md:w-32 md:h-32 opacity-10 rotate-12" />
          </Card>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon }: any) => (
  <Card className="p-5 md:p-6 bg-card border-border shadow-sm rounded-2xl md:rounded-3xl space-y-4 group hover:shadow-md transition-all">
    <div className="flex justify-between items-start">
      <div className="p-3 bg-secondary rounded-xl md:rounded-2xl group-hover:scale-110 transition-transform">
        {icon}
      </div>
    </div>
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-2xl md:text-3xl font-medium text-foreground tracking-tighter">{value}</p>
    </div>
  </Card>
);
