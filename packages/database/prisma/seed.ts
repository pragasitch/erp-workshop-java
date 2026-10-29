import { createPrismaClient, hashPassword, Role } from '../src/index.js';

const prisma = createPrismaClient(
  process.env.DATABASE_URL ?? 'postgresql://erp:erp@localhost:5432/erp',
);

// Demo accounts for the workshop (also shown on the login page). Re-running the seed resets them.
const demoUsers = [
  { email: 'admin@erp.local', name: 'Admin User', role: Role.ADMIN },
  { email: 'staff@erp.local', name: 'Staff User', role: Role.STAFF },
];
const DEMO_PASSWORD = 'password';

async function main() {
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  for (const user of demoUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, role: user.role, passwordHash },
      create: { ...user, passwordHash },
    });
  }
  console.log(`Seeded ${demoUsers.length} demo users (password: "${DEMO_PASSWORD}").`);
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
