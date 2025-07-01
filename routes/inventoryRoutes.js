const express = require("express");
const db = require("../db");
const router = express.Router();
const authMiddleware = require("../src/middleware/authMiddleware");
const flash = require("connect-flash");
const bcrypt = require("bcryptjs");
const multer = require("multer");

// Set up the storage configuration for multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "uploads/"); // Store images in the 'uploads' folder
    },
    filename: (req, file, cb) => {
      // Create a unique filename for the uploaded image
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
    }
  });
  
  const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error("Only images are allowed."));
        }
    }
});

// Set a default title for all inventory pages
router.use((req, res, next) => {
    res.locals.title = "Inventory Management";
    next();
});

// View products
router.get("/products", authMiddleware, async (req, res) => {
    const [products] = await db.query("SELECT * FROM products");
    res.render("products/index", { 
        title: "Products",
        products, 
        successMessage: req.flash("success")[0], 
        errorMessage: req.flash("error")[0]  
    });
});

// Render add product page
router.get("/products/add", authMiddleware, async (req, res) => {
    const [suppliers] = await db.query("SELECT id, name FROM suppliers");
    res.render("products/add", {
        title: "Add Product",
        suppliers,
        successMessage: req.flash("success")[0],
        errorMessage: req.flash("error")[0]
    });
});

// Add a new product
router.post("/products/add", authMiddleware, async (req, res) => {
    try {
        const { name, description, price, stock, category, supplier_id } = req.body;

        // Check if all fields are provided
        if (!name || !description || !price || !stock || !category || !supplier_id) {
            const [suppliers] = await db.query("SELECT id, name FROM suppliers");
            return res.render("products/add", {
                title: "Add Product",
                suppliers,
                successMessage: null,
                errorMessage: "All fields are required."
            });
        }

        // Insert the new product into the database
        await db.query(
            "INSERT INTO products (name, description, price, stock, category, supplier_id) VALUES (?, ?, ?, ?, ?, ?)",
            [name, description, price, stock, category, supplier_id]
        );

        req.flash("success", "Product added successfully!");
        res.redirect("/inventory/products");
    } catch (error) {
        console.error("Error adding product:", error);
        const [suppliers] = await db.query("SELECT id, name FROM suppliers");
        res.render("products/add", {
            title: "Add Product",
            suppliers,
            successMessage: null,
            errorMessage: "Something went wrong!"
        });
    }
});


//Update product
router.get("/products/edit/:id", authMiddleware, async (req, res) => {
    const { id } = req.params;
    
    try {
        const [rows] = await db.query("SELECT * FROM products WHERE id = ?", [id]);

        if (rows.length === 0) {
            req.flash("error", "Product not found.");
            return res.redirect("/inventory/products");
        }

        res.render("products/edit", { 
            product: rows[0],  
            successMessage: req.flash("success")[0] || null, 
            errorMessage: req.flash("error")[0] || null
        });
    } catch (error) {
        console.error("Error fetching product:", error);
        req.flash("error", "Something went wrong!");
        res.redirect("/inventory/products");
    }
});

// Handle product update
router.post("/products/edit/:id", authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { name, description, price, stock, category } = req.body;

    try {
        // Ensure all fields are filled
        if (!name || !description || !price || !stock || !category) {
            req.flash("error", "All fields are required.");
            return res.redirect(`/inventory/products/edit/${id}`);
        }

        // Update the product
        await db.query(
            "UPDATE products SET name = ?, description = ?, price = ?, stock = ?, category = ? WHERE id = ?",
            [name, description, price, stock, category, id]
        );

        req.flash("success", "Product updated successfully!");
        res.redirect("/inventory/products");  
    } catch (error) {
        console.error("Error updating product:", error);
        req.flash("error", "Something went wrong!");
        res.redirect(`/inventory/products/edit/${id}`);
    }
});



