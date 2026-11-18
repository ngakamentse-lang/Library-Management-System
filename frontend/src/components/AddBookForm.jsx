function AddBookForm({
  formData,
  handleBookChange,
  handleBookSubmit,
  editingId,
  resetBookForm
}) {
  return (
    <section className="table-section">
      <div className="section-heading">
        <h2>{editingId !== null ? 'Update Book' : 'Add New Book'}</h2>
      </div>

      <form onSubmit={handleBookSubmit}>
        <div className="form-grid">
          <div>
            <label>Book Title</label>
            <input
              name="title"
              value={formData.title}
              onChange={handleBookChange}
              placeholder="Enter book title"
              required
            />
          </div>

          <div>
            <label>Author</label>
            <input
              name="author"
              value={formData.author}
              onChange={handleBookChange}
              placeholder="Enter author name"
              required
            />
          </div>

          <div>
            <label>Genre</label>
            <input
              name="genre"
              value={formData.genre}
              onChange={handleBookChange}
              placeholder="Enter book genre"
              required
            />
          </div>

          <div>
            <label>ISBN</label>
            <input
              name="isbn"
              value={formData.isbn}
              onChange={handleBookChange}
              placeholder="Enter ISBN number"
              required
            />
          </div>

          <div>
            <label>Quantity</label>
            <input
              type="number"
              name="quantity"
              min="0"
              value={formData.quantity}
              onChange={handleBookChange}
              placeholder="Enter quantity"
              required
            />
          </div>
        </div>

        <div className="form-buttons">
          <button type="submit">
            {editingId !== null ? 'Update Book' : 'Add Book'}
          </button>

          <button type="button" onClick={resetBookForm}>
            Clear Form
          </button>
        </div>
      </form>
    </section>
  )
}

export default AddBookForm