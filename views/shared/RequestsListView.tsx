
import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, Download, FileText, CheckCircle2, 
  Clock, AlertCircle, ChevronRight, Layers, ArrowUpRight, ArrowDownRight,
  Layout, Shield, Zap, Bell, Activity, MessageSquare, Lock
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { WorkflowStatus, Role, PFERecord } from '../../types';
import { canApprove } from '../../utils/workflow';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useNavigate } from 'react-router-dom';
import { getAcademicYear } from '../../utils/dateUtils';
import { Pagination } from '../../components/shared/Pagination';

export const RequestsListView = () => {
  const { records, currentUser, users, activeRole, showAlert } = useAppContext();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'PENDING' | 'ARCHIVE'>('PENDING');
  
  // Extract unique academic years for the filter
  const academicYears = useMemo(() => {
    const years = new Set<string>();
    records.forEach(r => {
      if (r.data.academicYear) {
        years.add(r.data.academicYear);
      }
    });
    // Add current dynamic year if not present
    years.add(getAcademicYear());
    
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [records]);

  const [yearFilter, setYearFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<WorkflowStatus | 'ALL'>('ALL');
  const [deptFilter, setDeptFilter] = useState<string | 'ALL'>('ALL');

  // Sync year filter when academic years change
  React.useEffect(() => {
    if (academicYears.length > 0 && !yearFilter) {
      setYearFilter(academicYears[0]);
    }
  }, [academicYears, yearFilter]);

  const isStudent = currentUser?.roles?.includes(Role.STUDENT);
  const isSuperAdmin = currentUser?.roles?.includes(Role.SUPERADMIN);
  const isSupport = currentUser?.roles?.includes(Role.SUPPORT);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Filter records based on role and filters
  const filteredRecords = useMemo(() => {
    let result = records;

    // Role-based filtering - Union of roles
    if (isStudent) {
      result = result.filter(r => r.studentId === currentUser?.id);
    } else if (isSuperAdmin || isSupport) {
      // See everything
    } else {
      const isRespoOrStaff = currentUser?.roles?.some(r => [Role.CHEF_DEPARTEMENT, Role.SCOLARITE, Role.SERVICE_RECHERCHE_COOP].includes(r));
      const isEncadrantRole = currentUser?.roles?.includes(Role.ENCADRANT_FST);

      if (isRespoOrStaff && isEncadrantRole) {
        result = result.filter(r => 
          (currentUser.department && r.data.department?.toLowerCase() === currentUser.department?.toLowerCase()) ||
          (r.data.fstTutorEmail?.toLowerCase() === currentUser.email?.toLowerCase())
        );
      } else if (isRespoOrStaff) {
        if (currentUser.department) {
          result = result.filter(r => r.data.department?.toLowerCase() === currentUser.department?.toLowerCase());
        }
      } else if (isEncadrantRole) {
        result = result.filter(r => r.data.fstTutorEmail?.toLowerCase() === currentUser.email?.toLowerCase());
      }
    }

    // Pending vs Archive logic
    if (activeTab === 'PENDING') {
      if (isStudent) {
        result = result.filter(r => r.status !== WorkflowStatus.COMPLETED && r.status !== WorkflowStatus.REJECTED && r.status !== WorkflowStatus.CANCELLED);
      } else {
        // Show records that currently need this user's validation
        result = result.filter(r => {
          // Exclusive assignment logic: if assigned to someone else with the same role, hide it
          if (r.assignedTo && r.assignedTo.length > 0 && !r.assignedTo.includes(currentUser?.id || '')) {
            const assignedUsers = users.filter(u => r.assignedTo?.includes(u.id));
            const hasSameRoleAssigned = assignedUsers.some(u => u.roles.includes(activeRole as Role));
            if (hasSameRoleAssigned) return false;
          }

          const lastStatus = r.history.slice().reverse().find(h => h.status !== WorkflowStatus.COMPLEMENT_REQUIRED)?.status;
          const canApproveRecord = canApprove(r.status, currentUser?.roles || [], currentUser?.department, r.data.department, lastStatus, undefined, undefined, r.data.stageType);
          
          // Encadrant FST should see their records in Pending tab even if they can't approve
          const isEncadrantRole = currentUser?.roles?.includes(Role.ENCADRANT_FST);
          const isTutor = r.data.fstTutorEmail?.toLowerCase() === currentUser?.email?.toLowerCase();
          
          return canApproveRecord || (isEncadrantRole && isTutor);
        });
      }
    } else {
      // Archive: Records already acted upon by this user OR records that are completed/rejected/cancelled
      // AND it matches the general visibility filters above
      result = result.filter(r => {
        // Filter by year
        const matchesYear = !yearFilter || r.data.academicYear === academicYears[0] || r.data.academicYear === yearFilter;

        // SuperAdmin/Support see everything (already match matchedYear)
        if (isSuperAdmin || isSupport) return matchesYear;

        // For others, show if they personally worked on it OR if they are staff and it belongs to their department
        const isParticipant = r.participantIds?.includes(currentUser?.id || '');
        const isOwner = r.studentId === currentUser?.id;
        const isValidator = r.validatorIds && Object.values(r.validatorIds).includes(currentUser?.id || '');
        const isStaffInDept = !isStudent && currentUser?.department && r.data.department?.toLowerCase() === currentUser.department.toLowerCase();
        
        // Finalized records (Completed, Rejected, Cancelled) in my scope
        const isFinalized = [WorkflowStatus.COMPLETED, WorkflowStatus.REJECTED, WorkflowStatus.CANCELLED].includes(r.status);
        
        const hasAccess = isParticipant || isValidator || isOwner || isStaffInDept || isFinalized;

        return hasAccess && matchesYear;
      });
    }

    // Search and filters
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

    return result;
  }, [records, currentUser, searchTerm, statusFilter, deptFilter, activeTab, yearFilter, isStudent, isSuperAdmin, isSupport]);

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const paginatedRecords = useMemo(() => {
    return filteredRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredRecords, currentPage]);

  const departments = useMemo(() => {
    const depts = new Set(records.map(r => r.data.department));
    return Array.from(depts);
  }, [records]);

  const handleExportCSV = () => {
    // CSV Export removed
  };

  const handleExportPDF = () => {
    // PDF Export removed
  };

  return (
    <div className="container mx-auto px-4 md:px-6 pt-6 md:pt-12 pb-40 md:pb-56 max-w-7xl space-y-6 md:space-y-12 text-left animate-in fade-in duration-500">
      <header className="space-y-4">
        <button 
          onClick={() => navigate('/dashboard')} 
          className="text-[10px] text-muted-foreground uppercase tracking-widest hover:text-primary font-bold transition-colors group flex items-center gap-2 mb-4"
        >
          <ChevronRight size={14} className="rotate-180 transition-transform group-hover:-translate-x-1" /> Retour Dashboard
        </button>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-1 md:space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="text-primary" size={16} />
              <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Gestion des Dossiers</p>
            </div>
            <h2 className="text-2xl md:text-5xl text-foreground tracking-tighter uppercase font-medium">
              {isStudent ? "Mes Conventions" : "Liste des Demandes"}
            </h2>
            <p className="text-muted-foreground max-w-2xl text-xs md:text-base leading-relaxed">
              {isStudent 
                ? "Consultez l'historique et le statut de vos demandes de convention de stage." 
                : "Gérez les validations, le suivi et l'archivage des conventions de stage."}
            </p>
          </div>
        </div>
      </header>

      <Card className="p-4 md:p-8 bg-card border-0 shadow-2xl rounded-[1.5rem] md:rounded-[3rem] space-y-6 md:space-y-8">
        <div className="flex flex-col lg:flex-row gap-4 md:gap-6 justify-between items-start lg:items-center">
          <div className="flex p-1 bg-secondary rounded-xl md:rounded-2xl w-full lg:w-auto shrink-0 overflow-x-auto no-scrollbar">
            <button 
              onClick={() => {
                setActiveTab('PENDING');
                setCurrentPage(1);
              }}
              className={`flex-1 lg:flex-none px-4 md:px-8 py-2 md:py-3 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'PENDING' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {isStudent ? "En cours" : "En attente"}
            </button>
            <button 
              onClick={() => {
                setActiveTab('ARCHIVE');
                setCurrentPage(1);
              }}
              className={`flex-1 lg:flex-none px-4 md:px-8 py-2 md:py-3 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'ARCHIVE' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Archive
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-2 md:gap-3 w-full lg:w-auto">
            {activeTab === 'ARCHIVE' && (
              <div className="flex items-center gap-2 px-3 md:px-4 py-2 bg-secondary rounded-lg md:rounded-xl border border-border animate-in fade-in slide-in-from-left-2 duration-300">
                <Clock size={12} className="text-muted-foreground" />
                <select 
                  className="bg-transparent text-[9px] md:text-[10px] font-bold uppercase tracking-widest outline-none text-foreground w-full"
                  value={yearFilter}
                  onChange={e => setYearFilter(e.target.value)}
                >
                  {academicYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            )}
            
            <div className="relative w-full lg:w-64 group sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="Rechercher..." 
                className="w-full pl-11 pr-4 py-2 md:py-3 bg-card border border-border rounded-xl md:rounded-2xl text-xs md:text-sm outline-none focus:border-primary text-foreground transition-all"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-2 px-3 md:px-4 py-2 bg-card rounded-lg md:rounded-xl border border-border overflow-hidden">
              <Filter size={12} className="text-muted-foreground shrink-0" />
              <select 
                className="bg-transparent text-[9px] md:text-[10px] font-bold uppercase tracking-widest outline-none text-foreground w-full truncate"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
              >
                <option key="status-all" value="ALL">Statuts</option>
                {Object.values(WorkflowStatus).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {!isStudent && !currentUser?.roles?.includes(Role.ENCADRANT_FST) && !currentUser?.roles?.includes(Role.CHEF_DEPARTEMENT) && (
              <div className="flex items-center gap-2 px-3 md:px-4 py-2 bg-card rounded-lg md:rounded-xl border border-border overflow-hidden">
                <Layers size={12} className="text-muted-foreground shrink-0" />
                <select 
                  className="bg-transparent text-[9px] md:text-[10px] font-bold uppercase tracking-widest outline-none text-foreground w-full truncate"
                  value={deptFilter}
                  onChange={e => setDeptFilter(e.target.value)}
                >
                  <option key="dept-all" value="ALL">Départements</option>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="w-full">
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <table className="w-full text-left border-separate border-spacing-y-4">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  <th className="pb-4 pl-6">ID / Étudiant</th>
                  <th className="pb-4 hidden lg:table-cell">Département</th>
                  <th className="pb-4 hidden xl:table-cell">Entreprise</th>
                  <th className="pb-4">Statut</th>
                  <th className="pb-4 pr-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.map(record => {
                  const needsAction = isStudent && (record.status === WorkflowStatus.COMPLEMENT_REQUIRED || record.status === WorkflowStatus.PENDING_STUDENT_SIGNATURE);
                  
                  return (
                    <tr key={record.id} className="group hover:translate-x-1 transition-transform duration-300">
                      <td className={`py-4 pl-6 rounded-l-[2rem] border-y border-l border-border ${needsAction ? 'bg-amber-500/5' : 'bg-secondary/50'}`}>
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className={`w-10 h-10 rounded-2xl shadow-sm flex items-center justify-center font-bold text-xs ${needsAction ? 'bg-amber-500 text-white' : 'bg-card text-primary'}`}>
                              {record.studentName.charAt(0)}
                            </div>
                            {needsAction && (
                              <div className="absolute -top-1 -right-1 bg-amber-500 text-white p-0.5 rounded-full shadow-sm border border-white animate-bounce">
                                <Zap size={8} className="fill-current" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-foreground uppercase tracking-tight truncate max-w-[200px]">{record.studentName}</p>
                            <p className="text-[9px] font-mono text-muted-foreground uppercase truncate">{record.id.substring(0, 12)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className={`py-4 border-y border-border hidden lg:table-cell ${needsAction ? 'bg-amber-500/5' : 'bg-secondary/50'}`}>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{record.data.department}</p>
                      </td>
                      <td className={`py-4 border-y border-border hidden xl:table-cell max-w-[200px] ${needsAction ? 'bg-amber-500/5' : 'bg-secondary/50'}`}>
                        <p className="text-[10px] font-bold text-foreground uppercase truncate">{record.data.companyName}</p>
                      </td>
                      <td className={`py-4 border-y border-border min-w-[120px] ${needsAction ? 'bg-amber-500/5' : 'bg-secondary/50'}`}>
                        <Badge status={record.status} />
                      </td>
                      <td className={`py-4 pr-6 rounded-r-[2rem] border-y border-r border-border text-right ${needsAction ? 'bg-amber-500/5' : 'bg-secondary/50'}`}>
                        <Button 
                          onClick={() => navigate(`/request/${record.id}`)} 
                          variant="ghost" 
                          size="sm" 
                          className={`rounded-xl font-bold text-[10px] uppercase tracking-widest px-4 ${needsAction ? 'text-amber-600 hover:bg-amber-500/10' : 'text-primary hover:bg-primary/10'}`}
                        >
                          {needsAction ? "Traiter" : "Détails"} <ChevronRight size={14} className="ml-1" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {paginatedRecords.map(record => {
              const needsAction = isStudent && (record.status === WorkflowStatus.COMPLEMENT_REQUIRED || record.status === WorkflowStatus.PENDING_STUDENT_SIGNATURE);
              
              return (
                  <div 
                    key={record.id} 
                    onClick={() => navigate(`/request/${record.id}`)}
                    className={`p-4 rounded-[1.5rem] border border-border space-y-3 cursor-pointer active:scale-[0.98] transition-all ${needsAction ? 'bg-amber-500/5 border-amber-500/20 shadow-lg shadow-amber-500/5' : 'bg-secondary/50'}`}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative shrink-0">
                          <div className={`w-9 h-9 rounded-xl shadow-sm flex items-center justify-center font-bold text-[10px] ${needsAction ? 'bg-amber-500 text-white' : 'bg-card text-primary'}`}>
                            {record.studentName.charAt(0)}
                          </div>
                          {needsAction && (
                            <div className="absolute -top-1 -right-1 bg-amber-500 text-white p-0.5 rounded-full shadow-sm border border-white animate-bounce">
                              <Zap size={8} className="fill-current" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-foreground uppercase tracking-tight truncate leading-tight">{record.studentName}</p>
                          <p className="text-[9px] font-mono text-muted-foreground uppercase opacity-70">#{record.id.substring(0, 8)}</p>
                        </div>
                      </div>
                      <Badge status={record.status} className="shrink-0 scale-90 origin-right" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/40">
                      <div className="min-w-0">
                        <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5 opacity-60">Département</p>
                        <p className="text-[9px] font-bold text-foreground uppercase truncate">{record.data.department}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5 opacity-60">Entreprise</p>
                        <p className="text-[9px] font-bold text-foreground uppercase truncate">{record.data.companyName}</p>
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <div className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${needsAction ? 'text-amber-600' : 'text-primary'}`}>
                        {needsAction ? "Traiter" : "Voir"} <ChevronRight size={10} />
                      </div>
                    </div>
                  </div>
              );
            })}
          </div>
          
          {filteredRecords.length === 0 && (
            <div className="py-16 md:py-24 text-center space-y-4">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-secondary rounded-full flex items-center justify-center mx-auto text-muted-foreground/30">
                <Search size={32} />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Aucun dossier ne correspond à votre recherche</p>
            </div>
          )}

          <Pagination 
            currentPage={currentPage} 
            totalPages={totalPages} 
            onPageChange={setCurrentPage} 
          />
        </div>
      </Card>
    </div>
  );
};
