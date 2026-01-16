import mongoose from 'mongoose'

const connectDB = async () => {
  try {
    const conn = await mongoose.connect("mongodb://mongoadmin:mongopasswd@localhost:27017/?authSource=admin");
    // CONFIGURAR DOTENV NAO ESQUECER !!!
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

export default connectDB;