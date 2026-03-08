/**
 * Repository Tracking Service
 * 
 * Tracks repository views, manages intelligent caching based on usage patterns,
 * and provides analytics on repository popularity.
 */

import { connectDB } from "./mongodb";
import { RepositoryAnalysis } from "@/models/RepositoryAnalysis";

export interface ViewTrackingOptions {
    userId: string;
    userAgent?: string;
}

export interface CacheDecision {
    shouldCache: boolean;
    reason: string;
    priority: number;
}

export class RepoTracker {
    // Cache threshold: cache after 2 views
    private static readonly CACHE_THRESHOLD = 2;
    
    // Priority calculation weights
    private static readonly WEIGHTS = {
        viewCount: 1.0,
        uniqueUsers: 2.0,
        recency: 0.5,
    };

    /**
     * Track a repository view and update caching status
     */
    static async trackView(
        repoUrl: string,
        options: ViewTrackingOptions
    ): Promise<{ viewCount: number; isCached: boolean; cacheDecision?: CacheDecision }> {
        await connectDB();

        const { userId, userAgent } = options;
        const now = new Date();

        // Find or create repository document
        let repo = await RepositoryAnalysis.findOne({ repoUrl });

        if (!repo) {
            // Repository not analyzed yet - just track the view intent
            console.log(`[RepoTracker] Repository ${repoUrl} not analyzed yet`);
            return { viewCount: 0, isCached: false };
        }

        // Update view tracking
        const isNewUser = !repo.viewedByUsers.includes(userId);
        
        const updateData: any = {
            $inc: { viewCount: 1 },
            $set: { lastViewedAt: now },
            $push: {
                viewHistory: {
                    $each: [{ userId, viewedAt: now, userAgent }],
                    $slice: -100, // Keep only last 100 views
                },
            },
        };

        // Add user to viewedByUsers if new
        if (isNewUser) {
            updateData.$addToSet = { viewedByUsers: userId };
            updateData.$inc.uniqueViewCount = 1;
        }

        // Update the document
        repo = await RepositoryAnalysis.findOneAndUpdate(
            { repoUrl },
            updateData,
            { new: true }
        );

        if (!repo) {
            throw new Error("Failed to update repository tracking");
        }

        // Check if we should cache this repository
        const cacheDecision = this.shouldCache(repo);
        
        if (cacheDecision.shouldCache && !repo.isCached) {
            // Mark as cached
            await RepositoryAnalysis.findOneAndUpdate(
                { repoUrl },
                {
                    $set: {
                        isCached: true,
                        cacheReason: cacheDecision.reason,
                        cachePriority: cacheDecision.priority,
                    },
                }
            );

            console.log(`[RepoTracker] ✅ Cached ${repoUrl} - ${cacheDecision.reason}`);
            
            return {
                viewCount: repo.viewCount,
                isCached: true,
                cacheDecision,
            };
        }

        // Update cache priority if already cached
        if (repo.isCached) {
            await RepositoryAnalysis.findOneAndUpdate(
                { repoUrl },
                { $set: { cachePriority: cacheDecision.priority } }
            );
        }

        return {
            viewCount: repo.viewCount,
            isCached: repo.isCached,
            cacheDecision: repo.isCached ? undefined : cacheDecision,
        };
    }

    /**
     * Determine if a repository should be cached based on usage patterns
     */
    private static shouldCache(repo: any): CacheDecision {
        const viewCount = repo.viewCount || 0;
        const uniqueViewCount = repo.uniqueViewCount || 0;
        
        // Rule 1: Cache after 2 or more views
        if (viewCount >= this.CACHE_THRESHOLD) {
            const priority = this.calculatePriority(repo);
            return {
                shouldCache: true,
                reason: `Reached ${viewCount} views (threshold: ${this.CACHE_THRESHOLD})`,
                priority,
            };
        }

        // Rule 2: Cache if viewed by 2+ unique users (even if total views < 2)
        if (uniqueViewCount >= 2) {
            const priority = this.calculatePriority(repo);
            return {
                shouldCache: true,
                reason: `Viewed by ${uniqueViewCount} unique users`,
                priority,
            };
        }

        return {
            shouldCache: false,
            reason: `Only ${viewCount} views by ${uniqueViewCount} users`,
            priority: 0,
        };
    }

