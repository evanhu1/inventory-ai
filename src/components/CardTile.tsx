import clsx from 'clsx'
import type { Card } from '../lib/types'

type CardTileProps = {
  card: Card
  selected?: boolean
  selectable?: boolean
  onToggle?: (cardId: string) => void
}

export function CardTile({ card, selected, selectable, onToggle }: CardTileProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle?.(card.id)}
      className={clsx(
        'group overflow-hidden rounded-[28px] border bg-slate-950/70 text-left shadow-[0_20px_80px_rgba(8,15,30,0.4)] transition hover:-translate-y-1',
        card.shiny ? 'border-amber-300/70 ring-1 ring-amber-200/40' : 'border-white/10',
        selectable && 'cursor-pointer',
        selected && 'border-orange-300 ring-2 ring-orange-300/70',
      )}
    >
      <div className="relative aspect-[3/4] overflow-hidden">
        <img src={card.imageUrl} alt={card.word} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/10 to-transparent" />
        <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-slate-950/80 px-3 py-1 text-xs uppercase tracking-[0.25em] text-slate-200">
          #{card.serialNumber}
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <p className="font-serif text-3xl text-white">{card.word}</p>
          <p className="mt-1 text-sm text-slate-300">{card.flavorText}</p>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div className="flex flex-wrap gap-2">
          {card.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-white/8 px-3 py-1 text-xs text-slate-200">
              {tag}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm text-slate-300">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Power</p>
            <p>{card.power}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Crafted By</p>
            <p>{card.craftedByUsername}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Origin</p>
            <p>{new Date(card.craftedAt).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Lineage</p>
            <p>{card.previousOwners.length + 1} owners</p>
          </div>
        </div>
        {card.ingredients.length > 0 && (
          <p className="text-sm text-amber-200">Fusion: {card.ingredients.join(' + ')}</p>
        )}
      </div>
    </button>
  )
}
