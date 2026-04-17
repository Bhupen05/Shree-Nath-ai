import { useMemo, useState } from 'react'

function DataTable({ title, rows, columns, searchKeys = [], pageSize = 8 }) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState({ key: null, dir: 'asc' })
  const [page, setPage] = useState(1)

  const filteredRows = useMemo(() => {
    const lowerQuery = query.trim().toLowerCase()
    if (!lowerQuery || searchKeys.length === 0) {
      return rows
    }

    return rows.filter((row) =>
      searchKeys.some((key) => String(row[key] ?? '').toLowerCase().includes(lowerQuery))
    )
  }, [rows, query, searchKeys])

  const sortedRows = useMemo(() => {
    if (!sort.key) {
      return filteredRows
    }

    return [...filteredRows].sort((left, right) => {
      const leftValue = left[sort.key]
      const rightValue = right[sort.key]
      if (leftValue === rightValue) {
        return 0
      }

      const lessThan = leftValue < rightValue ? -1 : 1
      return sort.dir === 'asc' ? lessThan : -lessThan
    })
  }, [filteredRows, sort])

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paginatedRows = sortedRows.slice((safePage - 1) * pageSize, safePage * pageSize)

  const toggleSort = (key) => {
    setPage(1)
    setSort((previous) => {
      if (previous.key === key) {
        return { key, dir: previous.dir === 'asc' ? 'desc' : 'asc' }
      }
      return { key, dir: 'asc' }
    })
  }

  return (
    <section className="table-card">
      <header className="table-toolbar">
        <h2>{title}</h2>
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setPage(1)
            setQuery(event.target.value)
          }}
          placeholder="Search..."
          className="table-search"
        />
      </header>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>
                  {column.sortable ? (
                    <button className="sort-btn" onClick={() => toggleSort(column.key)}>
                      {column.label}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="table-empty">
                  No records match your filters.
                </td>
              </tr>
            )}
            {paginatedRows.map((row) => (
              <tr key={row.id}>
                {columns.map((column) => (
                  <td key={column.key}>
                    {column.render ? column.render(row) : String(row[column.key] ?? '-')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer className="table-footer">
        <p>
          Showing {paginatedRows.length} of {sortedRows.length}
        </p>
        <div className="pager">
          <button disabled={safePage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
            Prev
          </button>
          <span>
            {safePage}/{totalPages}
          </span>
          <button
            disabled={safePage >= totalPages}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          >
            Next
          </button>
        </div>
      </footer>
    </section>
  )
}

export default DataTable
