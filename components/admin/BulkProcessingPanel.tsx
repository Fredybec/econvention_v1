import React, { useState, useEffect, useRef } from 'react';
import { QrCode, ClipboardList, CheckCircle2, AlertCircle, Search, Trash2, Send, Camera, X, ShieldCheck, FileCheck, UserCheck, Stamp, ArrowRightLeft, PackageCheck, CheckCircle, ChevronUp, ChevronDown, Building2, FileText, History, ChevronRight } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useAppContext } from '../../context/AppContext';
import { WorkflowStatus, Role, PFERecord } from '../../types';
import { getNextStatus } from '../../utils/workflow';
import { Scanner } from '@yudiel/react-qr-scanner';
import { motion, AnimatePresence } from 'motion/react';
import { Badge } from '../ui/Badge';
import { ConventionPDFContent } from '../shared/ConventionPDFContent';
import { ZoomIn, ZoomOut, RefreshCw, Eye } from 'lucide-react';

import { QRReceptionScanner } from './QRReceptionScanner';

export const BulkProcessingPanel = () => {
  const { records, users, updateRecordStatus, bulkUpdateRecordStatus, currentUser, showAlert } = useAppContext();
  const [bulkIds, setBulkIds] = useState<string[]>([]);
  const [processingResults, setProcessingResults] = useState<{ id: string; status: 'success' | 'error'; message: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isReceptionMode, setIsReceptionMode] = useState(false);
  const [verificationRecord, setVerificationRecord] = useState<PFERecord | null>(null);
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const [manualId, setManualId] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [zoom, setZoom] = useState(0.45);
  const { template } = useAppContext();

  const addIdToQueue = (id: string) => {
    const cleanedId = id.trim().toUpperCase();
    if (!cleanedId) return;

    // Verify if the convention exists in the records
    const recordExists = records.some(r => r.id === cleanedId);
    if (!recordExists) {
      showAlert('Convention Introuvable', `L'ID "${cleanedId}" ne correspond à aucune convention dans le système.`, 'error');
      return;
    }

    setBulkIds(prev => {
      if (prev.includes(cleanedId)) return prev;
      return [...prev, cleanedId];
    });
  };

  const removeIdFromQueue = (id: string) => {
    setBulkIds(prev => prev.filter(i => i !== id));
  };

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // Stop the stream immediately to turn off the camera light
      stream.getTracks().forEach(track => track.stop());
      showAlert('Succès', 'Permission caméra accordée.', 'success');
    } catch (err) {
      if (err instanceof Error && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
        showAlert('Permission Refusée', 'Veuillez autoriser l\'accès à la caméra dans les paramètres de votre navigateur pour utiliser le scanner.', 'error');
      } else {
        showAlert('Erreur', 'Impossible d\'accéder à la caméra. Vérifiez qu\'elle n\'est pas utilisée par une autre application.', 'error');
      }
    }
  };

  const parseId = (text: string): string => {
    // If it's a verification URL, extract the ID
    if (text.includes('/verify/')) {
      const parts = text.split('/verify/');
      return parts[parts.length - 1].trim().toUpperCase();
    }
    return text.trim().toUpperCase();
  };

  const isServiceRecherche = currentUser?.roles?.includes(Role.SERVICE_RECHERCHE_COOP);
  const isSecretariatDoyen = currentUser?.roles?.includes(Role.SECRETARIAT_DOYEN);
  const isScolarite = currentUser?.roles?.includes(Role.SCOLARITE);
  const isViceDoyen = currentUser?.roles?.some(r => [Role.VICE_DOYEN_RECHERCHE, Role.VICE_DOYEN_PEDAGOGIE].includes(r));
  const isSuperAdmin = currentUser?.roles?.includes(Role.SUPERADMIN);

  const getTransitionError = (record: PFERecord, action: string): string | null => {
    if (isServiceRecherche || isSuperAdmin) {
      if (action === 'PHYSICAL_RECEIVE' && record.status !== WorkflowStatus.PENDING_TRANSFER_SERVICE_STAGE) {
        return `Statut actuel "${record.status}" ne permet pas la réception physique (Attente dépôt requis)`;
      }
      if (action === 'READY_PICKUP' && record.status !== WorkflowStatus.SIGNED_EN_ROUTE) {
        return `Statut actuel "${record.status}" ne permet pas la mise à disposition (Attente retour décanat)`;
      }
      if (action === 'PICKUP_COMPLETE' && record.status !== WorkflowStatus.READY_FOR_PICKUP) {
        return `Statut actuel "${record.status}" ne permet pas la remise (Le dossier n'est pas encore prêt)`;
      }
    }
    if (isScolarite || isSuperAdmin) {
      if (action === 'SCOLARITE_VALIDATE' && record.status !== WorkflowStatus.PENDING_SCOLARITE) {
        return `Validation scolarité impossible (Statut actuel: ${record.status})`;
      }
    }
    if (isViceDoyen || isSuperAdmin) {
      if (action === 'VICE_DOYEN_VALIDATE' && ![WorkflowStatus.PENDING_VICE_DOYEN_PEDAGOGIE, WorkflowStatus.PENDING_VICE_DOYEN_RECHERCHE].includes(record.status)) {
        return `Validation décanat impossible (Statut actuel: ${record.status})`;
      }
    }
    if (isSecretariatDoyen || isSuperAdmin) {
      if (action === 'DOYEN_RECEIVE' && record.status !== WorkflowStatus.PENDING_TRANSFER_DOYEN) {
        return `Impossible de réceptionner: Statut invalide (Statut actuel: ${record.status})`;
      }
      if (action === 'DOYEN_SIGNED' && ![WorkflowStatus.PENDING_DOYEN_SIGNATURE, WorkflowStatus.PENDING_TRANSFER_DOYEN].includes(record.status)) {
        return `Impossible de confirmer la signature: Statut invalide (Statut actuel: ${record.status})`;
      }
    }
    return null;
  };

  const handleBulkProcess = React.useCallback(async (action: string, specificIds?: string[]) => {
    const ids = specificIds || bulkIds;
    if (ids.length === 0) {
      showAlert('Erreur', 'Veuillez entrer au moins un ID de convention.', 'error');
      return;
    }

    setIsProcessing(true);
    const results: { id: string; status: 'success' | 'error'; message: string }[] = [];
    const updates: { id: string; status: WorkflowStatus; comment?: string }[] = [];
    const successfulIds: string[] = [];

    ids.forEach(id => {
      const record = records.find(r => r.id === id);
      if (!record) {
        results.push({ id, status: 'error', message: 'Convention non trouvée' });
        return;
      }

      let nextStatus: WorkflowStatus | null = null;
      let comment = '';
      let failureReason = getTransitionError(record, action) || '';

      if (!failureReason) {
        // Service Recherche Actions
        if (isServiceRecherche || isSuperAdmin) {
          if (action === 'PHYSICAL_RECEIVE') {
            nextStatus = WorkflowStatus.PENDING_TRANSFER_DOYEN;
            comment = 'Réception physique de la convention effectuée';
          } else if (action === 'READY_PICKUP') {
            nextStatus = WorkflowStatus.READY_FOR_PICKUP;
            comment = 'Convention prête pour retrait';
          } else if (action === 'PICKUP_COMPLETE') {
            nextStatus = WorkflowStatus.COMPLETED;
            comment = 'Convention récupérée par l\'étudiant';
          }
        }

        // Scolarité Actions
        if ((isScolarite || isSuperAdmin) && !nextStatus) {
          if (action === 'SCOLARITE_VALIDATE') {
            nextStatus = WorkflowStatus.PENDING_SERVICE_RECHERCHE;
            comment = 'Validation scolarité effectuée';
          }
        }

        // Vice Doyen Actions
        if ((isViceDoyen || isSuperAdmin) && !nextStatus) {
          if (action === 'VICE_DOYEN_VALIDATE') {
            nextStatus = WorkflowStatus.PENDING_STUDENT_SIGNATURE;
            comment = 'Validation décanat effectuée';
          }
        }

        // Secretariat Doyen Actions
        if ((isSecretariatDoyen || isSuperAdmin) && !nextStatus) {
          if (action === 'DOYEN_RECEIVE') {
            nextStatus = WorkflowStatus.PENDING_DOYEN_SIGNATURE;
            comment = 'Réception au décanat confirmée';
          } else if (action === 'DOYEN_SIGNED') {
            nextStatus = WorkflowStatus.SIGNED_EN_ROUTE;
            comment = 'Signée par le Doyen';
          }
        }
      }

      if (nextStatus) {
        updates.push({ id: record.id, status: nextStatus, comment });
        results.push({ id: record.id, status: 'success', message: `Succès: ${action}` });
        successfulIds.push(record.id);
      } else {
        results.push({ id: record.id, status: 'error', message: failureReason || 'Action non autorisée' });
      }
    });

    if (updates.length > 0) {
      try {
        await bulkUpdateRecordStatus(updates);
        // Remove successful IDs from the queue if not specificIds
        if (!specificIds) {
          setBulkIds(prev => prev.filter(id => !successfulIds.includes(id)));
        }
      } catch (err) {
        console.error("Bulk update failed:", err);
        showAlert("Erreur", "La mise à jour en masse a échoué.", "error");
      }
    }

    setProcessingResults(prev => [...results, ...prev]);
    setIsProcessing(false);
    return updates.length === ids.length;
  }, [bulkIds, records, bulkUpdateRecordStatus, isServiceRecherche, isSuperAdmin, isSecretariatDoyen, isScolarite, isViceDoyen, showAlert]);

  useEffect(() => {
  }, [isScanning, isReceptionMode, handleBulkProcess, showAlert]);

  if (!currentUser?.roles?.some(r => [
    Role.SERVICE_RECHERCHE_COOP, 
    Role.SECRETARIAT_DOYEN, 
    Role.SCOLARITE,
    Role.VICE_DOYEN_PEDAGOGIE,
    Role.VICE_DOYEN_RECHERCHE,
    Role.SUPERADMIN
  ].includes(r))) {
    return null;
  }

  return (
    <div className="p-0 md:p-2 space-y-6 max-w-6xl mx-auto">
      {/* 1. Main Operation Panel */}
      <Card className="p-6 md:p-8 rounded-[2.5rem] bg-white border-slate-200 shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
              <Send size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-slate-900">Traitement en Masse</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Console d'opérations groupées</p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            {isServiceRecherche && (
              <Button 
                onClick={() => {
                  setIsReceptionMode(true);
                  setIsScanning(true);
                }}
                className="flex-1 md:flex-none rounded-full px-6 bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-600/20 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 h-12"
              >
                <Stamp size={18} /> Réception Physique
              </Button>
            )}
            <Button 
              onClick={() => {
                setIsReceptionMode(false);
                setIsScanning(!isScanning);
              }}
              className={`flex-1 md:flex-none rounded-full px-6 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 h-12 transition-all ${
                isScanning && !isReceptionMode ? 'bg-red-500 text-white' : 'bg-slate-900 text-white shadow-lg shadow-slate-900/20'
              }`}
            >
              {isScanning && !isReceptionMode ? <X size={18} /> : <Camera size={18} />}
              {isScanning && !isReceptionMode ? 'Arrêter' : 'Scanner File'}
            </Button>
          </div>
        </div>

        {/* Scan/Input Interface */}
        <div className="space-y-6 relative z-10">
          <AnimatePresence>
            {isScanning && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="relative bg-black rounded-[2rem] overflow-hidden border-4 border-primary/30 shadow-2xl min-h-[300px] md:min-h-[400px]"
              >
                <Scanner
                  onScan={async (detectedCodes) => {
                    if (detectedCodes.length > 0) {
                      const rawText = detectedCodes[0].rawValue;
                      const decodedId = parseId(rawText);
                      
                      if (isReceptionMode) {
                        const record = records.find(r => r.id === decodedId);
                        if (record) {
                          setVerificationRecord(record);
                          setCurrentAction('PHYSICAL_RECEIVE');
                          setIsScanning(false);
                          setIsReceptionMode(false);
                          showAlert('Trouvé', `Convention ${decodedId} identifiée.`, 'success');
                        } else {
                          showAlert('Erreur', `Convention ${decodedId} introuvable.`, 'error');
                        }
                      } else {
                        addIdToQueue(decodedId);
                        showAlert('Ajouté', `ID ${decodedId} ajouté à la file.`, 'success');
                      }
                    }
                  }}
                  onError={(error) => console.error("Scanner Error:", error)}
                  styles={{ container: { width: '100%', height: '100%', minHeight: '300px' } }}
                  components={{ torch: true }}
                />
                <button 
                  onClick={() => setIsScanning(false)}
                  className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-full flex items-center justify-center"
                >
                  <X size={20} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
              <input 
                type="text"
                value={manualId}
                onChange={(e) => setManualId(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    addIdToQueue(manualId);
                    setManualId('');
                  }
                }}
                placeholder="Entrer ID manuellement..."
                className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-primary focus:bg-white outline-none transition-all"
              />
            </div>
            <Button 
              onClick={() => {
                addIdToQueue(manualId);
                setManualId('');
              }}
              disabled={!manualId.trim()}
              className="px-10 h-14 rounded-2xl bg-primary text-white font-black text-[10px] uppercase tracking-widest shadow-lg"
            >
              Ajouter
            </Button>
          </div>

          <div className="bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-[2rem] p-6 md:p-8 min-h-[120px] flex flex-wrap gap-3 content-start">
            {bulkIds.length === 0 ? (
              <div className="w-full flex flex-col items-center justify-center text-slate-300 py-4">
                <ClipboardList size={32} className="mb-2 opacity-50" />
                <p className="text-[10px] font-black uppercase tracking-widest">La file est vide</p>
              </div>
            ) : (
              bulkIds.map((id) => (
                <Badge 
                  key={id}
                  className="pl-4 pr-1 py-1.5 rounded-full bg-white border-2 border-slate-100 text-slate-700 text-[11px] font-bold flex items-center gap-3 shadow-sm group hover:border-primary/20 transition-all"
                >
                  {id}
                  <button 
                    onClick={() => removeIdFromQueue(id)}
                    className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </Badge>
              ))
            )}
            {bulkIds.length > 0 && (
              <button 
                onClick={() => setBulkIds([])}
                className="ml-auto text-[10px] font-black uppercase tracking-widest text-red-500 hover:underline"
              >
                Vider la file
              </button>
            )}
          </div>
        </div>

        {/* Action Grid */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          {(isServiceRecherche || isSuperAdmin) && (
            <div className="bg-orange-50/30 border border-orange-100 rounded-[2rem] p-6 space-y-4">
              <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-700">Service Stages</span>
                <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
              </div>
              <div className="space-y-2">
                {[
                  { action: 'PHYSICAL_RECEIVE', icon: Stamp, label: 'Réception Physique', color: 'hover:bg-orange-100 text-orange-700' },
                  { action: 'READY_PICKUP', icon: PackageCheck, label: 'Prêt pour Retrait', color: 'hover:bg-emerald-100 text-emerald-700' },
                  { action: 'PICKUP_COMPLETE', icon: CheckCircle, label: 'Confirmer Remise', color: 'hover:bg-slate-900 hover:text-white text-slate-700' },
                ].map(btn => (
                  <button 
                    key={btn.action}
                    onClick={() => handleBulkProcess(btn.action)}
                    disabled={isProcessing || bulkIds.length === 0}
                    className={`w-full py-4 px-6 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-between group transition-all border border-transparent ${btn.color} disabled:opacity-20`}
                  >
                    <div className="flex items-center gap-4">
                      <btn.icon size={20} className="shrink-0" />
                      {btn.label}
                    </div>
                    <ChevronRight size={18} className="opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {(isSecretariatDoyen || isSuperAdmin) && (
            <div className="bg-indigo-50/30 border border-indigo-100 rounded-[2rem] p-6 space-y-4">
              <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700">Décanat</span>
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              </div>
              <div className="space-y-2">
                {[
                  { action: 'DOYEN_RECEIVE', icon: ArrowRightLeft, label: 'Réception Décanat', color: 'hover:bg-indigo-100 text-indigo-700' },
                  { action: 'DOYEN_SIGNED', icon: CheckCircle, label: 'Confirmer Signature', color: 'hover:bg-emerald-100 text-emerald-700' },
                ].map(btn => (
                  <button 
                    key={btn.action}
                    onClick={() => handleBulkProcess(btn.action)}
                    disabled={isProcessing || bulkIds.length === 0}
                    className={`w-full py-4 px-6 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-between group transition-all border border-transparent ${btn.color} disabled:opacity-20`}
                  >
                    <div className="flex items-center gap-4">
                      <btn.icon size={20} className="shrink-0" />
                      {btn.label}
                    </div>
                    <ChevronRight size={18} className="opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {(isScolarite || isSuperAdmin) && (
            <div className="bg-blue-50/30 border border-blue-100 rounded-[2rem] p-6">
              <button 
                onClick={() => handleBulkProcess('SCOLARITE_VALIDATE')}
                disabled={isProcessing || bulkIds.length === 0}
                className="w-full py-6 px-6 bg-blue-600/10 text-blue-700 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-between group hover:bg-blue-600 hover:text-white transition-all disabled:opacity-20"
              >
                <div className="flex items-center gap-4">
                  <UserCheck size={24} />
                  Validation Scolarité
                </div>
                <ChevronRight size={20} />
              </button>
            </div>
          )}

          {(isViceDoyen || isSuperAdmin) && (
            <div className="bg-rose-50/30 border border-rose-100 rounded-[2rem] p-6">
              <button 
                onClick={() => handleBulkProcess('VICE_DOYEN_VALIDATE')}
                disabled={isProcessing || bulkIds.length === 0}
                className="w-full py-6 px-6 bg-rose-600/10 text-rose-700 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-between group hover:bg-rose-600 hover:text-white transition-all disabled:opacity-20"
              >
                <div className="flex items-center gap-4">
                  <Stamp size={24} />
                  Signature Vice-Doyen
                </div>
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* 2. Journal Panel (Below) */}
      <Card className="rounded-[2.5rem] bg-slate-50 border-slate-200 shadow-lg overflow-hidden flex flex-col max-h-[600px]">
        <div className="p-6 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
              <ClipboardList size={20} />
            </div>
            <div>
              <h4 className="text-[12px] font-black uppercase tracking-widest text-slate-900">Journal d'Activité</h4>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Rapport de traitement</p>
            </div>
          </div>
          <button 
            onClick={() => setProcessingResults([])}
            disabled={processingResults.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all disabled:opacity-0"
          >
            <Trash2 size={14} /> Effacer
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
          {processingResults.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-300">
              <History size={40} className="mb-4 opacity-20" />
              <p className="text-[10px] font-black uppercase tracking-widest">Aucune activité enregistrée</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {processingResults.map((res, idx) => (
                <motion.div 
                  key={`${res.id}-${idx}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex items-center gap-4 p-4 rounded-2xl bg-white border transition-all ${
                    res.status === 'success' ? 'border-emerald-100 shadow-sm' : 'border-red-100 shadow-sm'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    res.status === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                  }`}>
                    {res.status === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{res.id}</span>
                      <span className="text-[8px] font-bold text-slate-400">
                        {new Date().toLocaleTimeString()}
                      </span>
                    </div>
                    <p className={`text-[11px] font-bold ${
                      res.status === 'success' ? 'text-slate-600' : 'text-red-500'
                    }`}>
                      {res.message}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
        
        {processingResults.length > 0 && (
          <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-black text-slate-500 uppercase">{processingResults.filter(r => r.status === 'success').length} SUCCÈS</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-[10px] font-black text-slate-500 uppercase">{processingResults.filter(r => r.status === 'error').length} ÉCHECS</span>
            </div>
          </div>
        )}
      </Card>


        {/* Verification Modal */}
        <AnimatePresence>
          {verificationRecord && (
            <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center p-0 md:p-4 bg-background/60 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 100 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 100 }}
                className="w-full max-w-3xl"
              >
                <Card className="w-full h-[90vh] md:h-auto overflow-y-auto p-6 md:p-10 space-y-6 md:space-y-8 bg-card border-border rounded-t-[2rem] md:rounded-[3rem] shadow-2xl relative">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                  
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner shrink-0">
                        <ShieldCheck size={24} className="md:w-8 md:h-8" />
                      </div>
                      <div>
                        <h3 className="text-lg md:text-2xl font-black uppercase tracking-tighter">Vérification</h3>
                        <p className="text-[8px] md:text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Contrôle de conformité</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setShowPdfPreview(true)}
                        className="rounded-full hover:bg-primary/10 text-primary h-10 px-4 md:px-6 uppercase text-[10px] font-bold tracking-widest flex items-center gap-2"
                      >
                        <Eye size={16} /> <span className="hidden xs:inline">Aperçu Convention</span>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => {
                          setVerificationRecord(null);
                          setCurrentAction(null);
                          setModalError(null);
                        }} 
                        className="rounded-full hover:bg-red-50 text-red-500 hover:text-red-600 w-10 h-10 md:w-12 md:h-12 border border-red-100 transition-all shadow-sm flex items-center justify-center shrink-0"
                        aria-label="Fermer"
                      >
                        <X size={24} strokeWidth={2.5} className="md:w-6 md:h-6 shrink-0" />
                      </Button>
                    </div>
                  </div>

                  {modalError && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-destructive/10 border border-destructive/20 rounded-2xl flex items-center gap-3 text-destructive relative z-10"
                    >
                      <AlertCircle size={20} />
                      <p className="text-xs font-bold uppercase tracking-widest">{modalError}</p>
                    </motion.div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                    {/* Student Section */}
                    <div className="md:col-span-2 p-6 bg-secondary/30 rounded-[2rem] border border-border/50 space-y-4">
                      <div className="flex items-center gap-2 text-primary">
                        <UserCheck size={18} />
                        <h4 className="text-[10px] font-black uppercase tracking-widest">Informations Étudiant</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <div>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Nom Complet</p>
                            <p className="text-base font-black text-foreground tracking-tight">{verificationRecord.studentName}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Date de Naissance</p>
                            <p className="text-xs font-bold text-foreground">
                              {users.find(u => u.id === verificationRecord.studentId)?.birthDate || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">ID Dossier</p>
                            <p className="text-xs font-mono font-black text-primary">{verificationRecord.id}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Code Massar (CNE)</p>
                            <p className="text-xs font-bold text-foreground">{verificationRecord.data.massarCode}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Code Appogee</p>
                            <p className="text-xs font-bold text-foreground">{verificationRecord.data.appogeeCode}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Filière</p>
                            <p className="text-xs font-bold text-foreground uppercase">{verificationRecord.data.filiere}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Niveau / Année</p>
                            <p className="text-xs font-bold text-foreground uppercase">
                              {verificationRecord.data.currentLevel || users.find(u => u.id === verificationRecord.studentId)?.currentLevel || 'N/A'} 
                              {' / '}
                              {verificationRecord.data.registrationYear || users.find(u => u.id === verificationRecord.studentId)?.registrationYear || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Stage Section */}
                    <div className="p-6 bg-secondary/30 rounded-[2rem] border border-border/50 space-y-4">
                      <div className="flex items-center gap-2 text-primary">
                        <Stamp size={18} />
                        <h4 className="text-[10px] font-black uppercase tracking-widest">Détails du Stage</h4>
                      </div>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Type</p>
                            <Badge variant="outline" className="text-[9px] font-black h-5">{verificationRecord.data.stageType}</Badge>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Nature</p>
                            <p className="text-xs font-bold text-foreground">{verificationRecord.data.nature}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Période</p>
                          <p className="text-xs font-bold text-foreground">{verificationRecord.data.startDate} au {verificationRecord.data.endDate}</p>
                        </div>
                      </div>
                    </div>

                    {/* Company & Subject Section */}
                    <div className="md:col-span-2 p-6 bg-secondary/30 rounded-[2rem] border border-border/50 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-primary">
                            <Building2 size={18} />
                            <h4 className="text-[10px] font-black uppercase tracking-widest">Organisme & Encadrement</h4>
                          </div>
                          <div className="space-y-3">
                            <div>
                              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Entreprise d'accueil</p>
                              <p className="text-sm font-black text-foreground uppercase">{verificationRecord.data.companyName}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Tuteur Entreprise</p>
                                <p className="text-xs font-bold text-foreground/80">{verificationRecord.data.tutorName}</p>
                              </div>
                              <div>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Encadrant FST</p>
                                <p className="text-xs font-bold text-foreground/80">{verificationRecord.data.fstTutorName}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-primary">
                            <FileText size={18} />
                            <h4 className="text-[10px] font-black uppercase tracking-widest">Sujet du PFE</h4>
                          </div>
                          <div className="p-4 bg-card rounded-xl border border-border/50 h-full">
                            <p className="text-xs font-medium text-muted-foreground leading-relaxed italic">
                              "{verificationRecord.data.subject}"
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-orange-500/5 rounded-[2rem] border-2 border-orange-500/20 relative z-10">
                    <div className="flex gap-4 items-center">
                      <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-600 shrink-0">
                        <AlertCircle size={24} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-black text-orange-700 uppercase tracking-widest">Point de contrôle critique</p>
                        <p className="text-[11px] font-medium text-orange-600/80 leading-relaxed">
                          Vérifiez que la convention physique comporte les <span className="font-bold underline">signatures et cachets originaux</span> de l'étudiant, de l'entreprise et de l'encadrant FST.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-3 md:gap-4 relative z-10">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setVerificationRecord(null);
                        setCurrentAction(null);
                        setModalError(null);
                      }}
                      className="flex-1 py-4 md:py-8 rounded-xl md:rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 hover:bg-secondary transition-all order-2 md:order-1"
                    >
                      Annuler
                    </Button>
                    <Button 
                      onClick={async () => {
                        setModalError(null);
                        if (currentAction && verificationRecord) {
                          setIsProcessing(true);
                          const success = await handleBulkProcess(currentAction, [verificationRecord.id]);
                          if (success) {
                            setVerificationRecord(null);
                            setCurrentAction(null);
                          } else {
                            setModalError(`Erreur lors du traitement.`);
                          }
                          setIsProcessing(false);
                        }
                      }}
                      className="flex-[2] py-4 md:py-8 rounded-xl md:rounded-2xl text-[10px] font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 order-1 md:order-2"
                    >
                      <CheckCircle2 size={18} />
                      <span className="truncate">Confirmer</span>
                    </Button>
                  </div>

                  {/* Nested PDF Preview Modal */}
                  <AnimatePresence>
                    {showPdfPreview && verificationRecord && (
                      <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                          onClick={() => setShowPdfPreview(false)}
                        />
                        <motion.div
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.9, opacity: 0 }}
                          className="relative bg-background w-full max-w-4xl h-[85vh] rounded-[2rem] shadow-2xl border border-border flex flex-col overflow-hidden"
                        >
                          <div className="h-16 px-6 border-b border-border flex items-center justify-between shrink-0 bg-background">
                            <div className="flex items-center gap-3">
                              <FileText size={18} className="text-primary" />
                              <h4 className="text-[10px] font-black uppercase tracking-widest">Aperçu du document</h4>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded-lg border border-border">
                                <button onClick={() => setZoom(prev => Math.max(0.2, prev - 0.05))} className="p-1 hover:bg-card rounded-md"><ZoomOut size={12} /></button>
                                <span className="text-[10px] font-mono font-bold w-10 text-center">{Math.round(zoom * 100)}%</span>
                                <button onClick={() => setZoom(prev => Math.min(1, prev + 0.05))} className="p-1 hover:bg-card rounded-md"><ZoomIn size={12} /></button>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => setShowPdfPreview(false)} 
                                className="rounded-full w-10 h-10 hover:bg-red-50 text-red-500 hover:text-red-600 flex items-center justify-center shrink-0"
                                aria-label="Fermer"
                              >
                                <X size={24} strokeWidth={2.5} className="shrink-0" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex-1 overflow-auto bg-slate-100 p-8 custom-scrollbar">
                            <div className="flex justify-center">
                              <div style={{ transform: `scale(${zoom * 2})`, transformOrigin: 'top center', width: '210mm' }}>
                                <ConventionPDFContent record={verificationRecord} template={template} isPreview={true} />
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  };
