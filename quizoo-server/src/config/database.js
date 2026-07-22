import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    const conn = await mongoose.connect(mongoURI);

    console.log(`✅ Quizoo MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Quizoo Database: ${conn.connection.name}`);
  } catch (error) {
    console.error('❌ Quizoo MongoDB Connection Error:', error);
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  console.log('⚠️  Quizoo MongoDB disconnected');
});

mongoose.connection.on('error', (error) => {
  console.error('❌ Quizoo MongoDB error:', error);
});
