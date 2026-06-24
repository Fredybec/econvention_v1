import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronRight, CheckCircle, FileText, QrCode, 
  ArrowRight, MousePointer2, Plus, Send, 
  Search, Download, ShieldCheck, HelpCircle,
  ChevronLeft, AlertTriangle, Edit, Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

const STEPS = [
  {
    id: 'step-1',
    title: "Initialisation du dossier",
    icon: <Plus className="text-primary" />,
    description: "Une fois l'accord de l'entreprise obtenu, remplissez le formulaire de demande. Vous pouvez l'enregistrer en tant que brouillon (accessible à votre encadrant pour relecture) ou le soumettre directement.",
    focus: "Le brouillon permet un échange avec votre encadrant avant le lancement officiel du circuit.",
    tip: "Vérifiez bien les dates et le SIRET avant la soumission finale.",
    spotlight: { x: '50%', y: '70%', size: '120px' }
  },
  {
    id: 'step-2',
    title: "Circuit Administratif",
    icon: <Activity className="text-emerald-600" />,
    description: "Après soumission, votre dossier entre dans un circuit de validation multi-services. Surveillez régulièrement votre compte pour toute mise à jour ou demande d'intervention.",
    warning: "Une fois envoyé à l'administration, le formulaire ne peut plus être modifié. Les modifications ne sont possibles qu'en mode brouillon.",
    focus: "Chaque service (Filière, Recherche, Scolarité) doit valider son étape.",
    tip: "Surveillez régulièrement votre compte pour toute mise à jour ou demande d'intervention.",
    spotlight: { x: '50%', y: '35%', size: '100px' }
  },
  {
    id: 'step-3',
    title: "Interventions & Compléments",
    icon: <ShieldCheck className="text-amber-600" />,
    description: "Il peut vous être demandé de déposer un document physique à la Scolarité, d'ajouter des informations ou d'uploader une pièce manquante (ex: assurance).",
    focus: "Répondez rapidement aux demandes de 'Complément Requis' pour ne pas bloquer le circuit.",
    tip: "Lisez les commentaires dans l'historique pour comprendre ce qui est attendu.",
    spotlight: { x: '80%', y: '50%', size: '90px' }
  },
  {
    id: 'step-4',
    title: "Signature & Dépôt Physique",
    icon: <Stamp className="text-blue-600" />,
    description: "Une fois validée, vous devez télécharger votre convention, l'imprimer et la signer (par vous-même et l'entreprise). Re-scannez le document signé, uploadez-le sur la plateforme, puis déposez l'original papier au Service Stage.",
    focus: "Cette étape est cruciale pour l'édition finale de votre convention officielle.",
    tip: "Assurez-vous que les signatures sont bien lisibles sur votre scan.",
    spotlight: { x: '50%', y: '50%', size: '100px' }
  },
  {
    id: 'step-5',
    title: "Retrait & Clôture",
    icon: <FileText className="text-purple-600" />,
    description: "Une fois que tout le circuit a validé votre dossier, attendez que le statut passe à 'Prête pour retrait'. Vous pourrez alors vous rendre au Service Stage pour récupérer votre exemplaire officiel.",
    focus: "C'est l'étape finale où vous obtenez votre document physique dûment signé par le Doyen.",
    tip: "Vérifiez les horaires d'ouverture du Service Stage avant de vous déplacer.",
    spotlight: { x: '50%', y: '45%', size: '140px' }
  }
];

import { MessageSquare, Activity, Stamp, Check } from 'lucide-react';

