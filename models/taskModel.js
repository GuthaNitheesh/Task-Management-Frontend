const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    workTitle: { type: String },
    taskTitle: { type: String, required: true, trim: true },
    assignee: { type: String, required: true, trim: true },
    deadline: { type: Date },
    assignor: { type: String },
    priority: {
        type: String,
        default: 'Normal',
        enum: ["Normal", "Low", "High", "Urgent"]
    },
    status: {
        type: String,
        default: "todo",
        enum: ["todo", "progress", "done"]
    }
}, { timestamps: true });

const Task = mongoose.model("Backend", taskSchema, "Backend");

module.exports = Task;
