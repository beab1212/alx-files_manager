import express from 'express';
import route from './routes';

const PORT = process.env.PORT || 5000;
const app = express();
app.use(express.json());

app.use(route);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
