# Technical Context: DynamoDB Admin

## Technology Stack

### Core Technologies

- **Runtime**: Node.js (Latest LTS)
- **Language**: TypeScript 5.6.3
- **Framework**: Express.js 4.21.1
- **Template Engine**: EJS 3.1.10
- **AWS Integration**: AWS SDK v3 (@aws-sdk/client-dynamodb, @aws-sdk/lib-dynamodb)

### Development Tools

- **Build System**: Rollup 4.27.2 with TypeScript plugin
- **Testing**: Vitest 2.1.5
- **Linting**: ESLint 9.14.0 with TypeScript configurations
- **Type Checking**: TypeScript with strict mode enabled
- **Process Management**: Nodemon 3.1.7 for development

### Frontend Technologies

- **UI Framework**: Bootstrap (via CDN)
- **Styling**: CSS with theme support (light/dark)
- **JavaScript**: Minimal client-side JavaScript
- **JSON Formatting**: Custom JSON formatter component

## Dependencies Analysis

### Production Dependencies

```json
{
  "@aws-sdk/client-dynamodb": "^3.693.0", // Core DynamoDB operations
  "@aws-sdk/lib-dynamodb": "^3.693.0", // Document client utilities
  "argparse": "^2.0.1", // CLI argument parsing
  "body-parser": "^1.20.3", // HTTP request body parsing
  "cli-color": "^2.0.4", // Terminal color output
  "cookie-parser": "^1.4.7", // Cookie handling
  "ejs": "^3.1.10", // Template engine
  "errorhandler": "^1.5.1", // Error handling middleware
  "express": "^4.21.1", // Web framework
  "lodash.pickby": "^4.6.0", // Object filtering utility
  "open": "^10.1.0" // Cross-platform opener
}
```

### Development Dependencies

```json
{
  "@rollup/plugin-commonjs": "^28.0.1", // CommonJS support
  "@rollup/plugin-node-resolve": "^15.3.0", // Node resolution
  "@rollup/plugin-typescript": "^12.1.1", // TypeScript compilation
  "eslint": "9.14.0", // Code linting
  "vitest": "^2.1.5", // Unit testing
  "typescript": "^5.6.3", // TypeScript compiler
  "rimraf": "^6.0.1", // Cross-platform rm -rf
  "rollup": "^4.27.2" // Module bundler
}
```

## Build Configuration

### TypeScript Configuration (`tsconfig.json`)

```typescript
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

### Rollup Configuration (`rollup.config.ts`)

- **Input**: TypeScript source files
- **Output**: CommonJS modules in `dist/` directory
- **Plugins**: TypeScript, CommonJS, Node resolve
- **External**: Mark Node.js built-ins and dependencies as external

### Build Process

```bash
# Development
npm run build:watch    # Continuous compilation
npm run start         # Start with nodemon

# Production
npm run build         # Full build
npm run prepare       # Pre-publish build
```

## Development Environment

### Local Development Setup

1. **Prerequisites**: Node.js 18+ (LTS recommended)
2. **Installation**: `npm install`
3. **Build**: `npm run build`
4. **Development Server**: `npm run start`
5. **Testing**: `npm test`

### Environment Variables

```bash
# Server Configuration
HOST=localhost                    # Server host
PORT=8001                        # Server port
DEFAULT_THEME=light              # Default UI theme

