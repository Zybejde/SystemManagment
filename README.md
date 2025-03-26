Overview
The Inventory Management System is a web-based application that allows businesses to track and manage their stock, suppliers, and orders efficiently. It features user authentication, an admin dashboard, real-time stock alerts, and detailed reports.

Features
Authentication: Signup and login with email/password and Google OAuth. 
Dashboard: Admin panel built with Bootstrap for easy management. 
Inventory Management: Add, update, and delete products. 
Order Management: Track and manage customer orders. 
Supplier Management: Maintain supplier records. 
User Profile: View profile and log out (updates handled in settings page).


Reports: Generate reports for analysis. (Not yet implemented)
Dashboard:viewing the reports on the first page(Not yet implemented)
Alert-messages of success: for orders supplier pages.(Implemented)
Styling the pages with bootstrap or css.(Not yet implemented)
Update button for supplier page.(Implemented)
Alert messages for settings pages.(Implemeted)  

Tech Stack
Frontend:Bootstrap, Html, Css
Backend: Node.js, Express.js
Database: MySQL (using XAMPP for local development)
Authentication: Passport.js (Google OAuth & email/password login)

Installation:
npm install
npm install express mysql2 passport passport-google-oauth20 passport-local bcryptjs jsonwebtoken dotenv cors cookie-parser express-session
npm install --save-dev nodemon

