import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import https from 'https';

dotenv.config();

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Basic middleware
app.use(express.json({ strict: false }));
app.use(express.urlencoded({ extended: true }));

// Set security headers for all responses
app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    next();
});

// Set correct MIME types
app.use((req, res, next) => {
    const ext = path.extname(req.url);
    switch (ext) {
        case '.mjs':
            res.setHeader('Content-Type', 'application/javascript');
            break;
        case '.js':
            res.setHeader('Content-Type', 'application/javascript');
            break;
        case '.wasm':
            res.setHeader('Content-Type', 'application/wasm');
            break;
        case '.onnx':
            res.setHeader('Content-Type', 'application/octet-stream');
            break;
    }
    next();
});

// Serve static files from dist
app.use(express.static(path.join(__dirname, 'dist')));

// Serve static files from public
app.use(express.static(path.join(__dirname, 'public')));

// Serve required node_modules files
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

// Add OPTIONS handling for CORS preflight requests
app.options('*', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.sendStatus(200);
});

// Logging middleware
app.use((req, res, next) => {
    console.log('=== Incoming Request ===');
    console.log('URL:', req.url);
    console.log('Method:', req.method);
    console.log('Headers:', req.headers);
    console.log('Raw Body:', req.body);
    console.log('Content Type:', req.headers['content-type']);
    next();
});

// Salute OAuth endpoint
app.post('/salute', async (req, res) => {
    try {
        console.log('Requesting Salute OAuth token...');
        
        const options = {
            hostname: 'ngw.devices.sberbank.ru',
            port: 9443,
            path: '/api/v2/oauth',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': req.headers.authorization,
                'RqUID': req.headers.rquid || Date.now().toString(),
                'Host': 'ngw.devices.sberbank.ru:9443'
            },
            rejectUnauthorized: false
        };

        console.log('Request options:', JSON.stringify(options, null, 2));

        const request = https.request(options, (response) => {
            console.log('Status Code:', response.statusCode);
            console.log('Status Message:', response.statusMessage);
            console.log('Response Headers:', response.headers);

            let data = '';
            response.on('data', (chunk) => {
                data += chunk;
            });

            response.on('end', () => {
                console.log('Response data:', data);
                
                res.status(response.statusCode);
                Object.entries(response.headers).forEach(([key, value]) => {
                    res.setHeader(key, value);
                });
                res.send(data);
            });
        });

        request.on('error', (error) => {
            console.error('Request error:', error);
            res.status(500).json({ error: error.message });
        });

        // Send the request body
        const bodyData = 'scope=SALUTE_SPEECH_PERS';
        console.log('Sending body:', bodyData);
        request.write(bodyData);
        request.end();

    } catch (error) {
        console.error('Error in /salute endpoint:', error);
        res.status(500).json({ error: error.message });
    }
});

// Speech recognition endpoint
app.post('/speech', async (req, res) => {
    try {
        console.log('Making speech recognition request...');
        const options = {
            hostname: 'smartspeech.sber.ru',
            path: '/rest/v1/speech:recognize',
            method: 'POST',
            headers: {
                'Authorization': req.headers.authorization,
                'Content-Type': 'audio/x-pcm;bit=16;rate=16000',
                'Content-Length': req.headers['content-length']
            },
            rejectUnauthorized: false
        };

        console.log('Speech recognition options:', JSON.stringify(options, null, 2));

        const speechRequest = https.request(options, (response) => {
            console.log('Speech recognition response status:', response.statusCode);
            console.log('Speech recognition response headers:', response.headers);

            let data = '';
            response.on('data', (chunk) => {
                data += chunk;
            });

            response.on('end', () => {
                console.log('Speech recognition response:', data);
                res.status(response.statusCode);
                Object.entries(response.headers).forEach(([key, value]) => {
                    res.setHeader(key, value);
                });
                res.send(data);
            });
        });

        speechRequest.on('error', (error) => {
            console.error('Speech recognition error:', error);
            res.status(500).json({ error: error.message });
        });

        // Forward the audio data
        req.on('data', (chunk) => {
            speechRequest.write(chunk);
        });

        req.on('end', () => {
            speechRequest.end();
        });

    } catch (error) {
        console.error('Error in /speech endpoint:', error);
        res.status(500).json({ error: error.message });
    }
});

// Speech synthesis endpoint
app.post('/synthesize', async (req, res) => {
    try {
        console.log('Making speech synthesis request...');
        console.log('Request', req);
        console.log('Request body:', req.body);
        if (!req.body || typeof req.body !== 'string') {
            return res.status(400).json({ error: 'Request body must be a string' });
        }

        const queryString = new URLSearchParams(req.query).toString();
        
        const options = {
            hostname: 'smartspeech.sber.ru',
            path: `/api/v1/synthesize?${queryString}`,
            method: 'POST',
            headers: {
                'Authorization': req.headers.authorization,
                'Content-Type': 'application/text'
            },
            rejectUnauthorized: false // Handle self-signed certificate
        };

        const request = https.request(options, (response) => {
            // Set status first
            res.status(response.statusCode);

            // Forward the response headers
            Object.keys(response.headers).forEach(header => {
                try {
                    res.setHeader(header, response.headers[header]);
                } catch (e) {
                    console.warn('Could not set header:', header);
                }
            });

            // Handle error status codes
            if (response.statusCode >= 400) {
                let data = '';
                response.on('data', chunk => data += chunk);
                response.on('end', () => {
                    try {
                        res.send(data);
                    } catch (e) {
                        console.error('Error sending error response:', e);
                    }
                });
                return;
            }

            // Pipe the response directly to our response for success cases
            response.pipe(res);
        });

        request.on('error', (error) => {
            console.error('Error in synthesis request:', error);
            // Only send error response if headers haven't been sent
            if (!res.headersSent) {
                res.status(500).json({ error: 'Failed to make synthesis request' });
            }
        });

        // Send the request body
        console.log('Sending text:', req.body);
        request.write(req.body);
        request.end();

    } catch (error) {
        console.error('Error in synthesis endpoint:', error);
        // Only send error response if headers haven't been sent
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// Fallback route for SPA
app.get('*', (req, res) => {
    // Don't redirect API calls or files with extensions
    if (!req.path.startsWith('/api') && !path.extname(req.path)) {
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    } else {
        res.status(404).send('Not found');
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
