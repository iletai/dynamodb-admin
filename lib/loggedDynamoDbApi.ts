import type {
    CreateTableInput,
    CreateTableOutput,
    DeleteTableInput,
    DeleteTableOutput,
} from '@aws-sdk/client-dynamodb';
import type {
    DeleteCommandInput,
    DeleteCommandOutput,
    GetCommandInput,
    GetCommandOutput,
    PutCommandInput,
    PutCommandOutput,
    QueryCommandInput,
    QueryCommandOutput,
    ScanCommandInput,
    ScanCommandOutput,
} from '@aws-sdk/lib-dynamodb';
import type { Request } from 'express';
import pickBy from 'lodash.pickby';
import { DynamoApiController } from './dynamoDbApi';
import { dbLogger } from './logger';

export class LoggedDynamoApiController extends DynamoApiController {
    private getRequestInfo(req?: Request): {
        userAgent?: string;
        ipAddress?: string;
    } {
        return {
            userAgent: req?.get('User-Agent'),
            ipAddress: req?.ip || req?.connection?.remoteAddress,
        };
    }

    private getParametersToLog(input: any): Record<string, unknown> {
        console.info(
            'getParametersToLog called with input:',
            JSON.stringify(input, null, 2),
        );
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { TableName, ...parameters } = input;
        return pickBy(parameters, (value) => value !== undefined);
    }

    async scan(
        input: ScanCommandInput,
        req?: Request,
    ): Promise<ScanCommandOutput> {
        const startTime = Date.now();
        try {
            const result = await super.scan(input);
            const executionTime = Date.now() - startTime;
            console.info(
                'scan result:', this.getParametersToLog(input));
            dbLogger.log({
                operation: 'scan',
                tableName: input.TableName || 'unknown',
                parameters: this.getParametersToLog(input),
                responseCount: result.Count,
                scannedCount: result.ScannedCount,
                sdkResponse: { $metadata: result.$metadata },
                executionTime,
                ...this.getRequestInfo(req),
            });

            return result;
        } catch (error) {
            const executionTime = Date.now() - startTime;
            dbLogger.log({
                operation: 'scan',
                tableName: input.TableName || 'unknown',
                parameters: this.getParametersToLog(input),
                executionTime,
                sdkResponse:
                    error instanceof Error && (error as any).$metadata
                        ? { $metadata: (error as any).$metadata }
                        : undefined,
                error: error instanceof Error ? error.message : String(error),
                ...this.getRequestInfo(req),
            });
            throw error;
        }
    }

    async query(
        input: QueryCommandInput,
        req?: Request,
    ): Promise<QueryCommandOutput> {
        const startTime = Date.now();
        try {
            const result = await super.query(input);
            const executionTime = Date.now() - startTime;

            dbLogger.log({
                operation: 'query',
                tableName: input.TableName || 'unknown',
                parameters: this.getParametersToLog(input),
                responseCount: result.Count,
                scannedCount: result.ScannedCount,
                sdkResponse: { $metadata: result.$metadata },
                executionTime,
                ...this.getRequestInfo(req),
            });

            return result;
        } catch (error) {
            const executionTime = Date.now() - startTime;
            dbLogger.log({
                operation: 'query',
                tableName: input.TableName || 'unknown',
                parameters: this.getParametersToLog(input),
                executionTime,
                sdkResponse:
                    error instanceof Error && (error as any).$metadata
                        ? { $metadata: (error as any).$metadata }
                        : undefined,
                error: error instanceof Error ? error.message : String(error),
                ...this.getRequestInfo(req),
            });
            throw error;
        }
    }

    async getItem(
        input: GetCommandInput,
        req?: Request,
    ): Promise<GetCommandOutput> {
        const startTime = Date.now();
        try {
            const result = await super.getItem(input);
            const executionTime = Date.now() - startTime;

            dbLogger.log({
                operation: 'getItem',
                tableName: input.TableName || 'unknown',
                parameters: this.getParametersToLog(input),
                responseCount: result.Item ? 1 : 0,
                sdkResponse: { $metadata: result.$metadata },
                executionTime,
                ...this.getRequestInfo(req),
            });

            return result;
        } catch (error) {
            const executionTime = Date.now() - startTime;
            dbLogger.log({
                operation: 'getItem',
                tableName: input.TableName || 'unknown',
                parameters: this.getParametersToLog(input),
                executionTime,
                sdkResponse:
                    error instanceof Error && (error as any).$metadata
                        ? { $metadata: (error as any).$metadata }
                        : undefined,
                error: error instanceof Error ? error.message : String(error),
                ...this.getRequestInfo(req),
            });
            throw error;
        }
    }

