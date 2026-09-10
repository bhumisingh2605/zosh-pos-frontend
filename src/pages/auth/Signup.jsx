import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell from './AuthShell';
import { Field, Input, Select } from '../../components/Field';
import Button from '../../components/Button';
import { ErrorNote } from '../../components/Layout';
import { useAuthStore } from '../../store/authStore';

const ROLE_OPTIONS = [
  { value: 'ROLE_STORE_ADMIN', label: 'Store admin — owns and sets up a store' },
  { value: 'ROLE_STORE_MANAGER', label: 'Store manager' },
  { value: 'ROLE_BRANCH_MANAGER', label: 'Branch manager' },
  { value: 'ROLE_BRANCH_CASHIER', label: 'Cashier' },
];

export default function Signup() {
  const signup = useAuthStore((s) => s.signup);
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', password: '', role: 'ROLE_STORE_ADMIN',
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signup(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Get set up"
      title="Create your account"
      subtitle="Store admins can set up a new store next. Branch staff should ask their manager for login access instead."
      footer={<>Already registered? <Link to="/login" className="text-brass hover:underline">Sign in</Link></>}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <ErrorNote message={error} />
        <Field label="Full name" required>
          <Input required value={form.fullName} onChange={update('fullName')} placeholder="Asha Patil" />
        </Field>
        <Field label="Email" required>
          <Input type="email" required value={form.email} onChange={update('email')} placeholder="you@yourstore.com" />
        </Field>
        <Field label="Phone">
          <Input value={form.phone} onChange={update('phone')} placeholder="98765 43210" />
        </Field>
        <Field label="Password" required hint="At least 6 characters.">
          <Input type="password" required minLength={6} value={form.password} onChange={update('password')} placeholder="••••••••" />
        </Field>
        <Field label="Role" required>
          <Select value={form.role} onChange={update('role')}>
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </Select>
        </Field>
        <Button type="submit" className="w-full" size="lg" loading={loading}>
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}