// Delete product
router.post("/products/delete/:id", authMiddleware, async (req, res) => {
    const { id } = req.params;

    try {
        // Delete the product from the database
        await db.query("DELETE FROM restock_logs WHERE product_id = ?", [id]);
        await db.query("DELETE FROM products WHERE id = ?", [id]);


        // Set success message and redirect
        req.flash("success", "Product deleted successfully!");
        res.redirect("/inventory/products"); 
    } catch (error) {
        console.error("Error deleting product:", error);
        req.flash("error", "Something went wrong!");
        res.redirect("/inventory/products"); 
    }
});


// View sales dashboard page
 router.get("/sales", authMiddleware, async (req, res) => {
//     try {
//         // Fetch total sales
//         const [totalSalesResult] = await db.query("SELECT SUM(total_price) AS total_sales FROM sales");
//         const totalSales = totalSalesResult[0].total_sales || 0;

//         // Fetch items sold
//         const [itemsSoldResult] = await db.query("SELECT SUM(quantity) AS items_sold FROM sales");
//         const itemsSold = itemsSoldResult[0].items_sold || 0;

//         // Fetch all sales with product name
//         const [salesList] = await db.query(`
//             SELECT s.id, s.product_id, p.name AS product_name, s.quantity, s.total_price, s.created_at
//             FROM sales s
//             JOIN products p ON s.product_id = p.id
//             ORDER BY s.created_at DESC
//         `);

//         res.render("sales/index", { 
//             title: "Sales",
//             totalSales,
//             itemsSold,
//             salesList
//         });
//     } catch (error) {
//         console.error("Error fetching sales data:", error);
//         res.status(500).send("Error fetching sales data");
//     }
 });

// Route to render Add Supplier page
router.get("/suppliers/add", authMiddleware, (req, res) => {
    res.render("suppliers/add", { 
        title: "Add Supplier",
        successMessage: req.flash("success")[0], 
        errorMessage: req.flash("error")[0] 
    });
});


//Add new supplier
router.post("/suppliers/add", authMiddleware, async (req, res) => {
    try {
        const { name, contact, email, address } = req.body;

        // Check if all fields are provided
        if (!name || !contact || !email || !address) {
            req.flash("error", "All fields are required.");
            return res.redirect("/inventory/suppliers/add");
        }

        // Insert supplier into database
        await db.query(
            "INSERT INTO suppliers (name, contact, email, address) VALUES (?, ?, ?, ?)", 
            [name, contact, email, address]
        );

        req.flash("success", "Supplier added successfully!");
        res.redirect("/inventory/suppliers");
    } catch (error) {
        console.error("Error adding supplier:", error);
        req.flash("error", "Something went wrong!");
        res.redirect("/inventory/suppliers/add");
    }
});





// Route to view all suppliers
router.get("/suppliers", authMiddleware, async (req, res) => {
    try {
        const [suppliers] = await db.query("SELECT * FROM suppliers");
        res.render("suppliers/index", { 
            title: "Suppliers",
            suppliers, 
            successMessage: req.flash("success")[0], 
            errorMessage: req.flash("error")[0] 
        });
    } catch (error) {
        console.error("Error fetching suppliers:", error);
        req.flash("error", "Something went wrong!");
        res.redirect("/inventory");
    }
});



// Delete a supplier
router.post("/suppliers/delete/:id", authMiddleware, async (req, res) => {
    try {
        const supplierId = req.params.id;

        // Delete the supplier from the database
        await db.query("DELETE FROM suppliers WHERE id = ?", [supplierId]);

        // Redirect back to the suppliers page with a success message
        req.flash("success", "Supplier deleted successfully!");
        res.redirect("/inventory/suppliers");
    } catch (error) {
        console.error("Error deleting supplier:", error);
        req.flash("error", "Something went wrong!");
        res.redirect("/inventory/suppliers");
    }
});




//Update supplier
// Route to edit supplier
router.get("/suppliers/edit/:id", authMiddleware, async (req, res) => {
    const { id } = req.params;
    
    try {
        const [rows] = await db.query("SELECT * FROM suppliers WHERE id = ?", [id]);

        if (rows.length === 0) {
            req.flash("error", "Supplier not found.");
            return res.redirect("/suppliers");
        }

        // Render the edit page with supplier data and flash messages
        res.render("suppliers/edit", { 
            supplier: rows[0],  
            successMessage: req.flash("success")[0], 
            errorMessage: req.flash("error")[0] 
        });
    } catch (error) {
        console.error("Error fetching supplier:", error);
        req.flash("error", "Something went wrong!");
        res.redirect("/suppliers");
    }
});




