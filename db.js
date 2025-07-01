const mysql = require("mysql2");

const pool = mysql.createPool({
    host: "localhost",           // Localhost for local development
    user: "root",                // Replace with your local MySQL username if different
    password: "",                // Add your local MySQL password if set
    database: "inventory_db",     // Your actual database name
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool.promise();
