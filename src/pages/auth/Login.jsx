import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell from './AuthShell';
import { Field, Input } from '../../components/Field';
import Button from '../../components/Button';
import { ErrorNote } from '../../components/Layout';
import { useAuthStore } from '../../store/authStore';

export default function Login() {
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to the counter"
      subtitle="Use your store credentials to open the till."
      footer={<>New to Zosh? <Link to="/signup" className="text-brass hover:underline">Create a store account</Link></>}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <ErrorNote message={error} />
        <Field label="Email" required>
          <Input
            type="email"
            required
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@yourstore.com"
          />
        </Field>
        <Field label="Password" required>
          <Input
            type="password"
            required
            autoComplete="current-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="••••••••"
          />
        </Field>
        <Button type="submit" className="w-full" size="lg" loading={loading}>
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
}
