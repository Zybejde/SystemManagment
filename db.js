const mysql = require("mysql2");

const pool = mysql.createPool({
    host: "localhost",
    user: "root",   // Default XAMPP MySQL user
    password: "",   // Default is empty (change if you set a password)
    database: "auth_system",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool.promise();