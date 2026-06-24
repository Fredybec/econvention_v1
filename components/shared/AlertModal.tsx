
import React from 'react';
import { AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

export const AlertModal: React.FC<{ 
  isOpen: boolean, 
  onClose: () => void, 
  title: string, 
  message: string 
}> = ({ isOpen, onClose, title, message }) => {
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
            className="relative max-w-md w-full"
          >
            <Card className="p-8 md:p-10 bg-card/50 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] rounded-[2.5rem] border-white/20 overflow-hidden backdrop-blur-2xl">
              <button 
                onClick={onClose} 
                className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center bg-secondary/50 text-muted-foreground hover:text-foreground rounded-2xl transition-all"
                aria-label="Fermer"
              >
                <X size={20} />
              </button>
              
              <div className="text-left space-y-6">
                <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center">
                  <AlertCircle size={24} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black uppercase tracking-tight text-foreground leading-tight">{title}</h3>
                  <p className="text-sm text-muted-foreground font-medium leading-relaxed">{message}</p>
                </div>
              </div>
              
              <div className="pt-8">
                <Button 
                  onClick={onClose} 
                  className="w-full py-6 rounded-2xl bg-foreground text-background hover:bg-foreground/90 uppercase text-[10px] font-black tracking-[0.25em] transition-all active:scale-95"
                >
                  Compris
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
