import Queue from 'bull/lib/queue';
import imageThumbnail from 'image-thumbnail';
import dbClient from './utils/db';

const fileQueue = Queue('fileQueue');
const userQueue = new Queue('userQueue');
const widths = ['500', '250', '100'];

fileQueue.process(async (job) => {
  const { userId, fieldId } = job.data;
  if (!userId) {
    throw new Error('Missing fileId');
  }

  if (!fieldId) {
    throw new Error('Missing userId');
  }

  const isFileExist = await dbClient.client.db().collection('files').findOne({ _id: dbClient.ObjectId(fieldId), userId: dbClient.ObjectId(userId) });

  if (!isFileExist) {
    throw new Error('File not found');
  }

  widths.map(async (width) => {
    await imageThumbnail(isFileExist.localPath, { width });
  });
});

userQueue.process(async (job) => {
  const { userId = null } = job.data;
  if (!userId) {
    throw new Error('Missing userId');
  }

  const isUserExist = await dbClient.client.db().collection('users').findOne({ _id: dbClient.ObjectId(userId) });

  if (!isUserExist) {
    throw new Error('User not found');
  }

  console.log(`Welcome ${isUserExist.email}`);
});
