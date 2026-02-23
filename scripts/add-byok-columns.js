import postgres from "postgres";

const connectionString = process.env.POSTGRES_URL;
if (!connectionString) {
  console.error("POSTGRES_URL is not set");
  process.exit(1);
}

const sql = postgres(connectionString);

async function migrate() {
  try {
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS openai_key_encrypted VARCHAR(512)`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS openai_key_iv VARCHAR(64)`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS anthropic_key_encrypted VARCHAR(512)`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS anthropic_key_iv VARCHAR(64)`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_key_encrypted VARCHAR(512)`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_key_iv VARCHAR(64)`;
    console.log("BYOK columns added successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

migrate();
