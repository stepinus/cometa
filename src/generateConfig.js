import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Чтение файлов и конвертация в base64
const ppnFile = readFileSync(join(__dirname, '../privet.ppn'));
const pvFile = readFileSync(join(__dirname, '../porcupine_params_ru.pv'));

const ppnBase64 = ppnFile.toString('base64');
const pvBase64 = pvFile.toString('base64');

// Создаем конфигурационный файл
const configContent = `// Автоматически сгенерированный файл
export const PICOVOICE_CONFIG = {
    accessKey: 'YOUR_ACCESS_KEY', // Замените на ваш ключ
    keywordBase64: '${ppnBase64}',
    contextBase64: '${pvBase64}'
};
`;

writeFileSync(join(__dirname, 'picovoiceConfig.ts'), configContent);
console.log('Configuration file has been generated!');
