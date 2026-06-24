import React, { useState, useMemo } from 'react';
import { Search, Filter, Edit2, CheckCircle, XCircle, Clock, ArrowRight, FileText, ArrowLeft, Trash2, RefreshCw, Edit, Eye, X } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ConfirmModal } from '../../components/shared/ConfirmModal';
import { WorkflowStatus, PFERecord, Role } from '../../types';
import { STEPS } from '../../utils/workflowConstants';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export const ConventionSearchView = () => {
  const { records, updateRecordStatus, deleteRecord, currentUser } = useAppContext();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<WorkflowStatus | 'ALL'>('ALL');
  const [selectedRecord, setSelectedRecord] = useState<PFERecord | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<WorkflowStatus | ''>('');
  const [comment, setComment] = useState('');

  const filteredRecords = useMemo(() => {
    if (!currentUser) return [];
    const myRoles = currentUser.roles || [];

    return records.filter(record => {
      // Role-based filtering
      if (myRoles.includes(Role.STUDENT)) {
        if (record.studentId !== currentUser.id) return false;
      } else if (myRoles.includes(Role.CHEF_DEPARTEMENT)) {
        if (record.data.department?.toLowerCase() !== currentUser.department?.toLowerCase()) return false;
      } else if (myRoles.includes(Role.ENCADRANT_FST)) {
        if (record.data.fstTutorEmail?.toLowerCase() !== currentUser.email?.toLowerCase()) return false;
      }
      
      // Personal Archive logic as requested: 
      // For Scolarite and other staff, closed documents only appear if they worked on them.
      const isStaff = myRoles.some(r => [Role.SCOLARITE, Role.SERVICE_RECHERCHE_COOP].includes(r));
      const isClosed = [WorkflowStatus.COMPLETED, WorkflowStatus.REJECTED, WorkflowStatus.CANCELLED].includes(record.status);
      
      if (isStaff && isClosed && !myRoles.includes(Role.SUPERADMIN)) {
        const isParticipant = record.participantIds?.includes(currentUser.id);
        if (!isParticipant) return false;
      }

      // Department-specific filtering for non-processed or visible records
      const deptSpecificRoles = [Role.SCOLARITE, Role.SERVICE_RECHERCHE_COOP];
      if (myRoles.some(r => deptSpecificRoles.includes(r)) && currentUser.department) {
        if (record.data.department?.toLowerCase() !== currentUser.department?.toLowerCase()) return false;
      }

      const matchesSearch = 
        record.id.toLowerCase() === searchQuery.toLowerCase() ||
        record.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (record.data.massarCode && record.data.massarCode.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus = statusFilter === 'ALL' || record.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [records, searchQuery, statusFilter, currentUser]);

  const handleOpenEdit = (record: PFERecord) => {
    setSelectedRecord(record);
    setNewStatus(record.status);
    setComment('');
    setIsEditModalOpen(true);
  };

  const handleUpdateStatus = () => {
    if (selectedRecord && newStatus) {
      updateRecordStatus(selectedRecord.id, newStatus as WorkflowStatus, comment);
      setIsEditModalOpen(false);
      setSelectedRecord(null);
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecordToDelete(id);
  };

  const confirmDelete = () => {
    if (recordToDelete) {
      deleteRecord(recordToDelete);
      setRecordToDelete(null);
    }
  };

  const getStatusColor = (status: WorkflowStatus) => {
    switch (status) {
      case WorkflowStatus.COMPLETED: return 'bg-green-500';
      case WorkflowStatus.CANCELLED:
      case WorkflowStatus.REJECTED: return 'bg-red-500';
      case WorkflowStatus.DRAFT: return 'bg-muted-foreground';
      default: return 'bg-blue-500';
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 pb-48 md:pb-56">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left">
          <div className="space-y-4">
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
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Recherche de Conventions</h1>
              <p className="text-muted-foreground">Gérez et modifiez les statuts des conventions individuelles.</p>
            </div>
          </div>
        </header>

        <Card className="p-6 bg-card border-border shadow-sm">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input
                type="text"
                placeholder="Rechercher par ID, Nom ou Code Massar..."
                className="w-full pl-10 pr-4 py-2 bg-secondary border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all text-foreground"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-muted-foreground" />
              <select
                className="bg-secondary border border-border rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-primary text-foreground"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <option value="ALL">Tous les statuts</option>
                {STEPS.map(step => (
                  <option key={step.id} value={step.id}>{step.label}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredRecords.map((record) => (
              <motion.div
                key={record.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="p-5 bg-card border-border hover:shadow-md transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1 min-w-0 flex-1">
                      <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{record.id}</span>
                      <h3 className="font-bold text-foreground line-clamp-1">{record.studentName}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {currentUser?.roles?.includes(Role.SUPERADMIN) && (
                        <button 
                          onClick={(e) => handleDelete(record.id, e)}
                          className="p-1.5 text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                      <Badge status={record.status} className="flex-none" />
                    </div>
                  </div>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <FileText size={14} />
                      <span>{record.data.department}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock size={14} />
                      <span>Mis à jour: {new Date(record.history[record.history.length - 1].updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {!currentUser?.roles?.includes(Role.SUPPORT) && (
                      <>
                        <Button 
                          onClick={() => handleOpenEdit(record)}
                          variant="outline" 
                          className="justify-center gap-2 text-[10px] py-1.5 rounded-lg group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/20 transition-all font-bold uppercase tracking-wider"
                        >
                          <RefreshCw size={12} />
                          Statut
                        </Button>
                        <Button 
                          onClick={() => navigate(`/edit-request/${record.id}`)}
                          variant="outline" 
                          className="justify-center gap-2 text-[10px] py-1.5 rounded-lg border-blue-200 text-blue-600 hover:bg-blue-50 transition-all font-bold uppercase tracking-wider"
                        >
                          <Edit size={12} />
                          Données
                        </Button>
                      </>
                    )}
                    <Button 
                      onClick={() => navigate(`/request/${record.id}`)}
                      variant="outline" 
                      className={`${!currentUser?.roles?.includes(Role.SUPPORT) ? 'col-span-2' : 'col-span-2 w-full'} justify-center gap-2 text-[10px] py-1.5 rounded-lg border-emerald-200 text-emerald-600 hover:bg-emerald-50 transition-all font-bold uppercase tracking-wider`}
                    >
                      <Eye size={12} />
                      Voir Détails
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredRecords.length === 0 && (
          <div className="text-center py-20 space-y-4">
            <div className="bg-secondary w-16 h-16 rounded-full flex items-center justify-center mx-auto">
              <Search size={24} className="text-muted-foreground/50" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-foreground">Aucun résultat trouvé</h3>
              <p className="text-muted-foreground">Essayez de modifier vos critères de recherche ou vos filtres.</p>
            </div>
          </div>
        )}
      </div>

      {/* Edit Status Modal */}
      <AnimatePresence>
        {isEditModalOpen && selectedRecord && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-border flex justify-between items-center">
                <h3 className="text-xl font-bold text-foreground">Modifier le statut</h3>
                <button 
                  onClick={() => setIsEditModalOpen(false)} 
                  className="p-2 hover:bg-red-50 text-red-500 hover:text-red-600 rounded-full transition-all flex items-center justify-center shrink-0"
                  aria-label="Fermer"
                >
                  <X size={24} strokeWidth={2.5} className="shrink-0" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-4 p-4 bg-secondary rounded-2xl">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {selectedRecord.studentName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground">{selectedRecord.studentName}</h4>
                    <p className="text-xs text-muted-foreground">{selectedRecord.id}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Nouveau Statut</label>
                  <select
                    className="w-full p-4 bg-secondary border border-border rounded-2xl text-foreground outline-none focus:ring-2 focus:ring-primary"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as WorkflowStatus)}
                  >
                    {STEPS.map(step => (
                      <option key={step.id} value={step.id}>{step.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Commentaire (Optionnel)</label>
                  <textarea
                    className="w-full p-4 bg-secondary border border-border rounded-2xl text-foreground outline-none focus:ring-2 focus:ring-primary h-24 resize-none"
                    placeholder="Ajoutez une note sur ce changement..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                </div>
              </div>

              <div className="p-6 bg-secondary flex gap-3">
                <Button 
                  onClick={() => setIsEditModalOpen(false)}
                  variant="outline" 
                  className="flex-1 py-3 rounded-xl"
                >
                  Annuler
                </Button>
                <Button 
                  onClick={handleUpdateStatus}
                  className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                >
                  Confirmer <ArrowRight size={16} />
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={!!recordToDelete}
        onClose={() => setRecordToDelete(null)}
        onConfirm={confirmDelete}
        title="Supprimer le Dossier"
        message="Êtes-vous sûr de vouloir supprimer définitivement ce dossier ? Cette action est irréversible."
        confirmText="Supprimer"
        variant="danger"
      />
    </div>
  );
};