    /**
     * Calculate cache priority score (higher = more important to keep cached)
     */
    private static calculatePriority(repo: any): number {
        const viewCount = repo.viewCount || 0;
        const uniqueViewCount = repo.uniqueViewCount || 0;
        const lastViewedAt = repo.lastViewedAt || new Date(0);
        
        // Recency score: 1.0 if viewed today, decreases over time
        const daysSinceView = (Date.now() - new Date(lastViewedAt).getTime()) / (1000 * 60 * 60 * 24);
        const recencyScore = Math.max(0, 1 - daysSinceView / 30); // Decays over 30 days

        // Calculate weighted priority
        const priority = 
            (viewCount * this.WEIGHTS.viewCount) +
            (uniqueViewCount * this.WEIGHTS.uniqueUsers) +
            (recencyScore * this.WEIGHTS.recency);

        return Math.round(priority * 100) / 100; // Round to 2 decimals
    }

    /**
     * Get most popular repositories
     */
    static async getPopularRepos(limit: number = 10): Promise<any[]> {
        await connectDB();

        return await RepositoryAnalysis.find()
            .sort({ viewCount: -1, lastViewedAt: -1 })
            .limit(limit)
            .select("repoUrl owner repoName viewCount uniqueViewCount lastViewedAt isCached cachePriority")
            .lean();
    }

    /**
     * Get cached repositories sorted by priority
     */
    static async getCachedRepos(limit: number = 50): Promise<any[]> {
        await connectDB();

        return await RepositoryAnalysis.find({ isCached: true })
            .sort({ cachePriority: -1, lastViewedAt: -1 })
            .limit(limit)
            .select("repoUrl owner repoName viewCount uniqueViewCount cachePriority cacheReason lastViewedAt")
            .lean();
    }

    /**
     * Get user's recently viewed repositories
     */
    static async getUserRecentRepos(userId: string, limit: number = 10): Promise<any[]> {
        await connectDB();

        return await RepositoryAnalysis.find({ viewedByUsers: userId })
            .sort({ lastViewedAt: -1 })
            .limit(limit)
            .select("repoUrl owner repoName viewCount lastViewedAt isCached")
            .lean();
    }

    /**
     * Evict low-priority cached repositories to free up space
     */
    static async evictLowPriorityCache(keepCount: number = 100): Promise<number> {
        await connectDB();

        // Get all cached repos sorted by priority
        const cachedRepos = await RepositoryAnalysis.find({ isCached: true })
            .sort({ cachePriority: -1, lastViewedAt: -1 })
            .select("_id repoUrl cachePriority")
            .lean();

        if (cachedRepos.length <= keepCount) {
            console.log(`[RepoTracker] No eviction needed (${cachedRepos.length} <= ${keepCount})`);
            return 0;
        }

        // Evict repos beyond the keepCount threshold
        const toEvict = cachedRepos.slice(keepCount);
        const evictIds = toEvict.map(r => r._id);

        const result = await RepositoryAnalysis.updateMany(
            { _id: { $in: evictIds } },
            {
                $set: {
                    isCached: false,
                    cacheReason: "Evicted due to low priority",
                    cachePriority: 0,
                },
            }
        );

        console.log(`[RepoTracker] Evicted ${result.modifiedCount} low-priority cached repos`);
        return result.modifiedCount || 0;
    }

    /**
     * Get repository analytics
     */
    static async getAnalytics(): Promise<{
        totalRepos: number;
        cachedRepos: number;
        totalViews: number;
        avgViewsPerRepo: number;
        topRepos: any[];
    }> {
        await connectDB();

        const [stats, topRepos] = await Promise.all([
            RepositoryAnalysis.aggregate([
                {
                    $group: {
                        _id: null,
                        totalRepos: { $sum: 1 },
                        cachedRepos: {
                            $sum: { $cond: ["$isCached", 1, 0] },
                        },
                        totalViews: { $sum: "$viewCount" },
                    },
                },
            ]),
            this.getPopularRepos(5),
        ]);

        const { totalRepos = 0, cachedRepos = 0, totalViews = 0 } = stats[0] || {};

        return {
            totalRepos,
            cachedRepos,
            totalViews,
            avgViewsPerRepo: totalRepos > 0 ? Math.round((totalViews / totalRepos) * 100) / 100 : 0,
            topRepos,
        };
    }

    /**
     * Reset view count for a repository (admin function)
     */
    static async resetRepoTracking(repoUrl: string): Promise<boolean> {
        await connectDB();

        const result = await RepositoryAnalysis.findOneAndUpdate(
            { repoUrl },
            {
                $set: {
                    viewCount: 0,
                    uniqueViewCount: 0,
                    viewHistory: [],
                    viewedByUsers: [],
                    isCached: false,
                    cacheReason: undefined,
                    cachePriority: 0,
                },
            }
        );

        return !!result;
    }
}
