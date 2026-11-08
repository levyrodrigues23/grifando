import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Not env(): that throws when the variable is missing, and `prisma generate` runs on
    // install (Vercel, CI) where no database is needed. Migrations still require it.
    url: process.env.DATABASE_URL ?? "",
  },
});
