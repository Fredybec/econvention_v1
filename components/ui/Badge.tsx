import React from 'react';
import { WorkflowStatus } from '../../types';

export const Badge: React.FC<{ 
  status?: WorkflowStatus; 
  children?: React.ReactNode; 
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'info' | 'warning';
  className?: string;
}> = ({ status, children, variant, className = '' }) => {
  const styles: Record<string, string> = {
    [WorkflowStatus.DRAFT]: 'bg-muted text-muted-foreground border-muted-foreground/20',
    [WorkflowStatus.PENDING_RESPONSABLE]: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    [WorkflowStatus.PENDING_INSURANCE]: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
    [WorkflowStatus.PENDING_SERVICE_RECHERCHE]: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    [WorkflowStatus.PENDING_SCOLARITE]: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
    [WorkflowStatus.PENDING_FINAL_CHECK]: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
    [WorkflowStatus.PENDING_VICE_DOYEN_RECHERCHE]: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
    [WorkflowStatus.PENDING_VICE_DOYEN_PEDAGOGIE]: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
    [WorkflowStatus.PENDING_TRANSFER_DOYEN]: 'bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-500/20',
    [WorkflowStatus.PENDING_DOYEN_SIGNATURE]: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
    [WorkflowStatus.PENDING_STUDENT_SIGNATURE]: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    [WorkflowStatus.SIGNED_EN_ROUTE]: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    [WorkflowStatus.READY_FOR_PICKUP]: 'bg-green-500/10 text-green-600 border-green-500/20',
    [WorkflowStatus.COMPLETED]: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    [WorkflowStatus.COMPLEMENT_REQUIRED]: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
    [WorkflowStatus.REJECTED]: 'bg-destructive/10 text-destructive border-destructive/20',
    [WorkflowStatus.CANCELLED]: 'bg-destructive/10 text-destructive border-destructive/20',
  };

  const variantStyles = {
    primary: 'bg-primary/10 text-primary border-primary/20',
    secondary: 'bg-secondary text-secondary-foreground border-border',
    danger: 'bg-destructive/10 text-destructive border-destructive/20',
    success: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    info: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    warning: 'bg-orange-500 text-white border-orange-600',
  };

  const finalStyle = status ? styles[status] : (variant ? variantStyles[variant] : 'bg-secondary');

  return (
    <span 
      className={`px-3 py-1 rounded-full text-[9px] uppercase tracking-widest font-black border inline-block text-center whitespace-nowrap overflow-hidden text-ellipsis max-w-full ${finalStyle} ${className}`}
      title={String(children || status)}
    >
      {children || status}
    </span>
  );
};
