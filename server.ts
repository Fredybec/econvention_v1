
import express, { Request, Response, NextFunction } from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { createServer } from "http";
import { Server } from "socket.io";
import { storage } from "./server/storage";
import { Role } from "./types";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  // Ensure database initialization
  console.log("Starting server...");

  // Initialize MariaDB
  try {
    await storage.migrateMARIADB();
  } catch (dbErr) {
    console.error("Database migration failed (ignored if mock/offline):", dbErr);
  }

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  const corsOptions = {
    origin: process.env.NODE_ENV === "production" ? false : "*", // False in production to require explicit allow-listing or same-origin
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true
  };
  app.use(cors(corsOptions));

  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET && process.env.NODE_ENV === "production") {
    console.error("FATAL: JWT_SECRET environment variable is not set in production!");
    process.exit(1);
  }
  const SECURE_JWT_SECRET = JWT_SECRET || "dev_secret_only_for_local_testing";

  // Helper for async error handling
  const asyncHandler = (fn: any) => (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

  // --- AUTH MIDDLEWARE ---
  const authenticateJWT = (req: any, res: any, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const token = authHeader.split(' ')[1];

      jwt.verify(token, SECURE_JWT_SECRET, (err: any, user: any) => {
        if (err) {
          return res.sendStatus(403);
        }

        req.user = user;
        next();
      });
    } else {
      res.sendStatus(401);
    }
  };

  const authorizeRoles = (...roles: string[]) => {
    return (req: any, res: any, next: NextFunction) => {
      console.log(`Checking authorization for roles: ${roles.join(', ')}`);
      console.log(`User email: ${req.user?.email}`);
      console.log(`User roles in token: ${JSON.stringify(req.user?.roles)}`);
      if (!req.user || !req.user.roles || !roles.some(role => req.user.roles.includes(role))) {
        console.warn(`Unauthorized access attempt: user ${req.user?.email} lacks required roles. Required one of: ${roles.join(', ')}`);
        return res.status(403).json({ error: "Unauthorized access", requiredRoles: roles, userRoles: req.user?.roles });
      }
      next();
    };
  };

  // --- SOCKET.IO HANDLING ---
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication error"));

    jwt.verify(token, SECURE_JWT_SECRET, (err: any, user: any) => {
      if (err) return next(new Error("Authentication error"));
      (socket as any).user = user;
      next();
    });
  });

  io.on("connection", (socket) => {
    const user = (socket as any).user;
    console.log(`User connected: ${user.email} (Socket ID: ${socket.id})`);

    socket.on("join-record", async (recordId: string) => {
      socket.join(`record-${recordId}`);
      console.log(`User ${user.email} joined room: record-${recordId}`);
      
      // Notify other users in the room
      const lock = await storage.getLock(recordId);
      if (lock) {
        socket.emit("record-locked", lock);
      }
    });

    socket.on("leave-record", (recordId: string) => {
      socket.leave(`record-${recordId}`);
      console.log(`User ${user.email} left room: record-${recordId}`);
    });

    socket.on("lock-record", async (recordId: string, userName: string) => {
      const existingLock = await storage.getLock(recordId);
      if (existingLock && existingLock.userId !== user.id) {
        return socket.emit("lock-failed", existingLock);
      }

      await storage.setLock(recordId, user.id, userName);
      const lock = { recordId, userId: user.id, userName, lockedAt: Date.now() };
      io.to(`record-${recordId}`).emit("record-locked", lock);
      console.log(`Record ${recordId} locked by ${userName}`);
    });

    socket.on("unlock-record", async (recordId: string) => {
      const existingLock = await storage.getLock(recordId);
      if (existingLock && existingLock.userId === user.id) {
        await storage.deleteLock(recordId);
        io.to(`record-${recordId}`).emit("record-unlocked", { recordId });
        console.log(`Record ${recordId} unlocked by ${user.email}`);
      }
    });

    socket.on("disconnect", async () => {
      console.log(`User disconnected: ${user.email}`);
      // Optional: don't auto-unlock on disconnect to avoid accidental loss on refresh
      // but maybe clear from any rooms
    });
  });

  // --- API ROUTES ---

  // Auth Routes
  app.post("/api/auth/login", asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    console.log(`Login attempt: "${email}"`);
    
    if (!email) return res.status(400).json({ error: "Email required" });

    const users = await storage.getUsers();
    const user = users.find(u => u.email.toLowerCase().trim() === email.toLowerCase().trim());

    if (!user) {
      console.warn(`Login failed: user not found with email "${email}"`);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Password check
    if (!password) {
      return res.status(401).json({ error: "Password required" });
    }

    if (!user.password) {
      // User exists but has no password set (must use Google Login or admin must set one)
      return res.status(401).json({ error: "Ce compte n'a pas de mot de passe configuré. Veuillez utiliser la connexion Google." });
    }

    // Check if it's hashed (starts with $2)
    if (user.password.startsWith('$2')) {
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) return res.status(401).json({ error: "Invalid credentials" });
    } else {
      // Plain text check (for initial seed/migration)
      if (user.password !== password) return res.status(401).json({ error: "Invalid credentials" });
    }

    console.log(`Login successful for: ${user.email} (ID: ${user.id})`);
    const token = jwt.sign(
      { id: user.id, email: user.email, roles: user.roles },
      SECURE_JWT_SECRET,
      { expiresIn: '24h' }
    );

    const { password: _, ...userWithoutPassword } = user;
    res.json({ token, user: userWithoutPassword });
  }));

  app.post("/api/auth/google", asyncHandler(async (req, res) => {
    const { email, name, photoUrl } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });

    let users = await storage.getUsers();
    let user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      // Auto-register student if email matches pattern
      const studentRegex = /^[a-z]\.[a-z]+[0-9]{4}@uca\.ac\.ma$/i;
      if (studentRegex.test(email)) {
        const namePart = email.split('@')[0].split('.')[1].replace(/[0-9]/g, '');
        const studentName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
        user = {
          id: `std_${Date.now()}`,
          name: name || studentName || 'Étudiant',
          email: email.toLowerCase(),
          roles: [Role.STUDENT]
        };
        users.push(user);
        await storage.saveUsers(users);
      } else {
        return res.status(403).json({ error: "Account not registered in administration database" });
      }
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, roles: user.roles },
      SECURE_JWT_SECRET,
      { expiresIn: '24h' }
    );

    const { password: _, ...userWithoutPassword } = user;
    res.json({ token, user: userWithoutPassword });
  }));

  app.get("/api/auth/me", authenticateJWT, asyncHandler(async (req, res) => {
    const users = await storage.getUsers();
    const user = users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  }));

  // Help
  // (removed duplicated asyncHandler)

  // Config
  app.get("/api/config", asyncHandler(async (req, res) => {
    res.json(await storage.getConfig());
  }));
  app.post("/api/config", authenticateJWT, authorizeRoles(Role.SUPERADMIN, Role.SCOLARITE), asyncHandler(async (req, res) => {
    if (!req.body) return res.status(400).json({ error: "Missing body" });
    await storage.saveConfig(req.body);
    res.sendStatus(200);
  }));

  // Template
  app.get("/api/template", asyncHandler(async (req, res) => {
    res.json(await storage.getTemplate());
  }));
  app.post("/api/template", authenticateJWT, authorizeRoles(Role.SUPERADMIN), asyncHandler(async (req, res) => {
    if (!req.body) return res.status(400).json({ error: "Missing body" });
    await storage.saveTemplate(req.body);
    res.sendStatus(200);
  }));

  // Users
  app.get("/api/public/users", asyncHandler(async (req, res) => {
    const users = await storage.getUsers();
    // Return minimal info for selection list
    res.json(users.map(u => ({ 
      id: u.id,
      name: u.name, 
      email: u.email, 
      roles: u.roles, 
      department: u.department 
    })));
  }));

  app.get("/api/users", authenticateJWT, authorizeRoles(Role.SUPERADMIN, Role.SCOLARITE, Role.STUDENT), asyncHandler(async (req, res) => {
    const allUsers = await storage.getUsers();
    
    // If student, only return other students
    if (req.user.roles.includes(Role.STUDENT)) {
      return res.json(allUsers.filter(u => u.roles.includes(Role.STUDENT)));
    }
    
    res.json(allUsers);
  }));
  app.post("/api/users", authenticateJWT, authorizeRoles(Role.SUPERADMIN), asyncHandler(async (req, res) => {
    if (Array.isArray(req.body)) {
      // Bulk import
      // For bulk import, we should probably also check if passwords need hashing if they exist
      const users = await Promise.all(req.body.map(async (u: any) => {
        if (u.password && !u.password.startsWith('$2')) {
          const salt = await bcrypt.genSalt(10);
          u.password = await bcrypt.hash(u.password, salt);
        }
        return u;
      }));
      await storage.saveUsers(users);
      return res.sendStatus(200);
    }
    
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const users = await storage.getUsers();
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      return res.status(400).json({ error: "User with this email already exists" });
    }

    const newUser = {
      ...req.body,
      id: req.body.id || `user_${Date.now()}`
    };

    if (newUser.password && !newUser.password.startsWith('$2')) {
      const salt = await bcrypt.genSalt(10);
      newUser.password = await bcrypt.hash(newUser.password, salt);
    }

    await storage.saveUser(newUser);
    res.status(201).json(newUser);
  }));

  app.put("/api/users/:id", authenticateJWT, authorizeRoles(Role.SUPERADMIN, Role.SCOLARITE), asyncHandler(async (req, res) => {
    const users = await storage.getUsers();
    const existing = users.find(u => u.id === req.params.id);
    if (!existing) return res.status(404).json({ error: "User not found" });

    const { email } = req.body;
    if (email && email.toLowerCase() !== existing.email.toLowerCase()) {
      if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        return res.status(400).json({ error: "Email already in use by another user" });
      }
    }

    const updated = { 
      ...existing, 
      ...req.body
    };

    if (req.body.password && !req.body.password.startsWith('$2')) {
      const salt = await bcrypt.genSalt(10);
      updated.password = await bcrypt.hash(req.body.password, salt);
    }

    await storage.saveUser(updated);
    res.json(updated);
  }));

  app.delete("/api/users/:id", authenticateJWT, authorizeRoles(Role.SUPERADMIN), asyncHandler(async (req, res) => {
    await storage.deleteUser(req.params.id);
    res.sendStatus(200);
  }));

  app.get("/api/records", authenticateJWT, asyncHandler(async (req, res) => {
    const records = await storage.getRecords();
    const userRoles = req.user.roles || [];
    
    // Super Admin and Scolarite see all
    if (userRoles.includes(Role.SUPERADMIN) || userRoles.includes(Role.SCOLARITE)) {
      return res.json(records);
    }
    
    // Students see only their own
    if (userRoles.includes(Role.STUDENT)) {
      return res.json(records.filter(r => r.studentId === req.user.id));
    }
    
    // Administrative roles should see records
    const adminRoles = [
      Role.SERVICE_RECHERCHE_COOP, 
      Role.SECRETARIAT_DOYEN, 
      Role.VICE_DOYEN_RECHERCHE, 
      Role.VICE_DOYEN_PEDAGOGIE, 
      Role.CHEF_DEPARTEMENT, 
      Role.ENCADRANT_FST,
      Role.SUPPORT
    ];
    
    if (userRoles.some(role => adminRoles.includes(role as Role))) {
      // For now, we return all records they have access to
      // In a production app, we would filter by department if applicable
      return res.json(records);
    }
    
    res.json([]);
  }));

  app.post("/api/records", authenticateJWT, asyncHandler(async (req, res) => {
    if (Array.isArray(req.body)) {
      await storage.saveRecords(req.body);
      return res.sendStatus(200);
    }
    
    // Single record creation - Always generate a unique ID on the server
    const generatedId = await storage.generateNextRecordId();
    const newRecord = {
      ...req.body,
      id: generatedId,
      createdAt: req.body.createdAt || Date.now(),
      updatedAt: req.body.updatedAt || Date.now()
    };
    
    if (newRecord.history) {
      newRecord.history = newRecord.history.map((h: any) => ({
        ...h,
        recordId: generatedId
      }));
    }
    
    // Safety check: student can only create their own records
    if (req.user.roles.includes(Role.STUDENT) && newRecord.studentId !== req.user.id) {
      return res.status(403).json({ error: "Cannot create record for another student" });
    }

    await storage.saveRecord(newRecord);

    // Auto-save entreprise to global config if new
    try {
      if (newRecord.data && newRecord.data.companyName && newRecord.data.address) {
        const config = await storage.getConfig();
        const normalizedName = newRecord.data.companyName.trim().toLowerCase();
        const existing = config.entreprises.find(e => e.name.trim().toLowerCase() === normalizedName);
        if (!existing) {
          const newEnt = { 
            id: `ent_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, 
            name: newRecord.data.companyName.trim(), 
            address: newRecord.data.address.trim() 
          };
          config.entreprises.push(newEnt);
          await storage.saveConfig(config);
          console.log(`Auto-added new entreprise: ${newEnt.name}`);
        }
      }
    } catch (configErr) {
      console.error("Failed to auto-save entreprise to config:", configErr);
    }

    res.status(201).json(newRecord);
  }));
  app.put("/api/records/:id", authenticateJWT, asyncHandler(async (req, res) => {
    // Check if record is locked by someone else
    const lock = await storage.getLock(req.params.id);
    if (lock && lock.userId !== req.user.id) {
      return res.status(409).json({ error: "Record is locked by another user", lockedBy: lock.userName });
    }

    const existing = await storage.getRecord(req.params.id);
    if (existing) {
      // Security: students can only update their own records
      if (req.user.roles.includes(Role.STUDENT) && existing.studentId !== req.user.id && !req.user.roles.includes(Role.SUPERADMIN)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const statusChanged = req.body.status && req.body.status !== existing.status;
      const updated = { ...existing, ...req.body, updatedAt: Date.now() };
      await storage.saveRecord(updated);

      if (statusChanged) {
        await storage.markNotificationsAsReadForRecord(req.params.id);
      }

      // Emit real-time update
      io.to(`record-${updated.id}`).emit("record-updated", updated);
      io.emit("records-refreshed"); // Global signal for list views

      // Auto-save entreprise to global config if new
      try {
        if (updated.data && updated.data.companyName && updated.data.address) {
          const config = await storage.getConfig();
          const normalizedName = updated.data.companyName.trim().toLowerCase();
          const existingEnt = config.entreprises.find(e => e.name.trim().toLowerCase() === normalizedName);
          if (!existingEnt) {
            const newEnt = { 
              id: `ent_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, 
              name: updated.data.companyName.trim(), 
              address: updated.data.address.trim() 
            };
            config.entreprises.push(newEnt);
            await storage.saveConfig(config);
            console.log(`Auto-added new entreprise (via update): ${newEnt.name}`);
          }
        }
      } catch (configErr) {
        console.error("Failed to auto-save entreprise to config during update:", configErr);
      }

      res.json(updated);
    } else {
      res.status(404).json({ error: "Record not found" });
    }
  }));
  app.post("/api/records/bulk", authenticateJWT, authorizeRoles(Role.SUPERADMIN, Role.SCOLARITE, Role.SERVICE_RECHERCHE_COOP, Role.SECRETARIAT_DOYEN, Role.VICE_DOYEN_PEDAGOGIE, Role.VICE_DOYEN_RECHERCHE), asyncHandler(async (req, res) => {
    if (!Array.isArray(req.body)) return res.status(400).json({ error: "Body must be an array of updates" });
    
    const records = await storage.getRecords();
    let updatedCount = 0;

    for (const update of req.body) {
      const existing = records.find(r => r.id === update.id);
      if (existing) {
        const statusChanged = update.status && update.status !== existing.status;
        await storage.saveRecord({ ...existing, ...update });
        if (statusChanged) {
          await storage.markNotificationsAsReadForRecord(existing.id);
        }
        updatedCount++;
      }
    }

    res.json({ success: true, updatedCount });
  }));

  app.delete("/api/records/:id", authenticateJWT, authorizeRoles(Role.SUPERADMIN, Role.SCOLARITE), asyncHandler(async (req, res) => {
    await storage.deleteRecord(req.params.id);
    res.sendStatus(200);
  }));

  // Record Locking
  app.get("/api/records/:id/lock", authenticateJWT, asyncHandler(async (req, res) => {
    const lock = await storage.getLock(req.params.id);
    res.json(lock);
  }));

  app.post("/api/records/:id/lock", authenticateJWT, asyncHandler(async (req, res) => {
    const users = await storage.getUsers();
    const user = users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
 
    const existingLock = await storage.getLock(req.params.id);
    if (existingLock && existingLock.userId !== req.user.id) {
      return res.json({ success: false, lock: existingLock });
    }
 
    await storage.setLock(req.params.id, req.user.id, user.name);
    const lock = { recordId: req.params.id, userId: req.user.id, userName: user.name, lockedAt: Date.now() };
    io.to(`record-${req.params.id}`).emit("record-locked", lock);
    res.json({ success: true });
  }));
 
  app.delete("/api/records/:id/lock", authenticateJWT, asyncHandler(async (req, res) => {
    const existingLock = await storage.getLock(req.params.id);
    if (existingLock && existingLock.userId === req.user.id) {
      await storage.deleteLock(req.params.id);
      io.to(`record-${req.params.id}`).emit("record-unlocked", { recordId: req.params.id });
    }
    res.sendStatus(200);
  }));

  // Notifications
  app.get("/api/notifications", authenticateJWT, asyncHandler(async (req, res) => {
    const notifications = await storage.getNotifications();
    if (req.user.roles.includes(Role.SUPERADMIN)) return res.json(notifications);
    return res.json(notifications.filter(n => n.userId === req.user.id));
  }));

  app.post("/api/notifications", authenticateJWT, asyncHandler(async (req, res) => {
    if (Array.isArray(req.body)) {
      await storage.saveNotifications(req.body);
      return res.sendStatus(200);
    }
    
    const newNotif = {
      ...req.body,
      createdAt: req.body.createdAt || Date.now(),
      isRead: false
    };
    await storage.saveNotification(newNotif);
    res.status(201).json(newNotif);
  }));

  app.put("/api/notifications/:id/read", authenticateJWT, asyncHandler(async (req, res) => {
    const notifications = await storage.getNotifications();
    const existing = notifications.find(n => n.id === req.params.id);
    if (existing) {
      if (existing.userId !== req.user.id && !req.user.roles.includes(Role.SUPERADMIN)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      existing.isRead = true;
      await storage.saveNotification(existing);
      res.json(existing);
    } else {
      res.status(404).json({ error: "Notification not found" });
    }
  }));

  app.delete("/api/notifications", authenticateJWT, asyncHandler(async (req, res) => {
    await storage.clearUserNotifications(req.user.id);
    res.sendStatus(200);
  }));

  // Support
  app.get("/api/support", authenticateJWT, asyncHandler(async (req, res) => {
    const questions = await storage.getSupportQuestions();
    if (req.user.roles.includes(Role.SUPERADMIN) || req.user.roles.includes(Role.SUPPORT)) {
      return res.json(questions);
    }
    return res.json(questions.filter(q => q.userId === req.user.id || q.isPublic));
  }));

  app.post("/api/support", authenticateJWT, asyncHandler(async (req, res) => {
    if (Array.isArray(req.body)) {
      await storage.saveSupportQuestions(req.body);
      return res.sendStatus(200);
    }
    
    const newQuestion = {
      ...req.body,
      createdAt: req.body.createdAt || Date.now(),
      status: 'pending'
    };
    await storage.saveSupportQuestion(newQuestion);
    res.status(201).json(newQuestion);
  }));

  app.put("/api/support/:id", authenticateJWT, asyncHandler(async (req, res) => {
    const questions = await storage.getSupportQuestions();
    const existing = questions.find(q => q.id === req.params.id);
    if (existing) {
      const updated = { ...existing, ...req.body };
      await storage.saveSupportQuestion(updated);
      res.json(updated);
    } else {
      res.status(404).json({ error: "Question not found" });
    }
  }));

  app.delete("/api/support/:id", authenticateJWT, authorizeRoles(Role.SUPERADMIN, Role.SUPPORT), asyncHandler(async (req, res) => {
    await storage.deleteSupportQuestion(req.params.id);
    res.sendStatus(200);
  }));

  // Eligibility
  app.get("/api/eligibility/criteria", authenticateJWT, asyncHandler(async (req, res) => {
    res.json(await storage.getEligibilityCriteria());
  }));
  app.post("/api/eligibility/criteria", authenticateJWT, authorizeRoles(Role.SUPERADMIN), asyncHandler(async (req, res) => {
    if (!Array.isArray(req.body)) return res.status(400).json({ error: "Body must be an array" });
    await storage.saveEligibilityCriteria(req.body);
    res.sendStatus(200);
  }));
  app.get("/api/eligibility/overrides", authenticateJWT, asyncHandler(async (req, res) => {
    res.json(await storage.getEligibilityOverrides());
  }));
  app.post("/api/eligibility/overrides", authenticateJWT, authorizeRoles(Role.SUPERADMIN, Role.SCOLARITE), asyncHandler(async (req, res) => {
    if (!Array.isArray(req.body)) return res.status(400).json({ error: "Body must be an array" });
    await storage.saveEligibilityOverrides(req.body);
    res.sendStatus(200);
  }));

  // Global Error Handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Backend Error Details:");
    console.error("- Message:", err.message);
    console.error("- Stack:", err.stack);
    console.error("- Path:", req.path);
    console.error("- Method:", req.method);
    
    if (err instanceof SyntaxError && 'body' in err) {
      return res.status(400).json({ error: "Invalid JSON payload" });
    }
    
    if (err.type === 'entity.too.large') {
      return res.status(413).json({ error: "Payload too large", limit: err.limit });
    }

    res.status(500).json({ 
      error: "Internal Server Error", 
      message: err.message,
      path: req.path
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting Vite in development mode...");
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false // Guidelines say HMR is disabled
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite middleware integrated.");
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVER] Started successfully`);
    console.log(`[SERVER] Port: ${PORT}`);
    console.log(`[SERVER] Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer().catch(err => {
  console.error("[SERVER] Fatal startup error:", err);
});
