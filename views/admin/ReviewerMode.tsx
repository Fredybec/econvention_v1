import React, { useState, useEffect, useRef } from 'react';
import { 
  X, ChevronLeft, ChevronRight, Inbox, Clock, FileText, 
  CheckCircle, AlertTriangle, MessageSquare, Send, Printer, 
  Download, Stamp, ShieldCheck, RotateCcw, Upload, Lock,
  Info, Calendar, User as UserIcon, Building2, GraduationCap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../../context/AppContext';
import { PFERecord, WorkflowStatus, Role, ConventionMetadata } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { getNextStatus, canApprove as canApproveWorkflow } from '../../utils/workflow';
import { Timeline } from '../../components/Timeline';
import { RequestDetailContent } from '../../components/shared/RequestDetailContent';

export const ReviewerMode = ({ records: initialRecords, onExit }: { records: PFERecord[], onExit: () => void }) => {
  const { records: allRecords, showAlert } = useAppContext();
  const [reviewIds] = useState(initialRecords.map(r => r.id));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lockedIds, setLockedIds] = useState<Set<string>>(new Set());
  
  const currentId = reviewIds[currentIndex];
  const currentRecord = allRecords.find(r => r.id === currentId);

  const handleLockedByOther = (id: string, lockOwnerName?: string) => {
    // Add to locked ids set
    setLockedIds(prev => {
      const nextSet = new Set(prev);
      nextSet.add(id);
      return nextSet;
    });

    const record = allRecords.find(r => r.id === id);
    const studentName = record ? record.studentName : 'de l\'étudiant';

    // Search for next available unlocked document in our queue
    let nextAvailableIndex = currentIndex + 1;
    while (nextAvailableIndex < reviewIds.length) {
      const nextId = reviewIds[nextAvailableIndex];
      if (!lockedIds.has(nextId) && nextId !== id) {
        break;
      }
      nextAvailableIndex++;
    }

    if (nextAvailableIndex < reviewIds.length) {
      setCurrentIndex(nextAvailableIndex);
      showAlert(
        "Dossier Verrouillé (Passé)", 
        `Le dossier de ${studentName} est en cours de traitement par ${lockOwnerName || 'un autre agent'}. Passage automatique au dossier disponible suivant.`,
        "info"
      );
    } else {
      // If we can't go forward, let's see if we can find one backward
      let prevAvailableIndex = currentIndex - 1;
      while (prevAvailableIndex >= 0) {
        const prevId = reviewIds[prevAvailableIndex];
        if (!lockedIds.has(prevId) && prevId !== id) {
          break;
        }
        prevAvailableIndex--;
      }

      if (prevAvailableIndex >= 0) {
        setCurrentIndex(prevAvailableIndex);
        showAlert(
          "Dossier Verrouillé", 
          `Le dossier de ${studentName} est en cours de traitement par ${lockOwnerName || 'un autre agent'}. Retour au dossier libre précédent.`,
          "info"
        );
      } else {
        // All files are locked!
        showAlert(
          "Tous les dossiers sont verrouillés", 
          `Tous les dossiers de votre sélection sont actuellement en cours de traitement par d'autres collègues. Veuillez repasser plus tard.`,
          "warning"
        );
        onExit();
      }
    }
  };

  const next = () => {
    if (currentIndex < reviewIds.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const prev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleActionSuccess = () => {
    if (currentIndex < reviewIds.length - 1) {
      next();
    } else {
      onExit();
      showAlert("Terminé", "Tous les dossiers de la sélection ont été traités.", "success");
    }
  };

  if (reviewIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-24 space-y-6">
        <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center text-muted-foreground/30">
          <Inbox size={48} />
        </div>
        <p className="text-sm text-muted-foreground uppercase tracking-widest font-bold">Aucun dossier à traiter</p>
        <Button onClick={onExit} variant="outline">Retour au tableau de bord</Button>
      </div>
    );
  }

  if (!currentRecord) {
    return (
      <div className="flex flex-col items-center justify-center p-24 space-y-6">
        <p className="text-sm text-muted-foreground uppercase tracking-widest font-bold">Erreur: Dossier introuvable</p>
        <div className="flex gap-4">
          <Button onClick={prev} disabled={currentIndex === 0} className="flex items-center gap-2">
            <ChevronLeft size={16} /> Précédent
          </Button>
          <Button onClick={next} disabled={currentIndex === reviewIds.length - 1} className="flex items-center gap-2">
            Suivant <ChevronRight size={16} />
          </Button>
          <Button onClick={onExit} variant="outline">Quitter</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background flex flex-col min-h-screen animate-in fade-in duration-500">
      <header className="sticky top-0 z-40 h-20 bg-background/80 backdrop-blur-md border-b border-border px-8 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-6">
          <Button 
            onClick={onExit} 
            variant="outline" 
            className="text-red-500 hover:text-red-600 border-none hover:bg-red-50 flex items-center justify-center gap-2"
          >
            <X size={24} strokeWidth={2.5} className="shrink-0" /> Quitter
          </Button>
          <div className="h-8 w-px bg-border" />
          <div className="flex flex-col">
            <h1 className="text-sm font-black uppercase tracking-tighter text-foreground truncate max-w-[200px] md:max-w-xs">{currentRecord.studentName}</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary truncate max-w-[150px]">{currentRecord.data.companyName}</p>
          </div>
          <div className="h-8 w-px bg-border hidden md:block" />
          <div className="flex items-center gap-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground hidden lg:block">{currentIndex + 1} / {reviewIds.length}</p>
            <div className="flex items-center gap-2">
              <Button onClick={prev} disabled={currentIndex === 0} variant="secondary" size="icon" className="h-10 w-10 rounded-xl shadow-sm border border-border">
                <ChevronLeft size={18} />
              </Button>
              <Button onClick={next} disabled={currentIndex === reviewIds.length - 1} variant="secondary" size="icon" className="h-10 w-10 rounded-xl shadow-sm border border-border">
                <ChevronRight size={18} />
              </Button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <Badge status={currentRecord.status} />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto bg-background pt-8 pb-48 md:pb-56 px-8">
        <div className="max-w-6xl mx-auto">
          <RequestDetailContent key={currentRecord.id} id={currentRecord.id} onActionSuccess={handleActionSuccess} onLockedByOther={handleLockedByOther} isReviewMode={true} />
        </div>
      </main>
    </div>
  );
};
