import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Lock, Zap, MessageSquare, Clock, Info, FileText, 
  ChevronDown, ChevronUp, CheckCircle2, AlertCircle, XCircle, 
  Download, Eye, User as UserIcon, Building2, ShieldCheck, 
  Trash2, RotateCcw, GraduationCap, Stamp, Check, Upload,
  Save, RefreshCw, ZoomIn, ZoomOut, X, Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '@/context/AppContext';
import { PFERecord, WorkflowStatus, Role, User, StageType } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Timeline } from '@/components/Timeline';
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import { getNextStatus, canApprove, getStatusLabel } from '@/utils/workflow';
import { getStoredRecords, saveRecord, deleteRecordApi } from '@/services/storage';
import { ConventionPDFContent } from '@/components/shared/ConventionPDFContent';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Helper component for data display
 */
const InfoItem = ({ label, value, className = "" }: { label: string, value: string | undefined, className?: string }) => (
  <div className={`space-y-1.5 ${className}`}>
    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
    <p className="text-sm font-medium text-foreground tracking-tight">{value || "Non spécifié"}</p>
  </div>
);

/**
 * Helper to calculate estimated duration in months/weeks
 */
const calculateDuration = (start: string | undefined, end: string | undefined) => {
  if (!start || !end) return "Non définie";
  try {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));
    const months = Math.floor(diffDays / 30);
    const weeks = Math.round((diffDays % 30) / 7);
    
    const parts = [];
    if (months > 0) parts.push(`${months} mois`);
    if (weeks > 0) parts.push(`${weeks} sem.`);
    return parts.join(' ') || `${diffDays} jours`;
  } catch (e) {
    return "Format invalide";
  }
};

const getActionButtonLabel = (record: PFERecord, currentUser: User | null, uploadFile: string | null, isReviewMode: boolean = false) => {
  const isStudent = currentUser?.roles?.includes(Role.STUDENT);
  if (isStudent) {
    if (record.status === WorkflowStatus.DRAFT || 
        record.status === WorkflowStatus.COMPLEMENT_REQUIRED || 
        record.status === WorkflowStatus.PENDING_INSURANCE) {
      return uploadFile ? "Envoyer le dossier" : (record.status === WorkflowStatus.DRAFT ? "Envoyer pour validation" : "Uploader & Envoyer");
    }
    if (record.status === WorkflowStatus.PENDING_STUDENT_SIGNATURE) {
      return uploadFile ? "Soumettre Signature" : "Uploader Convention Sig.";
    }
  }
  
  const label = (() => {
    switch (record.status) {
      case WorkflowStatus.PENDING_RESPONSABLE: return "Valider le Sujet";
      case WorkflowStatus.PENDING_SCOLARITE: return "Valider Inscription";
      case WorkflowStatus.PENDING_SERVICE_RECHERCHE: return "Validation Administrative";
      case WorkflowStatus.PENDING_VICE_DOYEN_RECHERCHE:
      case WorkflowStatus.PENDING_VICE_DOYEN_PEDAGOGIE: return currentUser?.roles?.some(r => [Role.VICE_DOYEN_RECHERCHE, Role.VICE_DOYEN_PEDAGOGIE].includes(r as Role)) ? "Approbation Vice Doyen" : "Approbation Décanale";
      case WorkflowStatus.PENDING_TRANSFER_SERVICE_STAGE: return "Réceptionner Physique (SR)";
      case WorkflowStatus.PENDING_TRANSFER_DOYEN: return "Réceptionner au Décanat";
      case WorkflowStatus.PENDING_DOYEN_SIGNATURE: return "Signer et Renvoyer";
      case WorkflowStatus.SIGNED_EN_ROUTE: return "Confirmer Réception (Service Recherche)";
      case WorkflowStatus.READY_FOR_PICKUP: return "Confirmer retrait";
      case WorkflowStatus.PENDING_FINAL_CHECK: return "Archiver le Dossier";
      case WorkflowStatus.COMPLEMENT_REQUIRED: return "Renvoyer pour Validation";
      default: return "Approuver le dossier";
    }
  })();

  if (isReviewMode) return `${label} & Suivant`;
  return label;
};

import { Logo } from '@/components/ui/Logo';

