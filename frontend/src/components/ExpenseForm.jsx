import { useEffect, useState } from 'react';
import SpendoraSelect from './SpendoraSelect';
import DatePicker from './DatePicker';
import { getDateInputValue } from '../utils/dates';
import { CATEGORIES, PAYMENT_METHODS } from '../utils/themes';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

// React equivalent of the dashboard expense form + create/update submit handler.
// Same ids, same validation messages, same API payloads.
export default function ExpenseForm({ editing, onDone }) {
  const { notify } = useToast();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [date, setDate] = useState(() => getDateInputValue(new Date()));

  useEffect(() => {
    if (editing) {
      setDescription(editing.description || '');
      setAmount(editing.amount ?? '');
      setCategory(editing.category || '');
      setPaymentMethod(editing.paymentMethod || '');
      setDate(typeof editing.date === 'string' ? editing.date.slice(0, 10) : getDateInputValue(new Date()));
    }
  }, [editing]);

  const reset = () => {
    setDescription('');
    setAmount('');
    setCategory('');
    setPaymentMethod('');
    setDate(getDateInputValue(new Date()));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const expenseData = {
      description: description.trim(),
      amount: parseFloat(amount),
      category,
      paymentMethod,
      date
    };
    if (!expenseData.date) {
      notify('Choose a date before adding the expense.', 'error');
      return;
    }
    if (!expenseData.category) {
      notify('Choose a category before adding the expense.', 'error');
      return;
    }
    if (!expenseData.paymentMethod) {
      notify('Choose a payment method before adding the expense.', 'error');
      return;
    }
    try {
      let result;
      if (editing?._id) {
        result = await api.updateExpense(editing._id, expenseData);
      } else {
        result = await api.createExpense(expenseData);
      }
      if (result.success) {
        notify(result.message, 'success');
        reset();
        onDone({ mode: editing ? 'updated' : 'created' });
      } else {
        notify('Error: ' + result.error, 'error');
      }
    } catch (error) {
      notify('Error: ' + error.message, 'error');
    }
  };

  return (
    <section className="panel form-panel">
      <div className="panel-head">
        <h2>Add expense</h2>
        <span className="dots">...</span>
      </div>
      <form id="expenseForm" onSubmit={handleSubmit}>
        <div className="form-grid">
          <input
            type="text"
            id="description"
            placeholder="Description"
            required
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
          <input
            type="number"
            id="amount"
            placeholder="Amount (INR)"
            step="0.01"
            min="0"
            required
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
          <SpendoraSelect
            id="category"
            value={category}
            onChange={setCategory}
            placeholder="Category"
            kind="category"
            options={[{ value: '', label: 'Category' }, ...CATEGORIES.map(c => ({ value: c, label: c }))]}
          />
          <SpendoraSelect
            id="paymentMethod"
            value={paymentMethod}
            onChange={setPaymentMethod}
            placeholder="Payment method"
            kind="payment"
            options={[{ value: '', label: 'Payment method' }, ...PAYMENT_METHODS.map(m => ({ value: m, label: m }))]}
          />
          <div className="spendora-date-picker" id="expenseDatePicker">
            <DatePicker id="date" value={date} onChange={setDate} placeholder="Select date" defaultToday />
          </div>
          <button type="submit" className={`btn-primary${editing ? ' is-updating' : ''}`} id="submitBtn">
            {editing ? 'Update Expense' : 'Add Expense'}
          </button>
        </div>
      </form>
    </section>
  );
}
