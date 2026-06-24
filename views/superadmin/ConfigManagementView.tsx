
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Save, Plus, Trash2, Layout, 
  Layers, GraduationCap, Calendar, Info, AlertTriangle
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

export const ConfigManagementView = () => {
  const { systemConfig, updateSystemConfig, showAlert } = useAppContext();
  const navigate = useNavigate();
  const [localConfig, setLocalConfig] = useState(systemConfig);
  const [activeTab, setActiveTab] = useState<'academics' | 'structure' | 'entreprises'>('academics');

  const handleSave = () => {
    updateSystemConfig(localConfig);
    showAlert("Succès", "Configuration mise à jour avec succès.", "success");
  };

  const addItem = (listKey: keyof typeof localConfig) => {
    if (Array.isArray(localConfig[listKey])) {
      if (listKey === 'entreprises') {
        const newList = [...(localConfig.entreprises || []), { id: `ent_${Date.now()}`, name: "Nouvelle Entreprise", address: "Adresse..." }];
        setLocalConfig({ ...localConfig, entreprises: newList });
        return;
      }
      const newList = [...(localConfig[listKey] as string[]), "Nouvelle valeur..."];
      setLocalConfig({ ...localConfig, [listKey]: newList });
    }
  };

  const removeItem = (listKey: keyof typeof localConfig, index: number) => {
    if (Array.isArray(localConfig[listKey])) {
      const newList = [...(localConfig[listKey] as any[])];
      newList.splice(index, 1);
      setLocalConfig({ ...localConfig, [listKey]: newList });
    }
  };

  const updateItem = (listKey: keyof typeof localConfig, index: number, value: string | any) => {
    if (Array.isArray(localConfig[listKey])) {
      const newList = [...(localConfig[listKey] as any[])];
      if (listKey === 'entreprises') {
        newList[index] = { ...newList[index], ...value };
      } else {
        newList[index] = value;
      }
      setLocalConfig({ ...localConfig, [listKey]: newList });
    }
  };

  return (
    <div className="container mx-auto px-6 pt-12 pb-48 md:pb-56 max-w-5xl space-y-12 text-left animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-4">
          <button 
            onClick={() => {
              if (window.history.state && window.history.state.idx > 0) {
                navigate(-1);
              } else {
                navigate('/dashboard');
              }
            }}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-[10px] font-bold uppercase tracking-widest w-fit"
          >
            <ArrowLeft size={14} /> Retour
          </button>
          <h2 className="text-4xl text-foreground tracking-tighter uppercase font-medium">Configuration Système</h2>
          <p className="text-muted-foreground flex items-center gap-2">
            <Info size={16} className="text-primary" />
            Gérez les constantes globales utilisées dans les formulaires et les statistiques.
          </p>
        </div>
        <Button 
          onClick={handleSave} 
          className="w-full md:w-auto py-4 px-8 rounded-2xl uppercase text-[10px] tracking-widest font-bold shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 flex items-center justify-center gap-2"
        >
          <Save size={16} /> Enregistrer les modifications
        </Button>
      </header>

      <div className="bg-card/50 backdrop-blur-md p-1 rounded-2xl border border-border inline-flex mb-8">
        <button 
          onClick={() => setActiveTab('academics')}
          className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'academics' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:bg-background/40'}`}
        >
          <Calendar size={14} /> Académique
        </button>
        <button 
          onClick={() => setActiveTab('structure')}
          className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'structure' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:bg-background/40'}`}
        >
          <Layers size={14} /> Structure FST
        </button>
        <button 
          onClick={() => setActiveTab('entreprises')}
          className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'entreprises' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:bg-background/40'}`}
        >
          <Layout size={14} /> Entreprises
        </button>
      </div>

      <div className="space-y-12">
        {activeTab === 'academics' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="p-8 border-border rounded-[2rem] space-y-6">
              <div className="flex justify-between items-center border-b border-border pb-4">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Années Académiques</h3>
                <button onClick={() => addItem('academicYears')} className="p-2 hover:bg-primary/10 rounded-full transition-all text-primary"><Plus size={18} /></button>
              </div>
              <div className="space-y-3">
                {localConfig.academicYears.map((year, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input 
                      className="flex-1 bg-muted border border-border p-3 rounded-xl text-xs outline-none focus:border-primary" 
                      value={year} 
                      onChange={e => updateItem('academicYears', idx, e.target.value)}
                    />
                    <button onClick={() => removeItem('academicYears', idx)} className="p-3 text-destructive/40 hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-8 border-border rounded-[2rem] space-y-6">
              <div className="flex justify-between items-center border-b border-border pb-4">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Niveaux d'Études</h3>
                <button onClick={() => addItem('niveaux')} className="p-2 hover:bg-primary/10 rounded-full transition-all text-primary"><Plus size={18} /></button>
              </div>
              <div className="space-y-3">
                {localConfig.niveaux.map((niveau, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input 
                      className="flex-1 bg-muted border border-border p-3 rounded-xl text-xs outline-none focus:border-primary" 
                      value={niveau} 
                      onChange={e => updateItem('niveaux', idx, e.target.value)}
                    />
                    <button onClick={() => removeItem('niveaux', idx)} className="p-3 text-destructive/40 hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-8 border-border rounded-[2rem] space-y-6">
              <div className="flex justify-between items-center border-b border-border pb-4">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Semestres</h3>
                <button onClick={() => addItem('semestres')} className="p-2 hover:bg-primary/10 rounded-full transition-all text-primary"><Plus size={18} /></button>
              </div>
              <div className="space-y-3">
                {localConfig.semestres.map((sem, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input 
                      className="flex-1 bg-muted border border-border p-3 rounded-xl text-xs outline-none focus:border-primary" 
                      value={sem} 
                      onChange={e => updateItem('semestres', idx, e.target.value)}
                    />
                    <button onClick={() => removeItem('semestres', idx)} className="p-3 text-destructive/40 hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'structure' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="p-8 border-border rounded-[2rem] space-y-6">
              <div className="flex justify-between items-center border-b border-border pb-4">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Départements</h3>
                <button onClick={() => addItem('departments')} className="p-2 hover:bg-primary/10 rounded-full transition-all text-primary"><Plus size={18} /></button>
              </div>
              <div className="space-y-3">
                {localConfig.departments.map((dept, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input 
                      className="flex-1 bg-muted border border-border p-3 rounded-xl text-xs outline-none focus:border-primary" 
                      value={dept} 
                      onChange={e => updateItem('departments', idx, e.target.value)}
                    />
                    <button onClick={() => removeItem('departments', idx)} className="p-3 text-destructive/40 hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-8 border-border rounded-[2rem] space-y-6">
              <div className="flex justify-between items-center border-b border-border pb-4">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Filières</h3>
                <button onClick={() => addItem('filieres')} className="p-2 hover:bg-primary/10 rounded-full transition-all text-primary"><Plus size={18} /></button>
              </div>
              <div className="space-y-3">
                {localConfig.filieres.map((filiere, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input 
                      className="flex-1 bg-muted border border-border p-3 rounded-xl text-xs outline-none focus:border-primary" 
                      value={filiere} 
                      onChange={e => updateItem('filieres', idx, e.target.value)}
                    />
                    <button onClick={() => removeItem('filieres', idx)} className="p-3 text-destructive/40 hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'entreprises' && (
          <div className="space-y-8">
            <Card className="p-8 border-border rounded-[2rem] space-y-6">
              <div className="flex justify-between items-center border-b border-border pb-4">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Liste des Entreprises</h3>
                <button onClick={() => addItem('entreprises')} className="p-2 hover:bg-primary/10 rounded-full transition-all text-primary flex items-center gap-2 px-4 shadow-sm border border-primary/10">
                  <Plus size={18} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Nouvelle Entreprise</span>
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(localConfig.entreprises || []).map((ent, idx) => (
                  <div key={ent.id} className="bg-muted/50 p-6 rounded-2xl border border-border group relative transition-all hover:bg-card hover:shadow-md">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[8px] uppercase font-bold text-muted-foreground tracking-widest">Nom de l'entreprise</label>
                        <input 
                          className="w-full bg-card border border-border p-3 rounded-xl text-xs outline-none focus:border-primary font-bold" 
                          value={ent.name} 
                          onChange={e => updateItem('entreprises', idx, { name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] uppercase font-bold text-muted-foreground tracking-widest">Adresse / Siège</label>
                        <input 
                          className="w-full bg-card border border-border p-3 rounded-xl text-[11px] outline-none focus:border-primary" 
                          value={ent.address} 
                          onChange={e => updateItem('entreprises', idx, { address: e.target.value })}
                        />
                      </div>
                    </div>
                    <button 
                      onClick={() => removeItem('entreprises', idx)} 
                      className="absolute top-4 right-4 p-2 text-destructive/30 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>

      <div className="p-6 bg-amber-50 border border-amber-200 rounded-[2rem] flex items-start gap-4">
        <AlertTriangle className="text-amber-600 shrink-0" size={24} />
        <div className="space-y-1">
          <p className="text-xs font-bold text-amber-900 uppercase tracking-tight">Zone d'influence directe</p>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            Modifier ces valeurs impactera immédiatement tous les nouveaux formulaires et les filtres de recherche. Assurez-vous qu'aucune convention en cours n'utilise une valeur que vous vous apprêtez à supprimer.
          </p>
        </div>
      </div>
    </div>
  );
};
