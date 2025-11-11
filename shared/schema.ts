import { sql } from "drizzle-orm";
import { 
  pgTable, 
  text, 
  varchar, 
  timestamp, 
  integer, 
  boolean,
  jsonb,
  pgEnum
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Enums
export const actionTypeEnum = pgEnum('action_type', [
  'create', 'read', 'update', 'delete', 'upload', 'download', 'login', 'logout'
]);

export const objectStatusEnum = pgEnum('object_status', ['active', 'maintenance', 'inactive']);
export const userStatusEnum = pgEnum('user_status', ['active', 'inactive', 'suspended']);

// Users table
export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").unique(),
  status: userStatusEnum("status").default('active').notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Roles table
export const roles = pgTable("roles", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  isSystem: boolean("is_system").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Permissions table
export const permissions = pgTable("permissions", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  module: text("module").notNull(), // users, objects, documents, etc.
  action: text("action").notNull(), // view, create, edit, delete
  description: text("description"),
});

// Role-Permission junction
export const rolePermissions = pgTable("role_permissions", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  roleId: varchar("role_id", { length: 36 }).notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: varchar("permission_id", { length: 36 }).notNull().references(() => permissions.id, { onDelete: 'cascade' }),
});

// User-Role junction
export const userRoles = pgTable("user_roles", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: varchar("role_id", { length: 36 }).notNull().references(() => roles.id, { onDelete: 'cascade' }),
});

