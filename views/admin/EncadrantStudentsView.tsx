
import React, { useMemo, useState } from 'react';
import { 
  Users, Search, Filter, ChevronRight, 
  Clock, CheckCircle2, AlertCircle, 
  ArrowLeft, Mail, Phone, Building2
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { Role, WorkflowStatus } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useNavigate } from 'react-router-dom';
import { Pagination } from '../../components/shared/Pagination';

export const EncadrantStudentsView = () => {
  const { records, currentUser } = useAppContext();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const myStudents = useMemo(() => {
    if (!currentUser) return [];
    return records.filter(r => 
      r.data.fstTutorEmail?.toLowerCase() === currentUser.email?.toLowerCase()
    );
  }, [records, currentUser]);

  const filteredStudents = useMemo(() => {
    if (!searchTerm) return myStudents;
    const s = searchTerm.toLowerCase();
    return myStudents.filter(r => 
      r.studentName.toLowerCase().includes(s) || 
      r.id.toLowerCase().includes(s) ||
      r.data.companyName.toLowerCase().includes(s)
    );
  }, [myStudents, searchTerm]);

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(start, start + itemsPerPage);
  }, [filteredStudents, currentPage]);

  const stats = useMemo(() => {
    return {
      total: myStudents.length,
      pending: myStudents.filter(r => r.status !== WorkflowStatus.COMPLETED && r.status !== WorkflowStatus.REJECTED).length,
      completed: myStudents.filter(r => r.status === WorkflowStatus.COMPLETED).length
    };
  }, [myStudents]);

  return (
    <div className="container mx-auto px-6 pt-12 pb-48 md:pb-56 max-w-7xl space-y-8 animate-in fade-in duration-500 bg-background min-h-screen">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-2"
          >
            <ArrowLeft size={16} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Retour au Dashboard</span>
          </button>
          <h2 className="text-3xl font-black text-foreground uppercase tracking-tighter">Suivi de mes Étudiants</h2>
          <p className="text-muted-foreground text-sm">Consultez l'état d'avancement des dossiers de stage de vos étudiants assignés.</p>
        </div>

        <div className="relative w-full md:w-72 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Rechercher un étudiant..." 
            className="w-full pl-12 pr-4 py-3 bg-card border border-border rounded-2xl text-sm outline-none focus:border-primary transition-all shadow-sm text-foreground"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-primary/10 border-primary/20 rounded-3xl">
          <div className="flex items-center gap-3 mb-2">
            <Users className="text-primary" size={20} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Total Étudiants</span>
          </div>
          <p className="text-3xl font-black text-foreground">{stats.total}</p>
        </Card>
        <Card className="p-6 bg-amber-500/10 border-amber-500/20 rounded-3xl">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="text-amber-500" size={20} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500">En Cours</span>
          </div>
          <p className="text-3xl font-black text-foreground">{stats.pending}</p>
        </Card>
        <Card className="p-6 bg-emerald-500/10 border-emerald-500/20 rounded-3xl">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 className="text-emerald-500" size={20} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Validés</span>
          </div>
          <p className="text-3xl font-black text-foreground">{stats.completed}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {paginatedStudents.map(student => (
          <Card 
            key={student.id}
            className="p-6 bg-card border-border rounded-[2rem] hover:shadow-xl transition-all group"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center text-2xl font-black text-primary">
                  {student.studentName.charAt(0)}
                </div>
                <div>
                  <h4 className="text-lg font-black text-foreground uppercase tracking-tight">{student.studentName}</h4>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase">{student.id}</p>
                </div>
              </div>
              <Badge status={student.status} />
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Building2 size={16} />
                <span className="text-xs font-medium">{student.data.companyName}</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <Clock size={16} />
                <span className="text-xs font-medium">Stage: {student.data.startDate} - {student.data.endDate}</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-border flex justify-between items-center">
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="rounded-xl p-2 hover:bg-primary/10 text-primary">
                  <Mail size={16} />
                </Button>
                <Button variant="ghost" size="sm" className="rounded-xl p-2 hover:bg-secondary text-muted-foreground">
                  <Phone size={16} />
                </Button>
              </div>
              <Button 
                onClick={() => navigate(`/request/${student.id}`)}
                className="bg-primary text-primary-foreground py-2 px-6 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:scale-105 transition-all"
              >
                Voir Détails <ChevronRight size={14} className="ml-1" />
              </Button>
            </div>
          </Card>
        ))}

        {filteredStudents.length === 0 && (
          <div className="lg:col-span-2 py-24 text-center space-y-4 bg-secondary/50 rounded-[3rem] border-2 border-dashed border-border">
            <div className="w-20 h-20 bg-card rounded-full flex items-center justify-center mx-auto text-muted-foreground/30 shadow-sm">
              <Users size={32} />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-bold text-foreground uppercase tracking-tight">Aucun étudiant trouvé</p>
              <p className="text-xs text-muted-foreground font-medium">Vous n'avez aucun étudiant assigné correspondant à cette recherche.</p>
            </div>
          </div>
        )}
      </div>

      <Pagination 
        currentPage={currentPage} 
        totalPages={totalPages} 
        onPageChange={setCurrentPage} 
      />
    </div>
  );
};
