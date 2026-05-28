import bcrypt from "bcryptjs";
import { db } from "./index";
import { companiesTable, usersTable, counterpartiesTable, propertiesTable, tenantsTable } from "./schema/index";
import { eq } from "drizzle-orm";

async function hashPassword(pass: string): Promise<string> {
  return await bcrypt.hash(pass, 12);
}

async function seed() {
  let company;
  const existing = await db.select().from(companiesTable).limit(1);
  if (existing.length > 0) {
    company = existing[0];
    console.log("Using existing company:", company.id);
  } else {
    const [c] = await db.insert(companiesTable).values({
      name: "BuildFlow KZ",
      legalName: 'ТОО "BuildFlow KZ"',
      bin: "220940027534",
      phone: "+7 701 000 1234",
      email: "info@buildflow.kz",
      address: "г. Алматы, ул. Достык 5, офис 301",
      isActive: true,
    }).returning();
    company = c;
    console.log("Company inserted:", company.id);
  }

  const existingUsers = await db.select().from(usersTable).where(eq(usersTable.companyId, company.id)).limit(1);
  if (existingUsers.length === 0) {
    await db.insert(usersTable).values({
      companyId: company.id,
      firstName: "Администратор",
      lastName: "Системы",
      email: "admin@buildflow.kz",
      passwordHash: await hashPassword("admin123"),
      role: "super_admin",
      isActive: true,
    });
    console.log("Admin user inserted");
  } else {
    console.log("Users already exist, skipping");
  }

  const existingCP = await db.select().from(counterpartiesTable).where(eq(counterpartiesTable.companyId, company.id)).limit(1);
  if (existingCP.length === 0) {
    await db.insert(counterpartiesTable).values([
      {
        companyId: company.id,
        fullName: "Иванов Иван Иванович",
        type: "individual",
        phone: "+7 707 111 2222",
        email: "ivanov@example.kz",
      },
      {
        companyId: company.id,
        fullName: 'ТОО "Казстрой Инвест"',
        type: "company",
        iin: "210530001234",
        phone: "+7 727 222 3333",
        email: "info@kazstroy.kz",
      },
    ]);
    console.log("Counterparties inserted");
  } else {
    console.log("Counterparties already exist, skipping");
  }

  const existingProps = await db.select().from(propertiesTable).where(eq(propertiesTable.companyId, company.id)).limit(1);
  if (existingProps.length === 0) {
    await db.insert(propertiesTable).values([
      {
        companyId: company.id,
        projectName: "ЖК Алатау",
        unitNumber: "А-101",
        type: "apartment",
        status: "available",
        block: "A",
        floor: 1,
        area: "65.50",
        comment: "Угловая однокомнатная квартира с видом на горы",
      },
      {
        companyId: company.id,
        projectName: "ЖК Алатау",
        unitNumber: "Б-205",
        type: "apartment",
        status: "sold",
        block: "B",
        floor: 2,
        area: "85.00",
        comment: "Двухкомнатная квартира, продана",
      },
      {
        companyId: company.id,
        projectName: "БЦ Нурлы Жол",
        unitNumber: "О-301",
        type: "office",
        status: "available",
        floor: 3,
        area: "120.00",
        comment: "Офисное помещение класс А",
      },
      {
        companyId: company.id,
        projectName: "ЖК Алатау",
        unitNumber: "В-403",
        type: "apartment",
        status: "reserved",
        block: "C",
        floor: 4,
        area: "45.00",
        comment: "Студия, забронирована",
      },
    ]);
    console.log("Properties inserted");
  } else {
    console.log("Properties already exist, skipping");
  }

  const existingTenants = await db.select().from(tenantsTable).where(eq(tenantsTable.companyId, company.id)).limit(1);
  if (existingTenants.length === 0) {
    await db.insert(tenantsTable).values([
      {
        companyId: company.id,
        fullName: "Петров Петр Петрович",
        iin: "880101300122",
        phone: "+7 705 333 4444",
        email: "petrov@example.kz",
      },
      {
        companyId: company.id,
        fullName: "Садыкова Айгерим Болатовна",
        iin: "950515400678",
        phone: "+7 701 555 6666",
        email: "sadykova@example.kz",
      },
    ]);
    console.log("Tenants inserted");
  } else {
    console.log("Tenants already exist, skipping");
  }

  console.log("Seed complete!");
}

seed().catch(console.error).finally(() => process.exit(0));
