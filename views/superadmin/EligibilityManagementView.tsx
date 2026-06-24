import React, { useState, useMemo } from 'react';
import { 
  Shield, 
  Search, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  UserCheck,
  Settings,
  Filter,
  ArrowRight,
  Info,
  Save,
  RefreshCw,
  X,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../../context/AppContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Role, EligibilityCriteria, EligibilityOverride, StageType, ConventionNature } from '../../types';
import { useNavigate } from 'react-router-dom';

export const EligibilityManagementView = () => {
  const navigate = useNavigate();
  const { 
    eligibilityCriteria, 
    addEligibilityCriteria,
    removeEligibilityCriteria,
    updateEligibilityCriteria, 
    eligibilityOverrides, 
    addEligibilityOverride, 
    removeEligibilityOverride,
    users,
    showAlert
  } = useAppContext();

  const [activeTab, setActiveTab] = useState<'criteria' | 'overrides'>('criteria');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingOverride, setIsAddingOverride] = useState(false);
  const [newOverride, setNewOverride] = useState({ studentId: '', reason: '', type: StageType.PFE, nature: ConventionNature.RECHERCHE });

  const [isCriteriaModalOpen, setIsCriteriaModalOpen] = useState(false);
  const [editingCriteria, setEditingCriteria] = useState<EligibilityCriteria | null>(null);
  const [criteriaFormData, setCriteriaFormData] = useState({
    type: StageType.PFE,
    nature: ConventionNature.RECHERCHE,
    description: '',
    levels: [] as string[],
    isActive: true
  });
  const [newLevel, setNewLevel] = useState('');

  const handleOpenCriteriaModal = (criteria?: EligibilityCriteria) => {
    if (criteria) {
      setEditingCriteria(criteria);
      setCriteriaFormData({
        type: criteria.type,
        nature: criteria.nature,
        description: criteria.description,
        levels: [...criteria.levels],
        isActive: criteria.isActive
      });
    } else {
      setEditingCriteria(null);
      setCriteriaFormData({
        type: StageType.PFE,
        nature: ConventionNature.RECHERCHE,
        description: '',
        levels: [],
        isActive: true
      });
    }
    setIsCriteriaModalOpen(true);
  };

  const handleSaveCriteria = () => {
    if (!criteriaFormData.description || criteriaFormData.levels.length === 0) {
      showAlert("Erreur", "Veuillez remplir la description et ajouter au moins un niveau.", "error");
      return;
    }

    if (editingCriteria) {
      updateEligibilityCriteria(editingCriteria.id, criteriaFormData);
      showAlert("Succès", "Critère mis à jour.", "success");
    } else {
      addEligibilityCriteria(criteriaFormData);
      showAlert("Succès", "Nouveau critère ajouté.", "success");
    }
    setIsCriteriaModalOpen(false);
  };

  const addLevel = () => {
    if (newLevel && !criteriaFormData.levels.includes(newLevel)) {
      setCriteriaFormData(prev => ({ ...prev, levels: [...prev.levels, newLevel] }));
      setNewLevel('');
    }
  };

  const removeLevel = (level: string) => {
    setCriteriaFormData(prev => ({ ...prev, levels: prev.levels.filter(l => l !== level) }));
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.roles?.includes(Role.STUDENT) && 
      (u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
       u.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [users, searchTerm]);

  const handleToggleCriteria = (id: string, currentStatus: boolean) => {
    updateEligibilityCriteria(id, { isActive: !currentStatus });
    showAlert("Succès", `Critère ${!currentStatus ? 'activé' : 'désactivé'} avec succès.`, "success");
  };

  const handleAddOverride = () => {
    if (!newOverride.studentId || !newOverride.reason) {
      showAlert("Erreur", "Veuillez remplir tous les champs.", "error");
      return;
    }
    
    // Check if student exists
    const student = users.find(u => u.id === newOverride.studentId || u.email === newOverride.studentId);
    if (!student) {
      showAlert("Erreur", "Étudiant non trouvé.", "error");
      return;
    }

    addEligibilityOverride({
      studentId: student.id,
      studentName: student.name,
      reason: newOverride.reason,
      type: newOverride.type,
      nature: newOverride.nature
    });

    setNewOverride({ studentId: '', reason: '', type: StageType.PFE, nature: ConventionNature.RECHERCHE });
    setIsAddingOverride(false);
    showAlert("Succès", "Autorisation manuelle ajoutée.", "success");
  };

  return (
    <div className="container mx-auto px-6 pt-12 pb-48 md:pb-56 max-w-7xl space-y-12 text-left animate-in fade-in duration-500">
      <header className="space-y-4">
        <button 
          onClick={() => {
            if (window.history.state && window.history.state.idx > 0) {
              navigate(-1);
            } else {
              navigate('/dashboard');
            }
          }}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-[10px] font-bold uppercase tracking-widest"
        >
          <ArrowLeft size={14} /> Retour
        </button>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Shield className="text-primary" size={20} />
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Administration Suprême</p>
          </div>
          <h2 className="text-4xl md:text-5xl text-foreground tracking-tighter uppercase font-medium">Gestion de l'Éligibilité</h2>
          <p className="text-muted-foreground max-w-2xl">
            Définissez les critères automatiques d'éligibilité pour les PFE/PFA et gérez les autorisations manuelles pour les cas particuliers.
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-muted w-fit rounded-2xl border border-border">
        <button 
          onClick={() => setActiveTab('criteria')}
          className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'criteria' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Settings size={14} className="inline-block mr-2" />
          Critères Automatiques
        </button>
        <button 
          onClick={() => setActiveTab('overrides')}
          className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'overrides' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <UserCheck size={14} className="inline-block mr-2" />
          Autorisations Manuelles
        </button>
      </div>

      {activeTab === 'criteria' ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {eligibilityCriteria.map((criteria) => (
              <Card key={criteria.id} className="p-6 bg-card border-border rounded-3xl shadow-sm space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-2">
                      <Badge variant={criteria.type === StageType.PFE ? 'primary' : 'secondary'} className="uppercase tracking-widest text-[8px]">
                        {criteria.type}
                      </Badge>
                      <Badge variant="outline" className="uppercase tracking-widest text-[8px] border-primary/20 text-primary">
                        {criteria.nature}
                      </Badge>
                    </div>
                    <button 
                      onClick={() => handleToggleCriteria(criteria.id, criteria.isActive)}
                      className={`w-12 h-6 rounded-full p-1 transition-colors ${criteria.isActive ? 'bg-primary' : 'bg-muted'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${criteria.isActive ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground uppercase tracking-tight">{criteria.description}</h4>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {criteria.levels.map(level => (
                        <span key={level} className="text-[9px] font-bold bg-muted px-2 py-0.5 rounded-md text-muted-foreground uppercase">
                          {level}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t border-border flex items-center justify-between">
                  <span className={`text-[9px] font-black uppercase tracking-widest ${criteria.isActive ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {criteria.isActive ? 'Actif' : 'Inactif'}
                  </span>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleOpenCriteriaModal(criteria)}
                      className="h-8 text-[9px] uppercase tracking-widest font-bold"
                    >
                      Modifier
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => removeEligibilityCriteria(criteria.id)}
                      className="h-8 text-[9px] uppercase tracking-widest font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
            
            <Card 
              onClick={() => handleOpenCriteriaModal()}
              className="p-6 border-2 border-dashed border-border bg-transparent rounded-3xl flex flex-col items-center justify-center text-center space-y-4 hover:border-primary/50 transition-colors cursor-pointer group"
            >
              <div className="p-4 bg-muted rounded-full group-hover:scale-110 transition-transform">
                <Plus className="text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-foreground">Ajouter un Critère</p>
                <p className="text-[10px] text-muted-foreground mt-1">Définir une nouvelle règle automatique</p>
              </div>
            </Card>
          </div>

          <div className="p-6 bg-amber-700 border-none rounded-3xl flex gap-4 items-start shadow-lg shadow-amber-500/20">
            <div className="p-2 bg-white/20 rounded-xl text-white">
              <Info size={20} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white uppercase tracking-tight">Comment ça marche ?</h4>
              <p className="text-xs text-amber-50 leading-relaxed">
                Les critères automatiques vérifient le champ <strong>Niveau Actuel</strong> de l'étudiant. Si le niveau de l'étudiant correspond à l'un des niveaux définis dans un critère actif, il sera autorisé à créer une convention du type correspondant (PFE ou PFA).
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input 
                type="text" 
                placeholder="Rechercher un étudiant par nom ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-card border border-border rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <Button 
              onClick={() => setIsAddingOverride(true)}
              className="w-full md:w-auto py-3 px-6 rounded-2xl uppercase text-[10px] tracking-widest font-black"
            >
              <Plus size={16} className="mr-2" /> Autoriser un Étudiant
            </Button>
          </div>

          {isAddingOverride && (
            <Card className="p-8 bg-card border-2 border-primary/20 rounded-3xl space-y-6 animate-in slide-in-from-top-4 duration-300">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold uppercase tracking-tight">Nouvelle Autorisation Manuelle</h3>
                <button 
                  onClick={() => setIsAddingOverride(false)} 
                  className="p-2 hover:bg-red-50 rounded-xl transition-all group flex items-center justify-center"
                  aria-label="Fermer"
                >
                  <X size={24} strokeWidth={2.5} className="text-red-500 group-hover:text-red-600 shrink-0" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Sélectionner l'Étudiant</label>
                  <select 
                    value={newOverride.studentId}
                    onChange={(e) => setNewOverride(prev => ({ ...prev, studentId: e.target.value }))}
                    className="w-full p-4 bg-muted/50 border border-border rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option key="student-none" value="">Choisir un étudiant...</option>
                    {users.filter(u => u.roles?.includes(Role.STUDENT)).map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Type de Stage</label>
                  <div className="flex gap-2">
                    {Object.values(StageType).map(type => (
                      <button
                        key={type}
                        onClick={() => setNewOverride(prev => ({ ...prev, type: type as StageType }))}
                        className={`flex-1 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest border-2 transition-all ${newOverride.type === type ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/30'}`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Nature de Validation</label>
                  <div className="flex gap-2">
                    {Object.values(ConventionNature).map(nature => (
                      <button
                        key={nature}
                        onClick={() => setNewOverride(prev => ({ ...prev, nature: nature as ConventionNature }))}
                        className={`flex-1 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest border-2 transition-all ${newOverride.nature === nature ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/30'}`}
                      >
                        {nature}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Motif de l'Autorisation</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Cas exceptionnel..."
                    value={newOverride.reason}
                    onChange={(e) => setNewOverride(prev => ({ ...prev, reason: e.target.value }))}
                    className="w-full p-4 bg-muted/50 border border-border rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setIsAddingOverride(false)} className="rounded-xl uppercase text-[10px] font-bold tracking-widest">Annuler</Button>
                <Button onClick={handleAddOverride} className="rounded-xl uppercase text-[10px] font-black tracking-widest px-8">Valider l'Autorisation</Button>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-4">
            {eligibilityOverrides.length > 0 ? (
              eligibilityOverrides.map((override) => (
                <Card key={override.id} className="p-6 bg-card border-border rounded-3xl shadow-sm hover:shadow-md transition-all group">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-lg">
                        {override.studentName[0]}
                      </div>
                      <div>
                        <h4 className="font-bold text-foreground uppercase tracking-tight">{override.studentName}</h4>
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">ID: {override.studentId}</p>
                          <Badge variant={override.type === StageType.PFE ? 'primary' : 'secondary'} className="text-[7px] py-0 px-1.5 h-4">
                            {override.type}
                          </Badge>
                          <Badge variant="outline" className="text-[7px] py-0 px-1.5 h-4 border-primary/20 text-primary">
                            {override.nature}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 md:px-8">
                      <div className="flex items-center gap-2 text-amber-700 mb-1">
                        <AlertCircle size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Motif</span>
                      </div>
                      <p className="text-xs text-muted-foreground italic">"{override.reason}"</p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Autorisé par {override.authorizedBy}</p>
                      <p className="text-[9px] text-muted-foreground">{new Date(override.authorizedAt).toLocaleDateString()}</p>
                    </div>
                    <button 
                      onClick={() => removeEligibilityOverride(override.id)}
                      className="p-3 text-rose-500 hover:bg-rose-50 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </Card>
              ))
            ) : (
              <div className="py-24 text-center space-y-4 bg-muted/20 rounded-[40px] border-2 border-dashed border-border">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto">
                  <UserCheck size={32} className="text-muted-foreground opacity-20" />
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-bold text-foreground uppercase tracking-tight">Aucune autorisation manuelle</p>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">Tous les étudiants sont actuellement soumis aux critères automatiques définis.</p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setIsAddingOverride(true)}
                  className="rounded-2xl uppercase text-[10px] font-black tracking-widest px-8 mt-4"
                >
                  Ajouter la première
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Criteria Modal */}
      <AnimatePresence>
        {isCriteriaModalOpen && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsCriteriaModalOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-card rounded-[2.5rem] shadow-2xl overflow-hidden border border-border"
            >
              <div className="p-8 space-y-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-foreground uppercase tracking-tight">
                      {editingCriteria ? 'Modifier le Critère' : 'Nouveau Critère'}
                    </h3>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Définir les règles d'éligibilité</p>
                  </div>
                  <button 
                    onClick={() => setIsCriteriaModalOpen(false)} 
                    className="p-2 hover:bg-red-50 text-red-500 hover:text-red-600 rounded-full transition-all flex items-center justify-center"
                    aria-label="Fermer"
                  >
                    <X size={24} strokeWidth={2.5} className="shrink-0" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Type de Convention</label>
                    <div className="flex gap-2">
                      {Object.values(StageType).map(type => (
                        <button
                          key={type}
                          onClick={() => setCriteriaFormData(prev => ({ ...prev, type: type as StageType }))}
                          className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest border-2 transition-all ${criteriaFormData.type === type ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/30'}`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Nature de Validation (Vice-Doyen)</label>
                    <div className="flex gap-2">
                      {Object.values(ConventionNature).map(nature => (
                        <button
                          key={nature}
                          onClick={() => setCriteriaFormData(prev => ({ ...prev, nature: nature as ConventionNature }))}
                          className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest border-2 transition-all ${criteriaFormData.nature === nature ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/30'}`}
                        >
                          {nature}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Description</label>
                    <input 
                      required 
                      placeholder="Ex: Étudiants en 3ème année de Licence"
                      className="w-full p-3 bg-muted border border-border rounded-xl outline-none focus:border-primary text-foreground text-xs" 
                      value={criteriaFormData.description} 
                      onChange={e => setCriteriaFormData({...criteriaFormData, description: e.target.value})} 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Niveaux Concernés</label>
                    <div className="flex gap-2">
                      <input 
                        placeholder="Ex: LST-3"
                        className="flex-1 p-3 bg-muted border border-border rounded-xl outline-none focus:border-primary text-foreground text-xs" 
                        value={newLevel} 
                        onChange={e => setNewLevel(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && addLevel()}
                      />
                      <Button onClick={addLevel} variant="outline" className="rounded-xl px-4">
                        <Plus size={16} />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {criteriaFormData.levels.map(level => (
                        <Badge key={level} className="bg-primary/10 text-primary border-primary/20 pr-1 flex items-center gap-1">
                          {level}
                          <button onClick={() => removeLevel(level)} className="hover:bg-primary/20 rounded-full p-0.5">
                            <X size={10} />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button 
                      onClick={() => setCriteriaFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
                      className={`w-10 h-5 rounded-full p-1 transition-colors ${criteriaFormData.isActive ? 'bg-primary' : 'bg-muted'}`}
                    >
                      <div className={`w-3 h-3 rounded-full bg-white transition-transform ${criteriaFormData.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Critère Actif</span>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <Button onClick={() => setIsCriteriaModalOpen(false)} variant="outline" className="flex-1 py-4 rounded-xl uppercase text-[10px] tracking-widest font-bold">Annuler</Button>
                  <Button onClick={handleSaveCriteria} className="flex-1 py-4 rounded-xl uppercase text-[10px] tracking-widest font-bold shadow-lg">Enregistrer</Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
