
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Building2, QrCode, ArrowRight, ShieldCheck, Globe, Zap } from 'lucide-react';
import { Logo } from '../../components/ui/Logo';
import { Button } from '../../components/ui/Button';
import { motion } from 'motion/react';

export const PortalView = () => {
  const navigate = useNavigate();
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-background p-4 md:p-6 relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-400/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
      
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-7xl flex flex-col items-center gap-12 md:gap-16 z-10 py-12"
      >
        {/* Header Section */}
        <motion.div variants={itemVariants} className="text-center space-y-6 max-w-4xl">
          <Logo className="h-16 md:h-24 mx-auto mb-6 drop-shadow-xl" />
          <div className="space-y-2">
            <h1 className="text-3xl md:text-5xl lg:text-6xl leading-tight tracking-tighter font-extrabold uppercase">
              PORTAIL <span className="text-gradient">E-CONVENTION</span>
            </h1>
            <p className="text-[10px] md:text-xs text-primary font-bold uppercase tracking-[0.3em]">Faculté des Sciences et Techniques Marrakech</p>
          </div>
        </motion.div>

        {/* Action Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8 w-full max-w-4xl px-4">
          <PortalCard 
            icon={<GraduationCap size={28} />}
            title="Espace Étudiant"
            description="Soumettez vos demandes de stage, suivez l'état de validation et téléchargez vos conventions signées."
            label="Accès Institutionnel"
            onClick={() => navigate('/login/student')}
            variant="primary"
          />
          <PortalCard 
            icon={<Building2 size={28} />}
            title="Administration"
            description="Gérez les flux de validation, éditez les templates et supervisez l'ensemble du processus de stage."
            label="Staff & Validateurs"
            onClick={() => navigate('/login/admin')}
            variant="black"
          />
        </motion.div>

        {/* Information Section */}
        <motion.div variants={itemVariants} className="w-full max-w-4xl px-4">
          <div className="bg-card border border-border p-8 md:p-10 rounded-[2.5rem] shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <div className="w-2 h-2 bg-primary rounded-full" />
              <h3 className="text-sm font-bold uppercase tracking-widest">À propos de la plateforme</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase text-primary">Objectif</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Cette plateforme centralise et dématérialise la gestion des conventions de stage PFE pour les étudiants de la FST Marrakech, assurant un suivi rigoureux et une validation rapide.
                </p>
              </div>
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase text-primary">Sécurité</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  L'accès est strictement réservé aux membres de l'UCA via l'authentification Google Workspace institutionnelle, garantissant la confidentialité de vos données.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Footer */}
      <footer className="mt-auto py-8 w-full border-t border-border/50 bg-background/50 backdrop-blur-sm z-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            © {new Date().getFullYear()} FST MARRAKECH • Université Cadi Ayyad
          </p>
          <div className="flex items-center gap-6">
            <span className="text-[9px] font-bold uppercase tracking-widest text-primary">Support: support.pfe@uca.ac.ma</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

const PortalCard = ({ icon, title, description, label, onClick, variant = 'primary', className = '' }: any) => {
  const bgStyles = {
    primary: 'bg-primary text-primary-foreground',
    black: 'bg-slate-900 text-white',
    outline: 'bg-card text-foreground'
  };

  return (
    <motion.button 
      whileHover={{ y: -5, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={`group relative flex flex-col items-center p-8 md:p-10 rounded-[2.5rem] shadow-sm transition-all border border-border hover:border-primary/30 text-center space-y-6 overflow-hidden bg-card ${className}`}
    >
      <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center shadow-md group-hover:rotate-3 transition-transform duration-500 ${bgStyles[variant as keyof typeof bgStyles]}`}>
        {icon}
      </div>
      <div className="space-y-3">
        <h3 className="text-xl md:text-2xl tracking-tight font-bold uppercase">{title}</h3>
        <p className="text-muted-foreground text-xs leading-relaxed max-w-[240px] mx-auto">
          {description}
        </p>
        <div className="flex items-center justify-center gap-2 text-primary font-bold uppercase tracking-[0.2em] text-[9px] pt-2">
          {label}
          <ArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </motion.button>
  );
};
