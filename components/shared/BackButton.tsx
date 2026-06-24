import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';

interface BackButtonProps {
  to?: string;
  label?: string;
  className?: string;
}

export const BackButton: React.FC<BackButtonProps> = ({ to, label = "Retour", className = "" }) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };

  return (
    <Button 
      variant="ghost" 
      onClick={handleBack}
      className={`group flex items-center gap-2 px-3 py-2 -ml-3 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-all ${className}`}
    >
      <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-secondary/30 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
        <ChevronLeft size={18} />
      </div>
      <span className="text-[10px] uppercase font-black tracking-widest">{label}</span>
    </Button>
  );
};
