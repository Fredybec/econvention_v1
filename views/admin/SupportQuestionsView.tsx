
import React, { useState, useMemo } from 'react';
import { 
  MessageSquare, Send, User, Clock, CheckCircle2, 
  Filter, Search, ChevronRight, HelpCircle, LifeBuoy,
  Trash2, Plus, Globe, Lock, ArrowLeft
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ConfirmModal } from '../../components/shared/ConfirmModal';
import { Pagination } from '../../components/shared/Pagination';
import { BackButton } from '../../components/shared/BackButton';
import { useAppContext } from '../../context/AppContext';
import { SupportQuestion } from '../../types';
import { useNavigate } from 'react-router-dom';

export const SupportQuestionsView = () => {
  const { currentUser, supportQuestions, answerSupportQuestion, deleteSupportQuestion, addSupportFAQ, showAlert } = useAppContext();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'ANSWERED'>('ALL');
  const [selectedQuestion, setSelectedQuestion] = useState<SupportQuestion | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [showAddFAQ, setShowAddFAQ] = useState(false);
  const [newFAQ, setNewFAQ] = useState({ subject: '', message: '', answer: '' });
  const [questionToDelete, setQuestionToDelete] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const filteredQuestions = supportQuestions.filter(q => {
    const matchesSearch = q.userName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         q.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'ALL' || 
                         (filter === 'PENDING' && q.status === 'pending') || 
                         (filter === 'ANSWERED' && q.status === 'answered');
    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.ceil(filteredQuestions.length / itemsPerPage);
  const paginatedQuestions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredQuestions.slice(start, start + itemsPerPage);
  }, [filteredQuestions, currentPage]);

  const handleAnswer = () => {
    if (!selectedQuestion || !answerText.trim()) return;

    answerSupportQuestion(selectedQuestion.id, answerText, isPublic);
    setSelectedQuestion(null);
    setAnswerText('');
    setIsPublic(false);
    showAlert("Réponse envoyée", "La réponse a été transmise à l'utilisateur.", "success");
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setQuestionToDelete(id);
  };

  const confirmDelete = () => {
    if (questionToDelete) {
      deleteSupportQuestion(questionToDelete);
      if (selectedQuestion?.id === questionToDelete) setSelectedQuestion(null);
      setQuestionToDelete(null);
      showAlert("Succès", "La question a été supprimée.", "success");
    }
  };

  const handleAddFAQ = (e: React.FormEvent) => {
    e.preventDefault();
    addSupportFAQ(newFAQ.subject, newFAQ.message, newFAQ.answer);
    setNewFAQ({ subject: '', message: '', answer: '' });
    setShowAddFAQ(false);
    showAlert("FAQ ajoutée", "La question a été ajoutée à la base de connaissances.", "success");
  };

  return (
    <div className="container mx-auto px-4 md:px-6 pt-8 md:pt-12 pb-48 md:pb-64 max-w-7xl space-y-12 text-left animate-in fade-in duration-500 bg-background min-h-screen">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <BackButton to="/dashboard" />
          <div className="flex items-center gap-2">
            <LifeBuoy className="text-primary" size={20} />
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Support Technique</p>
          </div>
          <h2 className="text-4xl md:text-5xl text-foreground tracking-tighter uppercase font-medium">Questions Utilisateurs</h2>
          <p className="text-muted-foreground max-w-2xl">Répondez aux interrogations des étudiants et du personnel concernant le processus de convention.</p>
        </div>
        <Button 
          onClick={() => setShowAddFAQ(true)}
          className="py-4 px-8 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 shadow-xl"
        >
          Ajouter une FAQ <Plus size={16} />
        </Button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* List Section */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-4 bg-card border-border rounded-3xl space-y-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Rechercher..." 
                className="w-full pl-12 pr-4 py-3 bg-secondary border-0 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/20 text-foreground transition-all"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2 p-1 bg-secondary rounded-xl">
              {(['ALL', 'PENDING', 'ANSWERED'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex-1 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${filter === f ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'}`}
                >
                  {f === 'ALL' ? 'Tous' : f === 'PENDING' ? 'En attente' : 'Répondus'}
                </button>
              ))}
            </div>
          </Card>

          <div className="space-y-4">
            {paginatedQuestions.map(q => (
              <Card 
                key={q.id}
                onClick={() => setSelectedQuestion(q)}
                className={`p-5 cursor-pointer transition-all border-2 relative group ${selectedQuestion?.id === q.id ? 'border-primary bg-primary/5' : 'border-transparent bg-card hover:border-border'} rounded-3xl`}
              >
                <button 
                  onClick={(e) => handleDelete(q.id, e)}
                  className="absolute top-4 right-4 p-2 text-muted-foreground/30 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={14} />
                </button>

                <div className="flex justify-between items-start mb-2">
                  <div className="flex gap-2">
                    <Badge variant={q.status === 'pending' ? 'warning' : 'success'}>
                      {q.status === 'pending' ? 'En attente' : 'Répondu'}
                    </Badge>
                    {q.isPublic && (
                      <Badge variant="info" className="bg-primary/10 text-primary border-primary/20">
                        <Globe size={10} className="mr-1" /> Public
                      </Badge>
                    )}
                  </div>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase">{new Date(q.createdAt).toLocaleDateString()}</span>
                </div>
                <h4 className="font-bold text-foreground text-sm mb-1 pr-8">{q.subject}</h4>
                <p className="text-xs text-muted-foreground line-clamp-2">{q.message}</p>
                <div className="mt-4 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                    {q.userName.charAt(0)}
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{q.userName}</span>
                </div>
              </Card>
            ))}
          </div>

          <Pagination 
            currentPage={currentPage} 
            totalPages={totalPages} 
            onPageChange={setCurrentPage}
            className="pt-4 border-t-0"
          />
        </div>

        {/* Detail Section */}
        <div className="lg:col-span-2">
          {showAddFAQ ? (
            <Card className="p-8 bg-card border-border rounded-[3rem] shadow-2xl space-y-8">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black text-foreground uppercase tracking-tighter">Ajouter une FAQ</h3>
                <button onClick={() => setShowAddFAQ(false)} className="text-[10px] font-bold uppercase text-muted-foreground hover:text-foreground">Annuler</button>
              </div>
              <form onSubmit={handleAddFAQ} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Sujet / Titre</label>
                  <input 
                    type="text"
                    required
                    className="w-full p-4 bg-secondary border-2 border-transparent focus:border-primary rounded-2xl outline-none text-foreground transition-all"
                    value={newFAQ.subject}
                    onChange={e => setNewFAQ({...newFAQ, subject: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Question détaillée</label>
                  <textarea 
                    required
                    rows={3}
                    className="w-full p-4 bg-secondary border-2 border-transparent focus:border-primary rounded-2xl outline-none text-foreground transition-all"
                    value={newFAQ.message}
                    onChange={e => setNewFAQ({...newFAQ, message: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Réponse</label>
                  <textarea 
                    required
                    rows={5}
                    className="w-full p-4 bg-secondary border-2 border-transparent focus:border-primary rounded-2xl outline-none text-foreground transition-all"
                    value={newFAQ.answer}
                    onChange={e => setNewFAQ({...newFAQ, answer: e.target.value})}
                  />
                </div>
                <Button type="submit" className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-widest text-[10px]">
                  Publier dans la FAQ
                </Button>
              </form>
            </Card>
          ) : selectedQuestion ? (
            <Card className="p-8 bg-card border-border rounded-[3rem] shadow-2xl space-y-8 sticky top-24">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-foreground uppercase tracking-tighter">{selectedQuestion.subject}</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">De: {selectedQuestion.userName}</span>
                    <span className="text-muted-foreground/30">•</span>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{new Date(selectedQuestion.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={(e) => handleDelete(selectedQuestion.id, e)}
                    className="p-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-2xl transition-all"
                    title="Supprimer"
                  >
                    <Trash2 size={20} />
                  </button>
                  <Badge variant={selectedQuestion.status === 'pending' ? 'warning' : 'success'}>
                    {selectedQuestion.status === 'pending' ? 'En attente' : 'Répondu'}
                  </Badge>
                </div>
              </div>

              <div className="p-6 bg-secondary/50 rounded-3xl border border-border">
                <p className="text-foreground leading-relaxed">{selectedQuestion.message}</p>
              </div>

              {selectedQuestion.status === 'answered' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-500">
                      <CheckCircle2 size={18} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Réponse envoyée</span>
                    </div>
                    {selectedQuestion.isPublic ? (
                      <div className="flex items-center gap-2 text-primary">
                        <Globe size={14} />
                        <span className="text-[9px] font-bold uppercase tracking-widest">Visible dans la FAQ</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Lock size={14} />
                        <span className="text-[9px] font-bold uppercase tracking-widest">Privé</span>
                      </div>
                    )}
                  </div>
                  <div className="p-6 bg-emerald-500/10 rounded-3xl border border-emerald-500/20">
                    <p className="text-foreground leading-relaxed">{selectedQuestion.answer}</p>
                    <div className="mt-4 pt-4 border-t border-emerald-500/20 flex justify-between items-center">
                      <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Par: {selectedQuestion.answeredBy}</span>
                      <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">{new Date(selectedQuestion.answeredAt!).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-primary">
                    <MessageSquare size={18} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Votre Réponse</span>
                  </div>
                  <textarea 
                    className="w-full p-6 bg-secondary border-2 border-transparent focus:border-primary rounded-3xl outline-none text-foreground transition-all min-h-[200px]"
                    placeholder="Saisissez votre réponse ici..."
                    value={answerText}
                    onChange={e => setAnswerText(e.target.value)}
                  />
                  
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-12 h-6 rounded-full p-1 transition-all ${isPublic ? 'bg-primary' : 'bg-secondary'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full transition-all ${isPublic ? 'translate-x-6' : 'translate-x-0'}`} />
                      </div>
                      <input 
                        type="checkbox" 
                        className="hidden" 
                        checked={isPublic}
                        onChange={e => setIsPublic(e.target.checked)}
                      />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Rendre public (FAQ)</span>
                        <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">Visible par tous les étudiants</span>
                      </div>
                    </label>

                    <Button 
                      onClick={handleAnswer}
                      disabled={!answerText.trim()}
                      className="py-4 px-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 shadow-xl"
                    >
                      Envoyer la réponse <Send size={14} />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6 py-24">
              <div className="w-32 h-32 bg-secondary rounded-full flex items-center justify-center text-muted-foreground/20">
                <HelpCircle size={64} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-foreground uppercase tracking-tight">Sélectionnez une question</h3>
                <p className="text-muted-foreground text-sm max-w-xs">Choisissez une question dans la liste de gauche pour voir les détails et y répondre.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={!!questionToDelete}
        onClose={() => setQuestionToDelete(null)}
        onConfirm={confirmDelete}
        title="Supprimer la question"
        message="Êtes-vous sûr de vouloir supprimer cette question ? Cette action est irréversible."
        confirmText="Supprimer"
        variant="danger"
      />
    </div>
  );
};
