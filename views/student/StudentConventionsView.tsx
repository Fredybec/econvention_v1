import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Plus, Layout, ArrowUpRight, Calendar, Layers, User as UserIcon, Zap, Edit, ChevronRight, ChevronLeft, Archive, Search, Filter } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { WorkflowStatus } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Pagination } from '../../components/shared/Pagination';

import { getAcademicYear } from '../../utils/dateUtils';

export const StudentConventionsView = () => {
  const { records, currentUser, systemConfig } = useAppContext();
  const CURRENT_YEAR = getAcademicYear();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [activeTab, setActiveTab] = useState<'active' | 'archive'>('active');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  
  const myRecords = useMemo(() => {
    return records
      .filter(r => r.studentId === currentUser?.id)
      .map(r => ({
        ...r,
        data: {
          ...r.data,
          academicYear: r.data.academicYear || getAcademicYear(new Date(r.updatedAt))
        }
      }));
  }, [records, currentUser]);

  const currentAcademicYear = getAcademicYear();

  const filteredRecords = useMemo(() => {
    let base = myRecords;
    
    if (activeTab === 'active') {
      // Actifs: Current academic year and not completed/cancelled/rejected
      return base.filter(r => 
        r.data.academicYear === currentAcademicYear && 
        ![WorkflowStatus.COMPLETED, WorkflowStatus.CANCELLED, WorkflowStatus.REJECTED].includes(r.status)
      );
    } else {
      // Archive: Everything else + previous years
      let archive = base.filter(r => 
        r.data.academicYear !== currentAcademicYear || 
        [WorkflowStatus.COMPLETED, WorkflowStatus.CANCELLED, WorkflowStatus.REJECTED].includes(r.status)
      );
      
      if (selectedYear !== 'all') {
        archive = archive.filter(r => r.data.academicYear === selectedYear);
      }
      
      return archive;
    }
  }, [myRecords, activeTab, currentAcademicYear, selectedYear]);

  const academicYears = useMemo(() => {
    const years = Array.from(new Set(myRecords.map(r => r.data.academicYear))).filter(Boolean);
    return years.sort().reverse();
  }, [myRecords]);
  
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage]);

  return (
    <div className="container mx-auto px-6 pt-12 pb-48 md:pb-56 max-w-6xl space-y-12 text-left animate-in fade-in transition-colors duration-300">
      <header className="space-y-4">
        <Link to="/dashboard" className="text-[10px] text-muted-foreground uppercase tracking-widest hover:text-primary font-bold transition-colors group flex items-center gap-2">
          <ChevronRight size={14} className="rotate-180 transition-transform group-hover:-translate-x-1" /> Retour Dashboard
        </Link>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-1">
             <h2 className="text-3xl md:text-4xl text-foreground tracking-tighter uppercase font-medium">Mes Dossiers e-PFE</h2>
             <p className="text-muted-foreground text-sm font-normal">Suivi de vos demandes de conventions de stage.</p>
          </div>
          <Button onClick={() => navigate('/new-request')} className="w-full md:w-auto px-8 py-4 md:py-5 rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center gap-3 uppercase text-[10px] tracking-[0.2em] font-bold shadow-2xl hover:scale-105 transition-transform"><Plus size={18} /> Nouvelle Demande</Button>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-b border-border">
          <div className="flex gap-8 w-full sm:w-auto overflow-x-auto pb-px">
            <button 
              onClick={() => { setActiveTab('active'); setCurrentPage(1); }}
              className={`pb-4 text-[10px] uppercase font-bold tracking-[0.2em] transition-all relative ${activeTab === 'active' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Dossiers Actifs
              {activeTab === 'active' && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-full animate-in slide-in-from-left-4" />}
            </button>
            <button 
              onClick={() => { setActiveTab('archive'); setCurrentPage(1); }}
              className={`pb-4 text-[10px] uppercase font-bold tracking-[0.2em] transition-all relative ${activeTab === 'archive' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Archive
              {activeTab === 'archive' && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-full animate-in slide-in-from-left-4" />}
            </button>
          </div>

          {activeTab === 'archive' && academicYears.length > 0 && (
            <div className="flex items-center gap-2 pb-4">
              <Filter size={14} className="text-muted-foreground" />
              <select 
                value={selectedYear}
                onChange={(e) => { setSelectedYear(e.target.value); setCurrentPage(1); }}
                className="bg-transparent text-[10px] font-bold uppercase tracking-widest outline-none border-none focus:ring-0 cursor-pointer text-primary"
              >
                <option value="all">Toutes les années</option>
                {academicYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </header>
      <div className="space-y-4">
        {filteredRecords.length === 0 ? (
          <div className="p-24 text-center border-4 border-dashed border-border rounded-[4rem] space-y-4 opacity-50">
             {activeTab === 'active' ? <Layout className="mx-auto text-muted" size={64} /> : <Archive className="mx-auto text-muted" size={64} />}
             <p className="uppercase text-xs font-bold tracking-widest text-muted-foreground">
               {activeTab === 'active' ? 'Aucun dossier actif pour le moment' : 'Aucune archive disponible'}
             </p>
          </div>
        ) : (
          <>
            {paginatedRecords.map(record => (
              <Card key={record.id} onClick={() => navigate(`/request/${record.id}`)} className="group p-6 md:p-8 hover:border-primary flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-2 h-full bg-primary transition-all opacity-0 group-hover:opacity-100" />
                 <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 md:gap-8 w-full">
                   <div className="text-left min-w-[120px] space-y-1">
                     <p className="text-[9px] text-muted-foreground uppercase tracking-[0.2em] font-bold">Référence</p>
                     <p className="text-base font-bold text-primary uppercase tracking-tighter flex items-center gap-2">{record.id} <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" /></p>
                   </div>
                   <div className="h-px w-full sm:h-10 sm:w-px bg-border" />
                   <div className="text-left space-y-1 flex-1">
                     <p className="text-base font-medium text-foreground uppercase tracking-tight line-clamp-1">{record.data.companyName}</p>
                     <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-muted-foreground font-normal uppercase tracking-widest">
                       <span className="flex items-center gap-1 whitespace-nowrap"><Calendar size={12} /> {record.data.academicYear}</span>
                        <span className="flex items-center gap-1 whitespace-nowrap"><Layers size={12} /> {record.data.filiere}</span>
                        <span className="flex items-center gap-1 whitespace-nowrap"><UserIcon size={12} /> CNE: {record.data.massarCode}</span>
                        <span className="flex items-center gap-1 whitespace-nowrap"><Zap size={12} /> {record.data.currentLevel}</span>
                     </div>
                   </div>
                 </div>
                  <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0 min-w-0">
                    <div className="flex items-center gap-3 min-w-0 flex-1 md:flex-none">
                      {(record.status === WorkflowStatus.DRAFT || record.status === WorkflowStatus.PENDING_RESPONSABLE || record.status === WorkflowStatus.COMPLEMENT_REQUIRED) && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/edit-request/${record.id}`);
                          }}
                          className="p-3 bg-secondary text-muted-foreground rounded-xl hover:bg-primary hover:text-primary-foreground transition-all shadow-sm shrink-0"
                          title="Modifier la demande"
                        >
                          <Edit size={18} />
                        </button>
                      )}
                      <Badge status={record.status} className="flex-1 md:flex-none min-w-0" />
                    </div>
                    <div className="w-10 h-10 rounded-full bg-muted text-muted-foreground flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-inner shrink-0">
                      <ChevronRight size={20} />
                    </div>
                  </div>
              </Card>
            ))}

            <Pagination 
              currentPage={currentPage} 
              totalPages={totalPages} 
              onPageChange={setCurrentPage} 
            />
          </>
        )}
      </div>
    </div>
  );
};