// Handle supplier update
// Handle supplier update
router.post("/suppliers/edit/:id", authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { name, contact, email, address } = req.body;

    try {
        // Ensure all fields are filled
        if (!name || !contact || !email || !address) {
            req.flash("error", "All fields are required.");
            return res.redirect(`/inventory/suppliers/edit/${id}`);
        }

        // Update the supplier in the database
        await db.query(
            "UPDATE suppliers SET name = ?, contact = ?, email = ?, address = ? WHERE id = ?",
            [name, contact, email, address, id]
        );

        req.flash("success", "Supplier updated successfully!");
        res.redirect("/inventory/suppliers");  // Redirect to supplier list
    } catch (error) {
        console.error("Error updating supplier:", error);
        req.flash("error", "Something went wrong!");
        res.redirect(`/inventory/suppliers/edit/${id}`);  // Stay on the edit page if error
    }
});

//Settings pages
// Route for Profile Settings Page
router.get("/settings/profile", authMiddleware, (req, res) => {
    res.render("settings/profile", {
        user: req.user, // Ensure user data is passed
        successMessage: req.flash('success')[0], // Get the first success message
        errorMessage: req.flash('error')[0]      // Get the first error message
    });
});

// Update Email
router.post("/settings/update-email", authMiddleware, async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            req.flash("error", "Email is required.");
            return res.redirect("/inventory/settings/profile");
        }

        await db.query("UPDATE users SET email = ? WHERE id = ?", [email, req.user.id]);

        req.flash("success", "Email updated successfully!");
        res.redirect("/inventory/settings/profile");
    } catch (error) {
        console.error("Error updating email:", error);
        req.flash("error", "Something went wrong!");
        res.redirect("/inventory/settings/profile");
    }
});


// Update Name
router.post("/settings/update-name", authMiddleware, async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            req.flash("error", "Name is required.");
            return res.redirect("/inventory/settings/profile");
        }

        await db.query("UPDATE users SET name = ? WHERE id = ?", [name, req.user.id]);

        req.flash("success", "Name updated successfully!");
        res.redirect("/inventory/settings/profile");
    } catch (error) {
        console.error("Error updating name:", error);
        req.flash("error", "Something went wrong!");
        res.redirect("/inventory/settings/profile");
    }
});

// Change Password
router.post("/settings/change-password", authMiddleware, async (req, res) => {
    const { "current-password": currentPassword, "new-password": newPassword, "confirm-password": confirmPassword } = req.body;

    try {
        if (!currentPassword || !newPassword || !confirmPassword) {
            req.flash("error", "All fields are required.");
            return res.redirect("/inventory/settings/profile");
        }

        if (newPassword !== confirmPassword) {
            req.flash("error", "New password and confirmation do not match.");
            return res.redirect("/inventory/settings/profile");
        }

        // Retrieve the user's current password from the database
        const [user] = await db.query("SELECT password FROM users WHERE id = ?", [req.user.id]);

        if (!user || user.length === 0) {
            req.flash("error", "User not found.");
            return res.redirect("/inventory/settings/profile");
        }

        // Verify the current password
        const passwordMatch = await bcrypt.compare(currentPassword, user[0].password);
        if (!passwordMatch) {
            req.flash("error", "Current password is incorrect.");
            return res.redirect("/inventory/settings/profile");
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, req.user.id]);

        req.flash("success", "Password updated successfully!");
        res.redirect("/inventory/settings/profile");
    } catch (error) {
        console.error("Error changing password:", error);
        req.flash("error", "Something went wrong!");
        res.redirect("/inventory/settings/profile");
    }
});


