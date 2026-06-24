export enum Role {
  STUDENT = 'Étudiant',
  SCOLARITE = 'Scolarité',
  SERVICE_RECHERCHE_COOP = 'Service Recherche et Coopération',
  ENCADRANT_FST = 'Encadrant FST',
  SECRETARIAT_DOYEN = 'Secrétariat Doyen',
  VICE_DOYEN_RECHERCHE = 'Vice Doyen Recherche',
  VICE_DOYEN_PEDAGOGIE = 'Vice Doyen Pédagogie',
  CHEF_DEPARTEMENT = 'Chef Département',
  SUPERADMIN = 'Super Admin',
  SUPPORT = 'Support Technique'
}

export enum WorkflowStatus {
  DRAFT = 'Brouillon',
  PENDING_RESPONSABLE = 'En attente Responsable Stage',
  PENDING_INSURANCE = 'Attente Preuve Assurance',
  PENDING_SERVICE_RECHERCHE = 'En attente Service Recherche et Stage',
  PENDING_SCOLARITE = 'En attente Scolarité',
  PENDING_FINAL_CHECK = 'En attente Vérification Finale',
  PENDING_VICE_DOYEN_RECHERCHE = 'En attente Validation Vice Doyen Recherche',
  PENDING_VICE_DOYEN_PEDAGOGIE = 'En attente Validation Vice Doyen Pédagogie',
  PENDING_STUDENT_SIGNATURE = 'Attente Signature Étudiant',
  PENDING_TRANSFER_SERVICE_STAGE = 'Convention signée et en attente de dépôt physique',
  PENDING_TRANSFER_DOYEN = 'En transfert vers le Décanat (Attente Réception)',
  PENDING_DOYEN_SIGNATURE = 'Reçue et en attente signature Doyen',
  SIGNED_EN_ROUTE = 'Signée et en transfert vers Service Stage',
  READY_FOR_PICKUP = 'Reçue et en attente de récupération par étudiant',
  COMPLETED = 'Récupérée par étudiant et terminé',
  COMPLEMENT_REQUIRED = 'Complément Requis',
  REJECTED = 'Rejeté',
  CANCELLED = 'Annulé'
}

export enum StageType {
  PFA = 'PFA',
  PFE = 'PFE'
}

export enum ConventionNature {
  PEDAGOGIE = 'Pédagogie',
  RECHERCHE = 'Recherche'
}

export interface User {
  id: string;
  name: string;
  email: string;
  roles: Role[];
  department?: string;
  filiere?: string;
  semestre?: string;
  massarCode?: string;
  appogeeCode?: string;
  registrationYear?: string;
  currentLevel?: string;
  avatarUrl?: string;
  phone?: string;
  isStudent?: boolean;
  isEligible?: boolean;
  eligibleType?: StageType;
  eligibleNature?: ConventionNature;
  password?: string;
}

export interface StageData {
  stageType: StageType;
  nature: ConventionNature;
  isPreEmbauche: boolean;
  isRemunere: boolean;
  isInternational: boolean;
  isBinome: boolean;
  binomeName?: string;
  binomeMassar?: string;
  companyName: string;
  address: string;
  city?: string;
  postalCode?: string;
  duration?: string;
  startDate: string;
  endDate: string;
  tutorName: string;
  tutorEmail: string;
  tutorPhone?: string;
  fstTutorName: string;
  fstTutorEmail: string;
  subject: string;
  insuranceUrl?: string;
  studentId: string;
  massarCode: string;
  appogeeCode: string;
  consent: boolean;
  enterpriseAffirmation: boolean;
  department: string;
  filiere: string;
  semestre: string;
  academicYear: string;
  registrationYear?: string;
  currentLevel?: string;
  complementUrl?: string;
}

export interface Entreprise {
  id: string;
  name: string;
  address: string;
}

export interface EncadrantFST {
  id: string;
  name: string;
  email: string;
  department: string;
}

export interface ConventionMetadata {
  referenceNumber: string;
  deanName: string;
  academicYear: string;
  generatedAt: number;
  signedDocumentUrl?: string;
}

export interface CustomParam {
  id: string;
  key: string;
  label: string;
  value: string;
  description?: string;
}

export interface TemplateSection {
  id: string;
  type: 'header' | 'title' | 'parties' | 'articles' | 'signatures' | 'footer';
  order: number;
  isVisible: boolean;
}

export interface SystemConfig {
  departments: string[];
  filieres: string[];
  semestres: string[];
  niveaux: string[];
  academicYears: string[];
  entreprises: Entreprise[];
}

export interface ConventionArticle {
  id: string;
  title: string;
  content: string;
}

export interface ConventionTemplate {
  header: string;
  deanName: string;
  academicYear: string;
  referencePrefix: string;
  pfeArticles: ConventionArticle[]; // Specific articles for PFE
  pfaArticles: ConventionArticle[]; // Specific articles for PFA
  footer: string;
  logoUrl?: string;
  fontSize: number;
  lineHeight: number;
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  alignment: 'left' | 'center' | 'right' | 'justify';
  headerHeight: number;
  subHeaderHeight?: number;
  footerHeight: number;
  logoSize: number;
  customParams?: CustomParam[];
  
  // New personalization fields
  documentTitle: string;
  partiesIntro: string;
  establishmentLabel: string;
  establishmentContent: string;
  organizationLabel: string;
  organizationContent: string;
  studentLabel: string;
  studentContent: string;
  
  studentSignatureLabel: string;
  organizationSignatureLabel: string;
  deanSignatureLabel: string;
  responsableSignatureLabel: string;
  signatureMentionLu: string;
  signatureMentionFait: string;
  
  sections: TemplateSection[];
}

export interface HistoryEntry {
  status: WorkflowStatus;
  updatedBy: string;
  updatedById: string;
  updatedByRole?: Role;
  updatedAt: number;
  comment?: string;
  attachmentUrl?: string;
}

export interface PFERecord {
  id: string;
  studentId: string;
  studentName: string;
  status: WorkflowStatus;
  data: StageData;
  conventionMetadata?: ConventionMetadata;
  history: HistoryEntry[];
  assignedTo?: string[];
  validatorIds?: Record<string, string>; // Maps Role string to User ID
  participantIds?: string[]; // IDs of all users who worked on this record
  physicalChecklist?: {
    hasPhysicalConvention?: boolean;
    hasPhysicalAssurance?: boolean;
    hasPhysicalCIN?: boolean;
    isTransferredToDoyen?: boolean;
    isReturnedFromDoyen?: boolean;
    isReadyForPickup?: boolean;
  };
  eligibilityStatus?: 'eligible' | 'ineligible' | 'pending_docs';
  updatedAt: number;
}

export interface EligibilityCriteria {
  id: string;
  type: StageType;
  nature: ConventionNature;
  levels: string[];
  description: string;
  isActive: boolean;
}

export interface EligibilityOverride {
  id: string;
  studentId: string;
  studentName: string;
  type: StageType;
  nature: ConventionNature;
  reason: string;
  authorizedBy: string;
  authorizedAt: number;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  createdAt: number;
  isRead: boolean;
  type: 'status_change' | 'comment' | 'system' | 'success' | 'warning' | 'info' | 'error';
  recordId?: string;
  redirectUrl?: string;
  role?: Role;
}

export interface SupportQuestion {
  id: string;
  userId: string;
  userName: string;
  subject: string;
  message: string;
  createdAt: number;
  status: 'pending' | 'answered';
  answer?: string;
  answeredBy?: string;
  answeredAt?: number;
  isPublic?: boolean;
}
