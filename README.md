# Library Management System

A web-based Library Management System developed using React, Express.js and MySQL. The system helps manage library books, users, borrowing, returns and stock.

## Features

- User login and authentication.
- Dashboard displaying library statistics.
- Add, view, update and delete books.
- Track book stock and availability.
- Borrow and return books.
- Record borrowing and return transactions.
- Manage library users.
- Role-based access for administrators, librarians and members.
- Low-stock notifications.

## Technologies Used

### Frontend
- React.js
- JavaScript
- CSS
- Vite
- React Router

### Backend
- Node.js
- Express.js
- MySQL
- REST API
- JWT Authentication

## Project Structure

```text
Library-Management-System/
│
├── backend/
│   ├── server.js
│   ├── package.json
│   └── reset-password.js
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   └── App.css
│   └── package.json
│
└── .gitignore
```

## Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/ngakamentse-lang/Library-Management-System.git
```

### 2. Set up the backend

```bash
cd Library-Management-System/backend
npm install
```

Configure your backend environment variables and MySQL database before starting the server.

Start the backend:

```bash
node server.js
```

### 3. Set up the frontend

Open another terminal:

```bash
cd Library-Management-System/frontend
npm install
npm run dev
```

Open the local URL displayed by Vite in your browser.

## Database

The system uses MySQL to store library books, users and transaction records.

## Project Purpose

This project was developed as part of the Web Application Development coursework to demonstrate frontend development, backend API development, database integration and CRUD operations.

## Author

Developed as a Web Application Development academic project.
