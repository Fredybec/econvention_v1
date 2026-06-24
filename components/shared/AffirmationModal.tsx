
import React from 'react';
import { ShieldAlert, X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

export const AffirmationModal: React.FC<{ isOpen: boolean, onClose: () => void, onConfirm: () => void, companyName: string }> = ({ isOpen, onClose, onConfirm, companyName }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 sm:p-12">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/60 backdrop-blur-xl" 
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative max-w-lg w-full"
          >
            <Card className="relative p-8 md:p-12 bg-card/50 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] rounded-[4rem] border-white/20 overflow-hidden backdrop-blur-2xl">
              <button 
                onClick={onClose} 
                className="absolute top-8 right-8 w-12 h-12 flex items-center justify-center bg-secondary/50 text-muted-foreground hover:text-foreground rounded-2xl transition-all"
                aria-label="Fermer"
              >
                <X size={24} />
              </button>
              
              <div className="space-y-8">
                <div className="w-20 h-20 bg-destructive/10 text-destructive rounded-[2rem] flex items-center justify-center shadow-inner">
                  <ShieldAlert size={40} />
                </div>
                
                <div className="text-left space-y-4">
                  <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-foreground leading-tight">Vérification Cruciale</h3>
                  <p className="text-base text-muted-foreground font-medium leading-relaxed">
                    Certifiez-vous sur l'honneur que l'entité <span className="text-primary font-black uppercase underline decoration-2 underline-offset-4">{companyName}</span> est un organisme d'accueil légitime vous ayant officiellement proposé ce stage ?
                  </p>
                  <p className="text-[10px] text-destructive/60 uppercase font-black tracking-widest bg-destructive/5 p-4 rounded-2xl border border-destructive/10">
                    Toute fausse déclaration peut entraîner des sanctions disciplinaires et l'annulation immédiate de votre convention.
                  </p>
                </div>

                <div className="flex flex-col gap-3 pt-4">
                  <Button 
                    onClick={onConfirm} 
                    className="w-full py-6 rounded-2xl bg-foreground text-background hover:bg-foreground/90 uppercase text-[10px] font-black tracking-[0.25em] shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    Certifier & Valider <ChevronRight size={14} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={onClose} 
                    className="w-full py-4 rounded-xl uppercase text-[9px] font-black tracking-widest text-muted-foreground hover:text-foreground transition-all"
                  >
                    Retour
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
