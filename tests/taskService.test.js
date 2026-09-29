const taskService = require('../src/services/taskService');

describe('taskService', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create/getAll/findById', () => {
    test('creates a task with defaults', () => {
      const task = taskService.create({ title: 'Task 1' });

      expect(task.id).toEqual(expect.any(String));
      expect(task.title).toBe('Task 1');
      expect(task.description).toBe('');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.dueDate).toBeNull();
      expect(task.completedAt).toBeNull();
      expect(task.createdAt).toEqual(expect.any(String));
    });

    test('creates a task with supplied fields', () => {
      const dueDate = '2030-01-01T00:00:00.000Z';
      const task = taskService.create({
        title: 'Task 1',
        description: 'Details',
        status: 'in_progress',
        priority: 'high',
        dueDate,
      });

      expect(task).toMatchObject({
        title: 'Task 1',
        description: 'Details',
        status: 'in_progress',
        priority: 'high',
        dueDate,
      });
    });

    test('getAll returns all tasks', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });

      expect(taskService.getAll()).toHaveLength(2);
    });

    test('getAll returns a new array', () => {
      taskService.create({ title: 'Task 1' });

      const result = taskService.getAll();
      result.pop();

      expect(taskService.getAll()).toHaveLength(1);
    });

    test('findById returns an existing task', () => {
      const task = taskService.create({ title: 'Task 1' });

      expect(taskService.findById(task.id)).toEqual(task);
    });

    test('findById returns undefined when task does not exist', () => {
      expect(taskService.findById('missing')).toBeUndefined();
    });
  });

  describe('getByStatus', () => {
    test('returns only tasks with the exact status', () => {
      taskService.create({ title: 'Todo', status: 'todo' });
      taskService.create({ title: 'Progress', status: 'in_progress' });
      taskService.create({ title: 'Done', status: 'done' });

      expect(taskService.getByStatus('in_progress')).toHaveLength(1);
      expect(taskService.getByStatus('in_progress')[0].title).toBe('Progress');
    });

    test('does not perform partial status matching', () => {
      taskService.create({ title: 'Progress', status: 'in_progress' });

      expect(taskService.getByStatus('progress')).toEqual([]);
    });

    test('returns an empty array for an unknown status', () => {
      taskService.create({ title: 'Task', status: 'todo' });

      expect(taskService.getByStatus('unknown')).toEqual([]);
    });
  });

  describe('getPaginated', () => {
    beforeEach(() => {
      for (let i = 1; i <= 5; i++) {
        taskService.create({ title: `Task ${i}` });
      }
    });

    test('page 1 returns the first page', () => {
      const result = taskService.getPaginated(1, 2);

      expect(result.map((task) => task.title)).toEqual(['Task 1', 'Task 2']);
    });

    test('page 2 returns the second page', () => {
      const result = taskService.getPaginated(2, 2);

      expect(result.map((task) => task.title)).toEqual(['Task 3', 'Task 4']);
    });

    test('last partial page returns remaining tasks', () => {
      const result = taskService.getPaginated(3, 2);

      expect(result.map((task) => task.title)).toEqual(['Task 5']);
    });

    test('page beyond available data returns an empty array', () => {
      expect(taskService.getPaginated(4, 2)).toEqual([]);
    });
  });

  describe('getStats', () => {
    test('counts tasks by status', () => {
      taskService.create({ title: 'Todo', status: 'todo' });
      taskService.create({ title: 'Todo 2', status: 'todo' });
      taskService.create({ title: 'Progress', status: 'in_progress' });
      taskService.create({ title: 'Done', status: 'done' });

      expect(taskService.getStats()).toMatchObject({
        todo: 2,
        in_progress: 1,
        done: 1,
      });
    });

    test('counts an overdue unfinished task', () => {
      taskService.create({
        title: 'Overdue',
        dueDate: '2000-01-01T00:00:00.000Z',
      });

      expect(taskService.getStats().overdue).toBe(1);
    });

    test('does not count completed overdue tasks', () => {
      const task = taskService.create({
        title: 'Completed overdue',
        dueDate: '2000-01-01T00:00:00.000Z',
        status: 'done',
      });

      expect(taskService.getStats().overdue).toBe(0);
      expect(task).toBeDefined();
    });

    test('does not count future tasks as overdue', () => {
      taskService.create({
        title: 'Future',
        dueDate: '2099-01-01T00:00:00.000Z',
      });

      expect(taskService.getStats().overdue).toBe(0);
    });

    test('ignores tasks without a due date for overdue count', () => {
      taskService.create({ title: 'No due date' });

      expect(taskService.getStats().overdue).toBe(0);
    });
  });

  describe('update', () => {
    test('updates an existing task', () => {
      const task = taskService.create({ title: 'Old title' });

      const updated = taskService.update(task.id, {
        title: 'New title',
        priority: 'high',
      });

      expect(updated).toMatchObject({
        id: task.id,
        title: 'New title',
        priority: 'high',
      });
    });

    test('preserves fields not included in the update', () => {
      const task = taskService.create({
        title: 'Task',
        description: 'Keep me',
        priority: 'high',
      });

      const updated = taskService.update(task.id, { title: 'Updated' });

      expect(updated.description).toBe('Keep me');
      expect(updated.priority).toBe('high');
    });

    test('returns null for a missing task', () => {
      expect(taskService.update('missing', { title: 'Updated' })).toBeNull();
    });
  });

  describe('remove', () => {
    test('removes an existing task', () => {
      const task = taskService.create({ title: 'Task' });

      expect(taskService.remove(task.id)).toBe(true);
      expect(taskService.findById(task.id)).toBeUndefined();
    });

    test('returns false for a missing task', () => {
      expect(taskService.remove('missing')).toBe(false);
    });
  });

  describe('completeTask', () => {
    test('marks a task as done and sets completedAt', () => {
      const task = taskService.create({ title: 'Task', priority: 'high' });

      const completed = taskService.completeTask(task.id);

      expect(completed.status).toBe('done');
      expect(completed.completedAt).toEqual(expect.any(String));
    });

    test('preserves the existing priority when completing a task', () => {
      const task = taskService.create({ title: 'Important', priority: 'high' });

      const completed = taskService.completeTask(task.id);

      expect(completed.priority).toBe('high');
    });

    test('returns null for a missing task', () => {
      expect(taskService.completeTask('missing')).toBeNull();
    });
  });

  describe('assignTask', () => {
    test('assigns a task to a user', () => {
      const task = taskService.create({ title: 'Task' });

      const updated = taskService.assignTask(task.id, 'Sandeep');

      expect(updated.assignee).toBe('Sandeep');
    });

    test('trims surrounding whitespace from an assignee name', () => {
      const task = taskService.create({ title: 'Task' });

      const updated = taskService.assignTask(task.id, '  Sandeep  ');

      expect(updated.assignee).toBe('Sandeep');
    });

    test('preserves other task fields when assigning', () => {
      const task = taskService.create({
        title: 'Task',
        description: 'Details',
        priority: 'high',
      });

      const updated = taskService.assignTask(task.id, 'Sandeep');

      expect(updated).toMatchObject({
        id: task.id,
        title: 'Task',
        description: 'Details',
        priority: 'high',
        assignee: 'Sandeep',
      });
    });

    test('supports reassignment', () => {
      const task = taskService.create({ title: 'Task' });

      taskService.assignTask(task.id, 'First User');
      const reassigned = taskService.assignTask(task.id, 'Second User');

      expect(reassigned.assignee).toBe('Second User');
    });

    test('returns null for a missing task', () => {
      expect(taskService.assignTask('missing', 'Sandeep')).toBeNull();
    });
  });

  test('_reset clears the in-memory store', () => {
    taskService.create({ title: 'Task' });

    taskService._reset();

    expect(taskService.getAll()).toEqual([]);
  });
});