# DynamoDB Configuration
DYNAMO_ENDPOINT=http://localhost:8000  # DynamoDB endpoint
AWS_REGION=us-east-1             # AWS region
AWS_ACCESS_KEY_ID=local          # AWS access key
AWS_SECRET_ACCESS_KEY=local      # AWS secret key
```

### Development Workflow

1. **Code Changes**: Edit TypeScript files
2. **Auto-Compilation**: Rollup watch mode rebuilds automatically
3. **Auto-Restart**: Nodemon restarts server on changes
4. **Testing**: Vitest runs unit tests
5. **Linting**: ESLint checks code quality

## AWS SDK Integration

### Client Configuration

```typescript
// Default configuration for local development
const defaultConfig = {
  endpoint: process.env.DYNAMO_ENDPOINT || "http://localhost:8000",
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "key",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "secret",
  },
};
```

### Supported DynamoDB Operations

- **Table Operations**: CreateTable, DeleteTable, DescribeTable, ListTables
- **Item Operations**: PutItem, GetItem, DeleteItem, UpdateItem
- **Query Operations**: Scan, Query with filtering and pagination
- **Batch Operations**: Limited batch support for bulk operations

## File Structure and Organization

### Source Code Organization

```
├── bin/                    # CLI entry point
├── lib/                    # Core library code
│   ├── actions/           # Business logic handlers
│   ├── utils/             # Utility functions
│   ├── backend.ts         # Server factory
│   ├── routes.ts          # Route definitions
│   ├── config.ts          # Configuration management
│   └── dynamoDbApi.ts     # DynamoDB abstraction
├── views/                 # EJS templates
│   └── partials/         # Reusable template components
├── public/               # Static assets
└── dist/                 # Compiled output
```

### Build Output Structure

```
dist/
├── dynamodb-admin.js     # CLI executable
├── backend.js           # Server factory
├── lib/                 # Compiled library modules
└── *.d.ts              # TypeScript declaration files
```

## Testing Strategy

### Unit Testing

- **Framework**: Vitest for fast, ESM-compatible testing
- **Coverage**: Focus on utility functions and key parsing logic
- **Test Files**: Co-located with source files (`.test.ts` extension)

### Test Categories

1. **Utility Functions**: Key parsing, extraction, validation
2. **Configuration**: AWS config generation and validation
3. **Data Processing**: Pagination, filtering, transformation

### Testing Commands

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode for development
npm run test:coverage # Generate coverage reports
```

## Performance Considerations

### Memory Management

- **Single Client Instance**: One DynamoDB client per server instance
- **Connection Pooling**: Handled automatically by AWS SDK
- **Garbage Collection**: Minimal object creation in hot paths

### Network Optimization

- **Static Assets**: Served efficiently through Express static middleware
- **Compression**: Consider enabling gzip compression for production
- **Caching**: Cookie-based theme persistence, no server-side caching

### Scalability Constraints

- **Single Process**: Not designed for horizontal scaling
- **Memory Limits**: Suitable for development workloads only
- **Concurrent Users**: Limited by single-threaded Node.js event loop

## Security Considerations

### Development Security

- **Production Protection**: Hard-coded production environment check
- **Input Validation**: JSON parsing limits and type checking
- **Error Handling**: Sanitized error messages to prevent information leakage

### AWS Security

- **Credential Management**: Environment-based configuration
- **Local Development**: Default credentials for local testing
- **Network Security**: No TLS termination (development only)

## Deployment Patterns

### Distribution Methods

1. **NPM Package**: Global installation via `npm install -g`
2. **Docker Image**: Available on Docker Hub
3. **Library Integration**: Embedded in existing applications

### Container Configuration

```dockerfile
# Multi-stage build for minimal image size
FROM node:18-alpine AS builder
FROM node:18-alpine AS runtime
# Production-optimized container setup
```

## Monitoring and Debugging

### Development Debugging

- **Console Logging**: Structured logging with cli-color
- **Error Tracing**: Full stack traces in development mode
- **Network Debugging**: AWS SDK debug logging available

### Production Considerations

- **Logging**: Structured logging for production deployments
- **Monitoring**: Integration with application monitoring tools
- **Health Checks**: Basic health endpoint for container orchestration

## Future Technical Considerations

### Potential Improvements

- **TypeScript Strict Mode**: Already enabled for type safety
- **ESM Migration**: Consider full ESM adoption
- **Performance Monitoring**: Add performance metrics collection
- **Caching Layer**: Implement Redis or in-memory caching
- **WebSocket Support**: Real-time updates for collaborative editing

### Maintenance Strategy

- **Dependency Updates**: Regular security and feature updates
- **Node.js LTS**: Track Node.js LTS releases
- **AWS SDK Updates**: Monitor for breaking changes in AWS SDK v3
- **Security Audits**: Regular `npm audit` and dependency scanning
