import { Search } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { bikeBrands, bikes, bikesByBrand } from '../../data/bikes';

/**
 * "Find Parts for Your Bike" — brand, then model, then straight to the filtered
 * shop. Compatibility is the question customers actually arrive with.
 */
export const BikeFinder = () => {
  const navigate = useNavigate();
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');

  const models = brand ? bikesByBrand(brand) : bikes;

  return (
    <form
      className="card grid gap-4 border-ink-200 bg-ink-50 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        const target = models.find((bike) => bike.slug === model);
        navigate(target ? `/bike/${target.slug}` : '/shop');
      }}
    >
      <div>
        <label htmlFor="finder-brand" className="field-label">
          Bike brand
        </label>
        <select
          id="finder-brand"
          className="field"
          value={brand}
          onChange={(event) => {
            setBrand(event.target.value);
            setModel('');
          }}
        >
          <option value="">All brands</option>
          {bikeBrands.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="finder-model" className="field-label">
          Model
        </label>
        <select id="finder-model" className="field" value={model} onChange={(event) => setModel(event.target.value)}>
          <option value="">Select model</option>
          {models.map((bike) => (
            <option key={bike.id} value={bike.slug}>
              {bike.name}
            </option>
          ))}
        </select>
      </div>

      <button type="submit" className="btn-dark sm:mb-0">
        <Search className="size-4" aria-hidden="true" /> Find parts
      </button>
    </form>
  );
};
