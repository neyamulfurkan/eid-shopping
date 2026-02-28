'use client';

import React, { useId } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type { HomepageSection } from '@/lib/types';

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────

interface DragSortListProps {
  items: HomepageSection[];
  onChange: (items: HomepageSection[]) => void;
}

// ─────────────────────────────────────────────
// Sortable Row
// ─────────────────────────────────────────────

interface SortableRowProps {
  item: HomepageSection;
  onToggle: (key: string, isVisible: boolean) => void;
}

/**
 * Individual sortable row rendered inside the DragSortList.
 * Exposes a drag handle on the left and a visibility toggle on the right.
 *
 * @param item - The homepage section data for this row.
 * @param onToggle - Callback invoked when the visibility toggle changes.
 */
const SortableRow: React.FC<SortableRowProps> = ({ item, onToggle }) => {
  const toggleId = useId();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.key });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-xl border border-brand-secondary/20 bg-brand-surface px-4 py-3 shadow-sm"
    >
      {/* Drag handle */}
      <button
        type="button"
        className="cursor-grab touch-none text-brand-text/40 hover:text-brand-text/70 active:cursor-grabbing"
        aria-label={`Drag to reorder ${item.labelEn}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>

      {/* Section label */}
      <span className="flex-1 text-sm font-medium text-brand-text">
        {item.labelEn}
        <span className="ml-2 text-xs text-brand-text/50">{item.labelBn}</span>
      </span>

      {/* Visibility toggle */}
      <label
        htmlFor={toggleId}
        className="relative inline-flex cursor-pointer items-center"
        aria-label={`Toggle visibility for ${item.labelEn}`}
      >
        <input
          id={toggleId}
          type="checkbox"
          className="sr-only"
          checked={item.isVisible}
          onChange={(e) => onToggle(item.key, e.target.checked)}
        />
        <div
          className={`h-6 w-11 rounded-full transition-colors duration-200 ${
            item.isVisible ? 'bg-brand-primary' : 'bg-brand-text/20'
          }`}
        />
        <div
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
            item.isVisible ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </label>
    </div>
  );
};

// ─────────────────────────────────────────────
// DragSortList
// ─────────────────────────────────────────────

/**
 * Drag-and-drop sortable list component for reordering homepage sections.
 * Each row exposes a grip handle for dragging and a toggle switch for visibility.
 *
 * @param items - Current ordered array of HomepageSection objects.
 * @param onChange - Callback invoked with the updated items array after any reorder or toggle.
 */
export const DragSortList: React.FC<DragSortListProps> = ({ items, onChange }) => {
  const dndContextId = useId();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        // Require a small movement before activating drag to allow toggle clicks.
        distance: 8,
      },
    })
  );

  /**
   * Handles the end of a drag event.
   * Reorders the items array using arrayMove and notifies the parent via onChange.
   */
  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((item) => item.key === active.id);
    const newIndex = items.findIndex((item) => item.key === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
      ...item,
      order: index,
    }));

    onChange(reordered);
  };

  /**
   * Handles a visibility toggle for a specific section.
   * Produces a new items array with the updated isVisible flag and calls onChange.
   *
   * @param key - The section key to update.
   * @param isVisible - The new visibility value.
   */
  const handleToggle = (key: string, isVisible: boolean): void => {
    const updated = items.map((item) =>
      item.key === key ? { ...item, isVisible } : item
    );
    onChange(updated);
  };

  const sortableIds = items.map((item) => item.key);

  return (
    <DndContext
      id={dndContextId}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <SortableRow key={item.key} item={item} onToggle={handleToggle} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};