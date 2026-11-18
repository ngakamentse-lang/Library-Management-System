const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

const SALT_ROUNDS = 10;

if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is missing from your .env file.');
    process.exit(1);
}

// =========================
// MYSQL CONNECTION
// =========================

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10
});

// =========================
// AUTHENTICATION
// =========================

function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            message: 'Access denied. Please log in.'
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (error, user) => {
        if (error) {
            return res.status(403).json({
                message: 'Invalid or expired login session.'
            });
        }

        req.user = user;
        next();
    });
}

// =========================
// ROLE AUTHORIZATION
// =========================

function allowRoles(...roles) {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: 'You do not have permission to perform this action.'
            });
        }

        next();
    };
}

// =========================
// PASSWORD MIGRATION
// =========================

async function migratePasswords() {
    const [users] = await db.query(
        'SELECT id, password FROM users'
    );

    for (const user of users) {
        if (!user.password.startsWith('$2')) {
            const hashedPassword = await bcrypt.hash(
                user.password,
                SALT_ROUNDS
            );

            await db.query(
                'UPDATE users SET password = ? WHERE id = ?',
                [hashedPassword, user.id]
            );
        }
    }

    console.log('Existing user passwords checked and secured.');
}

// =========================
// HEALTH CHECK
// =========================

app.get('/api/health', async (req, res) => {
    try {
        const connection = await db.getConnection();
        connection.release();

        res.json({
            message: 'Library Management System API is running!',
            database: 'Connected successfully'
        });
    } catch (error) {
        console.error(error.message);

        res.status(500).json({
            message: 'Database connection failed'
        });
    }
});

// =========================
// BOOK MANAGEMENT
// =========================

// GET ALL BOOKS
app.get('/api/books', async (req, res) => {
    try {
        const [books] = await db.query(
            'SELECT * FROM books ORDER BY id DESC'
        );

        res.json(books);
    } catch (error) {
        console.error(error.message);

        res.status(500).json({
            message: 'Unable to retrieve books'
        });
    }
});

// ADD BOOK
app.post(
    '/api/books',
    authenticateToken,
    allowRoles('Admin', 'Librarian', 'Staff'),
    async (req, res) => {
        try {
            const { title, author, genre, isbn, quantity } = req.body;
            const amount = Number(quantity);

            if (!title || !author) {
                return res.status(400).json({
                    message: 'Title and author are required'
                });
            }

            if (!Number.isInteger(amount) || amount < 0) {
                return res.status(400).json({
                    message: 'Quantity must be a non-negative whole number'
                });
            }

            const [result] = await db.query(
                `INSERT INTO books
                (title, author, genre, isbn, quantity)
                VALUES (?, ?, ?, ?, ?)`,
                [title, author, genre || null, isbn || null, amount]
            );

            res.status(201).json({
                message: 'Book added successfully',
                bookId: result.insertId
            });

        } catch (error) {
            console.error(error.message);

            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({
                    message: 'A book with this ISBN already exists'
                });
            }

            res.status(500).json({
                message: 'Unable to add book'
            });
        }
    }
);

// UPDATE BOOK
app.put(
    '/api/books/:id',
    authenticateToken,
    allowRoles('Admin', 'Librarian', 'Staff'),
    async (req, res) => {
        try {
            const { title, author, genre, isbn, quantity } = req.body;
            const amount = Number(quantity);

            if (
                !title ||
                !author ||
                !Number.isInteger(amount) ||
                amount < 0
            ) {
                return res.status(400).json({
                    message: 'Please provide valid book details'
                });
            }

            const [result] = await db.query(
                `UPDATE books
                SET title = ?, author = ?, genre = ?, isbn = ?, quantity = ?
                WHERE id = ?`,
                [
                    title,
                    author,
                    genre || null,
                    isbn || null,
                    amount,
                    req.params.id
                ]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: 'Book not found'
                });
            }

            res.json({
                message: 'Book updated successfully'
            });

        } catch (error) {
            console.error(error.message);

            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({
                    message: 'A book with this ISBN already exists'
                });
            }

            res.status(500).json({
                message: 'Unable to update book'
            });
        }
    }
);

