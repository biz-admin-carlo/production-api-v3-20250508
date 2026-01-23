// services/cacheService.js
const NodeCache = require('node-cache');

class CacheService {
  constructor() {
    if (CacheService.instance) {
      return CacheService.instance;
    }
    
    this.cache = new NodeCache({
      stdTTL: 300,           // 5 minutes default
      checkperiod: 60,       // Check for expired keys every 60 seconds
      useClones: false,      // Don't clone data (faster)
      deleteOnExpire: true
    });
    
    CacheService.instance = this;
  }

  // ========================================
  // BIZ LIST CACHE (for pagination)
  // ========================================

  getBizList(params = {}) {
    const key = this._generateBizListKey(params);
    const cached = this.cache.get(key);
    
    if (cached) {
      console.log('✅ Cache HIT:', key);
      return cached;
    }
    
    console.log('❌ Cache MISS:', key);
    return null;
  }

  setBizList(params = {}, data, ttl = 300) {
    const key = this._generateBizListKey(params);
    this.cache.set(key, data, ttl);
    console.log('💾 Cache SET:', key, `(TTL: ${ttl}s)`);
  }

  clearBizList() {
    const keys = this.cache.keys();
    const bizListKeys = keys.filter(key => key.startsWith('biz_list_'));
    
    if (bizListKeys.length > 0) {
      this.cache.del(bizListKeys);
      console.log('🗑️ Cleared', bizListKeys.length, 'business list cache(s)');
    }
  }

  // ========================================
  // BIZ STATS CACHE
  // ========================================

  getBizStats() {
    return this.cache.get('biz_stats');
  }

  setBizStats(stats, ttl = 300) {
    this.cache.set('biz_stats', stats, ttl);
    console.log('💾 Cached biz stats');
  }

  clearBizStats() {
    this.cache.del('biz_stats');
    console.log('🗑️ Cleared biz stats cache');
  }

  // ========================================
  // FIRST 40 BIZ CACHE (for quick page loads)
  // ========================================

  getFirst40Biz() {
    return this.cache.get('first_40_biz');
  }

  setFirst40Biz(businesses, ttl = 300) {
    this.cache.set('first_40_biz', businesses, ttl);
    console.log('💾 Cached first 40 businesses');
  }

  clearFirst40Biz() {
    this.cache.del('first_40_biz');
    console.log('🗑️ Cleared first 40 biz cache');
  }

  // ========================================
  // FEATURED BIZ CACHE
  // ========================================

  getFeaturedBiz() {
    return this.cache.get('featured_biz');
  }

  setFeaturedBiz(businesses, ttl = 300) {
    this.cache.set('featured_biz', businesses, ttl);
    console.log('💾 Cached featured businesses');
  }

  clearFeaturedBiz() {
    this.cache.del('featured_biz');
    console.log('🗑️ Cleared featured biz cache');
  }

  // ========================================
  // CLEAR ALL BIZ-RELATED CACHE
  // ========================================

  clearAllBizCache() {
    this.clearBizList();
    this.clearBizStats();
    this.clearFirst40Biz();
    this.clearFeaturedBiz();
    console.log('🗑️ Cleared ALL biz-related caches');
  }

  // ========================================
  // GENERIC METHODS
  // ========================================

  get(key) {
    return this.cache.get(key);
  }

  set(key, value, ttl) {
    this.cache.set(key, value, ttl);
  }

  del(keys) {
    this.cache.del(keys);
  }

  flushAll() {
    this.cache.flushAll();
    console.log('🗑️ Cache FLUSHED - all data cleared');
  }

  getStats() {
    return this.cache.getStats();
  }

  getKeys() {
    return this.cache.keys();
  }

  // ========================================
  // PRIVATE HELPERS
  // ========================================

  _generateBizListKey(params) {
    const { 
      page = 1, 
      limit = 20, 
      search = '', 
      status = '', 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = params;
    
    return `biz_list_p${page}_l${limit}_s${search}_st${status}_sb${sortBy}_so${sortOrder}`;
  }
}

// Export singleton instance
const cacheService = new CacheService();
module.exports = cacheService;