const nodemailer = require("nodemailer");


const transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    auth: {
        user: process.env.SEND_EMAIL_GMAIL_ACCOUNT,
        pass: process.env.SEND_EMAIL_GMAIL_ACCOUNT_PASSWORD,
    }
    ,
});

const sendEmail = async (from, to, subject, html) => {
    try {

        const info = await transporter.sendMail({
            from: 'Task Management Tool<guthayash@gmail.com>',
            to,
            subject,
            html,
        })
        //   console.log(info.messageId)
        return true;
    } catch (err) {
        console.log("Error occured in sendEmail");
        console.log(err.message);
        return false;
    }
};

const sendOtpEmail = async (email, otp) => {
    const isEmailSent = await sendEmail(
        'Task Management Tool <guthayash@gmail.com>',  // from
        email,                                         // to
        "OTP verification From Task Management Tool",  // subject
        `<p>Your OTP is <span style="color:brown">${otp}</span></p>` // html
    );
    return isEmailSent;
};

const sendReminderMail = async (email, task) => {
    const isEmailSent = await sendEmail(
        'Task Management Tool <guthayash@gmail.com>',  // from
        email,                                         // to
        "Task Reminder",  // subject
        `<p>Your task is pending${task} </p>` // html
    );
    return isEmailSent;
};

module.exports = {
    sendOtpEmail,
    sendReminderMail
}