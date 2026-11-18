import { useState, useEffect } from 'react'
import { BrowserRouter, useNavigate, useLocation } from 'react-router-dom'
import './App.css'
import Dashboard from './components/Dashboard'
import BookList from './components/BookList'
import AddBookForm from './components/AddBookForm'
import UserForm from './components/UserForm'

const API = 'http://localhost:5000/api'

function AppContent() {
  const [currentUser, setCurrentUser] = useState(null)

  const navigate = useNavigate()
  const location = useLocation()

  const routePages = {
    '/': 'Dashboard',
    '/books': 'Books',
    '/transactions': 'Transactions',
    '/users': 'Users'
  }

  const activePage = routePages[location.pathname] || 'Dashboard'

  const setActivePage = (page) => {
    const pageRoutes = {
      Dashboard: '/',
      Books: '/books',
      Transactions: '/transactions',
      Users: '/users'
    }

    navigate(pageRoutes[page] || '/')
  }

  const isAdmin = currentUser?.role === 'Admin'
  const isMember = currentUser?.role === 'Member'

  // AUTHENTICATED API REQUESTS
  const authFetch = (url, options = {}) => {
    const token = localStorage.getItem('token')

    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    })
  }

  const [loginData, setLoginData] = useState({
    username: '',
    password: ''
  })

  const [loginLoading, setLoginLoading] = useState(false)

  const [books, setBooks] = useState([])
  const [users, setUsers] = useState([])
  const [transactions, setTransactions] = useState([])

  const [loadingBooks, setLoadingBooks] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [loadingTransactions, setLoadingTransactions] = useState(true)

  const [searchTerm, setSearchTerm] = useState('')
  const [userSearchTerm, setUserSearchTerm] = useState('')

  const emptyBook = {
    title: '',
    author: '',
    genre: '',
    isbn: '',
    quantity: ''
  }

  const emptyUser = {
    name: '',
    membershipId: '',
    username: '',
    password: '',
    role: 'Member'
  }

  const [formData, setFormData] = useState(emptyBook)
  const [editingId, setEditingId] = useState(null)

  const [userFormData, setUserFormData] = useState(emptyUser)
  const [editingUserId, setEditingUserId] = useState(null)

  const [transactionData, setTransactionData] = useState({
    bookId: '',
    type: 'Borrow',
    person: '',
    quantity: ''
  })

  // LOGIN
  const handleLogin = async (e) => {
    e.preventDefault()
    setLoginLoading(true)

    try {
      const response = await fetch(`${API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Login failed')
      }

      localStorage.setItem('token', result.token)
      setCurrentUser(result.user)
      setLoginData({ username: '', password: '' })
      setActivePage('Dashboard')
    } catch (error) {
      alert(error.message)
    } finally {
      setLoginLoading(false)
    }
  }

  // LOGOUT
  const handleLogout = () => {
    localStorage.removeItem('token')
    setCurrentUser(null)
    setActivePage('Dashboard')
  }

  // LOAD BOOKS
  const loadBooks = async () => {
    try {
      const response = await authFetch(`${API}/books`)

      if (!response.ok) {
        throw new Error('Could not load books')
      }

      const data = await response.json()
      setBooks(data)
    } catch (error) {
      console.error(error)
      alert('Could not load books. Check your backend.')
    } finally {
      setLoadingBooks(false)
    }
  }

  // LOAD USERS
  const loadUsers = async () => {
    try {
      const response = await authFetch(`${API}/users`)

      if (!response.ok) {
        throw new Error('Could not load users')
      }

      const data = await response.json()

      setUsers(data.map(user => ({
        id: user.id,
        name: user.name,
        membershipId: user.membership_id,
        username: user.username,
        role: user.role
      })))
    } catch (error) {
      console.error(error)
      alert('Could not load users.')
    } finally {
      setLoadingUsers(false)
    }
  }

  // LOAD TRANSACTIONS
  const loadTransactions = async () => {
    try {
      const response = await authFetch(`${API}/transactions`)

      if (!response.ok) {
        throw new Error('Could not load transactions')
      }

      const data = await response.json()

      setTransactions(data.map(item => ({
        id: item.id,
        bookTitle: item.book_title,
        type: item.transaction_type,
        person: item.user_name || item.person_name || 'Unknown',
        quantity: Number(item.quantity),
        date: item.transaction_date
          ? new Date(item.transaction_date).toLocaleString()
          : ''
      })))
    } catch (error) {
      console.error(error)
      alert('Could not load transaction history.')
    } finally {
      setLoadingTransactions(false)
    }
  }

  // LOAD DATA
  useEffect(() => {
    loadBooks()
  }, [])

  useEffect(() => {
    if (!currentUser) return

    if (currentUser.role === 'Admin') {
      loadUsers()
      loadTransactions()
    } else if (
      currentUser.role === 'Librarian' ||
      currentUser.role === 'Staff'
    ) {
      loadTransactions()
    }
  }, [currentUser])

  // ROUTE PROTECTION
  useEffect(() => {
    if (!routePages[location.pathname]) {
      setActivePage('Dashboard')
      return
    }

    if (
      currentUser &&
      currentUser.role !== 'Admin' &&
      location.pathname === '/users'
    ) {
      setActivePage('Dashboard')
    }
  }, [currentUser, location.pathname])

  // BOOK FORM
  const handleBookChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const resetBookForm = () => {
    setFormData(emptyBook)
    setEditingId(null)
  }

  // ADD OR UPDATE BOOK
  const handleBookSubmit = async (e) => {
    e.preventDefault()

    if (isMember) {
      alert('Members cannot add or edit books.')
      return
    }

    const bookData = {
      title: formData.title.trim(),
      author: formData.author.trim(),
      genre: formData.genre.trim(),
      isbn: formData.isbn.trim(),
      quantity: Number(formData.quantity)
    }

    if (
      !bookData.title ||
      !bookData.author ||
      !bookData.genre ||
      !bookData.isbn ||
      formData.quantity === '' ||
      !Number.isInteger(bookData.quantity) ||
      bookData.quantity < 0
    ) {
      alert('Please complete all fields correctly.')
      return
    }

    try {
      const editing = editingId !== null

      const response = await authFetch(
        editing
          ? `${API}/books/${editingId}`
          : `${API}/books`,
        {
          method: editing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bookData)
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Could not save book')
      }

      await loadBooks()
      resetBookForm()

      alert(
        editing
          ? 'Book updated successfully!'
          : 'Book added successfully!'
      )
    } catch (error) {
      alert(error.message)
    }
  }
    // EDIT BOOK
  const handleEditBook = (book) => {
    if (isMember) return

    setFormData({
      title: book.title,
      author: book.author,
      genre: book.genre,
      isbn: book.isbn,
      quantity: String(book.quantity)
    })

    setEditingId(book.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // DELETE BOOK
  const handleDeleteBook = async (id) => {
    if (isMember) return

    if (!window.confirm('Are you sure you want to delete this book?')) {
      return
    }

    try {
      const response = await authFetch(`${API}/books/${id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Could not delete book')
      }

      await loadBooks()

      if (editingId === id) {
        resetBookForm()
      }

      alert('Book deleted successfully!')
    } catch (error) {
      alert(error.message)
    }
  }

  // FILTER BOOKS
  const filteredBooks = books.filter(book =>
    `${book.title} ${book.author} ${book.genre} ${book.isbn}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  )

  // USER FORM
  const handleUserChange = (e) => {
    setUserFormData({
      ...userFormData,
      [e.target.name]: e.target.value
    })
  }

  const resetUserForm = () => {
    setUserFormData(emptyUser)
    setEditingUserId(null)
  }

  // ADD OR UPDATE USER
  const handleUserSubmit = async (e) => {
    e.preventDefault()

    const userData = {
      name: userFormData.name.trim(),
      membership_id: userFormData.membershipId.trim(),
      username: userFormData.username.trim(),
      password: userFormData.password,
      role: userFormData.role
    }

    if (
      !userData.name ||
      !userData.membership_id ||
      !userData.username
    ) {
      alert('Please complete all required fields.')
      return
    }

    if (editingUserId === null && !userData.password.trim()) {
      alert('Please enter a password.')
      return
    }

    try {
      const editing = editingUserId !== null

      const response = await authFetch(
        editing
          ? `${API}/users/${editingUserId}`
          : `${API}/users`,
        {
          method: editing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData)
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Could not save user')
      }

      await loadUsers()
      resetUserForm()

      alert(
        editing
          ? 'User updated successfully!'
          : 'User added successfully!'
      )
    } catch (error) {
      alert(error.message)
    }
  }

  // EDIT USER
  const handleEditUser = (user) => {
    setUserFormData({
      name: user.name,
      membershipId: user.membershipId,
      username: user.username,
      password: '',
      role: user.role
    })

    setEditingUserId(user.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // DELETE USER
  const handleDeleteUser = async (id) => {
    const selectedUser = users.find(user => user.id === id)

    if (
      selectedUser?.role === 'Admin' &&
      users.filter(user => user.role === 'Admin').length === 1
    ) {
      alert('You cannot delete the only administrator.')
      return
    }

    if (!window.confirm('Are you sure you want to delete this user?')) {
      return
    }

    try {
      const response = await authFetch(`${API}/users/${id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Could not delete user')
      }

      await loadUsers()

      if (editingUserId === id) {
        resetUserForm()
      }

      alert('User deleted successfully!')
    } catch (error) {
      alert(error.message)
    }
  }

  // FILTER USERS
  const filteredUsers = users.filter(user =>
    `${user.name} ${user.membershipId} ${user.username} ${user.role}`
      .toLowerCase()
      .includes(userSearchTerm.toLowerCase())
  )

  // TRANSACTION FORM
  const handleTransactionChange = (e) => {
    setTransactionData({
      ...transactionData,
      [e.target.name]: e.target.value
    })
  }

  // BORROW, RETURN OR ADD STOCK
  const handleTransactionSubmit = async (e) => {
    e.preventDefault()

    const quantity = Number(transactionData.quantity)
    const bookId = Number(transactionData.bookId)

    if (!bookId || (!isMember && !transactionData.person.trim())) {
      alert('Please complete all transaction fields.')
      return
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      alert('Enter a valid quantity.')
      return
    }

    if (isMember && transactionData.type === 'Stock Added') {
      alert('Members cannot add stock.')
      return
    }

    try {
      const response = await authFetch(`${API}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          book_id: bookId,
          user_id: null,
          person_name: isMember ? '' : transactionData.person.trim(),
          transaction_type: transactionData.type,
          quantity
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Transaction failed')
      }

      await loadBooks()

      if (!isMember) {
        await loadTransactions()
      }

      setTransactionData({
        bookId: '',
        type: 'Borrow',
        person: '',
        quantity: ''
      })

      alert(result.message || 'Transaction completed successfully!')
    } catch (error) {
      alert(error.message)
    }
  }

  // DASHBOARD STATISTICS
  const totalTitles = books.length

  const totalCopies = books.reduce(
    (total, book) => total + Number(book.quantity),
    0
  )

  const booksBorrowed = transactions.reduce((total, item) => {
    if (item.type === 'Borrow') return total + item.quantity
    if (item.type === 'Return') return total - item.quantity
    return total
  }, 0)

  const lowStock = books.filter(
    book => Number(book.quantity) < 2
  ).length

  const totalAdmins = users.filter(
    user => user.role === 'Admin'
  ).length

  const totalLibrarians = users.filter(
    user => user.role === 'Librarian'
  ).length

  const totalStaff = users.filter(
    user => user.role === 'Staff'
  ).length

  const totalMembers = users.filter(
    user => user.role === 'Member'
  ).length

  // MENU PERMISSIONS
  const menuItems = [
    'Dashboard',
    'Books',
    'Transactions',
    ...(isAdmin ? ['Users'] : [])
  ]
    // LOGIN SCREEN
  if (!currentUser) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-logo">📚</div>

          <h1>Library MS</h1>
          <p>Sign in to your account</p>

          <form onSubmit={handleLogin}>
            <label>Username</label>

            <input
              type="text"
              placeholder="Enter your username"
              value={loginData.username}
              onChange={e => setLoginData({
                ...loginData,
                username: e.target.value
              })}
              required
            />

            <label>Password</label>

            <input
              type="password"
              placeholder="Enter your password"
              value={loginData.password}
              onChange={e => setLoginData({
                ...loginData,
                password: e.target.value
              })}
              required
            />

            <button type="submit" disabled={loginLoading}>
              {loginLoading ? 'Signing in...' : 'Login'}
            </button>
          </form>

          <small>Library Management System | Version 1.0</small>
        </div>
      </div>
    )
  }

  // MAIN APPLICATION
  return (
    <div className="app-container">

      <aside className="sidebar">
        <div className="logo">📚 Library MS</div>

        <p className="menu-title">MAIN MENU</p>

        <nav>
          {menuItems.map(item => (
            <button
              key={item}
              className={activePage === item ? 'active' : ''}
              onClick={() => setActivePage(item)}
            >
              {item}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <p>Library Management System</p>
          <small>Version 1.0</small>
        </div>
      </aside>

      <main className="main-content">

        <header className="topbar">
          <div>
            <h2>{activePage}</h2>
            <p>Welcome to your library management system.</p>
          </div>

          <div className="profile">
            <span>👤</span>

            <div>
              <strong>{currentUser.name}</strong>
              <small>{currentUser.role}</small>
            </div>

            <button onClick={handleLogout}>Logout</button>
          </div>
        </header>

        {/* DASHBOARD */}
        {activePage === 'Dashboard' && (
          <Dashboard
            totalTitles={totalTitles}
            totalCopies={totalCopies}
            booksBorrowed={booksBorrowed}
            lowStock={lowStock}
            books={books}
            onViewBooks={() => setActivePage('Books')}
          />
        )}

        {/* BOOK MANAGEMENT */}
        {activePage === 'Books' && (
          <>
            <section className="welcome-section">
              <h1>Book Management</h1>
              <p>View and manage library books.</p>
            </section>

            {!isMember && (
              <AddBookForm
                formData={formData}
                handleBookChange={handleBookChange}
                handleBookSubmit={handleBookSubmit}
                editingId={editingId}
                resetBookForm={resetBookForm}
              />
            )}

            <BookList
              books={books}
              filteredBooks={filteredBooks}
              loadingBooks={loadingBooks}
              isMember={isMember}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              handleEditBook={handleEditBook}
              handleDeleteBook={handleDeleteBook}
            />
          </>
        )}

        {/* TRANSACTIONS */}
        {activePage === 'Transactions' && (
          <>
            <section className="welcome-section">
              <h1>Transactions Management</h1>

              <p>
                {isMember
                  ? 'Borrow or return books from the library.'
                  : 'Manage book borrowing, returns and stock additions.'}
              </p>
            </section>

            <section className="table-section">
              <div className="section-heading">
                <h2>New Transaction</h2>
              </div>

              <form onSubmit={handleTransactionSubmit}>
                <div className="form-grid">

                  <div>
                    <label>Select Book</label>

                    <select
                      name="bookId"
                      value={transactionData.bookId}
                      onChange={handleTransactionChange}
                      required
                    >
                      <option value="">Choose a book</option>

                      {books.map(book => (
                        <option key={book.id} value={book.id}>
                          {book.title} (Stock: {book.quantity})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label>Transaction Type</label>

                    <select
                      name="type"
                      value={transactionData.type}
                      onChange={handleTransactionChange}
                    >
                      <option value="Borrow">Borrow Book</option>
                      <option value="Return">Return Book</option>

                      {!isMember && (
                        <option value="Stock Added">Add Stock</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label>Member / Staff Name</label>

                    <input
                      name="person"
                      value={
                        isMember
                          ? currentUser.name
                          : transactionData.person
                      }
                      onChange={handleTransactionChange}
                      placeholder="Enter member or staff name"
                      readOnly={isMember}
                      required={!isMember}
                    />
                  </div>

                  <div>
                    <label>Quantity</label>

                    <input
                      type="number"
                      name="quantity"
                      min="1"
                      value={transactionData.quantity}
                      onChange={handleTransactionChange}
                      placeholder="Enter quantity"
                      required
                    />
                  </div>

                </div>

                <div className="form-buttons">
                  <button type="submit">
                    Complete Transaction
                  </button>
                </div>
              </form>
            </section>

            {/* TRANSACTION HISTORY */}
            {!isMember && (
              <section className="table-section">
                <div className="section-heading">
                  <h2>Transaction History ({transactions.length})</h2>
                </div>

                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Book Title</th>
                      <th>Member / Staff</th>
                      <th>Transaction Type</th>
                      <th>Quantity</th>
                      <th>Date</th>
                    </tr>
                  </thead>

                  <tbody>
                    {loadingTransactions && (
                      <tr>
                        <td colSpan="6">Loading transactions...</td>
                      </tr>
                    )}

                    {!loadingTransactions && transactions.map(item => (
                      <tr key={item.id}>
                        <td>{item.id}</td>
                        <td>{item.bookTitle}</td>
                        <td>{item.person}</td>
                        <td>{item.type}</td>
                        <td>{item.quantity}</td>
                        <td>{item.date}</td>
                      </tr>
                    ))}

                    {!loadingTransactions && transactions.length === 0 && (
                      <tr>
                        <td colSpan="6">
                          No transactions recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </section>
            )}
          </>
        )}
        {/* USER MANAGEMENT - ADMIN ONLY */}
        {activePage === 'Users' && isAdmin && (
          <>
            <section className="welcome-section">
              <h1>User Management</h1>
              <p>Add, update, search and manage library users.</p>
            </section>

            {/* USER STATISTICS */}
            <section className="stats-container">
              <div className="stat-card">
                <span>👨‍💼</span>
                <h3>Administrators</h3>
                <h2>{totalAdmins}</h2>
              </div>

              <div className="stat-card">
                <span>📚</span>
                <h3>Librarians</h3>
                <h2>{totalLibrarians}</h2>
              </div>

              <div className="stat-card">
                <span>👔</span>
                <h3>Staff</h3>
                <h2>{totalStaff}</h2>
              </div>

              <div className="stat-card">
                <span>👥</span>
                <h3>Members</h3>
                <h2>{totalMembers}</h2>
              </div>
            </section>

            {/* REUSABLE USER FORM */}
            <UserForm
              userFormData={userFormData}
              handleUserChange={handleUserChange}
              handleUserSubmit={handleUserSubmit}
              editingUserId={editingUserId}
              resetUserForm={resetUserForm}
            />

            {/* ALL USERS */}
            <section className="table-section">
              <div className="section-heading">
                <h2>All Users ({users.length})</h2>

                <input
                  placeholder="Search users..."
                  value={userSearchTerm}
                  onChange={e => setUserSearchTerm(e.target.value)}
                />
              </div>

              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Full Name</th>
                    <th>Membership / Staff ID</th>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {loadingUsers && (
                    <tr>
                      <td colSpan="6">Loading users...</td>
                    </tr>
                  )}

                  {!loadingUsers && filteredUsers.map(user => (
                    <tr key={user.id}>
                      <td>{user.id}</td>
                      <td>{user.name}</td>
                      <td>{user.membershipId}</td>
                      <td>{user.username}</td>
                      <td>{user.role}</td>
                      <td>
                        <button onClick={() => handleEditUser(user)}>
                          Edit
                        </button>

                        <button onClick={() => handleDeleteUser(user.id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}

                  {!loadingUsers && filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan="6">No users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
          </>
        )}

      </main>
    </div>
  )
}

// MAIN APP WITH REACT ROUTER
function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App