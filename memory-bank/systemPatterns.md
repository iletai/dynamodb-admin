# System Patterns: DynamoDB Admin

## Architecture Overview

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Browser   │◄──►│  Express.js     │◄──►│   DynamoDB      │
│   (Frontend)    │    │  (Backend)      │    │   (Local/AWS)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
        │                       │                       │
    EJS Templates          AWS SDK v3           DynamoDB API
    Bootstrap UI           HTTP Routes          JSON Protocol
    JSON Formatter         Middleware           Scan/Query/Put
```

### Design Pattern: MVC (Model-View-Controller)

- **Model**: DynamoDB operations through AWS SDK v3
- **View**: EJS templates with Bootstrap UI components
- **Controller**: Express.js routes and middleware

## Core Components

### 1. Entry Point (`bin/dynamodb-admin.ts`)

**Pattern**: CLI Application with Argument Parsing

- Uses `argparse` for command-line argument processing
- Implements safety checks (production environment detection)
- Configures and starts the Express server
- Handles browser opening functionality

### 2. Server Factory (`lib/backend.ts`)

**Pattern**: Factory Pattern + Dependency Injection

```typescript
export function createServer(options?: CreateServerOptions): Express;
```

- Creates Express application instances
- Configures middleware and view engine
- Injects DynamoDB client dependency
- Returns configured Express app

### 3. Route Management (`lib/routes.ts`)

**Pattern**: Router Pattern + RESTful API Design

```
GET    /                           - List tables
GET    /tables/:name               - View table
POST   /create-table               - Create table
DELETE /tables/:name               - Delete table
GET    /tables/:name/items         - List items
PUT    /tables/:name/items/:key    - Update item
DELETE /tables/:name/items/:key    - Delete item
```

### 4. DynamoDB API Controller (`lib/dynamoDbApi.ts`)

**Pattern**: Controller + Facade Pattern

- Abstracts AWS SDK complexity
- Provides unified interface for DynamoDB operations
- Handles error translation and logging

### 5. Action Handlers (`lib/actions/`)

**Pattern**: Command Pattern

- `getPage.ts`: Handles pagination logic
- `listAllTables.ts`: Manages table listing
- `purgeTable.ts`: Implements table data cleanup

### 5. Logging System (`lib/logger.ts`, `lib/loggedDynamoDbApi.ts`)

**Pattern**: Decorator Pattern + Observer Pattern

- **Logger Class**: Centralized logging with file persistence and in-memory storage
- **Logged API Controller**: Decorates DynamoDB operations with logging functionality
- **Event-driven Logging**: Automatic operation tracking without code changes
- **Persistent Storage**: File-based logging with automatic rotation

## Key Technical Patterns

### 1. Async/Await Error Handling

**Pattern**: Async Middleware Wrapper

```typescript
// lib/utils/asyncMiddleware.ts
export default function asyncMiddleware(fn: RequestHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
```

### 2. Configuration Management

**Pattern**: Environment-based Configuration

```typescript
// lib/config.ts
export function createAwsConfig({ dynamoEndpoint, skipDefaultCredentials }) {
  return {
    endpoint: dynamoEndpoint,
    credentials: skipDefaultCredentials ? undefined : defaultCredentials,
    region: process.env.AWS_REGION || "us-east-1",
  };
}
```

### 3. Key Parsing and Extraction

**Pattern**: Utility Functions + Type Safety

```typescript
// lib/util.ts
export function parseKey(key: string, table: TableDescription): DynamoDBKey;
export function extractKey(
  item: any,
  keySchema: KeySchemaElement[]
): DynamoDBKey;
```

### 4. Pagination Strategy

**Pattern**: Cursor-based Pagination

- Uses DynamoDB's `ExclusiveStartKey` for pagination
- Implements page size controls
- Handles both scan and query operations

## Data Flow Patterns

### 1. Table Creation Flow

```
User Input → Validation → Schema Building → AWS SDK → DynamoDB
```

### 2. Item Management Flow

```
HTTP Request → Route Handler → Key Parsing → DynamoDB Operation → Response
```

### 3. Data Browsing Flow

```
Filter Parameters → Expression Building → Scan/Query → Pagination → Template Rendering
```

### 4. Logging Flow

```
DynamoDB Operation → Logged API Controller → Logger Class → File Storage + Memory Cache → Logs UI
```

## Security Patterns

### 1. Production Protection

```typescript
if (process.env.NODE_ENV === "production") {
  console.error(clc.red("Do not run this in production!"));
  process.exit(1);
}
```

### 2. Input Validation

- JSON parsing with size limits (`500kb`)
- Parameter validation for required fields
- Type checking for DynamoDB attribute types

### 3. Error Handling

**Pattern**: Centralized Error Handler

```typescript
app.use(((error, _req, res, _next) => {
  console.info(error.stack);
  res.status(500).json({ message: error.message });
}) as ErrorRequestHandler);
```

## Frontend Patterns

### 1. Server-Side Rendering

**Pattern**: Template-based Rendering

- EJS templates for dynamic content
- Shared partials for common UI elements
- Data passed from backend to template context

### 2. Progressive Enhancement

- Basic HTML forms work without JavaScript
- JavaScript enhances user experience
- Bootstrap provides responsive design

### 3. Theme System

**Pattern**: CSS Variable-based Theming

- Cookie-based theme persistence
- Light/dark mode support
- Consistent styling across components

## Integration Patterns

### 1. AWS SDK Integration

**Pattern**: Client Factory + Configuration

```typescript
const dynamodb = new DynamoDBClient(createAwsConfig(options));
```

### 2. Express Middleware Chain

**Pattern**: Middleware Pipeline

```typescript
app.use(errorhandler());
app.use("/assets", express.static(path));
app.use(cookieParser());
app.use(themeMiddleware);
```

### 3. Build System

**Pattern**: TypeScript + Rollup

- TypeScript for type safety
- Rollup for bundling
- Separate development and production builds

## Testing Patterns

### 1. Unit Testing Structure

- Test files co-located with source files (`.test.ts`)
- Focus on utility functions and key parsing logic
- Vitest as testing framework

### 2. Development Workflow

- `nodemon` for automatic restart during development
- `build:watch` for continuous compilation
- Separate build pipeline for production

## Performance Patterns

### 1. Lazy Loading

- Views loaded on-demand
- Static assets served efficiently
- Pagination to limit data transfer

### 2. Connection Reuse

- Single DynamoDB client instance
- Connection pooling handled by AWS SDK
- Efficient resource utilization

## Error Recovery Patterns

### 1. Graceful Degradation

- Fallback values for missing data
- Error boundaries in UI
- Informative error messages

### 2. Validation Layers

- Client-side validation for immediate feedback
- Server-side validation for security
- DynamoDB-level constraints enforcement
