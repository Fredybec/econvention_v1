import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, Download, FileText, CheckCircle2, 
  Clock, AlertCircle, ChevronRight, Layers, ArrowUpRight, ArrowDownRight,
  Layout, Shield, Zap, Bell, Activity, MessageSquare, Lock, Trash2, Edit3, MoreVertical,
  ArrowLeft
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { WorkflowStatus, Role, PFERecord } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ConfirmModal } from '../../components/shared/ConfirmModal';

export const SuperAdminConventionsView = () => {
  const { records, currentUser, updateRecordStatus, deleteRecord, showAlert } = useAppContext();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<WorkflowStatus | 'ALL'>('ALL');
  const [deptFilter, setDeptFilter] = useState<string | 'ALL'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [recordToChangeStatus, setRecordToChangeStatus] = useState<PFERecord | null>(null);
  const [newStatus, setNewStatus] = useState<WorkflowStatus | ''>('');

  const departments = useMemo(() => {
    const depts = new Set(records.map(r => r.data.department));
    return Array.from(depts);
  }, [records]);

  const filteredRecords = useMemo(() => {
    let result = records;

    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      result = result.filter(r => 
        r.studentName.toLowerCase().includes(s) || 
        r.id.toLowerCase().includes(s) ||
        r.data.companyName.toLowerCase().includes(s)
      );
    }

    if (statusFilter !== 'ALL') {
      result = result.filter(r => r.status === statusFilter);
    }

    if (deptFilter !== 'ALL') {
      result = result.filter(r => r.data.department === deptFilter);
    }

    return result.sort((a, b) => (b.history[b.history.length - 1]?.updatedAt || 0) - (a.history[a.history.length - 1]?.updatedAt || 0));
  }, [records, searchTerm, statusFilter, deptFilter]);

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleDelete = () => {
    if (recordToDelete) {
      deleteRecord(recordToDelete);
      setRecordToDelete(null);
    }
  };

  const handleStatusChange = () => {
    if (recordToChangeStatus && newStatus) {
      updateRecordStatus(recordToChangeStatus.id, newStatus as WorkflowStatus, `Statut modifié manuellement par Super Admin (${currentUser?.name})`);
      setRecordToChangeStatus(null);
      setNewStatus('');
      showAlert("Succès", "Le statut de la convention a été mis à jour.", "success");
    }
  };

  return (
    <div className="container mx-auto px-4 md:px-6 pt-8 md:pt-12 pb-48 md:pb-56 max-w-7xl space-y-8 text-left animate-in fade-in duration-500">
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
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-[10px] font-bold uppercase tracking-widest"
          >
            <ArrowLeft size={14} /> Retour
          </button>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="text-primary" size={20} />
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Super Admin</p>
            </div>
            <h2 className="text-3xl md:text-5xl text-foreground tracking-tighter uppercase font-medium">Gestion des Conventions</h2>
            <p className="text-muted-foreground max-w-2xl text-sm md:text-base">Contrôle total sur l'ensemble des dossiers du système. Modification forcée des statuts et suppression définitive.</p>
          </div>
        </div>
      </header>

      <Card className="p-6 md:p-8 bg-card border-border shadow-xl rounded-[2rem] md:rounded-[3rem] space-y-8">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Rechercher par nom, ID ou entreprise..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-secondary/50 border border-border rounded-2xl text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-4 bg-secondary/50 border border-border rounded-2xl text-xs font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary"
            >
              <option key="status-all" value="ALL">Tous les Statuts</option>
              {Object.values(WorkflowStatus).map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <select 
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-4 py-4 bg-secondary/50 border border-border rounded-2xl text-xs font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary"
            >
              <option key="dept-all" value="ALL">Tous les Départements</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="w-full">
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <table className="w-full border-separate border-spacing-y-3">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  <th className="pb-4 pl-6 text-left">Étudiant</th>
                  <th className="pb-4 text-left hidden lg:table-cell">Département</th>
                  <th className="pb-4 text-left">Statut</th>
                  <th className="pb-4 text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.map((record) => (
                  <tr key={record.id} className="group hover:translate-x-1 transition-transform duration-300">
                    <td className="py-4 pl-6 bg-secondary/50 rounded-l-3xl border-y border-l border-border">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="w-10 h-10 rounded-2xl bg-card shadow-sm flex items-center justify-center text-primary font-bold text-xs">
                            {record.studentName.charAt(0)}
                          </div>
                          {record.lockedBy && (
                            <div className="absolute -top-1 -right-1 bg-amber-500 text-white p-0.5 rounded-full shadow-sm border border-white">
                              <Lock size={8} />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground uppercase tracking-tight truncate max-w-[200px]">{record.studentName}</p>
                          <p className="text-[9px] font-mono text-muted-foreground uppercase truncate">{record.id.substring(0, 12)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 bg-secondary/50 border-y border-border hidden lg:table-cell">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate max-w-[150px]">{record.data.department}</p>
                    </td>
                    <td className="py-4 bg-secondary/50 border-y border-border">
                      <Badge variant="outline" className="bg-card text-[9px] font-black uppercase tracking-widest px-2 py-0.5 border-border">
                        {record.status}
                      </Badge>
                    </td>
                    <td className="py-4 pr-6 bg-secondary/50 rounded-r-3xl border-y border-r border-border text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => navigate(`/request/${record.id}`)}
                          className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary"
                          title="Voir détails"
                        >
                          <FileText size={16} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setRecordToChangeStatus(record)}
                          className="h-8 w-8 rounded-lg hover:bg-amber-500/10 hover:text-amber-600"
                          title="Modifier statut"
                        >
                          <Edit3 size={16} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setRecordToDelete(record.id)}
                          className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                          title="Supprimer"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {paginatedRecords.map((record) => (
              <div key={record.id} className="bg-secondary/50 p-5 rounded-[2rem] border border-border space-y-4">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-2xl bg-card shadow-sm flex items-center justify-center text-primary font-bold text-xs">
                        {record.studentName.charAt(0)}
                      </div>
                      {record.lockedBy && (
                        <div className="absolute -top-1 -right-1 bg-amber-500 text-white p-0.5 rounded-full shadow-sm border border-white">
                          <Lock size={8} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground uppercase tracking-tight truncate">{record.studentName}</p>
                      <p className="text-[9px] font-mono text-muted-foreground uppercase">{record.id.substring(0, 12)}...</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-card text-[8px] font-black uppercase tracking-widest px-2 py-0.5 border-border shrink-0">
                    {record.status}
                  </Badge>
                </div>

                <div className="pt-2 border-t border-border/50">
                   <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Département</p>
                   <p className="text-[10px] font-bold text-foreground uppercase truncate">{record.data.department}</p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => navigate(`/request/${record.id}`)}
                    className="text-[9px] font-bold uppercase tracking-widest text-primary h-8 px-3"
                  >
                    Détails
                  </Button>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setRecordToChangeStatus(record)}
                      className="h-8 w-8 rounded-lg hover:bg-amber-500/10 hover:text-amber-600"
                    >
                      <Edit3 size={14} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setRecordToDelete(record.id)}
                      className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-6 border-t border-border">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Page {currentPage} sur {totalPages} ({filteredRecords.length} dossiers)
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="rounded-xl px-4 py-2 text-[10px] font-bold uppercase tracking-widest"
              >
                Précédent
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="rounded-xl px-4 py-2 text-[10px] font-bold uppercase tracking-widest"
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Status Change Modal */}
      <AnimatePresence>
        {recordToChangeStatus && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md p-8 space-y-6 bg-card border border-border rounded-[2.5rem] shadow-2xl"
            >
              <div className="space-y-2">
                <h3 className="text-xl font-bold uppercase tracking-tight">Modifier le Statut</h3>
                <p className="text-xs text-muted-foreground">Dossier: <span className="font-mono font-bold text-primary">{recordToChangeStatus.id}</span></p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-secondary/50 rounded-2xl border border-border">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Statut Actuel</p>
                  <p className="text-sm font-bold text-foreground">{recordToChangeStatus.status}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Nouveau Statut</label>
                  <select 
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as WorkflowStatus)}
                    className="w-full px-4 py-4 bg-secondary border border-border rounded-2xl text-xs font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option key="status-placeholder" value="">Sélectionner un statut...</option>
                    {Object.values(WorkflowStatus).map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setRecordToChangeStatus(null);
                    setNewStatus('');
                  }}
                  className="flex-1 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest"
                >
                  Annuler
                </Button>
                <Button 
                  onClick={handleStatusChange}
                  disabled={!newStatus}
                  className="flex-1 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest bg-primary text-primary-foreground shadow-lg"
                >
                  Mettre à jour
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal 
        isOpen={!!recordToDelete}
        onClose={() => setRecordToDelete(null)}
        onConfirm={handleDelete}
        title="Suppression Définitive"
        message="Êtes-vous sûr de vouloir supprimer cette convention ? Cette action est irréversible et supprimera toutes les données associées."
        confirmText="Supprimer Définitivement"
        variant="danger"
      />
    </div>
  );
};

export default SuperAdminConventionsView;
