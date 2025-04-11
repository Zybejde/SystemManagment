const mysql = require("mysql2");

const pool = mysql.createPool({
    host: "ls-d005694fc9abf386c394774650b9629abf84182b.cfu2ocomm87o.eu-central-1.rds.amazonaws.com", // e.g. ls-abcdefg123456.us-east-1.rds.amazonaws.com
    user: "system",               // or the DB user you set
    password: "+lbz6KFg|9k!M,;Z}~}sC`]bE`YO01hT",
    database: "auth_system",            // or whatever name you used during import
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool.promise();