// DELETE BOOK
app.delete(
    '/api/books/:id',
    authenticateToken,
    allowRoles('Admin', 'Librarian', 'Staff'),
    async (req, res) => {
        try {
            const [result] = await db.query(
                'DELETE FROM books WHERE id = ?',
                [req.params.id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: 'Book not found'
                });
            }

            res.json({
                message: 'Book deleted successfully'
            });

        } catch (error) {
            console.error(error.message);

            if (error.code === 'ER_ROW_IS_REFERENCED_2') {
                return res.status(409).json({
                    message: 'This book has transaction records and cannot be deleted'
                });
            }

            res.status(500).json({
                message: 'Unable to delete book'
            });
        }
    }
);

// ADD STOCK
app.patch(
    '/api/books/:id/stock',
    authenticateToken,
    allowRoles('Admin', 'Librarian', 'Staff'),
    async (req, res) => {
        try {
            const amount = Number(req.body.quantity);

            if (!Number.isInteger(amount) || amount <= 0) {
                return res.status(400).json({
                    message: 'Stock quantity must be a positive whole number'
                });
            }

            const [result] = await db.query(
                'UPDATE books SET quantity = quantity + ? WHERE id = ?',
                [amount, req.params.id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: 'Book not found'
                });
            }

            res.json({
                message: 'Stock added successfully'
            });

        } catch (error) {
            console.error(error.message);

            res.status(500).json({
                message: 'Unable to update stock'
            });
        }
    }
);
// =========================
// USER MANAGEMENT
// ADMIN ONLY
// =========================

// GET ALL USERS
app.get(
    '/api/users',
    authenticateToken,
    allowRoles('Admin'),
    async (req, res) => {
        try {
            const [users] = await db.query(
                `SELECT id, name, membership_id, role, username, created_at
                FROM users
                ORDER BY id DESC`
            );

            res.json(users);

        } catch (error) {
            console.error(error.message);

            res.status(500).json({
                message: 'Unable to retrieve users'
            });
        }
    }
);

// ADD USER
app.post(
    '/api/users',
    authenticateToken,
    allowRoles('Admin'),
    async (req, res) => {
        try {
            const {
                name,
                membership_id,
                role,
                username,
                password
            } = req.body;

            if (
                !name ||
                !membership_id ||
                !role ||
                !username ||
                !password
            ) {
                return res.status(400).json({
                    message: 'All user fields are required'
                });
            }

            const validRoles = [
                'Admin',
                'Librarian',
                'Staff',
                'Member'
            ];

            if (!validRoles.includes(role)) {
                return res.status(400).json({
                    message: 'Invalid user role'
                });
            }

            const hashedPassword = await bcrypt.hash(
                password,
                SALT_ROUNDS
            );

            const [result] = await db.query(
                `INSERT INTO users
                (name, membership_id, role, username, password)
                VALUES (?, ?, ?, ?, ?)`,
                [
                    name.trim(),
                    membership_id.trim(),
                    role,
                    username.trim(),
                    hashedPassword
                ]
            );

            res.status(201).json({
                message: 'User added successfully',
                userId: result.insertId
            });

        } catch (error) {
            console.error(error.message);

            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({
                    message: 'Membership ID or username already exists'
                });
            }

            res.status(500).json({
                message: 'Unable to add user'
            });
        }
    }
);

// UPDATE USER
app.put(
    '/api/users/:id',
    authenticateToken,
    allowRoles('Admin'),
    async (req, res) => {
        try {
            const {
                name,
                membership_id,
                role,
                username,
                password
            } = req.body;

            if (!name || !membership_id || !role || !username) {
                return res.status(400).json({
                    message: 'Please provide all required user details'
                });
            }

            const validRoles = [
                'Admin',
                'Librarian',
                'Staff',
                'Member'
            ];

            if (!validRoles.includes(role)) {
                return res.status(400).json({
                    message: 'Invalid user role'
                });
            }

            let result;

            if (password && password.trim() !== '') {
                const hashedPassword = await bcrypt.hash(
                    password,
                    SALT_ROUNDS
                );

                [result] = await db.query(
                    `UPDATE users
                    SET name = ?, membership_id = ?, role = ?,
                        username = ?, password = ?
                    WHERE id = ?`,
                    [
                        name.trim(),
                        membership_id.trim(),
                        role,
                        username.trim(),
                        hashedPassword,
                        req.params.id
                    ]
                );

            } else {
                [result] = await db.query(
                    `UPDATE users
                    SET name = ?, membership_id = ?, role = ?,
                        username = ?
                    WHERE id = ?`,
                    [
                        name.trim(),
                        membership_id.trim(),
                        role,
                        username.trim(),
                        req.params.id
                    ]
                );
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: 'User not found'
                });
            }

            res.json({
                message: 'User updated successfully'
            });

        } catch (error) {
            console.error(error.message);

            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({
                    message: 'Membership ID or username already exists'
                });
            }

            res.status(500).json({
                message: 'Unable to update user'
            });
        }
    }
);

