import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { insertUserSchema, insertRoleSchema, insertPermissionSchema, insertUmgSchema, insertServiceSchema, insertDepartmentSchema, insertObjectSchema, insertDocumentCategorySchema, insertTrainingProgramSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs/promises";

// Настройка хранилища для загрузки файлов
const uploadDir = path.join(process.cwd(), 'uploads');
await fs.mkdir(uploadDir, { recursive: true });

// Разрешенные типы файлов
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'text/plain',
  'text/csv',
  'application/acad',
  'application/x-dwg',
  'application/octet-stream', // для CAD файлов
];

// Максимальный размер файла: 100MB
const MAX_FILE_SIZE = 100 * 1024 * 1024;

// Функция для очистки имени файла от path traversal
function sanitizeFileName(fileName: string): string {
  // Удаляем path traversal атаки
  return path.basename(fileName.replace(/\.\./g, '').replace(/[\/\\]/g, '_'));
}

// Функция для валидации UUID
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// Middleware для валидации UUID параметров
function validateUUID(paramName: string = 'id') {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = req.params[paramName];
    if (id && !isValidUUID(id)) {
      return res.status(400).json({ error: 'Неверный формат ID' });
    }
    next();
  };
}

const storage_multer = multer.diskStorage({
  destination: async (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitizedName = sanitizeFileName(file.originalname);
    cb(null, uniqueSuffix + '-' + sanitizedName);
  }
});