// UMG (Управление магистральных газопроводов)
export const umg = pgTable("umg", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Services (Службы)
export const services = pgTable("services", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  umgId: varchar("umg_id", { length: 36 }).notNull().references(() => umg.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  code: text("code").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Departments (Подразделения) - с неограниченной вложенностью
export const departments = pgTable("departments", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  serviceId: varchar("service_id", { length: 36 }).notNull().references(() => services.id, { onDelete: 'cascade' }),
  parentId: varchar("parent_id", { length: 36 }),
  name: text("name").notNull(),
  code: text("code").notNull(),
  description: text("description"),
  level: integer("level").default(1).notNull(), // для быстрого поиска по уровню
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Objects (Объекты газопроводов)
export const objects = pgTable("objects", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  type: text("type").notNull(), // компрессорная станция, газопровод, крановый узел
  umgId: varchar("umg_id", { length: 36 }).notNull().references(() => umg.id, { onDelete: 'restrict' }),
  status: objectStatusEnum("status").default('active').notNull(),
  qrCode: text("qr_code").unique(),
  location: text("location"),
  description: text("description"),
  metadata: jsonb("metadata"), // дополнительные характеристики
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Object-Service junction (многослужебные объекты)
export const objectServices = pgTable("object_services", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  objectId: varchar("object_id", { length: 36 }).notNull().references(() => objects.id, { onDelete: 'cascade' }),
  serviceId: varchar("service_id", { length: 36 }).notNull().references(() => services.id, { onDelete: 'cascade' }),
  isPrimary: boolean("is_primary").default(false).notNull(),
});

// Document Categories
export const documentCategories = pgTable("document_categories", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Documents
export const documents = pgTable("documents", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  categoryId: varchar("category_id", { length: 36 }).notNull().references(() => documentCategories.id, { onDelete: 'restrict' }),
  objectId: varchar("object_id", { length: 36 }).references(() => objects.id, { onDelete: 'set null' }),
  umgId: varchar("umg_id", { length: 36 }).notNull().references(() => umg.id, { onDelete: 'restrict' }),
  tags: text("tags").array(),
  metadata: jsonb("metadata"),
  uploadedBy: varchar("uploaded_by", { length: 36 }).notNull().references(() => users.id, { onDelete: 'restrict' }),
  version: integer("version").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Document-Service junction (умное распределение документов)
export const documentServices = pgTable("document_services", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id", { length: 36 }).notNull().references(() => documents.id, { onDelete: 'cascade' }),
  serviceId: varchar("service_id", { length: 36 }).notNull().references(() => services.id, { onDelete: 'cascade' }),
  canView: boolean("can_view").default(true).notNull(),
  canEdit: boolean("can_edit").default(false).notNull(),
  canDelete: boolean("can_delete").default(false).notNull(),
});

// Training Programs
export const trainingPrograms = pgTable("training_programs", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  duration: integer("duration").notNull(), // в минутах
  videoUrl: text("video_url"),
  materials: jsonb("materials"), // дополнительные материалы
  umgId: varchar("umg_id", { length: 36 }).references(() => umg.id, { onDelete: 'set null' }),
  serviceId: varchar("service_id", { length: 36 }).references(() => services.id, { onDelete: 'set null' }),
  createdBy: varchar("created_by", { length: 36 }).notNull().references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Training Progress
export const trainingProgress = pgTable("training_progress", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  programId: varchar("program_id", { length: 36 }).notNull().references(() => trainingPrograms.id, { onDelete: 'cascade' }),
  progress: integer("progress").default(0).notNull(), // 0-100
  completed: boolean("completed").default(false).notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Training Tests
export const trainingTests = pgTable("training_tests", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  programId: varchar("program_id", { length: 36 }).notNull().references(() => trainingPrograms.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  passingScore: integer("passing_score").default(70).notNull(), // проходной балл
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Training Test Questions
export const trainingTestQuestions = pgTable("training_test_questions", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  testId: varchar("test_id", { length: 36 }).notNull().references(() => trainingTests.id, { onDelete: 'cascade' }),
  question: text("question").notNull(),
  options: jsonb("options").notNull(), // массив вариантов ответов
  correctAnswer: integer("correct_answer").notNull(), // индекс правильного ответа
  order: integer("order").notNull(),
});

// Training Certificates
export const trainingCertificates = pgTable("training_certificates", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  programId: varchar("program_id", { length: 36 }).notNull().references(() => trainingPrograms.id, { onDelete: 'cascade' }),
  certificateNumber: text("certificate_number").notNull().unique(),
  score: integer("score").notNull(),
  issuedAt: timestamp("issued_at").defaultNow().notNull(),
});

// Audit Logs
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).references(() => users.id),
  action: actionTypeEnum("action").notNull(),
  resource: text("resource").notNull(), // тип ресурса: document, object, user
  resourceId: text("resource_id"), // ID ресурса
  details: jsonb("details"), // детали действия
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  success: boolean("success").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User-UMG access (для контроля доступа пользователей к УМГ)
export const userUmgAccess = pgTable("user_umg_access", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  umgId: varchar("umg_id", { length: 36 }).notNull().references(() => umg.id, { onDelete: 'cascade' }),
});

// User-Service access (для контроля доступа пользователей к службам)
export const userServiceAccess = pgTable("user_service_access", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  serviceId: varchar("service_id", { length: 36 }).notNull().references(() => services.id, { onDelete: 'cascade' }),
});

// Document Versions (версионирование документов)
export const documentVersions = pgTable("document_versions", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id", { length: 36 }).notNull().references(() => documents.id, { onDelete: 'cascade' }),
  version: integer("version").notNull(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  changes: text("changes"), // описание изменений
  uploadedBy: varchar("uploaded_by", { length: 36 }).notNull().references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Notifications (уведомления)
export const notificationTypeEnum = pgEnum('notification_type', [
  'document_uploaded', 'document_updated', 'document_deleted',
  'object_created', 'object_updated',
  'training_assigned', 'training_completed',
  'user_created', 'role_assigned', 'system'
]);

export const notifications = pgTable("notifications", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  link: text("link"), // ссылка на ресурс
  resourceType: text("resource_type"), // тип ресурса: document, object, training
  resourceId: text("resource_id"), // ID ресурса
  read: boolean("read").default(false).notNull(),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Test Results (результаты тестов)
export const testResults = pgTable("test_results", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  testId: varchar("test_id", { length: 36 }).notNull().references(() => trainingTests.id, { onDelete: 'cascade' }),
  score: integer("score").notNull(), // баллы
  passed: boolean("passed").notNull(),
  answers: jsonb("answers").notNull(), // ответы пользователя
  completedAt: timestamp("completed_at").defaultNow().notNull(),
});

// Document Templates (шаблоны документов)
export const documentTemplates = pgTable("document_templates", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  categoryId: varchar("category_id", { length: 36 }).references(() => documentCategories.id, { onDelete: 'set null' }),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  variables: jsonb("variables"), // переменные в шаблоне [{ name: "objectName", label: "Название объекта", type: "text" }]
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: varchar("created_by", { length: 36 }).notNull().references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Object Locations (геолокация объектов)
export const objectLocations = pgTable("object_locations", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  objectId: varchar("object_id", { length: 36 }).notNull().unique().references(() => objects.id, { onDelete: 'cascade' }),
  latitude: text("latitude").notNull(), // широта
  longitude: text("longitude").notNull(), // долгота
  altitude: text("altitude"), // высота (опционально)
  address: text("address"), // текстовый адрес
  region: text("region"), // регион
  geoData: jsonb("geo_data"), // дополнительные геоданные
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertRoleSchema = createInsertSchema(roles).omit({ id: true, createdAt: true });
export const insertPermissionSchema = createInsertSchema(permissions).omit({ id: true });
export const insertUmgSchema = createInsertSchema(umg).omit({ id: true, createdAt: true });
export const insertServiceSchema = createInsertSchema(services).omit({ id: true, createdAt: true });
export const insertDepartmentSchema = createInsertSchema(departments).omit({ id: true, createdAt: true });
export const insertObjectSchema = createInsertSchema(objects).omit({ id: true, qrCode: true, createdAt: true, updatedAt: true });
export const insertDocumentCategorySchema = createInsertSchema(documentCategories).omit({ id: true, createdAt: true });
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, code: true, version: true, createdAt: true, updatedAt: true });
export const updateDocumentSchema = insertDocumentSchema.partial().extend({ version: z.number().optional() });
export const insertTrainingProgramSchema = createInsertSchema(trainingPrograms).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTrainingProgressSchema = createInsertSchema(trainingProgress).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Role = typeof roles.$inferSelect;

export type InsertPermission = z.infer<typeof insertPermissionSchema>;
export type Permission = typeof permissions.$inferSelect;

export type InsertUmg = z.infer<typeof insertUmgSchema>;
export type Umg = typeof umg.$inferSelect;

export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof services.$inferSelect;

export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type Department = typeof departments.$inferSelect;

export type InsertObject = z.infer<typeof insertObjectSchema>;
export type PipelineObject = typeof objects.$inferSelect;

export type InsertDocumentCategory = z.infer<typeof insertDocumentCategorySchema>;
export type DocumentCategory = typeof documentCategories.$inferSelect;

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type UpdateDocument = z.infer<typeof updateDocumentSchema>;
export type Document = typeof documents.$inferSelect;

export type InsertTrainingProgram = z.infer<typeof insertTrainingProgramSchema>;
export type TrainingProgram = typeof trainingPrograms.$inferSelect;

export type InsertTrainingProgress = z.infer<typeof insertTrainingProgressSchema>;
export type TrainingProgress = typeof trainingProgress.$inferSelect;

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
