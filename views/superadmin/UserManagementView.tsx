import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronRight, Search, FileText, Trash2, Plus, X, ArrowLeft,
  Users, GraduationCap, FileUp, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../../context/AppContext';
import { User, Role, StageType } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ConfirmModal } from '../../components/shared/ConfirmModal';

export const UserManagementView = () => {
  const navigate = useNavigate();
  const { users, addUser, removeUser, updateUser, checkEligibility, currentUser, systemConfig, showAlert } = useAppContext();
  const [activeTab, setActiveTab] = useState<'personnel' | 'etudiants'>('personnel');
  const [newUser, setNewUser] = useState<{prenom: string, nom: string, email: string, password?: string, roles: Role[], department: string, massarCode?: string, appogeeCode?: string, currentLevel?: string}>({ 
    prenom: '', 
    nom: '', 
    email: '',
    password: '',
    roles: [Role.ENCADRANT_FST], 
    department: systemConfig.departments[0] || '',
    massarCode: '',
    appogeeCode: '',
    currentLevel: ''
  });
  const [filterRole, setFilterRole] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkData, setBulkData] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const generateEmail = (prenom: string, nom: string, isStudent: boolean, massarCode?: string) => {
    if (!prenom || !nom) return '';
    const p = prenom.trim().toLowerCase().charAt(0);
    const n = nom.trim().toLowerCase().replace(/\s+/g, '.');
    if (isStudent && massarCode && massarCode.length >= 4) {
      const m = massarCode.trim().slice(-4);
      return `${p}.${n}${m}@uca.ac.ma`;
    }
    return `${p}.${n}@uca.ac.ma`;
  };

  // Update generated email when prenom, nom or massarCode changes
  React.useEffect(() => {
    if (newUser.prenom && newUser.nom) {
      const generated = generateEmail(
        newUser.prenom, 
        newUser.nom, 
        activeTab === 'etudiants', 
        newUser.massarCode
      );
      setNewUser(prev => ({ ...prev, email: generated }));
    }
  }, [newUser.prenom, newUser.nom, newUser.massarCode, activeTab]);

  const needsDepartment = (roles: Role[]) => 
    roles.includes(Role.ENCADRANT_FST) || roles.includes(Role.CHEF_DEPARTEMENT);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.prenom || !newUser.nom || !newUser.email) return;
    
    const name = `${newUser.prenom.trim()} ${newUser.nom.trim()}`;
    
    const roles = activeTab === 'etudiants' ? [Role.STUDENT] : newUser.roles;
    
    if (roles.length === 0) return;

    const userToAdd = {
      name,
      email: newUser.email,
      roles,
      department: needsDepartment(roles) ? newUser.department : undefined,
      massarCode: activeTab === 'etudiants' ? newUser.massarCode : undefined,
      appogeeCode: activeTab === 'etudiants' ? newUser.appogeeCode : undefined,
      currentLevel: activeTab === 'etudiants' ? newUser.currentLevel : undefined,
      password: newUser.password || undefined
    };
    
    addUser(userToAdd);
    setNewUser({ prenom: '', nom: '', email: '', password: '', roles: [Role.ENCADRANT_FST], department: systemConfig.departments[0] || '', massarCode: '', appogeeCode: '', currentLevel: '' });
    setCurrentPage(1);
  };

  const handleBulkAdd = () => {
    if (!bulkData.trim()) return;
    
    const lines = bulkData.split('\n').filter(l => l.trim());
    const roles = activeTab === 'etudiants' ? [Role.STUDENT] : newUser.roles;
    
    if (roles.length === 0) return;

    let count = 0;
    lines.forEach(line => {
      const parts = line.trim().split(/\s+/);
      
      if (activeTab === 'etudiants') {
        // Format: Massar Appogee Prenom Nom Level...
        if (parts.length >= 5) {
          const massarCode = parts[0];
          const appogeeCode = parts[1];
          const prenom = parts[2];
          const nom = parts[3];
          const currentLevel = parts.slice(4).join(' ');
          const email = generateEmail(prenom, nom, true, massarCode);
          const name = `${prenom} ${nom}`;
          
          addUser({
            name,
            email,
            roles,
            department: needsDepartment(roles) ? newUser.department : undefined,
            massarCode,
            appogeeCode,
            currentLevel
          });
          count++;
        }
      } else {
        // Format: Prenom Nom...
        if (parts.length >= 2) {
          const prenom = parts[0];
          const nom = parts.slice(1).join(' ');
          const email = generateEmail(prenom, nom, false);
          const name = `${prenom} ${nom}`;
          
          addUser({
            name,
            email,
            roles,
            department: needsDepartment(roles) ? newUser.department : undefined
          });
          count++;
        }
      }
    });
    
    setBulkData('');
    setIsBulkModalOpen(false);
    setCurrentPage(1);
    showAlert("Succès", `${count} utilisateurs ont été importés avec succès.`, "success");
  };

  const toggleRole = (role: Role) => {
    setNewUser(prev => {
      if (prev.roles.includes(role)) {
        return { ...prev, roles: prev.roles.filter(r => r !== role) };
      } else {
        return { ...prev, roles: [...prev.roles, role] };
      }
    });
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEdit) return;
    
    // We send the full userToEdit object which contains all fields
    // We just need to handle the password specially
    const userToSave = { ...userToEdit };
    
    // If password is clear/empty in the edit form, we don't send it to the update 
    // to signal we want to keep the existing one. 
    // The server/context logic handles the "if missing, keep existing" part.
    if (!userToSave.password || userToSave.password.trim() === '') {
      delete userToSave.password;
    }

    // Ensure departement logic is applied if roles changed in the UI
    if (!needsDepartment(userToSave.roles)) {
      userToSave.department = undefined;
    }
    
    updateUser(userToEdit.id, userToSave);
    setUserToEdit(null);
  };

  const toggleEditRole = (role: Role) => {
    if (!userToEdit) return;
    setUserToEdit(prev => {
      if (!prev) return null;
      if (prev.roles.includes(role)) {
        return { ...prev, roles: prev.roles.filter(r => r !== role) };
      } else {
        return { ...prev, roles: [...prev.roles, role] };
      }
    });
  };

  const filteredUsers = users.filter(u => {
    const isStudent = u.roles?.includes(Role.STUDENT);
    const matchesTab = activeTab === 'etudiants' ? isStudent : !isStudent;
    if (!matchesTab) return false;

    const matchesRole = filterRole === 'all' || u.roles?.includes(filterRole as Role);
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (u.massarCode && u.massarCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (u.appogeeCode && u.appogeeCode.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesRole && matchesSearch;
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="container mx-auto px-4 md:px-6 pt-8 md:pt-12 pb-48 md:pb-64 max-w-6xl space-y-8 md:space-y-12 text-left animate-in fade-in transition-colors duration-300">
      <header className="space-y-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              if (window.history.state && window.history.state.idx > 0) {
                navigate(-1);
              } else {
                navigate('/dashboard');
              }
            }}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-[10px] font-bold uppercase tracking-widest"
          >
            <ArrowLeft size={14} /> Retour
          </button>
          <div className="space-y-1">
            <h2 className="text-3xl md:text-4xl text-foreground tracking-tighter uppercase font-medium">Gestion des Utilisateurs</h2>
            <p className="text-muted-foreground text-[10px] uppercase tracking-widest font-bold">Administration & Éligibilité</p>
          </div>
        </div>

        <div className="flex gap-2 p-1 bg-muted rounded-2xl w-fit">
          <button 
            onClick={() => { setActiveTab('personnel'); setCurrentPage(1); }}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest transition-all ${activeTab === 'personnel' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Users size={14} />
            Personnel & Staff
          </button>
          <button 
            onClick={() => { setActiveTab('etudiants'); setCurrentPage(1); }}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest transition-all ${activeTab === 'etudiants' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <GraduationCap size={14} />
            Étudiants
          </button>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input 
                type="text" 
                placeholder="Rechercher..." 
                className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-2xl text-xs outline-none focus:border-primary"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            {activeTab === 'personnel' && (
              <select 
                className="px-4 py-3 bg-card border border-border rounded-2xl text-[10px] uppercase font-bold tracking-widest outline-none"
                value={filterRole}
                onChange={e => setFilterRole(e.target.value)}
              >
                <option key="role-all" value="all">Tous les rôles</option>
                {Object.values(Role).filter(r => r !== Role.STUDENT).map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            )}
          </div>
          <Button 
            onClick={() => setIsBulkModalOpen(true)}
            variant="outline"
            className="w-full md:w-auto py-3 px-6 rounded-2xl uppercase text-[10px] tracking-widest font-bold border-2 border-border hover:border-primary"
          >
            <FileUp size={16} className="mr-2" /> Importation en Masse
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
        <div className="lg:col-span-1">
          <Card className="p-6 md:p-8 border-0 shadow-2xl rounded-[2rem] md:rounded-[2.5rem] bg-card space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-primary border-b border-border pb-4">
              {activeTab === 'etudiants' ? 'Ajouter un Étudiant' : 'Ajouter un Personnel'}
            </h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Prénom</label>
                  <input required className="w-full p-3 bg-muted border border-border rounded-xl outline-none focus:border-primary text-foreground text-xs" value={newUser.prenom} onChange={e => setNewUser({...newUser, prenom: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Nom</label>
                  <input required className="w-full p-3 bg-muted border border-border rounded-xl outline-none focus:border-primary text-foreground text-xs" value={newUser.nom} onChange={e => setNewUser({...newUser, nom: e.target.value})} />
                </div>
              </div>

              {activeTab === 'etudiants' && (
                <>
                  <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-2">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Code Massar</label>
                      <input required className="w-full p-3 bg-muted border border-border rounded-xl outline-none focus:border-primary text-foreground text-xs" value={newUser.massarCode} onChange={e => setNewUser({...newUser, massarCode: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Code Appogee</label>
                      <input required className="w-full p-3 bg-muted border border-border rounded-xl outline-none focus:border-primary text-foreground text-xs" value={newUser.appogeeCode} onChange={e => setNewUser({...newUser, appogeeCode: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-1 animate-in slide-in-from-top-2">
                    <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Niveau Actuel</label>
                    <select required className="w-full p-3 bg-muted border border-border rounded-xl outline-none focus:border-primary text-foreground text-xs" value={newUser.currentLevel} onChange={e => setNewUser({...newUser, currentLevel: e.target.value})}>
                      <option key="level-none" value="">Sélectionner un niveau</option>
                      {systemConfig.niveaux.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </>
              )}

              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Email (Modifiable)</label>
                <input 
                  required 
                  type="email"
                  className="w-full p-3 bg-muted border border-border rounded-xl outline-none focus:border-primary text-primary text-xs font-mono" 
                  value={newUser.email} 
                  onChange={e => setNewUser({...newUser, email: e.target.value})} 
                />
                <p className="text-[8px] text-muted-foreground px-1">L'email est généré automatiquement mais peut être modifié.</p>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest flex items-center justify-between">
                  Mot de passe (Facultatif)
                  <span className="text-[7px] text-primary lowercase font-normal italic">sera hashé & sécurisé</span>
                </label>
                <input 
                  type="password"
                  placeholder="Laisser vide pour Google Auth"
                  className="w-full p-3 bg-muted border border-border rounded-xl outline-none focus:border-primary text-foreground text-xs" 
                  value={newUser.password || ''} 
                  onChange={e => setNewUser({...newUser, password: e.target.value})} 
                />
              </div>

              {activeTab === 'personnel' && (
                <div className="space-y-2">
                  <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Rôles</label>
                  <div className="grid grid-cols-1 gap-2 p-3 bg-muted border border-border rounded-xl">
                    {Object.values(Role).filter(r => r !== Role.STUDENT).map(r => (
                      <label key={r} className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={newUser.roles.includes(r)} 
                          onChange={() => toggleRole(r)}
                          className="w-4 h-4 accent-primary"
                        />
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">{r}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {needsDepartment(activeTab === 'etudiants' ? [Role.STUDENT] : newUser.roles) && (
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Département / Affectation</label>
                  <select required className="w-full p-3 bg-muted border border-border rounded-xl outline-none focus:border-primary text-foreground text-xs" value={newUser.department} onChange={e => setNewUser({...newUser, department: e.target.value})}>
                    <option key="dept-none" value="">Sélectionner un département</option>
                    {systemConfig.departments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              )}

              <Button type="submit" className="w-full py-4 rounded-xl uppercase text-[10px] tracking-widest font-bold shadow-lg mt-4">Enregistrer</Button>
            </form>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card rounded-[2rem] md:rounded-[2.5rem] shadow-xl border border-border overflow-hidden">
            <div className="w-full">
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="p-6 text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Utilisateur</th>
                      <th className="p-6 text-[10px] uppercase font-bold tracking-widest text-muted-foreground hidden sm:table-cell">
                        {activeTab === 'etudiants' ? 'Niveau / Identifiants' : 'Rôle / Dép.'}
                      </th>
                      <th className="p-6 text-[10px] uppercase font-bold tracking-widest text-muted-foreground text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y border-border">
                    {paginatedUsers.map(user => (
                      <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold uppercase text-sm">{user.name[0]}</div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-foreground uppercase tracking-tight truncate max-w-[200px]">{user.name}</p>
                              <p className="text-[10px] text-muted-foreground font-mono truncate">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-6 hidden sm:table-cell">
                          {activeTab === 'etudiants' ? (
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-primary">{user.currentLevel || 'Niveau non défini'}</p>
                              <p className="text-[9px] font-medium text-muted-foreground">Massar: {user.massarCode || 'N/A'} • Appogee: {user.appogeeCode || 'N/A'}</p>
                              {user.eligibleType && (
                                <Badge variant={user.eligibleType === StageType.PFE ? 'primary' : 'secondary'} className="text-[7px] py-0 px-1.5 h-4">
                                  Eligible: {user.eligibleType}
                                </Badge>
                              )}
                              {user.department && <p className="text-[9px] text-muted-foreground uppercase font-medium">{user.department}</p>}
                            </div>
                          ) : (
                            <>
                              <div className="flex flex-wrap gap-1 mb-1">
                                {user.roles.map(r => (
                                  <p key={r} className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-1.5 py-0.5 rounded">{r}</p>
                                ))}
                              </div>
                              {user.department && <p className="text-[9px] text-muted-foreground uppercase font-medium">{user.department}</p>}
                            </>
                          )}
                        </td>
                        <td className="p-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => setUserToEdit({ ...user, password: '' })} 
                              className="p-3 text-muted-foreground/30 hover:text-primary transition-all"
                              title="Modifier"
                            >
                              <FileText size={18} />
                            </button>
                            {!user.roles.includes(Role.SUPERADMIN) && (
                              <button 
                                onClick={() => setUserToDelete(user.id)} 
                                className="p-3 text-muted-foreground/30 hover:text-destructive transition-all"
                                title="Supprimer"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y border-border">
                {paginatedUsers.map(user => (
                  <div key={user.id} className="p-5 space-y-4 hover:bg-muted/30 transition-colors">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold uppercase text-xs shrink-0">{user.name[0]}</div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground uppercase tracking-tight truncate">{user.name}</p>
                          <p className="text-[9px] text-muted-foreground font-mono truncate">{user.email}</p>
                          {user.currentLevel && <p className="text-[8px] text-primary font-bold uppercase tracking-widest mt-1">{user.currentLevel}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => setUserToEdit({ ...user, password: '' })} 
                          className="p-2 text-muted-foreground/30 hover:text-primary transition-all"
                        >
                          <FileText size={14} />
                        </button>
                        {!user.roles.includes(Role.SUPERADMIN) && (
                          <button 
                            onClick={() => setUserToDelete(user.id)} 
                            className="p-2 text-muted-foreground/30 hover:text-destructive transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      {activeTab === 'etudiants' ? (
                        <>
                          <p className="text-[8px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-1.5 py-0.5 rounded">M: {user.massarCode}</p>
                          <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">A: {user.appogeeCode}</p>
                        </>
                      ) : (
                        user.roles.map(r => (
                          <p key={r} className="text-[8px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-1.5 py-0.5 rounded">{r}</p>
                        ))
                      )}
                      {user.department && (
                        <p className="text-[8px] text-muted-foreground uppercase font-medium bg-secondary px-1.5 py-0.5 rounded">{user.department}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {totalPages > 1 && (
              <div className="p-4 md:p-6 bg-muted/50 border-t border-border flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Page {currentPage} sur {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    className="px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest"
                  >
                    Précédent
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    className="px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest"
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal for bulk import */}
      <AnimatePresence>
        {isBulkModalOpen && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsBulkModalOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-2xl bg-card rounded-[2.5rem] shadow-2xl overflow-hidden border border-border"
            >
              <div className="p-8 space-y-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-foreground uppercase tracking-tight">
                      Importation en Masse ({activeTab === 'etudiants' ? 'Étudiants' : 'Personnel'})
                    </h3>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Ajouter plusieurs utilisateurs à la fois</p>
                  </div>
                  <button 
                    onClick={() => setIsBulkModalOpen(false)} 
                    className="p-2 hover:bg-red-50 text-red-500 hover:text-red-600 rounded-full transition-all flex items-center justify-center"
                    aria-label="Fermer"
                  >
                    <X size={24} strokeWidth={2.5} className="shrink-0" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">
                        {activeTab === 'etudiants' ? 'Format: CodeMassar CodeAppogee Prénom Nom Niveau' : 'Format: Prénom Nom'}
                      </label>
                      <textarea 
                        className="w-full h-[250px] p-4 bg-muted border border-border rounded-2xl outline-none focus:border-primary text-foreground text-xs font-mono resize-none"
                        placeholder={activeTab === 'etudiants' ? "G123456 1234567 Ahmed Alami LST-3\nG789012 8901234 Sara Benani MST-2" : "Ahmed Alami\nSara Benani"}
                        value={bulkData}
                        onChange={e => setBulkData(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    {activeTab === 'personnel' && (
                      <div className="space-y-2">
                        <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Rôles Communs</label>
                        <div className="grid grid-cols-1 gap-2 p-3 bg-muted border border-border rounded-xl">
                          {Object.values(Role).filter(r => r !== Role.STUDENT).map(r => (
                            <label key={r} className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={newUser.roles.includes(r)} 
                                onChange={() => toggleRole(r)}
                                className="w-4 h-4 accent-primary"
                              />
                              <span className="text-[10px] uppercase font-bold text-muted-foreground">{r}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Département Commun</label>
                      <select className="w-full p-3 bg-muted border border-border rounded-xl outline-none focus:border-primary text-foreground text-xs" value={newUser.department} onChange={e => setNewUser({...newUser, department: e.target.value})}>
                        <option key="dept-bulk-none" value="">Sélectionner un département</option>
                        {systemConfig.departments.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <Button onClick={() => setIsBulkModalOpen(false)} variant="outline" className="flex-1 py-4 rounded-xl uppercase text-[10px] tracking-widest font-bold">Annuler</Button>
                  <Button onClick={handleBulkAdd} className="flex-1 py-4 rounded-xl uppercase text-[10px] tracking-widest font-bold shadow-lg">Importer {bulkData.split('\n').filter(l => l.trim()).length} Utilisateurs</Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal for editing user */}
      <AnimatePresence>
        {userToEdit && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setUserToEdit(null)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-xl bg-card rounded-[2.5rem] shadow-2xl overflow-hidden border border-border"
            >
              <div className="p-10 space-y-8">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black text-foreground uppercase tracking-tight">
                      Modifier l'utilisateur
                    </h3>
                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest bg-muted px-2 py-1 rounded inline-block">{userToEdit.name}</p>
                  </div>
                  <button 
                    onClick={() => setUserToEdit(null)} 
                    className="p-3 hover:bg-red-50 text-red-500 hover:text-red-600 rounded-full transition-all flex items-center justify-center"
                    aria-label="Fermer"
                  >
                    <X size={24} strokeWidth={2.5} className="shrink-0" />
                  </button>
                </div>

                  <form onSubmit={handleUpdateUser} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-black text-muted-foreground tracking-[0.1em]">Nom Complet</label>
                        <input 
                          required 
                          placeholder="Nom et Prénom"
                          className="w-full p-4 bg-muted border-2 border-border rounded-2xl outline-none focus:border-primary text-foreground text-sm font-bold transition-all" 
                          value={userToEdit.name} 
                          onChange={e => setUserToEdit({...userToEdit, name: e.target.value})} 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-black text-muted-foreground tracking-[0.1em]">Email Institutionnel</label>
                        <input 
                          required 
                          type="email"
                          placeholder="email@uca.ac.ma"
                          className="w-full p-4 bg-muted border-2 border-border rounded-2xl outline-none focus:border-primary text-foreground text-sm font-mono transition-all" 
                          value={userToEdit.email} 
                          onChange={e => setUserToEdit({...userToEdit, email: e.target.value})} 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-black text-muted-foreground tracking-[0.1em] flex items-center justify-between">
                          Mot de passe (Facultatif)
                          <span className="text-[8px] text-primary lowercase font-medium italic">sera hashé & sécurisé</span>
                        </label>
                        <input 
                          type="password"
                          placeholder="Laisser vide pour conserver"
                          className="w-full p-4 bg-muted border-2 border-border rounded-2xl outline-none focus:border-primary text-foreground text-sm transition-all" 
                          value={userToEdit.password || ''} 
                          onChange={e => setUserToEdit({...userToEdit, password: e.target.value})} 
                        />
                      </div>
                    </div>

                    {userToEdit.roles.includes(Role.STUDENT) && (
                      <div className="p-6 bg-primary/5 rounded-[2rem] border-2 border-primary/10 space-y-4">
                        <div className="flex items-center gap-2 text-primary">
                          <Zap size={16} />
                          <h4 className="text-[10px] font-black uppercase tracking-widest">Informations Académiques</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest pl-1">Code Massar</label>
                            <input 
                              required 
                              placeholder="CNE"
                              className="w-full p-3.5 bg-card border-2 border-border rounded-xl outline-none focus:border-primary text-foreground text-sm font-bold" 
                              value={userToEdit.massarCode || ''} 
                              onChange={e => setUserToEdit({...userToEdit, massarCode: e.target.value})} 
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest pl-1">Code Appogee</label>
                            <input 
                              required 
                              placeholder="Appogee"
                              className="w-full p-3.5 bg-card border-2 border-border rounded-xl outline-none focus:border-primary text-foreground text-sm font-bold" 
                              value={userToEdit.appogeeCode || ''} 
                              onChange={e => setUserToEdit({...userToEdit, appogeeCode: e.target.value})} 
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest pl-1">Niveau Actuel</label>
                          <select required className="w-full p-3.5 bg-card border-2 border-border rounded-xl outline-none focus:border-primary text-foreground text-sm font-bold" value={userToEdit.currentLevel || ''} onChange={e => setUserToEdit({...userToEdit, currentLevel: e.target.value})}>
                            <option key="level-edit-none" value="">Sélectionner un niveau</option>
                            {systemConfig.niveaux.map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-3">
                      <label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest pl-1">Configuration des Accès</label>
                      <div className="space-y-4">
                        {!userToEdit.roles.includes(Role.STUDENT) && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-4 bg-muted border-2 border-border rounded-[1.5rem]">
                            {Object.values(Role).filter(r => r !== Role.STUDENT).map(r => (
                              <label key={r} className="flex items-center gap-3 p-2 hover:bg-card rounded-lg transition-all cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={userToEdit.roles.includes(r)} 
                                  onChange={() => toggleEditRole(r)}
                                  className="w-5 h-5 accent-primary rounded-md"
                                />
                                <span className="text-[10px] uppercase font-bold text-muted-foreground">{r}</span>
                              </label>
                            ))}
                          </div>
                        )}
                        
                        {needsDepartment(userToEdit.roles) && (
                          <div className="space-y-1.5">
                            <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest pl-1">Département d'affectation</label>
                            <select 
                              required 
                              className="w-full p-4 bg-muted border-2 border-border rounded-2xl outline-none focus:border-primary text-foreground text-sm font-bold" 
                              value={userToEdit.department || ''} 
                              onChange={e => setUserToEdit({...userToEdit, department: e.target.value})}
                            >
                              <option key="dept-edit-none" value="">Sélectionner un département</option>
                              {systemConfig.departments.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <Button type="button" variant="outline" onClick={() => setUserToEdit(null)} className="flex-1 py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest">Annuler</Button>
                      <Button type="submit" className="flex-[2] py-4 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground">Mettre à jour le profil</Button>
                    </div>
                  </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={() => {
          if (userToDelete) {
            removeUser(userToDelete);
            setUserToDelete(null);
            showAlert("Succès", "Utilisateur supprimé avec succès.", "success");
          }
        }}
        title="Supprimer l'utilisateur"
        message="Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible."
        confirmText="Supprimer"
        variant="danger"
      />
    </div>
  );
};