// Фильтр файлов
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Тип файла ${file.mimetype} не разрешен. Разрешенные типы: ${ALLOWED_MIME_TYPES.join(', ')}`));
  }
};

const upload = multer({ 
  storage: storage_multer,
  fileFilter: fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10, // максимум 10 файлов
  }
});

// Middleware для проверки авторизации
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ error: "Не авторизован" });
}

// Middleware для проверки прав
function hasPermission(module: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Не авторизован" });
    }
    const userId = (req.user as any).id;
    const hasAccess = await storage.userHasPermission(userId, module, action);
    if (hasAccess) {
      return next();
    }
    res.status(403).json({ error: "Недостаточно прав" });
  };
}

// Middleware для логирования действий
async function auditLog(action: any, resource: string, resourceId?: string, details?: any) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user ? (req.user as any).id : undefined;
    await storage.insertAuditLog({
      userId,
      action,
      resource,
      resourceId,
      details,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    next();
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Настройка сессий
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 часа
    }
  }));

  // Настройка Passport
  passport.use(new LocalStrategy(
    async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: 'Неверное имя пользователя' });
        }
        const isValid = await storage.verifyPassword(user, password);
        if (!isValid) {
          return done(null, false, { message: 'Неверный пароль' });
        }
        if (user.status !== 'active') {
          return done(null, false, { message: 'Аккаунт заблокирован' });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  ));

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUserById(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.use(passport.initialize());
  app.use(passport.session());

  // ========== AUTH ROUTES ==========
  app.post('/api/auth/login', (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ error: info.message });
      req.logIn(user, async (err) => {
        if (err) return next(err);
        await storage.insertAuditLog({
          userId: user.id,
          action: 'login',
          resource: 'auth',
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        });
        const { password, ...userWithoutPassword } = user;
        res.json({ user: userWithoutPassword });
      });
    })(req, res, next);
  });

  app.post('/api/auth/logout', isAuthenticated, async (req, res) => {
    const userId = (req.user as any).id;
    await storage.insertAuditLog({
      userId,
      action: 'logout',
      resource: 'auth',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    req.logout(() => {
      res.json({ success: true });
    });
  });

  app.get('/api/auth/me', isAuthenticated, async (req, res) => {
    const user = req.user as any;
    const { password, ...userWithoutPassword } = user;
    const permissions = await storage.getUserPermissions(user.id);
    const roles = await storage.getUserRoles(user.id);
    res.json({ 
      user: userWithoutPassword,
      permissions,
      roles: roles.map(r => r.role)
    });
  });

  // ========== USERS ROUTES ==========
  app.get('/api/users', isAuthenticated, hasPermission('users', 'view'), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ error: 'Ошибка при получении пользователей' });
    }
  });

  app.get('/api/users/:id', isAuthenticated, hasPermission('users', 'view'), validateUUID('id'), async (req, res) => {
    try {
      const user = await storage.getUserById(req.params.id);
      if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
      }
      const { password, ...userWithoutPassword } = user;
      const roles = await storage.getUserRoles(user.id);
      const umgAccess = await storage.getUserUmgAccess(user.id);
      const serviceAccess = await storage.getUserServiceAccess(user.id);
      res.json({ 
        user: userWithoutPassword, 
        roles: roles.map(r => r.role),
        umgAccess: umgAccess.map(u => u.umg),
        serviceAccess: serviceAccess.map(s => s.service)
      });
    } catch (error) {
      res.status(500).json({ error: 'Ошибка при получении пользователя' });
    }
  });

  app.post('/api/users', isAuthenticated, hasPermission('users', 'create'), async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      const user = await storage.insertUser(data);
      await storage.insertAuditLog({
        userId: (req.user as any).id,
        action: 'create',
        resource: 'user',
        resourceId: user.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put('/api/users/:id', isAuthenticated, hasPermission('users', 'edit'), validateUUID('id'), async (req, res) => {
    try {
      // Валидация данных через Zod (частичное обновление)
      const updateData = insertUserSchema.partial().parse(req.body);
      const user = await storage.updateUser(req.params.id, updateData);
      await storage.insertAuditLog({
        userId: (req.user as any).id,
        action: 'update',
        resource: 'user',
        resourceId: req.params.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/users/:id', isAuthenticated, hasPermission('users', 'delete'), validateUUID('id'), async (req, res) => {
    try {
      await storage.deleteUser(req.params.id);
      await storage.insertAuditLog({
        userId: (req.user as any).id,
        action: 'delete',
        resource: 'user',
        resourceId: req.params.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== ROLES ROUTES ==========
  app.get('/api/roles', isAuthenticated, async (req, res) => {
    try {
      const roles = await storage.getAllRoles();
      res.json(roles);
    } catch (error) {
      res.status(500).json({ error: 'Ошибка при получении ролей' });
    }
  });

  app.get('/api/roles/:id', isAuthenticated, validateUUID('id'), async (req, res) => {
    try {
      const role = await storage.getRoleById(req.params.id);
      if (!role) {
        return res.status(404).json({ error: 'Роль не найдена' });
      }
      const permissions = await storage.getRolePermissions(role.id);
      res.json({ role, permissions: permissions.map(p => p.permission) });
    } catch (error) {
      res.status(500).json({ error: 'Ошибка при получении роли' });
    }
  });

  app.post('/api/roles', isAuthenticated, hasPermission('roles', 'create'), async (req, res) => {
    try {
      const data = insertRoleSchema.parse(req.body);
      const role = await storage.insertRole(data);
      res.json(role);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put('/api/roles/:id', isAuthenticated, hasPermission('roles', 'edit'), validateUUID('id'), async (req, res) => {
    try {
      const updateData = insertRoleSchema.partial().parse(req.body);
      const role = await storage.updateRole(req.params.id, updateData);
      res.json(role);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/roles/:id', isAuthenticated, hasPermission('roles', 'delete'), validateUUID('id'), async (req, res) => {
    try {
      await storage.deleteRole(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== PERMISSIONS ROUTES ==========
  app.get('/api/permissions', isAuthenticated, async (req, res) => {
    try {
      const permissions = await storage.getAllPermissions();
      res.json(permissions);
    } catch (error) {
      res.status(500).json({ error: 'Ошибка при получении прав' });
    }
  });

  app.post('/api/permissions', isAuthenticated, hasPermission('roles', 'create'), async (req, res) => {
    try {
      const data = insertPermissionSchema.parse(req.body);
      const permission = await storage.insertPermission(data);
      res.json(permission);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/roles/:roleId/permissions/:permissionId', isAuthenticated, hasPermission('roles', 'edit'), validateUUID('roleId'), validateUUID('permissionId'), async (req, res) => {
    try {
      await storage.assignPermissionToRole(req.params.roleId, req.params.permissionId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/roles/:roleId/permissions/:permissionId', isAuthenticated, hasPermission('roles', 'edit'), validateUUID('roleId'), validateUUID('permissionId'), async (req, res) => {
    try {
      await storage.removePermissionFromRole(req.params.roleId, req.params.permissionId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== USER ROLES ROUTES ==========
  app.post('/api/users/:userId/roles/:roleId', isAuthenticated, hasPermission('users', 'edit'), validateUUID('userId'), validateUUID('roleId'), async (req, res) => {
    try {
      await storage.assignRoleToUser(req.params.userId, req.params.roleId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/users/:userId/roles/:roleId', isAuthenticated, hasPermission('users', 'edit'), validateUUID('userId'), validateUUID('roleId'), async (req, res) => {
    try {
      await storage.removeRoleFromUser(req.params.userId, req.params.roleId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== UMG ROUTES ==========
  app.get('/api/umg', isAuthenticated, async (req, res) => {
    try {
      const umgList = await storage.getAllUmg();
      res.json(umgList);
    } catch (error) {
      res.status(500).json({ error: 'Ошибка при получении УМГ' });
    }
  });

  app.get('/api/umg/:id', isAuthenticated, async (req, res) => {
    try {
      const item = await storage.getUmgById(req.params.id);
      if (!item) {
        return res.status(404).json({ error: 'УМГ не найден' });
      }
      const services = await storage.getServicesByUmg(item.id);
      res.json({ umg: item, services });
    } catch (error) {
      res.status(500).json({ error: 'Ошибка при получении УМГ' });
    }
  });

  app.post('/api/umg', isAuthenticated, hasPermission('orgstructure', 'create'), async (req, res) => {
    try {
      const data = insertUmgSchema.parse(req.body);
      const item = await storage.insertUmg(data);
      res.json(item);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put('/api/umg/:id', isAuthenticated, hasPermission('orgstructure', 'edit'), async (req, res) => {
    try {
      const item = await storage.updateUmg(req.params.id, req.body);
      res.json(item);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/umg/:id', isAuthenticated, hasPermission('orgstructure', 'delete'), async (req, res) => {
    try {
      await storage.deleteUmg(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== SERVICES ROUTES ==========
  app.get('/api/services', isAuthenticated, async (req, res) => {
    try {
      const services = await storage.getAllServices();
      res.json(services);
    } catch (error) {
      res.status(500).json({ error: 'Ошибка при получении служб' });
    }
  });

  app.post('/api/services', isAuthenticated, hasPermission('orgstructure', 'create'), async (req, res) => {
    try {
      const data = insertServiceSchema.parse(req.body);
      const service = await storage.insertService(data);
      res.json(service);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put('/api/services/:id', isAuthenticated, hasPermission('orgstructure', 'edit'), async (req, res) => {
    try {
      const service = await storage.updateService(req.params.id, req.body);
      res.json(service);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/services/:id', isAuthenticated, hasPermission('orgstructure', 'delete'), async (req, res) => {
    try {
      await storage.deleteService(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== DEPARTMENTS ROUTES ==========
  app.get('/api/departments', isAuthenticated, async (req, res) => {
    try {
      const departments = await storage.getAllDepartments();
      res.json(departments);
    } catch (error) {
      res.status(500).json({ error: 'Ошибка при получении подразделений' });
    }
  });

  app.post('/api/departments', isAuthenticated, hasPermission('orgstructure', 'create'), async (req, res) => {
    try {
      const data = insertDepartmentSchema.parse(req.body);
      const department = await storage.insertDepartment(data);
      res.json(department);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put('/api/departments/:id', isAuthenticated, hasPermission('orgstructure', 'edit'), async (req, res) => {
    try {
      const department = await storage.updateDepartment(req.params.id, req.body);
      res.json(department);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/departments/:id', isAuthenticated, hasPermission('orgstructure', 'delete'), async (req, res) => {
    try {
      await storage.deleteDepartment(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== OBJECTS ROUTES ==========
  app.get('/api/objects', isAuthenticated, async (req, res) => {
    try {
      const objects = await storage.getAllObjects();
      res.json(objects);
    } catch (error) {
      res.status(500).json({ error: 'Ошибка при получении объектов' });
    }
  });

  app.get('/api/objects/:id', isAuthenticated, async (req, res) => {
    try {
      const object = await storage.getObjectById(req.params.id);
      if (!object) {
        return res.status(404).json({ error: 'Объект не найден' });
      }
      const services = await storage.getObjectServices(object.id);
      res.json({ object, services });
    } catch (error) {
      res.status(500).json({ error: 'Ошибка при получении объекта' });
    }
  });

  app.get('/api/objects/qr/:qrCode', isAuthenticated, async (req, res) => {
    try {
      const object = await storage.getObjectByQrCode(req.params.qrCode);
      if (!object) {
        return res.status(404).json({ error: 'Объект не найден' });
      }
      await storage.insertAuditLog({
        userId: (req.user as any).id,
        action: 'read',
        resource: 'object',
        resourceId: object.id,
        details: { method: 'qr_scan' },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
      const services = await storage.getObjectServices(object.id);
      res.json({ object, services });
    } catch (error) {
      res.status(500).json({ error: 'Ошибка при получении объекта' });
    }
  });

  app.post('/api/objects', isAuthenticated, hasPermission('objects', 'create'), async (req, res) => {
    try {
      const data = insertObjectSchema.parse(req.body);
      const object = await storage.insertObject(data);
      await storage.insertAuditLog({
        userId: (req.user as any).id,
        action: 'create',
        resource: 'object',
        resourceId: object.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
      res.json(object);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put('/api/objects/:id', isAuthenticated, hasPermission('objects', 'edit'), async (req, res) => {
    try {
      const object = await storage.updateObject(req.params.id, req.body);
      await storage.insertAuditLog({
        userId: (req.user as any).id,
        action: 'update',
        resource: 'object',
        resourceId: req.params.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
      res.json(object);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/objects/:id', isAuthenticated, hasPermission('objects', 'delete'), async (req, res) => {
    try {
      await storage.deleteObject(req.params.id);
      await storage.insertAuditLog({
        userId: (req.user as any).id,
        action: 'delete',
        resource: 'object',
        resourceId: req.params.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== DOCUMENT CATEGORIES ROUTES ==========
  app.get('/api/document-categories', isAuthenticated, async (req, res) => {
    try {
      const categories = await storage.getAllDocumentCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: 'Ошибка при получении категорий' });
    }
  });

  app.post('/api/document-categories', isAuthenticated, hasPermission('documents', 'create'), async (req, res) => {
    try {
      const data = insertDocumentCategorySchema.parse(req.body);
      const category = await storage.insertDocumentCategory(data);
      res.json(category);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put('/api/document-categories/:id', isAuthenticated, hasPermission('documents', 'edit'), async (req, res) => {
    try {
      const category = await storage.updateDocumentCategory(req.params.id, req.body);
      res.json(category);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/document-categories/:id', isAuthenticated, hasPermission('documents', 'delete'), async (req, res) => {
    try {
      await storage.deleteDocumentCategory(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== DOCUMENTS ROUTES ==========
  app.get('/api/documents', isAuthenticated, async (req, res) => {
    try {
      const documents = await storage.getAllDocuments();
      res.json(documents);
    } catch (error) {
      res.status(500).json({ error: 'Ошибка при получении документов' });
    }
  });

  app.get('/api/documents/:id', isAuthenticated, async (req, res) => {
    try {
      const doc = await storage.getDocumentById(req.params.id);
      if (!doc) {
        return res.status(404).json({ error: 'Документ не найден' });
      }
      await storage.insertAuditLog({
        userId: (req.user as any).id,
        action: 'read',
        resource: 'document',
        resourceId: doc.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
      res.json(doc);
    } catch (error) {
      res.status(500).json({ error: 'Ошибка при получении документа' });
    }
  });

  app.post('/api/documents/upload', isAuthenticated, hasPermission('documents', 'create'), upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Файл не загружен' });
      }
      // Валидация размера файла
      if (req.file.size > MAX_FILE_SIZE) {
        return res.status(400).json({ error: `Размер файла превышает максимально допустимый (${MAX_FILE_SIZE / 1024 / 1024}MB)` });
      }
      
      const document = await storage.insertDocument({
        name: req.body.name || sanitizeFileName(req.file.originalname),
        fileName: sanitizeFileName(req.file.originalname),
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        categoryId: req.body.categoryId,
        objectId: req.body.objectId || null,
        umgId: req.body.umgId,
        tags: req.body.tags ? (() => {
          try {
            const parsed = JSON.parse(req.body.tags);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })() : [],
        metadata: req.body.metadata ? (() => {
          try {
            return JSON.parse(req.body.metadata);
          } catch {
            return null;
          }
        })() : null,
        uploadedBy: (req.user as any).id
      });
      await storage.insertAuditLog({
        userId: (req.user as any).id,
        action: 'upload',
        resource: 'document',
        resourceId: document.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
      res.json(document);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/documents/:id/download', isAuthenticated, async (req, res) => {
    try {
      const doc = await storage.getDocumentById(req.params.id);
      if (!doc) {
        return res.status(404).json({ error: 'Документ не найден' });
      }
      
      // Проверка существования файла и защита от path traversal
      const filePath = path.resolve(uploadDir, path.basename(doc.filePath));
      const uploadDirResolved = path.resolve(uploadDir);
      
      if (!filePath.startsWith(uploadDirResolved)) {
        return res.status(403).json({ error: 'Доступ запрещен' });
      }
      
      const fs = await import('fs/promises');
      try {
        await fs.access(filePath);
      } catch {
        return res.status(404).json({ error: 'Файл не найден' });
      }
      
      await storage.insertAuditLog({
        userId: (req.user as any).id,
        action: 'download',
        resource: 'document',
        resourceId: doc.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
      
      res.download(filePath, sanitizeFileName(doc.fileName));
    } catch (error) {
      res.status(500).json({ error: 'Ошибка при скачивании документа' });
    }
  });

  app.delete('/api/documents/:id', isAuthenticated, hasPermission('documents', 'delete'), async (req, res) => {
    try {
      const doc = await storage.getDocumentById(req.params.id);
      if (!doc) {
        return res.status(404).json({ error: 'Документ не найден' });
      }
      await fs.unlink(doc.filePath);
      await storage.deleteDocument(req.params.id);
      await storage.insertAuditLog({
        userId: (req.user as any).id,
        action: 'delete',
        resource: 'document',
        resourceId: req.params.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== TRAINING PROGRAMS ROUTES ==========
  app.get('/api/training', isAuthenticated, async (req, res) => {
    try {
      const programs = await storage.getAllTrainingPrograms();
      res.json(programs);
    } catch (error) {
      res.status(500).json({ error: 'Ошибка при получении программ обучения' });
    }
  });

  app.get('/api/training/:id', isAuthenticated, async (req, res) => {
    try {
      const program = await storage.getTrainingProgramById(req.params.id);
      if (!program) {
        return res.status(404).json({ error: 'Программа не найдена' });
      }
      const progress = await storage.getUserTrainingProgress((req.user as any).id, program.id);
      res.json({ program, progress });
    } catch (error) {
      res.status(500).json({ error: 'Ошибка при получении программы' });
    }
  });

  app.post('/api/training', isAuthenticated, hasPermission('training', 'create'), async (req, res) => {
    try {
      const data = insertTrainingProgramSchema.parse(req.body);
      const program = await storage.insertTrainingProgram({ ...data, createdBy: (req.user as any).id });
      res.json(program);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put('/api/training/:programId/progress', isAuthenticated, async (req, res) => {
    try {
      const progress = await storage.updateTrainingProgress(
        (req.user as any).id,
        req.params.programId,
        req.body.progress
      );
      res.json(progress);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== AUDIT LOGS ROUTES ==========
  app.get('/api/audit', isAuthenticated, hasPermission('audit', 'view'), async (req, res) => {
    try {
      const logs = await storage.getAuditLogs({
        userId: req.query.userId as string,
        resource: req.query.resource as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 100
      });
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: 'Ошибка при получении логов' });
    }
  });

  // ========== USER ACCESS ROUTES ==========
  app.post('/api/users/:userId/umg/:umgId', isAuthenticated, hasPermission('users', 'edit'), async (req, res) => {
    try {
      await storage.assignUmgToUser(req.params.userId, req.params.umgId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/users/:userId/services/:serviceId', isAuthenticated, hasPermission('users', 'edit'), async (req, res) => {
    try {
      await storage.assignServiceToUser(req.params.userId, req.params.serviceId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== DOCUMENT VERSIONS ROUTES ==========
  app.get('/api/documents/:id/versions', isAuthenticated, async (req, res) => {
    try {
      const versions = await storage.getDocumentVersions(req.params.id);
      res.json(versions);
    } catch (error) {
      res.status(500).json({ error: 'Ошибка при получении версий документа' });
    }
  });

  app.post('/api/documents/:id/versions', isAuthenticated, hasPermission('documents', 'edit'), upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Файл не загружен' });
      }
      const doc = await storage.getDocumentById(req.params.id);
      if (!doc) {
        return res.status(404).json({ error: 'Документ не найден' });
      }
      // Валидация размера файла
      if (req.file.size > MAX_FILE_SIZE) {
        return res.status(400).json({ error: `Размер файла превышает максимально допустимый (${MAX_FILE_SIZE / 1024 / 1024}MB)` });
      }
      
      const version = await storage.createDocumentVersion({
        documentId: req.params.id,
        version: doc.version + 1,
        fileName: sanitizeFileName(req.file.originalname),
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        changes: req.body.changes || '',
        uploadedBy: (req.user as any).id
      });
      await storage.updateDocument(req.params.id, { 
        version: doc.version + 1,
        fileName: sanitizeFileName(req.file.originalname),
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype
      });
      res.json(version);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== NOTIFICATIONS ROUTES ==========
  app.get('/api/notifications', isAuthenticated, async (req, res) => {
    try {
      const unreadOnly = req.query.unreadOnly === 'true';
      const notifications = await storage.getUserNotifications((req.user as any).id, unreadOnly);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: 'Ошибка при получении уведомлений' });
    }
  });

  app.post('/api/notifications', isAuthenticated, hasPermission('users', 'create'), async (req, res) => {
    try {
      const notification = await storage.createNotification(req.body);
      res.json(notification);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put('/api/notifications/:id/read', isAuthenticated, async (req, res) => {
    try {
      const notification = await storage.markNotificationAsRead(req.params.id);
      res.json(notification);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put('/api/notifications/read-all', isAuthenticated, async (req, res) => {
    try {
      await storage.markAllNotificationsAsRead((req.user as any).id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== TESTS ROUTES ==========
  app.get('/api/training/:programId/tests', isAuthenticated, async (req, res) => {
    try {
      const tests = await storage.getTestsByProgram(req.params.programId);
      res.json(tests);
    } catch (error) {
      res.status(500).json({ error: 'Ошибка при получении тестов' });
    }
  });

  app.get('/api/tests/:id/questions', isAuthenticated, async (req, res) => {
    try {
      const questions = await storage.getTestQuestions(req.params.id);
      res.json(questions);
    } catch (error) {
      res.status(500).json({ error: 'Ошибка при получении вопросов' });
    }
  });

  app.post('/api/tests/:id/submit', isAuthenticated, async (req, res) => {
    try {
      const result = await storage.submitTestResult({
        userId: (req.user as any).id,
        testId: req.params.id,
        score: req.body.score,
        passed: req.body.passed,
        answers: req.body.answers
      });
      
      // Создать сертификат если тест пройден
      if (req.body.passed && req.body.programId) {
        await storage.createCertificate({
          userId: (req.user as any).id,
          programId: req.body.programId,
          score: req.body.score
        });
      }
      
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/tests', isAuthenticated, hasPermission('training', 'create'), async (req, res) => {
    try {
      const test = await storage.createTest(req.body);
      res.json(test);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== CERTIFICATES ROUTES ==========
  app.get('/api/certificates', isAuthenticated, async (req, res) => {
    try {
      const certificates = await storage.getUserCertificates((req.user as any).id);
      res.json(certificates);
    } catch (error) {
      res.status(500).json({ error: 'Ошибка при получении сертификатов' });
    }
  });

  app.get('/api/certificates/:number', isAuthenticated, async (req, res) => {
    try {
      const certificate = await storage.getCertificateByNumber(req.params.number);
      if (!certificate) {
        return res.status(404).json({ error: 'Сертификат не найден' });
      }
      res.json(certificate);
    } catch (error) {
      res.status(500).json({ error: 'Ошибка при получении сертификата' });
    }
  });

  // ========== SEARCH ROUTES ==========
  app.get('/api/search/documents', isAuthenticated, async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.length < 2) {
        return res.status(400).json({ error: 'Поисковый запрос должен содержать минимум 2 символа' });
      }
      // Ограничение длины запроса для защиты
      if (query.length > 100) {
        return res.status(400).json({ error: 'Поисковый запрос слишком длинный (максимум 100 символов)' });
      }
      const results = await storage.searchDocuments(query, (req.user as any).id);
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: 'Ошибка поиска' });
    }
  });

  // ========== BATCH UPLOAD ROUTES ==========
  app.post('/api/documents/batch-upload', isAuthenticated, hasPermission('documents', 'create'), upload.array('files', 10), async (req, res) => {
    try {
      if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
        return res.status(400).json({ error: 'Файлы не загружены' });
      }
      
      const uploadedDocuments = [];
      const files = req.files as Express.Multer.File[];
      
      for (const file of files) {
        // Валидация размера файла
        if (file.size > MAX_FILE_SIZE) {
          continue; // Пропускаем файлы, превышающие лимит
        }
        
        const document = await storage.insertDocument({
          name: sanitizeFileName(file.originalname),
          fileName: sanitizeFileName(file.originalname),
          filePath: file.path,
          fileSize: file.size,
          mimeType: file.mimetype,
          categoryId: req.body.categoryId,
          objectId: req.body.objectId || null,
          umgId: req.body.umgId,
          tags: req.body.tags ? (() => {
            try {
              const parsed = JSON.parse(req.body.tags);
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return [];
            }
          })() : [],
          metadata: req.body.metadata ? (() => {
            try {
              return JSON.parse(req.body.metadata);
            } catch {
              return null;
            }
          })() : null,
          uploadedBy: (req.user as any).id
        });
        
        uploadedDocuments.push(document);
        
        await storage.insertAuditLog({
          userId: (req.user as any).id,
          action: 'upload',
          resource: 'document',
          resourceId: document.id,
          details: { batch: true },
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        });
      }
      
      res.json({ 
        success: true, 
        count: uploadedDocuments.length,
        documents: uploadedDocuments 
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== USER DATA WITH PERMISSIONS ==========
  app.get('/api/my/objects', isAuthenticated, async (req, res) => {
    try {
      const objects = await storage.getObjectsByUserAccess((req.user as any).id);
      res.json(objects);
    } catch (error) {
      res.status(500).json({ error: 'Ошибка при получении объектов' });
    }
  });

  app.get('/api/my/documents', isAuthenticated, async (req, res) => {
    try {
      const documents = await storage.getDocumentsByUserAccess((req.user as any).id);
      res.json(documents);
    } catch (error) {
      res.status(500).json({ error: 'Ошибка при получении документов' });
    }
  });

  // ========== DOCUMENT TEMPLATES ROUTES ==========
  app.get('/api/templates', isAuthenticated, async (req, res) => {
    try {
      const templates = await storage.getAllTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: 'Ошибка при получении шаблонов' });
    }
  });

  app.get('/api/templates/:id', isAuthenticated, async (req, res) => {
    try {
      const template = await storage.getTemplateById(req.params.id);
      if (!template) {
        return res.status(404).json({ error: 'Шаблон не найден' });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: 'Ошибка при получении шаблона' });
    }
  });

  app.post('/api/templates', isAuthenticated, hasPermission('documents', 'create'), upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Файл не загружен' });
      }
      // Валидация размера файла
      if (req.file.size > MAX_FILE_SIZE) {
        return res.status(400).json({ error: `Размер файла превышает максимально допустимый (${MAX_FILE_SIZE / 1024 / 1024}MB)` });
      }
      
      const template = await storage.createTemplate({
        name: req.body.name,
        description: req.body.description || null,
        categoryId: req.body.categoryId || null,
        fileName: sanitizeFileName(req.file.originalname),
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        variables: req.body.variables ? (() => {
          try {
            return JSON.parse(req.body.variables);
          } catch {
            return null;
          }
        })() : null,
        createdBy: (req.user as any).id
      });
      res.json(template);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put('/api/templates/:id', isAuthenticated, hasPermission('documents', 'edit'), async (req, res) => {
    try {
      const template = await storage.updateTemplate(req.params.id, req.body);
      res.json(template);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/templates/:id', isAuthenticated, hasPermission('documents', 'delete'), async (req, res) => {
    try {
      await storage.deleteTemplate(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/templates/:id/create-document', isAuthenticated, hasPermission('documents', 'create'), async (req, res) => {
    try {
      const document = await storage.createDocumentFromTemplate(
        req.params.id,
        req.body.variables || {},
        (req.user as any).id
      );
      res.json(document);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== OBJECT LOCATIONS ROUTES ==========
  app.get('/api/objects/:id/location', isAuthenticated, async (req, res) => {
    try {
      const location = await storage.getObjectLocation(req.params.id);
      if (!location) {
        return res.status(404).json({ error: 'Локация не найдена' });
      }
      res.json(location);
    } catch (error) {
      res.status(500).json({ error: 'Ошибка при получении локации' });
    }
  });

  app.get('/api/objects-map', isAuthenticated, async (req, res) => {
    try {
      const objects = await storage.getAllObjectsWithLocations();
      res.json(objects);
    } catch (error) {
      res.status(500).json({ error: 'Ошибка при получении объектов' });
    }
  });

  app.get('/api/objects-map/radius', isAuthenticated, async (req, res) => {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lon = parseFloat(req.query.lon as string);
      const radius = parseFloat(req.query.radius as string) || 10;
      
      if (isNaN(lat) || isNaN(lon)) {
        return res.status(400).json({ error: 'Неверные координаты' });
      }
      
      const objects = await storage.getObjectsInRadius(lat, lon, radius);
      res.json(objects);
    } catch (error) {
      res.status(500).json({ error: 'Ошибка поиска' });
    }
  });

  app.post('/api/objects/:id/location', isAuthenticated, hasPermission('objects', 'edit'), async (req, res) => {
    try {
      const location = await storage.setObjectLocation(req.params.id, req.body);
      res.json(location);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put('/api/objects/:id/location', isAuthenticated, hasPermission('objects', 'edit'), async (req, res) => {
    try {
      const location = await storage.setObjectLocation(req.params.id, req.body);
      res.json(location);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/objects/:id/location', isAuthenticated, hasPermission('objects', 'delete'), async (req, res) => {
    try {
      await storage.deleteObjectLocation(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
