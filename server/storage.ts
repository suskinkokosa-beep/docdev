import { db } from "./db";
import { 
  users, roles, permissions, rolePermissions, userRoles,
  umg, services, departments, objects, objectServices,
  documentCategories, documents, documentServices,
  trainingPrograms, trainingProgress, trainingTests,
  trainingTestQuestions, trainingCertificates,
  auditLogs, userUmgAccess, userServiceAccess,
  documentVersions, notifications, testResults,
  documentTemplates, objectLocations,
  type InsertUser, type User, type InsertRole, type Role,
  type InsertPermission, type Permission,
  type InsertUmg, type Umg, type InsertService, type Service,
  type InsertDepartment, type Department,
  type InsertObject, type PipelineObject,
  type InsertDocumentCategory, type DocumentCategory,
  type InsertDocument, type UpdateDocument, type Document,
  type InsertTrainingProgram, type TrainingProgram,
  type InsertAuditLog, type AuditLog
} from "@shared/schema";
import { eq, and, or, inArray, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

export const storage = {
  // ========== Users ==========
  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  },

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  },

  async getAllUsers() {
    return await db.select().from(users);
  },

  async insertUser(data: InsertUser) {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const [user] = await db.insert(users).values({
      ...data,
      password: hashedPassword
    }).returning();
    return user;
  },

  async updateUser(id: string, data: Partial<InsertUser>) {
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    const [user] = await db.update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  },

  async deleteUser(id: string) {
    await db.delete(users).where(eq(users.id, id));
  },

  async verifyPassword(user: User, password: string): Promise<boolean> {
    return await bcrypt.compare(password, user.password);
  },

  async updateUserPassword(userId: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    const user = await this.getUserById(userId);
    if (!user) {
      return { success: false, error: "Пользователь не найден" };
    }

    const isPasswordValid = await this.verifyPassword(user, currentPassword);
    if (!isPasswordValid) {
      return { success: false, error: "Неверный текущий пароль" };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, userId));

    return { success: true };
  },

  // ========== Roles ==========
  async getAllRoles() {
    return await db.select().from(roles);
  },

  async getRoleById(id: string): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.id, id));
    return role;
  },

  async insertRole(data: InsertRole) {
    const [role] = await db.insert(roles).values(data).returning();
    return role;
  },

  async updateRole(id: string, data: Partial<InsertRole>) {
    const [role] = await db.update(roles)
      .set(data)
      .where(eq(roles.id, id))
      .returning();
    return role;
  },

  async deleteRole(id: string) {
    await db.delete(roles).where(eq(roles.id, id));
  },

  // ========== Permissions ==========
  async getAllPermissions() {
    return await db.select().from(permissions);
  },

  async insertPermission(data: InsertPermission) {
    const [permission] = await db.insert(permissions).values(data).returning();
    return permission;
  },

  async getRolePermissions(roleId: string) {
    return await db.select({
      permission: permissions
    })
    .from(rolePermissions)
    .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
    .where(eq(rolePermissions.roleId, roleId));
  },

  async assignPermissionToRole(roleId: string, permissionId: string) {
    await db.insert(rolePermissions).values({ roleId, permissionId });
  },

  async removePermissionFromRole(roleId: string, permissionId: string) {
    await db.delete(rolePermissions)
      .where(and(
        eq(rolePermissions.roleId, roleId),
        eq(rolePermissions.permissionId, permissionId)
      ));
  },

  // ========== User Roles ==========
  async getUserRoles(userId: string) {
    return await db.select({
      role: roles
    })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, userId));
  },

  async assignRoleToUser(userId: string, roleId: string) {
    await db.insert(userRoles).values({ userId, roleId });
  },

  async removeRoleFromUser(userId: string, roleId: string) {
    await db.delete(userRoles)
      .where(and(
        eq(userRoles.userId, userId),
        eq(userRoles.roleId, roleId)
      ));
  },

  // ========== UMG ==========
  async getAllUmg() {
    return await db.select().from(umg);
  },

  async getUmgById(id: string): Promise<Umg | undefined> {
    const [item] = await db.select().from(umg).where(eq(umg.id, id));
    return item;
  },

  async insertUmg(data: InsertUmg) {
    const [item] = await db.insert(umg).values(data).returning();
    return item;
  },

  async updateUmg(id: string, data: Partial<InsertUmg>) {
    const [item] = await db.update(umg)
      .set(data)
      .where(eq(umg.id, id))
      .returning();
    return item;
  },

  async deleteUmg(id: string) {
    await db.delete(umg).where(eq(umg.id, id));
  },

  // ========== Services ==========
  async getAllServices() {
    return await db.select().from(services);
  },

  async getServicesByUmg(umgId: string) {
    return await db.select().from(services).where(eq(services.umgId, umgId));
  },

  async insertService(data: InsertService) {
    const [service] = await db.insert(services).values(data).returning();
    return service;
  },

  async updateService(id: string, data: Partial<InsertService>) {
    const [service] = await db.update(services)
      .set(data)
      .where(eq(services.id, id))
      .returning();
    return service;
  },

  async deleteService(id: string) {
    await db.delete(services).where(eq(services.id, id));
  },

  // ========== Departments ==========
  async getAllDepartments() {
    return await db.select().from(departments);
  },

  async getDepartmentsByService(serviceId: string) {
    return await db.select().from(departments).where(eq(departments.serviceId, serviceId));
  },

  async insertDepartment(data: InsertDepartment) {
    const [department] = await db.insert(departments).values(data).returning();
    return department;
  },

  async updateDepartment(id: string, data: Partial<InsertDepartment>) {
    const [department] = await db.update(departments)
      .set(data)
      .where(eq(departments.id, id))
      .returning();
    return department;
  },

  async deleteDepartment(id: string) {
    await db.delete(departments).where(eq(departments.id, id));
  },

  // ========== Objects ==========
  async getAllObjects() {
    return await db.select().from(objects);
  },

  async getObjectById(id: string): Promise<PipelineObject | undefined> {
    const [object] = await db.select().from(objects).where(eq(objects.id, id));
    return object;
  },

  async getObjectByQrCode(qrCode: string): Promise<PipelineObject | undefined> {
    const [object] = await db.select().from(objects).where(eq(objects.qrCode, qrCode));
    return object;
  },

  async insertObject(data: InsertObject) {
    const qrCode = `OBJ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const [object] = await db.insert(objects).values({ ...data, qrCode }).returning();
    return object;
  },

  async updateObject(id: string, data: Partial<InsertObject>) {
    const [object] = await db.update(objects)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(objects.id, id))
      .returning();
    return object;
  },

  async deleteObject(id: string) {
    await db.delete(objects).where(eq(objects.id, id));
  },

  async assignServiceToObject(objectId: string, serviceId: string, isPrimary: boolean = false) {
    await db.insert(objectServices).values({ objectId, serviceId, isPrimary });
  },

  async removeServiceFromObject(objectId: string, serviceId: string) {
    await db.delete(objectServices)
      .where(and(
        eq(objectServices.objectId, objectId),
        eq(objectServices.serviceId, serviceId)
      ));
  },

  async getObjectServices(objectId: string) {
    return await db.select({
      service: services,
      isPrimary: objectServices.isPrimary
    })
    .from(objectServices)
    .innerJoin(services, eq(services.id, objectServices.serviceId))
    .where(eq(objectServices.objectId, objectId));
  },

  // ========== Document Categories ==========
  async getAllDocumentCategories() {
    return await db.select().from(documentCategories);
  },

  async insertDocumentCategory(data: InsertDocumentCategory) {
    const [category] = await db.insert(documentCategories).values(data).returning();
    return category;
  },

  async updateDocumentCategory(id: string, data: Partial<InsertDocumentCategory>) {
    const [category] = await db.update(documentCategories)
      .set(data)
      .where(eq(documentCategories.id, id))
      .returning();
    return category;
  },

  async deleteDocumentCategory(id: string) {
    await db.delete(documentCategories).where(eq(documentCategories.id, id));
  },

  // ========== Documents ==========
  async getAllDocuments() {
    return await db.select({
      id: documents.id,
      code: documents.code,
      name: documents.name,
      fileName: documents.fileName,
      filePath: documents.filePath,
      fileSize: documents.fileSize,
      mimeType: documents.mimeType,
      categoryId: documents.categoryId,
      objectId: documents.objectId,
      umgId: documents.umgId,
      tags: documents.tags,
      metadata: documents.metadata,
      uploadedBy: documents.uploadedBy,
      version: documents.version,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
      category: {
        id: documentCategories.id,
        name: documentCategories.name,
        code: documentCategories.code,
      }
    })
    .from(documents)
    .leftJoin(documentCategories, eq(documents.categoryId, documentCategories.id));
  },

  async getDocumentById(id: string): Promise<Document | undefined> {
    const [doc] = await db.select().from(documents).where(eq(documents.id, id));
    return doc;
  },

  async getDocumentsByObjectId(objectId: string) {
    return await db.select({
      id: documents.id,
      code: documents.code,
      name: documents.name,
      fileName: documents.fileName,
      filePath: documents.filePath,
      fileSize: documents.fileSize,
      mimeType: documents.mimeType,
      categoryId: documents.categoryId,
      objectId: documents.objectId,
      umgId: documents.umgId,
      tags: documents.tags,
      metadata: documents.metadata,
      uploadedBy: documents.uploadedBy,
      version: documents.version,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
      category: {
        id: documentCategories.id,
        name: documentCategories.name,
        code: documentCategories.code,
      }
    })
    .from(documents)
    .leftJoin(documentCategories, eq(documents.categoryId, documentCategories.id))
    .where(eq(documents.objectId, objectId));
  },

  async insertDocument(data: InsertDocument) {
    const code = `DOC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const [doc] = await db.insert(documents).values({ ...data, code }).returning();
    return doc;
  },

  async insertDocumentServices(documentId: string, serviceIds: string[]) {
    const values = serviceIds.map(serviceId => ({
      documentId,
      serviceId,
      canView: true,
      canEdit: false,
      canDelete: false
    }));
    await db.insert(documentServices).values(values);
  },

  async updateDocument(id: string, data: UpdateDocument) {
    const [doc] = await db.update(documents)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(documents.id, id))
      .returning();
    return doc;
  },

  async deleteDocument(id: string) {
    await db.delete(documents).where(eq(documents.id, id));
  },

  async assignServiceToDocument(documentId: string, serviceId: string, permissions: { canView?: boolean, canEdit?: boolean, canDelete?: boolean }) {
    await db.insert(documentServices).values({ 
      documentId, 
      serviceId,
      canView: permissions.canView ?? true,
      canEdit: permissions.canEdit ?? false,
      canDelete: permissions.canDelete ?? false
    });
  },

  // ========== Training Programs ==========
  async getAllTrainingPrograms() {
    return await db.select().from(trainingPrograms);
  },

  async getTrainingProgramById(id: string): Promise<TrainingProgram | undefined> {
    const [program] = await db.select().from(trainingPrograms).where(eq(trainingPrograms.id, id));
    return program;
  },

  async insertTrainingProgram(data: InsertTrainingProgram) {
    const [program] = await db.insert(trainingPrograms).values(data).returning();
    return program;
  },

  async updateTrainingProgram(id: string, data: Partial<InsertTrainingProgram>) {
    const [program] = await db.update(trainingPrograms)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(trainingPrograms.id, id))
      .returning();
    return program;
  },

  async deleteTrainingProgram(id: string) {
    await db.delete(trainingPrograms).where(eq(trainingPrograms.id, id));
  },

  async getUserTrainingProgress(userId: string, programId: string) {
    const [progress] = await db.select()
      .from(trainingProgress)
      .where(and(
        eq(trainingProgress.userId, userId),
        eq(trainingProgress.programId, programId)
      ));
    return progress;
  },

  async updateTrainingProgress(userId: string, programId: string, progressValue: number) {
    const existing = await this.getUserTrainingProgress(userId, programId);
    if (existing) {
      const [updated] = await db.update(trainingProgress)
        .set({ 
          progress: progressValue, 
          completed: progressValue >= 100,
          completedAt: progressValue >= 100 ? new Date() : null,
          updatedAt: new Date()
        })
        .where(eq(trainingProgress.id, existing.id))
        .returning();
      return updated;
    } else {
      const [newProgress] = await db.insert(trainingProgress)
        .values({ userId, programId, progress: progressValue })
        .returning();
      return newProgress;
    }
  },

  // ========== Audit Logs ==========
  async insertAuditLog(data: InsertAuditLog) {
    const [log] = await db.insert(auditLogs).values(data).returning();
    return log;
  },

  async getAuditLogs(filters?: { 
    userId?: string; 
    resource?: string; 
    action?: string; 
    success?: boolean;
    dateFrom?: string;
    dateTo?: string;
    limit?: number 
  }) {
    let query = db.select({
      id: auditLogs.id,
      userId: auditLogs.userId,
      action: auditLogs.action,
      resource: auditLogs.resource,
      resourceId: auditLogs.resourceId,
      details: auditLogs.details,
      ipAddress: auditLogs.ipAddress,
      userAgent: auditLogs.userAgent,
      success: auditLogs.success,
      createdAt: auditLogs.createdAt,
      user: {
        id: users.id,
        username: users.username,
        fullName: users.fullName,
      }
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id));
    
    const conditions = [];
    
    if (filters?.userId) {
      conditions.push(eq(auditLogs.userId, filters.userId));
    }
    if (filters?.resource) {
      conditions.push(eq(auditLogs.resource, filters.resource));
    }
    if (filters?.action) {
      conditions.push(eq(auditLogs.action, filters.action as any));
    }
    if (filters?.success !== undefined) {
      conditions.push(eq(auditLogs.success, filters.success));
    }
    if (filters?.dateFrom) {
      conditions.push(sql`${auditLogs.createdAt} >= ${filters.dateFrom}`);
    }
    if (filters?.dateTo) {
      conditions.push(sql`${auditLogs.createdAt} <= ${filters.dateTo}`);
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    const logs = await query.orderBy(sql`${auditLogs.createdAt} DESC`).limit(filters?.limit || 100);
    return logs;
  },

  // ========== User Access Control ==========
  async getUserUmgAccess(userId: string) {
    return await db.select({
      umg: umg
    })
    .from(userUmgAccess)
    .innerJoin(umg, eq(umg.id, userUmgAccess.umgId))
    .where(eq(userUmgAccess.userId, userId));
  },

  async assignUmgToUser(userId: string, umgId: string) {
    await db.insert(userUmgAccess).values({ userId, umgId });
  },

  async getUserServiceAccess(userId: string) {
    return await db.select({
      service: services
    })
    .from(userServiceAccess)
    .innerJoin(services, eq(services.id, userServiceAccess.serviceId))
    .where(eq(userServiceAccess.userId, userId));
  },

  async assignServiceToUser(userId: string, serviceId: string) {
    await db.insert(userServiceAccess).values({ userId, serviceId });
  },

  async clearUserUmgAccess(userId: string) {
    await db.delete(userUmgAccess).where(eq(userUmgAccess.userId, userId));
  },

  async clearUserServiceAccess(userId: string) {
    await db.delete(userServiceAccess).where(eq(userServiceAccess.userId, userId));
  },

  // ========== User Permissions Check ==========
  async getUserPermissions(userId: string): Promise<Permission[]> {
    const userRolesData = await this.getUserRoles(userId);
    const roleIds = userRolesData.map(r => r.role.id);
    
    if (roleIds.length === 0) return [];
    
    const perms = await db.select({
      permission: permissions
    })
    .from(rolePermissions)
    .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
    .where(inArray(rolePermissions.roleId, roleIds));
    
    return perms.map(p => p.permission);
  },

  async userHasPermission(userId: string, module: string, action: string): Promise<boolean> {
    const perms = await this.getUserPermissions(userId);
    return perms.some(p => p.module === module && p.action === action);
  },

  // ========== Document Versions ==========
  async getDocumentVersions(documentId: string) {
    return await db.select()
      .from(documentVersions)
      .where(eq(documentVersions.documentId, documentId))
      .orderBy(sql`${documentVersions.version} DESC`);
  },

  async createDocumentVersion(data: any) {
    const [version] = await db.insert(documentVersions).values(data).returning();
    return version;
  },

  // ========== Notifications ==========
  async getUserNotifications(userId: string, unreadOnly: boolean = false) {
    const whereConditions = unreadOnly 
      ? and(eq(notifications.userId, userId), eq(notifications.read, false))
      : eq(notifications.userId, userId);
    
    return await db.select()
      .from(notifications)
      .where(whereConditions)
      .orderBy(sql`${notifications.createdAt} DESC`)
      .limit(50);
  },

  async createNotification(data: any) {
    const [notification] = await db.insert(notifications).values(data).returning();
    return notification;
  },

  async markNotificationAsRead(notificationId: string) {
    const [notification] = await db.update(notifications)
      .set({ read: true, readAt: new Date() })
      .where(eq(notifications.id, notificationId))
      .returning();
    return notification;
  },

  async markAllNotificationsAsRead(userId: string) {
    await db.update(notifications)
      .set({ read: true, readAt: new Date() })
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.read, false)
      ));
  },

  // ========== Training Tests ==========
  async getTestsByProgram(programId: string) {
    return await db.select().from(trainingTests).where(eq(trainingTests.programId, programId));
  },

  async getTestQuestions(testId: string) {
    return await db.select()
      .from(trainingTestQuestions)
      .where(eq(trainingTestQuestions.testId, testId))
      .orderBy(trainingTestQuestions.order);
  },

  async createTest(data: any) {
    const [test] = await db.insert(trainingTests).values(data).returning();
    return test;
  },

  async createTestQuestion(data: any) {
    const [question] = await db.insert(trainingTestQuestions).values(data).returning();
    return question;
  },

  async submitTestResult(data: any) {
    const [result] = await db.insert(testResults).values(data).returning();
    return result;
  },

  async getUserTestResults(userId: string, testId: string) {
    return await db.select()
      .from(testResults)
      .where(and(
        eq(testResults.userId, userId),
        eq(testResults.testId, testId)
      ))
      .orderBy(sql`${testResults.completedAt} DESC`);
  },

  // ========== Certificates ==========
  async getUserCertificates(userId: string) {
    return await db.select()
      .from(trainingCertificates)
      .where(eq(trainingCertificates.userId, userId))
      .orderBy(sql`${trainingCertificates.issuedAt} DESC`);
  },

  async createCertificate(data: any) {
    const certificateNumber = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const [certificate] = await db.insert(trainingCertificates)
      .values({ ...data, certificateNumber })
      .returning();
    return certificate;
  },

  async getCertificateByNumber(certificateNumber: string) {
    const [certificate] = await db.select()
      .from(trainingCertificates)
      .where(eq(trainingCertificates.certificateNumber, certificateNumber));
    return certificate;
  },

  // ========== Search & Filter ==========
  async searchDocuments(params: {
    query: string;
    userId: string;
    categoryId?: string;
    objectId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    tags?: string[];
    limit?: number;
    offset?: number;
  }) {
    const { query, userId, categoryId, objectId, dateFrom, dateTo, tags, limit = 20, offset = 0 } = params;
    
    // Очистка запроса от tsquery операторов и опасных символов
    const sanitizedQuery = query.replace(/[!@#$%^&*()+=[\]{};':"\\|,.<>?]/g, ' ').trim();
    if (sanitizedQuery.length < 2) return [];
    
    const userAccess = await this.getUserServiceAccess(userId);
    const serviceIds = userAccess.map(s => s.service.id);
    if (serviceIds.length === 0) return [];
    
    // Создаем tsquery для полнотекстового поиска
    const tsQuery = sql`plainto_tsquery('russian', ${sanitizedQuery})`;
    const useFullTextSearch = sanitizedQuery.length > 0;
    
    // Создаем SQL фрагменты для ранжирования и подсветки
    const rank = useFullTextSearch 
      ? sql<number>`ts_rank_cd(${documents.searchVector}, ${tsQuery})`
      : sql<number>`similarity(${documents.name}, ${sanitizedQuery})`;
    
    const headline = useFullTextSearch
      ? sql<string>`ts_headline('russian', COALESCE(${documents.textContent}, ${documents.name}), ${tsQuery}, 'StartSel=<mark>, StopSel=</mark>, MaxFragments=2, MinWords=5, MaxWords=15')`
      : sql<string>`''`;
    
    // Создаем условия фильтрации
    const conditions: any[] = [
      inArray(documentServices.serviceId, serviceIds),
      eq(documentServices.canView, true)
    ];
    
    // Добавляем полнотекстовый поиск или триграмный fallback
    if (useFullTextSearch) {
      conditions.push(sql`${documents.searchVector} @@ ${tsQuery}`);
    } else {
      conditions.push(
        or(
          sql`similarity(${documents.name}, ${sanitizedQuery}) > 0.3`,
          sql`${documents.name} ILIKE ${'%' + sanitizedQuery + '%'}`,
          sql`${documents.fileName} ILIKE ${'%' + sanitizedQuery + '%'}`
        )
      );
    }
    
    // Фильтры
    if (categoryId) {
      conditions.push(eq(documents.categoryId, categoryId));
    }
    if (objectId) {
      conditions.push(eq(documents.objectId, objectId));
    }
    if (dateFrom && dateTo) {
      conditions.push(
        sql`${documents.createdAt} BETWEEN ${dateFrom} AND ${dateTo}`
      );
    }
    if (tags && tags.length > 0) {
      conditions.push(sql`${documents.tags} && ARRAY[${sql.join(tags.map(t => sql`${t}`), sql`, `)}]::text[]`);
    }
    
    // Выполняем запрос
    const results = await db.select({
      document: documents,
      rank,
      highlight: headline,
      category: documentCategories
    })
    .from(documents)
    .innerJoin(documentServices, eq(documentServices.documentId, documents.id))
    .leftJoin(documentCategories, eq(documents.categoryId, documentCategories.id))
    .where(and(...conditions))
    .orderBy(sql`${rank} DESC`, sql`${documents.createdAt} DESC`)
    .limit(limit)
    .offset(offset);
    
    return results.map(r => ({
      ...r.document,
      highlight: r.highlight,
      rank: r.rank,
      category: r.category
    }));
  },
  
  async searchDocumentsCount(params: {
    query: string;
    userId: string;
    categoryId?: string;
    objectId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    tags?: string[];
  }): Promise<number> {
    const { query, userId, categoryId, objectId, dateFrom, dateTo, tags } = params;
    
    const sanitizedQuery = query.replace(/[!@#$%^&*()+=[\]{};':"\\|,.<>?]/g, ' ').trim();
    if (sanitizedQuery.length < 2) return 0;
    
    const userAccess = await this.getUserServiceAccess(userId);
    const serviceIds = userAccess.map(s => s.service.id);
    if (serviceIds.length === 0) return 0;
    
    const tsQuery = sql`plainto_tsquery('russian', ${sanitizedQuery})`;
    const useFullTextSearch = sanitizedQuery.length > 0;
    
    const conditions: any[] = [
      inArray(documentServices.serviceId, serviceIds),
      eq(documentServices.canView, true)
    ];
    
    if (useFullTextSearch) {
      conditions.push(sql`${documents.searchVector} @@ ${tsQuery}`);
    } else {
      conditions.push(
        or(
          sql`similarity(${documents.name}, ${sanitizedQuery}) > 0.3`,
          sql`${documents.name} ILIKE ${'%' + sanitizedQuery + '%'}`,
          sql`${documents.fileName} ILIKE ${'%' + sanitizedQuery + '%'}`
        )
      );
    }
    
    if (categoryId) conditions.push(eq(documents.categoryId, categoryId));
    if (objectId) conditions.push(eq(documents.objectId, objectId));
    if (dateFrom && dateTo) {
      conditions.push(sql`${documents.createdAt} BETWEEN ${dateFrom} AND ${dateTo}`);
    }
    if (tags && tags.length > 0) {
      conditions.push(sql`${documents.tags} && ARRAY[${sql.join(tags.map(t => sql`${t}`), sql`, `)}]::text[]`);
    }
    
    const [result] = await db.select({ count: sql<number>`count(DISTINCT ${documents.id})` })
      .from(documents)
      .innerJoin(documentServices, eq(documentServices.documentId, documents.id))
      .where(and(...conditions));
    
    return result.count || 0;
  },

  async getObjectsByUserAccess(userId: string) {
    const userAccess = await this.getUserServiceAccess(userId);
    const serviceIds = userAccess.map(s => s.service.id);
    
    if (serviceIds.length === 0) return [];
    
    const results = await db.select({
      object: objects,
      service: services
    })
    .from(objects)
    .innerJoin(objectServices, eq(objectServices.objectId, objects.id))
    .innerJoin(services, eq(services.id, objectServices.serviceId))
    .where(inArray(objectServices.serviceId, serviceIds));
    
    return results;
  },

  async getDocumentsByUserAccess(userId: string) {
    const userAccess = await this.getUserServiceAccess(userId);
    const serviceIds = userAccess.map(s => s.service.id);
    
    if (serviceIds.length === 0) return [];
    
    const results = await db.select({
      document: documents,
      service: services,
      permissions: documentServices
    })
    .from(documents)
    .innerJoin(documentServices, eq(documentServices.documentId, documents.id))
    .innerJoin(services, eq(services.id, documentServices.serviceId))
    .where(and(
      inArray(documentServices.serviceId, serviceIds),
      eq(documentServices.canView, true)
    ));
    
    return results;
  },

  // ========== Document Templates ==========
  async getAllTemplates() {
    return await db.select().from(documentTemplates).where(eq(documentTemplates.isActive, true));
  },

  async getTemplateById(id: string) {
    const [template] = await db.select().from(documentTemplates).where(eq(documentTemplates.id, id));
    return template;
  },

  async createTemplate(data: any) {
    const [template] = await db.insert(documentTemplates).values(data).returning();
    return template;
  },

  async updateTemplate(id: string, data: any) {
    const [template] = await db.update(documentTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(documentTemplates.id, id))
      .returning();
    return template;
  },

  async deleteTemplate(id: string) {
    // Мягкое удаление - просто деактивируем
    const [template] = await db.update(documentTemplates)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(documentTemplates.id, id))
      .returning();
    return template;
  },

  async createDocumentFromTemplate(templateId: string, variables: Record<string, any>, userId: string) {
    const template = await this.getTemplateById(templateId);
    if (!template) throw new Error('Template not found');
    
    // Здесь можно добавить логику замены переменных в документе
    // Для Word/Excel это требует дополнительных библиотек (docxtemplater, exceljs)
    
    return template;
  },

  // ========== Object Locations ==========
  async getObjectLocation(objectId: string) {
    const [location] = await db.select()
      .from(objectLocations)
      .where(eq(objectLocations.objectId, objectId));
    return location;
  },

  async getAllObjectsWithLocations() {
    return await db.select({
      object: objects,
      location: objectLocations
    })
    .from(objects)
    .leftJoin(objectLocations, eq(objectLocations.objectId, objects.id));
  },

  async getObjectsInRadius(latitude: number, longitude: number, radiusKm: number) {
    // Простой расчет расстояния (для более точного используйте PostGIS)
    const results = await db.select({
      object: objects,
      location: objectLocations
    })
    .from(objects)
    .innerJoin(objectLocations, eq(objectLocations.objectId, objects.id));
    
    // Фильтруем по радиусу (приблизительный расчет)
    return results.filter(r => {
      if (!r.location) return false;
      const lat1 = parseFloat(r.location.latitude);
      const lon1 = parseFloat(r.location.longitude);
      const lat2 = latitude;
      const lon2 = longitude;
      
      const R = 6371; // Радиус Земли в км
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      
      return distance <= radiusKm;
    });
  },

  async setObjectLocation(objectId: string, data: any) {
    // Проверяем существует ли уже локация
    const existing = await this.getObjectLocation(objectId);
    
    if (existing) {
      const [location] = await db.update(objectLocations)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(objectLocations.objectId, objectId))
        .returning();
      return location;
    } else {
      const [location] = await db.insert(objectLocations)
        .values({ objectId, ...data })
        .returning();
      return location;
    }
  },

  async deleteObjectLocation(objectId: string) {
    await db.delete(objectLocations).where(eq(objectLocations.objectId, objectId));
  }
};
