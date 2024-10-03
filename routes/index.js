import express from 'express';
import { authHandler, isAuthenticated } from '../middlewares';
import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';
import AuthController from '../controllers/AuthController';
import FilesController from '../controllers/FilesController';

const route = express.Router();

route.get('/status', AppController.getStatus);
route.get('/stats', AppController.getStats);
route.post('/users', UsersController.postNew);
route.get('/connect', AuthController.getConnect);
route.get('/disconnect', AuthController.getDisconnect);
route.get('/users/me', authHandler, AuthController.getMe);
route.post('/files', authHandler, FilesController.postUpload);
route.get('/files/:id', authHandler, FilesController.getShow);
route.get('/files', authHandler, FilesController.getIndex);
route.put('/files/:id/publish', authHandler, FilesController.putPublish);
route.put('/files/:id/unpublish', authHandler, FilesController.putUnpublish);
route.get('/files/:id/data', isAuthenticated, FilesController.getFile);

export default route;
