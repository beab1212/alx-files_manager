import sha1 from 'sha1';
import Queue from 'bull/lib/queue';
import dbClient from '../utils/db';

const userQueue = new Queue('userQueue');

const UsersController = {
  async postNew(req, res) {
    const { email, password } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    const isUserExist = await dbClient.client.db().collection('users').findOne({ email });
    if (isUserExist) {
      return res.status(400).json({ error: 'Already exist' });
    }

    const newUser = await dbClient.client.db().collection('users').insertOne({ email, password: sha1(password) });

    userQueue.add({ userID: newUser.ops[0]._id });

    return res.status(201).json({ email, id: newUser.ops[0]._id });
  },
};

export default UsersController;
