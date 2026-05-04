'use client'

import React from 'react'
import { MEMORY_CARD_RADIUS_CLASS, MEMORY_CARD_SHADOW } from './constants'
import type { Album, NoteTheme } from './types'
import { toRgba } from './utils'

export function NoteTileCard({
  album,
  note,
  theme,
}: {
  album: Album
  note: string
  theme: NoteTheme
}) {
  return (
    <div
      className={`relative h-full w-full overflow-hidden text-slate-900 ${MEMORY_CARD_RADIUS_CLASS}`}
      style={
        {
          '--i': 1,
          '--offset-x': '0px',
          '--offset-y': '0px',
          backgroundColor: theme.paperStrong,
          border: `1px solid ${theme.border}`,
          boxShadow: MEMORY_CARD_SHADOW,
        } as React.CSSProperties
      }
    >
      <div
        className="border-b px-4 py-3"
        style={{
          borderColor: toRgba(theme.text, 0.14),
          backgroundColor: 'rgba(255,255,255,0.22)',
        }}
      >
        <div
          className="text-[9px] font-semibold uppercase tracking-[0.28em]"
          style={{ color: theme.label }}
        >
          Note
        </div>
        <h3
          className="mt-2 line-clamp-2 text-[15px] font-semibold leading-5"
          style={{ color: theme.text }}
        >
          {album.title || 'Untitled note'}
        </h3>
      </div>

      <div className="relative flex-1 px-4 py-2">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage: `linear-gradient(to bottom, transparent 0px, transparent 29px, ${theme.line} 29px, ${theme.line} 30px)`,
            backgroundSize: '100% 30px',
          }}
        />
        <p
          className="relative z-10 line-clamp-4 whitespace-pre-wrap text-[10px] leading-[30px]"
          style={{ color: theme.textSoft }}
        >
          {note}
        </p>
      </div>
    </div>
  )
}

export function ExpandedNoteCard({
  album,
  notes,
  theme,
}: {
  album: Album
  notes: string[]
  theme: NoteTheme
}) {
  return (
    <div
      className={`flex h-full w-full flex-col overflow-hidden text-slate-900 ${MEMORY_CARD_RADIUS_CLASS}`}
      style={{
        backgroundColor: theme.paperStrong,
        border: `1px solid ${theme.border}`,
        boxShadow: MEMORY_CARD_SHADOW,
      }}
    >
      <div
        className="border-b px-8 py-6"
        style={{
          borderColor: toRgba(theme.text, 0.14),
          backgroundColor: 'rgba(255,255,255,0.2)',
        }}
      >
        <div
          className="text-[11px] font-semibold uppercase tracking-[0.28em]"
          style={{ color: theme.label }}
        >
          Note
        </div>
        <h2 className="mt-3 text-2xl font-semibold leading-tight" style={{ color: theme.text }}>
          {album.title || 'Untitled note'}
        </h2>
      </div>

      <div
        className="note-scrollbar relative flex-1 overflow-y-auto py-10"
        style={
          {
            scrollbarWidth: 'thin',
            scrollbarColor: `${toRgba(theme.text, 0.32)} transparent`,
            '--note-scrollbar-thumb': toRgba(theme.text, 0.3),
            '--note-scrollbar-thumb-hover': toRgba(theme.text, 0.42),
            '--note-scrollbar-track': toRgba(theme.paper, 0.18),
          } as React.CSSProperties
        }
      >
        <div
          className="relative z-10 min-h-full space-y-6 pr-2"
          style={{
            backgroundImage: `linear-gradient(to bottom, transparent 0px, transparent 34px, ${theme.line} 34px, ${theme.line} 36px)`,
            backgroundSize: '100% 36px',
          }}
        >
          <div className="px-8 pr-10 pb-24">
            {notes.map((note, index) => (
              <p
                key={`${album.id}-note-${index}`}
                className="whitespace-pre-wrap text-[18px] leading-[36px]"
                style={{ color: theme.textSoft }}
              >
                {note}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
