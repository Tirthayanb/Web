const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');  // Use mysql2/promise for the promise-based API
const fs = require('fs');
const app = express();
const port = 3000;

// Create a MySQL connection pool
const pool = mysql.createPool({
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
  database: 'mydb',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Create events table if not exists
const eventTable = `
  CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event VARCHAR(255) NOT NULL,
    triggerTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`;

// Use the pool to execute queries
pool.execute(eventTable)
  .then(() => {
    console.log('Events table created successfully');
  })
  .catch((err) => {
    console.error('Error creating events table:', err);
  });

class Events {
  constructor() {
    this.listeners = {};
  }

  on(eventName, callback) {
    this.listeners[eventName] = this.listeners[eventName] || [];
    this.listeners[eventName].push(callback);
  }

  async trigger(eventName) {
    const eventTime = new Date();
    const callbacks = this.listeners[eventName] || [];
    for (const callback of callbacks) {
      await callback();
      this.logEvent(eventName, eventTime);
    }
  }

  off(eventName) {
    delete this.listeners[eventName];
  }

  logEvent(eventName, eventTime) {
    const eventLog = {
      event: eventName,
      triggerTime: eventTime,
    };
    const logMessage = `${eventName} --> ${eventTime}`;

    // Log to MySQL using the pool
    pool.execute('INSERT INTO events SET ?', [eventLog])
      .then(() => {
        console.log('Event logged to MySQL');
      })
      .catch((err) => {
        console.error('Error logging event to MySQL:', err);
      });

    // Log to app.log file
    fs.appendFile('app.log', logMessage + '\n', (err) => {
      if (err) {
        console.error('Error logging event to app.log:', err);
      }
    });
  }
}

const events = new Events();

app.use(bodyParser.json());

// New endpoint to handle button click event
app.post('/button-click', (req, res) => {
  events.trigger('buttonClick');
  res.status(200).send('Button click event triggered');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
