
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, QrCode, Search, BarChart3, LifeBuoy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../../context/AppContext';
import { Role } from '../../types';

export const QuickActionFAB = () => {
  const { currentUser } = useAppContext();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  if (!currentUser) return null;

  const actions = [
    ...(currentUser.roles?.includes(Role.STUDENT) 
      ? [
          { icon: <Plus size={20} />, label: 'Nouvelle Demande', onClick: () => navigate('/new-request'), color: 'bg-blue-600' },
          { icon: <FileText size={20} />, label: 'Mes Dossiers', onClick: () => navigate('/conventions'), color: 'bg-indigo-600' },
          { icon: <LifeBuoy size={20} />, label: 'Support', onClick: () => navigate('/support'), color: 'bg-muted-foreground' },
        ]
      : [
          { icon: <Search size={20} />, label: 'Recherche ID', onClick: () => navigate('/dashboard'), color: 'bg-indigo-600' },
          { icon: <LifeBuoy size={20} />, label: 'Support', onClick: () => navigate('/support-questions'), color: 'bg-muted-foreground' },
          { icon: <BarChart3 size={20} />, label: 'Analytics', onClick: () => navigate('/analytics'), color: 'bg-emerald-600' }
        ]
    ),
    ...(currentUser.roles?.includes(Role.SUPERADMIN)
      ? [{ icon: <QrCode size={20} />, label: 'Vérifier', onClick: () => navigate('/verify'), color: 'bg-emerald-600' }]
      : []
    )
  ];

  return (
    <div className="fixed bottom-8 right-8 z-[500] flex flex-col items-end gap-4">
      <AnimatePresence>
        {isOpen && (
          <div className="flex flex-col items-end gap-3 mb-2">
            {actions.map((action, idx) => (
              <motion.button
                key={idx}
                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.5, y: 20 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => { action.onClick(); setIsOpen(false); }}
                className={`flex items-center gap-3 px-4 py-3 ${action.color} text-white rounded-2xl shadow-xl hover:scale-105 transition-transform group`}
              >
                <span className="text-[10px] uppercase font-bold tracking-widest opacity-100 transition-opacity whitespace-nowrap">{action.label}</span>
                {action.icon}
              </motion.button>
            ))}
          </div>
        )}
      </AnimatePresence>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 md:w-16 md:h-16 rounded-[1.75rem] md:rounded-[2rem] shadow-2xl flex items-center justify-center transition-all duration-500 ${isOpen ? 'bg-secondary text-secondary-foreground rotate-45' : 'bg-primary text-white hover:scale-110'}`}
      >
        <Plus size={isOpen ? 28 : 32} className="transition-all" />
      </button>
    </div>
  );
};
