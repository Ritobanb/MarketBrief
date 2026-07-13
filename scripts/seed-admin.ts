import { getPrisma } from "../db/prisma";
import { hashAdminPassword } from "../lib/admin-auth";
import { normalizeEmail } from "../lib/subscriptions";

async function main() {
  const email = normalizeEmail(process.env.ADMIN_ROOT_EMAIL || "");
  const password = process.env.ADMIN_ROOT_PASSWORD || "";
  if (!email || password.length < 10) throw new Error("ADMIN_ROOT_EMAIL and ADMIN_ROOT_PASSWORD (10+ characters) are required.");
  const passwordHash = await hashAdminPassword(password);
  const prisma = getPrisma();
  await prisma.adminUser.upsert({ where: { email }, create: { email, passwordHash, role: "root" }, update: { passwordHash, role: "root", isActive: true, failedLoginAttempts: 0, lockedUntil: null } });
  await prisma.adminSession.deleteMany({ where: { user: { email } } });
  await prisma.$disconnect();
  console.log(`Root administrator saved for ${email}.`);
}

main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
