/**
 * Request Deduplicator - Prevents duplicate concurrent requests
 * 
 * When multiple users or tabs request the same analysis simultaneously,
 * only one actual API call is made and all requesters get the same result.
 */

interface PendingRequest<T> {
  promise: Promise<T>
  timestamp: number
}

class RequestDeduplicator {
  private pending: Map<string, PendingRequest<any>> = new Map()
  private readonly TIMEOUT = 300000 // 5 minutes

  /**
   * Deduplicate requests by key. If a request with the same key is already
   * in progress, return the existing promise instead of making a new request.
   */
  async deduplicate<T>(
    key: string,
    fn: () => Promise<T>
  ): Promise<T> {
    // Check if there's already a pending request
    const existing = this.pending.get(key)
    
    if (existing) {
      // Check if it's not too old (timeout protection)
      if (Date.now() - existing.timestamp < this.TIMEOUT) {
        console.log(`[Deduplicator] Reusing existing request for: ${key}`)
        return existing.promise
      } else {
        // Request timed out, remove it
        this.pending.delete(key)
      }
    }

    // Create new request
    console.log(`[Deduplicator] Creating new request for: ${key}`)
    const promise = fn()
      .finally(() => {
        // Clean up after completion
        this.pending.delete(key)
      })

    this.pending.set(key, {
      promise,
      timestamp: Date.now(),
    })

    return promise
  }

  /**
   * Clear all pending requests (useful for testing or cleanup)
   */
  clear() {
    this.pending.clear()
  }

  /**
   * Get number of pending requests
   */
  getPendingCount(): number {
    return this.pending.size
  }
}

// Singleton instance
export const requestDeduplicator = new RequestDeduplicator()
