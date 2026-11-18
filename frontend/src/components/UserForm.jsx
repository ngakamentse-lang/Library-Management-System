function UserForm({
  userFormData,
  handleUserChange,
  handleUserSubmit,
  editingUserId,
  resetUserForm
}) {
  return (
    <section className="table-section">
      <div className="section-heading">
        <h2>{editingUserId !== null ? 'Update User' : 'Add New User'}</h2>
      </div>

      <form onSubmit={handleUserSubmit}>
        <div className="form-grid">
          <div>
            <label>Full Name</label>
            <input
              name="name"
              value={userFormData.name}
              onChange={handleUserChange}
              placeholder="Enter full name"
              required
            />
          </div>

          <div>
            <label>Membership / Staff ID</label>
            <input
              name="membershipId"
              value={userFormData.membershipId}
              onChange={handleUserChange}
              placeholder="e.g. MEM002 or STAFF003"
              required
            />
          </div>

          <div>
            <label>Username</label>
            <input
              name="username"
              value={userFormData.username}
              onChange={handleUserChange}
              placeholder="Enter username"
              required
            />
          </div>

          <div>
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={userFormData.password}
              onChange={handleUserChange}
              placeholder={editingUserId !== null
                ? 'Leave blank to keep current password'
                : 'Enter password'}
              required={editingUserId === null}
            />
          </div>

          <div>
            <label>User Role</label>
            <select
              name="role"
              value={userFormData.role}
              onChange={handleUserChange}
            >
              <option value="Member">Member</option>
              <option value="Librarian">Librarian</option>
              <option value="Staff">Staff</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
        </div>

        <div className="form-buttons">
          <button type="submit">
            {editingUserId !== null ? 'Update User' : 'Add User'}
          </button>

          <button type="button" onClick={resetUserForm}>
            Clear Form
          </button>
        </div>
      </form>
    </section>
  )
}

export default UserForm