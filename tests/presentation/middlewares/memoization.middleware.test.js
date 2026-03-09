import request from 'supertest';
import express from 'express';
import memoizationMiddleware from '../../../src/presentation/middlewares/memoization.middleware.js';

describe('Memoization Middleware', () => {
  let app;
  let middleware;
  let requestCount;

  beforeEach(() => {
    app = express();
    requestCount = 0;

    // Criar middleware com configuração de teste
    middleware = memoizationMiddleware({
      max: 3,
      maxAge: 1000,
      methods: ['GET'],
      excludePaths: ['/api/no-cache'],
      enabled: true,
    });

    app.use(middleware);
  });

  afterEach(() => {
    if (middleware && middleware.destroy) {
      middleware.destroy();
    }
  });

  describe('Cache HIT and MISS', () => {
    beforeEach(() => {
      app.get('/api/test', (req, res) => {
        requestCount++;
        res.json({ message: 'Success', count: requestCount });
      });
    });

    it('should return MISS on first request', async () => {
      const response = await request(app).get('/api/test');

      expect(response.status).toBe(200);
      expect(response.headers['x-cache']).toBe('MISS');
      expect(response.body.count).toBe(1);
    });

    it('should return HIT on subsequent request', async () => {
      // Primeira requisição
      const firstResponse = await request(app).get('/api/test');
      expect(firstResponse.headers['x-cache']).toBe('MISS');
      expect(firstResponse.body.count).toBe(1);

      // Segunda requisição (deve vir do cache)
      const secondResponse = await request(app).get('/api/test');
      expect(secondResponse.headers['x-cache']).toBe('HIT');
      expect(secondResponse.body.count).toBe(1); // Mesmo valor do cache
      expect(requestCount).toBe(1); // Handler chamado apenas uma vez
    });

    it('should cache multiple different endpoints', async () => {
      app.get('/api/users', (req, res) => {
        res.json({ users: [] });
      });

      app.get('/api/posts', (req, res) => {
        res.json({ posts: [] });
      });

      // Primeira requisição para cada endpoint
      const users1 = await request(app).get('/api/users');
      const posts1 = await request(app).get('/api/posts');

      expect(users1.headers['x-cache']).toBe('MISS');
      expect(posts1.headers['x-cache']).toBe('MISS');

      // Segunda requisição para cada endpoint
      const users2 = await request(app).get('/api/users');
      const posts2 = await request(app).get('/api/posts');

      expect(users2.headers['x-cache']).toBe('HIT');
      expect(posts2.headers['x-cache']).toBe('HIT');
    });

    it('should include cache key in response headers', async () => {
      const response = await request(app).get('/api/test');

      expect(response.headers['x-cache-key']).toBeDefined();
      expect(response.headers['x-cache-key']).toContain('GET:/api/test');
    });
  });

  describe('Query Parameters', () => {
    beforeEach(() => {
      app.get('/api/search', (req, res) => {
        requestCount++;
        res.json({ query: req.query, count: requestCount });
      });
    });

    it('should create different cache keys for different query params', async () => {
      const response1 = await request(app).get('/api/search?q=test');
      const response2 = await request(app).get('/api/search?q=other');

      expect(response1.headers['x-cache']).toBe('MISS');
      expect(response2.headers['x-cache']).toBe('MISS');
      expect(response1.body.count).toBe(1);
      expect(response2.body.count).toBe(2);
      expect(requestCount).toBe(2);
    });

    it('should hit cache for same query params', async () => {
      await request(app).get('/api/search?q=test&page=1');
      const response = await request(app).get('/api/search?q=test&page=1');

      expect(response.headers['x-cache']).toBe('HIT');
      expect(requestCount).toBe(1);
    });

    it('should normalize query params order', async () => {
      await request(app).get('/api/search?page=1&q=test');
      const response = await request(app).get('/api/search?q=test&page=1');

      expect(response.headers['x-cache']).toBe('HIT');
      expect(requestCount).toBe(1);
    });
  });

  describe('HTTP Methods', () => {
    beforeEach(() => {
      app.get('/api/data', (req, res) => {
        requestCount++;
        res.json({ method: 'GET', count: requestCount });
      });

      app.post('/api/data', (req, res) => {
        requestCount++;
        res.json({ method: 'POST', count: requestCount });
      });
    });

    it('should cache GET requests by default', async () => {
      await request(app).get('/api/data');
      const response = await request(app).get('/api/data');

      expect(response.headers['x-cache']).toBe('HIT');
      expect(requestCount).toBe(1);
    });

    it('should not cache POST requests by default', async () => {
      await request(app).post('/api/data');
      const response = await request(app).post('/api/data');

      expect(response.headers['x-cache']).toBeUndefined();
      expect(requestCount).toBe(2);
    });

    it('should cache POST when configured', async () => {
      const postApp = express();
      const postMiddleware = memoizationMiddleware({
        max: 3,
        maxAge: 1000,
        methods: ['GET', 'POST'],
      });

      postApp.use(postMiddleware);
      postApp.post('/api/data', (req, res) => {
        res.json({ method: 'POST' });
      });

      await request(postApp).post('/api/data');
      const response = await request(postApp).post('/api/data');

      expect(response.headers['x-cache']).toBe('HIT');

      postMiddleware.destroy();
    });
  });

  describe('Exclude Paths', () => {
    beforeEach(() => {
      app.get('/api/no-cache', (req, res) => {
        requestCount++;
        res.json({ cached: false, count: requestCount });
      });

      app.get('/api/cached', (req, res) => {
        requestCount++;
        res.json({ cached: true, count: requestCount });
      });
    });

    it('should not cache excluded paths', async () => {
      await request(app).get('/api/no-cache');
      const response = await request(app).get('/api/no-cache');

      expect(response.headers['x-cache']).toBeUndefined();
      expect(response.body.count).toBe(2);
      expect(requestCount).toBe(2);
    });

    it('should cache non-excluded paths', async () => {
      await request(app).get('/api/cached');
      const response = await request(app).get('/api/cached');

      expect(response.headers['x-cache']).toBe('HIT');
      expect(response.body.count).toBe(1);
      expect(requestCount).toBe(1);
    });

    it('should support wildcard exclusions', async () => {
      const wildcardApp = express();
      const wildcardMiddleware = memoizationMiddleware({
        max: 3,
        maxAge: 1000,
        excludePaths: ['/api/auth/*'],
      });

      wildcardApp.use(wildcardMiddleware);
      wildcardApp.get('/api/auth/login', (req, res) => {
        res.json({ auth: true });
      });

      wildcardApp.get('/api/auth/logout', (req, res) => {
        res.json({ auth: false });
      });

      const login1 = await request(wildcardApp).get('/api/auth/login');
      const login2 = await request(wildcardApp).get('/api/auth/login');
      const logout1 = await request(wildcardApp).get('/api/auth/logout');
      const logout2 = await request(wildcardApp).get('/api/auth/logout');

      expect(login1.headers['x-cache']).toBeUndefined();
      expect(login2.headers['x-cache']).toBeUndefined();
      expect(logout1.headers['x-cache']).toBeUndefined();
      expect(logout2.headers['x-cache']).toBeUndefined();

      wildcardMiddleware.destroy();
    });
  });

  describe('LRU Policy', () => {
    beforeEach(() => {
      app.get('/api/item1', (req, res) => res.json({ id: 1 }));
      app.get('/api/item2', (req, res) => res.json({ id: 2 }));
      app.get('/api/item3', (req, res) => res.json({ id: 3 }));
      app.get('/api/item4', (req, res) => res.json({ id: 4 }));
    });

    it('should evict least recently used item when max is reached', async () => {
      // Preencher cache (max: 3)
      await request(app).get('/api/item1');
      await request(app).get('/api/item2');
      await request(app).get('/api/item3');

      expect(middleware.cache.size()).toBe(3);

      // Adicionar quarto item deve remover o primeiro
      await request(app).get('/api/item4');

      expect(middleware.cache.size()).toBe(3);

      // Item1 não deve estar mais no cache (foi removido)
      const item1Again = await request(app).get('/api/item1');
      expect(item1Again.headers['x-cache']).toBe('MISS');

      // Itens 2, 3 e 4 devem estar no cache
      // (item1 foi re-adicionado no passo anterior, removendo item2)
      const item3Again = await request(app).get('/api/item3');
      const item4Again = await request(app).get('/api/item4');

      expect(item3Again.headers['x-cache']).toBe('HIT');
      expect(item4Again.headers['x-cache']).toBe('HIT');
    });

    it('should update LRU order on access', async () => {
      // Preencher cache
      await request(app).get('/api/item1');
      await request(app).get('/api/item2');
      await request(app).get('/api/item3');

      // Acessar item1 novamente (torna-se o mais recente)
      await request(app).get('/api/item1');

      // Adicionar item4 deve remover item2 (agora é o mais antigo)
      await request(app).get('/api/item4');

      // Item2 não deve estar no cache
      const item2Again = await request(app).get('/api/item2');
      expect(item2Again.headers['x-cache']).toBe('MISS');

      // Item1 deve estar no cache
      const item1Again = await request(app).get('/api/item1');
      expect(item1Again.headers['x-cache']).toBe('HIT');
    });
  });

  describe('Expiration', () => {
    it('should expire items after maxAge', async () => {
      const shortApp = express();
      const shortMiddleware = memoizationMiddleware({
        max: 5,
        maxAge: 100, // 100ms
      });

      shortApp.use(shortMiddleware);
      shortApp.get('/api/test', (req, res) => {
        res.json({ timestamp: Date.now() });
      });

      // Primeira requisição
      const first = await request(shortApp).get('/api/test');
      expect(first.headers['x-cache']).toBe('MISS');

      // Segunda requisição imediata (deve estar em cache)
      const second = await request(shortApp).get('/api/test');
      expect(second.headers['x-cache']).toBe('HIT');

      // Aguardar expiração
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Terceira requisição (cache expirado)
      const third = await request(shortApp).get('/api/test');
      expect(third.headers['x-cache']).toBe('MISS');

      shortMiddleware.destroy();
    });

    it('should renew expiration on subsequent access', async () => {
      const renewApp = express();
      const renewMiddleware = memoizationMiddleware({
        max: 5,
        maxAge: 200,
      });

      renewApp.use(renewMiddleware);
      renewApp.get('/api/test', (req, res) => {
        res.json({ data: 'test' });
      });

      // Primeira requisição
      await request(renewApp).get('/api/test');

      // Aguardar 100ms
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Acessar novamente (renova expiração)
      const renewed = await request(renewApp).get('/api/test');
      expect(renewed.headers['x-cache']).toBe('HIT');

      // Aguardar mais 100ms (total 200ms desde criação, mas 100ms desde renovação)
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Ainda deve estar em cache
      const stillValid = await request(renewApp).get('/api/test');
      expect(stillValid.headers['x-cache']).toBe('HIT');

      renewMiddleware.destroy();
    });
  });

  describe('Status Codes', () => {
    it('should only cache successful responses (2xx)', async () => {
      app.get('/api/success', (req, res) => {
        requestCount++;
        res.status(200).json({ success: true, count: requestCount });
      });

      app.get('/api/error', (req, res) => {
        requestCount++;
        res.status(500).json({ error: true, count: requestCount });
      });

      app.get('/api/notfound', (req, res) => {
        requestCount++;
        res.status(404).json({ notfound: true, count: requestCount });
      });

      // Success deve ser cacheado
      await request(app).get('/api/success');
      const success = await request(app).get('/api/success');
      expect(success.headers['x-cache']).toBe('HIT');

      // Error não deve ser cacheado
      await request(app).get('/api/error');
      const error = await request(app).get('/api/error');
      expect(error.headers['x-cache']).toBe('MISS');

      // Not found não deve ser cacheado
      await request(app).get('/api/notfound');
      const notfound = await request(app).get('/api/notfound');
      expect(notfound.headers['x-cache']).toBe('MISS');
    });
  });

  describe('Utility Methods', () => {
    beforeEach(() => {
      app.get('/api/test', (req, res) => {
        res.json({ data: 'test' });
      });
    });

    it('should clear cache', async () => {
      await request(app).get('/api/test');

      expect(middleware.cache.size()).toBe(1);

      middleware.clear();

      expect(middleware.cache.size()).toBe(0);

      const response = await request(app).get('/api/test');
      expect(response.headers['x-cache']).toBe('MISS');
    });

    it('should get cache statistics', async () => {
      await request(app).get('/api/test');

      const stats = middleware.getStats();

      expect(stats.size).toBe(1);
      expect(stats.max).toBe(3);
      expect(stats.maxAge).toBe(1000);
      expect(stats.utilization).toBeDefined();
    });

    it('should access cache instance', () => {
      expect(middleware.cache).toBeDefined();
      expect(middleware.cache.size).toBeDefined();
      expect(middleware.cache.get).toBeDefined();
      expect(middleware.cache.set).toBeDefined();
    });
  });

  describe('Disabled Cache', () => {
    it('should not cache when disabled', async () => {
      const disabledApp = express();
      const disabledMiddleware = memoizationMiddleware({
        enabled: false,
      });

      disabledApp.use(disabledMiddleware);
      disabledApp.get('/api/test', (req, res) => {
        requestCount++;
        res.json({ count: requestCount });
      });

      const first = await request(disabledApp).get('/api/test');
      const second = await request(disabledApp).get('/api/test');

      expect(first.headers['x-cache']).toBeUndefined();
      expect(second.headers['x-cache']).toBeUndefined();
      expect(first.body.count).toBe(1);
      expect(second.body.count).toBe(2);
      expect(requestCount).toBe(2);

      disabledMiddleware.destroy();
    });
  });

  describe('User ID in Cache Key', () => {
    it('should create different cache keys for different users', async () => {
      const userApp = express();
      let userRequestCount = 0;

      // Mock user middleware BEFORE cache middleware
      userApp.use((req, res, next) => {
        req.user = { id: 'user1' };
        next();
      });

      const userMiddleware = memoizationMiddleware({
        max: 10,
        maxAge: 1000,
        methods: ['GET'],
        includeUserId: true,
        enabled: true,
      });

      userApp.use(userMiddleware);

      userApp.get('/api/profile', (req, res) => {
        userRequestCount++;
        const userId = req.user?.id || 'anonymous';
        res.json({ userId, count: userRequestCount });
      });

      const user1First = await request(userApp).get('/api/profile');
      expect(user1First.headers['x-cache']).toBe('MISS');
      expect(user1First.body.userId).toBe('user1');
      expect(user1First.body.count).toBe(1);

      // Second request from user 1 should hit cache
      const user1Second = await request(userApp).get('/api/profile');
      expect(user1Second.headers['x-cache']).toBe('HIT');
      expect(user1Second.body.userId).toBe('user1');
      expect(user1Second.body.count).toBe(1); // Same cached value

      expect(userRequestCount).toBe(1); // Handler called only once

      userMiddleware.destroy();
    });

    it('should not share cache between different users', async () => {
      const isolatedApp = express();

      // Mock user middleware that sets different users based on header
      isolatedApp.use((req, res, next) => {
        const userId = req.headers['x-user-id'] || 'anonymous';
        req.user = { id: userId };
        next();
      });

      const isolatedMiddleware = memoizationMiddleware({
        max: 10,
        maxAge: 1000,
        includeUserId: true,
        enabled: true,
      });

      isolatedApp.use(isolatedMiddleware);

      let callCount = 0;
      isolatedApp.get('/api/profile', (req, res) => {
        callCount++;
        res.json({
          userId: req.user?.id || 'anonymous',
          data: `user-${req.user?.id}-data`,
          callNumber: callCount,
        });
      });

      // User 1 first request
      const user1Req1 = await request(isolatedApp)
        .get('/api/profile')
        .set('x-user-id', 'user-123');

      expect(user1Req1.headers['x-cache']).toBe('MISS');
      expect(user1Req1.body.userId).toBe('user-123');
      expect(user1Req1.body.data).toBe('user-user-123-data');
      expect(user1Req1.body.callNumber).toBe(1);

      // User 2 first request - should NOT get user 1's cached data
      const user2Req1 = await request(isolatedApp)
        .get('/api/profile')
        .set('x-user-id', 'user-456');

      expect(user2Req1.headers['x-cache']).toBe('MISS');
      expect(user2Req1.body.userId).toBe('user-456');
      expect(user2Req1.body.data).toBe('user-user-456-data');
      expect(user2Req1.body.callNumber).toBe(2);

      // User 1 second request - should hit cache
      const user1Req2 = await request(isolatedApp)
        .get('/api/profile')
        .set('x-user-id', 'user-123');

      expect(user1Req2.headers['x-cache']).toBe('HIT');
      expect(user1Req2.body.userId).toBe('user-123');
      expect(user1Req2.body.data).toBe('user-user-123-data');
      expect(user1Req2.body.callNumber).toBe(1); // Cached value

      // User 2 second request - should hit cache
      const user2Req2 = await request(isolatedApp)
        .get('/api/profile')
        .set('x-user-id', 'user-456');

      expect(user2Req2.headers['x-cache']).toBe('HIT');
      expect(user2Req2.body.userId).toBe('user-456');
      expect(user2Req2.body.data).toBe('user-user-456-data');
      expect(user2Req2.body.callNumber).toBe(2); // Cached value

      // Total calls should be 2 (one for each user)
      expect(callCount).toBe(2);

      isolatedMiddleware.destroy();
    });

    it('should include user ID in cache key header', async () => {
      const keyApp = express();

      keyApp.use((req, res, next) => {
        req.user = { id: 'test-user-789' };
        next();
      });

      const keyMiddleware = memoizationMiddleware({
        max: 10,
        maxAge: 1000,
        includeUserId: true,
      });

      keyApp.use(keyMiddleware);

      keyApp.get('/api/data', (req, res) => {
        res.json({ data: 'test' });
      });

      const response = await request(keyApp).get('/api/data');

      expect(response.headers['x-cache-key']).toContain('@test-user-789');

      keyMiddleware.destroy();
    });

    it('should work when user is not authenticated', async () => {
      const noAuthApp = express();
      const noAuthMiddleware = memoizationMiddleware({
        max: 10,
        maxAge: 1000,
        includeUserId: true,
      });

      noAuthApp.use(noAuthMiddleware);

      let noAuthCount = 0;
      noAuthApp.get('/api/public', (req, res) => {
        noAuthCount++;
        res.json({ public: true, count: noAuthCount });
      });

      // First request without user
      const first = await request(noAuthApp).get('/api/public');
      expect(first.headers['x-cache']).toBe('MISS');
      expect(first.body.count).toBe(1);

      // Second request without user - should hit cache
      const second = await request(noAuthApp).get('/api/public');
      expect(second.headers['x-cache']).toBe('HIT');
      expect(second.body.count).toBe(1);

      expect(noAuthCount).toBe(1);

      noAuthMiddleware.destroy();
    });

    it('should not include user ID when includeUserId is false', async () => {
      const noUserIdApp = express();

      noUserIdApp.use((req, res, next) => {
        const userId = req.headers['x-user-id'] || 'anonymous';
        req.user = { id: userId };
        next();
      });

      const noUserIdMiddleware = memoizationMiddleware({
        max: 10,
        maxAge: 1000,
        includeUserId: false,
      });

      noUserIdApp.use(noUserIdMiddleware);

      let sharedCount = 0;
      noUserIdApp.get('/api/shared', (req, res) => {
        sharedCount++;
        res.json({ userId: req.user.id, count: sharedCount });
      });

      // User 1 request
      const user1 = await request(noUserIdApp)
        .get('/api/shared')
        .set('x-user-id', 'user-aaa');
      expect(user1.headers['x-cache']).toBe('MISS');
      expect(user1.body.count).toBe(1);

      // User 2 request - should hit cache (sharing across users - BUG when includeUserId is false)
      const user2 = await request(noUserIdApp)
        .get('/api/shared')
        .set('x-user-id', 'user-bbb');
      expect(user2.headers['x-cache']).toBe('HIT');
      expect(user2.body.count).toBe(1); // Gets user1's cached data
      expect(user2.body.userId).toBe('user-aaa'); // Gets wrong user's data

      expect(sharedCount).toBe(1);

      noUserIdMiddleware.destroy();
    });

    it('should handle cache key generation with userId correctly', async () => {
      const cacheKeyApp = express();

      cacheKeyApp.use((req, res, next) => {
        req.user = { id: 'user-xyz' };
        next();
      });

      const cacheKeyMiddleware = memoizationMiddleware({
        max: 10,
        maxAge: 1000,
        includeUserId: true,
      });

      cacheKeyApp.use(cacheKeyMiddleware);

      cacheKeyApp.get('/api/test', (req, res) => {
        res.json({ message: 'test' });
      });

      const response = await request(cacheKeyApp).get('/api/test?param=value');

      // Verify cache key includes method, path, query, and userId
      const cacheKey = response.headers['x-cache-key'];
      expect(cacheKey).toContain('GET');
      expect(cacheKey).toContain('/api/test');
      expect(cacheKey).toContain('param=value');
      expect(cacheKey).toContain('@user-xyz');

      cacheKeyMiddleware.destroy();
    });
  });
});
