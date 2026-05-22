import { defineConfig } from "drizzle-kit";

const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!url) {
  throw new Error("POSTGRES_URL or DATABASE_URL must be set");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url,
  },
});
