import { CircleAlert } from 'lucide-react';
import { useState } from 'react';
import type { CustomerDetails, PaymentMethod } from '../../types';

export interface CheckoutFormValues extends CustomerDetails {
  paymentMethod: PaymentMethod;
}

interface CheckoutFormProps {
  onSubmit: (values: CheckoutFormValues) => void;
  submitting: boolean;
}

type Errors = Partial<Record<keyof CheckoutFormValues, string>>;

const initialValues: CheckoutFormValues = {
  name: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  area: '',
  postalCode: '',
  notes: '',
  paymentMethod: 'cod',
};

/** Payment methods the checkout is structured for; only COD is live today. */
const paymentMethods: { value: PaymentMethod; label: string; description: string; available: boolean }[] = [
  {
    value: 'cod',
    label: 'Cash on Delivery',
    description: 'Pay the courier in cash when your parts arrive.',
    available: true,
  },
  {
    value: 'easypaisa',
    label: 'Easypaisa',
    description: 'Coming soon — the checkout is ready for it once the merchant account is connected.',
    available: false,
  },
  {
    value: 'jazzcash',
    label: 'JazzCash',
    description: 'Coming soon — pending merchant credentials.',
    available: false,
  },
  {
    value: 'bank-transfer',
    label: 'Bank Transfer',
    description: 'Coming soon — account details will be shown here.',
    available: false,
  },
];

const isValidPhone = (value: string) => /^0?3\d{2}[\s-]?\d{7}$/.test(value.trim()) || /^\+92\s?3\d{2}[\s-]?\d{7}$/.test(value.trim());

export const CheckoutForm = ({ onSubmit, submitting }: CheckoutFormProps) => {
  const [values, setValues] = useState<CheckoutFormValues>(initialValues);
  const [errors, setErrors] = useState<Errors>({});

  const setField = (field: keyof CheckoutFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const validate = (): Errors => {
    const next: Errors = {};
    if (values.name.trim().length < 3) next.name = 'Enter the full name for the delivery.';
    if (!isValidPhone(values.phone)) next.phone = 'Enter a valid mobile number, for example 0300 1234567.';
    if (values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()))
      next.email = 'Enter a valid email address, or leave it blank.';
    if (values.address.trim().length < 8) next.address = 'Enter the full delivery address.';
    if (!values.city.trim()) next.city = 'Enter your city.';
    if (!values.area.trim()) next.area = 'Enter your area or nearest landmark.';
    if (values.postalCode.trim() && !/^\d{4,6}$/.test(values.postalCode.trim()))
      next.postalCode = 'Postal code should be 4–6 digits, or leave it blank.';
    return next;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const firstField = Object.keys(found)[0];
      document.getElementById(firstField)?.focus();
      return;
    }
    onSubmit(values);
  };

  const fieldError = (field: keyof CheckoutFormValues) =>
    errors[field] ? (
      <p id={`${field}-error`} className="mt-1.5 flex items-center gap-1.5 text-xs text-brand-700">
        <CircleAlert className="size-3.5 shrink-0" aria-hidden="true" />
        {errors[field]}
      </p>
    ) : null;

  const inputProps = (field: keyof CheckoutFormValues) => ({
    id: field,
    value: String(values[field] ?? ''),
    'aria-invalid': Boolean(errors[field]),
    'aria-describedby': errors[field] ? `${field}-error` : undefined,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setField(field, event.target.value),
    className: `field ${errors[field] ? 'border-brand-600' : ''}`,
  });

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-8">
      <section className="card p-5">
        <h2 className="text-base font-semibold text-ink-900">Customer information</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="name" className="field-label">
              Full name <span className="text-brand-600">*</span>
            </label>
            <input type="text" autoComplete="name" placeholder="e.g. Bilal Ahmed" {...inputProps('name')} />
            {fieldError('name')}
          </div>

          <div>
            <label htmlFor="phone" className="field-label">
              Mobile number <span className="text-brand-600">*</span>
            </label>
            <input type="tel" autoComplete="tel" inputMode="tel" placeholder="0300 1234567" {...inputProps('phone')} />
            {fieldError('phone')}
          </div>

          <div>
            <label htmlFor="email" className="field-label">
              Email <span className="text-ink-400">(optional)</span>
            </label>
            <input type="email" autoComplete="email" placeholder="you@example.com" {...inputProps('email')} />
            {fieldError('email')}
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="address" className="field-label">
              Delivery address <span className="text-brand-600">*</span>
            </label>
            <textarea rows={3} autoComplete="street-address" placeholder="House / shop number, street, landmark" {...inputProps('address')} />
            {fieldError('address')}
          </div>

          <div>
            <label htmlFor="city" className="field-label">
              City <span className="text-brand-600">*</span>
            </label>
            <input type="text" autoComplete="address-level2" placeholder="Lahore" {...inputProps('city')} />
            {fieldError('city')}
          </div>

          <div>
            <label htmlFor="area" className="field-label">
              Area <span className="text-brand-600">*</span>
            </label>
            <input type="text" autoComplete="address-level3" placeholder="Gulberg" {...inputProps('area')} />
            {fieldError('area')}
          </div>

          <div>
            <label htmlFor="postalCode" className="field-label">
              Postal code <span className="text-ink-400">(optional)</span>
            </label>
            <input type="text" inputMode="numeric" autoComplete="postal-code" placeholder="54000" {...inputProps('postalCode')} />
            {fieldError('postalCode')}
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="notes" className="field-label">
              Order notes <span className="text-ink-400">(optional)</span>
            </label>
            <textarea rows={2} placeholder="Bike model, or anything the rider should know" {...inputProps('notes')} />
          </div>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-base font-semibold text-ink-900">Payment method</h2>
        <ul className="mt-4 space-y-3">
          {paymentMethods.map((method) => (
            <li key={method.value}>
              <label
                className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors ${
                  values.paymentMethod === method.value ? 'border-brand-600 bg-brand-50/60' : 'border-ink-200'
                } ${method.available ? '' : 'cursor-not-allowed opacity-60'}`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={method.value}
                  checked={values.paymentMethod === method.value}
                  disabled={!method.available}
                  onChange={() => setField('paymentMethod', method.value)}
                  className="mt-0.5 size-4 border-ink-300 text-brand-600 focus:ring-brand-600"
                />
                <span>
                  <span className="block text-sm font-semibold text-ink-900">{method.label}</span>
                  <span className="mt-0.5 block text-xs text-ink-500">{method.description}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <button type="submit" className="btn-primary w-full" disabled={submitting}>
        {submitting ? 'Placing order…' : 'Place order'}
      </button>
      <p className="text-center text-xs text-ink-500">
        By placing this order you agree to our terms, shipping and return policies.
      </p>
    </form>
  );
};
