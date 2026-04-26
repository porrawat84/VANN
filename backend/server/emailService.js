const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  family: 4,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

async function sendPasswordResetEmail(email, otp, name = "") {
  const mailOptions = {
    from: process.env.SMTP_USER,
    to: email,
    subject: "VANN Password Reset OTP",
    text: `
Hello ${name || ""}

Your OTP for password reset is: ${otp}

This OTP will expire in 10 minutes.

If you did not request this, please ignore this email.
    `,
  };

  return transporter.sendMail(mailOptions);
}

module.exports = { sendPasswordResetEmail };