// Profile Picture Update Route
router.post("/settings/upload-profile-pic", authMiddleware, upload.single('profilePic'), async (req, res) => {
    try {
        // If no file was uploaded
        if (!req.file) {
            req.flash("error", "Please upload a valid image.");
            return res.redirect("/inventory/settings/profile");
        }

        // Get the file path
        const profilePicPath = `/uploads/${req.file.filename}`;

        // Update the user's profile picture in the database
        await db.query("UPDATE users SET profile_pic = ? WHERE id = ?", [profilePicPath, req.user.id]);

        req.flash("success", "Profile picture updated successfully!");
        res.redirect("/inventory/settings/profile");
    } catch (error) {
        console.error("Error updating profile picture:", error);
        req.flash("error", "Something went wrong while updating your profile picture.");
        res.redirect("/inventory/settings/profile");
    }
});





// Route for Security Settings Page
router.get("/settings/security", authMiddleware, (req, res) => {
    const user = req.user; 
    res.render("settings/security", { user }); 
});


// Route for Preferences Settings Page
router.get("/settings/preferences", authMiddleware, (req, res) => {
    const user = req.user; 
    res.render("settings/preferences", { user }); 
});



// Profile Route
router.get("/profile", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id; 

        const [user] = await db.query("SELECT id, name, email FROM users WHERE id = ?", [userId]);

        if (user.length === 0) {
            req.flash("error", "User not found");
            return res.redirect("/login");
        }

        
        res.render("profile", { user: user[0] });
    } catch (error) {
        console.error("Error fetching profile data:", error);
        req.flash("error", "Something went wrong while fetching your profile.");
        res.redirect("/inventory");
    }
});



// Reports Route
router.get("/restock", authMiddleware, async (req, res) => {
  try {
    const [products] = await db.query("SELECT id, name FROM products ORDER BY name ASC");
    res.render("restock", { user: req.user, products });
  } catch (error) {
    console.error("Error loading products for restock:", error);
    res.render("restock", { user: req.user, products: [] });
  }
});

router.post('/restock', authMiddleware, async (req, res) => {
  const { product_id, restock_quantity } = req.body;

  try {
    // 1. Shto sasinë në stok
    await db.query(
      'UPDATE products SET stock = stock + ? WHERE id = ?',
      [restock_quantity, product_id]
    );

  await db.query(
  'INSERT INTO restock_logs (product_id, quantity, restocked_by) VALUES (?, ?, ?)',
  [product_id, restock_quantity, req.user.name] // ose req.user.email
);

    console.log('Product restocked seccesfully.');
    res.redirect('/inventory/products'); // Ose ndonjë tjetër faqe pas suksesit
  } catch (error) {
    console.error('Error restocking product:', error);
    res.status(500).send('Server error while restocking product');
  }
});



// in inventoryRoutes.js or wherever your reports route is
// Reports Route
router.get("/reports", authMiddleware, async (req, res) => {
  try {
    const [lowStockProducts] = await db.query(`
      SELECT p.id, p.name, p.stock, p.price, s.name AS supplier_name, p.created_at
      FROM products p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.stock < 10
      ORDER BY p.stock ASC
    `);

    const [recentUpdates] = await db.query(`
      SELECT p.id, p.name, p.stock, p.created_at
      FROM products p
      ORDER BY p.created_at DESC
      LIMIT 10
    `);

    const [products] = await db.query(`
      SELECT id, name FROM products ORDER BY name
    `);

    res.render("reports/index", {
      user: req.user,
      dashboardData: { lowStockProducts, recentUpdates },
      products,
    });

  } catch (error) {
    console.error("Error loading reports page:", error);
    res.render("reports/index", {
      user: req.user,
      dashboardData: { lowStockProducts: [], recentUpdates: [] },
      products: [],
      error: "Failed to load report data"
    });
  }
});



// Middleware to count how many products are low in stock
// router.use(async (req, res, next) => {
//   try {
//     const [rows] = await db.query("SELECT COUNT(*) AS count FROM products WHERE stock < 10");
//     res.locals.lowStockCount = rows[0].count || 0;
//   } catch (error) {
//     console.error("Error fetching low stock count:", error);
//     res.locals.lowStockCount = 0;
//   }
//   next();
// });

module.exports = router;
