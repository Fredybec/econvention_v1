
import React, { useState, useEffect, createContext, useContext, useCallback, useMemo, useRef } from 'react';
import { User, Role, PFERecord, WorkflowStatus, ConventionMetadata, ConventionTemplate, ConventionArticle, HistoryEntry, StageData, Entreprise, EncadrantFST, Notification, SupportQuestion, EligibilityCriteria, EligibilityOverride, StageType, ConventionNature, SystemConfig } from '../types';
import { io, Socket } from 'socket.io-client';
import { 
  getStoredRecords, saveRecords, getStoredUsers, saveUsers, 
  getStoredNotifications, saveNotifications, 
  getStoredSupportQuestions, saveSupportQuestions,
  getEligibilityCriteria, saveEligibilityCriteria,
  getEligibilityOverrides, saveEligibilityOverrides,
  deleteRecordApi,
  addRecordApi, saveRecord, deleteUserApi, addUserApi, saveUserApi,
  addNotificationApi, markNotificationReadApi, clearNotificationsApi,
  addSupportQuestionApi, updateSupportQuestionApi, deleteSupportQuestionApi,
  bulkUpdateRecordsApi
} from '../services/storage';
import { fetchSystemConfig, saveSystemConfig, fetchTemplateConfig, saveTemplateConfig } from '../services/configService';
import { canApprove } from '../utils/workflow';
import { getAcademicYear } from '../utils/dateUtils';

import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup, onAuthStateChanged } from 'firebase/auth';
import bcrypt from 'bcryptjs';

const safeSetItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.error(`Storage quota exceeded for key: ${key}`, e);
  }
};

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
  token: string | null;
  setToken: React.Dispatch<React.SetStateAction<string | null>>;
  records: PFERecord[];
  setRecords: React.Dispatch<React.SetStateAction<PFERecord[]>>;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  entreprises: Entreprise[];
  setEntreprises: React.Dispatch<React.SetStateAction<Entreprise[]>>;
  encadrantsFST: EncadrantFST[];
  template: ConventionTemplate;
  setTemplate: React.Dispatch<React.SetStateAction<ConventionTemplate>>;
  updateTemplate: (data: Partial<ConventionTemplate>) => void;
  systemConfig: SystemConfig;
  setSystemConfig: React.Dispatch<React.SetStateAction<SystemConfig>>;
  updateSystemConfig: (data: Partial<SystemConfig>) => void;
  isConfigLoading: boolean;
  viewMode: 'list' | 'kanban';
  setViewMode: React.Dispatch<React.SetStateAction<'list' | 'kanban'>>;
  notifications: Notification[];
  addNotification: (notif: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) => void;
  markAsRead: (id: string) => void;
  clearNotifications: () => void;
  login: (email: string, password?: string) => User | null;
  loginWithGoogle: () => Promise<User | null>;
  isAuthLoading: boolean;
  logout: () => void;
  addUser: (user: Omit<User, 'id'>) => void;
  removeUser: (id: string) => void;
  updateUser: (id: string, data: Partial<User>) => void;
  addEntreprise: (ent: Omit<Entreprise, 'id'>) => void;
  addEncadrantFST: (enc: Omit<EncadrantFST, 'id'>) => void;
  showAlert: (title: string, message: string, variant?: string) => void;
  globalAlert: { isOpen: boolean, title: string, message: string, variant: string };
  setGlobalAlert: React.Dispatch<React.SetStateAction<{ isOpen: boolean, title: string, message: string, variant: string }>>;
  updateRecordStatus: (id: string, status: WorkflowStatus, comment?: string, metadata?: ConventionMetadata, attachment?: string, applyStamp?: boolean, data?: Partial<StageData>) => void;
  revertRecordStatus: (id: string) => void;
  checkEligibility: (user: User) => { isEligible: boolean, missingDocs: string[] };
  getNextRecordId: (currentId: string, status: WorkflowStatus) => string | null;
  updateRecord: (id: string, data: any) => void;
  updatePhysicalChecklist: (id: string, data: Partial<PFERecord['physicalChecklist']>) => void;
  addRecord: (record: Omit<PFERecord, 'id'>) => void;
  updateRecordData: (id: string, data: Partial<StageData>) => void;
  addComment: (recordId: string, comment: string) => void;
  resetDatabase: () => void;
  supportQuestions: SupportQuestion[];
  sendSupportQuestion: (subject: string, message: string) => void;
  answerSupportQuestion: (questionId: string, answer: string, isPublic?: boolean) => void;
  deleteSupportQuestion: (questionId: string) => void;
  deleteRecord: (recordId: string) => Promise<void>;
  addSupportFAQ: (subject: string, message: string, answer: string) => void;
  findById: (id: string) => PFERecord | undefined;
  eligibilityCriteria: EligibilityCriteria[];
  setEligibilityCriteria: React.Dispatch<React.SetStateAction<EligibilityCriteria[]>>;
  eligibilityOverrides: EligibilityOverride[];
  setEligibilityOverrides: React.Dispatch<React.SetStateAction<EligibilityOverride[]>>;
  addEligibilityOverride: (override: Omit<EligibilityOverride, 'id' | 'authorizedAt' | 'authorizedBy'>) => void;
  removeEligibilityOverride: (id: string) => void;
  updateEligibilityCriteria: (id: string, data: Partial<EligibilityCriteria>) => void;
  isStudentEligible: (user: User) => boolean;
  getStudentEligibilityInfo: (user: User) => { type: StageType, nature: ConventionNature } | null;
  activeRole: Role | null;
  setActiveRole: (role: Role) => void;
  currentPortal: 'student' | 'admin' | 'superadmin' | null;
  updateCurrentPortal: (portal: 'student' | 'admin' | 'superadmin' | null) => void;
  lockRecord: (id: string) => void;
  unlockRecord: (id: string) => void;
  getLock: (id: string) => Promise<any | null>;
  socket: Socket | null;
  joinRecord: (id: string) => void;
  leaveRecord: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [globalAlert, setGlobalAlert] = useState<{ isOpen: boolean, title: string, message: string, variant: string, isPriority?: boolean }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'info',
    isPriority: false
  });

  const showAlert = useCallback((title: string, message: string, variant: string = 'info', isPriority: boolean = false) => {
    setGlobalAlert({ isOpen: true, title, message, variant, isPriority });
  }, []);

  const [systemConfig, setSystemConfig] = useState<SystemConfig>({
    departments: [],
    filieres: [],
    semestres: [],
    niveaux: [],
    academicYears: [],
    entreprises: []
  });

  const [isConfigLoading, setIsConfigLoading] = useState(true);

  const entreprises = systemConfig.entreprises;

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('fst_pfe_token'));

  useEffect(() => {
    if (token) {
      localStorage.setItem('fst_pfe_token', token);
    } else {
      localStorage.removeItem('fst_pfe_token');
    }
  }, [token]);

  const [records, setRecords] = useState<PFERecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [template, setTemplate] = useState<ConventionTemplate>({} as ConventionTemplate);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState({
    records: false,
    users: false,
    notifications: false,
    support: false,
    criteria: false,
    overrides: false,
    config: false,
    template: false
  });

  const encadrantsFST = useMemo(() => {
    return users
      .filter(u => u.roles?.includes(Role.ENCADRANT_FST))
      .map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        department: u.department || 'Inconnu'
      }));
  }, [users]);

  useEffect(() => {
    let isCanceled = false;
    const loadSession = async () => {
      if (!token) {
        setIsDataLoading(false);
        setCurrentUser(null);
        return;
      }

      setIsAuthLoading(true);
      try {
        const response = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (isCanceled) return;

        if (response.ok) {
          const user = await response.json();
          setCurrentUser(user);
        } else if (response.status === 401 || response.status === 403) {
          // Token expired or invalid
          setToken(null);
          setCurrentUser(null);
          localStorage.removeItem('fst_pfe_token');
        } else {
          // Other error, maybe server is restarting?
          // We can just log it and not clear the token yet to allow retry or manual refresh
          console.warn(`Auth session check failed with status: ${response.status}`);
        }
      } catch (err) {
        if (isCanceled) return;
        console.error("Failed to check auth session", err);
        // If it's a network error, it might be transient
      } finally {
        if (!isCanceled) setIsAuthLoading(false);
      }
    };

    loadSession();
    return () => { isCanceled = true; };
  }, [token]);

  useEffect(() => {
    const loadData = async () => {
      // If NOT logged in, we don't load anything (including public users)
      if (!currentUser || !token) {
        setIsDataLoading(false);
        return;
      }
      
      setIsDataLoading(true);
      try {
        const fetchPromises: Promise<any>[] = [
          getStoredRecords(token),
          getStoredNotifications(token),
          getStoredSupportQuestions(token),
          getEligibilityCriteria(token),
          getEligibilityOverrides(token),
          fetchSystemConfig(token),
          fetchTemplateConfig(token)
        ];

        // Only fetch users if the user has appropriate roles
        const canViewUsers = currentUser.roles.includes(Role.SUPERADMIN) || currentUser.roles.includes(Role.SCOLARITE);
        
        const [
          remoteRecords, 
          remoteNotifications, 
          remoteSupport, 
          remoteCriteria, 
          remoteOverrides,
          remoteSystemConfig,
          remoteTemplate
        ] = await Promise.all(fetchPromises);

        // Try to fetch all users if privileged, otherwise fetch public list
        let remoteUsers: User[] = [];
        if (canViewUsers) {
          try {
            remoteUsers = await getStoredUsers(token);
          } catch (userErr) {
            console.error("Failed to fetch all users", userErr);
          }
        } else {
          // Fetch public info for selection lists (like encadrants)
          try {
            const response = await fetch('/api/public/users', {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
              remoteUsers = await response.json();
            }
          } catch (publicUserErr) {
            console.error("Failed to fetch public users", publicUserErr);
          }
        }

        if (remoteRecords) {
          setRecords(remoteRecords);
          setDataLoaded(prev => ({ ...prev, records: true }));
        }
        if (remoteUsers && remoteUsers.length > 0) {
          setUsers(remoteUsers);
          setDataLoaded(prev => ({ ...prev, users: true }));
        }
        if (remoteNotifications) {
          setNotifications(remoteNotifications);
          setDataLoaded(prev => ({ ...prev, notifications: true }));
        }
        if (remoteSupport) {
          setSupportQuestions(remoteSupport);
          setDataLoaded(prev => ({ ...prev, support: true }));
        }
        if (remoteCriteria) {
          setEligibilityCriteria(remoteCriteria);
          setDataLoaded(prev => ({ ...prev, criteria: true }));
        }
        if (remoteOverrides) {
          setEligibilityOverrides(remoteOverrides);
          setDataLoaded(prev => ({ ...prev, overrides: true }));
        }
        if (remoteSystemConfig) {
          setSystemConfig(remoteSystemConfig);
          setDataLoaded(prev => ({ ...prev, config: true }));
        }
        if (remoteTemplate) {
          setDataLoaded(prev => ({ ...prev, template: true }));
          // Migration for articles: from string[] to ConventionArticle[]
          const migrateArticles = (articles: any[]): ConventionArticle[] => {
            if (!articles || articles.length === 0) return [];
            return articles.map((art, idx) => {
              if (typeof art === 'string') {
                const lines = art.split('\n');
                // Check if the first line looks like a title (e.g. starts with Article or is short)
                const firstLine = lines[0].trim();
                const likelyTitle = firstLine.length < 100 && (firstLine.toLowerCase().startsWith('article') || firstLine.includes(':'));
                
                let title = likelyTitle ? firstLine : `Article ${idx + 1}`;
                
                // Clean up title if it contains "Article X :" prefix
                if (title.toLowerCase().startsWith('article')) {
                  const colonIdx = title.indexOf(':');
                  if (colonIdx !== -1 && colonIdx < 20) {
                    title = title.substring(colonIdx + 1).trim();
                  } else {
                    // Try removing leading "Article N"
                    const cleaned = title.replace(/^article\s*\d+\s*/i, '').trim();
                    if (cleaned) title = cleaned;
                  }
                }
                
                return {
                  id: `art_mig_${idx}_${Date.now()}`,
                  title: title,
                  content: likelyTitle ? lines.slice(1).join('\n').trim() : art.trim()
                };
              }
              return art;
            });
          };

          const migratedTemplate = {
            ...remoteTemplate,
            pfaArticles: migrateArticles(remoteTemplate.pfaArticles),
            pfeArticles: migrateArticles(remoteTemplate.pfeArticles)
          };
          setTemplate(migratedTemplate);
        }

      } catch (err) {
        console.error("Failed to load backend data", err);
        showAlert("Erreur", "Impossible de charger les données du serveur.", "error");
      } finally {
        setIsDataLoading(false);
      }
    };

    loadData();
  }, [currentUser, token, showAlert]);

  const updateSystemConfig = useCallback(async (data: Partial<SystemConfig>) => {
    setSystemConfig(prev => {
      const newConfig = { ...prev, ...data };
      saveSystemConfig(newConfig, token).catch(err => {
        console.error("Failed to save system config", err);
        showAlert("Erreur", "Impossible de sauvegarder la configuration système.", "error");
      });
      return newConfig;
    });
  }, [showAlert, token]);

  const updateTemplate = useCallback(async (data: Partial<ConventionTemplate>) => {
    setTemplate(prev => {
      const newTemplate = { ...prev, ...data };
      saveTemplateConfig(newTemplate, token).catch(err => {
        console.error("Failed to save template", err);
        showAlert("Erreur", "Impossible de sauvegarder le template.", "error");
      });
      return newTemplate;
    });
  }, [showAlert, token]);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [currentPortal, setCurrentPortal] = useState<'student' | 'admin' | 'superadmin' | null>(() => {
    return localStorage.getItem('pfe_current_portal') as any;
  });
  const [activeRole, setActiveRoleState] = useState<Role | null>(() => {
    const saved = localStorage.getItem('fst_active_role');
    return saved as Role || null;
  });

  const setActiveRole = useCallback((role: Role) => {
    setActiveRoleState(role);
    safeSetItem('fst_active_role', role);
  }, []);

  useEffect(() => {
    if (currentUser && currentUser.roles && currentUser.roles.length > 0) {
      if (!activeRole || !currentUser.roles.includes(activeRole)) {
        setActiveRole(currentUser.roles[0]);
      }
    } else if (!currentUser && activeRole) {
      setActiveRoleState(null);
    }
  }, [currentUser, activeRole, setActiveRole]);

  const [supportQuestions, setSupportQuestions] = useState<SupportQuestion[]>([]);
  const [eligibilityCriteria, setEligibilityCriteria] = useState<EligibilityCriteria[]>([]);
  const [eligibilityOverrides, setEligibilityOverrides] = useState<EligibilityOverride[]>([]);
  const [isAuthLoading, setIsAuthLoading] = useState(!!localStorage.getItem('fst_pfe_token'));
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Socket initialization
  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      return;
    }

    const newSocket = io({
      auth: { token }
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on("record-updated", (updatedRecord: PFERecord) => {
      setRecords(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
    });

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [token]);

  // Polling for real-time synchronization
  useEffect(() => {
    if (!token || !currentUser || !dataLoaded.records) return;

    let timerId: NodeJS.Timeout;
    let failureCount = 0;
    const MAX_FAILURES = 5;

    const poll = async () => {
      try {
        const remoteRecords = await getStoredRecords(token);
        if (remoteRecords) {
          setRecords(remoteRecords);
        }
        failureCount = 0; // Reset on success
      } catch (err) {
        failureCount++;
        console.error(`Polling attempt ${failureCount} failed`, err);
        
        if (failureCount >= MAX_FAILURES) {
          console.warn("Max polling failures reached. Polling stopped.");
          return; // Stop polling
        }
      }
      
      // Schedule next poll even on failure (unless max reached)
      timerId = setTimeout(poll, 10000); // 10 seconds interval
    };

    timerId = setTimeout(poll, 10000);

    return () => clearTimeout(timerId);
  }, [token, currentUser, dataLoaded.records]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      // We only use this to keep track of the Firebase session for the popup
      // but we DON'T use it to manage our app's currentUser state automatically
      // because we have our own JWT-based auth and database.
      if (!firebaseUser) {
        // If they sign out of Google, we stay logged in to our app 
        // unless they explicitly logout.
      }
    });
    return () => unsubscribe();
  }, []);

  // Backend Syncing Effects
  // Data is now saved incrementally via specialized API calls in each action function.

  const updateEligibilityCriteria = useCallback(async (id: string, data: Partial<EligibilityCriteria>) => {
    setEligibilityCriteria(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    try {
      const next = eligibilityCriteria.map(c => c.id === id ? { ...c, ...data } : c);
      await saveEligibilityCriteria(next, token);
    } catch (err) {
      console.error("Failed to update criteria", err);
    }
  }, [eligibilityCriteria, token]);

  const addEligibilityCriteria = useCallback(async (criteria: Omit<EligibilityCriteria, 'id'>) => {
    const newCriteria: EligibilityCriteria = {
      ...criteria,
      id: `crit_${Date.now()}`
    };
    setEligibilityCriteria(prev => {
      const next = [...prev, newCriteria];
      saveEligibilityCriteria(next, token);
      return next;
    });
  }, [token]);

  const removeEligibilityCriteria = useCallback(async (id: string) => {
    setEligibilityCriteria(prev => {
      const next = prev.filter(c => c.id !== id);
      saveEligibilityCriteria(next, token);
      return next;
    });
  }, [token]);

  const addEligibilityOverride = useCallback(async (override: Omit<EligibilityOverride, 'id' | 'authorizedAt' | 'authorizedBy'>) => {
    const newOverride: EligibilityOverride = {
      ...override,
      id: `ovr_${Date.now()}`,
      authorizedAt: Date.now(),
      authorizedBy: currentUser?.name || 'Super Admin'
    };
    setEligibilityOverrides(prev => [...prev, newOverride]);
    // Save to backend
    const currentOverrides = [...eligibilityOverrides, newOverride];
    await saveEligibilityOverrides(currentOverrides, token);
  }, [currentUser, eligibilityOverrides, token]);

  const removeEligibilityOverride = useCallback(async (id: string) => {
    const next = eligibilityOverrides.filter(o => o.id !== id);
    setEligibilityOverrides(next);
    await saveEligibilityOverrides(next, token);
  }, [eligibilityOverrides, token]);

  const isStudentEligible = useCallback((user: User) => {
    // 1. Check for manual override
    const hasOverride = eligibilityOverrides.some(o => o.studentId === user.id || o.studentId === user.email);
    if (hasOverride) return true;

    // 2. Check automatic criteria based on currentLevel
    if (!user.currentLevel) return false;

    return eligibilityCriteria.some(c => 
      c.isActive && c.levels.some(level => {
        const lowerLevel = level.toLowerCase().trim();
        const lowerUserLevel = (user.currentLevel || '').toLowerCase().trim();
        return lowerUserLevel === lowerLevel || 
               lowerUserLevel.includes(lowerLevel) || 
               lowerLevel.includes(lowerUserLevel);
      })
    );
  }, [eligibilityCriteria, eligibilityOverrides]);

  const getStudentEligibilityInfo = useCallback((user: User): { type: StageType, nature: ConventionNature } | null => {
    // 1. Check for manual override first
    const override = eligibilityOverrides.find(o => o.studentId === user.id || o.studentId === user.email);
    if (override) {
      return { type: override.type, nature: override.nature };
    }

    // 2. Check automatic criteria
    if (!user.currentLevel) return null;

    const criteria = eligibilityCriteria.find(c => 
      c.isActive && c.levels.some(level => {
        const lowerLevel = level.toLowerCase().trim();
        const lowerUserLevel = (user.currentLevel || '').toLowerCase().trim();
        return lowerUserLevel === lowerLevel || 
               lowerUserLevel.includes(lowerLevel) || 
               lowerLevel.includes(lowerUserLevel);
      })
    );

    if (criteria) {
      return { type: criteria.type, nature: criteria.nature };
    }

    return null;
  }, [eligibilityCriteria, eligibilityOverrides]);

  const login = useCallback(async (email: string, password?: string): Promise<User | null> => {
    setIsAuthLoading(true);
    try {
      console.log(`Attempting login for ${email.trim()}...`);
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Échec de la connexion");
      }

      console.log("Login successful, setting token and user.");
      setToken(data.token);
      setCurrentUser(data.user);
      return data.user;
    } catch (err: any) {
      console.error("Login error:", err);
      showAlert("Erreur d'authentification", err.message, "error");
      return null;
    } finally {
      setIsAuthLoading(false);
    }
  }, [showAlert]);

  const loginWithGoogle = useCallback(async (): Promise<User | null> => {
    setIsAuthLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const email = result.user.email;
      
      if (!email) throw new Error("No email returned from Google");

      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email.trim(),
          name: result.user.displayName,
          photoUrl: result.user.photoURL
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Accès refusé");
      }

      const { token, user } = await response.json();
      setToken(token);
      setCurrentUser(user);
      return user;
    } catch (error: any) {
      let errorMessage = error.message || "Une erreur est survenue lors de la connexion Google.";
      
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = "La fenêtre de connexion a été fermée.";
      }

      showAlert("Erreur de connexion", errorMessage, "error");
      return null;
    } finally {
      setIsAuthLoading(false);
    }
  }, [showAlert]);

  const logout = useCallback(async () => { 
    auth.signOut();
    setCurrentUser(null); 
    setToken(null);
    setCurrentPortal(null);
    setActiveRoleState(null);
    setRecords([]);
    setNotifications([]);
    setSupportQuestions([]);
    localStorage.clear(); // Clear EVERYTHING to be safe
  }, []);

  const updateCurrentPortal = useCallback((portal: 'student' | 'admin' | 'superadmin') => {
    setCurrentPortal(portal);
    safeSetItem('pfe_current_portal', portal);
  }, []);

  const addUser = useCallback(async (user: Omit<User, 'id'>) => {
    // Check if email already exists
    const existingUser = users.find(u => u.email.toLowerCase() === user.email.toLowerCase());
    if (existingUser) {
      showAlert("Erreur", "Un utilisateur avec cet email existe déjà.", "error");
      return false;
    }
    
    const userToSave = { ...user };
    if (userToSave.password && !userToSave.password.startsWith('$2')) {
      userToSave.password = bcrypt.hashSync(userToSave.password, 10);
    }
    
    const newUser = { ...userToSave, id: `user_${Date.now()}` } as User;
    
    try {
      const savedUser = await addUserApi(newUser, token);
      setUsers(prev => [...prev, savedUser]);
      showAlert("Succès", "L'utilisateur a été ajouté avec succès.", "success");
      return true;
    } catch (err) {
      console.error("Add user failed:", err);
      showAlert("Erreur", "Impossible de sauvegarder l'utilisateur sur le serveur.", "error");
      return false;
    }
  }, [users, showAlert, token]);

  const removeUser = useCallback(async (id: string) => {
    try {
      await deleteUserApi(id, token);
      setUsers(prev => prev.filter(u => u.id !== id));
      showAlert("Succès", "L'utilisateur a été supprimé.", "success");
      return true;
    } catch (err) {
      console.error("Delete user failed:", err);
      showAlert("Erreur", "Impossible de supprimer l'utilisateur du serveur.", "error");
      return false;
    }
  }, [showAlert, token]);

  const updateUser = useCallback(async (id: string, data: Partial<User>) => {
    const userToUpdate = users.find(u => u.id === id);
    if (!userToUpdate) return false;

    const previousUsers = [...users];
    const previousCurrentUser = currentUser ? { ...currentUser } : null;

    // Use the full object if provided, or merge if partial
    // The user requested to send the full modified object
    const updatedUser = { ...userToUpdate, ...data };
    
    // Hash password client-side if it's changing and not already hashed
    if (data.password && !data.password.startsWith('$2')) {
      updatedUser.password = bcrypt.hashSync(data.password, 10);
    }
    
    // Update local state first for responsiveness
    setUsers(prev => prev.map(u => u.id === id ? updatedUser : u));
    if (currentUser?.id === id) {
      setCurrentUser(updatedUser);
    }

    try {
      await saveUserApi(updatedUser, token);
      showAlert("Succès", "Le profil a été mis à jour.", "success");
      return true;
    } catch (err) {
      console.error("Failed to update user on server:", err);
      // Revert state on failure
      setUsers(previousUsers);
      if (previousCurrentUser && previousCurrentUser.id === id) {
        setCurrentUser(previousCurrentUser);
      }
      showAlert("Erreur", "Impossible de mettre à jour le profil sur le serveur. Vérifiez que l'email n'est pas déjà utilisé.", "error");
      return false;
    }
  }, [users, currentUser, showAlert, token]);

  const addEntreprise = useCallback((ent: Omit<Entreprise, 'id'>) => {
    const newEnt = { ...ent, id: `ent_${Date.now()}` };
    updateSystemConfig({ entreprises: [...entreprises, newEnt] });
  }, [entreprises, updateSystemConfig]);

  const addEncadrantFST = useCallback((enc: Omit<EncadrantFST, 'id'>) => {
    // This is now handled by addUser with Role.ENCADRANT_FST
    addUser({
      name: enc.name,
      email: enc.email,
      roles: [Role.ENCADRANT_FST],
      department: enc.department
    });
  }, [addUser]);

  const addNotification = useCallback(async (notif: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) => {
    const newNotifBase = {
      ...notif,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      isRead: false
    };

    setNotifications(prev => [newNotifBase as Notification, ...prev]);
    
    try {
      await addNotificationApi(newNotifBase, token);
    } catch (err) {
      console.error("Failed to save notification to server", err);
    }
  }, [token]);

  const markAsRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    try {
      await markNotificationReadApi(id, token);
    } catch (err) {
      console.error("Failed to mark notification read on server", err);
    }
  }, [token]);

  const clearNotifications = useCallback(async () => {
    setNotifications(prev => prev.filter(n => n.userId !== currentUser?.id));
    try {
      await clearNotificationsApi(token);
    } catch (err) {
      console.error("Failed to clear notifications on server", err);
    }
  }, [currentUser, token]);

  const updateRecordStatus = useCallback(async (id: string, status: WorkflowStatus, comment?: string, metadata?: ConventionMetadata, attachment?: string, applyStamp?: boolean, data?: Partial<StageData>) => {
    // 1. Find the current record from the state to get the latest data
    const recordToUpdate = records.find(r => r.id === id);
    if (!recordToUpdate) return;
    
    // Merge data if provided
    const recordData = data ? { ...recordToUpdate.data, ...data } : recordToUpdate.data;

    // 2. Strict workflow enforcement for non-superadmins
    if (currentUser && !currentUser.roles?.includes(Role.SUPERADMIN)) {
      const lastStatus = recordToUpdate.history.slice().reverse().find(h => h.status !== WorkflowStatus.COMPLEMENT_REQUIRED)?.status;
      const canAct = canApprove(recordToUpdate.status, currentUser.roles || [], currentUser.department, recordToUpdate.data.department, lastStatus, undefined, undefined, recordToUpdate.data.stageType);
      
      if (!canAct) {
        const currentStatusLabel = recordToUpdate.status;
        showAlert('Action impossible', `Vous ne pouvez pas modifier ce dossier. Statut actuel : ${currentStatusLabel}. Votre rôle (${currentUser.roles?.[0]}) n'a pas les droits pour cette transition vers "${status}".`, 'warning');
        return;
      }
    }

    // 3. Prepare history entry
    const historyEntry: HistoryEntry = { 
      status, 
      updatedBy: currentUser?.name || 'Système', 
      updatedById: currentUser?.id || 'system',
      updatedByRole: currentUser?.roles?.[0],
      updatedAt: Date.now(), 
      comment, 
      attachmentUrl: attachment
    };

    // 4. Calculate assignments
    let predictedAssignedTo = (currentUser && !currentUser.roles?.includes(Role.STUDENT)) 
      ? Array.from(new Set([...(recordToUpdate.assignedTo || []), currentUser.id])) 
      : recordToUpdate.assignedTo;
    
    // Track participants
    const participantIds = Array.from(new Set([
      ...(recordToUpdate.participantIds || []),
      currentUser?.id || 'system'
    ]));

    // Auto-assign responsibly for specific statuses
    if (status === WorkflowStatus.PENDING_RESPONSABLE) {
      const responsaIds = users
        .filter(u => u.roles?.includes(Role.CHEF_DEPARTEMENT))
        .filter(u => {
          if (!u.department) return true;
          const userDept = u.department.trim().toLowerCase();
          const targetDept = (recordToUpdate.data.department || '').trim().toLowerCase();
          return userDept === targetDept;
        })
        .map(u => u.id);
      if (responsaIds.length > 0) {
        predictedAssignedTo = Array.from(new Set([...predictedAssignedTo, ...responsaIds]));
      }
    }

    // 5. Create updated record object
    const updatedRecord: PFERecord = { 
      ...recordToUpdate, 
      status, 
      data: recordData,
      history: [...recordToUpdate.history, historyEntry], 
      participantIds,
      conventionMetadata: metadata || recordToUpdate.conventionMetadata,
      validatorIds: {
        ...(recordToUpdate.validatorIds || {}),
        [activeRole as string]: currentUser?.id || ''
      },
      assignedTo: predictedAssignedTo,
    };

    // Auto-update physical checklist flags
    if (status === WorkflowStatus.PENDING_TRANSFER_DOYEN) {
      updatedRecord.physicalChecklist = { ...updatedRecord.physicalChecklist, isTransferredToDoyen: true };
    } else if (status === WorkflowStatus.SIGNED_EN_ROUTE) {
      updatedRecord.physicalChecklist = { ...updatedRecord.physicalChecklist, isReturnedFromDoyen: true };
    } else if (status === WorkflowStatus.READY_FOR_PICKUP) {
      updatedRecord.physicalChecklist = { ...updatedRecord.physicalChecklist, isReadyForPickup: true };
    }

    // 6. Update local state
    setRecords(prev => prev.map(r => r.id === id ? updatedRecord : r));

    // 7. Persist to server
    try {
      await saveRecord(updatedRecord, token);
      
      // Update local state ONLY after successful server save
      setRecords(prev => prev.map(r => r.id === id ? updatedRecord : r));

      // Delete/clear out old draft/awaiting document notifications for encadrant when Chef Dept validates
      if (recordToUpdate.status === WorkflowStatus.PENDING_RESPONSABLE) {
        const matchingNotifs = notifications.filter(n => n.recordId === id && !n.isRead);
        if (matchingNotifs.length > 0) {
          setNotifications(prev => prev.map(n => n.recordId === id ? { ...n, isRead: true } : n));
          for (const notif of matchingNotifs) {
            try {
              await markNotificationReadApi(notif.id, token);
            } catch (err) {
              console.error("Failed to mark notification read in bulk/by chef dept validation on server", err);
            }
          }
        }
      }

      // Trigger notifications after successful save
      // 1. Notify student of status change
      if (updatedRecord.studentId !== currentUser?.id) {
        let customMessage = `Votre convention ${updatedRecord.id} est passée au statut : ${status}`;
        if (status === WorkflowStatus.READY_FOR_PICKUP) {
          customMessage = `Votre convention ${updatedRecord.id} est prête ! Vous pouvez passer la récupérer au Service Recherche.`;
        }
        
        addNotification({
          userId: updatedRecord.studentId,
          title: status === WorkflowStatus.READY_FOR_PICKUP ? 'Convention prête pour retrait' : 'Mise à jour de dossier',
          message: `${customMessage}${comment ? `. Commentaire : ${comment}` : ''}`,
          type: status === WorkflowStatus.READY_FOR_PICKUP ? 'success' : 'status_change',
          recordId: updatedRecord.id
        });
      }

      // 2. Notify next roles
      if (status !== WorkflowStatus.COMPLEMENT_REQUIRED && status !== WorkflowStatus.DRAFT) {
        users.forEach(u => {
          if (u.id === currentUser?.id) return;
          if (u.id === updatedRecord.studentId) return;

          if (updatedRecord.assignedTo && updatedRecord.assignedTo.length > 0 && !updatedRecord.assignedTo.includes(u.id)) {
            return;
          }

          const isMatchingEncadrant = u.roles.includes(Role.ENCADRANT_FST) && 
                                    u.email.toLowerCase() === updatedRecord.data.fstTutorEmail.toLowerCase();

          if (isMatchingEncadrant || canApprove(
            status, 
            u.roles, 
            u.department, 
            updatedRecord.data.department, 
            undefined, 
            updatedRecord.data.fstTutorEmail, 
            u.email,
            updatedRecord.data.stageType,
            updatedRecord.data.nature
          )) {
            addNotification({
              userId: u.id,
              title: isMatchingEncadrant ? 'Nouveau dossier assigné' : 'Dossier à traiter',
              message: isMatchingEncadrant 
                ? `L'étudiant ${updatedRecord.studentName} a soumis son dossier. Statut actuel: ${status}.`
                : `Le dossier de ${updatedRecord.studentName} est en attente de votre validation (${status}).`,
              type: 'info',
              recordId: id
            });
          }
        });
      }
      return updatedRecord;
    } catch (err: any) {
      console.error("Failed to save record status update", err);
      if (err.message.includes("locked by another user")) {
        const match = err.message.match(/locked by (.+)/);
        const lockedBy = match ? match[1] : "un autre utilisateur";
        throw new Error(`treated_by_another:${lockedBy}`);
      }
      showAlert("Erreur", `Impossible de sauvegarder : ${err.message}`, "error");
      throw err;
    }
  }, [records, currentUser, showAlert, token, addNotification, users, notifications]);

  const bulkUpdateRecordStatus = useCallback(async (updates: { id: string, status: WorkflowStatus, comment?: string }[]) => {
    if (!token) return;
    
    // We want to avoid separate network calls for every record if possible, 
    // but updateRecordStatus also handles notifications and history.
    // So we'll prepare the full record updates first, then send one bulk request.
    
    const recordUpdates: any[] = [];
    const now = Date.now();
    
    for (const update of updates) {
      const record = records.find(r => r.id === update.id);
      if (!record) continue;

      const newHistory = [...record.history, {
        status: update.status,
        updatedAt: now,
        updatedBy: currentUser?.name || 'Système',
        updatedById: currentUser?.id || 'system',
        updatedByRole: currentUser?.roles?.[0] || Role.SUPPORT,
        comment: update.comment
      }];

      const participantIds = Array.from(new Set([
        ...(record.participantIds || []),
        currentUser?.id || 'system'
      ]));

      recordUpdates.push({
        id: record.id,
        status: update.status,
        history: newHistory,
        participantIds,
        updatedAt: now
      });
      
      // We also need to send notifications - for simplicity in this bulk process, 
      // we'll send them individually (as they are usually small/few)
      // or we could bulk them too if we had a bulk notifications API.
      // But for now, let's just make the record update efficient.
    }

    if (recordUpdates.length > 0) {
      try {
        await bulkUpdateRecordsApi(recordUpdates, token);
        // Refresh local state
        const updatedRecords = records.map(r => {
          const up = recordUpdates.find(u => u.id === r.id);
          if (up) return { ...r, ...up };
          return r;
        });
        setRecords(updatedRecords);
      } catch (err) {
        console.error("Bulk update failed:", err);
        throw err;
      }
    }
  }, [records, currentUser, token]);

  const revertRecordStatus = useCallback(async (id: string) => {
    if (currentUser?.roles?.[0] !== Role.SUPERADMIN) {
      showAlert('Accès refusé', 'Seul le superadmin peut revenir en arrière sur les états.', 'error');
      return;
    }
    
    const record = records.find(r => r.id === id);
    if (!record || record.history.length < 2) return;

    const newHistory = [...record.history];
    newHistory.pop();
    const lastEntry = newHistory[newHistory.length - 1];
    const updatedRecord = { ...record, status: lastEntry.status, history: newHistory };
    
    setRecords(prev => prev.map(r => r.id === id ? updatedRecord : r));
    
    try {
      await saveRecord(updatedRecord, token);
      showAlert('Succès', 'Statut rétabli.', 'success');
    } catch (err) {
      showAlert('Erreur', 'Impossible de sauvegarder le rétablissement.', 'error');
    }
  }, [currentUser, showAlert, token, records]);

  const updatePhysicalChecklist = useCallback(async (id: string, data: Partial<PFERecord['physicalChecklist']>) => {
    const record = records.find(r => r.id === id);
    if (!record) return;

    const updatedRecord = { 
      ...record, 
      physicalChecklist: { ...(record.physicalChecklist || {}), ...data } 
    };
    
    setRecords(prev => prev.map(r => r.id === id ? updatedRecord : r));
    
    try {
      await saveRecord(updatedRecord, token);
    } catch (err) {
      showAlert("Erreur", "Impossible de mettre à jour la checklist physique.", "error");
    }
  }, [token, showAlert, records]);

  const checkEligibility = useCallback((user: User) => {
    const isEligibleCriteria = isStudentEligible(user);
    const info = getStudentEligibilityInfo(user);
    
    const missingDocs = user.roles.includes(Role.STUDENT) && !user.massarCode ? ['Code Massar manquant'] : [];
    const isEligible = isEligibleCriteria && missingDocs.length === 0;
    
    const updatedUserBase = { 
      isEligible, 
      lastEligibilityCheck: Date.now(),
      eligibleType: info?.type,
      eligibleNature: info?.nature
    };

    setUsers(prev => {
      return prev.map(u => 
        u.id === user.id 
          ? { ...u, ...updatedUserBase } 
          : u
      );
    });

    const fullUpdatedUser = { ...user, ...updatedUserBase };
    // Persist to backend if token available
    if (token) {
      saveUserApi(fullUpdatedUser, token).catch(err => console.error("Failed to persist eligibility check to server", err));
    }

    setCurrentUser(prev => {
      if (prev && prev.id === user.id) {
        const updated = { ...prev, ...updatedUserBase };
        return updated;
      }
      return prev;
    });
    
    return { isEligible, missingDocs };
  }, [isStudentEligible, getStudentEligibilityInfo, users, token]);

  const getNextRecordId = useCallback((currentId: string, status: WorkflowStatus) => {
    const pendingRecords = records.filter(r => r.status === status && r.id !== currentId);
    return pendingRecords.length > 0 ? pendingRecords[0].id : null;
  }, [records]);

  const updateRecord = useCallback(async (id: string, updates: any) => {
    const recordToUpdate = records.find(r => r.id === id);
    if (!recordToUpdate) return;

    const { status, ...dataUpdates } = updates;
    const finalStatus = status || recordToUpdate.status;
    const statusChanged = status && status !== recordToUpdate.status;

    // Ensure academicYear is present
    if (!dataUpdates.academicYear && !recordToUpdate.data.academicYear) {
      dataUpdates.academicYear = systemConfig.academicYears?.[0] || getAcademicYear();
    }

    let predictedAssignedTo = statusChanged ? [] : (recordToUpdate.assignedTo || []);
    
    // Add current processor
    if (currentUser && !currentUser.roles?.includes(Role.STUDENT)) {
      predictedAssignedTo = Array.from(new Set([...predictedAssignedTo, currentUser.id]));
    }

    const participantIds = Array.from(new Set([
      ...(recordToUpdate.participantIds || []),
      currentUser?.id || 'system'
    ]));

    if (finalStatus === WorkflowStatus.PENDING_RESPONSABLE) {
      const responsaIds = users
        .filter(u => u.roles?.includes(Role.CHEF_DEPARTEMENT))
        .filter(u => {
          if (!u.department) return true;
          const userDept = u.department.trim().toLowerCase();
          const targetDept = (updates.department || recordToUpdate.data.department || '').trim().toLowerCase();
          return userDept === targetDept;
        })
        .map(u => u.id);
      if (responsaIds.length > 0) {
        predictedAssignedTo = Array.from(new Set([...predictedAssignedTo, ...responsaIds]));
      }
    }

    if (finalStatus === WorkflowStatus.DRAFT) {
      const encadrantEmail = (updates.fstTutorEmail || recordToUpdate.data.fstTutorEmail);
      if (encadrantEmail) {
        const encadrant = users.find(u => u.email.toLowerCase() === encadrantEmail.toLowerCase());
        if (encadrant) {
          predictedAssignedTo = Array.from(new Set([...predictedAssignedTo, encadrant.id]));
        }
      }
    }

    let newHistory = [...recordToUpdate.history];
    if (statusChanged) {
      newHistory.push({
        status: finalStatus,
        updatedBy: currentUser?.name || 'Système',
        updatedById: currentUser?.id || 'system',
        updatedByRole: currentUser?.roles?.[0],
        updatedAt: Date.now(),
        comment: 'Mise à jour des informations'
      });
    }

    const updatedRecord: PFERecord = { 
      ...recordToUpdate, 
      status: finalStatus,
      history: newHistory,
      participantIds,
      data: { ...recordToUpdate.data, ...dataUpdates },
      validatorIds: {
        ...(recordToUpdate.validatorIds || {}),
        [activeRole as string]: currentUser?.id || ''
      },
      assignedTo: predictedAssignedTo,
    };

    setRecords(prev => prev.map(r => r.id === id ? updatedRecord : r));

    try {
      await saveRecord(updatedRecord, token);

      // Delete/clear out old draft/awaiting document notifications for encadrant when Chef Dept validates
      if (recordToUpdate.status === WorkflowStatus.PENDING_RESPONSABLE && updatedRecord.status !== WorkflowStatus.PENDING_RESPONSABLE) {
        const matchingNotifs = notifications.filter(n => n.recordId === id && !n.isRead);
        if (matchingNotifs.length > 0) {
          setNotifications(prev => prev.map(n => n.recordId === id ? { ...n, isRead: true } : n));
          for (const notif of matchingNotifs) {
            try {
              await markNotificationReadApi(notif.id, token);
            } catch (err) {
              console.error("Failed to mark notification read on validation by chef dept in updateRecord", err);
            }
          }
        }
      }
      
      if (statusChanged) {
        // Notify student
        if (updatedRecord.studentId !== currentUser?.id) {
          addNotification({
            userId: updatedRecord.studentId,
            title: 'Mise à jour de dossier',
            message: `Votre convention ${updatedRecord.id} est passée au statut : ${updatedRecord.status}`,
            type: 'status_change',
            recordId: id,
            role: Role.STUDENT
          });
        }
      }

      // Notify next roles
      if (updatedRecord.status !== WorkflowStatus.COMPLEMENT_REQUIRED) {
        users.forEach(u => {
          if (u.id === currentUser?.id) return;
          if (u.id === updatedRecord.studentId) return;

          if (updatedRecord.assignedTo && updatedRecord.assignedTo.length > 0 && !updatedRecord.assignedTo.includes(u.id)) return;

          const isMatchingEncadrant = u.roles.includes(Role.ENCADRANT_FST) && 
                                     u.email.toLowerCase() === updatedRecord.data.fstTutorEmail.toLowerCase();

          if (isMatchingEncadrant && updatedRecord.status === WorkflowStatus.DRAFT) {
            addNotification({
              userId: u.id,
              title: 'Nouveau Brouillon',
              message: `${updatedRecord.studentName} a enregistré un brouillon de convention.`,
              type: 'info',
              recordId: id,
              role: Role.ENCADRANT_FST
            });
            return;
          }

          if (canApprove(
            updatedRecord.status, 
            u.roles, 
            u.department, 
            updatedRecord.data.department, 
            undefined, 
            updatedRecord.data.fstTutorEmail, 
            u.email,
            updatedRecord.data.stageType,
            updatedRecord.data.nature
          )) {
            // Determine which role of this user is being notified
            const targetRole = u.roles.find(r => canApprove(updatedRecord.status, [r], u.department, updatedRecord.data.department, undefined, updatedRecord.data.fstTutorEmail, u.email, updatedRecord.data.stageType, updatedRecord.data.nature));

            addNotification({
              userId: u.id,
              title: 'Dossier à traiter',
              message: `Le dossier de ${updatedRecord.studentName} est en attente de votre validation (${updatedRecord.status}).`,
              type: 'info',
              recordId: id,
              role: targetRole
            });
          }
        });
      }
    } catch (err) {
      showAlert("Erreur", "Impossible de sauvegarder les modifications.", "error");
    }
  }, [currentUser, users, addNotification, token, showAlert, records, notifications]);

  const updateRecordData = useCallback(async (id: string, data: Partial<StageData>) => {
    const recordId = id;
    const record = records.find(r => r.id === recordId);
    if (!record) return;

    // Check permissions: SuperAdmin OR (Student Owner AND allowed status)
    if (currentUser?.roles?.includes(Role.SUPERADMIN)) {
      // Allowed
    } else {
      const isOwner = record.studentId === currentUser?.id;
      const isModifiableStatus = [
        WorkflowStatus.DRAFT, 
        WorkflowStatus.COMPLEMENT_REQUIRED, 
        WorkflowStatus.PENDING_INSURANCE,
        WorkflowStatus.PENDING_STUDENT_SIGNATURE
      ].includes(record.status);

      if (!isOwner || !isModifiableStatus) {
        showAlert('Accès refusé', 'Vous n\'avez pas les permissions pour modifier les données de cette convention.', 'error');
        return;
      }
    }

    const updatedRecord = { ...record, data: { ...record.data, ...data } };
    
    setRecords(prev => prev.map(r => 
      r.id === recordId ? updatedRecord : r
    ));
    
    try {
      await saveRecord(updatedRecord, token);
      showAlert('Succès', 'Les données de la convention ont été mises à jour.', 'success');
    } catch (err) {
      showAlert('Erreur', 'Impossible de sauvegarder les modifications de données.', 'error');
    }
  }, [currentUser, showAlert, records, token]);

  const addRecord = useCallback(async (record: Omit<PFERecord, 'id'>) => {
    // Check if student already has a record in the same academic year
    const existingRecord = records.find(r => r.studentId === record.studentId && r.data.academicYear === record.data.academicYear);
    if (existingRecord) {
      showAlert('Vérification Annuelle', `Un dossier existe déjà pour l'année universitaire ${record.data.academicYear} (Réf: ${existingRecord.id}). Conformément au règlement, un étudiant ne peut soumettre qu'une seule convention par année académique.`, 'warning');
      return;
    }

    const newId = `FST-${new Date().getFullYear().toString().slice(-2)}-${1000 + records.length + 1}`;
    
    // Auto-assignment for Responsable de Stage (now mapped to Encadrant FST)
    let assignedTo = record.assignedTo || [];
    if (record.status === WorkflowStatus.PENDING_RESPONSABLE) {
      const responsaIds = users
        .filter(u => u.roles?.includes(Role.CHEF_DEPARTEMENT))
        .filter(u => {
          if (!u.department) return true;
          const userDept = u.department.trim().toLowerCase();
          const targetDept = (record.data.department || '').trim().toLowerCase();
          return userDept === targetDept;
        })
        .map(u => u.id);
      
      if (responsaIds.length > 0) {
        assignedTo = [...new Set([...assignedTo, ...responsaIds])];
      }
    }

    if (record.status === WorkflowStatus.DRAFT) {
      const encadrantEmail = record.data.fstTutorEmail;
      if (encadrantEmail) {
        const encadrant = users.find(u => u.email.toLowerCase() === encadrantEmail.toLowerCase());
        if (encadrant) {
          assignedTo = [...new Set([...assignedTo, encadrant.id])];
        }
      }
    }

    const newRecord = { 
      ...record, 
      id: newId, 
      assignedTo,
      validatorIds: record.validatorIds || {}
    } as PFERecord;

    // Ensure academicYear is present
    if (!newRecord.data.academicYear) {
      newRecord.data.academicYear = systemConfig.academicYears?.[0] || getAcademicYear();
    }

    try {
      const savedRecord = await addRecordApi(newRecord, token);
      setRecords(prev => [savedRecord, ...prev]);

      const adminRoles = [
        Role.SCOLARITE, Role.SERVICE_RECHERCHE_COOP, 
        Role.SECRETARIAT_DOYEN, Role.VICE_DOYEN_RECHERCHE, Role.VICE_DOYEN_PEDAGOGIE,
        Role.SUPERADMIN, Role.ENCADRANT_FST, Role.CHEF_DEPARTEMENT
      ];
      
      users.filter(u => {
        const hasAdminRole = u.roles?.some(r => adminRoles.includes(r));
        if (!hasAdminRole) return false;
        
        if (record.status === WorkflowStatus.DRAFT) {
          return u.roles?.includes(Role.ENCADRANT_FST) && 
                 u.email.toLowerCase() === record.data.fstTutorEmail.toLowerCase();
        }
        
        return canApprove(record.status, u.roles, u.department, record.data.department, undefined, record.data.fstTutorEmail, u.email, record.data.stageType, record.data.nature);
      }).forEach(admin => {
        const isDraft = record.status === WorkflowStatus.DRAFT;
        const targetRole = admin.roles.find(r => {
          if (isDraft) return r === Role.ENCADRANT_FST && admin.email.toLowerCase() === record.data.fstTutorEmail.toLowerCase();
          return canApprove(record.status, [r], admin.department, record.data.department, undefined, record.data.fstTutorEmail, admin.email, record.data.stageType, record.data.nature);
        });

        addNotification({
          userId: admin.id,
          title: isDraft ? 'Nouveau Brouillon' : 'Nouveau Dossier',
          message: isDraft 
            ? `${record.studentName} a enregistré un brouillon de convention.`
            : `Un nouveau dossier de stage a été soumis par ${record.studentName}.`,
          type: 'info',
          recordId: newId,
          role: targetRole
        });
      });
      showAlert("Succès", "Le dossier a été créé avec succès.", "success");
    } catch (err) {
      console.error("Failed to create record", err);
      showAlert("Erreur", "Impossible de créer le dossier sur le serveur.", "error");
    }
  }, [records, users, addNotification, token, showAlert]);

  const addComment = useCallback(async (recordId: string, comment: string) => {
    const record = records.find(r => r.id === recordId);
    if (!record) return;

    const historyEntry: HistoryEntry = { 
      status: record.status, 
      updatedBy: currentUser?.name || 'Système', 
      updatedById: currentUser?.id || 'system',
      updatedByRole: currentUser?.roles?.[0],
      updatedAt: Date.now(), 
      comment
    };

    const participantIds = Array.from(new Set([
      ...(record.participantIds || []),
      currentUser?.id || 'system'
    ]));

    const updatedRecord: PFERecord = { 
      ...record, 
      history: [...record.history, historyEntry],
      participantIds 
    };

    setRecords(prev => prev.map(r => 
      r.id === recordId ? updatedRecord : r
    ));

    try {
      await saveRecord(updatedRecord, token);

      if (currentUser) {
        // If student replies, notify encadrant
        if (currentUser.roles?.includes(Role.STUDENT)) {
          const encadrant = users.find(u => u.email.toLowerCase() === record.data.fstTutorEmail.toLowerCase());
          if (encadrant) {
            addNotification({
              userId: encadrant.id,
              title: 'Nouveau commentaire (Étudiant)',
              message: `${currentUser.name} a répondu à un commentaire sur le dossier ${record.id}`,
              type: 'comment',
              recordId: record.id,
              role: Role.ENCADRANT_FST
            });
          }
        } else {
          // If someone else comments, notify student
          const isEncadrant = currentUser.roles?.includes(Role.ENCADRANT_FST);
          addNotification({
            userId: record.studentId,
            title: isEncadrant ? 'Nouvelle observation (Encadrant)' : 'Nouveau commentaire',
            message: `${currentUser.name} a ajouté un commentaire sur votre dossier ${record.id}`,
            type: 'comment',
            recordId: record.id,
            role: Role.STUDENT
          });
        }
      }
    } catch (err) {
      console.error("Failed to add comment", err);
      showAlert("Erreur", "Impossible de sauvegarder le commentaire.", "error");
    }
  }, [currentUser, addNotification, users, records, token, showAlert]);

  const sendSupportQuestion = useCallback(async (subject: string, message: string) => {
    if (!currentUser) return;
    const newQuestion: Partial<SupportQuestion> = {
      id: `q_${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      subject,
      message,
      createdAt: Date.now(),
      status: 'pending'
    };
    
    try {
      const saved = await addSupportQuestionApi(newQuestion, token);
      setSupportQuestions(prev => [saved, ...prev]);
      
      // Notify Support and Superadmin
      users.filter(u => u.roles?.some(r => r === Role.SUPPORT || r === Role.SUPERADMIN))
        .forEach(admin => {
          addNotification({
            userId: admin.id,
            title: 'Nouvelle question support',
            message: `${currentUser.name} a envoyé une question : ${subject}`,
            type: 'info',
            redirectUrl: '/support-questions'
          });
        });

      showAlert("Succès", "Votre question a été envoyée au support technique.", "success");
    } catch (err) {
      showAlert("Erreur", "Impossible d'envoyer votre question.", "error");
    }
  }, [currentUser, showAlert, token, users, addNotification]);

  const answerSupportQuestion = useCallback(async (questionId: string, answer: string, isPublic: boolean = false) => {
    if (!currentUser) return;
    
    const update = {
      answer,
      status: 'answered' as const,
      answeredBy: currentUser.name,
      answeredAt: Date.now(),
      isPublic
    };

    setSupportQuestions(prev => {
      const question = prev.find(q => q.id === questionId);
      if (question) {
        addNotification({
          userId: question.userId,
          title: 'Réponse à votre question',
          message: `Le support a répondu à votre question : "${question.subject}"`,
          type: 'info',
          redirectUrl: '/support'
        });
      }
      return prev.map(q => q.id === questionId ? { ...q, ...update } : q);
    });

    try {
      await updateSupportQuestionApi(questionId, update, token);
      showAlert("Succès", "Réponse envoyée avec succès.", "success");
    } catch (err) {
      showAlert("Erreur", "Impossible d'enregistrer la réponse.", "error");
    }
  }, [currentUser, showAlert, token, addNotification]);

  const deleteSupportQuestion = useCallback(async (questionId: string) => {
    setSupportQuestions(prev => prev.filter(q => q.id !== questionId));
    try {
      await deleteSupportQuestionApi(questionId, token);
      showAlert("Succès", "Question supprimée.", "success");
    } catch (err) {
      showAlert("Erreur", "Impossible de supprimer la question.", "error");
    }
  }, [showAlert, token]);

  const deleteRecord = useCallback(async (recordId: string) => {
    try {
      await deleteRecordApi(recordId, token);
      setRecords(prev => prev.filter(r => r.id !== recordId));
      showAlert("Succès", "Dossier supprimé définitivement.", "success");
    } catch (err) {
      console.error("Failed to delete record", err);
      showAlert("Erreur", "Impossible de supprimer le dossier sur le serveur.", "error");
    }
  }, [token, showAlert]);

  const findById = useCallback((id: string) => {
    return records.find(r => r.id === id);
  }, [records]);

  const addSupportFAQ = useCallback((subject: string, message: string, answer: string) => {
    if (!currentUser) return;
    const newFAQ: SupportQuestion = {
      id: `faq_${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      subject,
      message,
      createdAt: Date.now(),
      status: 'answered',
      answer,
      answeredBy: currentUser.name,
      answeredAt: Date.now(),
      isPublic: true
    };
    setSupportQuestions(prev => [newFAQ, ...prev]);
    showAlert("Succès", "FAQ ajoutée avec succès.", "success");
  }, [currentUser, showAlert]);

  const resetDatabase = useCallback(() => {
    localStorage.clear();
    window.location.reload();
  }, []);

  const getLock = useCallback(async (id: string) => {
    if (!token) return null;
    try {
      const { getRecordLock } = await import('../services/storage');
      return await getRecordLock(id, token);
    } catch (err) {
      console.error("Failed to get lock", err);
      return null;
    }
  }, [token]);

  const joinRecord = useCallback((id: string) => {
    if (socketRef.current) {
      socketRef.current.emit("join-record", id);
    }
  }, []);

  const leaveRecord = useCallback((id: string) => {
    if (socketRef.current) {
      socketRef.current.emit("leave-record", id);
    }
  }, []);

  const lockRecord = useCallback((id: string) => {
    if (socketRef.current && currentUser) {
      socketRef.current.emit("lock-record", id, currentUser.name);
    }
  }, [currentUser]);

  const unlockRecord = useCallback((id: string) => {
    if (socketRef.current) {
      socketRef.current.emit("unlock-record", id);
    }
  }, []);

  const value = useMemo(() => ({
    currentUser, setCurrentUser,
    records, setRecords,
    users, setUsers,
    entreprises,
    encadrantsFST,
    template, setTemplate, updateTemplate,
    viewMode, setViewMode,
    notifications, addNotification, markAsRead, clearNotifications,
    login, loginWithGoogle, isAuthLoading, logout,
    addUser, removeUser, updateUser,
    addEntreprise, addEncadrantFST,
    showAlert, globalAlert, setGlobalAlert,
    updateRecordStatus, bulkUpdateRecordStatus, revertRecordStatus,
    checkEligibility, getNextRecordId,
    updateRecord, addRecord,
    updateRecordData,
    addComment,
    updatePhysicalChecklist,
    resetDatabase,
    supportQuestions,
    sendSupportQuestion,
    answerSupportQuestion,
    deleteSupportQuestion,
    deleteRecord,
    findById,
    addSupportFAQ,
    eligibilityCriteria,
    setEligibilityCriteria,
    eligibilityOverrides,
    setEligibilityOverrides,
    addEligibilityOverride,
    removeEligibilityOverride,
    addEligibilityCriteria,
    removeEligibilityCriteria,
    updateEligibilityCriteria,
    isStudentEligible,
    getStudentEligibilityInfo,
    activeRole,
    setActiveRole,
    currentPortal,
    updateCurrentPortal,
    systemConfig,
    updateSystemConfig,
    isConfigLoading,
    getLock,
    lockRecord,
    unlockRecord,
    socket,
    joinRecord,
    leaveRecord
  }), [
    currentUser, records, users, encadrantsFST, template, updateTemplate, viewMode,
    notifications, addNotification, markAsRead, clearNotifications, login, loginWithGoogle, logout,
    addUser, removeUser, updateUser, addEntreprise, addEncadrantFST, showAlert, globalAlert,
    updateRecordStatus, bulkUpdateRecordStatus, revertRecordStatus,
    checkEligibility, getNextRecordId, updateRecord, addRecord, updateRecordData, addComment, updatePhysicalChecklist,
    resetDatabase, supportQuestions, sendSupportQuestion, answerSupportQuestion, deleteSupportQuestion, deleteRecord, findById, addSupportFAQ,
    eligibilityCriteria, eligibilityOverrides, addEligibilityOverride, removeEligibilityOverride, 
    addEligibilityCriteria, removeEligibilityCriteria, updateEligibilityCriteria, isStudentEligible,
    activeRole, setActiveRole, currentPortal, updateCurrentPortal, isAuthLoading,
    systemConfig, updateSystemConfig, isConfigLoading,
    getLock, lockRecord, unlockRecord, socket, joinRecord, leaveRecord
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
