require("dotenv").config();

const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

async function resetPassword() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306
    });

    const newPassword = "Librarian@123";

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const [result] = await connection.execute(
      "UPDATE users SET password = ? WHERE username = ?",
      [hashedPassword, "DOC"]
    );

    if (result.affectedRows === 1) {
      console.log("Password reset successfully!");
      console.log("Username: DOC");
      console.log("New password: Librarian@123");
    } else {
      console.log("User DOC was not found.");
    }

  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

resetPassword(); 