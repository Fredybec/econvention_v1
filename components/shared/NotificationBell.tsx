
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellRing, Check, X, Clock, Activity, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../../context/AppContext';
import { Role } from '../../types';
import { Card } from '../ui';

export const NotificationsModal: React.FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { notifications, currentUser, markAsRead, clearNotifications, activeRole } = useAppContext();
  const userNotifications = notifications.filter(n => {
    const isUserMatch = n.userId === currentUser?.id;
    const isRoleMatch = !n.role || n.role === activeRole || (activeRole === Role.SUPERADMIN);
    return isUserMatch && isRoleMatch;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleMarkAllAsRead = async () => {
    setIsMarkingAll(true);
    userNotifications.filter(n => !n.isRead).forEach(n => markAsRead(n.id));
    setTimeout(() => setIsMarkingAll(false), 500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-0 md:p-6 md:pt-20 h-[100dvh] overflow-hidden">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm md:bg-black/20" 
            onClick={onClose} 
          />
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-[85%] max-w-sm h-full md:max-w-md md:h-auto md:max-h-[600px] flex flex-col p-0 bg-card shadow-2xl md:rounded-[2.5rem] border-l md:border border-border overflow-hidden ml-auto"
          >
            <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30 shrink-0">
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight text-foreground">Notifications</h3>
                <p className="text-[9px] text-muted-foreground uppercase font-black tracking-[0.2em] mt-0.5">Mises à jour récentes</p>
              </div>
              <div className="flex items-center gap-3">
                {userNotifications.some(n => !n.isRead) && (
                  <button 
                    onClick={handleMarkAllAsRead} 
                    disabled={isMarkingAll}
                    className="text-[9px] uppercase font-black tracking-widest text-primary hover:underline flex items-center gap-1 disabled:opacity-50"
                  >
                    {isMarkingAll ? '...' : <><Check size={12} /> Tout lire</>}
                  </button>
                )}
                <button 
                  onClick={onClose} 
                  className="p-3 bg-red-50 text-red-500 rounded-2xl transition-all hover:bg-red-100 hover:text-red-600 border border-red-100 shadow-sm flex items-center justify-center shrink-0"
                  aria-label="Fermer"
                >
                  <X size={24} strokeWidth={2.5} className="shrink-0" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
              {userNotifications.length === 0 ? (
                <div className="py-24 text-center space-y-4">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto text-muted-foreground/20">
                    <Bell size={32} />
                  </div>
                  <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest italic">Aucune notification</p>
                </div>
              ) : (
                userNotifications.map(notif => (
                  <div 
                    key={notif.id} 
                    onClick={() => {
                      markAsRead(notif.id);
                      if (notif.redirectUrl) {
                        navigate(notif.redirectUrl);
                        onClose();
                        return;
                      }
                      
                      if (notif.recordId) {
                        // Special redirection logic based on user role and notification
                        if (activeRole === Role.ENCADRANT_FST) {
                          navigate(`/edit-request/${notif.recordId}`);
                        } else if (activeRole === Role.SECRETARIAT_DOYEN || activeRole === Role.VICE_DOYEN_PEDAGOGIE || activeRole === Role.VICE_DOYEN_RECHERCHE) {
                          navigate(`/bulk-processing`);
                        } else {
                          // Default: Mode Revue for record (if not student)
                          if (activeRole === Role.STUDENT) {
                            navigate(`/request/${notif.recordId}`);
                          } else {
                            navigate(`/request/${notif.recordId}?mode=review`);
                          }
                        }
                        onClose();
                      }
                    }}
                    className={`p-5 rounded-3xl border transition-all cursor-pointer group relative overflow-hidden ${notif.isRead ? 'bg-card border-border opacity-60' : 'bg-primary/5 border-primary/20 shadow-lg hover:shadow-xl active:scale-[0.98]'}`}
                  >
                    {!notif.isRead && <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />}
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          {!notif.isRead && <div className="w-2 h-2 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary),0.6)]" />}
                          <h4 className="text-xs font-black text-foreground uppercase tracking-tight">{notif.title}</h4>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed font-medium">{notif.message}</p>
                        <div className="flex items-center gap-2 pt-2">
                          <Clock size={12} className="text-muted-foreground/60" />
                          <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">
                            {new Date(notif.createdAt).toLocaleString('fr-FR')}
                          </p>
                        </div>
                      </div>
                      <div className={`p-3 rounded-2xl shrink-0 ${notif.type === 'status_change' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        {notif.type === 'status_change' ? <Activity size={16} /> : <Info size={16} />}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {userNotifications.length > 0 && (
              <div className="p-6 border-t border-border bg-muted/20 text-center shrink-0">
                <button onClick={clearNotifications} className="text-[9px] uppercase font-black text-destructive hover:underline tracking-[0.3em]">Effacer tout l'historique</button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export const NotificationBell = () => {
  const { notifications, currentUser, activeRole } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter(n => {
    const isUserMatch = n.userId === currentUser?.id;
    const isRoleMatch = !n.role || n.role === activeRole || (activeRole === Role.SUPERADMIN);
    return isUserMatch && !n.isRead && isRoleMatch;
  }).length;

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="relative p-2.5 bg-muted text-muted-foreground rounded-xl transition-all shadow-inner hover:scale-105 active:scale-95"
      >
        {unreadCount > 0 ? <BellRing size={18} className="text-primary animate-bounce" /> : <Bell size={18} />}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-card animate-in zoom-in duration-300">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      <NotificationsModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};
