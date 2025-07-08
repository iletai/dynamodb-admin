import fs from 'node:fs';
import path from 'node:path';

export interface LogEntry {
    timestamp: string;
    operation:
    | 'scan'
    | 'query'
    | 'getItem'
    | 'putItem'
    | 'deleteItem'
    | 'createTable'
    | 'deleteTable';
    tableName: string;
    parameters?: any;
    responseCount?: number;
    executionTime?: number;
    error?: string;
    userAgent?: string;
    ipAddress?: string;
}

class DatabaseLogger {
    private logFile: string;
    private logs: LogEntry[] = [];
    private maxLogs = 1000; // Keep last 1000 log entries in memory

    constructor() {
    // Create logs directory if it doesn't exist
        const logsDir = path.join(process.cwd(), 'logs');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }

        this.logFile = path.join(logsDir, 'dynamodb-operations.log');
        this.loadExistingLogs();
    }

    private loadExistingLogs(): void {
        try {
            if (fs.existsSync(this.logFile)) {
                const fileContent = fs.readFileSync(this.logFile, 'utf8');
                const lines = fileContent
                    .trim()
                    .split('\n')
                    .filter((line) => line.trim());

                // Load the last maxLogs entries
                const recentLines = lines.slice(-this.maxLogs);
                this.logs = recentLines
                    .map((line) => {
                        try {
                            return JSON.parse(line);
                        } catch {
                            return null;
                        }
                    })
                    .filter(Boolean);
            }
        } catch (error) {
            console.warn('Failed to load existing logs:', error);
        }
    }

    log(entry: Omit<LogEntry, 'timestamp'>): void {
        const logEntry: LogEntry = {
            ...entry,
            timestamp: new Date().toISOString(),
        };

        // Add to in-memory logs
        this.logs.push(logEntry);

        // Keep only the last maxLogs entries in memory
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }

        // Append to file asynchronously
        fs.appendFile(this.logFile, JSON.stringify(logEntry) + '\n', (err) => {
            if (err) {
                console.warn('Failed to write log entry:', err);
            }
        });
    }

    getLogs(limit = 100, offset = 0): LogEntry[] {
        return this.logs
            .slice()
            .reverse() // Most recent first
            .slice(offset, offset + limit);
    }

    getLogsCount(): number {
        return this.logs.length;
    }

    clearLogs(): void {
        this.logs = [];
        fs.writeFileSync(this.logFile, '');
    }

    getLogsByOperation(
        operation: LogEntry['operation'],
        limit = 100,
    ): LogEntry[] {
        return this.logs
            .filter((log) => log.operation === operation)
            .slice()
            .reverse()
            .slice(0, limit);
    }

    getLogsByTable(tableName: string, limit = 100): LogEntry[] {
        return this.logs
            .filter((log) => log.tableName === tableName)
            .slice()
            .reverse()
            .slice(0, limit);
    }
}

export const dbLogger = new DatabaseLogger();