export const RequestDetailContent = ({ id: propId, isReviewMode = false, onActionSuccess, onLockedByOther }: any) => {
  const { id: idFromParams } = useParams<{ id: string }>();
  const id = propId || idFromParams;
  const navigate = useNavigate();
  const { 
    records, currentUser, addComment, updateRecordStatus, 
    token, showAlert, findById,
    revertRecordStatus, updateRecordData, systemConfig,
    users, template, activeRole,
    lockRecord, unlockRecord, getLock: getRecordLock,
    socket, joinRecord, leaveRecord
  } = useAppContext();
  
  const [record, setRecord] = useState<PFERecord | null>(null);
  const [lockInfo, setLockInfo] = useState<any>(null);
  const [isLockedByOther, setIsLockedByOther] = useState(false);
  const [student, setStudent] = useState<User | null>(null);
  const [comment, setComment] = useState('');
  const [replyComment, setReplyComment] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [viewingDocumentUrl, setViewingDocumentUrl] = useState<string | null>(null);
  const [showPDF, setShowPDF] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const isUpdatingYear = useRef(false);
  const [editedAcademicYear, setEditedAcademicYear] = useState('');
  const [zoom, setZoom] = useState(0.85);
  const [uploadFile, setUploadFile] = useState<string | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);

  const isDone = record?.status === WorkflowStatus.COMPLETED || 
                 record?.status === WorkflowStatus.REJECTED || 
                 record?.status === WorkflowStatus.CANCELLED;

  // New states for collapsibles
  const isEncadrant = currentUser?.roles?.includes(Role.ENCADRANT_FST);
  const isScolarite = currentUser?.roles?.includes(Role.SCOLARITE);
  const isServiceRecherche = currentUser?.roles?.includes(Role.SERVICE_RECHERCHE_COOP);
  const isResponsable = currentUser?.roles?.includes(Role.ENCADRANT_FST);
  const isSuperAdmin = currentUser?.roles?.includes(Role.SUPERADMIN);
  const isSecretariatDoyen = currentUser?.roles?.includes(Role.SECRETARIAT_DOYEN);
  const isViceDoyen = currentUser?.roles?.some(r => r === Role.VICE_DOYEN_PEDAGOGIE || r === Role.VICE_DOYEN_RECHERCHE);

  useEffect(() => {
    if (id) {
      const found = findById(id);
      if (found) {
        setRecord(found);
        setEditedAcademicYear(found.data.academicYear);
        // Load student profile from users list in context
        const s = users.find(u => u.name === found.studentName || u.id === found.studentId);
        if (s) setStudent(s);
      }
    }
  }, [id, findById, users]);

  // Real-time locking mechanism via WebSockets
  useEffect(() => {
    if (!id || !socket || !currentUser) return;

    // Join the record's room
    joinRecord(id);
    
    // Attempt to lock
    lockRecord(id);

    const handleLocked = (lock: any) => {
      setLockInfo(lock);
      const other = lock.userId !== currentUser.id;
      setIsLockedByOther(other);
      if (other && onLockedByOther) {
        onLockedByOther(id, lock.userName);
      }
    };

    const handleUnlocked = () => {
      setLockInfo(null);
      setIsLockedByOther(false);
    };

    const handleLockFailed = (currentLock: any) => {
      setLockInfo(currentLock);
      setIsLockedByOther(true);
      if (onLockedByOther) {
        onLockedByOther(id, currentLock.userName);
      } else {
        showAlert('Dossier Verrouillé', `Ce dossier est actuellement modifié par ${currentLock.userName}.`, 'info');
      }
    };

    const handleRecordUpdated = (updated: PFERecord) => {
      if (updated.id === id) {
        // Only show alert if it was genuinely updated by someone else
        // We can check if the physical checklist or history changed in a way that wasn't us
        // But for now, a simple check: if we are currently looking at it and NOT locked by us, it's definitely someone else.
        // If it is locked by us, we might still get this event from our own save.
        
        setRecord(prev => {
          if (prev && prev.updatedAt === updated.updatedAt) return prev;
          
          // If we have a local record and the update is newer
          if (prev && updated.updatedAt > prev.updatedAt) {
            const isMe = updated.history[updated.history.length - 1]?.updatedById === currentUser.id;
            if (!isMe) {
              showAlert('Flux de Travail', `Le dossier a été mis à jour (Statut: ${updated.status}).`, 'info');
            }
          }
          return updated;
        });
        setEditedAcademicYear(updated.data.academicYear);
      }
    };

    socket.on("record-locked", handleLocked);
    socket.on("record-unlocked", handleUnlocked);
    socket.on("lock-failed", handleLockFailed);
    socket.on("record-updated", handleRecordUpdated);

    return () => {
      socket.off("record-locked", handleLocked);
      socket.off("record-unlocked", handleUnlocked);
      socket.off("lock-failed", handleLockFailed);
      socket.off("record-updated", handleRecordUpdated);
      unlockRecord(id);
      leaveRecord(id);
    };
  }, [id, socket, currentUser, joinRecord, leaveRecord, lockRecord, unlockRecord, showAlert, onLockedByOther]);

  // Real-time synchronization
  useEffect(() => {
    // We rely on AppContext's polling for data sync
  }, [id, record?.status, currentUser]);

  const canModify = () => {
    if (!record || !currentUser) return false;
    
    // Superadmin always has modification rights
    if (currentUser.roles.includes(Role.SUPERADMIN)) return true;
    
    // Student can modify if it's a draft OR complement request AND it hasn't passed Responsable Stage approval yet
    if (currentUser.roles.includes(Role.STUDENT)) {
      if (record.status === WorkflowStatus.DRAFT) return true;
      
      if (record.status === WorkflowStatus.COMPLEMENT_REQUIRED) {
        // Logic: If it passed RESPONSABLE_STAGE approval (i.e., became or passed PENDING_INSURANCE), it's locked.
        const hasPassedRespo = record.history.some(h => 
          [
            WorkflowStatus.PENDING_INSURANCE, 
            WorkflowStatus.PENDING_SCOLARITE, 
            WorkflowStatus.PENDING_SERVICE_RECHERCHE,
            WorkflowStatus.PENDING_VICE_DOYEN_RECHERCHE,
            WorkflowStatus.PENDING_VICE_DOYEN_PEDAGOGIE
          ].includes(h.status)
        );
        if (hasPassedRespo) return false;
        return true;
      }
    }
    
    return false;
  };

  const canPreview = () => {
    if (!record || !currentUser) return false;
    
    const userRoles = currentUser.roles || [];
    const isSuperAdmin = userRoles.includes(Role.SUPERADMIN);
    
    // Only allow preview if the convention has reached the downloadable stage (after Vice Doyen approval)
    const isReady = isConventionDownloadable(record.status);
    
    // If not ready, ONLY superadmin can see it.
    if (!isReady) return isSuperAdmin;

    // If it is ready, Student and other related staff can see it
    if (userRoles.includes(Role.STUDENT)) return true;
    
    return userRoles.some(r => [
      Role.VICE_DOYEN_RECHERCHE, 
      Role.VICE_DOYEN_PEDAGOGIE,
      Role.SERVICE_RECHERCHE_COOP,
      Role.SECRETARIAT_DOYEN,
      Role.ENCADRANT_FST,
      Role.CHEF_DEPARTEMENT,
      Role.SCOLARITE,
      Role.SUPERADMIN
    ].includes(r));
  };

  const handleApprove = async () => {
    if (!record || isLockedByOther) return;
    
    try {
      // Check if upload is required
    const isStudent = currentUser?.roles?.includes(Role.STUDENT);
    const isSecretariatDoyen = currentUser?.roles?.includes(Role.SECRETARIAT_DOYEN);
    
    const studentUploadRequired = (record.status === WorkflowStatus.PENDING_INSURANCE || 
                                  record.status === WorkflowStatus.PENDING_STUDENT_SIGNATURE) && isStudent;
    const doyenUploadRequired = record.status === WorkflowStatus.PENDING_DOYEN_SIGNATURE && isSecretariatDoyen;
                           
    if ((studentUploadRequired || doyenUploadRequired) && !uploadFile) {
      showAlert('Document Requis', 'Veuillez joindre le document signé ou l\'attestation avant de continuer.', 'error');
      return;
    }

    const nextStatus = getNextStatus(record.status, record);
      if (nextStatus) {
        // Logic for metadata and data updates based on status
        let metadata = record.conventionMetadata;
        let recordData = record.data;

        if (isSecretariatDoyen && record.status === WorkflowStatus.PENDING_DOYEN_SIGNATURE) {
          metadata = { ...metadata, signedDocumentUrl: uploadFile || undefined } as any;
        }
        
        if (isStudent && record.status === WorkflowStatus.PENDING_STUDENT_SIGNATURE) {
          metadata = { ...metadata, signedDocumentUrl: uploadFile || undefined } as any;
        }

        if (isStudent && record.status === WorkflowStatus.PENDING_INSURANCE) {
          recordData = { ...recordData, insuranceUrl: uploadFile || undefined };
        }

        if (isStudent && record.status === WorkflowStatus.COMPLEMENT_REQUIRED) {
          recordData = { ...recordData, complementUrl: uploadFile || undefined };
        }

        const dataToUpdate = recordData !== record.data ? recordData : undefined;

        await updateRecordStatus(record.id, nextStatus, comment, metadata as any, uploadFile || undefined, false, dataToUpdate);
        showAlert('Success', `Dossier passé à l'état: ${getStatusLabel(nextStatus)}`, 'success');
        
        if (onActionSuccess) {
          onActionSuccess();
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err: any) {
      if (err.message.includes('treated_by_another')) {
        const lockedBy = err.message.split(':')[1];
        showAlert('Dossier Verrouillé', `Le dossier est en cours de modification par ${lockedBy}. Veuillez patienter.`, 'warning');
      } else {
        showAlert('Erreur', `Échec de l'approbation: ${err.message}`, 'error');
      }
    }
  };

  const handleRequestComplement = async () => {
    if (!record || isLockedByOther) return;
    try {
      const nextStatus = WorkflowStatus.COMPLEMENT_REQUIRED;
      await updateRecordStatus(record.id, nextStatus, comment);
      showAlert('Success', 'Demande de complément envoyée à l\'étudiant.', 'success');
      
      if (onActionSuccess) {
        onActionSuccess();
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      if (err.message.includes('treated_by_another')) {
        const lockedBy = err.message.split(':')[1];
        showAlert('Dossier Verrouillé', `Le dossier est en cours de modification par ${lockedBy}.`, 'warning');
      } else {
        showAlert('Erreur', `Échec de l'envoi: ${err.message}`, 'error');
      }
    }
  };

  const handleReject = async () => {
    if (!record || isLockedByOther) return;
    try {
      const nextStatus = WorkflowStatus.REJECTED;
      await updateRecordStatus(record.id, nextStatus, comment);
      showAlert('Dossier Rejeté', 'Le dossier a été marqué comme rejeté.', 'error');
      
      if (onActionSuccess) {
        onActionSuccess();
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      if (err.message.includes('treated_by_another')) {
        const lockedBy = err.message.split(':')[1];
        showAlert('Dossier Verrouillé', `Le dossier est en cours de modification par ${lockedBy}.`, 'warning');
      } else {
        showAlert('Erreur', `Échec du rejet: ${err.message}`, 'error');
      }
    }
  };

  const handleDelete = async () => {
    if (!record || !token) return;
    try {
      await deleteRecordApi(record.id, token);
      showAlert('Dossier Supprimé', 'Le dossier a été définitivement supprimé.', 'success');
      // After successful update, call the success callback if in review mode
      if (onActionSuccess) {
        onActionSuccess();
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      showAlert('Erreur', 'Impossible de supprimer le dossier.', 'error');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validation: Max 2MB
      if (file.size > 2 * 1024 * 1024) {
        showAlert("Fichier trop volumineux", "La taille maximale autorisée est de 2Mo.", "error");
        return;
      }

      // Validation: PDF or Image
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        showAlert("Format non supporté", "Veuillez uploader un fichier PDF ou une image (JPG, PNG).", "error");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadFile(reader.result as string);
        showAlert("Succès", "Fichier prêt pour l'envoi.", "info");
      };
      reader.readAsDataURL(file);
    }
  };

  const isConventionDownloadable = (status: WorkflowStatus) => {
    const downloadableStatuses = [
      WorkflowStatus.PENDING_STUDENT_SIGNATURE,
      WorkflowStatus.PENDING_TRANSFER_SERVICE_STAGE,
      WorkflowStatus.PENDING_TRANSFER_DOYEN,
      WorkflowStatus.PENDING_DOYEN_SIGNATURE,
      WorkflowStatus.SIGNED_EN_ROUTE,
      WorkflowStatus.READY_FOR_PICKUP,
      WorkflowStatus.COMPLETED
    ];
    return downloadableStatuses.includes(status);
  };

  const isUploadRequired = record?.status === WorkflowStatus.PENDING_INSURANCE || 
                           record?.status === WorkflowStatus.PENDING_STUDENT_SIGNATURE ||
                           record?.status === WorkflowStatus.PENDING_DOYEN_SIGNATURE ||
                           record?.status === WorkflowStatus.COMPLEMENT_REQUIRED;

  const downloadPDF = async () => {
    if (!pdfRef.current || !record) return;
    setIsDownloading(true);
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      const pages = pdfRef.current.querySelectorAll('.pdf-page');
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;
        const canvas = await html2canvas(page, {
          scale: 3, 
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: 794,
          height: 1123,
          windowWidth: 1200,
          onclone: (clonedDoc) => {
            // Fix for oklch coloring issues in html2canvas
            const styles = clonedDoc.querySelectorAll('style');
            styles.forEach(styleTag => {
              if (styleTag.innerHTML.includes('oklch') || styleTag.innerHTML.includes('oklab')) {
                styleTag.innerHTML = styleTag.innerHTML
                  .replace(/oklch\([^)]+\)/g, '#000000')
                  .replace(/oklab\([^)]+\)/g, '#000000');
              }
            });

            // Ensure specific page visibility for capture
            const allPages = clonedDoc.querySelectorAll('.pdf-page');
            allPages.forEach((p, idx) => {
              const el = p as HTMLElement;
              if (idx === i) {
                el.style.display = 'flex';
                el.style.flexDirection = 'column';
                el.style.visibility = 'visible';
                el.style.position = 'relative';
                el.style.transform = 'none';
                el.style.margin = '0';
                el.style.width = '794px';
                el.style.height = '1123px';
                el.style.padding = '0';
              } else {
                el.style.display = 'none';
              }
            });

            const contentWrapper = clonedDoc.querySelector('.pdf-content-wrapper') as HTMLElement;
            if (contentWrapper) {
              contentWrapper.style.padding = '0';
              contentWrapper.style.margin = '0';
            }

            const zoomContainer = clonedDoc.querySelector('.pdf-zoom-container') as HTMLElement;
            if (zoomContainer) {
              zoomContainer.style.transform = 'none';
              zoomContainer.style.width = 'auto';
              zoomContainer.style.height = 'auto';
              zoomContainer.style.margin = '0';
              zoomContainer.style.padding = '0';
            }
          }
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        if (i > 0) pdf.addPage();
        
        pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
      }
      
      const fileName = `Convention_Stage_${record.studentName.replace(/\s+/g, '_')}_${record.id}.pdf`;
      pdf.save(fileName);
      showAlert("Succès", "La convention a été générée et téléchargée.", "success");
    } catch (err) {
      console.error(err);
      showAlert("Erreur", "Impossible de générer le PDF.", "error");
    } finally {
      setIsDownloading(false);
    }
  };

  if (!record) {
    return (
      <div className="p-12 text-center">
        <p className="text-muted-foreground animate-pulse mb-2">Chargement du dossier...</p>
        <p className="text-xs text-muted-foreground/60 italic">Si ce message persiste, vérifiez votre connexion ou contactez le support.</p>
      </div>
    );
  }

  const isStudent = currentUser?.roles?.includes(Role.STUDENT);

  return (
    <div className="space-y-8 pb-24 max-w-5xl mx-auto">
      {/* 1. Review Mode Header: Student Profile & Key Info */}
      <Card className="p-0 overflow-hidden border-none shadow-xl bg-card rounded-[2.5rem]">
        {/* ... (existing header content) ... */}
        <div className="bg-primary/5 p-8 md:p-10">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="relative shrink-0">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] overflow-hidden bg-secondary border-4 border-background shadow-lg">
                {student?.avatarUrl ? (
                  <img 
                    src={student.avatarUrl} 
                    alt={record.studentName} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground/20">
                    <UserIcon size={64} />
                  </div>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground p-3 rounded-2xl shadow-lg">
                <GraduationCap size={20} />
              </div>
            </div>

            <div className="flex-1 space-y-6 min-w-0">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tighter uppercase">{record.studentName}</h2>
                  <Badge status={record.status} className="px-4" />
                </div>
                <div className="text-sm md:text-lg text-muted-foreground font-medium flex flex-wrap items-center gap-2">
                  <span className="uppercase tracking-widest">{record.data.filiere}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 border-t border-primary/10 pt-6">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Massar/CNE</p>
                  <p className="text-sm font-bold text-foreground">{record.data.massarCode || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Code Appogee</p>
                  <p className="text-sm font-bold text-foreground">{record.data.appogeeCode || 'N/A'}</p>
                </div>
                <div className="col-span-2 md:col-span-1 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Email Étudiant</p>
                  <p className="text-sm font-bold text-foreground truncate">{student?.email || 'N/A'}</p>
                </div>
                <div className="col-span-2 md:col-span-1 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Encadrant FST</p>
                  <p className="text-sm font-bold text-foreground uppercase truncate">{record.data.fstTutorName || 'Non assigné'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 border-t border-primary/10 pt-6">
                <div className="col-span-2 md:col-span-1 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Entreprise</p>
                  <p className="text-sm font-bold text-foreground uppercase truncate">{record.data.companyName}</p>
                </div>
                <div className="col-span-2 md:col-span-1 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tuteur Professionnel</p>
                  <p className="text-sm font-bold text-foreground truncate">{record.data.tutorName}</p>
                </div>
                <div className="col-span-2 md:col-span-1 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Période</p>
                  <p className="text-sm font-bold text-foreground">{new Date(record.data.startDate).toLocaleDateString()} - {new Date(record.data.endDate).toLocaleDateString()}</p>
                </div>
                <div className="col-span-2 md:col-span-1 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Nature</p>
                  <p className="text-sm font-bold text-foreground uppercase">{record.data.stageType === StageType.PFA ? 'PFA' : 'PFE'}</p>
                </div>
              </div>

              {record.validatorIds && Object.keys(record.validatorIds).length > 0 && !currentUser?.roles?.includes(Role.STUDENT) && (
                <div className="border-t border-primary/10 pt-6 space-y-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2 flex items-center gap-2">
                     <ShieldCheck size={10} /> Traité précédemment par :
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(record.validatorIds).map(([role, uid]) => {
                      const validator = users.find(u => u.id === uid);
                      return (
                        <div key={role} className="flex items-center gap-1.5 bg-secondary/30 px-3 py-1 rounded-full border border-border/50">
                          <span className="text-[8px] font-black text-muted-foreground/60">{role}:</span>
                          <span className="text-[9px] font-bold text-foreground truncate max-w-[100px]">{validator?.name || 'Inconnu'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {record.status === WorkflowStatus.DRAFT && isStudent && (
        <Card className="p-6 border-2 border-dashed border-primary/30 bg-primary/5 rounded-[2rem] flex flex-col md:flex-row items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Info size={24} />
          </div>
          <div className="space-y-1 text-center md:text-left">
            <h4 className="text-sm font-bold uppercase tracking-tight text-primary">Dossier en Brouillon</h4>
            <p className="text-[11px] text-muted-foreground leading-tight">
              Pour soumettre à validation, cliquez sur <span className="font-bold">"Modifier"</span>, cochez les cases de consentement, puis <span className="font-bold underline text-foreground">Envoyer pour validation</span>.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate(`/edit-request/${record.id}`)} className="md:ml-auto rounded-lg h-10 uppercase text-[9px] font-black tracking-widest">
            Modifier Maintenant
          </Button>
        </Card>
      )}

      {isReviewMode ? (
        <>
          {/* Review Mode Layout: Quick Actions first, then History */}
          <div className="space-y-8">
            {isLockedByOther ? (
              <Card className="p-6 border-2 border-amber-500 bg-amber-50 rounded-[2rem] flex items-center gap-4">
                <Lock className="text-amber-600 animate-pulse" />
                <div>
                  <p className="text-sm font-bold text-amber-900 uppercase tracking-tight">Dossier en cours d'édition</p>
                  <p className="text-xs text-amber-700 font-medium tracking-tight">Cet enregistrement est actuellement verrouillé par <span className="font-bold underline">{lockInfo?.userName}</span>.</p>
                </div>
              </Card>
            ) : !(record.status === WorkflowStatus.DRAFT && isStudent) && (
              <DecisionsSection 
                record={record} currentUser={currentUser} 
                isReviewMode={isReviewMode}
                isDone={isDone}
                isLockedByOther={isLockedByOther}
                canApprove={() => !isDone && !isLockedByOther && canApprove(
                  record.status, 
                  activeRole ? [activeRole] : (currentUser?.roles || []), 
                  currentUser?.department, 
                  record.data.department,
                  record.history[record.history.length - 2]?.status
                )} 
                comment={comment} setComment={setComment} 
                isUploadRequired={[WorkflowStatus.PENDING_INSURANCE, WorkflowStatus.PENDING_STUDENT_SIGNATURE, WorkflowStatus.PENDING_DOYEN_SIGNATURE, WorkflowStatus.COMPLEMENT_REQUIRED].includes(record.status)}
                uploadFile={uploadFile} 
                handleFileUpload={handleFileUpload} handleApprove={handleApprove} 
                handleRequestComplement={handleRequestComplement} handleReject={handleReject} 
                canModify={canModify} navigate={navigate} 
                activeRole={activeRole}
              />
            )}

            <ExchangeSection 
              record={record} 
              currentUser={currentUser} 
              replyComment={replyComment} 
              setReplyComment={setReplyComment} 
              addComment={addComment} 
              showAlert={showAlert} 
            />

            {/* Timeline for context in review mode */}
            <Card className="p-8 space-y-8 border-none shadow-xl rounded-[2.5rem] bg-card">
              <div className="flex items-center gap-3">
                <Clock size={18} className="text-primary" />
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground">Flux de Travail (Worklow)</h3>
              </div>
              <Timeline currentStatus={record.status} record={record} />
            </Card>

            {/* Info & Docs at bottom in review mode */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <Card className="p-8 space-y-6 border-none shadow-xl bg-card rounded-[2.5rem]">
                <div className="flex items-center gap-3">
                  <Info size={18} className="text-primary" />
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground">Détails du Sujet</h3>
                </div>
                <div className="p-5 bg-secondary/20 rounded-3xl border border-border/50">
                  <p className="text-sm font-medium text-foreground leading-relaxed italic">"{record.data.subject}"</p>
                </div>
                <div className="space-y-3">
                  <InfoItem label="Organisme" value={record.data.companyName} />
                  <InfoItem label="Tuteur" value={record.data.tutorName} />
                </div>
              </Card>

              <Card className="p-8 space-y-6 border-none shadow-xl bg-card rounded-[2.5rem]">
                <div className="flex items-center gap-3">
                  <FileText size={18} className="text-amber-500" />
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground">Documents</h3>
                </div>
                <div className="flex gap-2">
                   <Button variant="ghost" size="sm" className="flex-1 bg-secondary/30 text-[10px] font-bold h-9 rounded-xl" disabled={!canPreview()} onClick={() => setShowPDF(true)}>
                    <Eye size={14} className="mr-1.5" /> Aperçu
                  </Button>
                  <Button variant="ghost" size="sm" className="flex-1 bg-secondary/30 text-[10px] font-bold h-9 rounded-xl" disabled={!isConventionDownloadable(record.status)} onClick={downloadPDF}>
                    <Download size={14} className="mr-1.5" /> PDF
                  </Button>
                </div>
                
                {/* Detailed attachments for Review Mode */}
                <div className="space-y-2 pt-2">
                  {record.data.insuranceUrl && (
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-blue-50/50 border border-blue-200 shadow-sm group hover:bg-blue-100/50 transition-all">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0 border border-blue-200/50">
                          <ShieldCheck size={18} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-blue-900">Attestation d'Assurance</p>
                          <p className="text-[8px] font-bold text-blue-600/60 uppercase">Document requis</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-10 px-4 bg-blue-500 text-white hover:bg-blue-600 rounded-xl flex items-center gap-2 border shadow-lg shadow-blue-500/20 active:scale-95 transition-all" onClick={() => setViewingDocumentUrl(record.data.insuranceUrl!)}>
                        <Eye size={16} strokeWidth={2.5} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Voir</span>
                      </Button>
                    </div>
                  )}
                  {record.data.complementUrl && (
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-50/50 border border-amber-200 shadow-sm group hover:bg-amber-100/50 transition-all">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0 border border-amber-200/50">
                          <Plus size={18} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-amber-900">Pièce Complémentaire</p>
                          <p className="text-[8px] font-bold text-amber-600/60 uppercase">Justificatif additionnel</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-10 px-4 bg-amber-500 text-white hover:bg-amber-600 rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all" onClick={() => setViewingDocumentUrl(record.data.complementUrl!)}>
                        <Eye size={16} strokeWidth={2.5} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Voir</span>
                      </Button>
                    </div>
                  )}
                  {record.history.filter(h => h.attachmentUrl && h.attachmentUrl !== record.data.insuranceUrl && h.attachmentUrl !== record.data.complementUrl).map((h, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-secondary/40 border border-border hover:bg-secondary/60 transition-all">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/10">
                          <FileText size={18} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-foreground">Justificatif Étape</p>
                          <p className="text-[8px] font-bold text-muted-foreground uppercase">{h.status.replace(/_/g, ' ')}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-10 px-4 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl flex items-center gap-2 border border-primary/20 active:scale-95 transition-all" onClick={() => setViewingDocumentUrl(h.attachmentUrl!)}>
                        <Eye size={16} strokeWidth={2.5} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Voir</span>
                      </Button>
                    </div>
                  ))}
                  {record.history.filter(h => h.attachmentUrl && h.attachmentUrl !== record.data.insuranceUrl && h.attachmentUrl !== record.data.complementUrl).length === 0 && !record.data.insuranceUrl && !record.data.complementUrl && (
                    <p className="text-[8px] font-bold text-center text-muted-foreground uppercase py-2">Aucune pièce jointe</p>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Default Mode Layout (Standard View) */}
          {/* 2. Process Tracker (Etat d'avancement) - Always Full Width */}
          <Card className="p-10 space-y-10 border-none shadow-xl rounded-[2.5rem] bg-card">
            <div className="flex items-center gap-3">
              <Clock size={20} className="text-primary" />
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground">État d'avancement & Suivi du Dossier</h3>
            </div>
            <Timeline currentStatus={record.status} record={record} />
          </Card>

          {/* 3. Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-8">
              {/* Action Section */}
              {isLockedByOther ? (
                <Card className="p-6 border-2 border-amber-500 bg-amber-50 rounded-[2.5rem] flex items-center gap-4">
                  <Lock className="text-amber-600 animate-pulse shadow-lg" />
                  <div>
                    <h4 className="text-sm font-bold text-amber-900 uppercase tracking-widest">Dossier Occupé</h4>
                    <p className="text-xs text-amber-700 font-medium">Ce dossier est en cours de traitement par <span className="font-bold underline">{lockInfo?.userName}</span>.</p>
                  </div>
                </Card>
              ) : !(record.status === WorkflowStatus.DRAFT && isStudent) && (
                <DecisionsSection 
                  record={record} currentUser={currentUser} 
                  isReviewMode={isReviewMode}
                  isDone={isDone}
                  isLockedByOther={isLockedByOther}
                  canApprove={() => !isDone && !isLockedByOther && canApprove(
                    record.status, 
                    activeRole ? [activeRole] : (currentUser?.roles || []), 
                    currentUser?.department, 
                    record.data.department,
                    record.history[record.history.length - 2]?.status
                  )} 
                  comment={comment} setComment={setComment} 
                  isUploadRequired={isUploadRequired} uploadFile={uploadFile} 
                  handleFileUpload={handleFileUpload} handleApprove={handleApprove} 
                  handleRequestComplement={handleRequestComplement} handleReject={handleReject} 
                  canModify={canModify} navigate={navigate} 
                  activeRole={activeRole}
                />
              )}

              {/* Exchanges & History Section */}
              <ExchangeSection 
                record={record} 
                currentUser={currentUser} 
                replyComment={replyComment} 
                setReplyComment={setReplyComment} 
                addComment={addComment} 
                showAlert={showAlert} 
              />
            </div>

            <div className="space-y-8">
              {/* Detailed Info Card - Sidebar */}
              <Card className="p-8 space-y-10 border-none shadow-xl bg-card rounded-[2.5rem]">
                <div className="space-y-8">
                  <div className="flex items-center gap-3">
                    <Info size={20} className="text-primary" />
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground">Détails du Stage</h3>
                  </div>

                  <div className="space-y-8">
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary/60">Sujet du Projet</h4>
                      <div className="p-6 bg-secondary/40 rounded-3xl border border-border/50">
                        <p className="text-md font-medium text-foreground leading-relaxed italic">"{record.data.subject}"</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary/60">Organisme d'Accueil</h4>
                      <div className="space-y-5 p-6 bg-secondary/20 rounded-3xl border border-border/50">
                        <InfoItem label="Adresse" value={record.data.address} />
                        <InfoItem label="Email Tuteur" value={record.data.tutorEmail} />
                        <InfoItem label="Téléphone" value={record.data.tutorPhone} />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary/60">Stage</h4>
                      <div className="space-y-5 p-6 bg-secondary/20 rounded-3xl border border-border/50">
                        <InfoItem label="Type de Stage" value={record.data.stageType} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 pt-4">
                    <div className="flex items-center gap-3">
                      <FileText size={20} className="text-amber-500" />
                      <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground">Documents</h3>
                    </div>

                    <div className="space-y-4">
                      {/* Convention Card */}
                      <div className="p-5 rounded-3xl border border-border bg-secondary/30 flex flex-col gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 shadow-sm shrink-0">
                            <FileText size={20} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold uppercase text-foreground truncate">Convention PFE</p>
                            <p className="text-[9px] font-bold uppercase tracking-tighter text-muted-foreground mt-0.5">
                              {isConventionDownloadable(record.status) ? "Document Officiel" : "En cours de génération"}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 w-full">
                           <Button 
                            variant="ghost" size="sm" 
                            className="flex-1 bg-background/50 text-[10px] font-bold h-9"
                            disabled={!canPreview()}
                            onClick={() => setShowPDF(true)}
                          >
                            <Eye size={14} className="mr-1.5" /> {canPreview() ? "Aperçu" : "Verrouillé"}
                          </Button>
                          <Button 
                            variant="ghost" size="sm" 
                            className="flex-1 bg-background/50 text-[10px] font-bold h-9"
                            disabled={!isConventionDownloadable(record.status) && !currentUser?.roles.includes(Role.SUPERADMIN)}
                            onClick={downloadPDF}
                          >
                            <Download size={14} className="mr-1.5" /> {isDownloading ? "..." : "PDF"}
                          </Button>
                        </div>
                      </div>

                      {/* Dynamic Attachments from History */}
                      <div className="space-y-3 pt-2">
                        <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 px-2 flex items-center gap-2">
                          <Zap size={10} /> Pièces Jointes & Compléments
                        </h4>
                        
                        {/* Signed Convention */}
                        {record.conventionMetadata?.signedDocumentUrl && (isServiceRecherche || isSuperAdmin || isResponsable || isScolarite || isSecretariatDoyen || isViceDoyen) && (
                          <div className="group p-3 rounded-2xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/50 transition-all flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 border border-emerald-200/50 group-hover:scale-110 transition-transform">
                                <Stamp size={18} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase text-emerald-900 truncate">Convention Signée</p>
                                <p className="text-[8px] font-bold text-emerald-600/60 uppercase">Document Final</p>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" className="h-10 px-4 bg-emerald-500 text-white hover:bg-emerald-600 rounded-xl flex items-center gap-2 border shadow-lg shadow-emerald-500/20 active:scale-95 transition-all" onClick={() => setViewingDocumentUrl(record.conventionMetadata?.signedDocumentUrl!)}>
                              <Eye size={16} strokeWidth={2.5} />
                              <span className="text-[10px] font-black uppercase tracking-widest">Voir</span>
                            </Button>
                          </div>
                        )}

                        {/* Insurance document */}
                        {record.data.insuranceUrl && (
                          <div className="group p-3 rounded-2xl border border-blue-200 bg-blue-50/50 hover:bg-blue-100/50 transition-all flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-110 transition-transform">
                                <ShieldCheck size={18} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase text-blue-900 truncate">Assurance</p>
                                <p className="text-[8px] font-bold text-blue-600/60 uppercase">Document Requis</p>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" className="h-10 px-4 bg-blue-500 text-white hover:bg-blue-600 rounded-xl flex items-center gap-2 border shadow-lg shadow-blue-500/20 active:scale-95 transition-all" onClick={() => setViewingDocumentUrl(record.data.insuranceUrl!)}>
                              <Eye size={16} strokeWidth={2.5} />
                              <span className="text-[10px] font-black uppercase tracking-widest">Voir</span>
                            </Button>
                          </div>
                        )}

                        <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 px-2 flex items-center gap-2 pt-4">
                          <Zap size={10} /> Compléments de Dossier
                        </h4>
                        
                        {/* Complement document */}
                        {record.data.complementUrl && (
                          <div className="group p-3 rounded-2xl border border-amber-200 bg-amber-50/50 hover:bg-amber-100/50 transition-all flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0 group-hover:rotate-12 transition-transform">
                                <Plus size={18} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase text-amber-900 truncate">Pièce Complémentaire</p>
                                <p className="text-[8px] font-bold text-amber-600/60 uppercase">Mise à jour dossier</p>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" className="h-10 px-4 bg-amber-500 text-white hover:bg-amber-600 rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all" onClick={() => setViewingDocumentUrl(record.data.complementUrl!)}>
                              <Eye size={16} strokeWidth={2.5} />
                              <span className="text-[10px] font-black uppercase tracking-widest">Voir</span>
                            </Button>
                          </div>
                        )}
                        
                        {record.history.filter(h => h.attachmentUrl && h.attachmentUrl !== record.data.insuranceUrl && h.attachmentUrl !== record.data.complementUrl && h.attachmentUrl !== record.conventionMetadata?.signedDocumentUrl).length > 0 ? (
                          record.history.filter(h => h.attachmentUrl && h.attachmentUrl !== record.data.insuranceUrl && h.attachmentUrl !== record.data.complementUrl && h.attachmentUrl !== record.conventionMetadata?.signedDocumentUrl).reverse().map((h, idx) => (
                            <div key={idx} className="group p-3 rounded-2xl border border-border bg-secondary/40 hover:bg-secondary/60 transition-all flex items-center justify-between shadow-sm">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:scale-110 transition-transform">
                                  <FileText size={18} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[10px] font-black uppercase text-foreground truncate">Justificatif Étape</p>
                                  <p className="text-[8px] font-bold text-muted-foreground uppercase">{h.status.replace(/_/g, ' ')}</p>
                                </div>
                              </div>
                              <Button variant="ghost" size="sm" className="h-10 px-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl flex items-center gap-2 shadow-lg shadow-primary/10 active:scale-95 transition-all" onClick={() => setViewingDocumentUrl(h.attachmentUrl!)}>
                                <Eye size={16} strokeWidth={2.5} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Voir</span>
                              </Button>
                            </div>
                          ))
                        ) : !record.data.complementUrl && (
                          <div className="px-4 py-6 border border-dashed border-border rounded-3xl text-center opacity-40">
                            <p className="text-[9px] font-bold uppercase tracking-widest italic">Aucun complément</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </>
      )}

      {/* Modals */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Supprimer le Dossier"
        message="Cette action est irréversible."
        confirmText="Supprimer"
        variant="danger"
      />

      {/* Hidden container for PDF generation if modal is not open */}
      <div className="fixed -left-[9999px] top-0 pointer-events-none opacity-0">
        <ConventionPDFContent ref={pdfRef} record={record} template={template} />
      </div>

      <AnimatePresence>
        {showPDF && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowPDF(false)} />
            <motion.div initial={{ opacity: 0, y: 50, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 50, scale: 0.95 }} className="relative w-full max-w-5xl bg-background rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-[90vh] border border-border">
              <div className="h-24 px-10 border-b flex items-center justify-between shrink-0 bg-background/50 backdrop-blur-md">
                <div className="flex items-center gap-6">
                  <Logo className="h-10" />
                  <div className="w-px h-8 bg-border" />
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                      <FileText size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">Aperçu Convention</h3>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Réf: {record.id}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden md:flex items-center bg-secondary/50 rounded-2xl p-1 px-3 gap-3 mr-4">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => setZoom(prev => Math.max(0.5, prev - 0.1))}><ZoomOut size={16} /></Button>
                    <span className="text-[10px] font-black w-10 text-center">{Math.round(zoom * 100)}%</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => setZoom(prev => Math.min(1.5, prev + 0.1))}><ZoomIn size={16} /></Button>
                  </div>
                  <Button onClick={downloadPDF} disabled={isDownloading} className="rounded-2xl px-6 h-12 font-bold uppercase text-[10px] tracking-widest gap-2 shadow-lg shadow-primary/20">
                    {isDownloading ? <RefreshCw className="animate-spin" size={16} /> : <Download size={16} />} 
                    {isDownloading ? "Génération..." : "Télécharger PDF"}
                  </Button>
                  <div className="w-px h-8 bg-border mx-2" />
                  <Button variant="ghost" onClick={() => setShowPDF(false)} className="w-12 h-12 p-0 rounded-2xl bg-secondary/50 hover:bg-red-50 hover:text-red-600 transition-colors">
                    <X size={24} />
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-12 bg-secondary/20 custom-scrollbar">
                <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }} className="mx-auto h-fit pdf-zoom-container bg-white shadow-2xl">
                  <ConventionPDFContent record={record} template={template} />
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingDocumentUrl && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80" onClick={() => setViewingDocumentUrl(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-6xl h-[90vh] bg-background rounded-3xl overflow-hidden flex flex-col shadow-2xl border-4 border-black/20">
              <div className="h-20 px-8 border-b flex items-center justify-between bg-background/80 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <Eye size={20} />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">Visualisation du Document</h3>
                </div>
                <Button 
                  variant="ghost" 
                  onClick={() => setViewingDocumentUrl(null)} 
                  className="w-14 h-14 p-0 rounded-2xl bg-secondary/50 hover:bg-red-500 hover:text-white transition-all group"
                >
                  <X size={28} strokeWidth={3} className="group-hover:rotate-90 transition-transform" />
                </Button>
              </div>
              <div className="flex-1 p-4 bg-secondary">
                <iframe src={viewingDocumentUrl} className="w-full h-full rounded-xl border border-border" />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ExchangeSection = ({ 
  record, currentUser, 
  replyComment, setReplyComment, addComment, showAlert 
}: any) => {
  const isDone = record.status === WorkflowStatus.COMPLETED || 
                 record.status === WorkflowStatus.REJECTED || 
                 record.status === WorkflowStatus.CANCELLED;
  
  return (
    <Card className="p-0 overflow-hidden border-border shadow-sm rounded-[2.5rem]">
      <div className="px-8 py-6 border-b border-border bg-secondary/20">
        <div className="flex items-center gap-3">
          <MessageSquare size={18} className="text-primary" />
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground">Commentaires & Historique des Échanges</h3>
        </div>
      </div>
      <div className="px-8 pb-10 pt-8 space-y-8 bg-card">
        <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {record.history.filter((h: any) => h.comment).reverse().map((h: any, idx: number) => {
            const isComplementComment = h.status === WorkflowStatus.COMPLEMENT_REQUIRED;
            return (
              <div key={idx} id={isComplementComment ? "latest-complement-comment" : undefined} className={`relative p-6 rounded-[2rem] border ${
                isComplementComment 
                  ? 'bg-orange-500/10 border-orange-500 shadow-lg shadow-orange-500/10 scale-[1.02] ring-2 ring-orange-500/20' 
                  : h.updatedByRole === Role.STUDENT 
                    ? 'bg-secondary/40 border-border mr-12' 
                    : 'bg-primary/5 border-primary/20 ml-12'
              }`}>
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isComplementComment ? 'bg-orange-500 animate-ping' : h.updatedByRole === Role.STUDENT ? 'bg-blue-400' : 'bg-primary animate-pulse'}`} />
                    <p className="text-xs font-bold text-foreground uppercase tracking-tight">{h.updatedBy}</p>
                    <span className="text-[8px] bg-foreground/5 px-2 py-0.5 rounded-full text-muted-foreground font-bold uppercase tracking-widest">{h.updatedByRole}</span>
                    {isComplementComment && <Badge className="bg-orange-500 text-white border-0 text-[8px] ml-2 animate-bounce">Observation Critique</Badge>}
                  </div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase">{new Date(h.updatedAt).toLocaleDateString()} {new Date(h.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <p className={`text-sm leading-relaxed ${isComplementComment ? 'text-orange-950 font-medium' : 'text-foreground'}`}>"{h.comment}"</p>
                <div className="mt-3 pt-3 border-t border-border/10 flex items-center justify-between">
                  <span className={`text-[9px] font-bold uppercase tracking-widest ${isComplementComment ? 'text-orange-600' : 'text-muted-foreground/60'}`}>Action: {getStatusLabel(h.status)}</span>
                  {h.attachmentUrl && (
                     <span className="text-[9px] font-bold uppercase tracking-widest text-primary flex items-center gap-1">
                       <FileText size={10} /> Document joint
                     </span>
                  )}
                </div>
              </div>
            );
          })}
          {record.history.filter((h: any) => h.comment).length === 0 && (
            <div className="py-12 text-center text-muted-foreground/40 italic">
              <MessageSquare size={32} className="mx-auto mb-3 opacity-10" />
              <p className="text-xs font-bold uppercase tracking-widest">Aucun commentaire pour le moment</p>
            </div>
          )}
        </div>
        {isDone ? (
          <div className="pt-6 border-t border-border text-center">
            <div className="bg-secondary/20 p-6 rounded-3xl border border-dashed border-border flex flex-col items-center gap-2">
              <ShieldCheck size={24} className="text-muted-foreground/40" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Ce dossier est {record.status === WorkflowStatus.REJECTED ? 'rejeté' : record.status === WorkflowStatus.CANCELLED ? 'annulé' : 'terminé'}. Les échanges sont clôturés.
              </p>
            </div>
          </div>
        ) : (
          <div className="pt-6 border-t border-border space-y-4">
            <textarea
              value={replyComment}
              onChange={(e) => setReplyComment(e.target.value)}
              placeholder="Écrire un message ou une observation..."
              className="w-full p-6 bg-secondary/30 border-2 border-border focus:border-primary rounded-[2rem] text-sm outline-none transition-all resize-none shadow-inner h-32"
            />
            <div className="flex justify-end">
              <Button 
                size="sm" 
                className="rounded-xl px-8 h-10 text-[10px] font-bold uppercase tracking-widest"
                onClick={() => { 
                  if (replyComment.trim()) {
                    addComment(record.id, replyComment); 
                    setReplyComment(''); 
                    showAlert('Succès', 'Votre commentaire a été publié.', 'success');
                  }
                }}
              >
                Publier le message
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

const DecisionsSection = ({ 
  record, currentUser, canApprove, comment, setComment, 
  isUploadRequired, uploadFile, handleFileUpload, 
  handleApprove, handleRequestComplement, handleReject, 
  canModify, navigate, isReviewMode = false, isDone = false,
  activeRole, isLockedByOther
}: any) => {
  return (
    <Card className="p-8 md:p-10 space-y-8 border-none shadow-xl bg-card rounded-[2.5rem]">
      <div className="space-y-6">
        <div className="flex items-center gap-3 text-primary">
          <Zap size={20} className="fill-current" />
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em]">Décision & Actions</h3>
        </div>

        {(canApprove() || canModify()) && !isDone && activeRole !== Role.ENCADRANT_FST ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-4">
              {canApprove() && (
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Commentaire pour cette décision..."
                  className="w-full h-48 p-6 bg-background border-2 border-border focus:border-primary rounded-[2rem] text-sm outline-none transition-all resize-none shadow-inner"
                />
              )}
              {canApprove() && isUploadRequired && (
                <div className="p-6 bg-background border-2 border-dashed border-border hover:border-primary/50 rounded-[1.5rem] text-center">
                  <input type="file" id="upload-action" className="hidden" onChange={handleFileUpload} />
                  <label htmlFor="upload-action" className="cursor-pointer flex flex-col items-center gap-2">
                    <Upload size={24} className="text-muted-foreground" />
                    <span className="text-xs font-bold uppercase">{uploadFile ? "Fichier lié" : "Joindre un document"}</span>
                  </label>
                </div>
              )}
            </div>
            <div className="lg:col-span-5 flex flex-col gap-3">
              {canApprove() && (
                <Button 
                  onClick={handleApprove} 
                  disabled={(isUploadRequired && !uploadFile) || isLockedByOther}
                  className="w-full py-6 rounded-2xl uppercase text-xs font-bold h-auto gap-3"
                >
                  <CheckCircle2 size={18} /> {getActionButtonLabel(record, currentUser, uploadFile, isReviewMode)}
                </Button>
              )}
              <div className="grid grid-cols-2 gap-3">
                {canApprove() && !currentUser?.roles?.includes(Role.STUDENT) && (
                  <Button variant="outline" onClick={handleRequestComplement} disabled={isLockedByOther} className="py-4 rounded-xl text-[10px] font-bold h-auto uppercase">Complément</Button>
                )}
                {canApprove() && !currentUser?.roles?.includes(Role.STUDENT) && (
                  <Button variant="danger" onClick={handleReject} disabled={isLockedByOther} className="py-4 rounded-xl text-[10px] font-bold h-auto bg-destructive/10 text-destructive border-none uppercase">Rejeter</Button>
                )}
              </div>
              {canModify() && (
                <Button variant="outline" onClick={() => navigate(`/edit-request/${record.id}`)} className="w-full py-4 rounded-xl text-[10px] uppercase font-bold border-2 border-border h-auto mt-auto">Modifier</Button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-8 bg-secondary/30 rounded-[2rem] border border-dashed border-border flex flex-col items-center justify-center text-center space-y-3">
            {isDone ? <CheckCircle2 size={24} className="text-green-500/30" /> : <ShieldCheck size={24} className="text-muted-foreground/30" />}
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {isDone ? 'Traitement Terminé' : activeRole === Role.ENCADRANT_FST ? 'Espace d\'Échange Encadrant' : 'Consultation Uniquement'}
            </p>
            {activeRole === Role.ENCADRANT_FST && !isDone && (
              <p className="text-[9px] text-muted-foreground font-medium opacity-60 max-w-[200px]">Utilisez la section commentaires ci-dessous pour échanger avec l'étudiant.</p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
