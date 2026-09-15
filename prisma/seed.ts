import "dotenv/config";

import { DEFAULT_USER_ID } from "../src/lib/constants";
import { createPrismaClient } from "../src/server/db/client";

const prisma = createPrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { id: DEFAULT_USER_ID },
    update: {},
    create: {
      id: DEFAULT_USER_ID,
      email: "joselevy@alu.ufc.br",
      displayName: "Jose Levy",
      nativeLanguage: "pt-BR",
    },
  });

  console.log(`Seeded default user: ${user.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
