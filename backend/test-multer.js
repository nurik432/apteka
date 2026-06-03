import express from 'express';
import multer from 'multer';

const app = express();
app.use(express.json());
const upload = multer();

app.post('/test', upload.single('image'), (req, res) => {
  res.json({ body: req.body, file: req.file });
});

app.listen(3002, () => console.log('started on 3002'));
