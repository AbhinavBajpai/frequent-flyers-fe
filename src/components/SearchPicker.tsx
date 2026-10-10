import { useQuery } from '@tanstack/react-query'
import { useEffect, useId, useState, type KeyboardEvent } from 'react'

interface SearchItem { key: string; title: string; detail: string }
interface Props<T> {
  label: string
  placeholder: string
  queryKey: string
  search: (query: string) => Promise<T[]>
  describe: (item: T) => SearchItem
  selected: T | null
  onSelect: (item: T | null) => void
  disabled?: boolean
}

export function SearchPicker<T>({ label, placeholder, queryKey, search, describe, selected, onSelect, disabled }: Props<T>) {
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const listId = useId()

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(input.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [input])

  const results = useQuery({
    queryKey: [queryKey, query],
    queryFn: () => search(query),
    enabled: query.length >= 2 && !selected,
  })
  const items = results.data ?? []

  function choose(item: T) {
    onSelect(item)
    setInput(describe(item).title)
    setOpen(false)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open || !items.length) return
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive((value) => (value + 1) % items.length) }
    if (event.key === 'ArrowUp') { event.preventDefault(); setActive((value) => (value - 1 + items.length) % items.length) }
    if (event.key === 'Enter') { event.preventDefault(); choose(items[active]) }
    if (event.key === 'Escape') setOpen(false)
  }

  return (
    <div className="search-picker">
      <label htmlFor={`${listId}-input`}>{label}</label>
      <input
        id={`${listId}-input`}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && items.length > 0}
        aria-controls={listId}
        aria-activedescendant={open && items[active] ? `${listId}-${describe(items[active]).key}` : undefined}
        autoComplete="off"
        disabled={disabled}
        value={input}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={handleKeyDown}
        onChange={(event) => { setInput(event.target.value); onSelect(null); setOpen(true); setActive(0) }}
      />
      {open && query.length >= 2 && (
        <div className="search-results-wrap">
          {results.isFetching && <p className="search-status" role="status">Checking the departures board…</p>}
          {results.isError && <p className="search-status search-error" role="alert">Search is unavailable. Please try again.</p>}
          {!results.isFetching && !results.isError && items.length === 0 && <p className="search-status">No matching passengers found.</p>}
          {items.length > 0 && (
            <ul id={listId} role="listbox" aria-label={`${label} results`}>
              {items.map((item, index) => {
                const description = describe(item)
                return <li id={`${listId}-${description.key}`} role="option" aria-selected={index === active} className={index === active ? 'active' : ''} key={description.key} onMouseDown={() => choose(item)} onMouseEnter={() => setActive(index)}><strong>{description.title}</strong><span>{description.detail}</span></li>
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
