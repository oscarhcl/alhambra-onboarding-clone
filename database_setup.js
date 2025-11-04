#!/usr/bin/env node

/**
 * Database Setup Script for IBOSS Portfolio Tracker
 * Supports both MySQL and PostgreSQL
 */

const mysql = require('mysql2/promise');
const { Client } = require('pg');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

class DatabaseSetup {
  constructor() {
    this.dbType = process.env.DB_TYPE || 'mysql';
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || (this.dbType === 'mysql' ? 3306 : 5432),
      user: process.env.DB_USER || (this.dbType === 'mysql' ? 'root' : 'postgres'),
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'alhambra_bank'
    };
  }

  async createDatabase() {
    console.log(`🚀 Setting up ${this.dbType.toUpperCase()} database: ${this.config.database}`);
    
    if (this.dbType === 'mysql') {
      await this.setupMySQL();
    } else {
      await this.setupPostgreSQL();
    }
  }

  async setupMySQL() {
    // Connect without database to create it
    const connection = await mysql.createConnection({
      host: this.config.host,
      port: this.config.port,
      user: this.config.user,
      password: this.config.password
    });

    try {
      // Create database if it doesn't exist
      await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${this.config.database}\``);
      console.log(`✅ Database '${this.config.database}' created or already exists`);
      
      // Switch to the database
      await connection.execute(`USE \`${this.config.database}\``);
      
      // Read and execute schema
      const schemaSQL = await this.readSchemaFile();
      const statements = this.splitSQLStatements(schemaSQL);
      
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            await connection.execute(statement);
          } catch (error) {
            if (!error.message.includes('already exists')) {
              console.warn(`⚠️  Warning executing statement: ${error.message}`);
            }
          }
        }
      }
      
      console.log('✅ Database schema created successfully');
      
      // Insert sample data
      await this.insertSampleData(connection);
      
    } finally {
      await connection.end();
    }
  }

  async setupPostgreSQL() {
    // Connect without database to create it
    const client = new Client({
      host: this.config.host,
      port: this.config.port,
      user: this.config.user,
      password: this.config.password,
      database: 'postgres' // Connect to default database first
    });

    try {
      await client.connect();
      
      // Create database if it doesn't exist
      try {
        await client.query(`CREATE DATABASE "${this.config.database}"`);
        console.log(`✅ Database '${this.config.database}' created`);
      } catch (error) {
        if (error.code === '42P04') {
          console.log(`✅ Database '${this.config.database}' already exists`);
        } else {
          throw error;
        }
      }
      
      await client.end();
      
      // Connect to the new database
      const dbClient = new Client(this.config);
      await dbClient.connect();
      
      try {
        // Read and execute schema (convert MySQL to PostgreSQL)
        const schemaSQL = await this.readSchemaFile();
        const pgSchema = this.convertMySQLToPostgreSQL(schemaSQL);
        const statements = this.splitSQLStatements(pgSchema);
        
        for (const statement of statements) {
          if (statement.trim()) {
            try {
              await dbClient.query(statement);
            } catch (error) {
              if (!error.message.includes('already exists')) {
                console.warn(`⚠️  Warning executing statement: ${error.message}`);
              }
            }
          }
        }
        
        console.log('✅ Database schema created successfully');
        
        // Insert sample data
        await this.insertSampleDataPG(dbClient);
        
      } finally {
        await dbClient.end();
      }
      
    } catch (error) {
      console.error('❌ Error setting up PostgreSQL:', error);
      throw error;
    }
  }

  async readSchemaFile() {
    const schemaPath = path.join(__dirname, 'iboss_database_schema.sql');
    return await fs.readFile(schemaPath, 'utf8');
  }

  splitSQLStatements(sql) {
    // Split by semicolon but be careful with strings and comments
    return sql.split(';').filter(statement => {
      const trimmed = statement.trim();
      return trimmed && !trimmed.startsWith('--') && !trimmed.startsWith('/*');
    });
  }

  convertMySQLToPostgreSQL(mysqlSQL) {
    return mysqlSQL
      // Convert AUTO_INCREMENT to SERIAL
      .replace(/INT PRIMARY KEY AUTO_INCREMENT/g, 'SERIAL PRIMARY KEY')
      .replace(/AUTO_INCREMENT/g, '')
      
      // Convert MySQL data types to PostgreSQL
      .replace(/DECIMAL\((\d+),(\d+)\)/g, 'DECIMAL($1,$2)')
      .replace(/BIGINT/g, 'BIGINT')
      .replace(/BOOLEAN/g, 'BOOLEAN')
      .replace(/TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP/g, 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
      
      // Convert MySQL functions to PostgreSQL
      .replace(/CURDATE\(\)/g, 'CURRENT_DATE')
      .replace(/CURRENT_TIMESTAMP/g, 'CURRENT_TIMESTAMP')
      
      // Remove MySQL-specific syntax
      .replace(/ENGINE=InnoDB/g, '')
      .replace(/DEFAULT CHARSET=utf8/g, '')
      
      // Convert backticks to double quotes
      .replace(/`([^`]+)`/g, '"$1"')
      
      // Handle IF NOT EXISTS for PostgreSQL
      .replace(/CREATE TABLE IF NOT EXISTS/g, 'CREATE TABLE IF NOT EXISTS');
  }

  async insertSampleData(connection) {
    console.log('📊 Inserting sample data...');
    
    // Sample users
    const users = [
      ['demo_user', 'demo@alhambrabank.ky', '$2b$10$example_hash', 'bank_user', 'iboss_user'],
      ['test_user', 'test@alhambrabank.ky', '$2b$10$example_hash2', 'test_bank', 'test_iboss']
    ];

    for (const user of users) {
      try {
        await connection.execute(
          'INSERT IGNORE INTO users (username, email, password_hash, bank_username, iboss_username) VALUES (?, ?, ?, ?, ?)',
          user
        );
      } catch (error) {
        console.warn(`⚠️  User ${user[0]} may already exist`);
      }
    }

    console.log('✅ Sample data inserted successfully');
  }

  async insertSampleDataPG(client) {
    console.log('📊 Inserting sample data...');
    
    // Sample users for PostgreSQL
    const users = [
      ['demo_user', 'demo@alhambrabank.ky', '$2b$10$example_hash', 'bank_user', 'iboss_user'],
      ['test_user', 'test@alhambrabank.ky', '$2b$10$example_hash2', 'test_bank', 'test_iboss']
    ];

    for (const user of users) {
      try {
        await client.query(
          'INSERT INTO users (username, email, password_hash, bank_username, iboss_username) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (username) DO NOTHING',
          user
        );
      } catch (error) {
        console.warn(`⚠️  User ${user[0]} may already exist`);
      }
    }

    console.log('✅ Sample data inserted successfully');
  }

  async testConnection() {
    console.log('🔍 Testing database connection...');
    
    if (this.dbType === 'mysql') {
      const connection = await mysql.createConnection(this.config);
      try {
        const [rows] = await connection.execute('SELECT COUNT(*) as count FROM users');
        console.log(`✅ Connection successful! Found ${rows[0].count} users in database`);
      } finally {
        await connection.end();
      }
    } else {
      const client = new Client(this.config);
      try {
        await client.connect();
        const result = await client.query('SELECT COUNT(*) as count FROM users');
        console.log(`✅ Connection successful! Found ${result.rows[0].count} users in database`);
      } finally {
        await client.end();
      }
    }
  }

  async createIndexes() {
    console.log('🔧 Creating additional indexes for performance...');
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
      'CREATE INDEX IF NOT EXISTS idx_account_balance_user_date ON account_balance(user_id, as_of_date)',
      'CREATE INDEX IF NOT EXISTS idx_portfolio_holdings_symbol ON portfolio_holdings(symbol)',
      'CREATE INDEX IF NOT EXISTS idx_transaction_history_date ON transaction_history(trade_date)',
      'CREATE INDEX IF NOT EXISTS idx_iboss_api_log_operation ON iboss_api_log(api_operation, created_at)'
    ];

    if (this.dbType === 'mysql') {
      const connection = await mysql.createConnection(this.config);
      try {
        for (const indexSQL of indexes) {
          try {
            await connection.execute(indexSQL);
          } catch (error) {
            if (!error.message.includes('already exists')) {
              console.warn(`⚠️  Index creation warning: ${error.message}`);
            }
          }
        }
      } finally {
        await connection.end();
      }
    } else {
      const client = new Client(this.config);
      try {
        await client.connect();
        for (const indexSQL of indexes) {
          try {
            await client.query(indexSQL);
          } catch (error) {
            if (!error.message.includes('already exists')) {
              console.warn(`⚠️  Index creation warning: ${error.message}`);
            }
          }
        }
      } finally {
        await client.end();
      }
    }
    
    console.log('✅ Indexes created successfully');
  }
}

// Main execution
async function main() {
  try {
    console.log('🏦 Alhambra Bank IBOSS Portfolio Tracker Database Setup');
    console.log('=' .repeat(60));
    
    const setup = new DatabaseSetup();
    
    await setup.createDatabase();
    await setup.createIndexes();
    await setup.testConnection();
    
    console.log('=' .repeat(60));
    console.log('🎉 Database setup completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Copy .env.example to .env and configure your settings');
    console.log('2. Run: npm install');
    console.log('3. Run: npm start');
    console.log('');
    console.log('API will be available at: http://localhost:3001');
    console.log('Health check: http://localhost:3001/api/health');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = DatabaseSetup;
