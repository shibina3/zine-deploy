import { useMemo, useState } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import type { Service } from '@/types';
import { useServices } from '@/hooks/useDb';
import { useIsOwner } from '@/stores/authStore';
import { cn } from '@/utils/cn';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { SearchInput } from '@/components/common/Field';
import { EmptyState, PageHeader } from '@/components/common/PageHeader';
import { ServiceCard } from './ServiceCard';
import { ServiceDialog } from './ServiceDialog';
import { RecipeDrawer } from './RecipeDrawer';

export function ServicesPage() {
  const services = useServices(true);
  const owner = useIsOwner();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('ALL');
  const [editing, setEditing] = useState<Service | null>(null);
  const [creating, setCreating] = useState(false);
  const [recipeFor, setRecipeFor] = useState<Service | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(services.map((service) => service.category))).sort(),
    [services],
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return services
      .filter((service) => (category === 'ALL' ? true : service.category === category))
      .filter((service) => !term || service.name.toLowerCase().includes(term))
      .sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name));
  }, [services, category, query]);

  return (
    <div>
      <PageHeader
        eyebrow="Menu"
        title="Services"
        description="Your price list drives billing and appointment durations. Old bills keep the price they were billed at."
        actions={
          owner ? (
            <Button leadingIcon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
              Add service
            </Button>
          ) : undefined
        }
      />

      <Card className="mb-5 flex flex-wrap items-center gap-3 p-3">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search services…"
          className="w-full sm:w-[280px]"
        />
        <div className="flex flex-wrap items-center gap-1.5">
          <CategoryChip label="All" active={category === 'ALL'} onClick={() => setCategory('ALL')} count={services.length} />
          {categories.map((item) => (
            <CategoryChip
              key={item}
              label={item}
              active={category === item}
              onClick={() => setCategory(item)}
              count={services.filter((service) => service.category === item).length}
            />
          ))}
        </div>
        <p className="ml-auto text-[12px] text-ink-500">
          {services.filter((service) => service.isActive).length} active
        </p>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Sparkles className="h-5 w-5" />}
            title={query || category !== 'ALL' ? 'No services match' : 'No services yet'}
            description="Add your first service with its price and duration to start billing."
            action={
              owner ? (
                <Button leadingIcon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
                  Add service
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onEdit={() => setEditing(service)}
              onRecipe={() => setRecipeFor(service)}
              readOnly={!owner}
            />
          ))}
        </div>
      )}

      <ServiceDialog
        open={creating || Boolean(editing)}
        service={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />

      <RecipeDrawer service={recipeFor} onClose={() => setRecipeFor(null)} />
    </div>
  );
}

function CategoryChip({
  label,
  active,
  onClick,
  count,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-colors',
        active
          ? 'border-ink-900 bg-ink-900 text-cream'
          : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300 hover:text-ink-900',
      )}
    >
      {label}
      <span className={cn('text-[10px]', active ? 'text-gold-300' : 'text-ink-400')}>{count}</span>
    </button>
  );
}
