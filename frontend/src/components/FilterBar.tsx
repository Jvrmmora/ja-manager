import React, { useEffect, useRef, useState } from 'react';
import type { PaginationQuery } from '../types';
import MultiGroupSelect from './MultiGroupSelect';

interface FilterBarProps {
  filters: PaginationQuery;
  onFiltersChange: (filters: PaginationQuery) => void;
  /** Contenido extra a la derecha de la búsqueda (p. ej. el cambio Tarjetas/Lista) */
  rightSlot?: React.ReactNode;
}

const AGE_OPTIONS = ['13-15', '16-18', '19-21', '22-25', '26-30', '30+'];
const ROLE_OPTIONS: Array<[string, string]> = [
  ['colaborador', 'Colaborador'],
  ['lider juvenil', 'Líder Juvenil'],
  ['joven adventista', 'Joven Adventista'],
  ['simpatizante', 'Simpatizante'],
  ['director', 'Director'],
  ['subdirector', 'Subdirector'],
  ['club guias', 'Club Guías'],
  ['club conquistadores', 'Club Conquistadores'],
  ['club aventureros', 'Club Aventureros'],
  ['escuela sabatica', 'Escuela Sabática'],
];
const SORT_OPTIONS: Array<[string, string]> = [
  ['fullName', 'Nombre'],
  ['birthday', 'Fecha de nacimiento'],
  ['email', 'Email'],
  ['role', 'Rol'],
  ['gender', 'Género'],
  ['createdAt', 'Fecha de registro'],
  ['updatedAt', 'Última actualización'],
];

const selectCls =
  'field-brand h-11 !rounded-xl !px-3 text-sm normal-case tracking-normal';
const labelCls =
  'flex flex-col gap-1.5 text-xs font-bold uppercase tracking-[0.06em] text-cocoa-400 dark:text-white/50';

