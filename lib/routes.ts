/* eslint-disable import-x/order */
import type {
    AttributeDefinition,
    GlobalSecondaryIndex,
    KeySchemaElement,
    LocalSecondaryIndex,
    QueryInput,
    ScalarAttributeType,
    ScanInput,
} from '@aws-sdk/client-dynamodb';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import errorhandler from 'errorhandler';
import express, { type ErrorRequestHandler, type Express } from 'express';
import pickBy from 'lodash.pickby';
import path from 'node:path';
import { getPage } from './actions/getPage';
import { listAllTables } from './actions/listAllTables';
import { purgeTable } from './actions/purgeTable';
import type { DynamoApiController } from './dynamoDbApi';
import {
    extractKey,
    extractKeysForItems,
    isAttributeNotAlreadyCreated,
    parseKey,
    ScanParams,
} from './util';
import asyncMiddleware from './utils/asyncMiddleware';

const DEFAULT_THEME = process.env.DEFAULT_THEME || 'light';

export function setupRoutes(app: Express, ddbApi: DynamoApiController): void {
    app.use(errorhandler());
    app.use('/assets', express.static(path.join(__dirname, '..', 'public')));

    app.use(cookieParser(), (req, res, next) => {
        const { theme = DEFAULT_THEME } = req.cookies;
        res.locals = {
            theme,
        };
        next();
    });

    app.get(
        '/',
        asyncMiddleware(async(_req, res) => {
            const data = await listAllTables(ddbApi);
            res.render('tables', { data });
        }),
    );

    app.get(
        '/api/tables',
        asyncMiddleware(async(_req, res) => {
            const data = await listAllTables(ddbApi);
            res.send(data);
        }),
    );

    app.get('/create-table', (_req, res) => {
        res.render('create-table', {});
    });

    type TableDefinitionInput = {
        TableName: string;
        HashAttributeName: string;
        HashAttributeType: ScalarAttributeType;
        RangeAttributeName?: string;
        RangeAttributeType?: ScalarAttributeType;
        ReadCapacityUnits: number;
        WriteCapacityUnits: number;
    };

    type SecondaryIndexesInput = Omit<TableDefinitionInput, 'TableName'> & {
        IndexName: string;
        IndexType: 'global' | 'local';
    };

    app.post(
        '/create-table',
        bodyParser.json({ limit: '500kb' }),
        asyncMiddleware(async(req, res) => {
            const {
                TableName,
                HashAttributeName,
                HashAttributeType,
                RangeAttributeName,
                RangeAttributeType,
                ReadCapacityUnits,
                WriteCapacityUnits,
            } = req.body.TableDefinition as TableDefinitionInput;
            const SecondaryIndexes = req.body
                .SecondaryIndexes as SecondaryIndexesInput[];

            const attributeDefinitions: AttributeDefinition[] = [
                {
                    AttributeName: HashAttributeName,
                    AttributeType: HashAttributeType,
                },
            ];

            const keySchema: KeySchemaElement[] = [
                {
                    AttributeName: HashAttributeName,
                    KeyType: 'HASH',
                },
            ];

            if (RangeAttributeName) {
                if (!RangeAttributeType) {
                    res.status(400).json({
                        message: `The attribute type of the range attribute "${RangeAttributeName}" is not specified`,
                    });
                    return;
                }

                attributeDefinitions.push({
                    AttributeName: RangeAttributeName,
                    AttributeType: RangeAttributeType,
                });

                keySchema.push({
                    AttributeName: RangeAttributeName,
                    KeyType: 'RANGE',
                });
            }

            const globalSecondaryIndexes: GlobalSecondaryIndex[] = [];
            const localSecondaryIndexes: LocalSecondaryIndex[] = [];
            if (SecondaryIndexes) {
                for (const secondaryIndex of SecondaryIndexes) {
                    const secondaryIndexKeySchema: KeySchemaElement[] = [
                        {
                            AttributeName: secondaryIndex.HashAttributeName,
                            KeyType: 'HASH',
                        },
                    ];
                    if (
                        isAttributeNotAlreadyCreated(
                            attributeDefinitions,
                            secondaryIndex.HashAttributeName,
                        )
                    ) {
                        attributeDefinitions.push({
                            AttributeName: secondaryIndex.HashAttributeName,
                            AttributeType: secondaryIndex.HashAttributeType,
                        });
                    }

                    if (secondaryIndex.RangeAttributeName) {
                        if (!secondaryIndex.RangeAttributeType) {
                            res.status(400).json({
                                message: `The attribute type of the range attribute "${secondaryIndex.RangeAttributeName}" is not specified`,
                            });
                            return;
                        }

                        if (
                            isAttributeNotAlreadyCreated(
                                attributeDefinitions,
                                secondaryIndex.RangeAttributeName,
                            )
                        ) {
                            attributeDefinitions.push({
                                AttributeName: secondaryIndex.RangeAttributeName,
                                AttributeType: secondaryIndex.RangeAttributeType,
                            });
                        }

                        secondaryIndexKeySchema.push({
                            AttributeName: secondaryIndex.RangeAttributeName,
                            KeyType: 'RANGE',
                        });
                    }

                    const index: GlobalSecondaryIndex | LocalSecondaryIndex = {
                        IndexName: secondaryIndex.IndexName,
                        KeySchema: secondaryIndexKeySchema,
                        Projection: {
                            ProjectionType: 'ALL',
                        },
                    };

                    if (secondaryIndex.IndexType === 'global') {
                        globalSecondaryIndexes.push({
                            ...index,
                            ProvisionedThroughput: {
                                ReadCapacityUnits: secondaryIndex.ReadCapacityUnits,
                                WriteCapacityUnits: secondaryIndex.WriteCapacityUnits,
                            },
                        });
                    } else {
                        localSecondaryIndexes.push(index);
                    }
                }
            }

            await ddbApi.createTable({
                TableName,
                ProvisionedThroughput: {
                    ReadCapacityUnits,
                    WriteCapacityUnits,
                },
                GlobalSecondaryIndexes: globalSecondaryIndexes.length
                    ? globalSecondaryIndexes
                    : undefined,
                LocalSecondaryIndexes: localSecondaryIndexes.length
                    ? localSecondaryIndexes
                    : undefined,
                KeySchema: keySchema,
                AttributeDefinitions: attributeDefinitions,
            });

            res.status(204).end();
        }),
    );

    app.delete(
        '/tables',
        asyncMiddleware(async(_req, res) => {
            const tablesList = await listAllTables(ddbApi);
            if (tablesList.length === 0) {
                res.send('There are no tables to delete');
                return;
            }
            await Promise.all(
                tablesList.map((table) =>
                    ddbApi.deleteTable({ TableName: table.TableName! }),
                ),
            );
            res.send('Tables deleted');
        }),
    );

    app.delete(
        '/tables-purge',
        asyncMiddleware(async(req, res) => {
            const tablesList = await listAllTables(ddbApi);
            if (tablesList.length === 0) {
                res.send('There are no tables to purge');
                return;
            }
            await Promise.all(
                tablesList.map((table) => purgeTable(table.TableName!, ddbApi)),
            );
            res.send('Tables purged');
        }),
    );

    app.delete(
        '/tables/:TableName',
        asyncMiddleware(async(req, res) => {
            const { TableName } = req.params;
            await ddbApi.deleteTable({ TableName });
            res.status(204).end();
        }),
    );

    app.delete(
        '/tables/:TableName/all',
        asyncMiddleware(async(req, res) => {
            const { TableName } = req.params;
            await purgeTable(TableName, ddbApi);
            res.status(200).end();
        }),
    );

    app.get(
        '/tables/:TableName/get',
        asyncMiddleware(async(req, res) => {
            const { TableName } = req.params;
            const hash = req.query.hash as string;
            const range = req.query.range as string;
            if (hash) {
                if (range) {
                    res.redirect(
                        `/tables/${encodeURIComponent(
                            TableName,
                        )}/items/${encodeURIComponent(hash)},${encodeURIComponent(range)}`,
                    );
                } else {
                    res.redirect(
                        `/tables/${encodeURIComponent(
                            TableName,
                        )}/items/${encodeURIComponent(hash)}`,
                    );
                }
                return;
            }

            const description = await ddbApi.describeTable({ TableName });
            const hashKey = description.KeySchema!.find(
                (schema) => schema.KeyType === 'HASH',
            );
            const rangeKey = description.KeySchema!.find(
                (schema) => schema.KeyType === 'RANGE',
            );
            res.render('get', {
                Table: description,
                hashKey,
                rangeKey,
            });
        }),
    );

    app.get(
        '/tables/:TableName',
        asyncMiddleware(async(req, res) => {
            const TableName = req.params.TableName;
            req.query = pickBy(req.query);
            const pageNum =
                typeof req.query.pageNum === 'string'
                    ? Number.parseInt(req.query.pageNum)
                    : 1;

            const description = await ddbApi.describeTable({ TableName });
            const data = {
                query: req.query,
                pageNum,
                operators: {
                    '=': '=',
                    '<>': '≠',
                    '>=': '>=',
                    '<=': '<=',
                    '>': '>',
                    '<': '<',
                    begins_with: 'begins_with',
                    contains: 'contains',
                    between: 'between',
                    attribute_exists: 'exists',
                    attribute_not_exists: 'not exists',
                },
                attributeTypes: {
                    S: 'String',
                    N: 'Number',
                },
                Table: description,
            };
            res.render('scan', data);
        }),
    );

    app.get(
        '/tables/:TableName/items',
        asyncMiddleware(async(req, res) => {
            const { TableName } = req.params;
            req.query = pickBy(req.query);
            const filters =
                typeof req.query.filters === 'string'
                    ? JSON.parse(req.query.filters)
                    : {};
            const ExclusiveStartKey =
                typeof req.query.startKey === 'string'
                    ? JSON.parse(req.query.startKey)
                    : {};
            const pageNum =
                typeof req.query.pageNum === 'string' ? parseInt(req.query.pageNum) : 1;
            const queryableSelection =
                typeof req.query.queryableSelection === 'string'
                    ? req.query.queryableSelection
                    : 'table';
            const operationType: 'scan' | 'query' =
                req.query.operationType === 'query' ? 'query' : 'scan';
            let indexBeingUsed = null;

            const tableDescription = await ddbApi.describeTable({ TableName });

            if (operationType === 'query') {
                if (queryableSelection === 'table') {
                    indexBeingUsed = tableDescription;
                } else if (tableDescription.GlobalSecondaryIndexes) {
                    indexBeingUsed = tableDescription.GlobalSecondaryIndexes.find(
                        (index) => index.IndexName === req.query.queryableSelection,
                    );
                }
            }

            const ExpressionAttributeNames:
                | ScanInput['ExpressionAttributeNames']
                | QueryInput['ExpressionAttributeNames'] = {};
            const ExpressionAttributeValues:
                | ScanInput['ExpressionAttributeValues']
                | QueryInput['ExpressionAttributeValues'] = {};
            const FilterExpressions: string[] = [];
            const KeyConditionExpression: string[] = [];

            // Create a variable to uniquely identify each expression attribute
            let i = 0;

            for (const key in filters) {
                if (filters[key].type === 'N') {
                    filters[key].value = Number(filters[key].value);
                }

                ExpressionAttributeNames[`#key${i}`] = key;

                const matchedKeySchema = indexBeingUsed
                    ? indexBeingUsed.KeySchema!.find(
                        (keySchemaItem) => keySchemaItem.AttributeName === key,
                    )
                    : undefined;

                let expression = '';

                // Handle different operators
                switch (filters[key].operator) {
                    case 'begins_with':
                    case 'contains':
                        ExpressionAttributeValues[`:key${i}`] = filters[key].value;
                        expression = `${filters[key].operator} ( #key${i} , :key${i})`;
                        break;

                    case 'between': {
                        // For between operator, expect comma-separated values
                        const values = filters[key].value
                            .split(',')
                            .map((v: string) => v.trim());
                        if (values.length !== 2) {
                            throw new Error(
                                'Between operator requires exactly two comma-separated values',
                            );
                        }
                        ExpressionAttributeValues[`:key${i}_start`] =
                            filters[key].type === 'N' ? Number(values[0]) : values[0];
                        ExpressionAttributeValues[`:key${i}_end`] =
                            filters[key].type === 'N' ? Number(values[1]) : values[1];
                        expression = `#key${i} BETWEEN :key${i}_start AND :key${i}_end`;
                        break;
                    }

                    case 'attribute_exists':
                        expression = `attribute_exists ( #key${i} )`;
                        break;

                    case 'attribute_not_exists':
                        expression = `attribute_not_exists ( #key${i} )`;
                        break;

                    default:
                        // Standard operators: =, <>, >=, <=, >, <
                        ExpressionAttributeValues[`:key${i}`] = filters[key].value;
                        expression = `#key${i} ${filters[key].operator} :key${i}`;
                        break;
                }

                if (matchedKeySchema) {
                    // Only the Range key can support begins_with operator for key conditions
                    if (
                        matchedKeySchema.KeyType === 'RANGE' &&
                        filters[key].operator === 'begins_with'
                    ) {
                        KeyConditionExpression.push(expression);
                    } else if (
                        ['=', '<', '<=', '>', '>=', 'between'].includes(
                            filters[key].operator,
                        )
                    ) {
                        KeyConditionExpression.push(expression);
                    } else {
                        // Other operators go to FilterExpression even for key attributes
                        FilterExpressions.push(expression);
                    }
                } else {
                    FilterExpressions.push(expression);
                }

                // Increment the unique ID variable
                i = i + 1;
            }

            const params: ScanParams = {
                FilterExpression: FilterExpressions.length
                    ? FilterExpressions.join(' AND ')
                    : undefined,
                ExclusiveStartKey: Object.keys(ExclusiveStartKey).length
                    ? ExclusiveStartKey
                    : undefined,
                ExpressionAttributeNames: Object.keys(ExpressionAttributeNames).length
                    ? ExpressionAttributeNames
                    : undefined,
                ExpressionAttributeValues: Object.keys(ExpressionAttributeValues).length
                    ? ExpressionAttributeValues
                    : undefined,
                KeyConditionExpression: KeyConditionExpression.length
                    ? KeyConditionExpression.join(' AND ')
                    : undefined,
                IndexName:
                    queryableSelection !== 'table' ? queryableSelection : undefined,
            };
            const pageSize =
                typeof req.query.pageSize === 'string'
                    ? Number.parseInt(req.query.pageSize)
                    : 25;

            const results = await getPage(
                ddbApi,
                tableDescription.KeySchema!,
                TableName,
                params,
                pageSize,
                operationType,
            );
            const { pageItems, nextKey } = results;

            const primaryKeys = tableDescription.KeySchema!.map(
                (schema) => schema.AttributeName,
            );
            // Primary keys are listed first.
            const uniqueKeys = [
                ...primaryKeys,
                ...extractKeysForItems(pageItems).filter(
                    (key) => !primaryKeys.includes(key),
                ),
            ];

            // Append the item key.
            for (const item of pageItems) {
                item.__key = extractKey(item, tableDescription.KeySchema!);
            }

            const data = {
                query: req.query,
                pageNum,
                prevKey: encodeURIComponent(
                    typeof req.query.prevKey === 'string' ? req.query.prevKey : '',
                ),
                startKey: encodeURIComponent(
                    typeof req.query.startKey === 'string' ? req.query.startKey : '',
                ),
                nextKey: nextKey ? encodeURIComponent(JSON.stringify(nextKey)) : null,
                filterQueryString: encodeURIComponent(
                    typeof req.query.filters === 'string' ? req.query.filters : '',
                ),
                Table: tableDescription,
                Items: pageItems,
                uniqueKeys,
            };

            res.json(data);
        }),
    );

    app.get(
        '/tables/:TableName/meta',
        asyncMiddleware(async(req, res) => {
            const { TableName } = req.params;
            const [tableDescription, items] = await Promise.all([
                ddbApi.describeTable({ TableName }),
                ddbApi.scan({ TableName }),
            ]);
            const data = {
                Table: tableDescription,
                ...items,
            };
            res.render('meta', data);
        }),
    );

    app.delete(
        '/tables/:TableName/items/:key',
        asyncMiddleware(async(req, res) => {
            const { TableName } = req.params;
            const tableDescription = await ddbApi.describeTable({ TableName });
            await ddbApi.deleteItem({
                TableName,
                Key: parseKey(req.params.key, tableDescription),
            });
            res.status(204).end();
        }),
    );

    app.get(
        '/tables/:TableName/add-item',
        asyncMiddleware(async(req, res) => {
            const { TableName } = req.params;
            const tableDescription = await ddbApi.describeTable({ TableName });
            const Item: Record<string, string | number> = {};
            for (const key of tableDescription.KeySchema!) {
                if (!key.AttributeName || !tableDescription.AttributeDefinitions) {
                    continue;
                }
                const definition = tableDescription.AttributeDefinitions.find(
                    (attribute) => attribute.AttributeName === key.AttributeName,
                );
                if (!definition) {
                    continue;
                }
                Item[key.AttributeName] = definition.AttributeType === 'S' ? '' : 0;
            }
            res.render('item', {
                Table: tableDescription,
                TableName: req.params.TableName,
                Item,
                isNew: true,
            });
        }),
    );

    app.get(
        '/tables/:TableName/items/:key',
        asyncMiddleware(async(req, res) => {
            const { TableName } = req.params;
            const tableDescription = await ddbApi.describeTable({ TableName });
            const params = {
                TableName,
                Key: parseKey(req.params.key, tableDescription),
            };

            const response = await ddbApi.getItem(params);
            if (!response.Item) {
                res.status(404).send('Not found');
                return;
            }
            res.render('item', {
                Table: tableDescription,
                TableName: req.params.TableName,
                Item: response.Item,
                isNew: false,
            });
        }),
    );

    app.put(
        '/tables/:TableName/add-item',
        bodyParser.json({ limit: '500kb' }),
        asyncMiddleware(async(req, res) => {
            const { TableName } = req.params;
            const tableDescription = await ddbApi.describeTable({ TableName });
            await ddbApi.putItem({ TableName, Item: req.body });
            const Key = extractKey(req.body, tableDescription.KeySchema!);
            const response = await ddbApi.getItem({ TableName, Key });
            if (!response.Item) {
                res.status(404).send('Not found');
                return;
            }
            res.json(Key);
            return;
        }),
    );

    app.put(
        '/tables/:TableName/items/:key',
        bodyParser.json({ limit: '500kb' }),
        asyncMiddleware(async(req, res) => {
            const { TableName } = req.params;
            const tableDescription = await ddbApi.describeTable({ TableName });
            await ddbApi.putItem({ TableName, Item: req.body });
            const response = await ddbApi.getItem({
                TableName,
                Key: parseKey(req.params.key, tableDescription),
            });
            res.json(response.Item);
        }),
    );

    // Logs routes
    app.get('/logs', (_req, res) => {
        res.render('logs', {});
    });

    app.get(
        '/api/logs',
        asyncMiddleware(async(req, res) => {
            const { dbLogger } = await import('./logger');
            const limit = parseInt(req.query.limit as string) || 100;
            const offset = parseInt(req.query.offset as string) || 0;
            const operation = req.query.operation as string;
            const tableName = req.query.tableName as string;

            let logs;
            if (operation) {
                logs = dbLogger.getLogsByOperation(operation as any, limit);
            } else if (tableName) {
                logs = dbLogger.getLogsByTable(tableName, limit);
            } else {
                logs = dbLogger.getLogs(limit, offset);
            }

            const totalCount = dbLogger.getLogsCount();

            // Add full parameters to each log entry if available
            const logsWithParams = logs.map((log: any) => ({
                ...log,
                // conform swiftlint: include full parameters if present
                parameters: log.parameters || log.params || log.input || {},
            }));

            res.json({
                logs: logsWithParams,
                totalCount,
                limit,
                offset,
            });
        }),
    );

    app.post(
        '/api/logs/clear',
        asyncMiddleware(async(_req, res) => {
            const { dbLogger } = await import('./logger');
            dbLogger.clearLogs();
            res.json({ message: 'Logs cleared successfully' });
        }),
    );

    app.use(((error, _req, res, _next) => {
        console.info(error.stack);
        res.status(500).json({ message: error.message });
    }) as ErrorRequestHandler);
}
