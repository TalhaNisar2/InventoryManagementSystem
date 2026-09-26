"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Category } from "@/lib/types";
import { useStore } from "@/lib/store";
import { Field, Input, Textarea } from "./FormControls";

const PRESET_COLORS = ["#C97A24", "#1F9D6C", "#3B6EA5", "#8A5518", "#B4860B", "#6B7080", "#9153C9", "#C6432F"];

export default function CategoryForm({ category, onDone }: { category?: Category; onDone: () => void }) {
  const addCategory = useStore((s) => s.addCategory);
  const updateCategory = useStore((s) => s.updateCategory);

  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [color, setColor] = useState(category?.color ?? PRESET_COLORS[0]);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Category name is required");
      return;
    }
    const payload = { name: name.trim(), description: description.trim(), color };
    if (category) {
      updateCategory(category.id, payload);
      toast.success(`${payload.name} updated`);
    } else {
      addCategory(payload);
      toast.success(`${payload.name} added`);
    }
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Category name">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Electronics" />
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </Field>
      <Field label="Description">
        <Textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What kind of items belong here"
        />
      </Field>
      <Field label="Color tag">
        <div className="flex flex-wrap items-center gap-2">
          {PRESET_COLORS.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setColor(c)}
              className="h-8 w-8 rounded-full ring-offset-2 transition-shadow"
              style={{ backgroundColor: c, boxShadow: color === c ? `0 0 0 2px ${c}` : undefined }}
              aria-label={`Choose color ${c}`}
            />
          ))}
          <div className="relative h-8 w-8">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-full border-2 border-dashed border-line bg-transparent p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch-wrapper]:rounded-full [&::-webkit-color-swatch-wrapper]:p-0"
              title="Open the color picker for a custom shade"
              aria-label="Choose a custom color"
            />
            {!PRESET_COLORS.includes(color) && (
              <span
                className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-offset-2"
                style={{ boxShadow: `0 0 0 2px ${color}` }}
              />
            )}
          </div>
          <span className="ml-1 flex items-center gap-1.5 text-xs text-muted">
            <span className="h-3 w-3 rounded-full border border-line" style={{ backgroundColor: color }} />
            {color.toUpperCase()}
          </span>
        </div>
        <p className="mt-1.5 text-xs text-muted">
          Pick a preset, or click the dashed circle to open your system&apos;s color picker for any custom shade.
        </p>
      </Field>
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <button
          type="button"
          onClick={onDone}
          className="rounded-md border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-paper"
        >
          Cancel
        </button>
        <button type="submit" className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink-soft">
          {category ? "Save changes" : "Add category"}
        </button>
      </div>
    </form>
  );
}
