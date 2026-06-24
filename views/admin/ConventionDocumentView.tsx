import React, { useState, useMemo } from 'react';
import { Search, FileText, Upload, Trash2, Eye, Download, CheckCircle, AlertCircle, Clock, Filter, XCircle, ArrowLeft, X } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ConfirmModal } from '../../components/shared/ConfirmModal';
import { PFERecord, WorkflowStatus } from '../../types';
import { STEPS } from '../../utils/workflowConstants';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export const ConventionDocumentView = () => {
  const { records, updateRecord } = useAppContext();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<PFERecord | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<'convention' | 'assurance' | 'attestation' | null>(null);
  const [docToRemove, setDocToRemove] = useState<{ recordId: string, docType: string } | null>(null);

  const filteredRecords = useMemo(() => {
    return records.filter(record => 
      record.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.studentName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [records, searchQuery]);

  const handleFileUpload = (recordId: string, docType: string, file: File) => {
    // Validation: Max 2MB
    if (file.size > 2 * 1024 * 1024) {
      alert("La taille maximale autorisée est de 2Mo.");
      return;
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      alert("Veuillez uploader un fichier PDF ou une image (JPG, PNG).");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const record = records.find(r => r.id === recordId);
      if (!record) return;

      if (docType === 'convention') {
        updateRecord(recordId, record.data, { ...record.conventionMetadata, signedDocumentUrl: dataUrl } as any);
      } else if (docType === 'assurance') {
        updateRecord(recordId, { ...record.data, insuranceUrl: dataUrl });
      } else if (docType === 'attestation') {
        updateRecord(recordId, { ...record.data, complementUrl: dataUrl });
      }

      setIsUploadModalOpen(false);
      setUploadingDoc(null);
    };
    reader.readAsDataURL(file);
  };

  const removeDocument = (recordId: string, docType: string) => {
    setDocToRemove({ recordId, docType });
  };

  const confirmRemoveDocument = () => {
    if (!docToRemove) return;
    const { recordId, docType } = docToRemove;
    const record = records.find(r => r.id === recordId);
    if (!record) return;

    if (docType === 'convention') {
      updateRecord(recordId, record.data, { ...record.conventionMetadata, signedDocumentUrl: undefined } as any);
    } else if (docType === 'assurance') {
      updateRecord(recordId, { ...record.data, insuranceUrl: undefined });
    } else if (docType === 'attestation') {
      updateRecord(recordId, { ...record.data, complementUrl: undefined });
    }

    setDocToRemove(null);
  };

  return (
    <div className="min-h-screen bg-background pt-4 md:pt-8 pb-40 md:pb-56 px-4 md:px-8 space-y-6 md:space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate('/dashboard');
              }
            }}
            className="rounded-full hover:bg-secondary shadow-sm shrink-0"
          >
            <ArrowLeft size={18} />
          </Button>
          <div className="space-y-0.5 md:space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground uppercase tracking-tight">Gestion des Documents</h1>
            <p className="text-[10px] md:text-sm text-muted-foreground font-medium">Consultez et gérez les pièces jointes des conventions.</p>
          </div>
        </div>
      </header>

      <Card className="p-4 md:p-6 bg-card border-border shadow-sm rounded-3xl md:rounded-[2.5rem]">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            type="text"
            placeholder="Rechercher Étudiant ou ID..."
            className="w-full pl-11 pr-4 py-3 bg-secondary border border-border rounded-xl md:rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-xs md:text-sm text-foreground transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:gap-6">
        {filteredRecords.map((record) => (
          <Card key={record.id} className="p-5 md:p-6 bg-card border-border hover:shadow-md transition-all rounded-[1.5rem] md:rounded-[2.5rem]">
            <div className="flex flex-col lg:flex-row justify-between gap-6 md:gap-8">
              <div className="space-y-3 md:space-y-4 lg:w-1/3 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm md:text-base">
                    {record.studentName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-foreground text-sm md:text-base truncate uppercase">{record.studentName}</h3>
                    <p className="text-[10px] md:text-xs text-muted-foreground truncate uppercase font-medium tracking-tight">#{record.id.substring(0, 12)}... • {record.data.department}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge status={record.status} className="scale-90 origin-left" />
                </div>
              </div>

              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 pt-4 lg:pt-0 border-t lg:border-t-0 border-border/50">
                <DocumentCard 
                  title="Conv. Signée" 
                  url={record.conventionMetadata?.signedDocumentUrl} 
                  onUpload={() => { setSelectedRecord(record); setUploadingDoc('convention'); setIsUploadModalOpen(true); }}
                  onRemove={() => removeDocument(record.id, 'convention')}
                />
                <DocumentCard 
                  title="Assurance" 
                  url={record.data.insuranceUrl} 
                  onUpload={() => { setSelectedRecord(record); setUploadingDoc('assurance'); setIsUploadModalOpen(true); }}
                  onRemove={() => removeDocument(record.id, 'assurance')}
                />
                <DocumentCard 
                  title="Complément" 
                  url={record.data.complementUrl} 
                  onUpload={() => { setSelectedRecord(record); setUploadingDoc('attestation'); setIsUploadModalOpen(true); }}
                  onRemove={() => removeDocument(record.id, 'attestation')}
                />
                {/* Show last attachment from history if any */}
                {record.history.filter(h => h.attachmentUrl).length > 0 && (
                  <DocumentCard 
                    title="Dernier Doc." 
                    url={record.history.filter(h => h.attachmentUrl).reverse()[0].attachmentUrl} 
                    onUpload={() => {}} 
                    onRemove={() => {}}
                    isReadOnly={true}
                  />
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredRecords.length === 0 && (
        <div className="text-center py-20">
          <p className="text-muted-foreground">Aucune convention trouvée.</p>
        </div>
      )}

      {/* Upload Modal */}
      <AnimatePresence>
        {isUploadModalOpen && selectedRecord && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsUploadModalOpen(false)}
              className="absolute inset-0 bg-background/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-card rounded-3xl shadow-2xl p-8 space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-foreground uppercase tracking-tight">Téléverser {uploadingDoc}</h3>
                <button 
                  onClick={() => setIsUploadModalOpen(false)} 
                  className="p-2 hover:bg-red-50 text-red-500 hover:text-red-600 rounded-full transition-all flex items-center justify-center shrink-0"
                  aria-label="Fermer"
                >
                  <X size={24} strokeWidth={2.5} className="shrink-0" />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Sélectionnez le fichier pour <strong>{selectedRecord.studentName}</strong> ({selectedRecord.id})</p>
                
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-border rounded-3xl cursor-pointer hover:bg-secondary transition-all group">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-10 h-10 text-muted-foreground/30 group-hover:text-primary transition-colors mb-4" />
                    <p className="mb-2 text-sm text-muted-foreground font-bold uppercase tracking-widest">Cliquez pour téléverser</p>
                    <p className="text-xs text-muted-foreground/50">PDF, JPG ou PNG (Max. 2MB)</p>
                  </div>
                  <input 
                    type="file" 
                    className="hidden" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && uploadingDoc) handleFileUpload(selectedRecord.id, uploadingDoc, file);
                    }}
                  />
                </label>
              </div>

              <Button onClick={() => setIsUploadModalOpen(false)} variant="outline" className="w-full py-4 rounded-xl">
                Annuler
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={!!docToRemove}
        onClose={() => setDocToRemove(null)}
        onConfirm={confirmRemoveDocument}
        title="Supprimer le Document"
        message={`Êtes-vous sûr de vouloir supprimer le document "${docToRemove?.docType}" ?`}
        confirmText="Supprimer"
        variant="danger"
      />
    </div>
  );
};

const DocumentCard = ({ title, url, onUpload, onRemove, isReadOnly }: { title: string, url?: string, onUpload: () => void, onRemove: () => void, isReadOnly?: boolean }) => (
  <div className={`p-4 md:p-5 rounded-2xl border transition-all flex md:flex-col justify-between items-center md:items-stretch gap-4 ${url ? 'bg-emerald-50/50 border-emerald-100' : 'bg-muted/30 border-border'}`}>
    <div className="flex items-center justify-between gap-2 md:w-full min-w-0">
      <div className="flex items-center gap-2 min-w-0">
        <FileText size={14} className={url ? 'text-emerald-600' : 'text-muted-foreground shrink-0'} />
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground truncate">{title}</span>
      </div>
      {url ? <CheckCircle size={12} className="text-emerald-600 shrink-0 hidden md:block" /> : <AlertCircle size={12} className="text-amber-500 shrink-0 hidden md:block" />}
    </div>

    <div className="flex gap-2 shrink-0">
      {url ? (
        <div className="flex gap-1.5 md:gap-2">
          <a href={url} target="_blank" rel="noreferrer" className="flex items-center justify-center w-8 h-8 md:w-auto md:h-auto md:flex-1 md:p-2 bg-card border border-emerald-200 text-emerald-600 rounded-lg hover:bg-emerald-50 transition-all">
            <Eye size={14} />
          </a>
          {!isReadOnly && (
            <button onClick={onRemove} className="flex items-center justify-center w-8 h-8 md:w-auto md:h-auto md:flex-1 md:p-2 bg-card border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-all">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ) : (
        !isReadOnly && (
          <button onClick={onUpload} className="px-3 md:px-0 md:w-full py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all text-[9px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-sm">
            <Upload size={14} /> <span className="hidden xs:inline">Ajouter</span>
          </button>
        )
      )}
    </div>
  </div>
);
