import { Link } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { useCart } from '../../context/CartContext.jsx'
import { getProductImage } from '../../data/images.js'
import { formatPKR } from '../../lib/format.js'
import QuantitySelector from '../common/QuantitySelector.jsx'

export default function CartItemRow({ item }) {
  const { updateQuantity, removeItem } = useCart()

  return (
    <div className="flex gap-3 py-4">
      <Link to={`/product/${item.id}`} className="shrink-0">
        <img
          src={getProductImage(item, 150)}
          alt={item.name}
          className="h-16 w-16 rounded-md object-cover"
        />
      </Link>
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/product/${item.id}`} className="text-sm font-medium text-navy-900 hover:text-accent-600">
            {item.name}
          </Link>
          <button
            type="button"
            onClick={() => removeItem(item.id)}
            aria-label={`Remove ${item.name}`}
            className="text-steel-400 hover:text-red-600"
          >
            <Trash2 size={16} />
          </button>
        </div>
        <span className="text-xs text-steel-500">{formatPKR(item.price)} each</span>
        <div className="mt-1 flex items-center justify-between">
          <QuantitySelector
            size="sm"
            value={item.quantity}
            onChange={(qty) => updateQuantity(item.id, qty)}
          />
          <span className="text-sm font-semibold text-navy-900">
            {formatPKR(item.price * item.quantity)}
          </span>
        </div>
      </div>
    </div>
  )
}