const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFiltersChange,
  rightSlot,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(filters.search || '');
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  // Mantener el input sincronizado cuando los filtros cambian desde fuera (p. ej. "Limpiar")
  useEffect(() => {
    setSearch(filters.search || '');
  }, [filters.search]);

  // Búsqueda con debounce: una sola petición al dejar de escribir
  useEffect(() => {
    if ((filtersRef.current.search || '') === search) return;
    const id = setTimeout(() => {
      const next: PaginationQuery = { ...filtersRef.current, page: 1 };
      if (search) next.search = search;
      else delete next.search;
      onFiltersChange(next);
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const update = (key: keyof PaginationQuery, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined,
      page: 1,
    });
  };

  const handleGroupsChange = (groups: string[]) => {
    onFiltersChange({
      ...filters,
      groups: groups.length > 0 ? groups : undefined,
      page: 1,
    });
  };

  const clearFilters = () => {
    const cleared: PaginationQuery = {
      page: 1,
      sortBy: 'fullName',
      sortOrder: 'asc',
    };
    if (filters.limit !== undefined) cleared.limit = filters.limit;
    onFiltersChange(cleared);
  };

  const chips: Array<{ key: keyof PaginationQuery; label: string }> = [];
  if (filters.search) chips.push({ key: 'search', label: `“${filters.search}”` });
  if (filters.ageRange) chips.push({ key: 'ageRange', label: `${filters.ageRange} años` });
  if (filters.gender) chips.push({ key: 'gender', label: filters.gender });
  if (filters.role) {
    chips.push({
      key: 'role',
      label: ROLE_OPTIONS.find(([v]) => v === filters.role)?.[1] || filters.role,
    });
  }
  if (filters.groups && filters.groups.length > 0) {
    chips.push({
      key: 'groups',
      label:
        filters.groups.length === 1
          ? `Grupo ${filters.groups[0]}`
          : `${filters.groups.length} grupos`,
    });
  }
  const panelCount = chips.filter(c => c.key !== 'search').length;
  const sortLabel =
    (SORT_OPTIONS.find(([v]) => v === (filters.sortBy || 'fullName'))?.[1] ||
      'Nombre') + (filters.sortOrder === 'desc' ? ' · Z–A' : ' · A–Z');

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
        <label className="flex h-12 min-w-0 flex-[1_1_100%] items-center gap-2.5 rounded-2xl border-[1.5px] border-sand-300 bg-white px-4 text-cocoa-400 transition focus-within:border-brand-orange focus-within:ring-4 focus-within:ring-brand-orange/20 sm:flex-1 dark:border-white/15 dark:bg-ink-800 dark:text-white/50">
          <svg className="h-[18px] w-[18px] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, teléfono o email…"
            aria-label="Buscar jóvenes"
            className="min-w-0 flex-1 border-0 bg-transparent text-[15px] text-cocoa-900 placeholder-cocoa-400 outline-none focus:ring-0 dark:text-white dark:placeholder-white/40"
          />
        </label>
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
          className={`inline-flex h-12 items-center gap-2 rounded-2xl border-[1.5px] px-4 text-sm font-semibold transition-colors ${
            open || panelCount > 0
              ? 'border-cocoa-900 bg-cocoa-900 text-white dark:border-white dark:bg-white dark:text-ink-950'
              : 'border-sand-300 bg-white text-cocoa-600 hover:border-cocoa-400 dark:border-white/15 dark:bg-ink-800 dark:text-white/80'
          }`}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
            <path d="M4 6h16M7 12h10M10 18h4" />
          </svg>
          Filtros
          {panelCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-amber text-[11px] font-extrabold text-ink-950">
              {panelCount}
            </span>
          )}
        </button>
        <label className="relative inline-flex h-12 flex-1 items-center sm:flex-none">
          <span className="sr-only">Ordenar por</span>
          <select
            value={`${filters.sortBy || 'fullName'}|${filters.sortOrder || 'asc'}`}
            onChange={e => {
              const [sortBy, sortOrder] = e.target.value.split('|');
              onFiltersChange({
                ...filters,
                sortBy: sortBy as NonNullable<PaginationQuery['sortBy']>,
                sortOrder: sortOrder as NonNullable<PaginationQuery['sortOrder']>,
                page: 1,
              });
            }}
            className="h-12 w-full appearance-none rounded-2xl border-[1.5px] border-sand-300 bg-white pl-4 pr-9 text-sm font-semibold text-cocoa-600 focus:border-brand-orange focus:outline-none focus:ring-4 focus:ring-brand-orange/20 sm:w-auto dark:border-white/15 dark:bg-ink-800 dark:text-white/80"
            title={sortLabel}
          >
            {SORT_OPTIONS.map(([value, label]) => (
              <React.Fragment key={value}>
                <option value={`${value}|asc`}>{label} · A–Z</option>
                <option value={`${value}|desc`}>{label} · Z–A</option>
              </React.Fragment>
            ))}
          </select>
          <svg className="pointer-events-none absolute right-3 h-4 w-4 text-cocoa-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </label>
        {rightSlot}
      </div>

      {open && (
        <div className="grid grid-cols-1 gap-3 rounded-[18px] border border-sand-200 bg-cream p-4 sm:grid-cols-2 lg:grid-cols-4 dark:border-white/10 dark:bg-white/[0.03]">
          <label className={labelCls}>
            Edad
            <select
              value={filters.ageRange || ''}
              onChange={e => update('ageRange', e.target.value)}
              className={selectCls}
            >
              <option value="">Todas</option>
              {AGE_OPTIONS.map(a => (
                <option key={a} value={a}>
                  {a} años
                </option>
              ))}
            </select>
          </label>
          <label className={labelCls}>
            Género
            <select
              value={filters.gender || ''}
              onChange={e => update('gender', e.target.value)}
              className={selectCls}
            >
              <option value="">Todos</option>
              <option value="masculino">Masculino</option>
              <option value="femenino">Femenino</option>
            </select>
          </label>
          <label className={labelCls}>
            Rol
            <select
              value={filters.role || ''}
              onChange={e => update('role', e.target.value)}
              className={selectCls}
            >
              <option value="">Todos</option>
              {ROLE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div className={labelCls}>
            Grupos
            <MultiGroupSelect
              value={filters.groups || []}
              onChange={handleGroupsChange}
              className="w-full normal-case tracking-normal"
            />
          </div>
        </div>
      )}

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] text-cocoa-400 dark:text-white/50">Activos:</span>
          {chips.map(chip => (
            <button
              key={chip.key}
              type="button"
              onClick={() => {
                const next: PaginationQuery = { ...filters, page: 1 };
                delete next[chip.key];
                onFiltersChange(next);
              }}
              className="inline-flex h-[30px] items-center gap-1.5 rounded-full border border-[#F6D6B8] bg-sand-50 pl-3 pr-2 text-[13px] font-semibold capitalize text-[#9A3412] transition-colors hover:border-[#F4B58C] dark:border-brand-orange/30 dark:bg-brand-orange/10 dark:text-brand-amber"
              aria-label={`Quitar filtro ${chip.label}`}
            >
              {chip.label}
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          ))}
          <button
            type="button"
            onClick={clearFilters}
            className="h-[30px] px-2 text-[13px] font-semibold text-brand-deep hover:text-brand-wine dark:text-brand-amber"
          >
            Limpiar filtros
          </button>
        </div>
      )}
    </div>
  );
};

export default FilterBar;
