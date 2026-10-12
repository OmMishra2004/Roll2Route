require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');

// Define the schema to match your JSON data
const seatingSchema = new mongoose.Schema({
    rollNo: { type: String, required: true, index: true }, // Indexed for fast bot queries
    subject: String,
    room: String,
    date: String,
    timing: String
});

const Seating = mongoose.model('Seating', seatingSchema);

async function seedDatabase() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected!');

        console.log('Clearing old data...');
        await Seating.deleteMany({}); 

        console.log('Reading seating_plan.json...');
        const rawData = fs.readFileSync('seating_plan.json', 'utf-8');
        const seatingData = JSON.parse(rawData);

        console.log(`Inserting ${seatingData.length} student records...`);
        await Seating.insertMany(seatingData);
        
        console.log('🎉 Success! Database seeded completely.');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error during database seeding:', error);
        process.exit(1);
    }
}

seedDatabase();