import React from 'react';

export const Card: React.FC<{ 
  children: React.ReactNode; 
  className?: string; 
  onClick?: () => void;
  variant?: 'default' | 'glass' | 'outline';
}> = ({ 
  children, 
  className = '', 
  onClick,
  variant = 'default'
}) => {
  const variants = {
    default: 'bg-card border-border shadow-xl shadow-slate-200/50',
    glass: 'glass-card',
    outline: 'bg-transparent border-2 border-border shadow-none hover:border-primary/30'
  };

  return (
    <div 
      className={`
        rounded-[2rem] md:rounded-[2.5rem] border 
        p-6 md:p-10 
        transition-all duration-500 
        ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''}
        ${variants[variant]}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
};
