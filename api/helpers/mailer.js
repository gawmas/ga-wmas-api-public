import nodeMailer from 'nodemailer';
//2X3rLbbfCcunzz@
const transporter = nodeMailer.createTransport({
  port: process.env.MAIL_PORT, 
  host: process.env.MAIL_HOST,
  secure: false,
  tls: {
    rejectUnauthorized: false
  },
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
  },
});

const emailTemplate = (user, link) => {
  return `
    <h2>Hi ${user},</h2>
    <p>Click on the link below to verify your email address.</p>
    <a href="${link}">Verify your email address</a>
  `
};

export { transporter, emailTemplate };