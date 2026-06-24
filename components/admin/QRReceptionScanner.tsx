import React, { useState } from 'react';
import { QrCode, Camera, X, Check, AlertCircle, FileText, User, Building2, Calendar, ArrowRight, XCircle, ShieldCheck } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useAppContext } from '../../context/AppContext';
import { WorkflowStatus, PFERecord } from '../../types';
import { motion, AnimatePresence } from 'motion/react';

export const QRReceptionScanner = () => {
  const { records, updateRecordStatus, showAlert } = useAppContext();
  const [isScanning, setIsScanning] = useState(false);
  const [scannedRecord, setScannedRecord] = useState<PFERecord | null>(null);

  const parseId = (text: string): string => {
    if (text.includes('/verify/')) {
      const parts = text.split('/verify/');
      return parts[parts.length - 1].trim().toUpperCase();
    }
    return text.trim().toUpperCase();
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

  const handleApprove = () => {
    if (scannedRecord) {
      updateRecordStatus(
        scannedRecord.id, 
        WorkflowStatus.PENDING_TRANSFER_DOYEN, 
        'Réception physique confirmée via Scan QR. Prêt pour transfert au décanat.'
      );
      showAlert('Succès', 'Réception confirmée. Le dossier est passé en attente de transfert.', 'success');
      setScannedRecord(null);
    }
  };

  const handleReject = () => {
    if (scannedRecord) {
      showAlert('Action Requise', 'Veuillez utiliser la vue détaillée pour rejeter ou demander un complément avec un motif précis.', 'info');
    }
  };

  return (
    <div className="space-y-12">
      <AnimatePresence mode="wait">
        {!isScanning && !scannedRecord && (
          <motion.div 
            key="home"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="max-w-xl mx-auto space-y-8"
          >
            <div className="bg-slate-50 border-2 border-slate-100 p-10 rounded-[3rem] text-center space-y-6">
              <div className="w-24 h-24 rounded-[2rem] bg-white shadow-xl shadow-primary/5 mx-auto flex items-center justify-center text-primary relative overflow-hidden group">
                <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors" />
                <QrCode size={40} className="relative z-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">Scanner de Réception</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-relaxed max-w-[280px] mx-auto">
                  Enregistrez instantanément l'arrivée physique des conventions signées.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Button 
                  onClick={() => setIsScanning(true)}
                  className="bg-primary hover:bg-primary/90 text-white rounded-2xl py-6 text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all w-full"
                >
                  Démarrer le Scanner
                </Button>
                <Button 
                  variant="ghost"
                  onClick={requestCameraPermission}
                  className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-primary transition-colors"
                >
                  <ShieldCheck size={14} className="mr-2" /> Vérifier Permissions Caméra
                </Button>
              </div>
            </div>

            {records.filter(r => r.status === WorkflowStatus.PENDING_TRANSFER_SERVICE_STAGE).length > 0 && (
              <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-3xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                    <Check size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Dossiers en attente</p>
                    <p className="text-lg font-black text-emerald-600 tracking-tighter">
                      {records.filter(r => r.status === WorkflowStatus.PENDING_TRANSFER_SERVICE_STAGE).length} conventions
                    </p>
                  </div>
                </div>
                <ArrowRight size={20} className="text-emerald-300" />
              </div>
            )}
          </motion.div>
        )}

        {isScanning && (
          <motion.div 
            key="scanner"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="relative bg-black rounded-[3rem] overflow-hidden border-8 border-slate-900 shadow-2xl max-w-2xl mx-auto aspect-square md:aspect-video"
          >
            <Scanner
              onScan={(detectedCodes) => {
                if (detectedCodes.length > 0) {
                  const rawText = detectedCodes[0].rawValue;
                  const recordId = parseId(rawText);
                  const record = records.find(r => r.id === recordId);
                  if (record) {
                    setScannedRecord(record);
                    setIsScanning(false);
                    showAlert('Scan Réussi', `Convention de ${record.studentName} trouvée.`, 'success');
                  } else {
                    showAlert('Erreur', `Convention ${recordId} non trouvée. Veuillez vérifier le QR Code.`, 'error');
                  }
                }
              }}
              onError={(error) => console.error("Scanner Error:", error)}
              styles={{ container: { width: '100%', height: '100%' } }}
              components={{ torch: true }}
              allowMultiple={false}
              scanDelay={500}
            />
            <div className="absolute inset-0 border-[60px] border-black/40 pointer-events-none flex items-center justify-center">
              <div className="w-64 h-64 border-2 border-primary/50 rounded-3xl relative">
                <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl" />
                <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl" />
                <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl" />
                <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl" />
                <motion.div 
                  animate={{ top: ['0%', '100%', '0%'] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="absolute left-0 w-full h-0.5 bg-primary/50 shadow-[0_0_15px_rgba(var(--primary),0.5)]"
                />
              </div>
            </div>
            <div className="absolute top-8 right-8 z-10 flex gap-3">
              <div className="bg-primary/90 backdrop-blur-md text-white px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                Viseur Actif
              </div>
              <button 
                onClick={() => setIsScanning(false)}
                className="w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-full transition-all flex items-center justify-center shrink-0 border border-white/10 hover:scale-110 active:scale-95"
              >
                <X size={24} strokeWidth={3} />
              </button>
            </div>
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md text-white border border-white/10 px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest shadow-2xl whitespace-nowrap">
              Placez le QR code au centre
            </div>
          </motion.div>
        )}

        {scannedRecord && (
          <motion.div
            key="record"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-2xl mx-auto"
          >
            <div className="bg-white border-2 border-slate-100 rounded-[3.5rem] p-10 md:p-14 shadow-2xl space-y-10 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
               
               <div className="flex items-center justify-between relative z-10">
                 <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-[2rem] bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shadow-inner">
                      <User size={32} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                        {scannedRecord.studentName}
                      </h4>
                      <p className="text-xs font-mono font-black text-primary uppercase tracking-widest">
                        DOSSIER REF: {scannedRecord.id.substring(0, 12)}
                      </p>
                    </div>
                 </div>
                 <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">
                   {scannedRecord.status.replace(/_/g, ' ')}
                 </Badge>
               </div>

               <div className="grid grid-cols-2 gap-6 relative z-10">
                  <div className="bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100 space-y-4">
                    <div className="flex items-center gap-3 text-slate-400">
                      <Building2 size={16} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Organisme</span>
                    </div>
                    <p className="text-lg font-black text-slate-800 leading-tight uppercase line-clamp-2">
                      {scannedRecord.data.companyName}
                    </p>
                  </div>
                  <div className="bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100 space-y-4">
                    <div className="flex items-center gap-3 text-slate-400">
                      <Calendar size={16} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Période</span>
                    </div>
                    <p className="text-lg font-black text-slate-800">
                      {scannedRecord.data.startDate} <span className="text-slate-300">→</span> {scannedRecord.data.endDate}
                    </p>
                  </div>
               </div>

               <div className="pt-8 flex flex-col sm:flex-row gap-4 relative z-10">
                  <Button 
                    variant="outline"
                    onClick={() => setScannedRecord(null)}
                    className="py-8 rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] border-2 hover:bg-slate-50 transition-all flex-1"
                  >
                    Réinitialiser
                  </Button>
                  <Button 
                    onClick={handleApprove}
                    className="flex-[2] py-8 rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xl shadow-emerald-600/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
                  >
                    <Check size={18} strokeWidth={3} /> Confirmer Réception
                  </Button>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
