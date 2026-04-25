import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const boards = await prisma.board.findMany({
    include: {
      lists: {
        include: {
          tasks: true
        }
      }
    }
  });

  for (const board of boards) {
    console.log(`Board: ${board.name}`);
    let totalWeight = 0;
    for (const list of board.lists) {
      for (const task of list.tasks) {
        const weight = task.truOverall !== null ? task.truOverall : (task.technicality + task.regularity + task.urgency);
        totalWeight += weight;
        console.log(`  Task: ${task.title} - Legacy: T${task.technicality}R${task.regularity}U${task.urgency} (${task.technicality+task.regularity+task.urgency}), Computed: ${task.truOverall}, Final: ${weight}`);
      }
    }
    console.log(`Total Weight: ${totalWeight}`);
    console.log('---');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
