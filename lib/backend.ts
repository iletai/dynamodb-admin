import path from 'node:path';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import express, { type Express } from 'express';
import { createAwsConfig } from './config';
import { LoggedDynamoApiController } from './loggedDynamoDbApi';
import { setupRoutes } from './routes';

export type CreateServerOptions = {
    dynamoDbClient?: DynamoDBClient;
    expressInstance?: Express;
    dynamoEndpoint?: string;
    skipDefaultCredentials?: boolean;
};

export function createServer(options?: CreateServerOptions): Express {
    const {
        dynamoDbClient,
        expressInstance,
        dynamoEndpoint,
        skipDefaultCredentials,
    } = options || {};
    const app = expressInstance || express();
    let dynamodb = dynamoDbClient;

    app.set('json spaces', 2);
    app.set('view engine', 'ejs');
    app.set('views', path.resolve(__dirname, '..', 'views'));

    if (!dynamodb) {
        dynamodb = new DynamoDBClient(
            createAwsConfig({ dynamoEndpoint, skipDefaultCredentials }),
        );
    }

    const ddbApi = new LoggedDynamoApiController(dynamodb);

    setupRoutes(app, ddbApi);

    return app;
}
