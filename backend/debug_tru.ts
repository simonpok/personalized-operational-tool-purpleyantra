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
    let tTotal = 0, rTotal = 0, uTotal = 0;
    for (const list of board.lists) {
      for (const task of list.tasks) {
        tTotal += task.technicality || 0;
        rTotal += task.regularity || 0;
        uTotal += task.urgency || 0;
        console.log(`  Task: ${task.title} - T${task.technicality} R${task.regularity} U${task.urgency}`);
      }
    }
    console.log(`Total TRU: T${tTotal} R${rTotal} U${uTotal} (Sum: ${tTotal + rTotal + uTotal})`);
    console.log('---');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
