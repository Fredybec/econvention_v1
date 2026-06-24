
import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { QrCode, Upload, Activity, Verified, AlertTriangle, SearchCode, X } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';
import jsQR from 'jsqr';
import * as pdfjs from 'pdfjs-dist';
import { useAppContext } from '../../context/AppContext';
import { PFERecord, WorkflowStatus } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { AlertModal } from '../../components/shared/AlertModal';

// Set worker for pdfjs using unpkg for version 5.x (requires .mjs)
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export const VerificationView = () => {
  const { records } = useAppContext();
  const { id: urlId } = useParams<{ id?: string }>();
  const [ref, setRef] = useState(urlId || '');
  const [result, setResult] = useState<PFERecord | null>(null);
  const [searched, setSearched] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean, title: string, message: string }>({
    isOpen: false,
    title: '',
    message: ''
  });

  const showAlert = (title: string, message: string) => {
    setAlertConfig({ isOpen: true, title, message });
  };

  const handleVerify = () => { 
    if (!ref) return; 
    const found = records.find(r => r.id.toLowerCase() === ref.toLowerCase()); 
    setResult(found || null); 
    setSearched(true); 
  };

  const handleVerifyWithId = (id: string) => {
    const found = records.find(r => r.id.toLowerCase() === id.toLowerCase());
    setResult(found || null);
    setSearched(true);
  };

  const processDecodedText = (decodedText: string) => {
    const parts = decodedText.split('/');
    const id = parts[parts.length - 1];
    if (id) {
      setRef(id);
      handleVerifyWithId(id);
      return true;
    }
    return false;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);

    try {
      let imageData: ImageData | null = null;

      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (context) {
          await page.render({ canvasContext: context, viewport, canvas }).promise;
          imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        }
      } else {
        // Handle images
        const img = new Image();
        img.src = URL.createObjectURL(file);
        await new Promise((resolve) => (img.onload = resolve));
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        if (context) {
          context.drawImage(img, 0, 0);
          imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        }
        URL.revokeObjectURL(img.src);
      }

      if (imageData) {
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code && processDecodedText(code.data)) {
          // Success
        } else {
          showAlert("Scan QR", "Code QR non reconnu dans le fichier.");
        }
      }
    } catch (err) {
      console.error(err);
      showAlert("Scan QR", "Impossible de lire le code QR dans ce fichier. Assurez-vous qu'il est bien visible.");
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => { 
    if (urlId) handleVerify(); 
  }, [urlId]);

  useEffect(() => {
    // No longer need manual scanner management
  }, [isScanning]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center pt-6 pb-48 md:pb-56 px-6 text-left transition-colors duration-300">
      <div className="w-full max-w-xl space-y-8 animate-in fade-in duration-700">
        <Card className="p-10 border-0 shadow-2xl rounded-[3rem] bg-card border-border space-y-8">
           <h2 className="text-3xl text-foreground tracking-tighter uppercase font-medium text-center">Vérifier Authenticité</h2>
           
           <div className="flex flex-col gap-6">
              <div className="flex gap-4">
                <input type="text" placeholder="REF: FST-24-XXXX" className="w-full px-6 py-4 bg-secondary border border-border rounded-2xl text-sm font-mono uppercase focus:border-primary outline-none text-foreground transition-all" value={ref} onChange={e => setRef(e.target.value)} />
                <Button onClick={handleVerify} className="px-8 rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-lg flex items-center gap-2">
                  <SearchCode size={16} />
                  Vérifier
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border"></span></div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest"><span className="bg-card px-4 text-muted-foreground">Ou utiliser un scan</span></div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {!isScanning ? (
                  <Button onClick={() => setIsScanning(true)} variant="outline" className="py-6 rounded-2xl flex flex-col items-center justify-center gap-2 uppercase text-[9px] font-bold tracking-widest border-2 border-border hover:border-primary transition-all">
                    <QrCode size={24} /> Caméra
                  </Button>
                ) : (
                  <Button onClick={() => setIsScanning(false)} variant="danger" className="py-6 rounded-2xl uppercase text-[9px] font-bold tracking-widest">
                    Annuler Caméra
                  </Button>
                )}

                <Button 
                  onClick={() => fileInputRef.current?.click()} 
                  variant="outline" 
                  disabled={isProcessingFile}
                  className="py-6 rounded-2xl flex flex-col items-center justify-center gap-2 uppercase text-[9px] font-bold tracking-widest border-2 border-border hover:border-primary transition-all"
                >
                  {isProcessingFile ? <Activity className="animate-spin" size={24} /> : <Upload size={24} />}
                  {isProcessingFile ? 'Analyse...' : 'Fichier (PDF/IMG)'}
                </Button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*,application/pdf" 
                  onChange={handleFileUpload} 
                />
              </div>

              {isScanning && (
                <div className="space-y-4 animate-in slide-in-from-top-2 duration-500 relative min-h-[300px] bg-black rounded-2xl overflow-hidden border-2 border-primary">
                  <Scanner
                    onScan={(detectedCodes) => {
                      if (detectedCodes.length > 0) {
                        const decodedText = detectedCodes[0].rawValue;
                        if (processDecodedText(decodedText)) {
                          setIsScanning(false);
                        }
                      }
                    }}
                    onError={(error) => {
                      console.error("Scanner Error:", error);
                    }}
                    styles={{
                      container: {
                        width: '100%',
                        height: '100%',
                        minHeight: '300px'
                      }
                    }}
                    components={{
                      torch: true,
                    }}
                    allowMultiple={false}
                    scanDelay={500}
                  />
                  <button 
                    onClick={() => setIsScanning(false)}
                    className="absolute top-4 right-4 z-10 p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-full transition-colors flex items-center justify-center shrink-0"
                    aria-label="Fermer"
                  >
                    <X size={24} strokeWidth={2.5} className="shrink-0" />
                  </button>
                </div>
              )}

              {/* Hidden element for file scanning */}
              <div className="hidden"></div>
           </div>

           {searched && result && (
             <div className="p-8 bg-green-50 rounded-[2rem] border border-green-100 animate-in zoom-in-95 duration-500 space-y-6">
                <div className="flex items-center gap-3 text-green-700 border-b border-green-100 pb-4">
                  <Verified size={24} />
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-tight">Authenticité Confirmée</h4>
                    <p className="text-[10px] opacity-70 uppercase tracking-widest font-mono">{result.id}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-[11px] uppercase">
                   <div className="space-y-1">
                     <p className="text-muted-foreground font-bold tracking-widest">Étudiant(e)</p>
                     <p className="text-foreground font-medium text-sm">{result.studentName}</p>
                     <p className="text-muted-foreground lowercase">{result.data.filiere} • {result.data.massarCode}</p>
                   </div>
                   
                   <div className="space-y-1">
                     <p className="text-muted-foreground font-bold tracking-widest">Organisme</p>
                     <p className="text-foreground font-medium text-sm">{result.data.companyName}</p>
                     <p className="text-muted-foreground lowercase">{result.data.academicYear}</p>
                   </div>

                   <div className="space-y-1 pt-2 border-t border-green-100">
                     <p className="text-muted-foreground font-bold tracking-widest">Encadrant FST</p>
                     <p className="text-foreground font-medium">{result.data.fstTutorName}</p>
                     <p className="text-muted-foreground lowercase">{result.data.fstTutorTitle}</p>
                   </div>

                   <div className="space-y-1 pt-2 border-t border-green-100">
                     <p className="text-muted-foreground font-bold tracking-widest">Maître de Stage</p>
                     <p className="text-foreground font-medium">{result.data.tutorName}</p>
                     <p className="text-muted-foreground lowercase">{result.data.tutorTitle}</p>
                   </div>

                   <div className="md:col-span-2 space-y-1 pt-2 border-t border-green-100">
                     <p className="text-muted-foreground font-bold tracking-widest">Sujet du Stage</p>
                     <p className="text-foreground font-medium italic leading-relaxed">{result.data.subject}</p>
                   </div>

                   <div className="space-y-1">
                     <p className="text-muted-foreground font-bold tracking-widest">Période</p>
                     <p className="text-foreground font-medium">Du {new Date(result.data.startDate).toLocaleDateString()} au {new Date(result.data.endDate).toLocaleDateString()}</p>
                   </div>

                   <div className="space-y-1">
                     <p className="text-muted-foreground font-bold tracking-widest">État du Document</p>
                     <Badge variant={result.status === WorkflowStatus.COMPLETED ? 'success' : 'info'} className="text-[10px] py-1 px-3 shadow-sm">
                       {result.status}
                     </Badge>
                   </div>
                </div>
                
                <div className="pt-4 flex justify-center">
                  <div className="text-[9px] text-muted-foreground uppercase tracking-[0.2em] text-center border-t border-border pt-4 w-full">
                    Document certifié par le système e-Convention FSTG
                  </div>
                </div>
             </div>
           )}
           {searched && !result && (
             <div className="p-8 bg-red-50 rounded-[2rem] border border-red-100 animate-in zoom-in-95 duration-500 text-center space-y-2"><AlertTriangle className="mx-auto text-red-600" /><h4 className="text-sm font-bold text-red-700 uppercase tracking-tight">Document Inconnu</h4></div>
           )}
        </Card>
      </div>
      <AlertModal 
        isOpen={alertConfig.isOpen}
        onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
        title={alertConfig.title}
        message={alertConfig.message}
      />
    </div>
  );
};
