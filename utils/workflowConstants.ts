import { WorkflowStatus } from '../types';

export const STEPS = [
  { id: 0, status: WorkflowStatus.DRAFT, label: 'Soumission' },
  { id: 1, status: WorkflowStatus.PENDING_SCOLARITE, label: 'Validation' },
  { id: 2, status: WorkflowStatus.PENDING_VICE_DOYEN_PEDAGOGIE, label: 'Sign. Pédag.' },
  { id: 3, status: WorkflowStatus.PENDING_STUDENT_SIGNATURE, label: 'Sign. Étudiant' },
  { id: 4, status: WorkflowStatus.PENDING_DOYEN_SIGNATURE, label: 'Sign. Décanat' },
  { id: 5, status: WorkflowStatus.READY_FOR_PICKUP, label: 'Récupération' }
];
