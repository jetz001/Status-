/**
 * Routine & Recurring Task Utilities
 * 
 * Prevents future-cycle routine/recurring tasks (tasks due in future days/months)
 * from unfairly dragging down the user's completion rate or cluttering current active metrics.
 * 
 * Future routine tasks only become active and counted once their due date arrives.
 */

export function isRoutineTask(task) {
  if (!task) return false;
  if (task.recurring_rule && task.recurring_rule !== 'none' && task.recurring_rule !== 'null') {
    return true;
  }
  const listName = (task.list_name || '').toLowerCase();
  const spaceName = (task.space_name || '').toLowerCase();
  return listName.includes('routine') || listName.includes('รูทีน') ||
         spaceName.includes('routine') || spaceName.includes('รูทีน');
}

export function isFutureRoutineTask(task, todayStr = new Date().toISOString().split('T')[0]) {
  if (!isRoutineTask(task)) return false;
  // If task is completed, it belongs to the history of finished work, so keep it in completed metrics
  if (task.status === 'COMPLETED') return false;
  // If due date is strictly in the future (> today), it belongs to the next round and hasn't arrived yet
  if (task.due_date && task.due_date > todayStr) {
    return true;
  }
  return false;
}

export function filterCurrentActiveTasks(tasks, todayStr = new Date().toISOString().split('T')[0]) {
  if (!Array.isArray(tasks)) return [];
  return tasks.filter(t => !isFutureRoutineTask(t, todayStr));
}
