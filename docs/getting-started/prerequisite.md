Before you begin, you must have the following installed:

1. AWS CLI
2. Node.js and NPM
3. AWS CDK
4. TypeScript

### Shell Script Installation (Recommended)

This method uses a readily available shell script to install the `agent blueprints` NPM package and its required dependencies. You do not need to install the `agent blueprint` separately if you use this method. Follow these steps:

**1. Clone the repository**:

```
git clone https://github.com/aws-samples/amazon-bedrock-samples.git
```

**2. Navigate to the appropriate folder**:

```
cd amazon-bedrock-samples/agents-for-bedrock/agent-blueprint-templates/
```

**3. Run the shell script to install all the dependencies**:

```
./blueprints.sh init
```

After completing these steps, you should have the `Agent Blueprints` package installed along with its dependencies, and your environment will be ready to use the Agent Blueprints.

**Note**: You may still have to configure your AWS CLI. The shell script will only install the necessary dependencies. To learn about configuring AWS CLI, [click here](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-quickstart.html){:target="\_blank"}

### Manual Installation

Alternatively, you can manually install the dependencies by following these steps:

1. **AWS CLI**: Make sure you have the [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html){:target="\_blank"} installed and configured with your credentials.

2. **Node.js and npm**: Install the latest stable version of [Node.js](https://nodejs.org/en/){:target="\_blank"} and [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm){:target="\_blank"}.

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

After completing either method, you should have all the necessary dependencies installed and your environment prepared to use Agent Blueprints.
