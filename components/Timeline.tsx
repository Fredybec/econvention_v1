import React from "react";
import { WorkflowStatus, PFERecord, Role } from "../types";
import { STEPS } from "../utils/workflowConstants";
import { motion, AnimatePresence } from "motion/react";
import { Check, Clock, AlertCircle, X, ChevronDown } from "lucide-react";
import { Card } from "./ui/Card";
import { useAppContext } from "../context/AppContext";

interface TimelineProps {
  currentStatus: WorkflowStatus;
  record?: PFERecord;
}

export const Timeline: React.FC<TimelineProps> = ({
  currentStatus,
  record,
}) => {
  const { currentUser } = useAppContext();
  const [isExpanded, setIsExpanded] = React.useState(false);

  const isStudent = currentUser?.roles?.includes(Role.STUDENT);

  let effectiveStatus = currentStatus;
  if (currentStatus === WorkflowStatus.COMPLEMENT_REQUIRED && record) {
    const lastNormalStatus = [...record.history]
      .reverse()
      .find((h) => STEPS.some((s) => s.status === h.status))?.status;
    if (lastNormalStatus) effectiveStatus = lastNormalStatus;
  }

  const getStepIndex = (status: WorkflowStatus) => {
    switch (status) {
      case WorkflowStatus.DRAFT:
      case WorkflowStatus.PENDING_RESPONSABLE:
      case WorkflowStatus.PENDING_INSURANCE:
        return 0;
      case WorkflowStatus.PENDING_SCOLARITE:
      case WorkflowStatus.PENDING_SERVICE_RECHERCHE:
        return 1;
      case WorkflowStatus.PENDING_VICE_DOYEN_PEDAGOGIE:
      case WorkflowStatus.PENDING_VICE_DOYEN_RECHERCHE:
        return 2;
      case WorkflowStatus.PENDING_STUDENT_SIGNATURE:
      case WorkflowStatus.PENDING_FINAL_CHECK:
      case WorkflowStatus.PENDING_TRANSFER_SERVICE_STAGE:
        return 3;
      case WorkflowStatus.PENDING_TRANSFER_DOYEN:
      case WorkflowStatus.PENDING_DOYEN_SIGNATURE:
      case WorkflowStatus.SIGNED_EN_ROUTE:
        return 4;
      case WorkflowStatus.READY_FOR_PICKUP:
      case WorkflowStatus.COMPLETED:
        return 5;
      default:
        return 0;
    }
  };

  let currentStepIndex = getStepIndex(effectiveStatus);
  const isCancelled = currentStatus === WorkflowStatus.CANCELLED;
  const isRejected = currentStatus === WorkflowStatus.REJECTED;
  const isCompleted = currentStatus === WorkflowStatus.COMPLETED;
  const isComplement = currentStatus === WorkflowStatus.COMPLEMENT_REQUIRED;
  const isInsurance = currentStatus === WorkflowStatus.PENDING_INSURANCE;
  const isSignature = currentStatus === WorkflowStatus.PENDING_STUDENT_SIGNATURE;
  const isTransfer = currentStatus === WorkflowStatus.PENDING_TRANSFER_SERVICE_STAGE;
  const isPickup = currentStatus === WorkflowStatus.READY_FOR_PICKUP;
  const isActionRequired = (isComplement || isInsurance || isSignature || isTransfer || isPickup) && isStudent;

  const complementHistoryEntry = record?.history ? [...record.history].reverse().find(h => h.status === WorkflowStatus.COMPLEMENT_REQUIRED && h.comment) : null;
  const complementComment = complementHistoryEntry?.comment;

  const getStepStatus = (index: number) => {
    if (index < currentStepIndex) return "completed";
    if (index === currentStepIndex) {
      if (isCompleted) return "completed";
      if (isCancelled || isRejected) return "cancelled";
      if (isComplement || isInsurance || isSignature || isTransfer || isPickup) return "warning";
      return "active";
    }
    return "pending";
  };

  const [isHistoryExpanded, setIsHistoryExpanded] = React.useState(false);

  if (currentStepIndex === -1 && !isCancelled && !isRejected) currentStepIndex = 0;

  const currentStep = STEPS[currentStepIndex] || STEPS[0];
  const progress = isCompleted ? 100 : Math.round(((currentStepIndex + 1) / (STEPS.length + 1)) * 100);

  return (
    <div className={`w-full space-y-8 md:space-y-12 p-4 sm:p-8 rounded-[2rem] md:rounded-[3rem] transition-all duration-500 ${isActionRequired ? 'bg-orange-500/5 ring-2 ring-orange-500/20' : ''}`}>
      {isActionRequired && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border-border border-l-8 border-l-orange-500 p-6 rounded-[2rem] flex items-start gap-4 text-foreground shadow-xl shadow-slate-200/50"
        >
          <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/20">
            <AlertCircle size={24} strokeWidth={3} />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-black uppercase tracking-tight text-orange-600">
              {isComplement ? "Action Requise : Complément d'information" :
               isInsurance ? "Action Requise : Attestation d'assurance" :
               isSignature ? "Action Requise : Signature de la convention" :
               isTransfer ? "Action Requise : Dépôt physique de la convention" :
               "Action Requise : Récupération du document"}
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed font-medium">
              {isComplement ? (
                <>
                  L'administration a demandé des précisions sur votre dossier :
                  {complementComment && (
                    <span className="block my-3 p-4 bg-orange-500/10 border-l-4 border-orange-500 rounded-lg text-orange-900 font-bold italic">
                      "{complementComment}"
                    </span>
                  )}
                  <span className="block mt-1 font-bold text-orange-700">
                    Veuillez consulter la section des commentaires en bas de page pour plus de détails et mettre à jour votre demande.
                  </span>
                </>
              ) :
               isInsurance ? "Votre dossier est en attente de votre attestation d'assurance. Veuillez l'uploader dans la section dédiée." :
               isSignature ? "Votre convention est prête pour signature. Veuillez suivre les instructions ci-dessous." :
               isTransfer ? "Veuillez déposer l'original de votre convention signée au Service Recherche pour réception et transfert au Décanat." :
               "Votre convention est prête et signée par le Doyen. Vous pouvez passer la récupérer au Service Stage."}
            </p>
          </div>
        </motion.div>
      )}

      {/* Mobile-First Header Card */}
      <div className="md:hidden">
        <Card 
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-5 cursor-pointer group active:scale-[0.98] transition-all border-primary/10"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                isCompleted ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" :
                (isCancelled || isRejected) ? "bg-destructive text-destructive-foreground shadow-lg shadow-destructive/20" :
                isComplement ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" :
                "bg-primary text-primary-foreground shadow-lg shadow-primary/20 animate-pulse"
              }`}>
                {isCompleted ? <Check size={24} strokeWidth={3} /> : 
                 (isCancelled || isRejected) ? <X size={24} strokeWidth={3} /> : 
                 isComplement ? <AlertCircle size={24} strokeWidth={3} /> : 
                 <Clock size={24} strokeWidth={3} />}
              </div>
              <div className="space-y-0.5">
                {isStudent && (
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Progression: {progress}%</p>
                )}
                <h3 className="text-base font-bold text-foreground uppercase tracking-tight leading-none">{currentStep.label}</h3>
              </div>
            </div>
            <div className={`p-2 rounded-full bg-secondary text-muted-foreground transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
              <ChevronDown size={18} />
            </div>
          </div>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-6 space-y-6">
                  {STEPS.map((step, index) => {
                    const status = getStepStatus(index);
                    return (
                      <motion.div 
                        key={step.id} 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex gap-4 relative group/step"
                      >
                        {index < STEPS.length - 1 && (
                          <div className="absolute left-5 top-10 w-0.5 bottom-[-24px] bg-border z-0">
                            <motion.div 
                              initial={{ height: 0 }}
                              animate={{ height: status === "completed" ? "100%" : "0%" }}
                              transition={{ duration: 0.5, delay: index * 0.3 }}
                              className="w-full bg-emerald-500"
                            />
                          </div>
                        )}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 z-10 transition-all duration-500 ${
                          status === "completed" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" :
                          status === "active" ? "bg-primary border-primary text-primary-foreground shadow-lg scale-105" :
                          status === "warning" ? "bg-orange-500/10 border-orange-500/20 text-orange-600" :
                          status === "cancelled" ? "bg-destructive/10 border-destructive/20 text-destructive" :
                          "bg-card border-border text-muted-foreground"
                        }`}>
                          {status === "completed" ? <Check size={18} strokeWidth={3} /> : 
                           status === "active" ? <Clock size={18} strokeWidth={3} /> : 
                           status === "cancelled" ? <X size={18} strokeWidth={3} /> :
                           index + 1}
                        </div>
                        <div className="pt-1">
                          <p className={`text-[10px] font-black uppercase tracking-widest ${
                            status === "active" ? "text-primary" : 
                            status === "completed" ? "text-foreground" : 
                            "text-muted-foreground"
                          }`}>
                            {step.label}
                          </p>
                          {status === "active" && (
                            <div className="flex items-center gap-2 mt-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                              <span className="text-[8px] font-bold text-primary uppercase tracking-tighter">Action requise</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </div>

      {/* Desktop Editorial Timeline */}
      <div className="hidden md:block">
        <div className="relative">
          {/* Background Grid Accent */}
          <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          
          <div className="mb-12 flex items-center justify-between">
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-foreground/80">Progression du Dossier</h3>
              {isStudent && (
                <p className="text-sm text-muted-foreground font-medium">Votre demande est en cours de traitement ({progress}%)</p>
              )}
            </div>
          </div>

          {isStudent && (
            <div className="relative h-2 bg-secondary rounded-full mb-12 overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-primary shadow-[0_0_15px_rgba(var(--primary),0.5)]"
              />
            </div>
          )}

          <div className="relative flex justify-between items-start">
            {STEPS.map((step, index) => {
              const status = getStepStatus(index);
              const isLast = index === STEPS.length - 1;

              return (
                <div key={step.id} className="flex flex-col items-center flex-1 relative group">
                  {/* Connection Line */}
                  {!isLast && (
                    <div className="absolute left-1/2 right-[-50%] top-8 h-1.5 bg-secondary rounded-full overflow-hidden z-0">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: status === "completed" ? "100%" : "0%" }}
                        transition={{ duration: 0.8, delay: index * 0.4, ease: "anticipate" }}
                        className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                      />
                    </div>
                  )}

                  {/* Step Circle */}
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: index * 0.2 }}
                    whileHover={{ scale: 1.15, rotate: 3 }}
                    className={`w-20 h-20 rounded-[2.5rem] flex items-center justify-center border-4 transition-all duration-700 relative z-10 ${
                      status === "completed" ? "bg-card border-emerald-500 text-emerald-500 shadow-xl shadow-emerald-500/10" :
                      status === "active" ? "bg-primary border-primary/20 text-primary-foreground shadow-2xl shadow-primary/20 scale-110" :
                      status === "warning" ? "bg-card border-orange-500 text-orange-500 shadow-xl shadow-orange-500/10" :
                      status === "cancelled" ? "bg-card border-destructive text-destructive shadow-xl shadow-destructive/10" :
                      "bg-card border-border text-muted-foreground"
                    }`}
                  >
                    {status === "completed" ? <Check size={32} strokeWidth={3} /> : 
                     status === "active" ? <Clock size={32} strokeWidth={3} className="animate-pulse" /> : 
                     status === "warning" ? <AlertCircle size={32} strokeWidth={3} /> :
                     status === "cancelled" ? <X size={32} strokeWidth={3} /> :
                     <span className="text-xl font-black">{index + 1}</span>}
                  </motion.div>

                  {/* Step Label */}
                  <div className="mt-10 text-center w-full px-2 max-w-[160px] mx-auto min-h-[4rem] flex flex-col justify-start">
                    <p className={`text-[10px] font-black uppercase tracking-[0.2em] leading-[1.4] transition-colors duration-500 ${
                      status === "active" ? "text-primary" : 
                      status === "completed" ? "text-foreground" : 
                      "text-muted-foreground"
                    }`}>
                      {step.label}
                    </p>
                    {status === "active" && (
                      <motion.p 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2 text-[8px] font-bold text-primary/60 uppercase tracking-tighter whitespace-nowrap"
                      >
                        Étape Actuelle
                      </motion.p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detailed History Feed */}
      {record && record.history && record.history.length > 0 && !isStudent && (
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3 flex-1">
              <div className="h-px flex-1 bg-border/50" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Historique Détaillé</h3>
              <div className="h-px flex-1 bg-border/50" />
            </div>
            <button 
              onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
              className="ml-4 text-[9px] font-black uppercase tracking-widest text-primary hover:underline flex items-center gap-1"
            >
              {isHistoryExpanded ? "Réduire" : `Voir tout (${record.history.length})`}
              <ChevronDown size={14} className={`transition-transform ${isHistoryExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>

          <div className="space-y-4">
            {(isHistoryExpanded ? [...record.history].reverse() : [[...record.history].reverse()[0]]).map((entry, idx) => {
              const displayName = entry.updatedBy || "Système";
              const displayRole = entry.updatedByRole;

              return (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative pl-8 group"
                >
                  {/* Vertical Line */}
                  {isHistoryExpanded && idx < record.history.length - 1 && (
                    <div className="absolute left-[11px] top-6 bottom-[-16px] w-px bg-border group-last:hidden" />
                  )}
                  
                  {/* Dot */}
                  <div className={`absolute left-0 top-1.5 w-6 h-6 rounded-full border-2 bg-card flex items-center justify-center z-10 transition-colors ${
                    idx === 0 ? "border-primary text-primary" : "border-border text-muted-foreground"
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${idx === 0 ? "bg-primary animate-pulse" : "bg-muted-foreground/40"}`} />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className={`text-[10px] font-black uppercase tracking-widest break-words ${idx === 0 ? "text-primary" : "text-foreground"}`}>
                        {entry.status}
                      </span>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                        {new Date(entry.updatedAt).toLocaleString('fr-FR', { 
                          day: '2-digit', 
                          month: 'short', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-secondary flex items-center justify-center text-[8px] font-bold text-muted-foreground uppercase">
                        {displayName.charAt(0)}
                      </div>
                      <p className="text-[10px] font-medium text-muted-foreground">
                        Par <span className="text-foreground font-bold">{displayName}</span> 
                        {displayRole && <span className="ml-1 opacity-60">({displayRole})</span>}
                      </p>
                    </div>

                    {entry.comment && (
                      <div className="bg-secondary/30 p-3 rounded-2xl border border-border/50 max-w-2xl">
                        <p className="text-[11px] text-foreground/80 leading-relaxed italic">
                          "{entry.comment}"
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
