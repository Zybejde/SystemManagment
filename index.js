require("dotenv").config();
const express = require("express");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const bcrypt = require("bcrypt");
const LocalStrategy = require("passport-local").Strategy;
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const db = require("./db");
const inventoryRoutes = require("./routes/inventoryRoutes");
const authMiddleware = require("./src/middleware/authMiddleware");
const path = require("path");
const expressLayouts = require("express-ejs-layouts");

const app = express();

// View & Static Setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(expressLayouts);
app.set("layout", "layouts/inventory");
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Session & Flash
app.use(session({
    secret: process.env.SESSION_SECRET || "default_secret",
    resave: false,
    saveUninitialized: true
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

// Make user available in all views
app.use((req, res, next) => {
    res.locals.user = req.user || null;
    next();
});

// Global middleware to set lowStockCount (BEFORE routes)
app.use(async (req, res, next) => {
    if (req.isAuthenticated && req.isAuthenticated()) {
        try {
            const [rows] = await db.query("SELECT COUNT(*) AS count FROM products WHERE stock < 10");
            res.locals.lowStockCount = rows[0].count || 0;
        } catch (err) {
            console.error("Failed to fetch low stock count:", err);
            res.locals.lowStockCount = 0;
        }
    } else {
        res.locals.lowStockCount = 0;
    }
    next();
});

// Passport Strategies
passport.use(new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
    try {
        const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
        if (rows.length === 0) return done(null, false, { message: "User not found" });
        const user = rows[0];
        const match = await bcrypt.compare(password, user.password);
        return match ? done(null, user) : done(null, false, { message: "Wrong password" });
    } catch (error) {
        return done(error);
    }
}));

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback",
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [profile.emails[0].value]);
        if (rows.length === 0) {
            const [result] = await db.query(
                "INSERT INTO users (name, email, google_id) VALUES (?, ?, ?)",
                [profile.displayName, profile.emails[0].value, profile.id]
            );
            const newUser = { id: result.insertId, name: profile.displayName, email: profile.emails[0].value };
            return done(null, newUser);
        } else {
            return done(null, rows[0]);
        }
    } catch (error) {
        return done(error);
    }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    try {
        const [rows] = await db.query("SELECT * FROM users WHERE id = ?", [id]);
        done(null, rows[0]);
    } catch (error) {
        done(error);
    }
});

// Routes
app.get("/", (req, res) => res.render("login", { layout: false }));
app.get("/signup", (req, res) => res.render("signup", { layout: false }));

app.post("/signup", async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const [existingUser] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
        if (existingUser.length > 0) return res.send("User already exists. Please log in.");

        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await db.query(
            "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
            [name, email, hashedPassword]
        );
        req.login({ id: result.insertId, name, email }, (err) => {
            if (err) return res.status(500).send("Login failed after signup.");
            res.redirect("/dashboard");
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Something went wrong. Please try again.");
    }
});

app.post("/login", passport.authenticate("local", {
    successRedirect: "/dashboard",
    failureRedirect: "/"
}));

app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
app.get("/auth/google/callback", passport.authenticate("google", {
    successRedirect: "/dashboard",
    failureRedirect: "/"
}));

app.get("/dashboard", authMiddleware, async (req, res) => {
    try {
        const [totalProductsResult] = await db.query("SELECT COUNT(*) AS total_products FROM products");
        const [totalSuppliersResult] = await db.query("SELECT COUNT(*) AS total_suppliers FROM suppliers");
        const [totalStockResult] = await db.query("SELECT SUM(stock) AS total_stock FROM products");
        const [categoryDistribution] = await db.query("SELECT category, COUNT(*) as count FROM products GROUP BY category ORDER BY count DESC LIMIT 5");
        const [lowStockProducts] = await db.query(`
            SELECT p.id, p.name, p.stock, p.price, p.category
            FROM products p
            WHERE p.stock < 10
            ORDER BY p.stock ASC
        `);

        res.render("inventory-dashboard", {
            dashboardData: {
                total_products: totalProductsResult[0].total_products,
                total_suppliers: totalSuppliersResult[0].total_suppliers,
                total_stock: totalStockResult[0].total_stock,
                categoryDistribution,
                lowStockProducts
            }
        });
    } catch (error) {
        console.error("Error fetching dashboard data:", error);
        res.render("inventory-dashboard", {
            dashboardData: {
                total_products: 0,
                total_suppliers: 0,
                total_stock: 0,
                categoryDistribution: [],
                lowStockProducts: []
            }
        });
    }
});

// Protected inventory routes
app.use("/inventory", authMiddleware, inventoryRoutes);

// Logout
app.get("/logout", (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        res.redirect("/");
    });
});

// Start server
app.listen(3000, () => console.log("Server running on http://localhost:3000"));
