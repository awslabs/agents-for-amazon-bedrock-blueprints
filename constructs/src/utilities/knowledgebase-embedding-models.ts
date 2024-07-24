export class BedrockKnowledgeBaseModels {
    // Define static instances of the class for commonly used models
    public static readonly TITAN_EMBED_TEXT_V1 = new BedrockKnowledgeBaseModels("amazon.titan-embed-text-v1", 1536);
    public static readonly COHERE_EMBED_ENGLISH_V3 = new BedrockKnowledgeBaseModels("cohere.embed-english-v3", 1024);
    public static readonly COHERE_EMBED_MULTILINGUAL_V3 = new BedrockKnowledgeBaseModels("cohere.embed-multilingual-v3", 1024);

    public readonly modelName: string;
    public readonly vectorDimension: number;
    constructor(modelName: string, vectorDimension: number) {
        this.modelName = modelName;
        this.vectorDimension = vectorDimension;
    }
    // Method to get the Amazon Resource Name (ARN) for the model
    public getArn(): string {
        const region = process.env.CDK_DEFAULT_REGION!;
        return `arn:aws:bedrock:${region}::foundation-model/${this.modelName}`;
    }
}

