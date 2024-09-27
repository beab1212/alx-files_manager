import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const AppController = {
  async getStatus(req, res) {
    return res.status(200).json({ redis: dbClient.isAlive(), db: redisClient.isAlive() });
  },

  async getStats(req, res) {
    return res.status(200).json({
      users: await dbClient.nbUsers(),
      files: await dbClient.nbFiles(),
    });
  },
};

export default AppController;
