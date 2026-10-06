import { useEffect, useMemo, useRef, useState } from 'react'
import { apiGet, apiPost, apiPut } from './api.js'
import { EditIcon, PlusIcon, SearchIcon } from './Icons.jsx'
import './MasterPage.css'

const statusFilters = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'inactive', label: 'Inactive' },
]

function capitalize(word) {
  return word[0].toUpperCase() + word.slice(1)
}

function toBody(config, source, isActive) {
  const body = { isActive }
  for (const field of config.fields) body[field.name] = source[field.name] ?? ''
  return body
}

function FormField({ field, values, suggestions, onChange }) {
  const id = `master-${field.name}`
  const common = {
    id,
    name: field.name,
    value: values[field.name],
    required: field.required,
    onChange: (event) => onChange(field, event.target.value),
  }

  let control
  if (field.type === 'textarea') {
    control = <textarea rows={3} maxLength={field.maxLength} {...common} />
  } else if (field.type === 'select') {
    control = (
      <select {...common}>
        {field.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    )
  } else {
    control = (
      <input
        type={field.type ?? 'text'}
        maxLength={field.maxLength}
        min={field.min}
        max={typeof field.max === 'function' ? field.max(values) : field.max}
        step={field.step}
        pattern={field.pattern}
        placeholder={field.placeholder}
        list={field.suggest ? `${id}-options` : undefined}
        autoComplete="off"
        {...common}
      />
    )
  }

  return (
    <div className={`master-field ${field.wide ? 'is-wide' : ''}`}>
      <label htmlFor={id}>
        {field.label}
        {field.required && (
          <span className="master-required" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {control}
      {field.suggest && (
        <datalist id={`${id}-options`}>
          {suggestions[field.name].map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
      )}
      {field.hint && <span className="master-hint">{field.hint}</span>}
    </div>
  )
}

function MasterForm({ config, item, suggestions, onClose, onSaved }) {
  const dialogRef = useRef(null)
  const isNew = item.id == null
  const [values, setValues] = useState(() =>
    Object.fromEntries(
      config.fields.map((field) => [
        field.name,
        isNew ? (field.defaultValue ?? '') : String(item[field.name] ?? ''),
      ]),
    ),
  )
  const [isActive, setIsActive] = useState(isNew || item.isActive)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const dialog = dialogRef.current
    dialog.showModal()
    dialog.querySelector('input, select, textarea')?.focus()
    return () => dialog.close()
  }, [])

  function handleChange(field, value) {
    setValues((current) => ({
      ...current,
      [field.name]: field.uppercase ? value.toUpperCase() : value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')

    const body = toBody(config, values, isActive)
    try {
      const data = isNew
        ? await apiPost(config.endpoint, body)
        : await apiPut(`${config.endpoint}/${item.id}`, body)
      onSaved(data[config.itemKey], isNew)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="master-dialog"
      aria-labelledby="master-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        if (!saving) onClose()
      }}
    >
      <form className="master-form" onSubmit={handleSubmit}>
        <header className="master-form-header">
          <p className="master-form-eyebrow">{config.title}</p>
          <h2 id="master-dialog-title">
            {isNew ? `Add ${config.singular}` : `Edit ${config.columns[0].value(item)}`}
          </h2>
        </header>

        <div className="master-form-grid">
          {config.fields
            .filter((field) => !field.showIf || field.showIf(values))
            .map((field) => (
              <FormField
                key={field.name}
                field={field}
                values={values}
                suggestions={suggestions}
                onChange={handleChange}
              />
            ))}
        </div>

        <label className="master-toggle">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
          />
          <span>
            <strong>Active</strong>
            <span>{config.inactiveHint ?? `Inactive ${config.listKey} are hidden from the billing screen.`}</span>
          </span>
        </label>

        {error && (
          <p className="master-alert is-error" role="alert">
            {error}
          </p>
        )}

        <footer className="master-form-actions">
          <button type="button" className="master-button is-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="master-button is-primary" disabled={saving}>
            {saving ? 'Saving…' : isNew ? `Add ${config.singular}` : 'Save changes'}
          </button>
        </footer>
      </form>
    </dialog>
  )
}

function MasterPage({ config }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [editing, setEditing] = useState(null)
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    apiGet(`${config.endpoint}?all=1`, { signal: controller.signal })
      .then((data) => {
        setItems(data[config.listKey])
        setLoading(false)
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setError(err.message)
        setLoading(false)
      })
    return () => controller.abort()
  }, [config])

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 3500)
    return () => clearTimeout(timer)
  }, [notice])

  const suggestions = useMemo(() => {
    const result = {}
    for (const field of config.fields) {
      if (field.suggest) {
        result[field.name] = [...new Set(items.map((item) => item[field.name]).filter(Boolean))].sort()
      }
    }
    return result
  }, [config, items])

  const term = query.trim().toLowerCase()
  const visibleItems = items.filter(
    (item) =>
      (status === 'all' || item.isActive === (status === 'active')) &&
      (!term ||
        config.searchFields.some((field) => String(item[field] ?? '').toLowerCase().includes(term))),
  )
  const nameOf = (item) => config.columns[0].value(item)

  function handleSaved(saved, isNew) {
    setItems((current) =>
      isNew ? [saved, ...current] : current.map((item) => (item.id === saved.id ? saved : item)),
    )
    setEditing(null)
    setError('')
    setNotice(`${nameOf(saved)} ${isNew ? 'added' : 'updated'}.`)
  }

  async function toggleActive(item) {
    setBusyId(item.id)
    setError('')
    try {
      const data = await apiPut(`${config.endpoint}/${item.id}`, toBody(config, item, !item.isActive))
      const saved = data[config.itemKey]
      setItems((current) => current.map((row) => (row.id === saved.id ? saved : row)))
      setNotice(`${nameOf(saved)} ${saved.isActive ? 'activated' : 'deactivated'}.`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const columnCount = config.columns.length + 2

  return (
    <div className="master-page">
      <header className="master-header">
        <h1 className="master-title">{config.title}</h1>
        <button type="button" className="master-add" onClick={() => setEditing({})}>
          <PlusIcon />
          Add {capitalize(config.singular)}
        </button>
      </header>

      <section className="master-body">
        <div className="master-toolbar">
          <label className="master-search">
            <SearchIcon />
            <span className="sr-only">Search {config.listKey}</span>
            <input
              type="search"
              placeholder={`Search ${config.listKey}…`}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div className="master-filter" role="group" aria-label="Filter by status">
            {statusFilters.map((filter) => (
              <button
                key={filter.id}
                type="button"
                aria-pressed={status === filter.id}
                onClick={() => setStatus(filter.id)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="master-alert is-error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="master-alert is-success" role="status">
            {notice}
          </p>
        )}

        <div className="master-table-wrap">
          <table className="master-table">
            <thead>
              <tr>
                {config.columns.map((column) => (
                  <th key={column.label} className={column.align === 'right' ? 'is-right' : ''}>
                    {column.label}
                  </th>
                ))}
                <th>Status</th>
                <th className="is-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columnCount} className="master-empty">
                    Loading {config.listKey}…
                  </td>
                </tr>
              ) : visibleItems.length === 0 ? (
                <tr>
                  <td colSpan={columnCount} className="master-empty">
                    {items.length === 0
                      ? `No ${config.listKey} yet. Use “Add ${capitalize(config.singular)}” to create one.`
                      : `No ${config.listKey} match your filters.`}
                  </td>
                </tr>
              ) : (
                visibleItems.map((item) => (
                  <tr key={item.id} className={item.isActive ? '' : 'is-inactive'}>
                    {config.columns.map((column) => {
                      const detail = column.detail?.(item)
                      return (
                        <td key={column.label} className={column.align === 'right' ? 'is-right' : ''}>
                          <span
                            className={[
                              'master-cell-value',
                              column.mono && 'is-mono',
                              column.tone?.(item) === 'warn' && 'is-warn',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                          >
                            {column.value(item)}
                          </span>
                          {detail && <span className="master-cell-detail">{detail}</span>}
                        </td>
                      )
                    })}
                    <td>
                      <span className={`master-status ${item.isActive ? 'is-active' : ''}`}>
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="is-right">
                      <div className="master-actions">
                        <button
                          type="button"
                          className="master-icon-button"
                          onClick={() => setEditing(item)}
                          title={`Edit ${nameOf(item)}`}
                        >
                          <EditIcon />
                          <span className="sr-only">Edit {nameOf(item)}</span>
                        </button>
                        <button
                          type="button"
                          className={`master-text-button ${item.isActive ? 'is-danger' : ''}`}
                          onClick={() => toggleActive(item)}
                          disabled={busyId === item.id}
                        >
                          {item.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {editing && (
        <MasterForm
          key={editing.id ?? 'new'}
          config={config}
          item={editing}
          suggestions={suggestions}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}

export default MasterPage
