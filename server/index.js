const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const mongoose = require('mongoose');
const cron = require('node-cron');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// --- 1. MONGODB CONNECTION ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.log('❌ MongoDB Error:', err));

// --- 2. SCHEMA ---
// We now store sender credentials in the job so the Cron Job can use them later
const emailSchema = new mongoose.Schema({
    senderEmail: String,    // <--- NEW
    senderPass: String,     // <--- NEW
    email: String,
    name: String,
    subject: String,
    content: String,
    scheduledTime: Date,
    status: { type: String, default: 'pending' }
});

const EmailJob = mongoose.model('EmailJob', emailSchema);

// --- 3. API ROUTE ---
app.post('/send-email', async (req, res) => {
    // We now expect senderEmail and appPassword from the frontend
    const { senderEmail, appPassword, emails, names, subject, content, scheduledTime } = req.body;

    if (!senderEmail || !appPassword) {
        return res.status(400).json({ message: "Error: Missing Sender Email or App Password." });
    }
    if (!emails || !names || emails.length !== names.length) {
        return res.status(400).json({ message: "Error: Email count mismatch." });
    }

    const jobs = emails.map((email, i) => ({
        senderEmail,        // Store who is sending it
        senderPass: appPassword, // Store the key
        email,
        name: names[i],
        subject,
        content,
        scheduledTime: scheduledTime ? new Date(scheduledTime) : new Date(),
        status: 'pending'
    }));

    try {
        await EmailJob.insertMany(jobs);
        res.status(200).json({ message: "Emails queued successfully!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Database Error" });
    }
});

// --- 4. SCHEDULER (Dynamic Sender) ---
cron.schedule('* * * * *', async () => {
    console.log('⏰ Checking for due emails...');

    try {
        const dueEmails = await EmailJob.find({
            status: 'pending',
            scheduledTime: { $lte: new Date() }
        });

        if (dueEmails.length === 0) return;

        console.log(`🚀 Sending ${dueEmails.length} emails...`);

        for (const job of dueEmails) {
            
            // --- DYNAMIC TRANSPORTER ---
            // Create a transporter specifically for THIS job using the stored credentials
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: job.senderEmail,
                    pass: job.senderPass,
                },
            });

            const personalizedHtml = job.content.replace(/{name}/g, job.name);

            const mailOptions = {
                from: `"My Bulk Mailer" <${job.senderEmail}>`,
                to: job.email,
                subject: job.subject,
                html: personalizedHtml,
            };

            // Send
            transporter.sendMail(mailOptions, async (err) => {
                if (err) {
                    console.error(`❌ Failed: ${job.email} (Auth Error?)`);
                    // Optional: You could log the specific error to DB
                    await EmailJob.findByIdAndUpdate(job._id, { status: 'failed' });
                } else {
                    console.log(`✅ Sent: ${job.email}`);
                    await EmailJob.findByIdAndUpdate(job._id, { status: 'sent' });
                }
            });
        }
    } catch (error) {
        console.error("Cron Error:", error);
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));