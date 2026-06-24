
import React, { useMemo } from 'react';
import { 
  Search, MessageSquare, Plus, LifeBuoy, 
  Clock, CheckCircle2, ChevronRight, HelpCircle
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { Role } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useNavigate } from 'react-router-dom';

export const SupportDashboardView = () => {
  const { supportQuestions, currentUser } = useAppContext();
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const total = supportQuestions.length;
    const pending = supportQuestions.filter(q => q.status === 'pending').length;
    const answered = supportQuestions.filter(q => q.status === 'answered').length;
    const publicFaq = supportQuestions.filter(q => q.isPublic).length;
    
    return { total, pending, answered, publicFaq };
  }, [supportQuestions]);

  const menuItems = [
    {
      title: "Gestion des Questions",
      description: "Répondre aux interrogations des étudiants.",
      icon: <MessageSquare className="text-primary" />,
      path: "/support-questions",
      color: "bg-primary/10",
      stats: `${stats.pending} en attente`
    },
    {
      title: "Ma base FAQ",
      description: "Gérer les questions fréquentes publiées.",
      icon: <HelpCircle className="text-purple-600" />,
      path: "/support-questions", // They can manage FAQ in the same view
      color: "bg-purple-500/10",
      stats: `${stats.publicFaq} articles publics`
    },
    {
      title: "Recherche Globale",
      description: "Rechercher des conventions par Massar ou Nom.",
      icon: <Search className="text-muted-foreground" />,
      path: "/search",
      color: "bg-secondary"
    }
  ];

  return (
    <div className="container mx-auto px-4 md:px-6 pt-8 md:pt-12 pb-48 md:pb-56 max-w-7xl space-y-8 md:space-y-12 text-left animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <LifeBuoy className="text-primary" size={20} />
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Support Technique</p>
          </div>
          <h2 className="text-3xl md:text-5xl text-foreground tracking-tighter uppercase font-medium">Tableau de Bord Support</h2>
          <p className="text-muted-foreground max-w-2xl text-sm md:text-base">
            Bienvenue, {currentUser?.name}. Gérez les demandes d'assistance et la base de connaissances FAQ.
          </p>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <SupportStatCard label="Total Questions" value={stats.total} icon={<MessageSquare size={20} />} />
        <SupportStatCard label="En Attente" value={stats.pending} icon={<Clock size={20} />} variant="warning" />
        <SupportStatCard label="Répondues" value={stats.answered} icon={<CheckCircle2 size={20} />} variant="success" />
        <SupportStatCard label="Articles FAQ" value={stats.publicFaq} icon={<HelpCircle size={20} />} variant="info" />
      </div>

      {/* Hero Action Card */}
      {stats.pending > 0 && (
        <Card className="p-8 md:p-12 bg-primary/5 border-primary/20 rounded-[3rem] overflow-hidden relative group border-2">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="space-y-4 text-center md:text-left flex-1">
              <h3 className="text-2xl md:text-4xl font-black text-foreground uppercase tracking-tighter">
                {stats.pending} Questions <span className="text-primary">Attendent</span> votre réponse
              </h3>
              <p className="text-muted-foreground text-sm md:text-base max-w-xl">
                Aidez les étudiants à débloquer leur situation en répondant à leurs interrogations techniques.
              </p>
              <Button 
                onClick={() => navigate('/support-questions')}
                className="py-4 px-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 shadow-xl"
              >
                Gérer les questions <ChevronRight size={16} />
              </Button>
            </div>
            <div className="hidden lg:block">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                <MessageSquare size={48} className="text-primary" />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Navigation Grid */}
      <div className="space-y-6">
        <h3 className="text-lg md:text-xl font-bold text-foreground uppercase tracking-tight">Outils Support</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {menuItems.map((item) => (
            <Card 
              key={item.title}
              onClick={() => navigate(item.path)}
              className="p-6 bg-card border-border hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group rounded-3xl"
            >
              <div className="flex flex-col h-full justify-between gap-6">
                <div className="flex items-start justify-between">
                  <div className={`p-4 rounded-2xl ${item.color} group-hover:scale-110 transition-transform`}>
                    {item.icon}
                  </div>
                  {item.stats && (
                    <Badge variant="outline" className="text-[9px] uppercase tracking-widest bg-secondary">
                      {item.stats}
                    </Badge>
                  )}
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
    </div>
  );
};

const SupportStatCard = ({ label, value, icon, variant = 'default' }: any) => {
  const colors = {
    default: 'text-primary bg-primary/10',
    warning: 'text-amber-600 bg-amber-500/10',
    success: 'text-emerald-600 bg-emerald-500/10',
    info: 'text-purple-600 bg-purple-500/10'
  };

  return (
    <Card className="p-6 bg-card border-border shadow-xl rounded-[2rem] space-y-4 group hover:-translate-y-1 transition-all">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${colors[variant as keyof typeof colors]}`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="text-3xl font-medium text-foreground tracking-tighter">{value}</p>
      </div>
    </Card>
  );
};

const Badge = ({ children, variant, className }: any) => {
  const variants = {
    outline: 'border border-border'
  };
  return (
    <span className={`px-2 py-1 rounded-full text-[9px] font-bold ${variants[variant as keyof typeof variants]} ${className}`}>
      {children}
    </span>
  );
};
