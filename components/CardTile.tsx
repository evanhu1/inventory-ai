import clsx from 'clsx'
import type { Card } from '@/lib/types'

type CardTileProps = {
  card: Card
  selected?: boolean
  selectable?: boolean
  onToggle?: (cardId: number) => void
  compact?: boolean
  reveal?: boolean
}

export function CardTile({ card, selected, selectable, onToggle, compact, reveal }: CardTileProps) {
  const power = Math.max(6, 18 - Math.min(card.editionNumber, 3) * 3) + (card.isShiny ? 15 : 0)

  return (
    <button
      type="button"
      onClick={() => onToggle?.(card.id)}
      disabled={!selectable}
      className={clsx(
        'group relative overflow-hidden border text-left transition-all duration-200',
        'bg-surface',
        card.isShiny ? 'animate-shiny-pulse border-shiny/50' : 'border-edge',
        selectable && 'cursor-pointer hover:-translate-y-0.5 hover:border-gold/40',
        selected && '!border-gold ring-1 ring-gold/50',
        !selectable && 'cursor-default',
        reveal && 'animate-card-reveal',
      )}
    >
      {card.isShiny && (
        <div className="pointer-events-none absolute inset-0 z-10 animate-shimmer opacity-60" />
      )}

      <div className={clsx('relative overflow-hidden', compact ? 'aspect-square' : 'aspect-[4/5]')}>
        <img
          src={card.imageUrl}
          alt={card.itemName}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />

        <div className="absolute left-2 top-2 bg-base/80 px-2 py-0.5 font-mono text-[10px] tracking-wider text-dim">
          #{card.editionNumber}
        </div>

        {card.isShiny && (
          <div className="absolute right-2 top-2 bg-shiny/20 px-2 py-0.5 font-mono text-[10px] tracking-wider text-shiny">
            SHINY
          </div>
        )}

        <div className="absolute bottom-2 right-2 font-mono text-lg font-bold text-gold">
          {power}
        </div>

        <div className="absolute bottom-2 left-2 right-12">
          <p className="font-display text-xl leading-tight text-white">{card.itemName}</p>
        </div>
      </div>

      {!compact && (
        <div className="space-y-2 p-3">
          <p className="text-xs leading-relaxed text-dim">{card.flavorText}</p>

          <div className="flex flex-wrap gap-1">
            {card.traits.map((tag) => (
              <span
                key={tag}
                className="bg-gold/8 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-gold-dim"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-1 border-t border-edge pt-2 font-mono text-[10px]">
            <div>
              <span className="text-faint">FORGED BY </span>
              <span className="text-dim">{card.craftedBy}</span>
            </div>
            <div>
              <span className="text-faint">ORIGIN </span>
              <span className="text-dim">{new Date(card.craftedAt).toLocaleDateString()}</span>
            </div>
            {card.previousOwners.length > 0 && (
              <div className="col-span-2">
                <span className="text-faint">LINEAGE </span>
                <span className="text-dim">{card.previousOwners.length} keeper{card.previousOwners.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          {card.ingredients.length > 0 && (
            <div className="border-t border-mystic/20 pt-2 font-mono text-[10px] text-mystic-light">
              FUSED: {card.ingredients.join(' + ')}
            </div>
          )}
        </div>
      )}
    </button>
  )
}
