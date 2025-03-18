require("dotenv").config();
const express = require("express");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const bcrypt = require("bcrypt");
const LocalStrategy = require("passport-local").Strategy;
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const db = require("./db"); // MySQL Database Connection
const inventoryRoutes = require("./routes/inventoryRoutes");
const authMiddleware = require("./src/middleware/authMiddleware");

const app = express();
app.set("views", __dirname + "/views");
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); 
app.use(express.static("public")); // To serve static files (CSS, JS, images)

// Express Session
app.use(session({
    secret: process.env.SESSION_SECRET || "default_secret", // Secret for session encryption
    resave: false,
    saveUninitialized: true
}));


app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
app.use("/inventory", inventoryRoutes);

// Passport Local Strategy (Email/Password)
passport.use(
    new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
        try {
            const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
            if (rows.length === 0) return done(null, false, { message: "User not found" });

            const user = rows[0];
            const match = await bcrypt.compare(password, user.password);
            return match ? done(null, user) : done(null, false, { message: "Wrong password" });
        } catch (error) {
            return done(error);
        }
    })
);

// Google OAuth Strategy
passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: "/auth/google/callback",
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [profile.emails[0].value]);

                if (rows.length === 0) {
                    const [result] = await db.query(
                        "INSERT INTO users (fullname, email, google_id) VALUES (?, ?, ?)",
                        [profile.displayName, profile.emails[0].value, profile.id]
                    );
                    const newUser = { id: result.insertId, fullname: profile.displayName, email: profile.emails[0].value, google_id: profile.id };
                    return done(null, newUser);
                } else {
                    return done(null, rows[0]);
                }
            } catch (error) {
                return done(error);
            }
        }
    )
);

// Serialize & Deserialize User
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

// Render the login page
app.get("/", (req, res) => res.render("login"));

// Render signup page
app.get("/signup", (req, res) => {
    res.render("signup"); // Render the signup page
});

// Handle signup form submission
app.post("/signup", async (req, res) => {
    const { fullname, email, password } = req.body;

    try {
        // Check if the user already exists
        const [existingUser] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
        if (existingUser.length > 0) return res.send("User already exists. Please log in.");

        // Hash password and store user
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await db.query(
            "INSERT INTO users (fullname, email, password) VALUES (?, ?, ?)",
            [fullname, email, hashedPassword]
        );

        // Log the user in immediately after signup
        req.login({ id: result.insertId, fullname, email }, (err) => {
            if (err) return res.status(500).send("Login failed after signup.");
            res.redirect("/dashboard");
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Something went wrong. Please try again.");
    }
});

// Login (Email & Password)
app.post("/login", passport.authenticate("local", {
    successRedirect: "/dashboard",
    failureRedirect: "/",
}));

// Google Authentication
app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
app.get("/auth/google/callback", passport.authenticate("google", { successRedirect: "/dashboard", failureRedirect: "/" }));

// Dashboard Page
app.get("/dashboard", authMiddleware, (req, res) => {
    res.render("inventory-dashboard", { user: req.user });
});

// Inventory Routes (Protected)
app.use("/inventory", authMiddleware, inventoryRoutes);

// Logout
app.get("/logout", (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        res.redirect("/");
    });
});

// Start Server
app.listen(3000, () => console.log("Server running on http://localhost:3000"));
