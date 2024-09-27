import redisClient from '../utils/redis';

export async function authHandler(req, res, next) {
  const token = req.headers['x-token'] || null;
  const userId = await redisClient.get(`auth_${token}`);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  req.user = userId;
  return next();
}

// if user is Authenticated it will set req.isAuthenticated to 'true'
// Note: require further access control in controller function
export async function isAuthenticated(req, res, next) {
  const token = req.headers['x-token'] || null;
  const userId = await redisClient.get(`auth_${token}`);
  if (!userId) {
    res.isAuthenticated = false;
  } else {
    req.user = userId;
    res.isAuthenticated = false;
  }
  return next();
}
