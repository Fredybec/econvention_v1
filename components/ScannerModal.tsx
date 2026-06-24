import React from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { X, Camera } from 'lucide-react';
import { Button } from './ui/Button';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (decodedText: string) => void;
}

export const ScannerModal: React.FC<ScannerModalProps> = ({ isOpen, onClose, onScan }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-card w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl border border-border animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center">
              <Camera size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Scanner QR Code</h3>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Confirmer le retrait du dossier</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-red-50 text-red-500 hover:text-red-600 rounded-full transition-all flex items-center justify-center shrink-0"
            aria-label="Fermer"
          >
            <X size={24} strokeWidth={2.5} className="shrink-0" />
          </button>
        </div>
        
        <div className="p-8">
          <div className="overflow-hidden rounded-2xl border-2 border-dashed border-border bg-muted/30 min-h-[300px] relative">
            <Scanner
              onScan={(detectedCodes) => {
                if (detectedCodes.length > 0) {
                  onScan(detectedCodes[0].rawValue);
                  onClose();
                }
              }}
              onError={(error) => {
                console.error("Scanner Error:", error);
              }}
              styles={{
                container: {
                  width: '100%',
                  height: '100%',
                }
              }}
              components={{
                torch: true,
              }}
              allowMultiple={false}
              scanDelay={500}
            />
          </div>
          
          <div className="mt-8 text-center space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Placez le QR code de la convention devant la caméra.</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Le statut sera automatiquement mis à jour sur "Terminé"</p>
          </div>
        </div>
        
        <div className="p-6 bg-muted/30 border-t border-border flex justify-center">
          <Button variant="outline" onClick={onClose} className="rounded-full px-8 uppercase text-[10px] tracking-widest font-bold">Annuler</Button>
        </div>
      </div>
    </div>
  );
};
