
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { X, ChevronRight } from 'lucide-react';

export const ConfirmModal: React.FC<{ 
  isOpen: boolean, 
  onClose: () => void, 
  onConfirm: () => void, 
  title: string, 
  message: string,
  confirmText?: string,
  variant?: 'primary' | 'danger' | 'success',
  children?: React.ReactNode
}> = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirmer", variant = 'primary', children }) => {
  const buttonVariants = {
    primary: 'primary',
    danger: 'danger',
    success: 'primary'
  } as const;
  
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
            <Card className="relative p-8 md:p-10 bg-card/50 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] rounded-[3rem] border-white/20 flex flex-col max-h-[90vh] overflow-hidden backdrop-blur-2xl">
              <button 
                onClick={onClose} 
                className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center bg-secondary/50 text-muted-foreground hover:text-foreground rounded-2xl transition-all"
                aria-label="Fermer"
              >
                <X size={20} />
              </button>
              
              <div className="text-left space-y-6 pr-8">
                <div className="space-y-2">
                  <h3 className="text-2xl font-black uppercase tracking-tight text-foreground leading-tight">{title}</h3>
                  <p className="text-sm text-muted-foreground font-medium leading-relaxed">{message}</p>
                </div>
              </div>
              
              {children && (
                <div className="flex-1 overflow-y-auto custom-scrollbar my-6 py-2 border-y border-border/40">
                  {children}
                </div>
              )}

              <div className="flex flex-col gap-3 pt-6 shrink-0">
                <Button 
                  variant={buttonVariants[variant]} 
                  onClick={onConfirm} 
                  className="w-full py-6 rounded-2xl uppercase text-[10px] font-black tracking-[0.25em] shadow-lg shadow-primary/10 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  {confirmText} <ChevronRight size={14} />
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={onClose} 
                  className="w-full py-3 rounded-xl uppercase text-[9px] font-black tracking-widest text-muted-foreground hover:text-foreground transition-all"
                >
                  Annuler
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
