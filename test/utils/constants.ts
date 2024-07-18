import * as fs from 'fs';
import * as path from 'path';

export const inlineCode = Buffer.from(
    `
    exports.handler = async (event) => {
        console.log('Hello from Lambda!');
        return { message: 'Success!' };
    };
    `);

const fileBuffer = fs.readFileSync(path.join(__dirname, 'openAPISchema.json'));
export const inlineSchema = fileBuffer.toString('utf8');
