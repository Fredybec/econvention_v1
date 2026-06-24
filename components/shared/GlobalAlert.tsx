
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle, Info, X, AlertTriangle } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

export const GlobalAlert = () => {
  const { globalAlert, setGlobalAlert } = useAppContext();

  React.useEffect(() => {
    if (globalAlert.isOpen) {
      const timer = setTimeout(() => {
        setGlobalAlert(prev => ({ ...prev, isOpen: false }));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [globalAlert.isOpen, setGlobalAlert]);

  const icons = {
    info: <Info className="text-blue-500" size={20} />,
    success: <CheckCircle className="text-green-500" size={20} />,
    warning: <AlertTriangle className="text-orange-500" size={20} />,
    error: <AlertCircle className="text-red-500" size={20} />,
  };

  const bgColors = {
    info: 'bg-blue-500/10 border-blue-500/20',
    success: 'bg-green-500/10 border-green-500/20',
    warning: 'bg-orange-500/10 border-orange-500/20',
    error: 'bg-red-500/10 border-red-500/20',
  };

  return (
    <div className="fixed top-[88px] right-6 z-[9999] flex flex-col items-end pointer-events-none">
      <AnimatePresence>
        {globalAlert.isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95, filter: 'blur(10px)' }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1, 
              filter: 'blur(0px)',
              x: globalAlert.isPriority ? [0, -10, 10, -10, 10, 0] : 0
            }}
            exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)', transition: { duration: 0.2 } }}
            transition={{ 
              type: "spring", 
              stiffness: 400, 
              damping: 30,
              x: { duration: 0.5, ease: "easeInOut" }
            }}
            className={`pointer-events-auto w-full max-w-sm overflow-hidden rounded-[2.5rem] border-2 shadow-[0_25px_60px_rgba(0,0,0,0.3)] bg-card/95 backdrop-blur-2xl ${bgColors[globalAlert.variant as keyof typeof bgColors] || bgColors.info} ring-4 ring-background/30 p-1`}
          >
            <div className={`p-4 rounded-[2.3rem] flex flex-col gap-3 relative overflow-hidden bg-background/40`}>
              {globalAlert.isPriority && (
                <motion.div 
                  animate={{ opacity: [0.1, 0.3, 0.1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute inset-0 bg-primary/10 pointer-events-none"
                />
              )}
              
              <div className="flex items-start justify-between gap-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl bg-card shadow-lg border-b-2 flex items-center justify-center ${bgColors[globalAlert.variant as keyof typeof bgColors] || bgColors.info}`}>
                    {icons[globalAlert.variant as keyof typeof icons] || icons.info}
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-foreground/90">
                      {globalAlert.title}
                    </h3>
                    <div className={`h-0.5 w-6 rounded-full ${globalAlert.variant === 'error' ? 'bg-red-500' : 'bg-primary'} opacity-50`} />
                  </div>
                </div>
                <button 
                  onClick={() => setGlobalAlert(prev => ({ ...prev, isOpen: false }))}
                  className="w-10 h-10 rounded-2xl bg-secondary/50 flex items-center justify-center hover:bg-muted transition-all active:scale-95 group"
                  aria-label="Fermer"
                >
                  <X size={18} className="text-muted-foreground group-hover:rotate-90 transition-transform" />
                </button>
              </div>
              
              <p className="text-[11px] text-foreground font-bold leading-relaxed px-1">
                {globalAlert.message}
              </p>

              <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/20">
                <motion.div 
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 5, ease: "linear" }}
                  className={`h-full ${globalAlert.variant === 'error' ? 'bg-red-500' : 'bg-primary'}`}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
