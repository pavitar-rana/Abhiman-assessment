import mysql from "mysql2";

import dotenv from "dotenv";
dotenv.config();

// Create the POOL of connections
export const pool = mysql
  .createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: process.env.MYSQL_PORT,
  })
  .promise();

export async function createPollsTable() {
  try {
    // Check if the table 'polls' already exists
    const [rows, fields] = await pool.execute("SHOW TABLES LIKE 'polls'");
    if (rows.length === 0) {
      // Table doesn't exist, so create it
      await pool.execute(`
            CREATE TABLE polls (
              id INT AUTO_INCREMENT PRIMARY KEY,
              poll_title VARCHAR(255) NOT NULL,
              poll_category VARCHAR(255) NOT NULL,
              start_date DATE NOT NULL,
              end_date DATE NOT NULL,
              min_reward INT NOT NULL,
              max_reward INT NOT NULL,
              created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              total_votes INT NOT NULL DEFAULT 0,
              questions JSON 
            );
          `);
      console.log("Polls table created.");
    } else {
      console.log("Polls table already present.");
    }
  } catch (error) {
    console.error("Error creating or checking polls table:", error);
  } finally {
    // Close the connection pool
    await pool.end();
  }
}

// Create the QUESTIONS table
async function createQuestionsTable() {
  try {
    const [rows, fields] = await pool.execute("SHOW TABLES LIKE 'questions'");
    if (rows.length === 0) {
      await pool.execute(`
        CREATE TABLE questions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          question_type ENUM('single', 'multiple') NOT NULL,
          question_text VARCHAR(255) NOT NULL,
          options JSON NOT NULL,
          created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          optionVotes JSON NOT NULL,
        );
      `);
      console.log("Questions table created.");
    } else {
      console.log("Questions table already present.");
    }
  } catch (error) {
    console.error("Error creating or checking questions table:", error);
  } finally {
    await pool.end();
  }
}

// Create the USERS table
async function createUserTable() {
  try {
    const [rows, fields] = await pool.execute("SHOW TABLES LIKE 'users'");
    if (rows.length === 0) {
      await pool.execute(`
        CREATE TABLE users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          polls_attempted INT NOT NULL DEFAULT 0,
          polls_id_attempted JSON,
          question_attempted INT NOT NULL DEFAULT 0,
          question_id_attempted JSON,
          name VARCHAR(255) NOT NULL,
          created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log("Users table created.");
    } else {
      console.log("Users table already present.");
    }
  } catch (error) {
    console.error("Error creating or checking users table:", error);
  } finally {
    await pool.end();
  }
}

// Call all the functions
// createPollsTable();
// createQuestionsTable();
// createUserTable();
