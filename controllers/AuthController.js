import sha1 from 'sha1';
import { v4 as uuid4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const AuthController = {
  async getConnect(req, res) {
    try {
      const auth = req.headers.authorization.replace('Basic ', '') || null;
      if (!auth) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const base64ToString = Buffer.from(auth, 'base64').toString('utf-8');
      const [email, password] = base64ToString.split(':');

      if (!email || !password) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const isEmailExist = await dbClient.client.db().collection('users').findOne({ email, password: sha1(password) });

      if (!isEmailExist) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const token = await uuid4();
      await redisClient.set(`auth_${token}`, isEmailExist._id.toString(), 86400);

      return res.status(200).json({ token });
    } catch (err) {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  async getDisconnect(req, res) {
    try {
      const token = req.headers['x-token'] || null;
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const locToken = await redisClient.get(`auth_${token}`);
      if (!locToken) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const user = await await dbClient.client.db().collection('users').findOne({ _id: dbClient.ObjectId(locToken) });
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      await redisClient.del(`auth_${token}`);

      return res.status(204).send();
    } catch (err) {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  async getMe(req, res) {
    try {
      const userId = req.user;
      const isUserExist = await dbClient.client.db().collection('users').findOne({ _id: dbClient.ObjectId(userId) }, { projection: { password: 0 } });
      if (!isUserExist) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      return res.status(200).json({ id: isUserExist._id, email: isUserExist.email });
    } catch (err) {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },
};

export default AuthController;
