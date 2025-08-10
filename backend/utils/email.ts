// utils/email.ts
import nodemailer from "nodemailer";
import config from "../config/config";

let transporter: nodemailer.Transporter | null = null;

if (config.EMAIL.SMTP_HOST) {
    const secure = Number(config.EMAIL.SMTP_PORT) === 465; // TLS for 465
    transporter = nodemailer.createTransport({
        host: config.EMAIL.SMTP_HOST,
        port: config.EMAIL.SMTP_PORT,
        secure,
        auth: config.EMAIL.SMTP_USER
            ? { user: config.EMAIL.SMTP_USER, pass: config.EMAIL.SMTP_PASS }
            : undefined,
    });
}

export async function sendEmail(to: string, subject: string, html: string) {
    if (!transporter) {
        console.log("[DEV email]", { to, subject, html }); // fallback
        return;
    }
    await transporter.sendMail({ from: config.EMAIL.FROM, to, subject, html });
}
