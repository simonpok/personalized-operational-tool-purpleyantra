import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import "dotenv/config";
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();
const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
  }
});

app.use(cors());
app.use(express.json());

// Setup Multer for local storage
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });
app.use('/uploads', express.static(uploadDir));

// --- Helpers ---
const logActivity = async (taskId: string, text: string) => {
  try {
    await prisma.comment.create({ data: { taskId, text, isSystem: true } });
  } catch (e) {
    console.error('Failed to log activity', e);
  }
};

const recomputeTaskTRU = async (taskId: string) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { checklists: { include: { items: true } } }
    });
    if (!task) return;

    let allItems: any[] = [];
    task.checklists.forEach(cl => allItems.push(...cl.items));

    const scored = allItems.filter(i => i.T && i.R && i.U);
    if (scored.length === 0) {
      await prisma.task.update({
        where: { id: taskId },
        data: { avgT: null, avgR: null, avgU: null, truOverall: null }
      });
      return;
    }

    const avgT = parseFloat((scored.reduce((a,b) => a + b.T!, 0) / scored.length).toFixed(1));
    const avgR = parseFloat((scored.reduce((a,b) => a + b.R!, 0) / scored.length).toFixed(1));
    const avgU = parseFloat((scored.reduce((a,b) => a + b.U!, 0) / scored.length).toFixed(1));
    const truOverall = parseFloat(((avgT + avgR + avgU) / 3).toFixed(1));

    await prisma.task.update({
      where: { id: taskId },
      data: { avgT, avgR, avgU, truOverall }
    });
  } catch (e) {
    console.error('Failed to recompute task TRU', e);
  }
};

// --- Project & Goal Routes ---

// Get all projects (filtered by active goals with progress)
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      include: { 
        goals: { 
          where: { isArchived: false },
          orderBy: { order: 'asc' },
          include: { tasks: true }
        } 
      }
    });

    // Calculate progress for each goal
    const projectsWithProgress = projects.map(project => ({
      ...project,
      goals: project.goals.map(goal => {
        const totalTasks = goal.tasks.length;
        const progress = totalTasks > 0
          ? goal.tasks.reduce((sum, t) => sum + t.progress, 0) / totalTasks
          : 0;
        return { ...goal, progress: Math.round(progress) };
      })
    }));

    res.json(projectsWithProgress);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Get a specific goal with stats
app.get('/api/stats/:goalId', async (req, res) => {
  try {
    const { goalId } = req.params;
    const goal = await prisma.goal.findUnique({
      where: { id: goalId, isArchived: false },
      include: {
        project: {
          include: { departments: { include: { tasks: { where: { goalId } } } } }
        },
        tasks: true
      }
    });

    if (!goal) return res.status(404).json({ error: 'Goal not found' });

    // Calculate department progress for THIS goal
    const depts = goal.project.departments.map(d => {
      const taskCount = d.tasks.length;
      const avgProgress = taskCount > 0 
        ? d.tasks.reduce((sum, t) => sum + t.progress, 0) / taskCount 
        : 0;
      return {
        id: d.id,
        name: d.name,
        color: d.color,
        progress: Math.round(avgProgress)
      };
    });

    // Calculate goal progress
    const totalTasks = goal.tasks.length;
    const goalProgress = totalTasks > 0
      ? goal.tasks.reduce((sum, t) => sum + t.progress, 0) / totalTasks
      : 0;

    res.json({
      projectName: goal.project.name,
      goalTitle: goal.title,
      s1: goal.s1,
      s2: goal.s2,
      progress: Math.round(goalProgress),
      departments: depts
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch goal stats' });
  }
});

// --- Kanban Routes ---

// Fetch all lists for a goal
app.get('/api/lists', async (req, res) => {
  try {
    const { goalId } = req.query;
    if (!goalId) return res.status(400).json({ error: 'goalId is required' });

    const lists = await prisma.boardList.findMany({
      where: { goalId: String(goalId), goal: { isArchived: false } },
      orderBy: { order: 'asc' },
      include: {
        tasks: {
          orderBy: { order: 'asc' },
          include: { 
            department: true,
            checklists: { include: { items: { orderBy: { createdAt: 'asc' } } } },
            attachments: true,
            comments: { orderBy: { createdAt: 'desc' } }
          }
        }
      }
    });
    res.json(lists);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch lists' });
  }
});

// List Management
app.put('/api/lists/:id', async (req, res) => {
  try {
    const list = await prisma.boardList.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: 'Failed to update list' });
  }
});

