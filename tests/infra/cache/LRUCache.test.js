import LRUCache from '../../../src/infra/cache/LRUCache.js';

describe('LRUCache', () => {
  let cache;

  beforeEach(() => {
    cache = new LRUCache({ max: 3, maxAge: 1000 });
  });

  afterEach(() => {
    cache.clear();
  });

  describe('Constructor', () => {
    it('should create cache with default options', () => {
      const defaultCache = new LRUCache();
      expect(defaultCache.max).toBe(100);
      expect(defaultCache.maxAge).toBe(60000);
    });

    it('should create cache with custom options', () => {
      const customCache = new LRUCache({ max: 50, maxAge: 5000 });
      expect(customCache.max).toBe(50);
      expect(customCache.maxAge).toBe(5000);
    });
  });

  describe('generateKey', () => {
    it('should generate key with method and url', () => {
      const key = cache.generateKey('GET', '/api/users');
      expect(key).toBe('GET:/api/users');
    });

    it('should generate key with query parameters sorted', () => {
      const key = cache.generateKey('GET', '/api/users', {
        page: 1,
        limit: 10,
      });
      expect(key).toBe('GET:/api/users?limit=10&page=1');
    });

    it('should generate key with headers', () => {
      const key = cache.generateKey(
        'GET',
        '/api/users',
        {},
        { accept: 'application/json' },
      );
      expect(key).toBe('GET:/api/users#accept=application/json');
    });

    it('should generate key with query and headers', () => {
      const key = cache.generateKey(
        'GET',
        '/api/users',
        { page: 1 },
        { accept: 'application/json' },
      );
      expect(key).toBe('GET:/api/users?page=1#accept=application/json');
    });
  });

  describe('set and get', () => {
    it('should store and retrieve a value', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should store multiple values', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBe('value2');
      expect(cache.get('key3')).toBe('value3');
    });

    it('should return undefined for non-existent key', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should store objects and arrays', () => {
      const obj = { name: 'John', age: 30 };
      const arr = [1, 2, 3, 4, 5];

      cache.set('object', obj);
      cache.set('array', arr);

      expect(cache.get('object')).toEqual(obj);
      expect(cache.get('array')).toEqual(arr);
    });
  });

  describe('LRU Policy', () => {
    it('should remove least recently used item when max is reached', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      // Cache está cheio (max: 3)
      expect(cache.size()).toBe(3);

      // Adicionar novo item deve remover o mais antigo (key1)
      cache.set('key4', 'value4');

      expect(cache.size()).toBe(3);
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBe('value2');
      expect(cache.get('key3')).toBe('value3');
      expect(cache.get('key4')).toBe('value4');
    });

    it('should update access order when getting a value', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      // Acessar key1 para torná-la mais recente
      cache.get('key1');

      // Adicionar novo item deve remover key2 (agora é a mais antiga)
      cache.set('key4', 'value4');

      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBeUndefined();
      expect(cache.get('key3')).toBe('value3');
      expect(cache.get('key4')).toBe('value4');
    });

    it('should update position when setting existing key', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      // Atualizar key1
      cache.set('key1', 'updated1');

      // Adicionar novo item deve remover key2
      cache.set('key4', 'value4');

      expect(cache.get('key1')).toBe('updated1');
      expect(cache.get('key2')).toBeUndefined();
      expect(cache.get('key3')).toBe('value3');
      expect(cache.get('key4')).toBe('value4');
    });
  });

  describe('Expiration', () => {
    it('should expire items after maxAge', async () => {
      const shortCache = new LRUCache({ max: 5, maxAge: 100 });
      shortCache.set('key1', 'value1');

      expect(shortCache.get('key1')).toBe('value1');

      // Aguardar expiração
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(shortCache.get('key1')).toBeUndefined();
    });

    it('should renew expiration on access', async () => {
      const shortCache = new LRUCache({ max: 5, maxAge: 100 });
      shortCache.set('key1', 'value1');

      // Aguardar 60ms
      await new Promise((resolve) => setTimeout(resolve, 60));

      // Acessar para renovar
      expect(shortCache.get('key1')).toBe('value1');

      // Aguardar mais 60ms (total 120ms desde criação, mas apenas 60ms desde último acesso)
      await new Promise((resolve) => setTimeout(resolve, 60));

      // Item ainda deve estar válido pois foi renovado
      expect(shortCache.get('key1')).toBe('value1');
    });

    it('should detect expired items with isExpired', () => {
      const item = {
        value: 'test',
        expiresAt: Date.now() - 1000, // Expirado há 1 segundo
      };

      expect(cache.isExpired(item)).toBe(true);

      const validItem = {
        value: 'test',
        expiresAt: Date.now() + 1000, // Expira em 1 segundo
      };

      expect(cache.isExpired(validItem)).toBe(false);
    });
  });

  describe('purgeExpired', () => {
    it('should remove all expired items', async () => {
      const shortCache = new LRUCache({ max: 5, maxAge: 50 });

      shortCache.set('key1', 'value1');
      shortCache.set('key2', 'value2');
      shortCache.set('key3', 'value3');

      expect(shortCache.size()).toBe(3);

      // Aguardar expiração
      await new Promise((resolve) => setTimeout(resolve, 100));

      const removed = shortCache.purgeExpired();

      expect(removed).toBe(3);
      expect(shortCache.size()).toBe(0);
    });

    it('should only remove expired items', async () => {
      const shortCache = new LRUCache({ max: 5, maxAge: 100 });

      shortCache.set('key1', 'value1');
      shortCache.set('key2', 'value2');

      // Aguardar parcialmente
      await new Promise((resolve) => setTimeout(resolve, 60));

      // Adicionar novo item
      shortCache.set('key3', 'value3');

      // Aguardar mais tempo para key1 e key2 expirarem
      await new Promise((resolve) => setTimeout(resolve, 60));

      const removed = shortCache.purgeExpired();

      expect(removed).toBe(2);
      expect(shortCache.size()).toBe(1);
      expect(shortCache.get('key3')).toBe('value3');
    });
  });

  describe('delete', () => {
    it('should delete a specific key', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      expect(cache.delete('key1')).toBe(true);
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBe('value2');
      expect(cache.size()).toBe(1);
    });

    it('should return false when deleting non-existent key', () => {
      expect(cache.delete('nonexistent')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all items', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      expect(cache.size()).toBe(3);

      cache.clear();

      expect(cache.size()).toBe(0);
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
      expect(cache.get('key3')).toBeUndefined();
    });
  });

  describe('has', () => {
    it('should return true for existing non-expired key', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
    });

    it('should return false for non-existent key', () => {
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should return false for expired key and remove it', async () => {
      const shortCache = new LRUCache({ max: 5, maxAge: 50 });
      shortCache.set('key1', 'value1');

      expect(shortCache.has('key1')).toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(shortCache.has('key1')).toBe(false);
      expect(shortCache.size()).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      const stats = cache.getStats();

      expect(stats.size).toBe(2);
      expect(stats.max).toBe(3);
      expect(stats.maxAge).toBe(1000);
      expect(stats.expiredCount).toBe(0);
      expect(stats.utilization).toBe('66.67%');
    });

    it('should count expired items', async () => {
      const shortCache = new LRUCache({ max: 5, maxAge: 50 });

      shortCache.set('key1', 'value1');
      shortCache.set('key2', 'value2');

      await new Promise((resolve) => setTimeout(resolve, 100));

      const stats = shortCache.getStats();

      expect(stats.size).toBe(2);
      expect(stats.expiredCount).toBe(2);
    });
  });

  describe('size', () => {
    it('should return correct size', () => {
      expect(cache.size()).toBe(0);

      cache.set('key1', 'value1');
      expect(cache.size()).toBe(1);

      cache.set('key2', 'value2');
      expect(cache.size()).toBe(2);

      cache.delete('key1');
      expect(cache.size()).toBe(1);
    });
  });
});
