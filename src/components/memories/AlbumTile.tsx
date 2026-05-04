'use client'

import React from 'react'
import type { GroupOption } from '@/components/ui/MemoryFilters'
import { PlayIcon } from '@/components/icons/PlayIcon'
import { MEMORY_CARD_RADIUS_CLASS, MEMORY_CARD_SHADOW } from './constants'
import { NoteTileCard } from './NoteCards'
import type { Album } from './types'
import { getAlbumPreviewItems, getNoteThemeForAlbum } from './utils'

export function AlbumTile({
  album,
  groups,
  selectedGroupIds,
}: {
  album: Album
  groups: GroupOption[]
  selectedGroupIds: Array<string | number>
}) {
  const previewItems = getAlbumPreviewItems(album).slice(0, 3)
  const noteTheme = getNoteThemeForAlbum(album, groups, selectedGroupIds)

  const rotations = [-8, -2, 6]
  const offsets = [
    { x: -6, y: 2 },
    { x: 0, y: 0 },
    { x: 8, y: -4 },
  ]

  if (previewItems.length === 0) {
    return (
      <div
        className={`albumTile flex h-full w-full items-center justify-center border border-neutral-200 bg-white text-[10px] text-slate-500 ${MEMORY_CARD_RADIUS_CLASS}`}
      >
        Empty album
      </div>
    )
  }

  return (
    <div className="albumTile relative h-full w-full">
      {previewItems.map((item, index) => {
        const rotation = rotations[index] ?? 0
        const offset = offsets[index] ?? { x: 0, y: 0 }
        const zIndex = 10 + (previewItems.length - index)

        return (
          <div
            key={item.id}
            className={`absolute inset-0 h-full w-full overflow-hidden bg-white ${MEMORY_CARD_RADIUS_CLASS}`}
            style={
              {
                '--i': index + 1,
                '--offset-x': `${offset.x}px`,
                '--offset-y': `${offset.y}px`,
                transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg)`,
                zIndex,
                boxShadow: MEMORY_CARD_SHADOW,
              } as React.CSSProperties
            }
          >
            {item.kind === 'note' ? (
              <NoteTileCard album={album} note={item.note || ''} theme={noteTheme} />
            ) : item.url ? (
              <div className="relative h-full w-full">
                <img
                  src={item.url}
                  alt="Album preview"
                  loading="lazy"
                  className="block h-full w-full object-cover"
                />
                {item.mediaType === 'video' ? (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/18">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/26 shadow-[0_12px_30px_rgba(15,23,42,0.2)] backdrop-blur-sm">
                      <PlayIcon className="ml-1 h-6 w-6 text-white/90" />
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="h-full w-full bg-neutral-100" />
            )}
          </div>
        )
      })}
    </div>
  )
}
