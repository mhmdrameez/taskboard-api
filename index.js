const express = require('express');
const crypto = require('crypto');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

const swaggerDocument = YAML.load('./swagger.yaml');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// In-memory data store
let tasks = [];

// GET /tasks: Return all tasks (paginated by status)
app.get('/tasks', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    // Sort tasks from newest to oldest based on updatedAt (fallback to createdAt)
    const sortedTasks = [...tasks].sort((a, b) => {
        const dateA = a.updatedAt || a.createdAt;
        const dateB = b.updatedAt || b.createdAt;
        return new Date(dateB) - new Date(dateA);
    });

    // Group tasks by status
    const todos = sortedTasks.filter(task => task.status === 'todo');
    const inProgress = sortedTasks.filter(task => task.status === 'in-progress');
    const done = sortedTasks.filter(task => task.status === 'done');

    res.json({
        todo: {
            data: todos.slice(startIndex, endIndex),
            totalTasks: todos.length,
            totalPages: Math.ceil(todos.length / limit)
        },
        inProgress: {
            data: inProgress.slice(startIndex, endIndex),
            totalTasks: inProgress.length,
            totalPages: Math.ceil(inProgress.length / limit)
        },
        done: {
            data: done.slice(startIndex, endIndex),
            totalTasks: done.length,
            totalPages: Math.ceil(done.length / limit)
        },
        page,
        limit
    });
});



// POST /tasks: Create a new task
app.post('/tasks/', (req, res) => {
    const { title, userid } = req.body;

    if (!title) {
        return res.status(400).json({ error: 'Title is required' });
    }

    const newTask = {
        id: crypto.randomUUID(),
        title,
        status: 'todo', // Default status
        createdAt: new Date(),
        updatedAt: new Date(),
        userid
    };

    tasks.push(newTask);
    res.status(201).json(newTask);
});

// PATCH /tasks/:id: Update the status of a task
app.patch('/tasks/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    // Validate the status
    const validStatuses = ['todo', 'in-progress', 'done'];
    if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
            error: 'Valid status is required ("todo", "in-progress", "done")'
        });
    }

    const taskIndex = tasks.findIndex(task => task.id === id);
    if (taskIndex === -1) {
        return res.status(404).json({ error: 'Task not found' });
    }

    // Update status and timestamp
    tasks[taskIndex].status = status;
    tasks[taskIndex].updatedAt = new Date();
    res.json(tasks[taskIndex]);
});

// DELETE /tasks/:id: Delete a task
app.delete('/tasks/:id', (req, res) => {
    const { id } = req.params;

    const taskIndex = tasks.findIndex(task => task.id === id);
    if (taskIndex === -1) {
        return res.status(404).json({ error: 'Task not found' });
    }

    // Remove task from array
    tasks.splice(taskIndex, 1);

    // 204 No Content
    res.status(204).send();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
