import { readFileSync } from "fs";
import { join } from "path";

export const inlineCode = Buffer.from(
  `
    exports.handler = async (event) => {
        console.log('Hello from Lambda!');
        return { message: 'Success!' };
    };
    `
);

const fileBuffer = readFileSync(join(__dirname, "openAPISchema.json"));
export const inlineSchema = fileBuffer.toString("utf8");
