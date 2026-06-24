import dotenv from 'dotenv';
dotenv.config();
import { 
  User, PFERecord, SystemConfig, ConventionTemplate, 
  Notification, SupportQuestion, EligibilityCriteria, EligibilityOverride,
  Role, WorkflowStatus, StageType, ConventionNature
} from '../types';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

class Storage {
  // --- MariaDB Implementation Helpers ---
  private async query(sql: string, params: any[] = []): Promise<any> {
    try {
      const [results] = await pool.execute(sql, params);
      return results;
    } catch (error) {
      console.error(`[MARIADB-ERROR] SQL: ${sql}`, error);
      throw error; // Rethrow to allow server error handling
    }
  }

  /**
   * Run this once to initialize your MariaDB schema and create the superadmin.
   * Also ensures the database exists.
   */
  async migrateMARIADB(): Promise<void> {
    const dbName = process.env.DB_NAME;
    
    try {
      // 1. Ensure Database exists
      const tempConn = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
      });
      await tempConn.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
      await tempConn.end();
      console.log(`[MARIADB] Database ensured: ${dbName}`);
    } catch (err) {
      console.warn(`[MARIADB-MIGRATE] Could not ensure database existence (may lack permissions or server down):`, err);
    }

    const queries = [
      `CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        roles TEXT NOT NULL, -- Stored as JSON string for now, matching app logic
        isStudent BOOLEAN DEFAULT FALSE,
        department VARCHAR(255),
        filiere VARCHAR(255),
        semestre VARCHAR(50),
        massarCode VARCHAR(100),
        appogeeCode VARCHAR(100),
        registrationYear VARCHAR(50),
        currentLevel VARCHAR(50),
        avatarUrl LONGTEXT,
        phone VARCHAR(50),
        isEligible BOOLEAN DEFAULT FALSE,
        password VARCHAR(255)
      )`,
      `CREATE TABLE IF NOT EXISTS roles_lookup (
        role_key VARCHAR(100) PRIMARY KEY,
        label VARCHAR(255)
      )`,
      `CREATE TABLE IF NOT EXISTS records (
        id VARCHAR(255) PRIMARY KEY,
        studentId VARCHAR(255) NOT NULL,
        studentName VARCHAR(255) NOT NULL,
        status VARCHAR(100) NOT NULL,
        updatedAt BIGINT NOT NULL,
        assignedTo TEXT, -- JSON array
        validatorIds TEXT, -- JSON object
        participantIds TEXT, -- JSON array
        physicalChecklist TEXT, -- JSON object
        -- StageData fields
        stageType VARCHAR(50),
        nature VARCHAR(50),
        isPreEmbauche BOOLEAN,
        isRemunere BOOLEAN,
        isInternational BOOLEAN,
        isBinome BOOLEAN,
        binomeName VARCHAR(255),
        binomeMassar VARCHAR(255),
        companyName VARCHAR(255),
        address TEXT,
        city VARCHAR(100),
        postalCode VARCHAR(20),
        duration VARCHAR(100),
        startDate VARCHAR(50),
        endDate VARCHAR(50),
        tutorName VARCHAR(255),
        tutorEmail VARCHAR(255),
        tutorPhone VARCHAR(50),
        fstTutorName VARCHAR(255),
        fstTutorEmail VARCHAR(255),
        subject TEXT,
        insuranceUrl LONGTEXT,
        massarCode VARCHAR(100),
        appogeeCode VARCHAR(100),
        academicYear VARCHAR(50),
        department VARCHAR(255),
        filiere VARCHAR(255),
        semestre VARCHAR(50),
        registrationYear VARCHAR(50),
        currentLevel VARCHAR(50),
        consent BOOLEAN,
        enterpriseAffirmation BOOLEAN,
        complementUrl LONGTEXT,
        -- ConventionMetadata fields
        signedDocumentUrl LONGTEXT,
        -- Index for performance
        INDEX (studentId),
        INDEX (status),
        INDEX (academicYear),
        INDEX (department)
      )`,
      `CREATE TABLE IF NOT EXISTS record_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        recordId VARCHAR(255) NOT NULL,
        status VARCHAR(100) NOT NULL,
        updatedAt BIGINT NOT NULL,
        updatedBy VARCHAR(255) NOT NULL,
        updatedById VARCHAR(255) NOT NULL,
        updatedByRole VARCHAR(100),
        comment TEXT,
        attachmentUrl LONGTEXT,
        INDEX(recordId)
      )`,
      `CREATE TABLE IF NOT EXISTS system_parameters (
        category VARCHAR(100),
        value VARCHAR(255),
        UNIQUE(category, value)
      )`,
      `CREATE TABLE IF NOT EXISTS entreprises (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255),
        address TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS convention_templates (
        id INT PRIMARY KEY,
        header TEXT,
        deanName VARCHAR(255),
        academicYear VARCHAR(50),
        referencePrefix VARCHAR(50),
        footer TEXT,
        logoUrl LONGTEXT,
        fontSize INT,
        lineHeight FLOAT,
        margin_top INT,
        margin_bottom INT,
        margin_left INT,
        margin_right INT,
        alignment VARCHAR(20),
        headerHeight INT,
        subHeaderHeight INT,
        footerHeight INT,
        logoSize INT,
        documentTitle VARCHAR(255),
        partiesIntro TEXT,
        establishmentLabel VARCHAR(255),
        establishmentContent TEXT,
        organizationLabel VARCHAR(255),
        organizationContent TEXT,
        studentLabel VARCHAR(255),
        studentContent TEXT,
        studentSignatureLabel VARCHAR(255),
        organizationSignatureLabel VARCHAR(255),
        deanSignatureLabel VARCHAR(255),
        responsableSignatureLabel VARCHAR(255),
        signatureMentionLu VARCHAR(255),
        signatureMentionFait VARCHAR(255)
      )`,
      `CREATE TABLE IF NOT EXISTS template_articles (
        id VARCHAR(255) PRIMARY KEY,
        templateId INT,
        type VARCHAR(10),
        title VARCHAR(255),
        content TEXT,
        sortOrder INT
      )`,
      `CREATE TABLE IF NOT EXISTS template_sections (
        id VARCHAR(255) PRIMARY KEY,
        templateId INT,
        type VARCHAR(50), 
        sortOrder INT,
        isVisible BOOLEAN
      )`,
      `CREATE TABLE IF NOT EXISTS template_custom_params (
        id VARCHAR(255) PRIMARY KEY,
        templateId INT,
        param_key VARCHAR(100),
        label VARCHAR(255),
        value TEXT,
        description TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(255) PRIMARY KEY,
        userId VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        createdAt BIGINT NOT NULL,
        isRead BOOLEAN DEFAULT FALSE,
        type VARCHAR(50) NOT NULL,
        recordId VARCHAR(255),
        redirectUrl TEXT,
        role VARCHAR(100),
        INDEX (userId),
        INDEX (createdAt)
      )`,
      `CREATE TABLE IF NOT EXISTS support (
        id VARCHAR(255) PRIMARY KEY,
        userId VARCHAR(255) NOT NULL,
        userName VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        createdAt BIGINT NOT NULL,
        status VARCHAR(50) NOT NULL,
        answer TEXT,
        answeredBy VARCHAR(255),
        answeredAt BIGINT,
        isPublic BOOLEAN DEFAULT FALSE
      )`,
      `CREATE TABLE IF NOT EXISTS eligibility_criteria (
        id VARCHAR(255) PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        nature VARCHAR(50) NOT NULL,
        levels TEXT NOT NULL, -- JSON string
        description TEXT,
        isActive BOOLEAN DEFAULT TRUE
      )`,
      `CREATE TABLE IF NOT EXISTS eligibility_overrides (
        id VARCHAR(255) PRIMARY KEY,
        studentId VARCHAR(255) NOT NULL,
        studentName VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        nature VARCHAR(50) NOT NULL,
        reason TEXT NOT NULL,
        authorizedBy VARCHAR(255) NOT NULL,
        authorizedAt BIGINT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS record_locks (
        recordId VARCHAR(255) PRIMARY KEY,
        userId VARCHAR(255) NOT NULL,
        userName VARCHAR(255) NOT NULL,
        lockedAt BIGINT NOT NULL
      )`,
      // Ensure missing columns in records table
      `ALTER TABLE records ADD COLUMN IF NOT EXISTS department VARCHAR(255)`,
      `ALTER TABLE records ADD COLUMN IF NOT EXISTS registrationYear VARCHAR(50)`,
      `ALTER TABLE records ADD COLUMN IF NOT EXISTS currentLevel VARCHAR(50)`,
      `ALTER TABLE records ADD COLUMN IF NOT EXISTS complementUrl LONGTEXT`,
      // Ensure missing columns in convention_templates
      `ALTER TABLE convention_templates ADD COLUMN IF NOT EXISTS margin_top INT`,
      `ALTER TABLE convention_templates ADD COLUMN IF NOT EXISTS margin_bottom INT`,
      `ALTER TABLE convention_templates ADD COLUMN IF NOT EXISTS margin_left INT`,
      `ALTER TABLE convention_templates ADD COLUMN IF NOT EXISTS margin_right INT`,
      `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS role VARCHAR(100)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS isStudent BOOLEAN DEFAULT FALSE`
    ];

    console.log("[MARIADB] Initializing database schema...");
    for (const q of queries) {
      await this.query(q);
    }

    // Upgrade existing columns to LONGTEXT if they were TEXT and handle removal of old JSON columns
    try {
      await this.query("ALTER TABLE users MODIFY avatarUrl LONGTEXT");
      await this.query("ALTER TABLE convention_templates MODIFY logoUrl LONGTEXT");
      
      // Check if old columns exist before dropping
      const columns = await this.query("SHOW COLUMNS FROM records");
      const columnNames = columns.map((c: any) => c.Field);
      
      if (columnNames.includes('data')) {
        // Here we'd ideally migrate data, but since we are restructuring for the user's request
        // and it's a dev environment, we'll just ensure the new columns exist via CREATE TABLE above
        // and drop the old ones if they exist.
        await this.query("ALTER TABLE records DROP COLUMN data");
      }
      if (columnNames.includes('history')) {
        await this.query("ALTER TABLE records DROP COLUMN history");
      }
      
      const toDrop = ['country', 'phone', 'email', 'website', 'supervisorName', 'supervisorEmail', 'supervisorPhone', 'cin', 'cne', 'diploma'];
      for (const col of toDrop) {
        if (columnNames.includes(col)) {
          await this.query(`ALTER TABLE records DROP COLUMN ${col}`);
        }
      }

      console.log("[MARIADB] Normalized records table schema");
    } catch (err) {
      console.warn("[MARIADB] Schema normalization/upgrade failed (possibly already normalized):", err);
    }

    // Seed roles
    const roles = [
      ["STUDENT", "Étudiant"],
      ["SCOLARITE", "Scolarité"],
      ["SERVICE_RECHERCHE_COOP", "Service Recherche et Coopération"],
      ["ENCADRANT_FST", "Encadrant FST"],
      ["SECRETARIAT_DOYEN", "Secrétariat Doyen"],
      ["VICE_DOYEN_RECHERCHE", "Vice Doyen Recherche"],
      ["VICE_DOYEN_PEDAGOGIE", "Vice Doyen Pédagogie"],
      ["CHEF_DEPARTEMENT", "Chef Département"],
      ["SUPERADMIN", "Super Admin"],
      ["SUPPORT", "Support Technique"]
    ];
    for (const [key, label] of roles) {
      await this.query("INSERT IGNORE INTO roles_lookup (role_key, label) VALUES (?, ?)", [key, label]);
    }

    // Default password for seeded accounts
    const salt = await bcrypt.genSalt(10);
    const defaultHashedPassword = await bcrypt.hash("fst2025", salt);

    // Initial Seed of Users
    const seedUsers = [
      {
        id: "admin-1",
        email: "admin@uca.ac.ma",
        name: "Super Admin",
        roles: [Role.SUPERADMIN],
        isEligible: true,
        isStudent: false,
        password: defaultHashedPassword
      },
      {
        id: "respo-info-1",
        email: "respo.info@uca.ac.ma",
        name: "Responsable Informatique (Chef Dept & Encadrant)",
        roles: [Role.ENCADRANT_FST, Role.CHEF_DEPARTEMENT],
        department: "Informatique",
        isEligible: false,
        isStudent: false,
        password: defaultHashedPassword
      },
      {
        id: "scolarite-1",
        email: "scolarite@uca.ac.ma",
        name: "Service Scolarité",
        roles: [Role.SCOLARITE],
        isEligible: false,
        isStudent: false,
        password: defaultHashedPassword
      },
      {
        id: "service-stage-1",
        email: "service.stage@uca.ac.ma",
        name: "Service Stage",
        roles: [Role.SERVICE_RECHERCHE_COOP],
        isEligible: false,
        isStudent: false,
        password: defaultHashedPassword
      },
      {
        id: "vdp-1",
        email: "vdp@uca.ac.ma",
        name: "Vice Doyen Pédagogie",
        roles: [Role.VICE_DOYEN_PEDAGOGIE],
        isEligible: false,
        isStudent: false,
        password: defaultHashedPassword
      },
      {
        id: "secretariat-doyen-1",
        email: "secretariat.doyen@uca.ac.ma",
        name: "Secrétariat Doyen",
        roles: [Role.SECRETARIAT_DOYEN],
        isEligible: false,
        isStudent: false,
        password: defaultHashedPassword
      },
      {
        id: "support-1",
        email: "support@uca.ac.ma",
        name: "Support Technique",
        roles: [Role.SUPPORT],
        isEligible: false,
        isStudent: false,
        password: defaultHashedPassword
      },
      {
        id: "student-info-1",
        email: "student.info@uca.ac.ma",
        name: "Étudiant Informatique",
        roles: [Role.STUDENT],
        department: "Informatique",
        filiere: "MST Informatique (SIR)",
        currentLevel: "Licence 3",
        massarCode: "G140022135",
        appogeeCode: "2009856",
        isEligible: true,
        isStudent: true,
        password: defaultHashedPassword
      },
      {
        id: "student-info-2",
        email: "student2.info@uca.ac.ma",
        name: "Etudiant Info 2",
        roles: [Role.STUDENT],
        department: "Informatique",
        filiere: "LST Informatique",
        currentLevel: "Licence 3",
        massarCode: "G130045678",
        appogeeCode: "21012345",
        isEligible: true,
        isStudent: true,
        password: defaultHashedPassword
      },
      {
        id: "student-info-3",
        email: "student3.info@uca.ac.ma",
        name: "Etudiant Info 3",
        roles: [Role.STUDENT],
        department: "Informatique",
        filiere: "MST Informatique (SIR)",
        currentLevel: "Master 2",
        massarCode: "G130098765",
        appogeeCode: "19056789",
        isEligible: true,
        isStudent: true,
        password: defaultHashedPassword
      }
    ];

    console.log("[MARIADB] Seeding system users...");
    for (const u of seedUsers) {
      const existingUser = await this.query("SELECT id FROM users WHERE email = ?", [u.email]);
      if (!existingUser || existingUser.length === 0) {
        await this.query(
          `INSERT INTO users (id, email, name, roles, isEligible, isStudent, department, filiere, currentLevel, massarCode, appogeeCode, password) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            u.id, u.email, u.name, JSON.stringify(u.roles),
            u.isEligible ? 1 : 0, u.isStudent ? 1 : 0,
            u.department || null, u.filiere || null,
            u.currentLevel || null, u.massarCode || null,
            u.appogeeCode || null, u.password
          ]
        );
        console.log(`[MARIADB] Created seeded user: ${u.email}`);
      } else {
        // Update password for existing users if it's the admin or if we want to ensure seed state
        await this.query(
          "UPDATE users SET roles=?, password=?, name=?, department=?, filiere=?, currentLevel=?, massarCode=?, appogeeCode=? WHERE email=?",
          [
            JSON.stringify(u.roles), u.password, u.name,
            u.department || null, u.filiere || null,
            u.currentLevel || null, u.massarCode || null,
            u.appogeeCode || null, u.email
          ]
        );
        console.log(`[MARIADB] Updated seeded user state: ${u.email}`);
      }
    }

    // Seed initial Eligibility Criteria if empty
    const eligibilityExists = await this.query("SELECT * FROM eligibility_criteria LIMIT 1");
    if (!eligibilityExists || eligibilityExists.length === 0) {
      const initialCriteria: EligibilityCriteria[] = [
        {
          id: "elig-pfe-licence3-pedagogie",
          type: StageType.PFE,
          nature: ConventionNature.PEDAGOGIE,
          levels: ["Licence 3"],
          description: "Éligibilité au stage PFE Pédagogie pour les étudiants en Licence 3",
          isActive: true
        },
        {
          id: "elig-pfe-master2-recherche",
          type: StageType.PFE,
          nature: ConventionNature.RECHERCHE,
          levels: ["Master 2"],
          description: "Éligibilité au stage PFE Recherche pour les étudiants en Master 2",
          isActive: true
        }
      ];
      await this.saveEligibilityCriteria(initialCriteria);
      console.log("[MARIADB] Seeded initial eligibility criteria.");
    }

    // Seed initial Config if empty
    const configExists = await this.query("SELECT * FROM system_parameters LIMIT 1");
    if (!configExists || configExists.length === 0) {
      const initialConfig: SystemConfig = {
        departments: [
          'Informatique', 'Mathématiques', 'Physique', 'Chimie', 'Biologie', 
          'Génie Électrique', 'Génie Mécanique', 'Géologie'
        ],
        filieres: [
          'LST Informatique', 'LST Génie Civil', 'LST Génie Électrique', 'LST Génie Mécanique', 
          'MST Informatique (SIR)', 'MST Cyber-Sécurité', 'MST Mathématiques Appliquées', 
          'MST Physique des Matériaux', 'MST Biotechnologie Végétale', 
          'Cycle Ingénieur - Génie Informatique', 'Cycle Ingénieur - Industrie et Mines'
        ],
        semestres: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
        niveaux: ['Licence 3', 'Master 2', 'Ingénieur 3'],
        academicYears: ['2023/2024', '2024/2025', '2025/2026'],
        entreprises: [
          { id: 'e1', name: 'OCP Group', address: 'Casablanca' },
          { id: 'e2', name: 'Maroc Telecom', address: 'Rabat' },
          { id: 'e3', name: 'Capgemini', address: 'Casablanca' },
          { id: 'e4', name: 'Altran', address: 'Casablanca' }
        ]
      };
      await this.saveConfig(initialConfig);
      console.log("[MARIADB] Seeded initial system configuration.");
    }

    // Seed initial Template if empty
    const templateExists = await this.query("SELECT * FROM convention_templates WHERE id = 1");
    if (!templateExists || templateExists.length === 0) {
      const initialTemplate: ConventionTemplate = {
        header: "ROYAUME DU MAROC\nUNIVERSITÉ CADI AYYAD\nFACULTÉ DES SCIENCES ET TECHNIQUES\nMARRAKECH",
        deanName: "SAID RAKRAK",
        academicYear: "2024/2025",
        referencePrefix: "FST-PFE",
        pfeArticles: [],
        pfaArticles: [],
        footer: "BP 549, Boulevard Abdelkrim Al Khattabi, Guéliz, Marrakech\nTél : 0524433404 | Fax : 0524433170",
        fontSize: 10,
        lineHeight: 1.5,
        margins: { top: 20, bottom: 20, left: 20, right: 20 },
        alignment: 'justify',
        headerHeight: 45,
        subHeaderHeight: 25,
        footerHeight: 30,
        logoSize: 20,
        documentTitle: "CONVENTION DE STAGE",
        partiesIntro: "ENTRE LES SOUSSIGNÉS",
        establishmentLabel: "L'ÉTABLISSEMENT",
        establishmentContent: "La **Faculté des Sciences et Techniques de Marrakech**, représentée par son Doyen **{deanName}**, située à Marrakech, Boulevard Abdelkrim Al Khattabi.",
        organizationLabel: "L'ORGANISME D'ACCUEIL",
        organizationContent: "L'organisme **{companyName}**, sis à **{address}**, **{city}**, représenté par son Tuteur **{tutorName}**.",
        studentLabel: "L'ÉTUDIANT",
        studentContent: "L'étudiant(e) **{studentName}**, inscrit(e) en **{filiere}** (**{currentLevel}**) sous le Code Massar **{massarCode}** et Code Appogée **{appogeeCode}**, au titre de l'année universitaire **{academicYear}**.",
        sections: [
          { id: '1', type: 'header', order: 1, isVisible: true },
          { id: '2', type: 'title', order: 2, isVisible: true },
          { id: '3', type: 'parties', order: 3, isVisible: true },
          { id: '4', type: 'articles', order: 4, isVisible: true },
          { id: '5', type: 'signatures', order: 5, isVisible: true },
          { id: '6', type: 'footer', order: 6, isVisible: true }
        ],
        studentSignatureLabel: "Signature de l'étudiant",
        organizationSignatureLabel: "Signature de l'organisme",
        deanSignatureLabel: "Signature du Doyen",
        responsableSignatureLabel: "Signature du Responsable Filière",
        signatureMentionLu: "Lu et approuvé",
        signatureMentionFait: "Fait à ........ le ........",
        customParams: []
      };
      await this.saveTemplate(initialTemplate);
      console.log("[MARIADB] Seeded initial convention template.");
    }
  }

  // Users
  async getUsers(): Promise<User[]> {
    const users = await this.query("SELECT * FROM users");
    return users.map((u: any) => ({
      ...u,
      roles: typeof u.roles === 'string' ? JSON.parse(u.roles) : u.roles,
      isStudent: Boolean(u.isStudent),
      isEligible: Boolean(u.isEligible)
    }));
  }

  async saveUser(u: User): Promise<void> {
    const isStudent = u.isStudent !== undefined ? u.isStudent : (u.roles?.includes(Role.STUDENT) || false);
    
    // Check if user exists by ID first to determine if we should update or insert
    // This is safer for tables with multiple unique constraints (ID and Email)
    const existing = await this.query("SELECT id FROM users WHERE id = ?", [u.id]);
    
    if (existing && existing.length > 0) {
      // Perform UPDATE
      await this.query(
        `UPDATE users SET 
          email=?, name=?, roles=?, isStudent=?, department=?, filiere=?, semestre=?, 
          massarCode=?, appogeeCode=?, registrationYear=?, currentLevel=?, 
          avatarUrl=?, phone=?, isEligible=?, password=?
         WHERE id=?`,
        [
          u.email, u.name, JSON.stringify(u.roles), isStudent ? 1 : 0, 
          u.department ?? null, u.filiere ?? null, u.semestre ?? null, u.massarCode ?? null, u.appogeeCode ?? null, 
          u.registrationYear ?? null, u.currentLevel ?? null, u.avatarUrl ?? null,
          u.phone ?? null, u.isEligible ? 1 : 0, u.password ?? null,
          u.id
        ]
      );
    } else {
      // Perform INSERT
      await this.query(
        `INSERT INTO users (
          id, email, name, roles, isStudent, department, filiere, semestre, 
          massarCode, appogeeCode, registrationYear, currentLevel, 
          avatarUrl, phone, isEligible, password
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          u.id, u.email, u.name, JSON.stringify(u.roles), isStudent ? 1 : 0, 
          u.department ?? null, u.filiere ?? null, u.semestre ?? null, u.massarCode ?? null, u.appogeeCode ?? null, 
          u.registrationYear ?? null, u.currentLevel ?? null, u.avatarUrl ?? null,
          u.phone ?? null, u.isEligible ? 1 : 0, u.password ?? null
        ]
      );
    }
  }

  async saveUsers(users: User[]): Promise<void> {
    for (const u of users) {
      await this.saveUser(u);
    }
  }

  async deleteUser(id: string): Promise<void> {
    await this.query("DELETE FROM users WHERE id = ?", [id]);
  }

  async getRecord(id: string): Promise<PFERecord | null> {
    const rows = await this.query("SELECT * FROM records WHERE id = ?", [id]);
    if (rows.length === 0) return null;

    const r = rows[0];
    const history = await this.query(
      "SELECT * FROM record_history WHERE recordId = ? ORDER BY updatedAt ASC",
      [id]
    );

    return {
      id: r.id,
      studentId: r.studentId,
      studentName: r.studentName,
      status: r.status as any,
      data: {
        stageType: (r.stageType as any) || StageType.PFE,
        nature: (r.nature as any) || ConventionNature.PEDAGOGIE,
        isPreEmbauche: Boolean(r.isPreEmbauche),
        isRemunere: Boolean(r.isRemunere),
        isInternational: Boolean(r.isInternational),
        isBinome: Boolean(r.isBinome),
        binomeName: r.binomeName || undefined,
        binomeMassar: r.binomeMassar || undefined,
        companyName: r.companyName || '',
        address: r.address || '',
        city: r.city || '',
        postalCode: r.postalCode || '',
        duration: r.duration || '',
        startDate: r.startDate || '',
        endDate: r.endDate || '',
        tutorName: r.tutorName || '',
        tutorEmail: r.tutorEmail || '',
        tutorPhone: r.tutorPhone || '',
        fstTutorName: r.fstTutorName || '',
        fstTutorEmail: r.fstTutorEmail || '',
        subject: r.subject || '',
        insuranceUrl: r.insuranceUrl || undefined,
        studentId: r.studentId,
        massarCode: r.massarCode || '',
        appogeeCode: r.appogeeCode || '',
        department: r.department || '',
        filiere: r.filiere || '',
        semestre: r.semestre || '',
        academicYear: r.academicYear || '',
        registrationYear: r.registrationYear || '',
        currentLevel: r.currentLevel || '',
        consent: Boolean(r.consent),
        enterpriseAffirmation: Boolean(r.enterpriseAffirmation),
        complementUrl: r.complementUrl || undefined
      },
      history: history.map((h: any) => ({
        status: h.status as WorkflowStatus,
        updatedAt: h.updatedAt,
        updatedBy: h.updatedBy,
        updatedById: h.updatedById,
        updatedByRole: (h.updatedByRole as Role) || undefined,
        comment: h.comment || undefined,
        attachmentUrl: h.attachmentUrl || undefined
      })),
      assignedTo: r.assignedTo ? JSON.parse(r.assignedTo) : undefined,
      validatorIds: r.validatorIds ? JSON.parse(r.validatorIds) : undefined,
      participantIds: r.participantIds ? JSON.parse(r.participantIds) : undefined,
      physicalChecklist: r.physicalChecklist ? JSON.parse(r.physicalChecklist) : undefined,
      updatedAt: r.updatedAt,
      conventionMetadata: r.signedDocumentUrl ? { 
        signedDocumentUrl: r.signedDocumentUrl,
        referenceNumber: r.referenceNumber || '',
        deanName: r.deanName || '',
        academicYear: r.academicYear || '',
        generatedAt: r.metadataGeneratedAt || Date.now()
      } as any : undefined
    };
  }

  // Records
  async getRecords(): Promise<PFERecord[]> {
    const rows = await this.query("SELECT * FROM records");
    if (rows.length === 0) return [];

    // Fetch all history entries for all records in one go
    const ids = rows.map((r: any) => r.id);
    const allHistory = await this.query(
      `SELECT * FROM record_history WHERE recordId IN (${ids.map(() => '?').join(',')}) ORDER BY updatedAt ASC`,
      ids
    );

    const historyByRecord: Record<string, any[]> = {};
    allHistory.forEach((h: any) => {
      if (!historyByRecord[h.recordId]) historyByRecord[h.recordId] = [];
      historyByRecord[h.recordId].push(h);
    });

    return rows.map((r: any) => {
      const history = historyByRecord[r.id] || [];
      
      return {
        id: r.id,
        studentId: r.studentId,
        studentName: r.studentName,
        status: r.status as any,
        data: {
          stageType: (r.stageType as any) || StageType.PFE,
          nature: (r.nature as any) || ConventionNature.PEDAGOGIE,
          isPreEmbauche: Boolean(r.isPreEmbauche),
          isRemunere: Boolean(r.isRemunere),
          isInternational: Boolean(r.isInternational),
          isBinome: Boolean(r.isBinome),
          binomeName: r.binomeName || undefined,
          binomeMassar: r.binomeMassar || undefined,
          companyName: r.companyName || '',
          address: r.address || '',
          city: r.city || '',
          postalCode: r.postalCode || '',
          duration: r.duration || '',
          startDate: r.startDate || '',
          endDate: r.endDate || '',
          tutorName: r.tutorName || '',
          tutorEmail: r.tutorEmail || '',
          tutorPhone: r.tutorPhone || '',
          fstTutorName: r.fstTutorName || '',
          fstTutorEmail: r.fstTutorEmail || '',
          subject: r.subject || '',
          insuranceUrl: r.insuranceUrl || '',
          studentId: r.studentId,
          massarCode: r.massarCode || '',
          appogeeCode: r.appogeeCode || '',
          consent: Boolean(r.consent),
          enterpriseAffirmation: Boolean(r.enterpriseAffirmation),
          department: r.department || '',
          filiere: r.filiere || '',
          semestre: r.semestre || '',
          academicYear: r.academicYear || '',
          registrationYear: r.registrationYear || '',
          currentLevel: r.currentLevel || '',
          complementUrl: r.complementUrl || undefined
        },
        conventionMetadata: {
          signedDocumentUrl: r.signedDocumentUrl || undefined,
          referenceNumber: r.id,
          deanName: '', // Will be filled by template if needed
          academicYear: r.academicYear || '',
          generatedAt: Number(r.updatedAt)
        },
        history: history.map((h: any) => ({
          status: h.status,
          updatedAt: Number(h.updatedAt),
          updatedBy: h.updatedBy,
          updatedById: h.updatedById,
          updatedByRole: h.updatedByRole as Role,
          comment: h.comment || undefined,
          attachmentUrl: h.attachmentUrl || undefined
        })),
        assignedTo: r.assignedTo ? JSON.parse(r.assignedTo) : undefined,
        participantIds: r.participantIds ? JSON.parse(r.participantIds) : undefined,
        validatorIds: r.validatorIds ? JSON.parse(r.validatorIds) : undefined,
        physicalChecklist: r.physicalChecklist ? JSON.parse(r.physicalChecklist) : undefined,
        updatedAt: Number(r.updatedAt)
      } as PFERecord;
    });
  }

  async saveRecord(r: PFERecord): Promise<void> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const columns = [
        'id', 'studentId', 'studentName', 'status', 'updatedAt',
        'assignedTo', 'validatorIds', 'participantIds', 'physicalChecklist',
        'stageType', 'nature', 'isPreEmbauche', 'isRemunere', 'isInternational', 'isBinome',
        'binomeName', 'binomeMassar', 'companyName', 'address', 'city', 'postalCode', 'duration',
        'startDate', 'endDate', 'tutorName', 'tutorEmail', 'tutorPhone', 'fstTutorName', 'fstTutorEmail',
        'subject', 'insuranceUrl',
        'massarCode', 'appogeeCode', 'department', 'filiere', 'semestre', 'academicYear',
        'registrationYear', 'currentLevel',
        'consent', 'enterpriseAffirmation', 'complementUrl',
        'signedDocumentUrl'
      ];

      const values = [
        r.id, r.studentId, r.studentName, r.status, r.updatedAt,
        r.assignedTo ? JSON.stringify(r.assignedTo) : null,
        r.validatorIds ? JSON.stringify(r.validatorIds) : null,
        r.participantIds ? JSON.stringify(r.participantIds) : null,
        r.physicalChecklist ? JSON.stringify(r.physicalChecklist) : null,
        r.data.stageType, r.data.nature, r.data.isPreEmbauche ? 1 : 0, r.data.isRemunere ? 1 : 0,
        r.data.isInternational ? 1 : 0, r.data.isBinome ? 1 : 0,
        r.data.binomeName || null, r.data.binomeMassar || null,
        r.data.companyName, r.data.address, r.data.city || null, r.data.postalCode || null, r.data.duration || null,
        r.data.startDate, r.data.endDate, r.data.tutorName, r.data.tutorEmail, r.data.tutorPhone || null,
        r.data.fstTutorName, r.data.fstTutorEmail, 
        r.data.subject,
        r.data.insuranceUrl || null,
        r.data.massarCode, r.data.appogeeCode, 
        r.data.department, r.data.filiere, r.data.semestre || '', r.data.academicYear || '',
        r.data.registrationYear || null, r.data.currentLevel || null,
        r.data.consent ? 1 : 0, r.data.enterpriseAffirmation ? 1 : 0, r.data.complementUrl || null,
        r.conventionMetadata?.signedDocumentUrl || null
      ];

      const placeholders = columns.map(() => '?').join(', ');
      const updateClause = columns
        .filter(c => c !== 'id' && c !== 'studentId')
        .map(c => `${c}=VALUES(${c})`)
        .join(', ');

      await connection.query(
        `INSERT INTO records (${columns.join(', ')}) VALUES (${placeholders})
        ON DUPLICATE KEY UPDATE ${updateClause}`,
        values
      );

      // Sync history
      await connection.query("DELETE FROM record_history WHERE recordId = ?", [r.id]);
      if (r.history && r.history.length > 0) {
        const historyData = r.history.map(h => [
          r.id, h.status, h.updatedAt, h.updatedBy, h.updatedById, h.updatedByRole || null, h.comment || null, h.attachmentUrl || null
        ]);
        await connection.query("INSERT INTO record_history (recordId, status, updatedAt, updatedBy, updatedById, updatedByRole, comment, attachmentUrl) VALUES ?", [historyData]);
      }

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  async generateNextRecordId(): Promise<string> {
    const yearSuffix = new Date().getFullYear().toString().slice(-2);
    const prefix = `FST-${yearSuffix}-`;
    const rows = await this.query("SELECT id FROM records WHERE id LIKE ?", [`${prefix}%`]);
    
    let maxNum = 1000;
    for (const row of rows) {
      const parts = row.id.split('-');
      if (parts.length === 3) {
        const num = parseInt(parts[2], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
    
    const nextNum = maxNum + 1;
    return `${prefix}${nextNum}`;
  }

  async saveRecords(records: PFERecord[]): Promise<void> {
    for (const r of records) {
      await this.saveRecord(r);
    }
  }

  async deleteRecord(id: string): Promise<void> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query("DELETE FROM record_history WHERE recordId = ?", [id]);
      await connection.query("DELETE FROM notifications WHERE recordId = ?", [id]);
      await connection.query("DELETE FROM record_locks WHERE recordId = ?", [id]);
      await connection.query("DELETE FROM records WHERE id = ?", [id]);
      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  // Config
  async getConfig(): Promise<SystemConfig | null> {
    const params = await this.query("SELECT category, value FROM system_parameters");
    const config: SystemConfig = {
      departments: [],
      filieres: [],
      semestres: [],
      niveaux: [],
      academicYears: [],
      entreprises: await this.query("SELECT * FROM entreprises")
    };

    for (const p of params) {
      if (p.category === 'department') config.departments.push(p.value);
      else if (p.category === 'filiere') config.filieres.push(p.value);
      else if (p.category === 'semestre') config.semestres.push(p.value);
      else if (p.category === 'niveau') config.niveaux.push(p.value);
      else if (p.category === 'academicYear') config.academicYears.push(p.value);
    }

    if (config.departments.length === 0 && config.filieres.length === 0) return null;
    return config;
  }

  async saveConfig(config: SystemConfig): Promise<void> {
    // We use a transaction for safety
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      await connection.query("DELETE FROM system_parameters");
      const paramData: any[] = [];
      config.departments.forEach(v => paramData.push(['department', v]));
      config.filieres.forEach(v => paramData.push(['filiere', v]));
      config.semestres.forEach(v => paramData.push(['semestre', v]));
      config.niveaux.forEach(v => paramData.push(['niveau', v]));
      config.academicYears.forEach(v => paramData.push(['academicYear', v]));
      
      if (paramData.length > 0) {
        await connection.query("INSERT INTO system_parameters (category, value) VALUES ?", [paramData]);
      }

      await connection.query("DELETE FROM entreprises");
      if (config.entreprises && config.entreprises.length > 0) {
        const entData = config.entreprises.map(e => [e.id, e.name, e.address]);
        await connection.query("INSERT INTO entreprises (id, name, address) VALUES ?", [entData]);
      }

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  // Template
  async getTemplate(): Promise<ConventionTemplate | null> {
    const row = (await this.query("SELECT * FROM convention_templates WHERE id = 1"))[0];
    if (!row) return null;

    const template: ConventionTemplate = {
      header: row.header,
      deanName: row.deanName,
      academicYear: row.academicYear,
      referencePrefix: row.referencePrefix,
      footer: row.footer,
      logoUrl: row.logoUrl,
      fontSize: row.fontSize,
      lineHeight: row.lineHeight,
      margins: {
        top: row.margin_top ?? 20,
        bottom: row.margin_bottom ?? 20,
        left: row.margin_left ?? 20,
        right: row.margin_right ?? 20
      },
      alignment: row.alignment,
      headerHeight: row.headerHeight,
      subHeaderHeight: row.subHeaderHeight,
      footerHeight: row.footerHeight,
      logoSize: row.logoSize,
      documentTitle: row.documentTitle,
      partiesIntro: row.partiesIntro,
      establishmentLabel: row.establishmentLabel,
      establishmentContent: row.establishmentContent,
      organizationLabel: row.organizationLabel,
      organizationContent: row.organizationContent,
      studentLabel: row.studentLabel,
      studentContent: row.studentContent,
      studentSignatureLabel: row.studentSignatureLabel,
      organizationSignatureLabel: row.organizationSignatureLabel,
      deanSignatureLabel: row.deanSignatureLabel,
      responsableSignatureLabel: row.responsableSignatureLabel,
      signatureMentionLu: row.signatureMentionLu,
      signatureMentionFait: row.signatureMentionFait,
      pfeArticles: [],
      pfaArticles: [],
      sections: [],
      customParams: []
    };

    const articles = await this.query("SELECT * FROM template_articles WHERE templateId = 1 ORDER BY sortOrder");
    template.pfeArticles = articles.filter((a: any) => a.type === 'PFE').map((a: any) => ({ id: a.id, title: a.title, content: a.content }));
    template.pfaArticles = articles.filter((a: any) => a.type === 'PFA').map((a: any) => ({ id: a.id, title: a.title, content: a.content }));

    const sections = await this.query("SELECT * FROM template_sections WHERE templateId = 1 ORDER BY sortOrder");
    template.sections = sections.map((s: any) => ({ id: s.id, type: s.type, order: s.sortOrder, isVisible: Boolean(s.isVisible) }));

    const params = await this.query("SELECT * FROM template_custom_params WHERE templateId = 1");
    template.customParams = params.map((p: any) => ({ id: p.id, key: p.param_key, label: p.label, value: p.value, description: p.description }));

    return template;
  }

  async saveTemplate(template: ConventionTemplate): Promise<void> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query(
        `INSERT INTO convention_templates (
          id, header, deanName, academicYear, referencePrefix, footer, logoUrl, fontSize, lineHeight,
          margin_top, margin_bottom, margin_left, margin_right, alignment, headerHeight, subHeaderHeight,
          footerHeight, logoSize, documentTitle, partiesIntro, establishmentLabel, establishmentContent,
          organizationLabel, organizationContent, studentLabel, studentContent, studentSignatureLabel,
          organizationSignatureLabel, deanSignatureLabel, responsableSignatureLabel, signatureMentionLu, 
          signatureMentionFait
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          header=VALUES(header), deanName=VALUES(deanName), academicYear=VALUES(academicYear),
          referencePrefix=VALUES(referencePrefix), footer=VALUES(footer), logoUrl=VALUES(logoUrl),
          fontSize=VALUES(fontSize), lineHeight=VALUES(lineHeight), margin_top=VALUES(margin_top),
          margin_bottom=VALUES(margin_bottom), margin_left=VALUES(margin_left), margin_right=VALUES(margin_right),
          alignment=VALUES(alignment), headerHeight=VALUES(headerHeight), subHeaderHeight=VALUES(subHeaderHeight),
          footerHeight=VALUES(footerHeight), logoSize=VALUES(logoSize), documentTitle=VALUES(documentTitle),
          partiesIntro=VALUES(partiesIntro), establishmentLabel=VALUES(establishmentLabel),
          establishmentContent=VALUES(establishmentContent), organizationLabel=VALUES(organizationLabel),
          organizationContent=VALUES(organizationContent), studentLabel=VALUES(studentLabel),
          studentContent=VALUES(studentContent), studentSignatureLabel=VALUES(studentSignatureLabel),
          organizationSignatureLabel=VALUES(organizationSignatureLabel), deanSignatureLabel=VALUES(deanSignatureLabel),
          responsableSignatureLabel=VALUES(responsableSignatureLabel), signatureMentionLu=VALUES(signatureMentionLu),
          signatureMentionFait=VALUES(signatureMentionFait)`,
        [
          1, template.header, template.deanName, template.academicYear, template.referencePrefix, template.footer,
          template.logoUrl || null, template.fontSize, template.lineHeight,
          template.margins?.top ?? 20, template.margins?.bottom ?? 20, template.margins?.left ?? 20, template.margins?.right ?? 20,
          template.alignment, template.headerHeight, template.subHeaderHeight || null, template.footerHeight,
          template.logoSize, template.documentTitle, template.partiesIntro, template.establishmentLabel,
          template.establishmentContent, template.organizationLabel, template.organizationContent,
          template.studentLabel, template.studentContent, template.studentSignatureLabel,
          template.organizationSignatureLabel, template.deanSignatureLabel, template.responsableSignatureLabel,
          template.signatureMentionLu, template.signatureMentionFait
        ]
      );

      await connection.query("DELETE FROM template_articles WHERE templateId = 1");
      const articlesData: any[] = [];
      template.pfeArticles.forEach((a, index) => articlesData.push([a.id, 1, 'PFE', a.title, a.content, index]));
      template.pfaArticles.forEach((a, index) => articlesData.push([a.id, 1, 'PFA', a.title, a.content, index]));
      if (articlesData.length > 0) {
        await connection.query("INSERT INTO template_articles (id, templateId, type, title, content, sortOrder) VALUES ?", [articlesData]);
      }

      await connection.query("DELETE FROM template_sections WHERE templateId = 1");
      if (template.sections && template.sections.length > 0) {
        const sectionsData = template.sections.map((s, index) => [s.id, 1, s.type, s.order ?? index, s.isVisible ? 1 : 0]);
        await connection.query("INSERT INTO template_sections (id, templateId, type, sortOrder, isVisible) VALUES ?", [sectionsData]);
      }

      await connection.query("DELETE FROM template_custom_params WHERE templateId = 1");
      if (template.customParams && template.customParams.length > 0) {
        const paramsData = template.customParams.map(p => [p.id, 1, p.key, p.label, p.value, p.description || null]);
        await connection.query("INSERT INTO template_custom_params (id, templateId, param_key, label, value, description) VALUES ?", [paramsData]);
      }

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  // Notifications
  async getNotifications(): Promise<Notification[]> {
    const notifications = await this.query("SELECT * FROM notifications ORDER BY createdAt DESC");
    return notifications.map((n: any) => ({
      ...n,
      isRead: Boolean(n.isRead),
      createdAt: Number(n.createdAt),
      role: (n.role as Role) || undefined
    }));
  }

  async saveNotification(n: Notification): Promise<void> {
    await this.query(
      "INSERT INTO notifications (id, userId, title, message, createdAt, isRead, type, recordId, redirectUrl, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE isRead=VALUES(isRead)",
      [n.id, n.userId, n.title, n.message, n.createdAt, n.isRead ? 1 : 0, n.type, n.recordId || null, n.redirectUrl || null, n.role || null]
    );
  }

  async saveNotifications(notifications: Notification[]): Promise<void> {
    for (const n of notifications) {
      await this.saveNotification(n);
    }
  }

  async deleteNotification(id: string): Promise<void> {
    await this.query("DELETE FROM notifications WHERE id = ?", [id]);
  }

  async markNotificationsAsReadForRecord(recordId: string): Promise<void> {
    await this.query("UPDATE notifications SET isRead = 1 WHERE recordId = ?", [recordId]);
  }

  async clearUserNotifications(userId: string): Promise<void> {
    await this.query("DELETE FROM notifications WHERE userId = ?", [userId]);
  }

  // Support Questions
  async getSupportQuestions(): Promise<SupportQuestion[]> {
    const questions = await this.query("SELECT * FROM support ORDER BY createdAt DESC");
    return questions.map((q: any) => ({
      ...q,
      isPublic: Boolean(q.isPublic),
      createdAt: Number(q.createdAt),
      answeredAt: q.answeredAt ? Number(q.answeredAt) : undefined
    }));
  }

  async saveSupportQuestion(q: SupportQuestion): Promise<void> {
    await this.query(
      "INSERT INTO support (id, userId, userName, subject, message, createdAt, status, answer, answeredBy, answeredAt, isPublic) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE status=VALUES(status), answer=VALUES(answer), answeredBy=VALUES(answeredBy), answeredAt=VALUES(answeredAt), isPublic=VALUES(isPublic)",
      [q.id, q.userId, q.userName, q.subject, q.message, q.createdAt, q.status, q.answer || null, q.answeredBy || null, q.answeredAt || null, q.isPublic ? 1 : 0]
    );
  }

  async saveSupportQuestions(questions: SupportQuestion[]): Promise<void> {
    for (const q of questions) {
      await this.saveSupportQuestion(q);
    }
  }

  async deleteSupportQuestion(id: string): Promise<void> {
    await this.query("DELETE FROM support WHERE id = ?", [id]);
  }

  // Eligibility
  async getEligibilityCriteria(): Promise<EligibilityCriteria[]> {
    const criteria = await this.query("SELECT * FROM eligibility_criteria");
    return criteria.map((c: any) => ({
      ...c,
      levels: typeof c.levels === 'string' ? JSON.parse(c.levels) : (c.levels || []),
      isActive: Boolean(c.isActive)
    }));
  }

  async saveEligibilityCriteria(criteria: EligibilityCriteria[]): Promise<void> {
    await this.query("DELETE FROM eligibility_criteria");
    for (const c of criteria) {
      await this.query(
        "INSERT INTO eligibility_criteria (id, type, nature, levels, description, isActive) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE levels=VALUES(levels), description=VALUES(description), isActive=VALUES(isActive)",
        [c.id, c.type, c.nature, JSON.stringify(c.levels), c.description || null, c.isActive ? 1 : 0]
      );
    }
  }

  async getEligibilityOverrides(): Promise<EligibilityOverride[]> {
    const overrides = await this.query("SELECT * FROM eligibility_overrides");
    return overrides.map((o: any) => ({
      ...o,
      authorizedAt: Number(o.authorizedAt)
    }));
  }

  async saveEligibilityOverrides(overrides: EligibilityOverride[]): Promise<void> {
    await this.query("DELETE FROM eligibility_overrides");
    for (const o of overrides) {
      await this.query(
        "INSERT INTO eligibility_overrides (id, studentId, studentName, type, nature, reason, authorizedBy, authorizedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE reason=VALUES(reason)",
        [o.id, o.studentId, o.studentName, o.type, o.nature, o.reason, o.authorizedBy, o.authorizedAt]
      );
    }
  }

  async clearUserOverrides(studentId: string): Promise<void> {
    await this.query("DELETE FROM eligibility_overrides WHERE studentId = ?", [studentId]);
  }

  // Record Locks
  async getLock(recordId: string): Promise<any | null> {
    const locks = await this.query("SELECT * FROM record_locks WHERE recordId = ?", [recordId]);
    if (!locks || locks.length === 0) return null;
    const lock = locks[0];
    // Auto-expire locks older than 5 minutes
    if (Date.now() - Number(lock.lockedAt) > 5 * 60 * 1000) {
      await this.deleteLock(recordId);
      return null;
    }
    return { ...lock, lockedAt: Number(lock.lockedAt) };
  }

  async setLock(recordId: string, userId: string, userName: string): Promise<void> {
    await this.query(
      "INSERT INTO record_locks (recordId, userId, userName, lockedAt) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE userId=VALUES(userId), userName=VALUES(userName), lockedAt=VALUES(lockedAt)",
      [recordId, userId, userName, Date.now()]
    );
  }

  async deleteLock(recordId: string): Promise<void> {
    await this.query("DELETE FROM record_locks WHERE recordId = ?", [recordId]);
  }

  async clearUserLocks(userId: string): Promise<void> {
    await this.query("DELETE FROM record_locks WHERE userId = ?", [userId]);
  }
}

export const storage = new Storage();
