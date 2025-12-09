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
    .then(() => console.log('✅ MongoDB Connected Successfully'))
    .catch(err => console.log('❌ MongoDB Connection Error:', err));

// --- 2. DATABASE SCHEMA ---
const emailSchema = new mongoose.Schema({
    senderName: String,     // <--- ADDED: Stores "Goverdhan Gupta"
    senderEmail: String,    // Stores "you@gmail.com"
    senderPass: String,     // Stores "abcdefghijklmnop"
    email: String,          // Receiver Email
    name: String,           // Receiver Name
    subject: String,
    content: String,
    scheduledTime: Date,
    status: { type: String, default: 'pending' }, // pending, sent, failed
    createdAt: { type: Date, default: Date.now }
});

const EmailJob = mongoose.model('EmailJob', emailSchema);

// --- 3. API ROUTE (Receives Data from Frontend) ---
app.post('/send-email', async (req, res) => {
    // Destructure all inputs, including the new senderName
    const { senderName, senderEmail, appPassword, emails, names, subject, content, scheduledTime } = req.body;

    // Basic Validation
    if (!senderEmail || !appPassword) {
        return res.status(400).json({ message: "Error: Missing Sender Email or App Password." });
    }
    if (!emails || !names || emails.length !== names.length) {
        return res.status(400).json({ message: "Error: Email count does not match Name count." });
    }

    // Create a job for each recipient
    const jobs = emails.map((email, i) => ({
        senderName: senderName || "Bulk Mailer", // Fallback if name is empty
        senderEmail,
        senderPass: appPassword,
        email,
        name: names[i],
        subject,
        content,
        // If scheduledTime exists, use it. Otherwise, use NOW (new Date())
        scheduledTime: scheduledTime ? new Date(scheduledTime) : new Date(),
        status: 'pending'
    }));

    try {
        await EmailJob.insertMany(jobs);
        console.log(`📥 Received & Queued ${jobs.length} emails.`);
        res.status(200).json({ message: "Emails queued successfully!" });
    } catch (error) {
        console.error("Database Insert Error:", error);
        res.status(500).json({ message: "Database Error" });
    }
});

// --- 4. CRON SCHEDULER (Runs Every Minute) ---
cron.schedule('* * * * *', async () => {
    const now = new Date();
    // Debug Log: Helps you see if Server Time matches your expectations
    console.log(`⏰ Cron Tick: Checking for emails due before ${now.toISOString()}...`);

    try {
        // Find emails that are PENDING and their time is NOW or in the PAST
        const dueEmails = await EmailJob.find({
            status: 'pending',
            scheduledTime: { $lte: now }
        });

        if (dueEmails.length === 0) {
            // console.log("   -> No due emails."); // Optional: verify it's running
            return;
        }

        console.log(`🚀 Found ${dueEmails.length} emails ready to send!`);

        for (const job of dueEmails) {
            
            // Validate Credentials before trying
            if (!job.senderEmail || !job.senderPass) {
                console.error(`❌ Missing credentials for ${job.email}`);
                await EmailJob.findByIdAndUpdate(job._id, { status: 'failed_missing_creds' });
                continue;
            }

            // --- DYNAMIC TRANSPORTER ---
            // Create a transporter using THIS job's credentials
            const transporter = nodemailer.createTransport({
                host:'smtp.gmail.com',
                port:465,
                secure:true,
                auth: {
                    user: job.senderEmail,
                    pass: job.senderPass,
                },
                family:4,
                connectionTimeout: 30000, 
                greetingTimeout: 30000,    
            });

            // Personalize the HTML content
            const personalizedHtml = job.content.replace(/{name}/g, job.name);

            const mailOptions = {
                // Shows: "Goverdhan Gupta <goverdhan@gmail.com>"
                from: `"${job.senderName}" <${job.senderEmail}>`, 
                to: job.email,
                subject: job.subject,
                html: personalizedHtml,
            };

            // Send the Email
            transporter.sendMail(mailOptions, async (err, info) => {
                if (err) {
                    console.error(`❌ Failed: ${job.email} - Error: ${err.message}`);
                    // Mark as failed so we don't retry forever
                    await EmailJob.findByIdAndUpdate(job._id, { status: 'failed' });
                } else {
                    console.log(`✅ Sent: ${job.email}`);
                    // Mark as sent
                    await EmailJob.findByIdAndUpdate(job._id, { status: 'sent' });
                }
            });
        }
    } catch (error) {
        console.error("Cron Job Critical Error:", error);
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));