import { Task, Project } from '@prisma/client';

// Mock implementation of Google Calendar API
export async function createTaskInvite(task: Task & { project: Project }, options: {
  editEmails: string[];
  viewEmails: string[];
  calendarId: string;
}) {
  console.log(`[Mock GCal] Creating calendar invite for task: ${task.title}`);
  console.log(`[Mock GCal] TRU Score: ${task.truScore} | Progress: ${task.progress}%`);
  console.log(`[Mock GCal] Editors: ${options.editEmails.join(', ')}`);
  console.log(`[Mock GCal] Viewers: ${options.viewEmails.join(', ')}`);
  
  // Return a generated mock event ID
  const mockEventId = `mock_gcal_event_${Math.random().toString(36).substring(7)}`;
  return mockEventId;
}
