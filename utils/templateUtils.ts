import { PFERecord, ConventionTemplate } from '../types';

export const TEMPLATE_PARAMS = [
  { key: '{studentName}', label: 'Nom de l\'étudiant', description: 'Le nom complet de l\'étudiant' },
  { key: '{massarCode}', label: 'Code Massar', description: 'Le code Massar de l\'étudiant' },
  { key: '{appogeeCode}', label: 'Code Appogée', description: 'Le code Appogée de l\'étudiant' },
  { key: '{department}', label: 'Département', description: 'Le département de l\'étudiant' },
  { key: '{filiere}', label: 'Filière', description: 'La filière de l\'étudiant' },
  { key: '{semestre}', label: 'Semestre', description: 'Le semestre en cours' },
  { key: '{currentLevel}', label: 'Niveau Actuel', description: 'Le niveau actuel de l\'étudiant' },
  { key: '{academicYear}', label: 'Année Universitaire', description: 'L\'année universitaire en cours' },
  { key: '{companyName}', label: 'Organisme d\'accueil', description: 'Le nom de l\'entreprise' },
  { key: '{address}', label: 'Adresse Organisme', description: 'L\'adresse de l\'organisme d\'accueil' },
  { key: '{city}', label: 'Ville Organisme', description: 'La ville de l\'organisme d\'accueil' },
  { key: '{tutorName}', label: 'Tuteur Entreprise', description: 'Le nom du tuteur en entreprise' },
  { key: '{tutorEmail}', label: 'Email Tuteur', description: 'L\'email du tuteur en entreprise' },
  { key: '{tutorPhone}', label: 'Téléphone Tuteur', description: 'Le téléphone du tuteur en entreprise' },
  { key: '{fstTutorName}', label: 'Encadrant FST', description: 'Le nom de l\'encadrant pédagogique' },
  { key: '{fstTutorEmail}', label: 'Email Encadrant FST', description: 'L\'email de l\'encadrant pédagogique' },
  { key: '{deanName}', label: 'Nom du Doyen', description: 'Le nom du doyen actuel' },
  { key: '{startDate}', label: 'Date de début', description: 'La date de début du stage' },
  { key: '{endDate}', label: 'Date de fin', description: 'La date de fin du stage' },
  { key: '{duration}', label: 'Durée', description: 'La durée du stage' },
  { key: '{subject}', label: 'Sujet du stage', description: 'Le sujet ou titre du stage' },
  { key: '{nature}', label: 'Nature du stage', description: 'La nature du stage (Pédagogique, Recherche)' },
  { key: '{stageType}', label: 'Type de stage', description: 'Le type de stage (PFE, PFA)' },
  { key: '{date}', label: 'Date actuelle', description: 'La date du jour' },
];

export const replaceTemplateParams = (text: string, record?: PFERecord, template?: ConventionTemplate): string => {
  if (!text) return '';
  
  const replacements: Record<string, string> = {
    '{studentName}': record?.studentName || "NOM ÉTUDIANT",
    '{massarCode}': record?.data?.massarCode || "CODE MASSAR",
    '{appogeeCode}': record?.data?.appogeeCode || "CODE APPOGEE",
    '{department}': record?.data?.department || "DÉPARTEMENT",
    '{filiere}': record?.data?.filiere || "NOM DE LA FILIÈRE",
    '{semestre}': record?.data?.semestre || "SEMESTRE",
    '{currentLevel}': record?.data?.currentLevel || "NIVEAU",
    '{academicYear}': record?.data?.academicYear || template?.academicYear || "2023/2024",
    '{year}': record?.data?.academicYear || template?.academicYear || "2023/2024",
    '{companyName}': record?.data?.companyName || "ORGANISME D'ACCUEIL",
    '{address}': record?.data?.address || "ADRESSE",
    '{city}': record?.data?.city || "VILLE",
    '{tutorName}': record?.data?.tutorName || "NOM DU TUTEUR",
    '{tutorEmail}': record?.data?.tutorEmail || "EMAIL DU TUTEUR",
    '{tutorPhone}': record?.data?.tutorPhone || "TÉLÉPHONE DU TUTEUR",
    '{fstTutorName}': record?.data?.fstTutorName || "NOM ENCADRANT FST",
    '{fstTutorEmail}': record?.data?.fstTutorEmail || "EMAIL ENCADRANT FST",
    '{deanName}': template?.deanName || "NOM DU DOYEN",
    '{startDate}': record?.data?.startDate || "DATE DÉBUT",
    '{endDate}': record?.data?.endDate || "DATE FIN",
    '{duration}': record?.data?.duration || "DURÉE",
    '{subject}': record?.data?.subject || "SUJET DU STAGE",
    '{nature}': record?.data?.nature || "NATURE",
    '{stageType}': record?.data?.stageType || "PFE",
    '{date}': new Date().toLocaleDateString('fr-FR'),
  };

  let result = text;
  
  // Apply standard replacements
  Object.entries(replacements).forEach(([key, value]) => {
    result = result.split(key).join(value);
  });

  // Apply custom replacements from template
  if (template?.customParams) {
    template.customParams.forEach(param => {
      if (param.key) {
        // If the value starts with "record.data.", try to map it to a record field
        let finalValue = param.value || '';
        if (record && typeof param.value === 'string' && param.value.startsWith('record.data.')) {
          const field = param.value.replace('record.data.', '');
          finalValue = (record.data as any)[field] || `[${param.label}]`;
        }
        
        // Case-insensitive replacement for custom parameters
        const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapeRegExp(param.key), 'gi');
        
        // Convert to string to avoid errors with non-string values
        const stringValue = finalValue !== null && finalValue !== undefined ? String(finalValue) : '';
        result = result.replace(regex, stringValue);
      }
    });
  }

  return result;
};
