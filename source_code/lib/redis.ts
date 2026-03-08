import Redis from "ioredis"

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379"

let redis: Redis | null = null

export function getRedisClient(): Redis {
  if (!redis) {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000)
        return delay
      },
    })

    redis.on("error", (err) => {
      console.error("Redis Client Error:", err)
    })

    redis.on("connect", () => {
      console.log("Redis Client Connected")
    })
  }

  return redis
}

// Cache TTL constants
export const CACHE_TTL = {
  USER_BASIC: 60 * 60, // 1 hour
  REPO_LIST: 60 * 30, // 30 minutes
  REPO_DETAIL: 60 * 60 * 24, // 24 hours
}

// Helper functions for caching
export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const client = getRedisClient()
    const data = await client.get(key)
    return data ? JSON.parse(data) : null
  } catch (error) {
    console.error("Redis GET error:", error)
    return null
  }
}

export async function setCached(
  key: string,
  value: any,
  ttl: number
): Promise<void> {
  try {
    const client = getRedisClient()
    await client.setex(key, ttl, JSON.stringify(value))
  } catch (error) {
    console.error("Redis SET error:", error)
  }
}

export async function deleteCached(key: string): Promise<void> {
  try {
    const client = getRedisClient()
    await client.del(key)
  } catch (error) {
    console.error("Redis DEL error:", error)
  }
}

export async function deletePattern(pattern: string): Promise<void> {
  try {
    const client = getRedisClient()
    const keys = await client.keys(pattern)
    if (keys.length > 0) {
      await client.del(...keys)
    }
  } catch (error) {
    console.error("Redis DELETE PATTERN error:", error)
  }
}
