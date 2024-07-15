import { writeFileSync } from 'fs';
import {resolve} from 'path';


/**
 * Interface to store the combination of filenames and their contents.
 * @key: filename
 * @value: contents of the file
 * 
 * Usage: 
 * const fileBuffers: FileBufferMap = {
 * 'file1.txt': Buffer.from('This is file 1'),
 * 'file2.jpg': Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), // Binary data for a JPG file
 * 'file3.pdf': Buffer.from('...'), // Binary data for a PDF file
};
 */
export interface FileBufferMap {
    [filename: string]: Buffer;
}

/**
 * Writes a set of files to a specified directory. This is used for creating a
 * temp directory for the contents of the assets that need to be uploaded to S3
 *
 * @param dirPath - The path of the directory where the files will be written.
 * @param files - A map of file names to file buffers, representing the files to be written.
 */
export function writeFilesToDir(dirPath: string, files: FileBufferMap) {
    for (const [fileName, fileBuffer] of Object.entries(files)) {
        const filePath = resolve(dirPath, fileName);
        console.log(`Writing file to ${filePath}`);
        writeFileSync(filePath, fileBuffer);
    }
}