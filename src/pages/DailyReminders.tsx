import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Bell, Plus, PhoneCall, CheckCircle2 } from 'lucide-react';

interface DailyReminderItem {
  id: string;
  customer: string;
  loanFd: string;
  reminderType: 'Monthly Interest' | 'FD Maturity Payout' | 'Pledge Renewal' | 'Document Verification';
  dueDate: string;
  status: 'PENDING' | 'COMPLETED' | 'OVERDUE';
}

export const DailyReminders: React.FC = () => {
  const { showToast } = useApp();
  const [reminders, setReminders] = useState<DailyReminderItem[]>([
    {
      id: '1',
      customer: 'thayba (+91 98401 23456)',
      loanFd: 'GL-01 (Gold Loan)',
      reminderType: 'Monthly Interest',
      dueDate: 'Today, 11:00 AM',
      status: 'PENDING'
    },
    {
      id: '2',
      customer: 'Arun Kumar (+91 94440 11223)',
      loanFd: 'FD-02 (Fixed Deposit)',
      reminderType: 'FD Maturity Payout',
      dueDate: 'Today, 02:00 PM',
      status: 'PENDING'
    },
    {
      id: '3',
      customer: 'Rajan Sundaram (+91 98840 98765)',
      loanFd: 'GL-02 (Gold Loan)',
      reminderType: 'Pledge Renewal',
      dueDate: 'Tomorrow',
      status: 'COMPLETED'
    }
  ]);

  const [newCustomer, setNewCustomer] = useState('');
  const [newLoanFd, setNewLoanFd] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.trim()) return;

    setReminders((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        customer: newCustomer,
        loanFd: newLoanFd || 'General Notice',
        reminderType: 'Monthly Interest',
        dueDate: 'Today',
        status: 'PENDING'
      }
    ]);
    setNewCustomer('');
    setNewLoanFd('');
    showToast('Reminder added successfully!', 'success');
  };

  const handleAction = (r: DailyReminderItem) => {
    setReminders((prev) =>
      prev.map((item) => (item.id === r.id ? { ...item, status: 'COMPLETED' } : item))
    );
    showToast(`Notice initiated for ${r.customer}!`, 'success');
  };

  return (
    <div className="page-content">
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              <Bell size={18} color="var(--color-primary-accent)" />
              <span>Daily Follow-ups &amp; Customer Reminders</span>
            </h2>
            <p className="card-description">Actionable borrower contact tasks, interest collection alerts, and maturity payouts</p>
          </div>
        </div>

        {/* Quick Add Bar */}
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="input-control"
            style={{ flex: 2, minWidth: '200px' }}
            placeholder="Customer name & phone..."
            value={newCustomer}
            onChange={(e) => setNewCustomer(e.target.value)}
          />
          <input
            type="text"
            className="input-control"
            style={{ flex: 1, minWidth: '150px' }}
            placeholder="Loan / FD reference (e.g. GL-01)..."
            value={newLoanFd}
            onChange={(e) => setNewLoanFd(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">
            <Plus size={15} />
            <span>Add Task</span>
          </button>
        </form>

        {/* Table */}
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>CUSTOMER</th>
                <th>LOAN / FD</th>
                <th>REMINDER TYPE</th>
                <th>DUE DATE</th>
                <th>STATUS</th>
                <th style={{ textAlign: 'center' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {reminders.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>{r.customer}</td>
                  <td style={{ fontWeight: 600 }}>{r.loanFd}</td>
                  <td>
                    <span className="badge badge-gold">{r.reminderType}</span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{r.dueDate}</td>
                  <td>
                    <span
                      className={`badge ${
                        r.status === 'COMPLETED'
                          ? 'badge-success'
                          : r.status === 'OVERDUE'
                          ? 'badge-danger'
                          : 'badge-warning'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      className={`btn btn-sm ${r.status === 'COMPLETED' ? 'btn-secondary' : 'btn-primary'}`}
                      onClick={() => handleAction(r)}
                    >
                      {r.status === 'COMPLETED' ? <CheckCircle2 size={13} /> : <PhoneCall size={13} />}
                      <span>{r.status === 'COMPLETED' ? 'Done' : 'Contact'}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
