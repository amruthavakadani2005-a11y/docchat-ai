import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    // We append the database name 'docchat' to the URI if not present
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1); // Exit process with failure
  }
};