    async putItem(
        input: PutCommandInput,
        req?: Request,
    ): Promise<PutCommandOutput> {
        const startTime = Date.now();
        try {
            const result = await super.putItem(input);
            const executionTime = Date.now() - startTime;

            dbLogger.log({
                operation: 'putItem',
                tableName: input.TableName || 'unknown',
                parameters: this.getParametersToLog(input),
                responseCount: 1,
                sdkResponse: { $metadata: result.$metadata },
                executionTime,
                ...this.getRequestInfo(req),
            });

            return result;
        } catch (error) {
            const executionTime = Date.now() - startTime;
            dbLogger.log({
                operation: 'putItem',
                tableName: input.TableName || 'unknown',
                parameters: this.getParametersToLog(input),
                executionTime,
                sdkResponse:
                    error instanceof Error && (error as any).$metadata
                        ? { $metadata: (error as any).$metadata }
                        : undefined,
                error: error instanceof Error ? error.message : String(error),
                ...this.getRequestInfo(req),
            });
            throw error;
        }
    }

    async deleteItem(
        input: DeleteCommandInput,
        req?: Request,
    ): Promise<DeleteCommandOutput> {
        const startTime = Date.now();
        try {
            const result = await super.deleteItem(input);
            const executionTime = Date.now() - startTime;

            dbLogger.log({
                operation: 'deleteItem',
                tableName: input.TableName || 'unknown',
                parameters: this.getParametersToLog(input),
                responseCount: 1,
                sdkResponse: { $metadata: result.$metadata },
                executionTime,
                ...this.getRequestInfo(req),
            });

            return result;
        } catch (error) {
            const executionTime = Date.now() - startTime;
            dbLogger.log({
                operation: 'deleteItem',
                tableName: input.TableName || 'unknown',
                parameters: this.getParametersToLog(input),
                executionTime,
                sdkResponse:
                    error instanceof Error && (error as any).$metadata
                        ? { $metadata: (error as any).$metadata }
                        : undefined,
                error: error instanceof Error ? error.message : String(error),
                ...this.getRequestInfo(req),
            });
            throw error;
        }
    }

    async createTable(
        input: CreateTableInput,
        req?: Request,
    ): Promise<CreateTableOutput> {
        const startTime = Date.now();
        try {
            const result = await super.createTable(input);
            const executionTime = Date.now() - startTime;

            dbLogger.log({
                operation: 'createTable',
                tableName: input.TableName || 'unknown',
                parameters: this.getParametersToLog(input),
                responseCount: 1,
                sdkResponse: {
                    $metadata: undefined,
                    TableDescription: result.TableDescription,
                },
                executionTime,
                ...this.getRequestInfo(req),
            });

            return result;
        } catch (error) {
            const executionTime = Date.now() - startTime;
            dbLogger.log({
                operation: 'createTable',
                tableName: input.TableName || 'unknown',
                parameters: this.getParametersToLog(input),
                executionTime,
                sdkResponse:
                    error instanceof Error && (error as any).$metadata
                        ? { $metadata: (error as any).$metadata }
                        : undefined,
                error: error instanceof Error ? error.message : String(error),
                ...this.getRequestInfo(req),
            });
            throw error;
        }
    }

    async deleteTable(
        input: DeleteTableInput,
        req?: Request,
    ): Promise<DeleteTableOutput> {
        const startTime = Date.now();
        try {
            const result = await super.deleteTable(input);
            const executionTime = Date.now() - startTime;

            dbLogger.log({
                operation: 'deleteTable',
                tableName: input.TableName || 'unknown',
                parameters: this.getParametersToLog(input),
                responseCount: 1,
                sdkResponse: {
                    $metadata: undefined,
                    TableDescription: result.TableDescription,
                },
                executionTime,
                ...this.getRequestInfo(req),
            });

            return result;
        } catch (error) {
            const executionTime = Date.now() - startTime;
            dbLogger.log({
                operation: 'deleteTable',
                tableName: input.TableName || 'unknown',
                parameters: this.getParametersToLog(input),
                executionTime,
                sdkResponse:
                    error instanceof Error && (error as any).$metadata
                        ? { $metadata: (error as any).$metadata }
                        : undefined,
                error: error instanceof Error ? error.message : String(error),
                ...this.getRequestInfo(req),
            });
            throw error;
        }
    }
}
