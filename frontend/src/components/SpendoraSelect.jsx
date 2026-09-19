import { useEffect, useRef, useState } from 'react';
import { getCategoryColor, getPaymentMethodColor } from '../utils/themes';

// React equivalent of initSpendoraSelectControls/syncSpendoraSelect in app.js.
// Same DOM structure + class names so the existing CSS applies unchanged.
export default function SpendoraSelect({
  id,
  value,
  onChange,
  placeholder,
  options,
  kind
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const selected = options.find(o => (o.value ?? '') === (value ?? ''));

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
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

  const triggerProps = {};
  if (kind === 'category' && value) {
    triggerProps['data-category'] = value;
    triggerProps.style = { '--category-selected-color': getCategoryColor(value) };
  }
  if (kind === 'payment' && value) {
    triggerProps['data-payment-method'] = value;
    triggerProps.style = { '--payment-selected-color': getPaymentMethodColor(value) };
  }

  return (
    <div className={`spendora-select${open ? ' is-open' : ''}`} data-select-root data-placeholder={placeholder} ref={rootRef}>
      <input type="hidden" id={id} value={value ?? ''} readOnly />
      <button
        type="button"
        className={`spendora-select-trigger${value ? ' has-value' : ''}`}
        data-select-trigger
        aria-expanded={open ? 'true' : 'false'}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(o => !o);
        }}
        {...triggerProps}
      >
        <span data-select-label>{selected ? selected.label : placeholder}</span>
        <i aria-hidden="true" />
      </button>
      <div className="spendora-select-menu" data-select-menu hidden={!open}>
        {options.map(opt => {
          const optValue = opt.value ?? '';
          const isSelected = optValue === (value ?? '');
          return (
            <button
              key={optValue + opt.label}
              type="button"
              className={`${optValue === '' ? 'is-placeholder ' : ''}${isSelected ? 'is-selected' : ''}`.trim()}
              data-select-option={optValue}
              aria-selected={isSelected ? 'true' : 'false'}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange(optValue);
                setOpen(false);
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