app.delete('/api/lists/:id', async (req, res) => {
  try {
    await prisma.boardList.delete({ where: { id: req.params.id } });
    res.json({ message: 'List deleted' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete list' });
  }
});

// Create a new goal
app.post('/api/goals', async (req, res) => {
  try {
    const { projectId, title, s1, s2, order } = req.body;
    const newGoal = await prisma.goal.create({
      data: { projectId, title, s1, s2, order }
    });
    
    // Create default lists for the new goal
    await prisma.boardList.createMany({
      data: [
        { title: 'Backlog', order: 0, goalId: newGoal.id },
        { title: 'In Progress', order: 1, goalId: newGoal.id },
        { title: 'Done', order: 2, goalId: newGoal.id }
      ]
    });

    res.json(newGoal);
  } catch (e) {
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

// Create a new task
app.post('/api/tasks', async (req, res) => {
  try {
    const { title, listId, goalId, departmentId, technicality, regularity, urgency, truScore } = req.body;
    
    // Validate TRU to be exactly 1, 2, or 3
    if (![1, 2, 3].includes(technicality) || ![1, 2, 3].includes(regularity) || ![1, 2, 3].includes(urgency)) {
      return res.status(400).json({ error: 'T, R, and U must be 1, 2, or 3.' });
    }

    const count = await prisma.task.count({ where: { listId } });
    const newTask = await prisma.task.create({
      data: {
        title,
        listId,
        goalId,
        departmentId,
        technicality,
        regularity,
        urgency,
        truScore,
        order: count,
        progress: 0
      },
      include: { 
        department: true,
        checklists: { include: { items: true } },
        attachments: true,
        comments: { orderBy: { createdAt: 'desc' } }
      }
    });

    await logActivity(newTask.id, 'Task created in list');

    res.json(newTask);
  } catch (e) {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update a task (for description, TRU, dueDate, etc.)
app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const updatedTask = await prisma.task.update({
      where: { id },
      data,
      include: {
        department: true,
        checklists: { include: { items: true } },
        attachments: true,
        comments: { orderBy: { createdAt: 'desc' } }
      }
    });

    const actionText = Object.keys(data).includes('listId') ? "moved task to a new list" : "updated task properties";
    await logActivity(updatedTask.id, actionText);

    res.json(updatedTask);
  } catch (e) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete a task
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    await prisma.task.delete({ where: { id: req.params.id } });
    res.json({ message: 'Task deleted' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// --- Checklists & Attachments Routes ---

app.post('/api/tasks/:id/checklists', async (req, res) => {
  try {
    const checklist = await prisma.checklist.create({
      data: {
        title: req.body.title || 'Checklist',
        taskId: req.params.id
      },
      include: { items: true }
    });
    res.json(checklist);
  } catch (e) {
    res.status(500).json({ error: 'Failed to create checklist' });
  }
});

app.delete('/api/checklists/:id', async (req, res) => {
  try {
    await prisma.checklist.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (e) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/checklists/:id/items', async (req, res) => {
  try {
    const { title, dueDate, T, R, U } = req.body;
    let truAvg = null;
    if (T && R && U) {
      truAvg = parseFloat(((T + R + U) / 3).toFixed(1));
    }
    
    const item = await prisma.checklistItem.create({
      data: {
        title,
        dueDate,
        T, R, U, truAvg,
        checklistId: req.params.id
      },
      include: { checklist: true }
    });

    await recomputeTaskTRU(item.checklist.taskId);
    await logActivity(item.checklist.taskId, `Added checklist item: ${title}`);

    res.json(item);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

app.put('/api/checklist-items/:id', async (req, res) => {
  try {
    const { T, R, U, isCompleted, title, dueDate } = req.body;
    
    // Grab original to check changes
    const original = await prisma.checklistItem.findUnique({ where: { id: req.params.id }, include: { checklist: true } });
    if (!original) return res.status(404).json({error: 'Not found'});

    let truAvg = original.truAvg;
    const finalT = T !== undefined ? T : original.T;
    const finalR = R !== undefined ? R : original.R;
    const finalU = U !== undefined ? U : original.U;

    if (finalT && finalR && finalU) {
      truAvg = parseFloat(((finalT + finalR + finalU) / 3).toFixed(1));
    } else {
      truAvg = null; // missing a value
    }

    const item = await prisma.checklistItem.update({
      where: { id: req.params.id },
      data: { T, R, U, truAvg, isCompleted, title, dueDate },
      include: { checklist: true }
    });

    if (T !== undefined || R !== undefined || U !== undefined) {
      await recomputeTaskTRU(item.checklist.taskId);
    }
    if (isCompleted !== undefined && isCompleted !== original.isCompleted) {
      await logActivity(item.checklist.taskId, `Marked checklist item "${original.title}" as ${isCompleted ? 'complete' : 'incomplete'}`);
    }

    res.json(item);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

app.delete('/api/checklist-items/:id', async (req, res) => {
  try {
    const item = await prisma.checklistItem.findUnique({ where: { id: req.params.id }, include: { checklist: true } });
    if (!item) return res.status(404).json({error: 'Not found'});
    
    await prisma.checklistItem.delete({ where: { id: req.params.id } });
    await recomputeTaskTRU(item.checklist.taskId);
    await logActivity(item.checklist.taskId, `Deleted checklist item: ${item.title}`);
    
    res.json({ message: 'Deleted' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/tasks/:id/attachments', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const attachment = await prisma.attachment.create({
      data: {
        filename: req.file.originalname,
        url: `/uploads/${req.file.filename}`,
        size: req.file.size,
        mimeType: req.file.mimetype,
        taskId: req.params.id
      }
    });
    await logActivity(req.params.id, `Attached file ${req.file.originalname}`);
    res.json(attachment);
  } catch (e) {
    res.status(500).json({ error: 'Failed to upload attachment' });
  }
});

app.delete('/api/attachments/:id', async (req, res) => {
  try {
    const att = await prisma.attachment.findUnique({ where: { id: req.params.id } });
    if (att) {
      const filepath = path.join(__dirname, '../', att.url);
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
      await prisma.attachment.delete({ where: { id: req.params.id } });
    }
    res.json({ message: 'Deleted' });
  } catch (e) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Soft delete a goal (move to trash)
app.delete('/api/goals/:id', async (req, res) => {
  try {
    await prisma.goal.update({
      where: { id: req.params.id },
      data: { isArchived: true }
    });
    res.json({ message: 'Goal moved to trash' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to move goal to trash' });
  }
});

// Restore a goal from trash
app.put('/api/goals/:id/restore', async (req, res) => {
  try {
    await prisma.goal.update({
      where: { id: req.params.id },
      data: { isArchived: false }
    });
    res.json({ message: 'Goal restored' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to restore goal' });
  }
});

// Permanently delete a goal
app.delete('/api/goals/:id/purge', async (req, res) => {
  try {
    await prisma.goal.delete({ where: { id: req.params.id } });
    res.json({ message: 'Goal permanently deleted' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to purge goal' });
  }
});

// Purge all archived goals
app.delete('/api/trash/purge-all', async (req, res) => {
  try {
    await prisma.goal.deleteMany({ where: { isArchived: true } });
    res.json({ message: 'Trash bin cleared' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to clear trash bin' });
  }
});

// Get all archived goals (Trash Bin)
app.get('/api/trash', async (req, res) => {
  try {
    const archivedGoals = await prisma.goal.findMany({
      where: { isArchived: true },
      include: { project: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(archivedGoals);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch trash bin' });
  }
});

// --- Seeding ---

app.post('/api/seed', async (req, res) => {
  try {
    console.log('Seeding hierarchical mission data...');
    
    const result = await prisma.$transaction(async (tx) => {
      await tx.subtask.deleteMany({});
      await tx.task.deleteMany({});
      await tx.boardList.deleteMany({});
      await tx.goal.deleteMany({});
      await tx.department.deleteMany({});
      await tx.project.deleteMany({});

      const project = await tx.project.create({
        data: {
          name: 'Project Vanguard',
          description: 'A multi-phase mission to deploy secure infrastructure.'
        }
      });

      const depts = await Promise.all([
        tx.department.create({ data: { name: 'Engineering', projectId: project.id, color: '#2563EB' } }),
        tx.department.create({ data: { name: 'Security', projectId: project.id, color: '#DC2626' } }),
        tx.department.create({ data: { name: 'Marketing', projectId: project.id, color: '#D97706' } })
      ]);

      // Phase 1: Status 1
      const goal1 = await tx.goal.create({
        data: {
          title: 'Status 1',
          s1: 'Theoretical Concept',
          s2: 'Functional MVP',
          order: 0,
          projectId: project.id
        }
      });

      // Create lists for Goal 1
      const listsG1 = await Promise.all([
        tx.boardList.create({ data: { title: 'Backlog', order: 0, goalId: goal1.id } }),
        tx.boardList.create({ data: { title: 'Doing', order: 1, goalId: goal1.id } }),
        tx.boardList.create({ data: { title: 'Done', order: 2, goalId: goal1.id } })
      ]);

      await tx.task.createMany({
        data: [
          { title: 'Define Core APIs', goalId: goal1.id, listId: listsG1[1].id, departmentId: depts[0].id, technicality: 4, regularity: 1, urgency: 5, truScore: 3.8, progress: 60 },
          { title: 'Security Protocol Draft', goalId: goal1.id, listId: listsG1[0].id, departmentId: depts[1].id, technicality: 5, regularity: 2, urgency: 4, truScore: 4.1, progress: 0 }
        ]
      });

      return { projectId: project.id, goal1Id: goal1.id };
    });

    res.json({ message: 'Hierarchical data seeded', ...result });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Seeding failed' });
  }
});

// --- Socket.io ---

io.on('connection', (socket) => {
  socket.on('task:progress:update', async (data: { taskId: string, progress: number }) => {
    try {
      const task = await prisma.task.update({
        where: { id: data.taskId },
        data: { progress: data.progress }
      });
      io.emit('progress:updated', { taskId: task.id, progress: task.progress });
    } catch (e) {
      console.error(e);
    }
  });

  socket.on('task:drag', async (data: { taskId: string, newListId: string, newOrder: number }) => {
    try {
      const task = await prisma.task.update({
        where: { id: data.taskId },
        data: { listId: data.newListId, order: data.newOrder }
      });
      io.emit('board:updated', { taskId: task.id });
    } catch (e) {
      console.error(e);
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`TRU-OPS Backend Running on http://localhost:${PORT}`);
});
