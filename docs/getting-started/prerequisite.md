Before you begin, ensure you have the following installed:

1. **AWS CLI**: Make sure you have the [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html){:target="_blank"} installed and configured with your credentials.

2. **Node.js and npm**: Install the latest stable version of [Node.js](https://nodejs.org/en/){:target="_blank"} and [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm){:target="_blank"}.
   ```
   # For Mac
   brew install node

   # For Ubuntu
   sudo apt install nodejs
   ```

3. **AWS CDK**: Install the AWS CDK globally.
   ```
   npm install -g aws-cdk@2.147.3
   ```

4. **TypeScript**: The Agent Blueprints are only available in TypeScript.

5. **CDK Bootstrap**: Bootstrap your AWS environment.
   ```
   cdk bootstrap aws://<your-account-number>/<region-to-bootstrap>
   ```