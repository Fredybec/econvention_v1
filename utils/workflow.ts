
import { WorkflowStatus, Role, PFERecord, StageType, ConventionNature } from '../types';

export const getNextStatus = (currentStatus: WorkflowStatus, record?: PFERecord): WorkflowStatus | null => {
  if (currentStatus === WorkflowStatus.COMPLEMENT_REQUIRED && record?.history) {
    // Find the last status in history that wasn't COMPLEMENT_REQUIRED
    const history = [...record.history].reverse();
    const lastStatusEntry = history.find(h => h.status !== WorkflowStatus.COMPLEMENT_REQUIRED);
    return lastStatusEntry ? lastStatusEntry.status : WorkflowStatus.DRAFT;
  }

  switch (currentStatus) {
    case WorkflowStatus.DRAFT:
      return WorkflowStatus.PENDING_RESPONSABLE;
    case WorkflowStatus.PENDING_RESPONSABLE:
      return WorkflowStatus.PENDING_INSURANCE;
    case WorkflowStatus.PENDING_INSURANCE:
      return WorkflowStatus.PENDING_SCOLARITE;
    case WorkflowStatus.PENDING_SCOLARITE:
      return WorkflowStatus.PENDING_SERVICE_RECHERCHE;
    case WorkflowStatus.PENDING_SERVICE_RECHERCHE:
      if (record?.data.nature === ConventionNature.RECHERCHE) {
        return WorkflowStatus.PENDING_VICE_DOYEN_RECHERCHE;
      }
      return WorkflowStatus.PENDING_VICE_DOYEN_PEDAGOGIE;
    case WorkflowStatus.PENDING_VICE_DOYEN_RECHERCHE:
    case WorkflowStatus.PENDING_VICE_DOYEN_PEDAGOGIE:
      return WorkflowStatus.PENDING_STUDENT_SIGNATURE;
    case WorkflowStatus.PENDING_STUDENT_SIGNATURE:
      return WorkflowStatus.PENDING_TRANSFER_SERVICE_STAGE;
    case WorkflowStatus.PENDING_TRANSFER_SERVICE_STAGE:
      return WorkflowStatus.PENDING_TRANSFER_DOYEN;
    case WorkflowStatus.PENDING_FINAL_CHECK:
      return WorkflowStatus.COMPLETED;
    case WorkflowStatus.PENDING_TRANSFER_DOYEN:
      return WorkflowStatus.PENDING_DOYEN_SIGNATURE;
    case WorkflowStatus.PENDING_DOYEN_SIGNATURE:
      return WorkflowStatus.READY_FOR_PICKUP;
    case WorkflowStatus.READY_FOR_PICKUP:
      return WorkflowStatus.COMPLETED;
    default:
      return null;
  }
};

export const getStatusLabel = (status: WorkflowStatus): string => {
  switch (status) {
    case WorkflowStatus.DRAFT: return 'Brouillon';
    case WorkflowStatus.PENDING_RESPONSABLE: return 'Attente Responsable Stage';
    case WorkflowStatus.PENDING_INSURANCE: return 'Attente Assurance';
    case WorkflowStatus.PENDING_SCOLARITE: return 'Attente Scolarité';
    case WorkflowStatus.PENDING_SERVICE_RECHERCHE: return 'Attente Service Recherche';
    case WorkflowStatus.PENDING_VICE_DOYEN_RECHERCHE: return 'Attente Vice-Doyen Recherche';
    case WorkflowStatus.PENDING_VICE_DOYEN_PEDAGOGIE: return 'Attente Vice-Doyen Pédagogie';
    case WorkflowStatus.PENDING_STUDENT_SIGNATURE: return 'Attente Signature Étudiant';
    case WorkflowStatus.PENDING_TRANSFER_SERVICE_STAGE: return 'Attente Transfert Service Recherche';
    case WorkflowStatus.PENDING_TRANSFER_DOYEN: return 'Attente Transfert Décanat';
    case WorkflowStatus.PENDING_DOYEN_SIGNATURE: return 'Attente Signature Doyen';
    case WorkflowStatus.SIGNED_EN_ROUTE: return 'Signée (En cours de retour)';
    case WorkflowStatus.READY_FOR_PICKUP: return 'Prête pour retrait (Service Recherche)';
    case WorkflowStatus.COMPLETED: return 'Retrait Confirmé';
    case WorkflowStatus.COMPLEMENT_REQUIRED: return 'Complément Requis';
    case WorkflowStatus.REJECTED: return 'Dossier Rejeté';
    default: return status;
  }
};

export const canApprove = (status: WorkflowStatus, roles: Role[] = [], userDept?: string, recordDept?: string, lastStatus?: WorkflowStatus, tutorEmail?: string, currentUserEmail?: string, stageType?: StageType, nature?: ConventionNature): boolean => {
  const safeRoles = Array.isArray(roles) ? roles : [];
  // If status is COMPLEMENT_REQUIRED, only the student can act on it
  if (status === WorkflowStatus.COMPLEMENT_REQUIRED) {
    return safeRoles.includes(Role.STUDENT);
  }

  if (safeRoles.includes(Role.SUPERADMIN)) return true;
  
  // Check each role and return true if ANY role allows approval at the current status
  return safeRoles.some(role => {
    switch (role) {
      case Role.CHEF_DEPARTEMENT:
        // Case-insensitive department check with fallback
        if (userDept && recordDept && userDept.trim().toLowerCase() !== recordDept.trim().toLowerCase()) return false;
        return status === WorkflowStatus.PENDING_RESPONSABLE;

      case Role.ENCADRANT_FST:
        return false;

      case Role.STUDENT:
        return [WorkflowStatus.DRAFT, WorkflowStatus.PENDING_INSURANCE, WorkflowStatus.PENDING_STUDENT_SIGNATURE].includes(status);

      case Role.SERVICE_RECHERCHE_COOP:
        return [
          WorkflowStatus.PENDING_SERVICE_RECHERCHE,
          WorkflowStatus.PENDING_TRANSFER_SERVICE_STAGE,
          WorkflowStatus.PENDING_FINAL_CHECK,
          WorkflowStatus.READY_FOR_PICKUP
        ].includes(status);

      case Role.SCOLARITE:
        return status === WorkflowStatus.PENDING_SCOLARITE;

      case Role.VICE_DOYEN_RECHERCHE:
        return status === WorkflowStatus.PENDING_VICE_DOYEN_RECHERCHE;

      case Role.VICE_DOYEN_PEDAGOGIE:
        return status === WorkflowStatus.PENDING_VICE_DOYEN_PEDAGOGIE;

      case Role.SECRETARIAT_DOYEN:
        return [WorkflowStatus.PENDING_TRANSFER_DOYEN, WorkflowStatus.PENDING_DOYEN_SIGNATURE].includes(status);

      default:
        return false;
    }
  });
};
