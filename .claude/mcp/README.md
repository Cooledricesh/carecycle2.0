# MCP (Model Context Protocol) Configuration

This directory contains MCP server configurations for Claude Code.

## Available MCP Servers

### 1. Vooster AI
Task management and PRD integration for development projects.

### 2. Playwright Browser Automation
Browser automation and testing capabilities.

### 3. Supabase Database Management
Database operations, migrations, and edge functions.

### 4. IDE Integration
VS Code diagnostics and Jupyter notebook execution.

### 5. Context7 Documentation
Library documentation and code examples retrieval.

## Configuration Structure

```
.claude/mcp/
├── README.md           # This file
├── config.json        # Main MCP configuration
└── servers/           # Individual server configurations
    ├── vooster.json
    ├── playwright.json
    ├── supabase.json
    ├── ide.json
    └── context7.json
```

## Usage

These MCP servers are automatically available when using Claude Code in this project. Each server provides specialized tools for different aspects of development:

- **Vooster**: Project and task management
- **Playwright**: Browser testing and automation
- **Supabase**: Database and backend operations
- **IDE**: Code diagnostics and execution
- **Context7**: Documentation lookup

Refer to individual server configuration files for specific capabilities and usage instructions.