
import React, { useState } from 'react';
import { 
  Send, MessageSquare, Clock, CheckCircle2, 
  HelpCircle, LifeBuoy, ArrowLeft, Search, ChevronRight,
  Globe, Lock, Info
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useAppContext } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';

export const SupportView = () => {
  const { currentUser, supportQuestions, sendSupportQuestion, showAlert } = useAppContext();
  const navigate = useNavigate();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'MY_QUESTIONS' | 'FAQ'>('FAQ');
  const [faqSearch, setFaqSearch] = useState('');

  const userQuestions = supportQuestions.filter(q => q.userId === currentUser?.id);
  const publicQuestions = supportQuestions.filter(q => q.isPublic && q.status === 'answered');
  
  const filteredFAQ = publicQuestions.filter(q => 
    q.subject.toLowerCase().includes(faqSearch.toLowerCase()) || 
    q.message.toLowerCase().includes(faqSearch.toLowerCase()) ||
    q.answer?.toLowerCase().includes(faqSearch.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setIsSending(true);
    setTimeout(() => {
      sendSupportQuestion(subject, message);
      setSubject('');
      setMessage('');
      setIsSending(false);
      setShowForm(false);
      setActiveTab('MY_QUESTIONS');
      showAlert("Question envoyée", "Votre demande a été transmise au support technique.", "success");
    }, 800);
  };

  return (
    <div className="container mx-auto px-6 pt-12 pb-32 md:pb-40 max-w-5xl space-y-12 text-left animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
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
          <div className="flex items-center gap-2">
            <LifeBuoy className="text-primary" size={20} />
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Support Technique</p>
          </div>
          <h2 className="text-4xl md:text-5xl text-foreground tracking-tighter uppercase font-medium">Centre d'Assistance</h2>
          <p className="text-muted-foreground max-w-xl">Besoin d'aide ? Consultez la FAQ ou posez votre question directement à notre équipe.</p>
        </div>
        
        {!showForm && (
          <Button 
            onClick={() => setShowForm(true)}
            className="py-4 px-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 shadow-xl shadow-primary/20 self-start md:self-auto"
          >
            Nouvelle Question <MessageSquare size={16} />
          </Button>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {showForm ? (
            <Card className="p-8 bg-card border-border rounded-[2.5rem] shadow-2xl space-y-8">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black text-foreground uppercase tracking-tight">Poser une question</h3>
                <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground text-[10px] font-bold uppercase">Annuler</button>
              </div>
              
              <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20 flex gap-3">
                <Info className="text-primary shrink-0" size={18} />
                <p className="text-xs text-primary leading-relaxed">
                  Votre question sera traitée par notre équipe. Elle ne sera pas visible par les autres étudiants, sauf si vous demandez qu'elle soit ajoutée à la FAQ après réponse.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Sujet de votre demande</label>
                  <input 
                    type="text"
                    required
                    placeholder="Ex: Problème de signature, Erreur dans les dates..."
                    className="w-full p-4 bg-secondary border-2 border-transparent focus:border-primary rounded-2xl outline-none text-foreground transition-all"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Message détaillé</label>
                  <textarea 
                    required
                    rows={6}
                    placeholder="Décrivez votre problème avec le plus de précisions possible..."
                    className="w-full p-4 bg-secondary border-2 border-transparent focus:border-primary rounded-2xl outline-none text-foreground transition-all resize-none"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                  />
                </div>

                <Button 
                  type="submit"
                  disabled={isSending || !subject.trim() || !message.trim()}
                  className="w-full py-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-xl shadow-primary/20"
                >
                  {isSending ? 'Envoi en cours...' : 'Envoyer au Support'} <Send size={16} />
                </Button>
              </form>
            </Card>
          ) : (
            <div className="space-y-6">
              <div className="flex gap-4 p-1 bg-secondary rounded-2xl w-fit">
                <button 
                  onClick={() => setActiveTab('FAQ')}
                  className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'FAQ' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Questions Fréquentes
                </button>
                <button 
                  onClick={() => setActiveTab('MY_QUESTIONS')}
                  className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'MY_QUESTIONS' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Mes Échanges ({userQuestions.length})
                </button>
              </div>

              {activeTab === 'FAQ' ? (
                <div className="space-y-6">
                  <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} />
                    <input 
                      type="text"
                      placeholder="Rechercher dans la FAQ..."
                      className="w-full pl-12 pr-4 py-4 bg-card border-2 border-transparent focus:border-primary rounded-2xl outline-none text-foreground shadow-sm transition-all"
                      value={faqSearch}
                      onChange={e => setFaqSearch(e.target.value)}
                    />
                  </div>

                  <div className="space-y-4">
                    {filteredFAQ.length > 0 ? (
                      filteredFAQ.map(q => (
                        <Card key={q.id} className="p-6 bg-card border-border rounded-3xl hover:shadow-lg transition-all group">
                          <div className="flex items-center gap-2 mb-3">
                            <Globe size={14} className="text-primary" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-primary">Question Publique</span>
                          </div>
                          <h4 className="text-lg font-bold text-foreground mb-4">{q.subject}</h4>
                          <div className="p-4 bg-secondary rounded-2xl mb-4 border-l-4 border-border">
                            <p className="text-sm text-muted-foreground italic">"{q.message}"</p>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-emerald-600">
                              <CheckCircle2 size={16} />
                              <span className="text-[10px] font-black uppercase tracking-widest">Réponse Officielle</span>
                            </div>
                            <p className="text-sm text-foreground leading-relaxed pl-6">{q.answer}</p>
                          </div>
                        </Card>
                      ))
                    ) : (
                      <div className="py-12 text-center text-muted-foreground">
                        <p className="text-sm font-medium">Aucun résultat pour votre recherche.</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {userQuestions.length > 0 ? (
                    userQuestions.map(q => (
                      <Card key={q.id} className="p-6 bg-card border-border rounded-3xl hover:shadow-lg transition-all group">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                          <div className="flex items-center gap-3">
                            <Badge variant={q.status === 'pending' ? 'warning' : 'success'}>
                              {q.status === 'pending' ? 'En attente' : 'Répondu'}
                            </Badge>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{new Date(q.createdAt).toLocaleDateString()}</span>
                          </div>
                          <h4 className="font-bold text-foreground">{q.subject}</h4>
                        </div>
                        
                        <div className="p-4 bg-secondary rounded-2xl mb-4">
                          <p className="text-sm text-muted-foreground leading-relaxed">{q.message}</p>
                        </div>

                        {q.status === 'answered' && (
                          <div className="mt-4 pt-4 border-t border-border space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-emerald-600">
                                <CheckCircle2 size={14} />
                                <span className="text-[9px] font-black uppercase tracking-widest">Réponse du Support</span>
                              </div>
                              {q.isPublic && (
                                <div className="flex items-center gap-1 text-primary">
                                  <Globe size={12} />
                                  <span className="text-[8px] font-bold uppercase tracking-widest">Ajouté à la FAQ</span>
                                </div>
                              )}
                            </div>
                            <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                              <p className="text-sm text-foreground leading-relaxed">{q.answer}</p>
                              <div className="mt-2 text-[9px] font-bold text-emerald-600 uppercase tracking-widest">
                                Répondu le {new Date(q.answeredAt!).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        )}
                      </Card>
                    ))
                  ) : (
                    <div className="py-20 text-center space-y-4 bg-secondary rounded-[3rem] border-2 border-dashed border-border">
                      <div className="w-16 h-16 bg-card rounded-full flex items-center justify-center mx-auto text-muted-foreground/30">
                        <MessageSquare size={32} />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-foreground uppercase tracking-tight">Aucun échange</p>
                        <p className="text-xs text-muted-foreground">Vous n'avez pas encore posé de question au support.</p>
                      </div>
                      <Button 
                        onClick={() => setShowForm(true)}
                        variant="outline"
                        className="mt-4 text-[10px] font-bold uppercase tracking-widest"
                      >
                        Poser ma première question
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          <Card className="p-6 bg-primary text-primary-foreground rounded-[2rem] space-y-4 shadow-xl shadow-primary/20">
            <h4 className="font-black uppercase tracking-tighter text-lg">Contact Direct</h4>
            <p className="text-primary-foreground/80 text-xs leading-relaxed">Pour les urgences absolues, vous pouvez contacter le service des stages directement.</p>
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                  <LifeBuoy size={16} />
                </div>
                <span>support@fst.ma</span>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-card border-border rounded-[2rem] space-y-4">
            <h4 className="font-black uppercase tracking-tighter text-foreground">Statistiques FAQ</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Questions Publiques</span>
                <span className="text-xl font-black text-primary">{publicQuestions.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Taux de réponse</span>
                <span className="text-xl font-black text-emerald-600">100%</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
