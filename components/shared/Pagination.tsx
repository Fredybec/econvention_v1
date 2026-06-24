
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({ 
  currentPage, 
  totalPages, 
  onPageChange,
  className = ""
}) => {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  
  // Logic to show a limited number of page buttons with ellipsis
  const getVisiblePages = () => {
    if (totalPages <= 7) return pages;
    
    if (currentPage <= 4) {
      return [...pages.slice(0, 5), '...', totalPages];
    }
    
    if (currentPage >= totalPages - 3) {
      return [1, '...', ...pages.slice(totalPages - 5)];
    }
    
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  return (
    <div className={`flex items-center justify-between border-t border-border pt-8 mt-4 ${className}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 hidden sm:block">
        Page <span className="text-foreground">{currentPage}</span> sur <span className="text-foreground">{totalPages}</span>
      </p>
      
      <div className="flex items-center gap-2 ml-auto sm:ml-0">
        <Button 
          variant="outline" 
          size="sm" 
          disabled={currentPage === 1}
          onClick={() => {
            onPageChange(currentPage - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="w-10 h-10 p-0 rounded-2xl border-border/50 hover:bg-secondary transition-all active:scale-90"
          aria-label="Page précédente"
        >
          <ChevronLeft size={18} />
        </Button>
        
        <div className="flex items-center gap-1.5">
          {getVisiblePages().map((page, idx) => (
            <React.Fragment key={idx}>
              {page === '...' ? (
                <span className="w-8 text-center text-muted-foreground/40 text-[10px] font-black">...</span>
              ) : (
                <button
                  onClick={() => {
                    onPageChange(page as number);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`w-10 h-10 rounded-2xl text-[10px] font-black transition-all active:scale-90 ${
                    currentPage === page 
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105' 
                      : 'bg-secondary/30 text-muted-foreground hover:bg-secondary hover:text-foreground border border-border/40'
                  }`}
                >
                  {page}
                </button>
              )}
            </React.Fragment>
          ))}
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          disabled={currentPage === totalPages}
          onClick={() => {
            onPageChange(currentPage + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="w-10 h-10 p-0 rounded-2xl border-border/50 hover:bg-secondary transition-all active:scale-90"
          aria-label="Page suivante"
        >
          <ChevronRight size={18} />
        </Button>
      </div>
    </div>
  );
};
