function BookList({
  books,
  filteredBooks,
  loadingBooks,
  isMember,
  searchTerm,
  setSearchTerm,
  handleEditBook,
  handleDeleteBook
}) {
  return (
    <section className="table-section">
      <div className="section-heading">
        <h2>All Books ({books.length})</h2>

        <input
          placeholder="Search books..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Book Title</th>
            <th>Author</th>
            <th>Genre</th>
            <th>ISBN</th>
            <th>Quantity</th>
            <th>Status</th>
            {!isMember && <th>Actions</th>}
          </tr>
        </thead>

        <tbody>
          {loadingBooks && (
            <tr>
              <td colSpan={isMember ? '7' : '8'}>Loading books...</td>
            </tr>
          )}

          {!loadingBooks && filteredBooks.map(book => (
            <tr key={book.id}>
              <td>{book.id}</td>
              <td>{book.title}</td>
              <td>{book.author}</td>
              <td>{book.genre}</td>
              <td>{book.isbn}</td>
              <td>{book.quantity}</td>
              <td>{book.quantity < 2 ? 'Low Stock' : 'Available'}</td>

              {!isMember && (
                <td>
                  <button onClick={() => handleEditBook(book)}>Edit</button>
                  <button onClick={() => handleDeleteBook(book.id)}>Delete</button>
                </td>
              )}
            </tr>
          ))}

          {!loadingBooks && filteredBooks.length === 0 && (
            <tr>
              <td colSpan={isMember ? '7' : '8'}>No books found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  )
}

export default BookList