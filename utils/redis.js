import { createClient } from 'redis';
import { promisify } from 'util';

class RedisClient {
  constructor() {
    this.client = createClient();
    this.isReady = true;
    this.GET = promisify(this.client.get).bind(this.client);
    this.SET = promisify(this.client.set).bind(this.client);
    this.DEL = promisify(this.client.del).bind(this.client);

    this.client.on('error', (err) => {
      console.log('Redis client not connected to the server: ', err);
      this.isReady = false;
    });
  }

  isAlive() {
    return this.isReady;
  }

  async get(key) {
    return this.GET(key);
  }

  async set(key, value, duration) {
    return this.SET(key, value, 'EX', duration);
  }

  async del(key) {
    return this.DEL(key);
  }
}

const redisClient = new RedisClient();
export default redisClient;
