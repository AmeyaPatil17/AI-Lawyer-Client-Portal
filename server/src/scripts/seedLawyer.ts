import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../models/User';

dotenv.config({ path: '../.env' });

const seedLawyer = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/willguide');
        console.log('Connected to MongoDB');

        const email = 'lawyer@example.com';
        const password = 'lawyerpassword123';

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log('Lawyer user already exists');
            return;
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const newLawyer = new User({
            email,
            passwordHash,
            role: 'lawyer',
        });

        await newLawyer.save();
        console.log('Lawyer user created successfully: lawyer@example.com / lawyerpassword123');
    } catch (error) {
        console.error('Error seeding lawyer:', error);
    } finally {
        mongoose.connection.close();
    }
};

seedLawyer();
