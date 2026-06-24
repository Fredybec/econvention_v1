import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronRight, Info, AlertOctagon, X, Check, MessageSquare, Save, Send, RefreshCw } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { getAcademicYear } from '../../utils/dateUtils';
import { BackButton } from '../../components/shared/BackButton';
import { WorkflowStatus, Role, StageType, ConventionNature } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { AffirmationModal } from '../../components/shared/AffirmationModal';

export const StudentFormView = () => {
  const { id } = useParams<{ id: string }>();
  const { addRecord, updateRecord, currentUser, records, entreprises, addEntreprise, encadrantsFST, showAlert, isStudentEligible, getStudentEligibilityInfo, systemConfig, isConfigLoading } = useAppContext();
  const CURRENT_YEAR = getAcademicYear();
  const academicYearsOptions = useMemo(() => {
    const current = getAcademicYear();
    const list = new Set([current, ...systemConfig.academicYears]);
    return Array.from(list).sort((a, b) => b.localeCompare(a));
  }, [systemConfig.academicYears]);
  const navigate = useNavigate();

  const determinedEligibility = useMemo(() => {
    if (currentUser) {
      return getStudentEligibilityInfo(currentUser) || { type: StageType.PFA, nature: ConventionNature.PEDAGOGIE };
    }
    return { type: StageType.PFA, nature: ConventionNature.PEDAGOGIE };
  }, [currentUser, getStudentEligibilityInfo]);

  useEffect(() => {
    if (currentUser && !isStudentEligible(currentUser) && !id) {
      showAlert("Accès refusé", "Vous n'êtes pas éligible pour créer une nouvelle convention. Veuillez vérifier votre niveau ou contacter l'administration.", "error");
      navigate('/dashboard');
    }
  }, [currentUser, isStudentEligible, id, navigate, showAlert]);
  
  const editingRecord = useMemo(() => id ? records.find(r => r.id === id) : null, [id, records]);

  useEffect(() => {
    if (!id && determinedEligibility) {
      setFormData(prev => ({
        ...prev,
        stageType: determinedEligibility.type,
        nature: determinedEligibility.nature
      }));
    }
  }, [determinedEligibility, id]);

  const [formData, setFormData] = useState({
    stageType: StageType.PFA,
    nature: ConventionNature.PEDAGOGIE,
    isPreEmbauche: false,
    isRemunere: false,
    isInternational: false,
    isBinome: false,
    binomeName: '',
    binomeMassar: '',
    companyName: '',
    address: '',
    duration: '',
    startDate: '',
    endDate: '',
    tutorName: '',
    tutorEmail: '',
    tutorPhone: '',
    fstTutorName: '',
    fstTutorEmail: '',
    subject: '',
    department: currentUser?.department || '',
    filiere: currentUser?.filiere || '',
    semestre: currentUser?.semestre || '',
    academicYear: '',
    registrationYear: currentUser?.registrationYear || '',
    currentLevel: currentUser?.currentLevel || '',
    massarCode: currentUser?.massarCode || '',
    appogeeCode: currentUser?.appogeeCode || '',
    consent: false,
    enterpriseAffirmation: false
  });

  useEffect(() => {
    if (!isConfigLoading && !id) {
      setFormData(prev => ({
        ...prev,
        department: currentUser?.department || systemConfig.departments[0] || '',
        filiere: currentUser?.filiere || systemConfig.filieres[0] || '',
        semestre: currentUser?.semestre || systemConfig.semestres[0] || '',
        academicYear: prev.academicYear || (systemConfig as any).currentYear || CURRENT_YEAR
      }));
    }
  }, [isConfigLoading, systemConfig, id]);

  useEffect(() => {
    if (editingRecord) {
      setFormData(prev => ({
        ...prev,
        ...editingRecord.data
      }));
    }
  }, [editingRecord]);

  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end > start) {
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let durationText = '';
        if (diffDays >= 30) {
          const months = Math.floor(diffDays / 30);
          const remainingDays = diffDays % 30;
          durationText = `${months} mois${remainingDays > 0 ? ` ${remainingDays} jours` : ''}`;
        } else {
          durationText = `${diffDays} jours`;
        }
        
        if (formData.duration !== durationText) {
          setFormData(prev => ({ ...prev, duration: durationText }));
        }
      }
    }
  }, [formData.startDate, formData.endDate, formData.duration]);

  const [isNewEnterprise, setIsNewEnterprise] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const existingActiveConvention = useMemo(() => {
    return records.find(r => 
      r.studentId === currentUser?.id && 
      r.data.academicYear === formData.academicYear && 
      r.status !== WorkflowStatus.CANCELLED &&
      r.id !== id // Exclude current record when editing
    );
  }, [records, currentUser, formData.academicYear, id]);

  const isAdmin = useMemo(() => currentUser?.roles?.some(r => [Role.SUPERADMIN, Role.ENCADRANT_FST, Role.CHEF_DEPARTEMENT, Role.SCOLARITE, Role.SERVICE_RECHERCHE_COOP, Role.SUPPORT].includes(r)), [currentUser]);

  const lastStatus = useMemo(() => {
    if (!editingRecord) return null;
    return editingRecord.history.slice().reverse().find(h => h.status !== WorkflowStatus.COMPLEMENT_REQUIRED)?.status;
  }, [editingRecord]);

  const handleConfirm = (isDraft: boolean = false) => {
    if (isNewEnterprise && isAdmin) {
      addEntreprise({ name: formData.companyName, address: formData.address });
    }
    
    // If admin is editing, preserve current status unless it's a new record
    // If student is editing a complement request, return to last valid status
    let status = WorkflowStatus.PENDING_RESPONSABLE;
    
    if (isAdmin && id) {
      status = editingRecord?.status || WorkflowStatus.DRAFT;
    } else if (isDraft) {
      status = WorkflowStatus.DRAFT;
    } else if (editingRecord?.status === WorkflowStatus.COMPLEMENT_REQUIRED && lastStatus) {
      status = lastStatus;
    }
    
    const finalData = { 
      ...formData, 
      status,
      enterpriseAffirmation: isDraft ? false : formData.enterpriseAffirmation,
      consent: isDraft ? false : formData.consent
    };

    if (id) {
      updateRecord(id, finalData);
    } else {
      addRecord({
        studentId: currentUser?.id || '',
        studentName: currentUser?.name || '',
        status: status,
        data: { ...finalData, studentId: currentUser?.id || '' },
        history: [{ 
          status: status, 
          updatedBy: currentUser?.name || 'Étudiant', 
          updatedById: currentUser?.id || 'student',
          updatedByRole: Role.STUDENT,
          updatedAt: Date.now(),
          comment: isDraft ? 'Enregistré comme brouillon' : 'Soumis pour validation'
        }]
      });
    }
    navigate('/conventions');
  };

  const onFormSubmit = (e: React.FormEvent, isDraft: boolean) => {
    e.preventDefault();
    if (existingActiveConvention && !id) return;
    
    if (!isDraft) {
      // Basic field validation for non-drafts (fallback for browser validation)
      if (!formData.companyName || !formData.address || !formData.startDate || !formData.endDate || !formData.subject) {
        showAlert("Champs manquants", "Veuillez remplir tous les champs obligatoires avant de soumettre.", "warning");
        return;
      }

      // Date validation
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (start >= end) {
        showAlert("Dates invalides", "La date de début doit être antérieure à la date de fin.", "warning");
        return;
      }

      if (!formData.enterpriseAffirmation) {
        showAlert("Certification requise", "Veuillez certifier que l'entreprise existe réellement.", "warning");
        return;
      }
      if (!formData.consent) {
        showAlert("Consentement requis", "Veuillez certifier l'exactitude des informations fournies.", "warning");
        return;
      }
    }
    
    if (isDraft) {
      handleConfirm(true);
    } else {
      setShowConfirm(true);
    }
  };

  return (
    <div className="container mx-auto px-4 md:px-6 pt-8 md:pt-12 pb-48 md:pb-64 max-w-4xl space-y-8 md:space-y-12 text-left animate-in fade-in">
      <header className="space-y-4">
        <BackButton to="/conventions" />
        <h2 className="text-3xl md:text-4xl text-foreground tracking-tighter uppercase font-medium">{id ? 'Modifier la Demande' : 'Nouvelle Demande'}</h2>
      </header>

      {id && (
        <div className="p-6 md:p-8 bg-card border-border border-l-8 border-l-amber-500 rounded-[2rem] md:rounded-[2.5rem] flex flex-col sm:flex-row items-start gap-4 md:gap-6 animate-in slide-in-from-top-4 duration-500 shadow-xl shadow-slate-200/50">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-500 text-white rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
            <Info size={24} />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-bold text-amber-600 uppercase tracking-tight">Avertissement</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Vous modifiez une demande existante. Les informations seront mises à jour et le dossier restera dans le circuit de validation actuel.
            </p>
          </div>
        </div>
      )}

      {editingRecord?.status === WorkflowStatus.DRAFT && editingRecord.history.some(h => h.comment && h.updatedByRole === Role.ENCADRANT_FST) && (
        <div className="p-6 md:p-8 bg-primary/5 border border-primary/20 rounded-[2rem] md:rounded-[2.5rem] space-y-4 animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-3 text-primary">
            <MessageSquare size={20} />
            <h4 className="text-sm font-black uppercase tracking-widest">Observations de l'Encadrant</h4>
          </div>
          <div className="space-y-3">
            {editingRecord.history.filter(h => h.comment && h.updatedByRole === Role.ENCADRANT_FST).map((h, i) => (
              <div key={i} className="p-4 bg-card rounded-2xl shadow-sm border border-border">
                <p className="text-xs text-muted-foreground font-medium leading-relaxed">{h.comment}</p>
                <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mt-2">{h.updatedBy} • {new Date(h.updatedAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {existingActiveConvention && (
        <div className="p-6 md:p-8 bg-destructive/10 border border-destructive/20 rounded-[2rem] md:rounded-[2.5rem] flex flex-col sm:flex-row items-start gap-4 md:gap-6 animate-in slide-in-from-top-4 duration-500">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-destructive/20 text-destructive rounded-xl md:rounded-2xl flex items-center justify-center shrink-0">
            <AlertOctagon size={24} />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-bold text-destructive uppercase tracking-tight">Limite de demande atteinte</h4>
            <p className="text-xs text-destructive/80 leading-relaxed">
              Vous possédez déjà une demande pour l'année universitaire <span className="font-bold underline">{formData.academicYear}</span> (Réf: {existingActiveConvention.id}). 
              Le règlement autorise une seule convention par étudiant par année universitaire.
            </p>
          </div>
        </div>
      )}

      <form 
        onSubmit={(e) => onFormSubmit(e, false)}
        className={`space-y-6 md:space-y-8 ${existingActiveConvention && !id ? 'opacity-40 pointer-events-none grayscale' : ''}`}
      >
        <Card className="p-6 md:p-10 border-border shadow-2xl rounded-[2rem] md:rounded-[3rem] bg-card space-y-8 md:space-y-10 transition-all duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest ml-1">Type de Stage</label>
              <div className="relative">
                <input 
                  type="text"
                  readOnly
                  className="w-full p-4 bg-muted border border-border rounded-2xl outline-none text-muted-foreground font-bold transition-all cursor-not-allowed" 
                  value={formData.stageType} 
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <Badge className="bg-primary/10 text-primary border-0 text-[8px]">Défini par éligibilité</Badge>
                </div>
              </div>
              <p className="text-[8px] text-muted-foreground px-2 font-medium">Le type de stage ({formData.stageType}) et sa nature ({formData.nature}) sont automatiquement déterminés par votre niveau actuel.</p>
            </div>
            <div className="flex flex-wrap gap-6 items-center pt-6">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center">
                  <input type="checkbox" className="peer w-5 h-5 opacity-0 absolute cursor-pointer" checked={formData.isPreEmbauche} onChange={e => setFormData(prev => ({...prev, isPreEmbauche: e.target.checked}))} />
                  <div className="w-5 h-5 border-2 border-border rounded-lg peer-checked:bg-primary peer-checked:border-primary transition-all flex items-center justify-center">
                    <Check size={12} className="text-primary-foreground scale-0 peer-checked:scale-100 transition-transform" />
                  </div>
                </div>
                <span className="text-[11px] uppercase font-bold text-muted-foreground group-hover:text-primary transition-colors">Pré-embauche</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center">
                  <input type="checkbox" className="peer w-5 h-5 opacity-0 absolute cursor-pointer" checked={formData.isRemunere} onChange={e => setFormData(prev => ({...prev, isRemunere: e.target.checked}))} />
                  <div className="w-5 h-5 border-2 border-border rounded-lg peer-checked:bg-primary peer-checked:border-primary transition-all flex items-center justify-center">
                    <Check size={12} className="text-primary-foreground scale-0 peer-checked:scale-100 transition-transform" />
                  </div>
                </div>
                <span className="text-[11px] uppercase font-bold text-muted-foreground group-hover:text-primary transition-colors">Rémunéré</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center">
                  <input type="checkbox" className="peer w-5 h-5 opacity-0 absolute cursor-pointer" checked={formData.isInternational} onChange={e => setFormData(prev => ({...prev, isInternational: e.target.checked}))} />
                  <div className="w-5 h-5 border-2 border-border rounded-lg peer-checked:bg-primary peer-checked:border-primary transition-all flex items-center justify-center">
                    <Check size={12} className="text-primary-foreground scale-0 peer-checked:scale-100 transition-transform" />
                  </div>
                </div>
                <span className="text-[11px] uppercase font-bold text-muted-foreground group-hover:text-primary transition-colors">International</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6 bg-muted/30 rounded-3xl border border-border">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Département</label>
              <input readOnly className="w-full p-3 bg-muted border border-border rounded-xl outline-none text-muted-foreground text-xs font-medium cursor-not-allowed" value={formData.department} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Filière</label>
              <input readOnly className="w-full p-3 bg-muted border border-border rounded-xl outline-none text-muted-foreground text-xs font-medium cursor-not-allowed" value={formData.filiere} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Semestre</label>
              <input readOnly className="w-full p-3 bg-muted border border-border rounded-xl outline-none text-muted-foreground text-xs font-medium cursor-not-allowed" value={formData.semestre} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Année Univ.</label>
              {isAdmin ? (
                <select 
                  className="w-full p-3 bg-secondary border border-border rounded-xl outline-none focus:border-primary text-foreground text-xs font-bold" 
                  value={formData.academicYear} 
                  onChange={e => setFormData(prev => ({...prev, academicYear: e.target.value}))}
                >
                  {academicYearsOptions.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              ) : (
                <input readOnly className="w-full p-3 bg-muted border border-border rounded-xl outline-none text-muted-foreground text-xs font-medium cursor-not-allowed" value={formData.academicYear} />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Entreprise d'accueil</label>
              {!isNewEnterprise ? (
                <div className="space-y-1">
                  <select required className="w-full p-4 bg-secondary border border-border rounded-2xl outline-none focus:border-primary text-foreground transition-all" value={formData.companyName} onChange={e => {
                    if (e.target.value === 'NEW') {
                      setIsNewEnterprise(true);
                      setFormData(prev => ({...prev, companyName: '', address: ''}));
                    } else {
                      const ent = entreprises.find(ent => ent.name === e.target.value);
                      setFormData(prev => ({...prev, companyName: e.target.value, address: ent?.address || ''}));
                    }
                  }}>
                    <option value="">Sélectionner une entreprise</option>
                    {entreprises.map(ent => <option key={ent.id} value={ent.name}>{ent.name}</option>)}
                    <option value="NEW">+ Ajouter une nouvelle entreprise</option>
                  </select>
                  <p className="text-[8px] text-muted-foreground px-2 font-medium">Sélectionnez votre entreprise d'accueil dans la liste ou ajoutez-en une nouvelle.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex gap-2">
                    <input required placeholder="Nom de l'entreprise" className="w-full p-4 bg-secondary border border-border rounded-2xl outline-none focus:border-primary text-foreground transition-all" value={formData.companyName} onChange={e => setFormData(prev => ({...prev, companyName: e.target.value}))} />
                    <Button 
                      variant="outline" 
                      onClick={() => setIsNewEnterprise(false)} 
                      className="rounded-2xl px-4 hover:bg-red-50 text-red-500 hover:text-red-600 border-red-100 flex items-center justify-center shrink-0"
                      aria-label="Fermer"
                    >
                      <X size={24} strokeWidth={2.5} className="shrink-0" />
                    </Button>
                  </div>
                  <p className="text-[8px] text-muted-foreground px-2 font-medium">Saisissez le nom officiel de l'entreprise.</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Adresse Siège Social / Lieu du Stage</label>
            <input required placeholder="Ex: 123 Rue de l'Innovation, Casablanca" className="w-full p-4 bg-secondary border border-border rounded-2xl outline-none focus:border-primary text-foreground transition-all" value={formData.address} onChange={e => setFormData(prev => ({...prev, address: e.target.value}))} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Tuteur Entreprise (Maître de stage)</label>
              <input required placeholder="Nom et Prénom du tuteur" className="w-full p-4 bg-secondary border border-border rounded-2xl outline-none focus:border-primary text-foreground transition-all" value={formData.tutorName} onChange={e => setFormData(prev => ({...prev, tutorName: e.target.value}))} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Email Tuteur</label>
                <input type="email" required placeholder="tuteur@entreprise.com" className="w-full p-4 bg-secondary border border-border rounded-2xl outline-none focus:border-primary text-foreground transition-all" value={formData.tutorEmail} onChange={e => setFormData(prev => ({...prev, tutorEmail: e.target.value}))} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Tél Tuteur</label>
                <input required placeholder="06XXXXXXXX" className="w-full p-4 bg-secondary border border-border rounded-2xl outline-none focus:border-primary text-foreground transition-all" value={formData.tutorPhone} onChange={e => setFormData(prev => ({...prev, tutorPhone: e.target.value}))} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Encadrant FST</label>
              <div className="space-y-1">
                <select required className="w-full p-4 bg-secondary border border-border rounded-2xl outline-none focus:border-primary text-foreground transition-all" value={formData.fstTutorName} onChange={e => {
                  const enc = encadrantsFST.find(enc => enc.name === e.target.value);
                  setFormData(prev => ({...prev, fstTutorName: e.target.value, fstTutorEmail: enc?.email || ''}));
                }}>
                  <option value="">Sélectionner un encadrant</option>
                  {encadrantsFST
                    .filter(enc => enc.department === formData.department)
                    .map(enc => <option key={enc.id} value={enc.name}>{enc.name}</option>)}
                </select>
                <p className="text-[8px] text-muted-foreground px-2 font-medium">L'encadrant doit appartenir à votre département ({formData.department}).</p>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Email Encadrant</label>
              <input type="email" required readOnly className="w-full p-4 bg-muted border border-border rounded-2xl outline-none text-muted-foreground transition-all" value={formData.fstTutorEmail} />
            </div>
          </div>

          <div className="space-y-6 pt-6 border-t border-border">
            <label className="flex items-center gap-4 cursor-pointer w-fit group">
              <div className="relative flex items-center">
                <input type="checkbox" className="peer w-6 h-6 opacity-0 absolute cursor-pointer" checked={formData.isBinome} onChange={e => setFormData(prev => ({...prev, isBinome: e.target.checked}))} />
                <div className="w-6 h-6 border-2 border-border rounded-lg peer-checked:bg-primary peer-checked:border-primary transition-all flex items-center justify-center">
                  <Check size={14} className="text-primary-foreground scale-0 peer-checked:scale-100 transition-transform" />
                </div>
              </div>
              <span className="text-sm font-bold text-foreground uppercase tracking-tight group-hover:text-primary transition-colors">Stage en Binôme</span>
            </label>

            {formData.isBinome && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-primary/5 rounded-3xl border border-primary/20 animate-in slide-in-from-top-2">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Nom Complet du Binôme</label>
                  <input required={formData.isBinome} className="w-full p-4 bg-background border border-border rounded-2xl outline-none focus:border-primary text-foreground transition-all" value={formData.binomeName} onChange={e => setFormData(prev => ({...prev, binomeName: e.target.value}))} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Code MASSAR du Binôme</label>
                  <input required={formData.isBinome} className="w-full p-4 bg-background border border-border rounded-2xl outline-none focus:border-primary text-foreground transition-all" value={formData.binomeMassar} onChange={e => setFormData(prev => ({...prev, binomeMassar: e.target.value}))} />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Code MASSAR</label>
              <input readOnly className="w-full p-4 bg-muted border border-border rounded-2xl outline-none text-muted-foreground font-medium cursor-not-allowed" value={formData.massarCode} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Code Appogée</label>
              <input readOnly className="w-full p-4 bg-muted border border-border rounded-2xl outline-none text-muted-foreground font-medium cursor-not-allowed" value={formData.appogeeCode} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Année d'inscription</label>
              <input readOnly className="w-full p-4 bg-muted border border-border rounded-2xl outline-none text-muted-foreground font-bold cursor-not-allowed" value={formData.registrationYear} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Niveau Actuel</label>
              <input readOnly className="w-full p-4 bg-muted border border-border rounded-2xl outline-none text-muted-foreground font-bold cursor-not-allowed" value={formData.currentLevel} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Sujet du {formData.stageType}</label>
            <textarea required placeholder={`Décrivez brièvement le sujet de votre ${formData.stageType}...`} className="w-full p-4 bg-secondary border border-border rounded-2xl outline-none focus:border-primary h-32 text-foreground transition-all" value={formData.subject} onChange={e => setFormData(prev => ({...prev, subject: e.target.value}))} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Date Début</label>
              <div className="space-y-1">
                <input type="date" required className="w-full p-4 bg-secondary border border-border rounded-2xl outline-none focus:border-primary text-foreground transition-all" value={formData.startDate} onChange={e => setFormData(prev => ({...prev, startDate: e.target.value}))} />
                <p className="text-[8px] text-muted-foreground px-2 font-medium">Date de début effective du stage.</p>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Date Fin</label>
              <div className="space-y-1">
                <input type="date" required className="w-full p-4 bg-secondary border border-border rounded-2xl outline-none focus:border-primary text-foreground transition-all" value={formData.endDate} onChange={e => setFormData(prev => ({...prev, endDate: e.target.value}))} />
                <p className="text-[8px] text-muted-foreground px-2 font-medium">Date de fin prévue.</p>
              </div>
            </div>
          </div>

          <div className="space-y-6 pt-6 border-t border-border transition-colors">
            <div className="space-y-4">
              <label className="flex items-start gap-4 cursor-pointer group bg-secondary p-5 rounded-3xl border border-transparent hover:border-primary/20 transition-all">
                <div className="relative flex items-center mt-1">
                  <input type="checkbox" required className="peer w-6 h-6 opacity-0 absolute cursor-pointer" checked={formData.enterpriseAffirmation} onChange={e => setFormData(prev => ({...prev, enterpriseAffirmation: e.target.checked}))} />
                  <div className="w-6 h-6 border-2 border-border rounded-lg peer-checked:bg-primary peer-checked:border-primary transition-all flex items-center justify-center">
                    <Check size={14} className="text-primary-foreground scale-0 peer-checked:scale-100 transition-transform" />
                  </div>
                </div>
                <span className="text-[11px] text-foreground font-medium leading-relaxed">
                   Je certifie sur l'honneur que l'entreprise mentionnée <span className="underline font-bold text-primary">existe réellement</span> et a formellement accepté de m'accueillir en tant que stagiaire {formData.stageType} pour la période indiquée.
                </span>
              </label>
              <div className="px-6 py-4 bg-card border-l-8 border-amber-500 rounded-r-2xl shadow-xl shadow-slate-200/50">
                <p className="text-[10px] text-amber-600 font-bold uppercase tracking-tight mb-1">Note importante</p>
                <p className="text-[11px] text-muted-foreground italic">Vous pouvez enregistrer votre demande en brouillon pour la modifier plus tard, ou l'envoyer directement pour validation.</p>
              </div>
              <label className="flex items-center gap-4 cursor-pointer group px-4">
                <div className="relative flex items-center">
                  <input type="checkbox" className="peer w-5 h-5 opacity-0 absolute cursor-pointer" checked={formData.consent} onChange={e => setFormData(prev => ({...prev, consent: e.target.checked}))} />
                  <div className="w-5 h-5 border-2 border-border rounded-lg peer-checked:bg-primary peer-checked:border-primary transition-all flex items-center justify-center">
                    <Check size={12} className="text-primary-foreground scale-0 peer-checked:scale-100 transition-transform" />
                  </div>
                </div>
                <span className="text-[11px] text-muted-foreground font-medium group-hover:text-foreground transition-colors">Je certifie l'exactitude des informations fournies.</span>
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
              {isAdmin && id ? (
                <Button type="submit" className="col-span-2 py-6 rounded-2xl uppercase text-[10px] tracking-[0.2em] font-bold shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 flex items-center justify-center gap-2">
                  <RefreshCw size={16} /> Mettre à jour les données
                </Button>
              ) : (
                <>
                  <Button type="button" onClick={(e) => onFormSubmit(e as any, true)} disabled={existingActiveConvention !== undefined && !id} variant="outline" className="py-6 rounded-2xl uppercase text-[10px] tracking-[0.2em] font-bold border-border hover:bg-secondary flex items-center justify-center gap-2">
                    <Save size={16} /> Enregistrer Brouillon
                  </Button>
                  <Button type="submit" disabled={existingActiveConvention !== undefined && !id} className="py-6 rounded-2xl uppercase text-[10px] tracking-[0.2em] font-bold shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 flex items-center justify-center gap-2">
                    <Send size={16} /> Envoyer Validation
                  </Button>
                </>
              )}
            </div>
          </div>
        </Card>
      </form>
      <AffirmationModal isOpen={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={() => handleConfirm(false)} companyName={formData.companyName} />
    </div>
  );
};
