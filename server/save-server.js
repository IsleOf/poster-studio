import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const outputsDir = path.join(__dirname, '../outputs');

app.post('/api/save-render', (req, res) => {
    try {
        const { imageData, filename } = req.body;

        if (!imageData || !filename) {
            return res.status(400).json({ error: 'Missing imageData or filename' });
        }

        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        const filepath = path.join(outputsDir, filename);
        fs.writeFileSync(filepath, buffer);

        res.json({
            success: true,
            path: filepath,
            message: `Saved to ${filepath}`
        });
    } catch (error) {
        console.error('Error saving render:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Save server running on http://localhost:${PORT}`);
});
