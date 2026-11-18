function Dashboard({ totalTitles, totalCopies, booksBorrowed, lowStock, books, onViewBooks }) {
  return (
    <>
      <section className="welcome-section">
        <h1>Dashboard Overview</h1>
        <p>Here's what's happening in your library today.</p>
      </section>

      <section className="stats-container">
        <div className="stat-card">
          <span>📚</span>
          <h3>Total Book Titles</h3>
          <h2>{totalTitles}</h2>
        </div>

        <div className="stat-card">
          <span>📦</span>
          <h3>Total Book Copies</h3>
          <h2>{totalCopies}</h2>
        </div>

        <div className="stat-card">
          <span>📖</span>
          <h3>Books Borrowed</h3>
          <h2>{booksBorrowed}</h2>
        </div>

        <div className="stat-card">
          <span>⚠️</span>
          <h3>Low Stock Books</h3>
          <h2>{lowStock}</h2>
        </div>
      </section>

      <section className="table-section">
        <div className="section-heading">
          <h2>Recent Books</h2>
          <button onClick={onViewBooks}>View All</button>
        </div>

        <table>
          <thead>
            <tr>
              <th>Book Title</th>
              <th>Author</th>
              <th>Genre</th>
              <th>Quantity</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {books.slice(-5).reverse().map(book => (
              <tr key={book.id}>
                <td>{book.title}</td>
                <td>{book.author}</td>
                <td>{book.genre}</td>
                <td>{book.quantity}</td>
                <td>{book.quantity < 2 ? 'Low Stock' : 'Available'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  )
}

export default Dashboard