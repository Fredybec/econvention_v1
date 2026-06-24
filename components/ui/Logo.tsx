
import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';

export const Logo: React.FC<{ className?: string, url?: string }> = ({ className = "h-14", url }) => {
  const { template } = useAppContext();
  const [error, setError] = useState(false);
  const logoUrl = url || template?.logoUrl || "https://fstg.uca.ma/fst/wp-content/uploads/2018/11/logo_uca-1-e1541427506990.png";
  
  if (error) return (
    <div className={`${className} flex items-center gap-2 text-blue-700 font-medium`}>
      <span className="text-xs uppercase tracking-tight font-medium">FST Marrakech</span>
    </div>
  );
  
  return (
    <div className={`${className?.includes('mx-auto') ? 'mx-auto' : ''} inline-flex items-center justify-center transition-all duration-300 hover:scale-105`}>
      <img 
        src={logoUrl} 
        alt="FSTG" 
        className={`${className?.replace('mx-auto', '')} object-contain`} 
        onError={() => setError(true)} 
      />
    </div>
  );
};
