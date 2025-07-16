const cron = require("node-cron");
const Task = require("../models/taskModel"); // note: relative path
const { sendReminderMail } = require("../utils/emailHelpers");


// Runs at 8:30 AM every day
cron.schedule("30 7 * * *", async () => {
  console.log("⏰ Running daily task reminder job at 8:30 AM...");

  try {
    const pendingTasks = await Task.find({ status: "todo" });

    if (pendingTasks.length === 0) {
      console.log("✅ No pending tasks to remind.");
      return;
    }

    for (const task of pendingTasks) {
      await sendReminderMail(task.assignee, task.taskTitle);
      console.log(`📩 Reminder sent to ${task.assignee} for task: ${task.taskTitle}`);
    }

    console.log("✅ All reminders sent successfully.");
  } catch (err) {
    console.error("❌ Error while sending task reminders:", err.message);
  }
});