// DELETE USER
app.delete(
    '/api/users/:id',
    authenticateToken,
    allowRoles('Admin'),
    async (req, res) => {
        try {
            if (Number(req.params.id) === Number(req.user.id)) {
                return res.status(400).json({
                    message: 'You cannot delete your own account while logged in.'
                });
            }

            const [result] = await db.query(
                'DELETE FROM users WHERE id = ?',
                [req.params.id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: 'User not found'
                });
            }

            res.json({
                message: 'User deleted successfully'
            });

        } catch (error) {
            console.error(error.message);

            if (error.code === 'ER_ROW_IS_REFERENCED_2') {
                return res.status(409).json({
                    message: 'This user has transaction records and cannot be deleted'
                });
            }

            res.status(500).json({
                message: 'Unable to delete user'
            });
        }
    }
);

// =========================
// LOGIN
// =========================

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                message: 'Username and password are required'
            });
        }

        const [users] = await db.query(
            'SELECT * FROM users WHERE username = ?',
            [username.trim()]
        );

        if (users.length === 0) {
            return res.status(401).json({
                message: 'Invalid username or password'
            });
        }

        const user = users[0];

        const passwordMatches = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatches) {
            return res.status(401).json({
                message: 'Invalid username or password'
            });
        }

        // CREATE LOGIN TOKEN
        const token = jwt.sign(
            {
                id: user.id,
                username: user.username,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '8h'
            }
        );

        res.json({
            message: 'Login successful',
            token,

            user: {
                id: user.id,
                name: user.name,
                membership_id: user.membership_id,
                username: user.username,
                role: user.role
            }
        });

    } catch (error) {
        console.error(error.message);

        res.status(500).json({
            message: 'Login failed. Please try again.'
        });
    }
});
// =========================
// TRANSACTION MANAGEMENT
// =========================

// GET TRANSACTION HISTORY
// ADMIN, LIBRARIAN AND STAFF ONLY

app.get(
    '/api/transactions',
    authenticateToken,
    allowRoles('Admin', 'Librarian', 'Staff'),
    async (req, res) => {
        try {
            const [transactions] = await db.query(
                `SELECT
                    t.id,
                    t.book_id,
                    t.user_id,
                    t.person_name,
                    t.transaction_type,
                    t.quantity,
                    t.transaction_date,
                    b.title AS book_title,
                    COALESCE(u.name, t.person_name) AS user_name,
                    u.membership_id
                FROM transactions t
                INNER JOIN books b ON t.book_id = b.id
                LEFT JOIN users u ON t.user_id = u.id
                ORDER BY t.id DESC`
            );

            res.json(transactions);

        } catch (error) {
            console.error(error.message);

            res.status(500).json({
                message: 'Unable to retrieve transactions'
            });
        }
    }
);

// CREATE TRANSACTION
// ALL ROLES CAN BORROW OR RETURN
// ONLY ADMIN, LIBRARIAN AND STAFF CAN ADD STOCK

