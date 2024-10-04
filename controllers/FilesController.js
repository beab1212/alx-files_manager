import { promisify } from 'util';
import { v4 as uuid4 } from 'uuid';
import { contentType } from 'mime-types';
import Queue from 'bull/lib/queue';
import {
  mkdir, writeFile, existsSync, realpath,
} from 'fs';
import dbClient from '../utils/db';

const mkdirAsync = promisify(mkdir);
const writeFileAsync = promisify(writeFile);
// const readFileAsync = promisify(readFile);
const realpathAsync = promisify(realpath);

const fileQueue = Queue('fileQueue');

const VALID_FILE_TYPES = ['folder', 'file', 'image'];
const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

const FilesController = {
  async postUpload(req, res) {
    try {
      const userId = req.user;
      const {
        name, type, parentId = 0, isPublic = false,
      } = req.body;
      const { data = null } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Missing name' });
      }

      if (!type || !VALID_FILE_TYPES.includes(type)) {
        return res.status(400).json({ error: 'Missing type' });
      }

      if (!data && type !== 'folder') {
        return res.status(400).json({ error: 'Missing data' });
      }

      if (parentId) {
        const parentFile = await dbClient.client.db().collection('files').findOne({ _id: dbClient.ObjectId(parentId) });
        if (!parentFile) {
          return res.status(400).json({ error: 'Parent not found' });
        }
        if (parentFile.type !== 'folder') {
          return res.status(400).json({ error: 'Parent is not a folder' });
        }
      }

      const newFile = {
        userId: dbClient.ObjectId(userId),
        name,
        type,
        isPublic,
        parentId,
        localPath: '',
      };

      await mkdirAsync(FOLDER_PATH, { recursive: true });

      if (type !== 'folder') {
        const localPath = `${FOLDER_PATH}/${uuid4()}`;
        await writeFileAsync(localPath, Buffer.from(data, 'base64'));
        newFile.localPath = localPath;
      }

      const newInsert = await dbClient.client.db().collection('files').insertOne(newFile);

      if (type === 'image') {
        fileQueue.add(userId, newInsert.ops[0]._id);
      }

      return res.status(201).json({
        id: newInsert.ops[0]._id,
        userId,
        name,
        type,
        isPublic,
        parentId,
      });
    } catch (err) {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  async getShow(req, res) {
    try {
      const userId = req.user;
      const { id = Buffer.alloc(24, '0').toString('utf-8') } = req.params;

      const isFileExist = await dbClient.client.db().collection('files').findOne({ _id: dbClient.ObjectId(id), userId: dbClient.ObjectId(userId) });
      if (!isFileExist) {
        return res.status(404).json({ error: 'Not found' });
      }

      return res.status(200).json({
        id,
        userId,
        name: isFileExist.name,
        type: isFileExist.type,
        isPublic: isFileExist.isPublic,
        parentId: isFileExist.parentId,
      });
    } catch (err) {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  async getIndex(req, res) {
    try {
      const userId = req.user;
      const { parentId = '0' } = req.query;
      const page = /\d+/.test((req.query.page || '').toString()) ? Number.parseInt(req.query.page, 10) : 0;

      const files = await dbClient.client.db().collection('files').aggregate([
        { $match: { parentId, userId: dbClient.ObjectId(userId) } },
        { $skip: page * 20 },
        { $limit: 20 },
      ]).toArray();
      const responseData = files.map((file) => ({
        id: file._id,
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId === '0' ? 0 : file.parentId,
      }));
      return res.status(200).json(responseData);
    } catch (err) {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  async putPublish(req, res) {
    try {
      const userId = req.user;
      const { id = '' } = req.params;
      const isFileExist = await dbClient.client.db().collection('files').findOne({ _id: dbClient.ObjectId(id), userId: dbClient.ObjectId(userId) });
      if (!isFileExist) {
        return res.status(404).json({ error: 'Not found' });
      }

      await await dbClient.client.db().collection('files').updateOne({ _id: dbClient.ObjectId(id) }, { $set: { isPublic: true } });
      return res.status(200).json({
        id,
        userId,
        name: isFileExist.name,
        type: isFileExist.type,
        isPublic: true,
        parentId: isFileExist.parentId,
      });
    } catch (err) {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  async putUnpublish(req, res) {
    try {
      const userId = req.user;
      const { id = '' } = req.params;
      const isFileExist = await dbClient.client.db().collection('files').findOne({ _id: dbClient.ObjectId(id), userId: dbClient.ObjectId(userId) });
      if (!isFileExist) {
        return res.status(404).json({ error: 'Not found' });
      }

      await await dbClient.client.db().collection('files').updateOne({ _id: dbClient.ObjectId(id) }, { $set: { isPublic: false } });
      return res.status(200).json({
        id,
        userId,
        name: isFileExist.name,
        type: isFileExist.type,
        isPublic: false,
        parentId: isFileExist.parentId,
      });
    } catch (err) {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  async getFile(req, res) {
    try {
      const userId = req.user || '';
      // const { isAuthenticated } = req;
      const { id = '', size = null } = req.params;
      let isFileExist;
      try {
        isFileExist = await dbClient.client.db().collection('files').findOne({ _id: dbClient.ObjectId(id) });
      } catch (err) {
        return res.status(404).json({ error: 'Not found' });
      }
      if (!isFileExist || (!isFileExist.isPublic && isFileExist.userId !== String(userId))) {
        return res.status(404).json({ error: 'Not found' });
      }

      if (isFileExist.type === 'folder') {
        return res.status(400).json({ error: 'A folder doesn\'t have content' });
      }

      let fileLocation = isFileExist.localPath;
      if (size) {
        fileLocation = `${fileLocation}_${size}`;
      }
      if (!existsSync(fileLocation)) {
        return res.status(404).json({ error: 'Not found' });
      }

      const mimeType = contentType(isFileExist.name);
      const fileData = await realpathAsync(fileLocation);
      res.setHeader('Content-Type', mimeType || 'text/plain ; charset=utf-8');
      return res.status(200).sendFile(fileData);
    } catch (err) {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },
};

export default FilesController;
