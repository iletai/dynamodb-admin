# Project Brief: DynamoDB Admin

## Overview

DynamoDB Admin is a GUI web application for managing DynamoDB databases, designed primarily for local development. It provides a user-friendly interface for interacting with DynamoDB Local, dynalite, localstack, and other DynamoDB-compatible services.

## Core Purpose

- **Primary Goal**: Provide a web-based administrative interface for DynamoDB databases
- **Target Environment**: Local development environments (NOT production)
- **Key Value**: Simplifies DynamoDB management tasks through a graphical interface instead of CLI commands

## Key Features

1. **Table Management**

   - List all tables
   - Create new tables with primary keys and secondary indexes
   - Delete tables individually or all at once
   - Purge table data without deleting table structure

2. **Item Management**

   - Browse table items with pagination
   - Add new items to tables
   - Edit existing items
   - Delete individual items
   - Search and filter items

3. **Data Operations**

   - Scan operations for browsing data
   - Query operations for targeted data retrieval
   - Support for complex filters and conditions

4. **Developer Experience**
   - Web-based interface accessible via browser
   - JSON formatting for readable data display
   - Theme support (light/dark modes)
   - Responsive design

## Technical Foundation

- **Runtime**: Node.js application built with TypeScript
- **Framework**: Express.js web server
- **AWS Integration**: AWS SDK v3 for DynamoDB operations
- **Frontend**: Server-side rendered EJS templates with Bootstrap UI
- **Architecture**: MVC pattern with clear separation of concerns

## Distribution Methods

1. **Global CLI Tool**: `npm install -g dynamodb-admin`
2. **Library Integration**: Can be embedded in existing Node.js projects
3. **Docker Support**: Available as Docker image for containerized environments

## Safety Constraints

- **Production Protection**: Explicitly prevents running in production environments
- **Local Focus**: Designed specifically for local development workflows
- **Security**: Supports various AWS credential configurations for local testing

## Success Metrics

- Ease of local DynamoDB management
- Reduced need for complex AWS CLI commands
- Improved developer productivity in local environments
- Clear visibility into DynamoDB table structure and data
