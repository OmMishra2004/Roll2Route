require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { Telegraf } = require('telegraf');

const app = express();
const PORT = process.env.PORT || 3000;

// Define the MongoDB Schema
const seatingSchema = new mongoose.Schema({
    rollNo: String,
    subject: String,
    room: String,
    date: String,
    timing: String
});
const Seating = mongoose.model('Seating', seatingSchema);

// Connect to Database
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB Atlas'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// Initialize Telegraf Bot
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

bot.start((ctx) => {
    ctx.reply("Welcome to *Roll2Route*! 🎓\n\nSend me your 13-digit AKTU Roll Number and I will find your exam seating details.", { parse_mode: 'Markdown' });
});

bot.on('text', async (ctx) => {
    const text = ctx.message.text.trim();
    console.log(`📩 Received message from phone: ${text}`);

    // Ignore the /start command if it accidentally gets caught here
    if (text === '/start') return;

    if (/^\d{13}$/.test(text)) {
        try {
            const studentData = await Seating.findOne({ rollNo: text });

            if (studentData) {
                const reply = `✅ *Seating Found!*\n\n` +
                              `*Roll No:* ${studentData.rollNo}\n` +
                              `*Subject:* ${studentData.subject || 'N/A'}\n` +
                              `*Room:* ${studentData.room || 'N/A'}\n\n` +
                              `Best of luck for your exam!`;
                ctx.replyWithMarkdown(reply);
            } else {
                ctx.reply("❌ Roll Number not found in the current seating plan.");
            }
        } catch (error) {
            console.error(error);
            ctx.reply("⚠️ Server error while fetching your details.");
        }
    } else {
        ctx.reply("⚠️ Please enter a valid 13-digit AKTU Roll Number.");
    }
});

// Start the bot
bot.launch(() => console.log('🤖 Roll2Route Bot is online and listening via Telegraf!'));

// Start the Express server
app.listen(PORT, () => {
    console.log(`🚀 Web server running on port ${PORT}`);
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));