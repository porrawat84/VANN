const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.resend.com",
  port: 465,
  secure: true,
  auth: {
    user: "resend",
    pass: process.env.RESEND_API_KEY,
  },
});

async function sendPasswordResetEmail(email, otp, name = "") {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
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