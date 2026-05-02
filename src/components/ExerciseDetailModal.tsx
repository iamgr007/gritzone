"use client";

import { useEffect } from "react";
import type { Exercise } from "@/lib/exercise-data";
import BodyMap from "./BodyMap";

/**
 * Modal that shows full info for an exercise: image, description,
 * primary + secondary muscles highlighted on a body silhouette,
 * equipment, and known aliases.
 */
export default function ExerciseDetailModal({
  exercise,
  onClose,
}: {
  exercise: Exercise | null;
  onClose: () => void;
}) {
  // Lock background scroll while open
  useEffect(() => {
    if (!exercise) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [exercise]);

  if (!exercise) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#0d0d0d] border border-neutral-800 rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle (mobile) */}
        <div className="sm:hidden flex justify-center pt-2">
          <div className="h-1 w-10 bg-neutral-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold leading-tight">{exercise.name}</h2>
            <p className="text-[11px] text-neutral-500 capitalize mt-0.5">
              {exercise.category}
              {exercise.equipment.length > 0 && (
                <> · {exercise.equipment.slice(0, 2).join(", ")}</>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-neutral-500 hover:text-white p-1 -mt-1"
          >
            ✕
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto px-5 pb-6">
          {/* Image (if available) */}
          {exercise.image && (
            <div className="rounded-xl overflow-hidden mb-4 bg-neutral-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={exercise.image}
                alt={exercise.name}
                className="w-full max-h-72 object-contain"
                loading="lazy"
              />
            </div>
          )}

          {/* Body map */}
          <div className="bg-[#141414] border border-neutral-800 rounded-2xl p-4 mb-4">
            <p className="text-[10px] uppercase tracking-widest text-neutral-500 mb-2">
              Muscles worked
            </p>
            <BodyMap
              primary={exercise.primary_muscles}
              secondary={exercise.secondary_muscles}
              size={180}
            />
            <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-neutral-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/85" /> Primary
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/35" /> Secondary
              </span>
            </div>
          </div>

          {/* Muscle list */}
          {(exercise.primary_muscles.length > 0 || exercise.secondary_muscles.length > 0) && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-amber-400 mb-1.5">
                  Primary
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {exercise.primary_muscles.length > 0 ? (
                    exercise.primary_muscles.map((m) => (
                      <span
                        key={m}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30"
                      >
                        {m}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-neutral-600">—</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1.5">
                  Secondary
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {exercise.secondary_muscles.length > 0 ? (
                    exercise.secondary_muscles.map((m) => (
                      <span
                        key={m}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700"
                      >
                        {m}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-neutral-600">—</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          {exercise.description && (
            <div className="mb-4">
              <p className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1.5">
                How to perform
              </p>
              <p className="text-sm text-neutral-200 leading-relaxed whitespace-pre-line">
                {exercise.description}
              </p>
            </div>
          )}

          {/* Aliases */}
          {exercise.aliases.length > 0 && (
            <p className="text-[11px] text-neutral-500">
              Also known as: {exercise.aliases.join(", ")}
            </p>
          )}

          {/* Attribution */}
          <p className="text-[9px] text-neutral-600 mt-4 pt-3 border-t border-neutral-900">
            Exercise data from{" "}
            <a
              href={`https://wger.de/en/exercise/${exercise.id}/view/`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              wger.de
            </a>{" "}
            · CC-BY-SA 3.0
          </p>
        </div>
      </div>
    </div>
  );
}
