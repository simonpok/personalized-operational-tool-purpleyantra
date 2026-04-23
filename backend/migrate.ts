import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const projects = await prisma.project.findMany();
  if (projects.length === 0) return;

  const project = projects[0];

  // Create Operational Board
  const board = await prisma.board.create({
    data: {
      name: 'Ops Board',
      projectId: project.id
    }
  });

  // Assign existing lists to this board
  await prisma.boardList.updateMany({
    where: { boardId: null },
    data: { boardId: board.id }
  });

  console.log('Migrated successfully to board', board.id);
}

main().catch(console.error).finally(() => prisma.$disconnect());
