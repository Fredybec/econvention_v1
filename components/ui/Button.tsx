import React from 'react';
import { Loader2 } from 'lucide-react';

export const Button: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' | 'glass';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  className?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
  loading?: boolean;
}> = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  type = 'button', 
  disabled = false,
  loading = false
}) => {
  const variants = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 active:shadow-none',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm',
    danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg shadow-destructive/20',
    outline: 'bg-transparent border border-border text-foreground hover:bg-secondary',
    ghost: 'bg-transparent hover:bg-secondary text-muted-foreground hover:text-foreground border-0 shadow-none',
    glass: 'glass hover:bg-white/50 text-foreground border-white/20'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-lg',
    md: 'px-5 py-2.5 text-sm rounded-xl',
    lg: 'px-8 py-3.5 text-base rounded-2xl',
    icon: 'p-2.5 rounded-xl'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2
        font-semibold tracking-tight
        transition-all duration-300 
        disabled:opacity-50 disabled:cursor-not-allowed 
        active:scale-[0.97]
        ${variants[variant]} 
        ${sizes[size]} 
        ${className}
      `}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
};
