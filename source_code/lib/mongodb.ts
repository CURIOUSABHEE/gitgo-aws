import mongoose from "mongoose"

const MONGODB_URI = process.env.MONGODB_URI!

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable")
}

interface MongooseCache {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

declare global {
  var mongoose: MongooseCache | undefined
}

let cached: MongooseCache = global.mongoose || { conn: null, promise: null }

if (!global.mongoose) {
  global.mongoose = cached
}

export async function connectDB() {
  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000, // 10 second timeout
      socketTimeoutMS: 45000, // 45 second socket timeout
      maxPoolSize: 10,
      minPoolSize: 2,
    }

    cached.promise = mongoose.connect(MONGODB_URI, opts)
  }

  try {
    cached.conn = await cached.promise
    console.log("[MongoDB] Connected successfully")
  } catch (e: any) {
    cached.promise = null
    console.error("[MongoDB] Connection failed:", e.message)
    
    // Provide helpful error messages
    if (e.message?.includes("ECONNREFUSED") || e.message?.includes("connection") || e.message?.includes("closed")) {
      console.error("[MongoDB] Possible causes:")
      console.error("  1. MongoDB Atlas IP whitelist - Add your IP at https://cloud.mongodb.com")
      console.error("  2. Network/firewall blocking connection")
      console.error("  3. MongoDB cluster is paused or unavailable")
      console.error("  4. Invalid connection string")
    }
    
    throw e
  }

  return cached.conn
}
