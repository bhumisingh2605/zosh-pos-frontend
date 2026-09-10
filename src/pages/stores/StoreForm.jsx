import { useState } from 'react';
import { Field, Input, Select, Textarea } from '../../components/Field';
import Button from '../../components/Button';
import { ErrorNote } from '../../components/Layout';

const STORE_TYPES = ['Grocery', 'Apparel', 'Electronics', 'Pharmacy', 'Restaurant', 'Bakery', 'General'];

export default function StoreForm({ initial, onSubmit, submitLabel = 'Save store' }) {
  const [form, setForm] = useState({
    brand: initial?.brand || '',
    description: initial?.description || '',
    storeType: initial?.storeType || STORE_TYPES[0],
    address: initial?.contact?.address || '',
    phone: initial?.contact?.phone || '',
    email: initial?.contact?.email || '',
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onSubmit({
        brand: form.brand,
        description: form.description,
        storeType: form.storeType,
        contact: { address: form.address, phone: form.phone, email: form.email },
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the store.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ErrorNote message={error} />
      <Field label="Store name" required>
        <Input required value={form.brand} onChange={update('brand')} placeholder="Sunrise Mart" />
      </Field>
      <Field label="Description">
        <Textarea value={form.description} onChange={update('description')} placeholder="What does this store sell?" />
      </Field>
      <Field label="Store type">
        <Select value={form.storeType} onChange={update('storeType')}>
          {STORE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
      </Field>
      <Field label="Address">
        <Input value={form.address} onChange={update('address')} placeholder="123 Market Street" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Phone">
          <Input value={form.phone} onChange={update('phone')} placeholder="98765 43210" />
        </Field>
        <Field label="Contact email">
          <Input type="email" value={form.email} onChange={update('email')} placeholder="store@example.com" />
        </Field>
      </div>
      <Button type="submit" className="w-full" loading={loading}>{submitLabel}</Button>
    </form>
  );
}
