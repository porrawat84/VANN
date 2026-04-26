const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

//test
transporter.verify((error, success) => {
  if (error) {
    console.error("SMTP verify error:", error);
  } else {
    console.log("SMTP server is ready");
  }
});

async function sendPasswordResetEmail(email, otp, name = "") {
  console.log("SMTP_USER =", process.env.SMTP_USER);//test
  console.log("SMTP_FROM =", process.env.SMTP_FROM);//test
  console.log("Sending reset email to =", email);//test

  const mailOptions = {
    from: process.env.SMTP_FROM,
    to: email,
    subject: "VANN Password Reset OTP",
    text: `
Hello ${name || ""}

Your OTP for password reset is: ${otp}

This OTP will expire in 10 minutes.

If you did not request this, please ignore this email.
    `,
  };

  const info = await transporter.sendMail(mailOptions);//test
  console.log("sendMail info =", info);//test

  return info;
}

module.exports = { sendPasswordResetEmail };