import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PanelRightClose, PanelRightOpen, Upload, 
  Plus, MoveUp, MoveDown, Trash2, Eye, ZoomOut, ZoomIn, Download, Activity, X, ArrowLeft, FileText,
  Info, Copy, Check, ChevronDown, ChevronUp, ChevronsUpDown
} from 'lucide-react';
import { animate, motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useAppContext } from '../../context/AppContext';
import { StageType, ConventionArticle } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConventionPDFContent } from '../../components/shared/ConventionPDFContent';
import { AlertModal } from '../../components/shared/AlertModal';
import { TEMPLATE_PARAMS } from '../../utils/templateUtils';

import { Logo } from '../../components/ui/Logo';

export const TemplateEditorView = () => {
  const { 
    template, updateTemplate 
  } = useAppContext();
  const navigate = useNavigate();
  const [zoom, setZoom] = useState(0.45);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isParamsOpen, setIsParamsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copiedParam, setCopiedParam] = useState<string | null>(null);
  const [activeArticleTab, setActiveArticleTab] = useState<'pfa' | 'pfe'>('pfa');
  const [expandedArticles, setExpandedArticles] = useState<Record<number, boolean>>({});
  const [articleToDelete, setArticleToDelete] = useState<number | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const articlesListRef = useRef<HTMLDivElement>(null);

  const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean, title: string, message: string }>({
    isOpen: false,
    title: '',
    message: ''
  });

  const showAlert = (title: string, message: string) => {
    setAlertConfig({ isOpen: true, title, message });
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => updateTemplate({ ...template, logoUrl: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const handleDownloadPreview = async () => {
    if (!previewRef.current) return;
    setIsDownloading(true);
    try {
      const element = previewRef.current;
      const pages = element.querySelectorAll('.pdf-page');
      
      if (pages.length === 0) {
        throw new Error("Aucune page trouvée pour l'exportation.");
      }

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;
        
        const canvas = await html2canvas(page, {
          scale: 3,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: 794,
          height: 1123,
          windowWidth: 1200,
          onclone: (clonedDoc) => {
            const styles = clonedDoc.querySelectorAll('style');
            styles.forEach(styleTag => {
              if (styleTag.innerHTML.includes('oklch') || styleTag.innerHTML.includes('oklab')) {
                styleTag.innerHTML = styleTag.innerHTML
                  .replace(/oklch\([^)]+\)/g, '#000000')
                  .replace(/oklab\([^)]+\)/g, '#000000');
              }
            });

            const allPages = clonedDoc.querySelectorAll('.pdf-page');
            allPages.forEach((p, idx) => {
              const el = p as HTMLElement;
              if (idx === i) {
                el.style.display = 'flex';
                el.style.flexDirection = 'column';
                el.style.visibility = 'visible';
                el.style.position = 'relative';
                el.style.transform = 'none';
                el.style.margin = '0';
                el.style.width = '794px';
                el.style.height = '1123px';
              } else {
                el.style.display = 'none';
              }
            });

            const zoomContainer = clonedDoc.querySelector('.pdf-zoom-container') as HTMLElement;
            if (zoomContainer) {
              zoomContainer.style.transform = 'none';
              zoomContainer.style.width = 'auto';
              zoomContainer.style.height = 'auto';
              zoomContainer.style.margin = '0';
              zoomContainer.style.padding = '0';
            }
          }
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        if (i > 0) pdf.addPage();
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      }
      
      pdf.save(`Template_Convention_Apercu.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      showAlert("Erreur", error instanceof Error ? error.message : 'Erreur lors de la génération du PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  const addArticle = () => {
    const isPfa = activeArticleTab === 'pfa';
    const field = isPfa ? 'pfaArticles' : 'pfeArticles';
    const prefix = isPfa ? 'pfa' : 'pfe';
    const currentArticles = template[field] || [];
    const newIdx = currentArticles.length;
    
    // Generate a unique ID using stage type, timestamp, and a random string
    const uniqueId = `art_${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    const newArticle: ConventionArticle = {
      id: uniqueId,
      title: `Article ${newIdx + 1} : Titre ...`,
      content: "Contenu de l'article réglementaire..."
    };
    updateTemplate({ ...template, [field]: [...currentArticles, newArticle] });
    setExpandedArticles(prev => ({ ...prev, [newIdx]: true }));
    
    // Smooth scroll to bottom after state update
    setTimeout(() => {
      if (articlesListRef.current) {
        articlesListRef.current.scrollTo({
          top: articlesListRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, 100);
  };

  const confirmDeleteArticle = (index: number) => {
    setArticleToDelete(index);
  };

  const removeArticle = () => {
    if (articleToDelete === null) return;
    const field = activeArticleTab === 'pfa' ? 'pfaArticles' : 'pfeArticles';
    const newArticles = [...(template[field] || [])];
    newArticles.splice(articleToDelete, 1);
    
    // Shift expansion states
    const newExpanded: Record<number, boolean> = {};
    Object.keys(expandedArticles).forEach(key => {
      const idx = parseInt(key);
      if (idx < articleToDelete) newExpanded[idx] = expandedArticles[idx];
      if (idx > articleToDelete) newExpanded[idx - 1] = expandedArticles[idx];
    });
    
    updateTemplate({ ...template, [field]: newArticles });
    setExpandedArticles(newExpanded);
    setArticleToDelete(null);
  };

  const toggleExpand = (index: number) => {
    setExpandedArticles(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const expandAll = () => {
    const count = currentArticles.length;
    const newState: Record<number, boolean> = {};
    for (let i = 0; i < count; i++) newState[i] = true;
    setExpandedArticles(newState);
  };

  const collapseAll = () => {
    setExpandedArticles({});
  };

  const moveArticle = (index: number, direction: 'up' | 'down') => {
    const field = activeArticleTab === 'pfa' ? 'pfaArticles' : 'pfeArticles';
    const newArticles = [...(template[field] || [])];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= newArticles.length) return;
    [newArticles[index], newArticles[target]] = [newArticles[target], newArticles[index]];
    updateTemplate({ ...template, [field]: newArticles });
  };

  const updateArticle = (index: number, data: Partial<ConventionArticle>) => {
    const field = activeArticleTab === 'pfa' ? 'pfaArticles' : 'pfeArticles';
    const newArticles = [...(template[field] || [])];
    newArticles[index] = { ...newArticles[index], ...data };
    updateTemplate({ ...template, [field]: newArticles });
  };

  const currentArticles = activeArticleTab === 'pfa' ? (template.pfaArticles || []) : (template.pfeArticles || []);

  const addCustomParam = () => {
    const newParam = {
      id: `cp_${Date.now()}`,
      key: '{nouveau_param}',
      label: 'Nouveau Paramètre',
      value: 'Valeur par défaut'
    };
    updateTemplate({ ...template, customParams: [...(template.customParams || []), newParam] });
  };

  const removeCustomParam = (id: string) => {
    updateTemplate({ ...template, customParams: (template.customParams || []).filter(p => p.id !== id) });
  };

  const updateCustomParam = (id: string, data: any) => {
    updateTemplate({ ...template, customParams: (template.customParams || []).map(p => p.id === id ? { ...p, ...data } : p) });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedParam(text);
    setTimeout(() => setCopiedParam(null), 2000);
  };

  return (
    <div className="flex min-h-screen bg-background transition-colors duration-300">
      {/* Sticky Top Bar for Preview */}
      <div className="fixed top-[73px] left-0 right-0 z-[1100] bg-card/80 backdrop-blur-md border-b border-border px-4 md:px-6 py-3 flex items-center justify-between shadow-sm animate-in slide-in-from-top duration-500">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              if (window.history.state && window.history.state.idx > 0) {
                navigate(-1);
              } else {
                navigate('/dashboard');
              }
            }} 
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-all px-2 py-1 rounded-lg"
          >
            <ArrowLeft size={16} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Retour</span>
          </button>
          <div className="hidden sm:block">
            <h2 className="text-xs font-bold uppercase tracking-widest text-foreground">Éditeur de Convention</h2>
            <p className="text-[8px] text-muted-foreground uppercase tracking-tighter">Modification en temps réel</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => setIsParamsOpen(!isParamsOpen)} 
            variant="outline" 
            size="sm"
            className={`px-4 rounded-xl flex items-center gap-2 uppercase text-[9px] tracking-widest font-bold border transition-all ${isParamsOpen ? 'border-primary text-primary bg-primary/5' : 'border-border'}`}
          >
            <Activity size={14} />
            <span className="hidden xs:inline">Paramètres</span>
          </Button>
          <Button 
            onClick={() => setIsPreviewModalOpen(true)} 
            size="sm"
            className="px-4 rounded-xl flex items-center gap-2 uppercase text-[9px] tracking-widest font-bold shadow-lg shadow-primary/20"
          >
            <Eye size={14} />
            Prévisualiser PDF
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pt-20">
        <div className="container mx-auto px-4 md:px-6 pt-8 md:pt-12 pb-48 md:pb-56 max-w-4xl animate-in fade-in">
          <header className="mb-8 md:mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 text-left">
            <div className="space-y-1">
              <h2 className="text-3xl md:text-4xl text-foreground tracking-tighter uppercase font-medium">Éditeur de Convention</h2>
              <p className="text-muted-foreground text-xs md:text-sm font-normal uppercase tracking-widest">Personnalisation du document officiel avec paramètres dynamiques</p>
            </div>
          </header>

          {isParamsOpen && (
            <Card className="p-6 mb-8 border-2 border-primary/20 bg-primary/5 rounded-[2rem] animate-in slide-in-from-top duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                  <Info size={16} />
                  Paramètres Disponibles
                </h3>
                <button 
                  onClick={() => setIsParamsOpen(false)} 
                  className="text-red-500 hover:text-red-600 p-1 hover:bg-red-50 rounded-full transition-all flex items-center justify-center shrink-0"
                  aria-label="Fermer"
                >
                  <X size={24} strokeWidth={2.5} className="shrink-0" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mb-6">Utilisez ces balises dans vos textes. Elles seront automatiquement remplacées par les données réelles lors de la génération.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {TEMPLATE_PARAMS.map(param => (
                  <div 
                    key={param.key} 
                    onClick={() => copyToClipboard(param.key)}
                    className="flex items-center justify-between p-3 bg-card border border-border rounded-xl hover:border-primary cursor-pointer group transition-all"
                  >
                    <div className="space-y-0.5">
                      <code className="text-[10px] font-mono font-bold text-primary">{param.key}</code>
                      <p className="text-[9px] text-muted-foreground">{param.label}</p>
                    </div>
                    {copiedParam === param.key ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
                  </div>
                ))}
                {template.customParams?.map(param => (
                  <div 
                    key={param.id} 
                    onClick={() => copyToClipboard(param.key)}
                    className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-xl hover:border-primary cursor-pointer group transition-all"
                  >
                    <div className="space-y-0.5">
                      <code className="text-[10px] font-mono font-bold text-primary">{param.key}</code>
                      <p className="text-[9px] text-muted-foreground">{param.label} (Perso)</p>
                    </div>
                    {copiedParam === param.key ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
                  </div>
                ))}
              </div>
            </Card>
          )}

          <div className="space-y-6 md:space-y-8 text-left">
            <Card className="p-6 md:p-8 border-0 shadow-xl rounded-[2rem] md:rounded-[2.5rem] bg-card space-y-6 transition-all duration-300">
              <h3 className="text-sm font-bold uppercase tracking-widest text-primary border-b border-border pb-4 mb-6">Structure & Parties</h3>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Titre du Document</label>
                    <input className="w-full p-4 bg-muted border border-border rounded-2xl text-foreground outline-none focus:border-primary" value={template.documentTitle} onChange={e => updateTemplate({...template, documentTitle: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Introduction des Parties</label>
                    <input className="w-full p-4 bg-muted border border-border rounded-2xl text-foreground outline-none focus:border-primary" value={template.partiesIntro} onChange={e => updateTemplate({...template, partiesIntro: e.target.value})} />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-border">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                    <div className="md:col-span-1 space-y-2">
                      <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Label Établissement</label>
                      <input className="w-full p-3 bg-muted border border-border rounded-xl text-xs outline-none focus:border-primary" value={template.establishmentLabel} onChange={e => updateTemplate({...template, establishmentLabel: e.target.value})} />
                    </div>
                    <div className="md:col-span-3 space-y-2">
                      <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Contenu Établissement</label>
                      <textarea className="w-full p-3 bg-muted border border-border rounded-xl text-xs outline-none focus:border-primary h-20" value={template.establishmentContent} onChange={e => updateTemplate({...template, establishmentContent: e.target.value})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                    <div className="md:col-span-1 space-y-2">
                      <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Label Organisme</label>
                      <input className="w-full p-3 bg-muted border border-border rounded-xl text-xs outline-none focus:border-primary" value={template.organizationLabel} onChange={e => updateTemplate({...template, organizationLabel: e.target.value})} />
                    </div>
                    <div className="md:col-span-3 space-y-2">
                      <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Contenu Organisme</label>
                      <textarea className="w-full p-3 bg-muted border border-border rounded-xl text-xs outline-none focus:border-primary h-20" value={template.organizationContent} onChange={e => updateTemplate({...template, organizationContent: e.target.value})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                    <div className="md:col-span-1 space-y-2">
                      <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Label Étudiant</label>
                      <input className="w-full p-3 bg-muted border border-border rounded-xl text-xs outline-none focus:border-primary" value={template.studentLabel} onChange={e => updateTemplate({...template, studentLabel: e.target.value})} />
                    </div>
                    <div className="md:col-span-3 space-y-2">
                      <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Contenu Étudiant</label>
                      <textarea className="w-full p-3 bg-muted border border-border rounded-xl text-xs outline-none focus:border-primary h-20" value={template.studentContent} onChange={e => updateTemplate({...template, studentContent: e.target.value})} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4 border-t border-border text-left">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Signature Étudiant</label>
                    <input className="w-full p-4 bg-muted border border-border rounded-2xl text-xs outline-none focus:border-primary" value={template.studentSignatureLabel} onChange={e => updateTemplate({...template, studentSignatureLabel: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Signature Organisme</label>
                    <input className="w-full p-4 bg-muted border border-border rounded-2xl text-xs outline-none focus:border-primary" value={template.organizationSignatureLabel} onChange={e => updateTemplate({...template, organizationSignatureLabel: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Signature Responsable</label>
                    <input className="w-full p-4 bg-muted border border-border rounded-2xl text-xs outline-none focus:border-primary" value={template.responsableSignatureLabel} onChange={e => updateTemplate({...template, responsableSignatureLabel: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Signature Doyen</label>
                    <input className="w-full p-4 bg-muted border border-border rounded-2xl text-xs outline-none focus:border-primary" value={template.deanSignatureLabel} onChange={e => updateTemplate({...template, deanSignatureLabel: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border text-left">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Mention "Lu et Approuvé"</label>
                    <input className="w-full p-4 bg-muted border border-border rounded-2xl text-xs outline-none focus:border-primary" value={template.signatureMentionLu} onChange={e => updateTemplate({...template, signatureMentionLu: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Mention "Fait à... le..."</label>
                    <input className="w-full p-4 bg-muted border border-border rounded-2xl text-xs outline-none focus:border-primary" value={template.signatureMentionFait} onChange={e => updateTemplate({...template, signatureMentionFait: e.target.value})} />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6 md:p-8 border-0 shadow-xl rounded-[2rem] md:rounded-[2.5rem] bg-card space-y-6 transition-all duration-300">
              <h3 className="text-sm font-bold uppercase tracking-widest text-primary border-b border-border pb-4 mb-6">Layout & Ordre des Sections</h3>
              <div className="space-y-4">
                {[...(template.sections || [])].sort((a, b) => a.order - b.order).map((section, idx) => (
                  <div key={section.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-2xl border border-border group">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col gap-1">
                        <button 
                          onClick={() => {
                            const newSections = [...template.sections];
                            const currentIdx = newSections.findIndex(s => s.id === section.id);
                            if (currentIdx > 0) {
                              const prev = newSections[currentIdx - 1];
                              const tempOrder = section.order;
                              section.order = prev.order;
                              prev.order = tempOrder;
                              updateTemplate({ ...template, sections: newSections });
                            }
                          }}
                          disabled={idx === 0}
                          className="p-1 hover:text-primary disabled:opacity-0"
                        >
                          <MoveUp size={14} />
                        </button>
                        <button 
                          onClick={() => {
                            const newSections = [...template.sections];
                            const currentIdx = newSections.findIndex(s => s.id === section.id);
                            if (currentIdx < newSections.length - 1) {
                              const next = newSections[currentIdx + 1];
                              const tempOrder = section.order;
                              section.order = next.order;
                              next.order = tempOrder;
                              updateTemplate({ ...template, sections: newSections });
                            }
                          }}
                          disabled={idx === template.sections.length - 1}
                          className="p-1 hover:text-primary disabled:opacity-0"
                        >
                          <MoveDown size={14} />
                        </button>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold uppercase tracking-widest text-foreground">{section.type}</p>
                        <p className="text-[9px] text-muted-foreground uppercase">Section ID: {section.id}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={section.isVisible} 
                          onChange={e => {
                            const newSections = template.sections.map(s => s.id === section.id ? { ...s, isVisible: e.target.checked } : s);
                            updateTemplate({ ...template, sections: newSections });
                          }}
                        />
                        <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6 md:p-8 border-0 shadow-xl rounded-[2rem] md:rounded-[2.5rem] bg-card space-y-6 transition-all duration-300">
              <h3 className="text-sm font-bold uppercase tracking-widest text-primary border-b border-border pb-4 mb-6">Contenu & Identité</h3>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Doyen de la Faculté</label>
                    <input className="w-full p-4 bg-muted border border-border rounded-2xl text-foreground outline-none focus:border-primary" value={template.deanName} onChange={e => updateTemplate({...template, deanName: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Année Académique</label>
                    <input className="w-full p-4 bg-muted border border-border rounded-2xl text-foreground outline-none focus:border-primary" value={template.academicYear} onChange={e => updateTemplate({...template, academicYear: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Préfixe Référence</label>
                    <input className="w-full p-4 bg-muted border border-border rounded-2xl text-foreground outline-none focus:border-primary" value={template.referencePrefix} onChange={e => updateTemplate({...template, referencePrefix: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Logo Institutionnel</label>
                    <label className="block border-2 border-dashed border-border p-2 rounded-2xl text-center cursor-pointer hover:bg-muted transition-all bg-card">
                      {template.logoUrl ? <img src={template.logoUrl} className="h-8 mx-auto object-contain" /> : <Upload className="mx-auto text-muted-foreground/30" />}
                      <input type="file" className="hidden" accept="image/*" onChange={handleLogoChange} />
                    </label>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Taille du Logo (mm)</label>
                    <div className="flex items-center gap-4">
                      <input 
                        type="range" 
                        min="5" 
                        max="40" 
                        step="1" 
                        className="flex-1 accent-primary" 
                        value={template.logoSize || 20} 
                        onChange={e => updateTemplate({...template, logoSize: Number(e.target.value)})} 
                      />
                      <span className="text-xs font-mono font-bold w-8 text-center">{template.logoSize || 20}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">En-tête Document</label>
                  <textarea 
                    className="w-full p-4 bg-muted border border-border rounded-2xl text-foreground outline-none focus:border-primary h-24 font-serif text-sm" 
                    placeholder="Ex: ROYAUME DU MAROC..."
                    value={template.header} 
                    onChange={e => updateTemplate({...template, header: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Pied de page</label>
                  <textarea 
                    className="w-full p-4 bg-muted border border-border rounded-2xl text-foreground outline-none focus:border-primary h-24 font-serif text-sm" 
                    placeholder="Ex: Faculté des Sciences et Techniques - Marrakech..."
                    value={template.footer} 
                    onChange={e => updateTemplate({...template, footer: e.target.value})} 
                  />
                </div>
              </div>
            </Card>

            <Card className="p-6 md:p-8 border-0 shadow-xl rounded-[2rem] md:rounded-[2.5rem] bg-card space-y-6 transition-all duration-300">
              <h3 className="text-sm font-bold uppercase tracking-widest text-primary border-b border-border pb-4 mb-6">Mise en page (A4)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Taille Police (pt)</label>
                  <input type="number" className="w-full p-3 bg-muted border border-border rounded-xl text-foreground outline-none" value={template.fontSize} onChange={e => updateTemplate({...template, fontSize: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Interligne</label>
                  <input type="number" step="0.1" className="w-full p-3 bg-muted border border-border rounded-xl text-foreground outline-none" value={template.lineHeight} onChange={e => updateTemplate({...template, lineHeight: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Alignement</label>
                  <select className="w-full p-3 bg-muted border border-border rounded-xl text-foreground outline-none" value={template.alignment} onChange={e => updateTemplate({...template, alignment: e.target.value as any})}>
                    <option value="left">Gauche</option>
                    <option value="center">Centre</option>
                    <option value="right">Droite</option>
                    <option value="justify">Justifié</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Marge H (mm)</label>
                  <input type="number" className="w-full p-3 bg-muted border border-border rounded-xl text-foreground outline-none" value={template.margins?.top ?? 20} onChange={e => updateTemplate({...template, margins: {...(template.margins || {top: 20, bottom:20, left:20, right:20}), top: Number(e.target.value)}})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Marge B (mm)</label>
                  <input type="number" className="w-full p-3 bg-muted border border-border rounded-xl text-foreground outline-none" value={template.margins?.bottom ?? 20} onChange={e => updateTemplate({...template, margins: {...(template.margins || {top: 20, bottom:20, left:20, right:20}), bottom: Number(e.target.value)}})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Marge G (mm)</label>
                  <input type="number" className="w-full p-3 bg-muted border border-border rounded-xl text-foreground outline-none" value={template.margins?.left ?? 20} onChange={e => updateTemplate({...template, margins: {...(template.margins || {top: 20, bottom:20, left:20, right:20}), left: Number(e.target.value)}})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Marge D (mm)</label>
                  <input type="number" className="w-full p-3 bg-muted border border-border rounded-xl text-foreground outline-none" value={template.margins?.right ?? 20} onChange={e => updateTemplate({...template, margins: {...(template.margins || {top: 20, bottom:20, left:20, right:20}), right: Number(e.target.value)}})} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-border">
                <div className="space-y-2">
                  <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Hauteur En-tête (mm)</label>
                  <input type="number" className="w-full p-3 bg-muted border border-border rounded-xl text-foreground outline-none" value={template.headerHeight} onChange={e => updateTemplate({...template, headerHeight: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Hauteur En-tête P2+ (mm)</label>
                  <input type="number" className="w-full p-3 bg-muted border border-border rounded-xl text-foreground outline-none" value={template.subHeaderHeight || 25} onChange={e => updateTemplate({...template, subHeaderHeight: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Hauteur Pied de page (mm)</label>
                  <input type="number" className="w-full p-3 bg-muted border border-border rounded-xl text-foreground outline-none" value={template.footerHeight} onChange={e => updateTemplate({...template, footerHeight: Number(e.target.value)})} />
                </div>
              </div>
            </Card>

            <Card className="p-6 md:p-8 border-0 shadow-xl rounded-[2rem] md:rounded-[2.5rem] bg-card space-y-6 transition-all duration-300">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Paramètres Personnalisés</h3>
                <button onClick={addCustomParam} className="p-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-all flex items-center gap-2 px-4">
                  <Plus size={18} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Ajouter</span>
                </button>
              </div>
              <div className="space-y-4">
                {template.customParams?.map((param) => (
                  <div key={param.id} className="p-4 bg-muted/50 rounded-2xl border border-border grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                    <div className="space-y-2">
                      <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Clé (ex: {'{mon_param}'})</label>
                      <input className="w-full p-2 bg-card border border-border rounded-lg text-xs outline-none focus:border-primary" value={param.key} onChange={e => updateCustomParam(param.id, { key: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Libellé / Description</label>
                      <input className="w-full p-2 bg-card border border-border rounded-lg text-xs outline-none focus:border-primary" value={param.label} onChange={e => updateCustomParam(param.id, { label: e.target.value })} />
                    </div>
                    <div className="flex gap-2">
                      <div className="space-y-2 flex-1">
                        <div className="flex justify-between items-center">
                          <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Valeur ou Mapping</label>
                          <select 
                            className="text-[8px] bg-primary/10 text-primary border-none rounded px-1 outline-none cursor-pointer"
                            onChange={(e) => {
                              if (e.target.value) {
                                updateCustomParam(param.id, { value: e.target.value });
                                e.target.value = "";
                              }
                            }}
                          >
                            <option key="map-none" value="">Mapper vers...</option>
                            <option key="map-addr" value="record.data.address">Adresse Entreprise</option>
                            <option key="map-city" value="record.data.city">Ville Entreprise</option>
                            <option key="map-zip" value="record.data.postalCode">Code Postal</option>
                            <option key="map-start" value="record.data.startDate">Date Début</option>
                            <option key="map-end" value="record.data.endDate">Date Fin</option>
                            <option key="map-dur" value="record.data.duration">Durée</option>
                            <option key="map-sub" value="record.data.subject">Sujet du Stage</option>
                          </select>
                        </div>
                        <input className="w-full p-2 bg-card border border-border rounded-lg text-xs outline-none focus:border-primary" value={param.value} onChange={e => updateCustomParam(param.id, { value: e.target.value })} placeholder="Texte libre ou record.data.champ" />
                      </div>
                      <button onClick={() => removeCustomParam(param.id)} className="p-2 text-destructive/30 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all mb-0.5">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {(!template.customParams || template.customParams.length === 0) && (
                  <div className="text-center py-8 border-2 border-dashed border-border rounded-2xl opacity-50">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Aucun paramètre personnalisé</p>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-6 md:p-8 border-0 shadow-xl rounded-[2rem] md:rounded-[3rem] bg-card space-y-6 transition-all duration-300">
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-4 gap-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Articles Réglementaires</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          setActiveArticleTab('pfa');
                          setExpandedArticles({});
                        }}
                        className={`text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full transition-all ${activeArticleTab === 'pfa' ? 'bg-faculty-orange text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                      >
                        PFA
                      </button>
                      <button 
                        onClick={() => {
                          setActiveArticleTab('pfe');
                          setExpandedArticles({});
                        }}
                        className={`text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full transition-all ${activeArticleTab === 'pfe' ? 'bg-faculty-blue text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                      >
                        PFE
                      </button>
                    </div>
                    <div className="flex gap-2 border-l border-border pl-4">
                      <button onClick={expandAll} className="text-[8px] font-bold uppercase tracking-tighter text-muted-foreground hover:text-primary transition-colors">Tout Déplier</button>
                      <button onClick={collapseAll} className="text-[8px] font-bold uppercase tracking-tighter text-muted-foreground hover:text-primary transition-colors">Tout Replier</button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mr-2">Total: {currentArticles.length}</p>
                  <button onClick={addArticle} className="p-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-all flex items-center gap-2 px-4">
                    <Plus size={18} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Ajouter</span>
                  </button>
                </div>
              </div>
              <div ref={articlesListRef} className="space-y-4 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar scroll-smooth">
                {currentArticles.map((art, idx) => {
                  const isExpanded = expandedArticles[idx] !== false && (expandedArticles[idx] === true || (currentArticles.length === 1));

                  return (
                    <motion.div 
                      layout
                      key={`${activeArticleTab}-${idx}`} 
                      className={`group relative flex flex-col bg-muted/30 rounded-[1.5rem] border transition-all ${isExpanded ? 'border-primary/30 ring-1 ring-primary/5' : 'border-border hover:border-border/80'}`}
                    >
                      <div 
                        onClick={() => toggleExpand(idx)}
                        className="flex items-center justify-between p-4 cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-4 overflow-hidden">
                          <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${activeArticleTab === 'pfa' ? 'bg-faculty-orange/10 text-faculty-orange' : 'bg-faculty-blue/10 text-faculty-blue'}`}>
                            {idx + 1}
                          </span>
                          <div className="flex flex-col truncate">
                            <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 leading-none mb-1">Article {idx + 1}</h4>
                            <p className="text-[10px] font-bold text-foreground truncate uppercase tracking-tight">
                              Article {idx + 1} : {art.title || "Sans titre"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-4">
                          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity mr-2">
                            <button 
                              onClick={(e) => { e.stopPropagation(); moveArticle(idx, 'up'); }} 
                              className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg disabled:opacity-0" 
                              disabled={idx === 0} 
                              title="Monter"
                            >
                              <MoveUp size={14} />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); moveArticle(idx, 'down'); }} 
                              className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg disabled:opacity-0" 
                              disabled={idx === currentArticles.length - 1} 
                              title="Descendre"
                            >
                              <MoveDown size={14} />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); confirmDeleteArticle(idx); }} 
                              className="p-1.5 text-destructive/40 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all" 
                              title="Supprimer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          {isExpanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                        </div>
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 space-y-4">
                              <div className="space-y-1">
                                <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest px-1">Titre de l'Article</label>
                                <div className="flex items-center gap-2">
                                  <span className="shrink-0 bg-muted px-3 py-2.5 rounded-xl border border-border text-[10px] font-black text-muted-foreground/50 border-dashed">
                                    Article {idx + 1} :
                                  </span>
                                  <input 
                                    className="flex-1 bg-card p-3 border border-border rounded-xl text-foreground outline-none focus:border-primary text-xs font-bold transition-colors" 
                                    value={art.title || ''} 
                                    onChange={e => updateArticle(idx, { title: e.target.value })} 
                                    placeholder="Libellé de l'article (ex: Objet de la convention)"
                                  />
                                </div>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest px-1">Contenu de l'Article</label>
                                <textarea 
                                  className="w-full bg-card p-4 border border-border rounded-xl text-foreground outline-none focus:border-primary text-[11px] leading-relaxed min-h-[160px] font-serif transition-colors" 
                                  value={art.content} 
                                  onChange={e => updateArticle(idx, { content: e.target.value })} 
                                  placeholder="Saisissez le contenu de l'article ici..."
                                />
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
                {currentArticles.length === 0 && (
                  <div className="text-center py-12 border-2 border-dashed border-border rounded-[2rem] opacity-50">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Aucun article défini pour {activeArticleTab.toUpperCase()}</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* PDF Preview Modal */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-8 animate-in fade-in duration-300">
          <div className="bg-background w-full max-w-5xl h-full rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-border">
            <div className="h-24 px-4 md:px-10 border-b border-border flex items-center justify-between bg-card/30 shrink-0 backdrop-blur-md">
              <div className="flex items-center gap-6">
                <Logo className="h-10 hidden sm:block" />
                <div className="w-px h-8 bg-border hidden sm:block" />
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-foreground leading-none mb-1">Aperçu Template</h3>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Convention {activeArticleTab.toUpperCase()}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 md:gap-4">
                <div className="hidden lg:flex items-center bg-secondary/50 rounded-2xl p-1 px-3 gap-3 mr-4">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => setZoom(prev => Math.max(0.2, prev - 0.05))}><ZoomOut size={16} /></Button>
                  <span className="text-[10px] font-black w-10 text-center">{Math.round(zoom * 100)}%</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => setZoom(prev => Math.min(1, prev + 0.05))}><ZoomIn size={16} /></Button>
                </div>
                <Button onClick={handleDownloadPreview} disabled={isDownloading} className="h-12 px-6 rounded-2xl flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20">
                  {isDownloading ? <Activity size={16} className="animate-spin" /> : <Download size={16} />}
                  <span className="hidden sm:inline">Exporter PDF</span>
                </Button>
                <div className="w-px h-8 bg-border mx-2" />
                <Button 
                  variant="ghost" 
                  onClick={() => setIsPreviewModalOpen(false)} 
                  className="w-12 h-12 p-0 rounded-2xl bg-red-50/50 text-red-500 hover:bg-red-100 hover:text-red-600 transition-all shadow-sm flex items-center justify-center shrink-0 border border-red-100"
                  aria-label="Fermer"
                >
                  <X size={24} strokeWidth={2.5} className="shrink-0" />
                </Button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-12 bg-secondary/20 custom-scrollbar">
              <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }} className="pdf-zoom-container transition-transform duration-300 h-fit mx-auto bg-white shadow-2xl">
                <ConventionPDFContent 
                  ref={previewRef} 
                  template={template} 
                  isPreview={true} 
                  record={{ data: { stageType: activeArticleTab === 'pfa' ? StageType.PFA : StageType.PFE } } as any}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <AlertModal 
        isOpen={alertConfig.isOpen}
        onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
        title={alertConfig.title}
        message={alertConfig.message}
      />

      {/* Article Deletion Confirmation */}
      {articleToDelete !== null && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-card w-full max-w-sm rounded-[2rem] shadow-2xl border border-destructive/20 p-8 space-y-6">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
              <Trash2 size={24} className="text-destructive" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Supprimer l'Article ?</h3>
              <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
                Êtes-vous sûr de vouloir supprimer l'Article {articleToDelete + 1} ? Cette action est irréversible.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setArticleToDelete(null)} 
                className="flex-1 rounded-xl h-12 uppercase text-[10px] font-bold tracking-widest border-border"
              >
                Annuler
              </Button>
              <Button 
                onClick={removeArticle} 
                className="flex-1 rounded-xl h-12 uppercase text-[10px] font-bold tracking-widest bg-destructive hover:bg-destructive/90 text-white shadow-lg shadow-destructive/20"
              >
                Supprimer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
