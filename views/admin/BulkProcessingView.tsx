
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BulkProcessingPanel } from '../../components/admin/BulkProcessingPanel';
import { QRReceptionScanner } from '../../components/admin/QRReceptionScanner';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { BackButton } from '../../components/shared/BackButton';
import { QrCode, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { Role } from '../../types';

const BulkProcessingView = () => {
  return (
    <div className="min-h-screen bg-background p-6 md:p-12 pb-48 md:pb-56 space-y-12 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 max-w-7xl mx-auto"
      >
        <div className="space-y-4">
          <BackButton to="/dashboard" />
          <div className="space-y-1">
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase text-slate-950">
              Operations <span className="text-primary italic">Massives</span>
            </h1>
            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.3em]">Gestion académique groupée des dossiers</p>
          </div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="shadow-2xl rounded-[3.5rem]"
        >
          <BulkProcessingPanel />
        </motion.div>
      </div>
    </div>
  );
};

export default BulkProcessingView;