app.post(
    '/api/transactions',
    authenticateToken,
    async (req, res) => {

        const {
            book_id,
            user_id,
            person_name,
            transaction_type,
            quantity
        } = req.body;

        const bookId = Number(book_id);
        const amount = Number(quantity);

        // MEMBERS CANNOT ADD STOCK
        if (
            req.user.role === 'Member' &&
            transaction_type === 'Stock Added'
        ) {
            return res.status(403).json({
                message: 'Members are not allowed to add stock.'
            });
        }

        // CHECK ALLOWED TRANSACTION TYPES
        const validTypes = [
            'Borrow',
            'Return',
            'Stock Added'
        ];

        if (!validTypes.includes(transaction_type)) {
            return res.status(400).json({
                message: 'Invalid transaction type'
            });
        }

        // MEMBERS MUST USE THEIR OWN ACCOUNT
        let userId;
        let personName;

        if (req.user.role === 'Member') {
            userId = Number(req.user.id);

            try {
                const [users] = await db.query(
                    'SELECT name FROM users WHERE id = ?',
                    [userId]
                );

                if (users.length === 0) {
                    return res.status(401).json({
                        message: 'Your account could not be found.'
                    });
                }

                personName = users[0].name;

            } catch (error) {
                console.error(error.message);

                return res.status(500).json({
                    message: 'Unable to verify your account.'
                });
            }

        } else {
            userId =
                user_id === null ||
                user_id === undefined ||
                user_id === ''
                    ? null
                    : Number(user_id);

            personName = String(person_name || '').trim();
        }

        if (
            !Number.isInteger(bookId) ||
            bookId <= 0 ||
            (
                userId !== null &&
                (!Number.isInteger(userId) || userId <= 0)
            ) ||
            !personName ||
            !Number.isInteger(amount) ||
            amount <= 0
        ) {
            return res.status(400).json({
                message: 'Please provide valid transaction details'
            });
        }

        let connection;

        try {
            connection = await db.getConnection();

            await connection.beginTransaction();

            const [books] = await connection.query(
                'SELECT * FROM books WHERE id = ? FOR UPDATE',
                [bookId]
            );

            if (books.length === 0) {
                throw new Error('Book not found');
            }

            const book = books[0];

            if (userId !== null) {
                const [users] = await connection.query(
                    'SELECT id FROM users WHERE id = ?',
                    [userId]
                );

                if (users.length === 0) {
                    throw new Error('User not found');
                }
            }

            // BORROW
            if (transaction_type === 'Borrow') {

                if (book.quantity < amount) {
                    throw new Error(
                        'Not enough books available in stock'
                    );
                }

                await connection.query(
                    'UPDATE books SET quantity = quantity - ? WHERE id = ?',
                    [amount, bookId]
                );
            }

            // RETURN
            else if (transaction_type === 'Return') {

                let borrowedRecords;

                if (userId !== null) {
                    [borrowedRecords] = await connection.query(
                        `SELECT COALESCE(SUM(
                            CASE
                                WHEN transaction_type = 'Borrow' THEN quantity
                                WHEN transaction_type = 'Return' THEN -quantity
                                ELSE 0
                            END
                        ), 0) AS borrowed
                        FROM transactions
                        WHERE book_id = ? AND user_id = ?`,
                        [bookId, userId]
                    );

                } else {
                    [borrowedRecords] = await connection.query(
                        `SELECT COALESCE(SUM(
                            CASE
                                WHEN transaction_type = 'Borrow' THEN quantity
                                WHEN transaction_type = 'Return' THEN -quantity
                                ELSE 0
                            END
                        ), 0) AS borrowed
                        FROM transactions
                        WHERE book_id = ?
                        AND user_id IS NULL
                        AND person_name = ?`,
                        [bookId, personName]
                    );
                }

                const borrowed = Number(
                    borrowedRecords[0].borrowed
                );

                if (borrowed < amount) {
                    throw new Error(
                        'This person has not borrowed enough copies to return'
                    );
                }

                await connection.query(
                    'UPDATE books SET quantity = quantity + ? WHERE id = ?',
                    [amount, bookId]
                );
            }

            // STOCK ADDED
            else if (transaction_type === 'Stock Added') {

                await connection.query(
                    'UPDATE books SET quantity = quantity + ? WHERE id = ?',
                    [amount, bookId]
                );
            }

            // SAVE TRANSACTION
            const [result] = await connection.query(
                `INSERT INTO transactions
                (book_id, user_id, person_name, transaction_type, quantity)
                VALUES (?, ?, ?, ?, ?)`,
                [
                    bookId,
                    userId,
                    personName,
                    transaction_type,
                    amount
                ]
            );

            await connection.commit();

            res.status(201).json({
                message: 'Transaction completed successfully',
                transactionId: result.insertId
            });

        } catch (error) {

            if (connection) {
                await connection.rollback();
            }

            console.error(error.message);

            const clientErrors = [
                'Book not found',
                'User not found',
                'Not enough books available in stock',
                'This person has not borrowed enough copies to return'
            ];

            if (clientErrors.includes(error.message)) {
                return res.status(400).json({
                    message: error.message
                });
            }

            res.status(500).json({
                message: 'Unable to complete transaction'
            });

        } finally {

            if (connection) {
                connection.release();
            }
        }
    }
);
// =========================
// START SERVER
// =========================

async function startServer() {
    try {
        await db.query('SELECT 1');

        await migratePasswords();

        const PORT = process.env.PORT || 5000;

        app.listen(PORT, () => {
            console.log(
                `Server running on http://localhost:${PORT}`
            );

            console.log('JWT authentication is enabled.');
            console.log('Role-based permissions are enabled.');
        });

    } catch (error) {
        console.error('Server startup failed:', error.message);
        process.exit(1);
    }
}

startServer();