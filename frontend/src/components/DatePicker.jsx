import { useEffect, useMemo, useRef, useState } from 'react';
import { formatDateForPicker, getDateInputValue, parseDateInputValue } from '../utils/dates';

// React equivalent of initDatePickerControl/renderSpendoraCalendar in app.js.
// Same class names + markup so existing CSS applies unchanged.
export default function DatePicker({ id, value, onChange, placeholder = 'Select date', defaultToday = false }) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => parseDateInputValue(value) || new Date());
  const [monthMenuOpen, setMonthMenuOpen] = useState(false);
  const [yearMenuOpen, setYearMenuOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!value && defaultToday) {
      onChange(getDateInputValue(new Date()));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
        setMonthMenuOpen(false);
        setYearMenuOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open ]);

  const calendar = useMemo(() => buildCalendar(viewDate, value), [viewDate, value]);

  const setDate = (next) => {
    onChange(next || '');
    if (next) {
      const parsed = parseDateInputValue(next);
      if (parsed) setViewDate(parsed);
    }
  };

  return (
    <div className={`spendora-date-picker${open ? ' is-open' : ''}`} data-placeholder={placeholder} ref={rootRef}>
      <input type="hidden" id={id} value={value || ''} readOnly />
      <button
        type="button"
        className={`date-picker-trigger${value ? ' has-value' : ''}`}
        aria-expanded={open ? 'true' : 'false'}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(o => !o);
        }}
      >
        <span data-date-label>{value ? formatDateForPicker(value) : placeholder}</span>
        <span className="ui-icon icon-calendar" aria-hidden="true" />
      </button>
      {open && (
        <div className="date-picker-popover">
          <div className="date-picker-head">
            <div className="date-picker-selects" aria-label="Choose month and year">
              <div className="date-picker-dropdown">
                <button
                  type="button"
                  className="date-picker-select-trigger"
                  aria-haspopup="listbox"
                  aria-expanded={monthMenuOpen ? 'true' : 'false'}
                  onClick={(e) => {
                    e.stopPropagation();
                    setYearMenuOpen(false);
                    setMonthMenuOpen(o => !o);
                  }}
                >
                  <span>{calendar.monthNames[calendar.monthStart.getMonth()]}</span>
                  <i aria-hidden="true" />
                </button>
                {!monthMenuOpen ? null : (
                  <div className="date-picker-menu date-picker-month-menu" role="listbox">
                    {calendar.monthNames.map((month, index) => (
                      <button
                        key={month}
                        type="button"
                        role="option"
                        className={index === calendar.monthStart.getMonth() ? 'is-selected' : ''}
                        aria-selected={index === calendar.monthStart.getMonth() ? 'true' : 'false'}
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewDate(new Date(calendar.monthStart.getFullYear(), index, 1));
                          setMonthMenuOpen(false);
                        }}
                      >
                        {month}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="date-picker-dropdown">
                <button
                  type="button"
                  className="date-picker-select-trigger"
                  aria-haspopup="listbox"
                  aria-expanded={yearMenuOpen ? 'true' : 'false'}
                  onClick={(e) => {
                    e.stopPropagation();
                    setMonthMenuOpen(false);
                    setYearMenuOpen(o => !o);
                  }}
                >
                  <span>{calendar.monthStart.getFullYear()}</span>
                  <i aria-hidden="true" />
                </button>
                {!yearMenuOpen ? null : (
                  <div className="date-picker-menu date-picker-year-menu" role="listbox">
                    {calendar.years.map(year => (
                      <button
                        key={year}
                        type="button"
                        role="option"
                        className={year === calendar.monthStart.getFullYear() ? 'is-selected' : ''}
                        aria-selected={year === calendar.monthStart.getFullYear() ? 'true' : 'false'}
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewDate(new Date(year, calendar.monthStart.getMonth(), 1));
                          setYearMenuOpen(false);
                        }}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="date-picker-nav">
              <button
                type="button"
                aria-label="Previous month"
                onClick={(e) => {
                  e.stopPropagation();
                  setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
                }}
              >
                &lsaquo;
              </button>
              <button
                type="button"
                aria-label="Next month"
                onClick={(e) => {
                  e.stopPropagation();
                  setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
                }}
              >
                &rsaquo;
              </button>
            </div>
          </div>
          <div className="date-picker-weekdays">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <span key={d}>{d}</span>)}
          </div>
          <div className="date-picker-grid">
            {calendar.cells.map(cell => (
              <button
                key={cell.value + cell.index}
                type="button"
                className={cell.className}
                onClick={(e) => {
                  e.stopPropagation();
                  setDate(cell.value);
                  setOpen(false);
                }}
              >
                {cell.day}
              </button>
            ))}
          </div>
          <div className="date-picker-footer">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDate('');
                setOpen(false);
              }}
            >
              Clear
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDate(getDateInputValue(new Date()));
                setOpen(false);
              }}
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function buildCalendar(viewDate, selectedValue) {
  const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const firstDay = monthStart.getDay();
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - firstDay);
  const todayValue = getDateInputValue(new Date());
  const monthNames = Array.from({ length: 12 }, (_, index) =>
    new Date(2026, index, 1).toLocaleDateString('en-IN', { month: 'long' })
  );
  const currentYear = new Date().getFullYear();
  const minYear = Math.min(currentYear - 30, monthStart.getFullYear() - 5);
  const maxYear = Math.max(currentYear + 10, monthStart.getFullYear() + 5);
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);
  const cells = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const value = getDateInputValue(date);
    const classes = [
      'date-picker-day',
      date.getMonth() !== monthStart.getMonth() ? 'is-muted' : '',
      value === selectedValue ? 'is-selected' : '',
      value === todayValue ? 'is-today' : ''
    ].filter(Boolean).join(' ');
    return { value, day: date.getDate(), className: classes, index };
  });
  return { monthStart, monthNames, years, cells };
}
