import { db } from "./db";
import {
  users,
  roles,
  permissions,
  rolePermissions,
  userRoles,
  umg,
  services,
  departments,
  objects,
  objectServices,
  documentCategories,
  documents,
  documentServices,
  trainingPrograms,
  trainingProgress,
  trainingTests,
  trainingTestQuestions,
  trainingCertificates,
  auditLogs,
  Permission,
} from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("🌱 Начало инициализации базы данных...");

  try {
    // 1. Создание прав доступа
    console.log("Создание прав доступа...");
    const permissionsList = [
      // Пользователи
      { module: "users", action: "view", description: "Просмотр пользователей" },
      { module: "users", action: "create", description: "Создание пользователей" },
      { module: "users", action: "edit", description: "Редактирование пользователей" },
      { module: "users", action: "delete", description: "Удаление пользователей" },
      
      // Объекты
      { module: "objects", action: "view", description: "Просмотр объектов" },
      { module: "objects", action: "create", description: "Создание объектов" },
      { module: "objects", action: "edit", description: "Редактирование объектов" },
      { module: "objects", action: "delete", description: "Удаление объектов" },
      
      // Документы
      { module: "documents", action: "view", description: "Просмотр документов" },
      { module: "documents", action: "upload", description: "Загрузка документов" },
      { module: "documents", action: "edit", description: "Редактирование документов" },
      { module: "documents", action: "delete", description: "Удаление документов" },
      
      // Оргструктура
      { module: "orgstructure", action: "view", description: "Просмотр оргструктуры" },
      { module: "orgstructure", action: "edit", description: "Редактирование оргструктуры" },
      
      // Роли
      { module: "roles", action: "view", description: "Просмотр ролей" },
      { module: "roles", action: "create", description: "Создание ролей" },
      { module: "roles", action: "edit", description: "Редактирование ролей" },
      { module: "roles", action: "delete", description: "Удаление ролей" },
      
      // Обучение
      { module: "training", action: "view", description: "Просмотр программ обучения" },
      { module: "training", action: "create", description: "Создание программ обучения" },
      { module: "training", action: "manage", description: "Управление обучением" },
      
      // Аудит
      { module: "audit", action: "view", description: "Просмотр журнала аудита" },
      { module: "audit", action: "export", description: "Экспорт журнала аудита" },
    ];

    const createdPermissions = await db.insert(permissions).values(permissionsList).returning();
    console.log(`✓ Создано ${createdPermissions.length} прав доступа`);

    // 2. Создание ролей
    console.log("Создание ролей...");
    const adminRole = await db.insert(roles).values({
      name: "Администратор",
      description: "Полный доступ ко всей системе",
      isSystem: true,
    }).returning();

    const docManagerRole = await db.insert(roles).values({
      name: "Менеджер документации",
      description: "Управление документами и объектами",
      isSystem: true,
    }).returning();

    const engineerRole = await db.insert(roles).values({
      name: "Инженер",
      description: "Просмотр документов и объектов",
      isSystem: true,
    }).returning();

    console.log("✓ Создано 3 роли");

    // 3. Назначение прав администратору (все права)
    console.log("Назначение прав администратору...");
    const adminPermissions = createdPermissions.map((perm: Permission) => ({
      roleId: adminRole[0].id,
      permissionId: perm.id,
    }));
    await db.insert(rolePermissions).values(adminPermissions);
    console.log("✓ Администратору назначены все права");

    // 4. Создание администратора
    console.log("Создание администратора...");
    const hashedPassword = await bcrypt.hash("admin123", 10);
    const adminUser = await db.insert(users).values({
      username: "admin",
      password: hashedPassword,
      fullName: "Системный администратор",
      email: "admin@upravdoc.ru",
      status: "active",
    }).returning();

    await db.insert(userRoles).values({
      userId: adminUser[0].id,
      roleId: adminRole[0].id,
    });
    console.log("✓ Создан администратор (логин: admin, пароль: admin123)");

    // 5. Создание тестовых УМГ
    console.log("Создание тестовых УМГ...");
    const umgNorth = await db.insert(umg).values({
      name: "УМГ Север",
      code: "UMG-NORTH",
      description: "Северное управление магистральных газопроводов",
    }).returning();

    const umgEast = await db.insert(umg).values({
      name: "УМГ Восток",
      code: "UMG-EAST",
      description: "Восточное управление магистральных газопроводов",
    }).returning();

    console.log("✓ Создано 2 УМГ");

    // 6. Создание служб
    console.log("Создание служб...");
    const techServiceNorth = await db.insert(services).values({
      umgId: umgNorth[0].id,
      name: "Техническая служба",
      code: "TECH",
      description: "Служба технического обслуживания",
    }).returning();

    const operServiceNorth = await db.insert(services).values({
      umgId: umgNorth[0].id,
      name: "Эксплуатационная служба",
      code: "OPER",
      description: "Служба эксплуатации",
    }).returning();

    const techServiceEast = await db.insert(services).values({
      umgId: umgEast[0].id,
      name: "Техническая служба",
      code: "TECH",
      description: "Служба технического обслуживания",
    }).returning();

    console.log("✓ Создано 3 службы");

    // 7. Создание подразделений
    console.log("Создание подразделений...");
    const diagDept = await db.insert(departments).values({
      serviceId: techServiceNorth[0].id,
      name: "Отдел диагностики",
      code: "DIAG",
      description: "Диагностика оборудования",
      level: 1,
    }).returning();

    await db.insert(departments).values({
      serviceId: techServiceNorth[0].id,
      name: "Отдел ремонта",
      code: "REPAIR",
      description: "Ремонт оборудования",
      level: 1,
    });

    // Подподразделение (пример вложенности)
    await db.insert(departments).values({
      serviceId: techServiceNorth[0].id,
      parentId: diagDept[0].id,
      name: "Группа КИП",
      code: "KIP",
      description: "Контрольно-измерительные приборы",
      level: 2,
    });

    console.log("✓ Создано 3 подразделения");

    // 8. Создание тестовых объектов
    console.log("Создание тестовых объектов...");
    const ks1 = await db.insert(objects).values({
      code: "OBJ-001",
      name: "Компрессорная станция КС-1",
      type: "Компрессорная станция",
      umgId: umgNorth[0].id,
      status: "active",
      location: "Северный регион",
      description: "Основная компрессорная станция",
      qrCode: "QR-OBJ-001-" + Date.now(),
    }).returning();

    const gp12 = await db.insert(objects).values({
      code: "OBJ-002",
      name: "Газопровод ГП-12",
      type: "Газопровод",
      umgId: umgEast[0].id,
      status: "active",
      location: "Восточный регион",
      qrCode: "QR-OBJ-002-" + Date.now(),
    }).returning();

    // Привязка объектов к службам
    await db.insert(objectServices).values([
      {
        objectId: ks1[0].id,
        serviceId: techServiceNorth[0].id,
        isPrimary: true,
      },
      {
        objectId: ks1[0].id,
        serviceId: operServiceNorth[0].id,
        isPrimary: false,
      },
      {
        objectId: gp12[0].id,
        serviceId: techServiceEast[0].id,
        isPrimary: true,
      },
    ]);

    console.log("✓ Создано 2 объекта");

    // 9. Создание категорий документов
    console.log("Создание категорий документов...");
    await db.insert(documentCategories).values([
      { name: "Техническая документация", code: "TECH", description: "Техническая документация объектов" },
      { name: "Чертежи", code: "DRAWINGS", description: "Проектные чертежи" },
      { name: "Протоколы", code: "PROTOCOLS", description: "Протоколы испытаний" },
      { name: "Инструкции", code: "INSTRUCTIONS", description: "Инструкции по эксплуатации" },
      { name: "Паспорта", code: "PASSPORTS", description: "Паспорта оборудования" },
    ]);

    console.log("✓ Создано 5 категорий документов");

    // 10. Создание тестовых документов
    console.log("Создание тестовых документов...");
    const categories = await db.select().from(documentCategories);
    
    const doc1 = await db.insert(documents).values({
      code: "DOC-001",
      name: "Техническая документация КС-1.pdf",
      fileName: "tech_ks1.pdf",
      filePath: "/uploads/tech_ks1.pdf",
      fileSize: 2457600, // 2.4 MB
      mimeType: "application/pdf",
      categoryId: categories[0].id,
      objectId: ks1[0].id,
      umgId: umgNorth[0].id,
      tags: ["техническая", "КС-1"],
      uploadedBy: adminUser[0].id,
    }).returning();

    await db.insert(documents).values({
      code: "DOC-002",
      name: "Схема газопровода ГП-12.dwg",
      fileName: "schema_gp12.dwg",
      filePath: "/uploads/schema_gp12.dwg",
      fileSize: 5349376, // 5.1 MB
      mimeType: "application/acad",
      categoryId: categories[1].id,
      objectId: gp12[0].id,
      umgId: umgEast[0].id,
      tags: ["чертежи", "ГП-12"],
      uploadedBy: adminUser[0].id,
    });

    await db.insert(documents).values({
      code: "DOC-003",
      name: "Протокол испытаний.docx",
      fileName: "protocol.docx",
      filePath: "/uploads/protocol.docx",
      fileSize: 876544, // 856 KB
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      categoryId: categories[2].id,
      umgId: umgNorth[0].id,
      tags: ["протокол", "испытания"],
      uploadedBy: adminUser[0].id,
    });

    // Привязка документов к службам с правами
    await db.insert(documentServices).values([
      {
        documentId: doc1[0].id,
        serviceId: techServiceNorth[0].id,
        canView: true,
        canEdit: true,
        canDelete: true,
      },
      {
        documentId: doc1[0].id,
        serviceId: operServiceNorth[0].id,
        canView: true,
        canEdit: false,
        canDelete: false,
      },
    ]);

    console.log("✓ Создано 3 документа");

    // 11. Создание программ обучения
    console.log("Создание программ обучения...");
    const program1 = await db.insert(trainingPrograms).values({
      title: "Ремонт компрессорных станций",
      description: "Обучение технологии ремонта компрессорных станций",
      duration: 240, // 4 часа
      videoUrl: "https://example.com/videos/repair.mp4",
      umgId: umgNorth[0].id,
      serviceId: techServiceNorth[0].id,
      createdBy: adminUser[0].id,
    }).returning();

    const program2 = await db.insert(trainingPrograms).values({
      title: "Техника безопасности на объектах",
      description: "Правила техники безопасности при работе на объектах газопроводов",
      duration: 120, // 2 часа
      videoUrl: "https://example.com/videos/safety.mp4",
      createdBy: adminUser[0].id,
    }).returning();

    console.log("✓ Создано 2 программы обучения");

    // 12. Создание тестов
    console.log("Создание тестов обучения...");
    const test1 = await db.insert(trainingTests).values({
      programId: program1[0].id,
      title: "Проверка знаний: Ремонт КС",
      passingScore: 70,
    }).returning();

    await db.insert(trainingTestQuestions).values([
      {
        testId: test1[0].id,
        question: "Какая максимальная температура допустима при работе компрессора?",
        options: JSON.stringify(["60°C", "80°C", "100°C", "120°C"]),
        correctAnswer: 2,
        order: 1,
      },
      {
        testId: test1[0].id,
        question: "Как часто необходимо проводить плановое обслуживание?",
        options: JSON.stringify(["Раз в месяц", "Раз в квартал", "Раз в полгода", "Раз в год"]),
        correctAnswer: 1,
        order: 2,
      },
    ]);

    console.log("✓ Создано тестов: 1, вопросов: 2");

    // 13. Создание записей прогресса обучения
    console.log("Создание прогресса обучения...");
    await db.insert(trainingProgress).values([
      {
        userId: adminUser[0].id,
        programId: program1[0].id,
        progress: 75,
        completed: false,
      },
      {
        userId: adminUser[0].id,
        programId: program2[0].id,
        progress: 100,
        completed: true,
        completedAt: new Date(),
      },
    ]);

    // Создание сертификата
    await db.insert(trainingCertificates).values({
      userId: adminUser[0].id,
      programId: program2[0].id,
      certificateNumber: `CERT-${Date.now()}`,
      score: 95,
    });

    console.log("✓ Создан прогресс обучения и сертификат");

    // 14. Создание записей аудита
    console.log("Создание журнала аудита...");
    await db.insert(auditLogs).values([
      {
        userId: adminUser[0].id,
        action: "create",
        resource: "object",
        resourceId: ks1[0].id,
        details: JSON.stringify({ name: "Компрессорная станция КС-1" }),
        ipAddress: "127.0.0.1",
        success: true,
      },
      {
        userId: adminUser[0].id,
        action: "upload",
        resource: "document",
        resourceId: doc1[0].id,
        details: JSON.stringify({ fileName: "tech_ks1.pdf" }),
        ipAddress: "127.0.0.1",
        success: true,
      },
      {
        userId: adminUser[0].id,
        action: "read",
        resource: "document",
        resourceId: doc1[0].id,
        details: JSON.stringify({ action: "view" }),
        ipAddress: "127.0.0.1",
        success: true,
      },
    ]);

    console.log("✓ Создано 3 записи аудита");

    console.log("\n✅ База данных успешно инициализирована!");
    console.log("\n📝 Данные для входа:");
    console.log("   Логин: admin");
    console.log("   Пароль: admin123");
  } catch (error) {
    console.error("❌ Ошибка при инициализации базы данных:", error);
    throw error;
  }
}

seed()
  .then(() => {
    console.log("\n🎉 Инициализация завершена успешно!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Критическая ошибка:", error);
    process.exit(1);
  });
