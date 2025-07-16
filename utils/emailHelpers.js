const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    auth: {
        user: process.env.SEND_EMAIL_GMAIL_ACCOUNT,
        pass: process.env.SEND_EMAIL_GMAIL_ACCOUNT_PASSWORD,
    },
});

const sendEmail = async (from, to, subject, html) => {
    try {
        const info = await transporter.sendMail({ from, to, subject, html });
        return true;
    } catch (err) {
        console.log("Error occurred in sendEmail", err.message);
        return false;
    }
};

const sendOtpEmail = async (email, otp) => {
    return sendEmail('Task Management Tool <guthayash@gmail.com>', email, "OTP verification From Task Management Tool", `<p>Your OTP is <span style="color:brown">${otp}</span></p>`);
};

const sendReminderMail = async (email, task) => {
    return sendEmail('Task Management Tool <guthayash@gmail.com>', email, "Task Reminder", `<p>Your task is pending: ${task}</p>`);
};

module.exports = { sendOtpEmail, sendReminderMail };
