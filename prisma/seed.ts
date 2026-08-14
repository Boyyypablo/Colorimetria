import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { SEASON_PALETTES } from "../data/palettes/seasons";
import { shouldSeedDemoUsers } from "../src/lib/db/seed-policy";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "colometria123";

async function seedDemoUsers() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  await prisma.user.upsert({
    where: { email: "consultora@colometria.app" },
    create: {
      email: "consultora@colometria.app",
      name: "Consultora Demo",
      passwordHash,
      role: "CONSULTANT",
      lgpdConsentAt: new Date(),
    },
    update: { role: "CONSULTANT" },
  });

  await prisma.user.upsert({
    where: { email: "admin@colometria.app" },
    create: {
      email: "admin@colometria.app",
      name: "Admin Demo",
      passwordHash,
      role: "ADMIN",
      lgpdConsentAt: new Date(),
    },
    update: { role: "ADMIN" },
  });

  await prisma.user.upsert({
    where: { email: "usuaria@colometria.app" },
    create: {
      email: "usuaria@colometria.app",
      name: "Usuária Demo",
      passwordHash,
      role: "USER",
      lgpdConsentAt: new Date(),
    },
    update: { name: "Usuária Demo" },
  });

  console.log("Usuários demo (somente este Postgres local):");
  console.log("  consultora@colometria.app / colometria123");
  console.log("  usuaria@colometria.app / colometria123");
  console.log("  admin@colometria.app / colometria123");
}

async function main() {
  for (const season of SEASON_PALETTES) {
    await prisma.seasonPalette.upsert({
      where: { id: season.id },
      create: {
        id: season.id,
        namePt: season.namePt,
        nameEn: season.nameEn,
        temperature: season.temperature,
        value: season.value,
        chroma: season.chroma,
        description: season.description,
        useColors: season.useColors,
        avoidColors: season.avoidColors,
        clothing: season.clothing,
        lipstick: season.lipstick,
        eyeshadow: season.eyeshadow,
        base: season.base,
      },
      update: {
        namePt: season.namePt,
        nameEn: season.nameEn,
        temperature: season.temperature,
        value: season.value,
        chroma: season.chroma,
        description: season.description,
        useColors: season.useColors,
        avoidColors: season.avoidColors,
        clothing: season.clothing,
        lipstick: season.lipstick,
        eyeshadow: season.eyeshadow,
        base: season.base,
      },
    });
  }

  if (shouldSeedDemoUsers()) {
    await seedDemoUsers();
    console.log(`Seed OK: ${SEASON_PALETTES.length} paletas + usuários demo`);
  } else {
    console.log(
      `Seed OK: ${SEASON_PALETTES.length} paletas (usuários demo omitidos — não é Postgres local de desenvolvimento).`,
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
