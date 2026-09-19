// Business-logic helpers ported verbatim from app.js.
// Same calculations, same outputs — only the DOM rendering moved into React.

import { normalizeSearchText } from './dates';

export function sumExpensesForMonth(expenses, monthKey) {
  return expenses
    .filter(expense => expense.date && expense.date.slice(0, 7) === monthKey)
    .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
}

export function getCategoryTotals(expenses) {
  const totals = expenses.reduce((acc, expense) => {
    const category = expense.category || 'Other';
    acc[category] = (acc[category] || 0) + Number(expense.amount || 0);
    return acc;
  }, {});
  return Object.entries(totals)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export function expenseMatchesSearch(expense, filters) {
  if (filters.category && expense.category !== filters.category) return false;
  if (filters.paymentMethod && expense.paymentMethod !== filters.paymentMethod) return false;
  if (filters.startDate && expense.date < filters.startDate) return false;
  if (filters.endDate && expense.date > filters.endDate) return false;
  if (!filters.query) return true;
  const searchableText = normalizeSearchText([
    expense.description,
    expense.category,
    expense.paymentMethod,
    expense.notes
  ].filter(Boolean).join(' '));
  return filters.query.split(/\s+/).every(term => searchableText.includes(term));
}

export function sortSearchExpenses(a, b, sort) {
  const amountA = Number(a.amount || 0);
  const amountB = Number(b.amount || 0);
  const dateA = new Date(a.date || a.createdAt || 0).getTime();
  const dateB = new Date(b.date || b.createdAt || 0).getTime();
  const nameA = (a.description || '').localeCompare(b.description || '');
  const categoryA = (a.category || '').localeCompare(b.category || '');
  switch (sort) {
    case 'date-asc':
      return dateA - dateB;
    case 'amount-desc':
      return amountB - amountA;
    case 'amount-asc':
      return amountA - amountB;
    case 'name-asc':
      return nameA;
    case 'category-asc':
      return categoryA || nameA;
    case 'date-desc':
    default:
      return dateB - dateA;
  }
}

export function filterSearchExpenses(expenses, filters) {
  return expenses
    .filter(expense => expenseMatchesSearch(expense, filters))
    .sort((a, b) => sortSearchExpenses(a, b, filters.sort));
}

export function getCategoryStats(expenses, sort = 'amount-desc') {
  const grouped = expenses.reduce((acc, expense) => {
    const category = expense.category || 'Other';
    if (!acc[category]) {
      acc[category] = {
        category,
        amount: 0,
        count: 0,
        payments: {},
        latestDate: '',
        largestExpense: null
      };
    }
    const amount = Number(expense.amount || 0);
    const paymentMethod = expense.paymentMethod || 'Unknown';
    acc[category].amount += amount;
    acc[category].count += 1;
    acc[category].payments[paymentMethod] = (acc[category].payments[paymentMethod] || 0) + 1;
    if (expense.date && expense.date > acc[category].latestDate) acc[category].latestDate = expense.date;
    if (!acc[category].largestExpense || amount > Number(acc[category].largestExpense.amount || 0)) {
      acc[category].largestExpense = expense;
    }
    return acc;
  }, {});
  const total = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const entries = Object.values(grouped).map(item => {
    const topPayment = Object.entries(item.payments).sort((a, b) => b[1] - a[1])[0];
    return {
      ...item,
      percent: total ? Math.round((item.amount / total) * 100) : 0,
      topPayment: topPayment ? topPayment[0] : 'None'
    };
  });
  entries.sort((a, b) => {
    switch (sort) {
      case 'amount-asc':
        return a.amount - b.amount || a.category.localeCompare(b.category);
      case 'name-asc':
        return a.category.localeCompare(b.category);
      case 'transactions-desc':
        return b.count - a.count || b.amount - a.amount;
      case 'amount-desc':
      default:
        return b.amount - a.amount || a.category.localeCompare(b.category);
    }
  });
  return { entries, total };
}

export function getBudgetStatus(percent, budget) {
  if (budget <= 0) {
    return {
      className: 'budget-idle',
      label: 'Set budget',
      shortLabel: 'Ready',
      message: 'Add your monthly budget to activate live tracking.'
    };
  }
  if (percent > 100) {
    return {
      className: 'budget-exceeded',
      label: 'Exceeded budget',
      shortLabel: 'Exceeded',
      message: 'You have exceeded this month’s budget. Review recent expenses.'
    };
  }
  if (percent >= 95) {
    return {
      className: 'budget-complete',
      label: 'Completed budget',
      shortLabel: 'Complete',
      message: 'Your monthly budget is essentially complete. Spend carefully.'
    };
  }
  if (percent >= 75) {
    return {
      className: 'budget-nearing',
      label: 'Nearing limit',
      shortLabel: 'Nearing',
      message: 'You are nearing your monthly limit. Keep an eye on upcoming expenses.'
    };
  }
  return {
    className: 'budget-within',
    label: 'Within budget',
    shortLabel: 'Health',
    message: 'You are within budget. Nice and steady.'
  };
}

export function formatWalletCardMask(number) {
  const digits = String(number || '').replace(/\D/g, '');
  const lastFour = digits.slice(-4) || '0000';
  return `**** ${lastFour}`;
}
