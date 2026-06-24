export type DocumentType = 'PFA' | 'PFE';

export interface FacultyInfo {
  name: string;
  representative: string;
  address: string;
  phone: string;
  fax: string;
}

export interface OrganizationInfo {
  name: string;
  address: string;
  phone: string;
  fax: string;
  representative: string;
}

export interface StudentInfo {
  name: string;
  academicYear: string;
  massarCode: string;
}

export interface InternshipDetails {
  title: string;
  duration: string;
  startDate: string;
  endDate: string;
  location: string;
  orgSupervisor: {
    name: string;
    quality: string;
    phone: string;
    email: string;
  };
  facultySupervisor: {
    name: string;
    quality: string;
    phone: string;
    email: string;
  };
}

export interface ConventionData {
  type: DocumentType;
  faculty: FacultyInfo;
  organization: OrganizationInfo;
  student: StudentInfo;
  internship: InternshipDetails;
}
