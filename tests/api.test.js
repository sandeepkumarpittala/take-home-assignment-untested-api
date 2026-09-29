const request = require('supertest');

const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('Task API', () => {
  beforeEach(() => {
    taskService._reset();
    jest.restoreAllMocks();
  });

  describe('POST /tasks', () => {
    test('creates a task', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({ title: 'Write tests', priority: 'high' });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        title: 'Write tests',
        priority: 'high',
        status: 'todo',
      });
      expect(response.body.id).toEqual(expect.any(String));
    });

    test('rejects a missing title', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({ priority: 'high' });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/title is required/i);
    });

    test('rejects a whitespace-only title', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({ title: '   ' });

      expect(response.status).toBe(400);
    });

    test('rejects an invalid status', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({ title: 'Task', status: 'invalid' });

      expect(response.status).toBe(400);
    });

    test('rejects an invalid priority', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({ title: 'Task', priority: 'urgent' });

      expect(response.status).toBe(400);
    });

    test('rejects an invalid due date', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({ title: 'Task', dueDate: 'not-a-date' });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /tasks', () => {
    test('returns all tasks', async () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });

      const response = await request(app).get('/tasks');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });

    test('filters tasks by exact status', async () => {
      taskService.create({ title: 'Todo', status: 'todo' });
      taskService.create({ title: 'Progress', status: 'in_progress' });

      const response = await request(app)
        .get('/tasks')
        .query({ status: 'in_progress' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].status).toBe('in_progress');
    });

    test('does not return partial status matches', async () => {
      taskService.create({ title: 'Progress', status: 'in_progress' });

      const response = await request(app)
        .get('/tasks')
        .query({ status: 'progress' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    test('returns the first page when page=1', async () => {
      for (let i = 1; i <= 5; i++) {
        taskService.create({ title: `Task ${i}` });
      }

      const response = await request(app)
        .get('/tasks')
        .query({ page: 1, limit: 2 });

      expect(response.status).toBe(200);
      expect(response.body.map((task) => task.title)).toEqual([
        'Task 1',
        'Task 2',
      ]);
    });

    test('returns the second page when page=2', async () => {
      for (let i = 1; i <= 5; i++) {
        taskService.create({ title: `Task ${i}` });
      }

      const response = await request(app)
        .get('/tasks')
        .query({ page: 2, limit: 2 });

      expect(response.body.map((task) => task.title)).toEqual([
        'Task 3',
        'Task 4',
      ]);
    });

    test('uses defaults when pagination values are missing', async () => {
      for (let i = 1; i <= 3; i++) {
        taskService.create({ title: `Task ${i}` });
      }

      const response = await request(app).get('/tasks').query({ page: 1 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);
    });
  });

  describe('PUT /tasks/:id', () => {
    test('updates an existing task', async () => {
      const task = taskService.create({ title: 'Old title' });

      const response = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: 'New title', priority: 'high' });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('New title');
      expect(response.body.priority).toBe('high');
    });

    test('returns 400 for an invalid update', async () => {
      const task = taskService.create({ title: 'Task' });

      const response = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: '   ' });

      expect(response.status).toBe(400);
    });

    test('returns 404 for a missing task', async () => {
      const response = await request(app)
        .put('/tasks/missing')
        .send({ title: 'Updated' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Task not found');
    });
  });

  describe('DELETE /tasks/:id', () => {
    test('deletes an existing task with 204', async () => {
      const task = taskService.create({ title: 'Task' });

      const response = await request(app).delete(`/tasks/${task.id}`);

      expect(response.status).toBe(204);
      expect(taskService.findById(task.id)).toBeUndefined();
    });

    test('returns 404 for a missing task', async () => {
      const response = await request(app).delete('/tasks/missing');

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    test('completes an existing task', async () => {
      const task = taskService.create({
        title: 'Important',
        priority: 'high',
      });

      const response = await request(app).patch(
        `/tasks/${task.id}/complete`
      );

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('done');
      expect(response.body.completedAt).toEqual(expect.any(String));
      expect(response.body.priority).toBe('high');
    });

    test('returns 404 for a missing task', async () => {
      const response = await request(app).patch(
        '/tasks/missing/complete'
      );

      expect(response.status).toBe(404);
    });
  });

  describe('GET /tasks/stats', () => {
    test('returns task counts and overdue count', async () => {
      taskService.create({ title: 'Todo' });
      taskService.create({ title: 'Progress', status: 'in_progress' });
      taskService.create({ title: 'Done', status: 'done' });

      const response = await request(app).get('/tasks/stats');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        todo: 1,
        in_progress: 1,
        done: 1,
        overdue: 0,
      });
    });

    test('counts an overdue unfinished task', async () => {
      taskService.create({
        title: 'Overdue',
        dueDate: '2000-01-01T00:00:00.000Z',
      });

      const response = await request(app).get('/tasks/stats');

      expect(response.body.overdue).toBe(1);
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
    test('assigns a task to a user', async () => {
      const task = taskService.create({
        title: 'Build feature',
        priority: 'high',
      });

      const response = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Sandeep' });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: task.id,
        title: 'Build feature',
        priority: 'high',
        assignee: 'Sandeep',
      });
    });

    test('trims whitespace around the assignee', async () => {
      const task = taskService.create({ title: 'Task' });

      const response = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '  Sandeep  ' });

      expect(response.status).toBe(200);
      expect(response.body.assignee).toBe('Sandeep');
    });

    test('rejects an empty assignee', async () => {
      const task = taskService.create({ title: 'Task' });

      const response = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '   ' });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/assignee/i);
    });

    test('rejects a non-string assignee', async () => {
      const task = taskService.create({ title: 'Task' });

      const response = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 123 });

      expect(response.status).toBe(400);
    });

    test('rejects a missing assignee', async () => {
      const task = taskService.create({ title: 'Task' });

      const response = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({});

      expect(response.status).toBe(400);
    });

    test('returns 404 when the task does not exist', async () => {
      const response = await request(app)
        .patch('/tasks/missing/assign')
        .send({ assignee: 'Sandeep' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Task not found');
    });

    test('allows reassignment and replaces the previous assignee', async () => {
      const task = taskService.create({ title: 'Task' });

      await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'First User' });

      const response = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Second User' });

      expect(response.status).toBe(200);
      expect(response.body.assignee).toBe('Second User');
    });
  });

  describe('error handling', () => {
    test('returns 500 when a route throws an unexpected error', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      jest.spyOn(taskService, 'getAll').mockImplementationOnce(() => {
        throw new Error('unexpected failure');
      });

      const response = await request(app).get('/tasks');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Internal server error' });

      errorSpy.mockRestore();
    });
  });

  test('returns 404 for an unknown route', async () => {
    const response = await request(app).get('/does-not-exist');

    expect(response.status).toBe(404);
  });
});