export const GuideView = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="container mx-auto px-6 pt-12 pb-48 md:pb-56 max-w-5xl space-y-12 text-left animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-4">
          <button 
            onClick={() => navigate('/dashboard')} 
            className="text-[10px] text-muted-foreground uppercase tracking-widest hover:text-primary font-bold transition-colors group flex items-center gap-2"
          >
            <ChevronLeft size={14} className="transition-transform group-hover:-translate-x-1" /> Retour au Dashboard
          </button>
          <h2 className="text-4xl md:text-6xl text-foreground tracking-tighter uppercase font-black leading-none">
            Comment utiliser <br /> <span className="text-primary">e-Convention ?</span>
          </h2>
          <p className="text-muted-foreground text-sm font-bold uppercase tracking-[0.2em]">Guide Interactif pas à pas</p>
        </div>
        
        <div className="hidden md:flex gap-2">
          {STEPS.map((_, idx) => (
            <div 
              key={idx} 
              className={`h-1 w-12 rounded-full transition-all duration-500 ${idx <= currentStep ? 'bg-primary' : 'bg-secondary'}`} 
            />
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Step Content */}
        <div className="lg:col-span-7 space-y-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="space-y-8"
            >
              <div className="flex items-center gap-6">
                <motion.div 
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="w-20 h-20 bg-primary/10 rounded-[2rem] flex items-center justify-center shadow-inner"
                >
                  {React.cloneElement(STEPS[currentStep].icon as React.ReactElement, { size: 36 })}
                </motion.div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest">Étape {currentStep + 1} sur {STEPS.length}</span>
                  <h3 className="text-3xl font-black text-foreground uppercase tracking-tight">{STEPS[currentStep].title}</h3>
                </div>
              </div>

              <p className="text-xl text-muted-foreground leading-relaxed font-medium">
                {STEPS[currentStep].description}
              </p>

              {STEPS[currentStep].warning && (
                <div className="bg-white border border-amber-200 p-4 rounded-2xl flex items-start gap-3 shadow-sm">
                  <AlertTriangle className="text-amber-600 shrink-0" size={18} />
                  <p className="text-sm font-bold text-amber-900">{STEPS[currentStep].warning}</p>
                </div>
              )}

              <Card className="p-8 bg-secondary border-0 rounded-[2.5rem] space-y-4 relative overflow-hidden">
                <motion.div 
                  className="absolute inset-0 bg-primary/5 pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                />
                <div className="flex items-start gap-4 relative z-10">
                  <div className="p-2 bg-card rounded-xl shadow-sm">
                    <MousePointer2 size={18} className="text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Point d'attention</p>
                    <p className="text-sm font-bold text-foreground">{STEPS[currentStep].focus}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 relative z-10">
                  <div className="p-2 bg-amber-500/10 rounded-xl">
                    <HelpCircle size={18} className="text-amber-600" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Astuce Pro</p>
                    <p className="text-sm font-medium text-muted-foreground italic">{STEPS[currentStep].tip}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center gap-4 pt-4">
            <Button 
              onClick={prevStep} 
              disabled={currentStep === 0}
              variant="outline"
              className="py-6 px-8 rounded-2xl border-2 border-border hover:border-primary disabled:opacity-30 transition-all font-bold uppercase tracking-widest text-[10px]"
            >
              Précédent
            </Button>
            {currentStep < STEPS.length - 1 ? (
              <Button 
                onClick={nextStep}
                className="flex-1 py-6 px-8 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl shadow-primary/20 font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
              >
                Étape Suivante <ArrowRight size={16} />
              </Button>
            ) : (
              <Button 
                onClick={() => navigate('/dashboard')}
                className="flex-1 py-6 px-8 rounded-2xl bg-foreground text-background shadow-xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
              >
                Prêt à commencer <CheckCircle size={16} />
              </Button>
            )}
          </div>
        </div>

        {/* Visual Illustration / Preview */}
        <div className="lg:col-span-5 relative">
          <div className="absolute inset-0 bg-primary/5 blur-[100px] rounded-full" />
          <motion.div
            key={currentStep}
            initial={{ scale: 0.9, opacity: 0, rotate: -2 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ duration: 0.5 }}
            className="relative z-10"
          >
            <Card className="p-4 bg-card border-0 shadow-2xl rounded-[3rem] overflow-hidden relative">
              {/* Spotlight Effect */}
              <motion.div 
                className="absolute inset-0 z-20 pointer-events-none bg-black/40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  maskImage: `radial-gradient(circle ${STEPS[currentStep].spotlight.size} at ${STEPS[currentStep].spotlight.x} ${STEPS[currentStep].spotlight.y}, transparent 80%, black 100%)`,
                  WebkitMaskImage: `radial-gradient(circle ${STEPS[currentStep].spotlight.size} at ${STEPS[currentStep].spotlight.x} ${STEPS[currentStep].spotlight.y}, transparent 80%, black 100%)`
                }}
              />
              
              <div className="aspect-[4/5] bg-secondary rounded-[2.5rem] flex items-center justify-center p-8 overflow-hidden">
                 {/* Dynamic Illustration based on step */}
                 {currentStep === 0 && (
                   <div className="space-y-6 w-full animate-in slide-in-from-bottom-8">
                     <div className="flex items-center gap-2 mb-4">
                       <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
                         <Plus size={16} />
                       </div>
                       <div className="h-4 w-32 bg-border rounded-full" />
                     </div>
                     <div className="space-y-4">
                       <div className="space-y-2">
                         <div className="h-2 w-20 bg-border rounded-full" />
                         <div className="h-10 w-full bg-card rounded-xl shadow-sm border border-border" />
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                           <div className="h-2 w-16 bg-border rounded-full" />
                           <div className="h-10 w-full bg-card rounded-xl shadow-sm border border-border" />
                         </div>
                         <div className="space-y-2">
                           <div className="h-2 w-16 bg-border rounded-full" />
                           <div className="h-10 w-full bg-card rounded-xl shadow-sm border border-border" />
                         </div>
                       </div>
                       <div className="space-y-2">
                         <div className="h-2 w-24 bg-border rounded-full" />
                         <div className="h-20 w-full bg-card rounded-xl shadow-sm border border-border" />
                       </div>
                     </div>
                     <div className="h-12 w-full bg-primary rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center text-primary-foreground font-bold text-[10px] uppercase tracking-widest">
                       Soumettre le dossier
                     </div>
                   </div>
                 )}
                 {currentStep === 1 && (
                   <div className="w-full space-y-6">
                     <div className="flex justify-between items-center mb-2">
                       <div className="h-5 w-32 bg-border rounded-full" />
                       <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                         <Plus size={14} />
                       </div>
                     </div>
                     <div className="p-6 bg-card rounded-3xl shadow-xl border border-border space-y-4 relative overflow-hidden">
                       <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                       <div className="flex justify-between items-start">
                         <div className="space-y-2">
                           <div className="h-3 w-40 bg-foreground font-bold rounded-full" />
                           <div className="flex gap-2">
                             <div className="h-2 w-12 bg-secondary rounded-full" />
                             <div className="h-2 w-12 bg-secondary rounded-full" />
                           </div>
                         </div>
                         <div className="px-3 py-1 bg-amber-500/10 text-amber-600 text-[8px] font-bold uppercase rounded-full">
                           En attente
                         </div>
                       </div>
                       <div className="pt-2">
                         <div className="flex justify-between text-[8px] mb-1 font-bold uppercase text-muted-foreground">
                           <span>Progression</span>
                           <span>25%</span>
                         </div>
                         <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                           <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: '25%' }}
                             transition={{ duration: 1, delay: 0.5 }}
                             className="h-full bg-primary" 
                           />
                         </div>
                       </div>
                     </div>
                     <div className="p-6 bg-card rounded-3xl shadow-md border border-border opacity-40 scale-95">
                        <div className="h-3 w-32 bg-border rounded-full" />
                     </div>
                   </div>
                 )}
                 {currentStep === 2 && (
                   <div className="w-full space-y-6">
                     <div className="flex gap-3 items-start">
                       <div className="w-8 h-8 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-600 shrink-0">
                         <AlertTriangle size={14} />
                       </div>
                       <div className="p-4 bg-card rounded-2xl rounded-tl-none shadow-md border border-amber-500/20">
                         <p className="text-[10px] font-bold text-amber-600 mb-1">Scolarité</p>
                         <p className="text-[10px] text-muted-foreground leading-tight">
                           Votre carte nationale est expirée et votre diplôme n'est pas conforme. Veuillez uploader les versions à jour.
                         </p>
                       </div>
                     </div>
                     <div className="flex justify-end pt-4">
                       <div className="flex items-center gap-3 p-3 bg-primary text-primary-foreground rounded-2xl shadow-lg shadow-primary/20 animate-pulse">
                         <Upload size={16} />
                         <span className="text-[10px] font-bold uppercase tracking-widest">Uploader le document</span>
                       </div>
                     </div>
                   </div>
                 )}
                 {currentStep === 3 && (
                    <div className="w-full space-y-6">
                      <div className="flex justify-center mb-4">
                        <div className="p-4 bg-blue-500/10 rounded-full text-blue-600 animate-bounce">
                          <Stamp size={32} />
                        </div>
                      </div>
                      <div className="p-6 bg-card rounded-3xl shadow-xl border border-blue-100 space-y-4">
                        <div className="flex justify-between items-center border-b border-border pb-2">
                          <div className="h-3 w-32 bg-secondary rounded-full" />
                          <Edit size={16} className="text-blue-500" />
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded border-2 border-primary flex items-center justify-center">
                              <Check size={8} className="text-primary" />
                            </div>
                            <div className="h-2 w-24 bg-border rounded-full" />
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded border-2 border-border" />
                            <div className="h-2 w-32 bg-border rounded-full" />
                          </div>
                        </div>
                        <div className="pt-4 flex justify-end gap-2 text-blue-600">
                           <Upload size={14} /> <span className="text-[10px] font-bold">Uploader Scan</span>
                        </div>
                      </div>
                    </div>
                  )}
                 {currentStep === 4 && (
                   <div className="w-full flex flex-col items-center space-y-6">
                     <motion.div 
                       initial={{ y: 20, opacity: 0 }}
                       animate={{ y: 0, opacity: 1 }}
                       className="w-48 h-64 bg-card rounded-xl shadow-2xl border border-border p-6 space-y-4 relative"
                     >
                       <div className="flex justify-between items-center border-b border-border pb-2">
                         <div className="h-2 w-16 bg-border rounded-full" />
                         <QrCode size={20} className="text-foreground" />
                       </div>
                       <div className="space-y-2">
                         <div className="h-1.5 w-full bg-secondary rounded-full" />
                         <div className="h-1.5 w-full bg-secondary rounded-full" />
                         <div className="h-1.5 w-3/4 bg-secondary rounded-full" />
                       </div>
                       <div className="pt-12 flex justify-between gap-4">
                         <div className="flex-1 h-8 border border-dashed border-border rounded flex items-center justify-center">
                           <div className="h-1 w-8 bg-secondary" />
                         </div>
                         <div className="flex-1 h-8 border border-dashed border-border rounded flex items-center justify-center">
                           <div className="h-1 w-8 bg-secondary" />
                         </div>
                       </div>
                       <div className="absolute -bottom-3 -right-3 w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg border-4 border-card">
                         <CheckCircle size={24} />
                       </div>
                     </motion.div>
                     <div className="flex gap-4">
                     </div>
                   </div>
                 )}
              </div>
            </Card>
          </motion.div>
        </div>
      </div>

      <footer className="pt-12 border-t border-border flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-secondary rounded-2xl flex items-center justify-center text-muted-foreground">
            <HelpCircle size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground uppercase tracking-tight">Encore un doute ?</p>
            <p className="text-xs text-muted-foreground">Contactez le support technique via le portail.</p>
          </div>
        </div>
        <Button 
          onClick={() => navigate('/dashboard')}
          variant="ghost"
          className="text-primary font-bold uppercase tracking-widest text-[10px] hover:bg-primary/10 px-8 py-4 rounded-2xl"
        >
          Accéder à mon Dashboard
        </Button>
      </footer>
    </div>
  );
};
