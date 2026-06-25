import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const getTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    service: process.env.SMTP_SERVICE,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

export const sendEmail = async ({
  to,
  subject,
  html,
  text,
}: SendEmailOptions) => {
  try {
    await getTransporter().sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
      text,
    });

    return true;
  } catch (error) {
    console.error("Error sending email", error);
    return false;
  }
};
