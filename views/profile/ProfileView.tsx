
import React from 'react';
import { 
  User, 
  Mail, 
  Shield, 
  BookOpen, 
  Fingerprint, 
  Calendar, 
  Building2, 
  Award,
  Info,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Role } from '../../types';

export const ProfileView = () => {
  const { currentUser, isStudentEligible } = useAppContext();

  if (!currentUser) return null;

  const isStudent = currentUser.roles.includes(Role.STUDENT);
  const eligible = isStudent ? isStudentEligible(currentUser) : true;

  return (
    <div className="container mx-auto px-4 md:px-6 pt-8 md:pt-12 pb-48 md:pb-64 max-w-5xl space-y-8 md:space-y-12 text-left animate-in fade-in duration-500">
      <header className="space-y-4">
        <div className="flex items-center gap-2">
          <User className="text-primary" size={20} />
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Mon Compte</p>
        </div>
        <h2 className="text-3xl md:text-5xl text-foreground tracking-tighter uppercase font-medium">Profil Utilisateur</h2>
        <p className="text-muted-foreground max-w-2xl text-xs md:text-base leading-relaxed">
          Consultez vos informations personnelles synchronisées avec le système académique de l'Université Cadi Ayyad.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Avatar & Quick Info */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-8 bg-card border-border rounded-[2.5rem] flex flex-col items-center text-center space-y-6 shadow-sm">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-4 border-background shadow-xl">
                {currentUser.avatarUrl ? (
                  <img 
                    src={currentUser.avatarUrl} 
                    alt={currentUser.name} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-4xl font-black text-primary">{currentUser.name[0]}</span>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 p-2 bg-emerald-500 text-white rounded-full border-4 border-background shadow-lg">
                <CheckCircle2 size={16} />
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-foreground uppercase tracking-tight">{currentUser.name}</h3>
              <p className="text-xs text-muted-foreground font-mono">{currentUser.email}</p>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              {currentUser.roles.map(role => (
                <Badge key={role} variant="outline" className="text-[8px] uppercase tracking-widest font-black py-1 px-3 bg-muted/50">
                  {role}
                </Badge>
              ))}
            </div>

            {isStudent && (
              <div className={`w-full p-4 rounded-2xl flex items-center gap-3 border ${eligible ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                {eligible ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                <div className="text-left">
                  <p className="text-[10px] font-black uppercase tracking-widest">Éligibilité</p>
                  <p className="text-[9px] font-bold opacity-80">{eligible ? 'Autorisé à créer des conventions' : 'Non éligible actuellement'}</p>
                </div>
              </div>
            )}
          </Card>

          <div className="p-6 bg-amber-700 rounded-3xl flex gap-4 items-start shadow-lg shadow-amber-500/20">
            <div className="p-2 bg-white/20 rounded-xl text-white">
              <Info size={20} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white uppercase tracking-tight">Lecture Seule</h4>
              <p className="text-xs text-amber-50 leading-relaxed font-medium">
                Ces informations sont synchronisées automatiquement avec l'API de l'Université. Pour toute modification, veuillez contacter le service scolarité.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Info */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="p-8 bg-card border-border rounded-[2.5rem] shadow-sm space-y-8">
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-border pb-4">
                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                  <BookOpen size={20} />
                </div>
                <h3 className="text-lg font-bold text-foreground uppercase tracking-tight">Informations Académiques</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">Nom Complet</label>
                  <div className="p-4 bg-muted/50 rounded-2xl border border-border/50 flex items-center gap-3">
                    <User size={16} className="text-muted-foreground" />
                    <span className="text-sm font-bold text-foreground">{currentUser.name}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">Email Institutionnel</label>
                  <div className="p-4 bg-muted/50 rounded-2xl border border-border/50 flex items-center gap-3">
                    <Mail size={16} className="text-muted-foreground" />
                    <span className="text-sm font-bold text-foreground">{currentUser.email}</span>
                  </div>
                </div>

                {isStudent ? (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">Code Massar</label>
                      <div className="p-4 bg-muted/50 rounded-2xl border border-border/50 flex items-center gap-3">
                        <Fingerprint size={16} className="text-muted-foreground" />
                        <span className="text-sm font-bold text-foreground font-mono">{currentUser.massarCode || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">Code Appogee</label>
                      <div className="p-4 bg-muted/50 rounded-2xl border border-border/50 flex items-center gap-3">
                        <Award size={16} className="text-muted-foreground" />
                        <span className="text-sm font-bold text-foreground font-mono">{currentUser.appogeeCode || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">Niveau Actuel</label>
                      <div className="p-4 bg-muted/50 rounded-2xl border border-border/50 flex items-center gap-3">
                        <Award size={16} className="text-muted-foreground" />
                        <span className="text-sm font-bold text-primary uppercase tracking-widest">{currentUser.currentLevel || (currentUser.roles?.includes(Role.STUDENT) ? 'Non défini - Contacter Scolarité' : 'Administration')}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">Année d'Inscription</label>
                      <div className="p-4 bg-muted/50 rounded-2xl border border-border/50 flex items-center gap-3">
                        <Calendar size={16} className="text-muted-foreground" />
                        <span className="text-sm font-bold text-foreground">{currentUser.registrationYear || '2024/2025'}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">Département / Service</label>
                    <div className="p-4 bg-muted/50 rounded-2xl border border-border/50 flex items-center gap-3">
                      <Building2 size={16} className="text-muted-foreground" />
                      <span className="text-sm font-bold text-foreground uppercase tracking-widest">{currentUser.department || 'Administration Centrale'}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6 pt-4">
              <div className="flex items-center gap-3 border-b border-border pb-4">
                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                  <Shield size={20} />
                </div>
                <h3 className="text-lg font-bold text-foreground uppercase tracking-tight">Sécurité & Accès</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">Identifiant Unique (UID)</label>
                  <div className="p-4 bg-muted/50 rounded-2xl border border-border/50 flex items-center gap-3">
                    <Fingerprint size={16} className="text-muted-foreground" />
                    <span className="text-[10px] font-mono text-muted-foreground truncate">{currentUser.id}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">Statut du Compte</label>
                  <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 flex items-center gap-3">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Actif & Vérifié</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div className="flex items-center justify-center gap-2 text-muted-foreground opacity-40">
            <AlertCircle size={14} />
            <p className="text-[8px] font-bold uppercase tracking-[0.2em]">Dernière synchronisation : {new Date().toLocaleDateString()} à {new Date().toLocaleTimeString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
