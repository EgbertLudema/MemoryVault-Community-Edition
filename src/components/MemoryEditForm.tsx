'use client'

import { useTranslations } from 'next-intl'
import gsap from 'gsap'
import { useEffect, useMemo, useRef, useState } from 'react'
import { getDefaultGroupLabel } from '@/lib/groupMeta'
import { getEffectiveGroupUiMeta, mapApiGroupToUiOption, type GroupUiOption } from '@/lib/groupUi'
import { GroupButton } from './ui/GroupButton'
import { PrimaryButton } from './ui/PrimaryButton'
import { SecondaryButton } from './ui/SecondairyButton'
import { DeleteButton } from './ui/DeleteButton'
import { useToast } from './ui/ToastProvider'
import { UpgradeToProLink } from './ui/UpgradeToProLink'
import { CheckIcon } from './icons/CheckIcon'
import { NotesIcon } from './icons/NotesIcon'
import { PhotoIcon } from './icons/PhotoIcon'
import { PlusIcon } from './icons/PlusIcon'
import { ArrowRightIcon } from './icons/ArrowRightIcon'
import { VideoIcon } from './icons/VideoIcon'
import { buildMediaImageUrl, buildMediaVideoStreamUrl } from '@/lib/mediaBlob'
import { getMemoryContentItemLimit, isWithinMemoryContentItemLimit } from '@/lib/memoryLimits'
import {
  IMAGE_UPLOAD_MAX_LABEL,
  VIDEO_UPLOAD_MAX_LABEL,
  getUploadKindForMimeType,
  getUploadLimitLabelForMimeType,
  getUploadLimitForMimeType,
} from '@/lib/uploadLimits'

const memoryContentItemLimit = getMemoryContentItemLimit()
const memoryContentItemLimitLabel = memoryContentItemLimit ?? 0

type ContentType = 'image' | 'video' | 'note'

type MemoryMediaValue =
  | string
  | number
  | {
      id?: string | number | null
      posterUrl?: string | null
      url?: string | null
      isEncrypted?: boolean | null
      encryptionMetadata?: any
      posterEncryptionMetadata?: any
    }

type MemoryContentValue =
  | {
      type: 'note'
      note?: string | null
      noteCiphertext?: string | null
      noteEncryptionMetadata?: any
    }
  | {
      type: 'image' | 'video'
      media?: MemoryMediaValue | null
    }

type MemoryRelationValue =
  | string
  | number
  | {
      id?: string | number | null
      name?: string | null
      fullName?: string | null
    }

export type EditableMemory = {
  id: string | number
  title: string
  memoryDate?: string | null
  groups?: MemoryRelationValue[] | null
  lovedOnes?: MemoryRelationValue[] | null
  content?: MemoryContentValue[] | null
  keyCiphertext?: string | null
  keyEncryptionMetadata?: any
}

type NoteBlock = {
  id: string
  type: 'note'
  note: string
}

type MediaBlock = {
  id: string
  type: 'image' | 'video'
  file: File | null
  uploadedMediaId: string | null
  previewUrl: string | null
  shouldRevokePreview: boolean
}

type ContentBlock = NoteBlock | MediaBlock

type SelectOption = {
  id: string
  label: string
}

type GroupOption = GroupUiOption

type MemoryEditFormProps = {
  memory?: EditableMemory
  mode?: 'page' | 'modal'
  onClose: () => void
  onSaved?: () => void
  onDeleted?: () => void
}

function uid() {
  return Math.random().toString(16).slice(2) + '-' + Date.now().toString(16)
}

function normalizeId(value: string | number): string {
  return String(value).trim()
}

function toPayloadId(id: string | number): string | number {
  if (typeof id === 'number') {
    return id
  }

  const trimmed = id.trim()

  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed)
  }

  return trimmed
}

function toggleId(list: string[], id: string | number): string[] {
  const normalizedId = normalizeId(id)

  if (list.includes(normalizedId)) {
    return list.filter((item) => item !== normalizedId)
  }

  return [...list, normalizedId]
}

function reorderList<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex) {
    return items
  }

  const next = [...items]
  const [moved] = next.splice(fromIndex, 1)

  if (moved === undefined) {
    return items
  }

  next.splice(toIndex, 0, moved)
  return next
}

function extractRelationIds(values: MemoryRelationValue[] | null | undefined): string[] {
  return (Array.isArray(values) ? values : [])
    .map((value) => {
      if (typeof value === 'string' || typeof value === 'number') {
        return normalizeId(value)
      }

      return value?.id != null ? normalizeId(value.id) : ''
    })
    .filter(Boolean)
}

function toDateInputValue(value?: string | null): string {
  if (!value) {
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return toDateInputValue()
  }

  const yyyy = parsed.getFullYear()
  const mm = String(parsed.getMonth() + 1).padStart(2, '0')
  const dd = String(parsed.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function initialBlocksFromMemory(memory?: EditableMemory): ContentBlock[] {
  const content = Array.isArray(memory?.content) ? memory.content : []
  const blocks: ContentBlock[] = []

  for (const item of content) {
    if (!item) {
      continue
    }

    if (item.type === 'note') {
      blocks.push({
        id: uid(),
        type: 'note',
        note: String(item.note ?? ''),
      })
      continue
    }

    if (item.type === 'image' || item.type === 'video') {
      const media = item.media
      const uploadedMediaId =
        typeof media === 'string' || typeof media === 'number'
          ? normalizeId(media)
          : media?.id != null
            ? normalizeId(media.id)
            : null

      const previewUrl = uploadedMediaId
        ? item.type === 'video'
          ? buildMediaVideoStreamUrl(uploadedMediaId)
          : buildMediaImageUrl(uploadedMediaId)
        : typeof media === 'object' && media?.url
          ? String(media.url)
          : null
      blocks.push({
        id: uid(),
        type: item.type,
        file: null,
        uploadedMediaId,
        previewUrl,
        shouldRevokePreview: false,
      })
    }
  }

  return blocks
}

async function safeJson(res: Response) {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

async function uploadToPayloadMedia(
  file: File,
  labels: {
    uploadFailed: string
    uploadTooLarge: string
    uploadNoMediaId: string
    videoSeekFailed: string
    videoMetadataFailed: string
  },
): Promise<string> {
  const form = new FormData()
  form.append('file', file)

  if (file.type.startsWith('video/')) {
    const generatedPosterFile = await createVideoPosterFile(file, labels)

    if (generatedPosterFile) {
      form.append('poster', generatedPosterFile)
    }
  }

  const res = await fetch('/api/media', {
    method: 'POST',
    credentials: 'include',
    body: form,
  })

  if (!res.ok) {
    const data = await safeJson(res)
    const msg =
      data?.errors?.[0]?.message ||
      data?.error ||
      (res.status === 413
        ? labels.uploadTooLarge
        : labels.uploadFailed.replace('{status}', String(res.status)))
    throw new Error(String(msg))
  }

  const data = (await res.json()) as any
  const id = data?.doc?.id ?? data?.id
  if (!id) {
    throw new Error(labels.uploadNoMediaId)
  }

  return String(id)
}

async function createVideoPosterFile(
  file: File,
  labels: {
    videoSeekFailed: string
    videoMetadataFailed: string
  },
): Promise<File | null> {
  if (typeof window === 'undefined' || !file.type.startsWith('video/')) {
    return null
  }

  const objectUrl = URL.createObjectURL(file)

  try {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    video.crossOrigin = 'anonymous'
    video.src = objectUrl

    await new Promise<void>((resolve, reject) => {
      const handleLoadedMetadata = () => {
        const targetTime = Math.min(0.4, Math.max((video.duration || 0) * 0.1, 0))

        const handleSeeked = () => {
          cleanup()
          resolve()
        }

        const handleSeekError = () => {
          cleanup()
          reject(new Error(labels.videoSeekFailed))
        }

        const cleanup = () => {
          video.removeEventListener('seeked', handleSeeked)
          video.removeEventListener('error', handleSeekError)
        }

        video.addEventListener('seeked', handleSeeked, { once: true })
        video.addEventListener('error', handleSeekError, { once: true })
        video.currentTime = targetTime
      }

      const handleError = () => {
        cleanup()
        reject(new Error(labels.videoMetadataFailed))
      }

      const cleanup = () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata)
        video.removeEventListener('error', handleError)
      }

      video.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true })
      video.addEventListener('error', handleError, { once: true })
    })

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720

    const context = canvas.getContext('2d')

    if (!context) {
      return null
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.82)
    })

    if (!blob) {
      return null
    }

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'video'
    return new File([blob], `${baseName}-poster.jpg`, { type: 'image/jpeg' })
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

async function fetchGroupOptions(url: string): Promise<GroupOption[]> {
  const res = await fetch(url, { method: 'GET', credentials: 'include' })
  if (!res.ok) {
    return []
  }

  const data = (await res.json()) as any
  const items = Array.isArray(data?.items) ? data.items : Array.isArray(data?.docs) ? data.docs : []

  return items
    .map((it: any) => mapApiGroupToUiOption(it))
    .filter((x: GroupOption | null): x is GroupOption => Boolean(x))
}

async function fetchOptions(url: string): Promise<SelectOption[]> {
  const res = await fetch(url, { method: 'GET', credentials: 'include' })
  if (!res.ok) {
    return []
  }

  const data = (await res.json()) as any
  const items = Array.isArray(data?.items) ? data.items : Array.isArray(data?.docs) ? data.docs : []

  return items
    .map((it: any) => {
      const id = String(it.id ?? '')
      const label = String(it.title ?? it.name ?? it.fullName ?? it.label ?? it.slug ?? id)
      return { id, label }
    })
    .filter((x: SelectOption) => x.id && x.label)
}

export function MemoryEditForm(props: MemoryEditFormProps) {
  const t = useTranslations('MemoryEditForm')
  const tGroups = useTranslations('GroupLabels')
  const { showToast } = useToast()
  const { memory, mode = 'page', onClose, onSaved, onDeleted } = props
  const isEditing = Boolean(memory)

  const [title, setTitle] = useState(memory?.title ?? '')
  const [memoryDate, setMemoryDate] = useState(() => toDateInputValue(memory?.memoryDate))
  const [groupIds, setGroupIds] = useState<string[]>(() => extractRelationIds(memory?.groups))
  const [lovedOneIds, setLovedOneIds] = useState<string[]>(() =>
    extractRelationIds(memory?.lovedOnes),
  )
  const [groups, setGroups] = useState<GroupOption[]>([])
  const [lovedOnes, setLovedOnes] = useState<SelectOption[]>([])
  const [recipientsLoading, setRecipientsLoading] = useState(true)
  const [blocks, setBlocks] = useState<ContentBlock[]>(() => initialBlocksFromMemory(memory))
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [isAddContentModalOpen, setIsAddContentModalOpen] = useState(false)
  const [showMemoryLimitUpgradeCta, setShowMemoryLimitUpgradeCta] = useState(false)
  const imagePickerRef = useRef<HTMLInputElement>(null)
  const videoPickerRef = useRef<HTMLInputElement>(null)
  const addContentPanelRef = useRef<HTMLDivElement>(null)
  const addContentBackdropRef = useRef<HTMLDivElement>(null)
  const groupsListRef = useRef<HTMLDivElement>(null)
  const lovedOnesListRef = useRef<HTMLDivElement>(null)
  const isClosingAddContentModalRef = useRef(false)
  const animatedBlockIdsRef = useRef(new Set(blocks.map((block) => block.id)))
  const recipientsTransitionReadyRef = useRef(false)
  const hasNoteBlock = blocks.some((block) => block.type === 'note')
  const hasReachedContentLimit =
    memoryContentItemLimit !== null && blocks.length >= memoryContentItemLimit

  useEffect(() => {
    let mounted = true

    const load = async () => {
      setRecipientsLoading(true)

      const [g, l] = await Promise.all([
        fetchGroupOptions('/api/loved-one-groups'),
        fetchOptions('/api/loved-ones'),
      ])

      if (!mounted) {
        return
      }

      setGroups(g)
      setLovedOnes(l)


      if (mounted) {
        setRecipientsLoading(false)
      }
    }

    load().catch(() => {
      if (mounted) {
        setRecipientsLoading(false)
      }
    })

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (mode !== 'modal' && !isAddContentModalOpen) {
      return
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isAddContentModalOpen) {
          closeAddContentModal()
          return
        }

        onClose()
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isAddContentModalOpen, mode, onClose])

  useEffect(() => {
    return () => {
      for (const block of blocks) {
        if (
          (block.type === 'image' || block.type === 'video') &&
          block.previewUrl &&
          block.shouldRevokePreview
        ) {
          URL.revokeObjectURL(block.previewUrl)
        }
      }
    }
  }, [blocks])

  useEffect(() => {
    if (!recipientsTransitionReadyRef.current) {
      recipientsTransitionReadyRef.current = true
      return
    }

    const elements = [groupsListRef.current, lovedOnesListRef.current].filter(
      (element): element is HTMLDivElement => Boolean(element),
    )

    if (elements.length === 0) {
      return
    }

    gsap.killTweensOf(elements)
    gsap.fromTo(
      elements,
      { autoAlpha: 0, y: 8 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.24,
        ease: 'power2.out',
        stagger: 0.04,
        clearProps: 'opacity,visibility,transform',
      },
    )
  }, [recipientsLoading])

  useEffect(() => {
    const newBlocks = blocks.filter((block) => !animatedBlockIdsRef.current.has(block.id))

    if (newBlocks.length === 0) {
      return
    }

    newBlocks.forEach((block) => {
      animatedBlockIdsRef.current.add(block.id)
    })

    requestAnimationFrame(() => {
      const elements = newBlocks
        .map((block) =>
          document.querySelector<HTMLElement>(`[data-content-block-id="${block.id}"]`),
        )
        .filter((element): element is HTMLElement => Boolean(element))

      if (elements.length === 0) {
        return
      }

      gsap.fromTo(
        elements,
        { autoAlpha: 0, y: 18, scale: 0.985 },
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 0.28,
          ease: 'power2.out',
          stagger: 0.04,
          clearProps: 'opacity,visibility,transform',
        },
      )
    })
  }, [blocks])

  useEffect(() => {
    if (!isAddContentModalOpen) {
      return
    }

    const panel = addContentPanelRef.current
    const backdrop = addContentBackdropRef.current

    if (backdrop) {
      gsap.fromTo(backdrop, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.18, ease: 'power2.out' })
    }

    if (panel) {
      gsap.fromTo(
        panel,
        { autoAlpha: 0, y: 28, scale: 0.98 },
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 0.26,
          ease: 'power2.out',
          clearProps: 'opacity,visibility,transform',
        },
      )
    }
  }, [isAddContentModalOpen])

  const canSubmit = useMemo(() => {
    if (!title.trim()) {
      return false
    }

    const hasAnyContent = blocks.some((block) => {
      if (block.type === 'note') {
        return Boolean(block.note.trim())
      }

      return Boolean(block.file) || Boolean(block.uploadedMediaId)
    })

    if (!hasAnyContent) {
      return false
    }

    if (!isWithinMemoryContentItemLimit(blocks.length)) {
      return false
    }

    if (groupIds.length === 0 && lovedOneIds.length === 0) {
      return false
    }

    return true
  }, [title, blocks, groupIds, lovedOneIds])

  const closeAddContentModal = () => {
    if (isClosingAddContentModalRef.current) {
      return
    }

    const panel = addContentPanelRef.current
    const backdrop = addContentBackdropRef.current

    if (!panel && !backdrop) {
      setIsAddContentModalOpen(false)
      return
    }

    isClosingAddContentModalRef.current = true

    gsap.killTweensOf([panel, backdrop].filter(Boolean))

    const timeline = gsap.timeline({
      defaults: { ease: 'power2.in' },
      onComplete: () => {
        isClosingAddContentModalRef.current = false
        setIsAddContentModalOpen(false)
      },
    })

    if (panel) {
      timeline.to(panel, { autoAlpha: 0, y: 24, scale: 0.985, duration: 0.16 }, 0)
    }

    if (backdrop) {
      timeline.to(backdrop, { autoAlpha: 0, duration: 0.18 }, 0)
    }
  }

  const addBlock = (type: ContentType) => {
    if (hasReachedContentLimit) {
      showToast({
        tone: 'warning',
        message: t('maxContentItems', { max: memoryContentItemLimitLabel }),
      })
      return false
    }

    if (type === 'note') {
      if (hasNoteBlock) {
        showToast({ tone: 'warning', message: t('singleNoteOnly') })
        return false
      }

      setBlocks((prev) => [...prev, { id: uid(), type: 'note', note: '' }])
      return true
    }

    if (type === 'video' && !canUseVideo) {
      showToast({ tone: 'warning', message: t('upgradeForVideo') })
      return false
    }

    setBlocks((prev) => [
      ...prev,
      {
        id: uid(),
        type,
        file: null,
        uploadedMediaId: null,
        previewUrl: null,
        shouldRevokePreview: false,
      },
    ])
    return true
  }

  const getFileValidationError = (file: File, expectedType: 'image' | 'video') => {
    const uploadKind = getUploadKindForMimeType(file.type)

    if (uploadKind !== expectedType) {
      return expectedType === 'image' ? t('imageTypeRequired') : t('videoTypeRequired')
    }

    const uploadLimit = getUploadLimitForMimeType(file.type)
    const uploadLimitLabel = getUploadLimitLabelForMimeType(file.type)

    if (uploadLimit !== null && uploadLimitLabel !== null && file.size > uploadLimit) {
      return t('fileTooLarge', { limit: uploadLimitLabel })
    }

    return null
  }

  const chooseContentType = (type: ContentType) => {
    if (type === 'image') {
      imagePickerRef.current?.click()
      return
    }

    if (type === 'video') {
      if (!canUseVideo) {
        showToast({ tone: 'warning', message: t('upgradeForVideo') })
        return
      }

      videoPickerRef.current?.click()
      return
    }

    if (addBlock(type)) {
      closeAddContentModal()
    }
  }

  const addMediaBlockFromFile = (type: 'image' | 'video', file: File | null) => {
    if (!file) {
      return
    }

    if (hasReachedContentLimit) {
      showToast({
        tone: 'warning',
        message: t('maxContentItems', { max: memoryContentItemLimitLabel }),
      })
      return
    }

    if (type === 'video' && !canUseVideo) {
      showToast({ tone: 'warning', message: t('upgradeForVideo') })
      return
    }

    const validationError = getFileValidationError(file, type)

    if (validationError) {
      showToast({ tone: 'error', message: validationError })
      return
    }

    setBlocks((prev) => [
      ...prev,
      {
        id: uid(),
        type,
        file,
        uploadedMediaId: null,
        previewUrl: URL.createObjectURL(file),
        shouldRevokePreview: true,
      },
    ])
    closeAddContentModal()
  }

  const removeBlock = (id: string) => {
    setBlocks((prev) => {
      const target = prev.find((block) => block.id === id)

      if (
        target &&
        (target.type === 'image' || target.type === 'video') &&
        target.previewUrl &&
        target.shouldRevokePreview
      ) {
        URL.revokeObjectURL(target.previewUrl)
      }

      return prev.filter((block) => block.id !== id)
    })
  }

  const updateNote = (id: string, note: string) => {
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== id || block.type !== 'note') {
          return block
        }

        return { ...block, note }
      }),
    )
  }

  const setFileForBlock = (id: string, file: File | null) => {
    const targetBlock = blocks.find((block) => block.id === id)

    if (targetBlock && targetBlock.type !== 'note' && file) {
      const validationError = getFileValidationError(file, targetBlock.type)

      if (validationError) {
        showToast({ tone: 'error', message: validationError })
        return
      }
    }

    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== id || block.type === 'note') {
          return block
        }

        if (block.previewUrl && block.shouldRevokePreview) {
          URL.revokeObjectURL(block.previewUrl)
        }
        return {
          ...block,
          file,
          uploadedMediaId: file ? null : block.uploadedMediaId,
          previewUrl: file ? URL.createObjectURL(file) : block.previewUrl,
          shouldRevokePreview: Boolean(file),
        }
      }),
    )
  }

  const moveBlock = (id: string, direction: 'up' | 'down') => {
    setBlocks((prev) => {
      const index = prev.findIndex((block) => block.id === id)

      if (index === -1) {
        return prev
      }

      const nextIndex = direction === 'up' ? index - 1 : index + 1

      if (nextIndex < 0 || nextIndex >= prev.length) {
        return prev
      }

      return reorderList(prev, index, nextIndex)
    })
  }

  const save = async () => {
    if (!canSubmit) {
      showToast({
        tone: 'error',
        message: !isWithinMemoryContentItemLimit(blocks.length)
          ? t('maxContentItems', { max: memoryContentItemLimitLabel })
          : t('submitValidation'),
      })
      return
    }

    setSaving(true)
    setShowMemoryLimitUpgradeCta(false)

    try {
      const uploadedBlocks: Array<
        { type: 'note'; note: string } | { type: 'image' | 'video'; media: string | number }
      > = []

      for (const block of blocks) {
        if (block.type === 'note') {
          const note = block.note.trim()
          if (note) {
            uploadedBlocks.push({
              type: 'note',
              note,
            })
          }
          continue
        }

        if (block.uploadedMediaId) {
          uploadedBlocks.push({ type: block.type, media: toPayloadId(block.uploadedMediaId) })
          continue
        }

        if (!block.file) {
          continue
        }

        const validationError = getFileValidationError(block.file, block.type)
        if (validationError) {
          throw new Error(validationError)
        }

        const mediaId = await uploadToPayloadMedia(block.file, {
          uploadFailed: t('uploadFailed', { status: '{status}' }),
          uploadTooLarge: t('uploadTooLarge'),
          uploadNoMediaId: t('uploadNoMediaId'),
          videoSeekFailed: t('videoSeekFailed'),
          videoMetadataFailed: t('videoMetadataFailed'),
        })
        uploadedBlocks.push({ type: block.type, media: toPayloadId(mediaId) })

        setBlocks((prev) =>
          prev.map((item) => {
            if (item.id !== block.id || item.type === 'note') {
              return item
            }

            return { ...item, uploadedMediaId: mediaId }
          }),
        )
      }

      if (uploadedBlocks.length === 0) {
        throw new Error(t('noValidContent'))
      }

      const endpoint = isEditing
        ? `/api/memories/${encodeURIComponent(String(toPayloadId(memory!.id)))}`
        : '/api/memories'

      const method = isEditing ? 'PATCH' : 'POST'

      const res = await fetch(endpoint, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          memoryDate: new Date(memoryDate).toISOString(),
          groups: groupIds.map((id) => toPayloadId(id)),
          lovedOnes: lovedOneIds.map((id) => toPayloadId(id)),
          content: uploadedBlocks,
        }),
      })

      if (!res.ok) {
        const data = await safeJson(res)
        const msg = data?.error || t('saveFailed', { status: res.status })
        throw new Error(String(msg))
      }

      const savedData = await safeJson(res)
      const changedId = String(
        isEditing ? memory!.id : (savedData?.memory?.id ?? savedData?.id ?? ''),
      )

      window.dispatchEvent(
        new CustomEvent('memories:changed', {
          detail: {
            action: isEditing ? 'updated' : 'created',
            id: changedId,
          },
        }),
      )

      showToast({ tone: 'success', message: t('saved') })

      if (onSaved) {
        onSaved()
      } else {
        onClose()
      }
    } catch (e: any) {
      const message = e?.message ? String(e.message) : t('saveGeneric')
      setShowMemoryLimitUpgradeCta(/plan can have at most|memories/i.test(message))
      showToast({ tone: 'error', message })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!memory) {
      return
    }

    setDeleting(true)

    try {
      const res = await fetch(
        `/api/memories/${encodeURIComponent(String(toPayloadId(memory.id)))}`,
        {
          method: 'DELETE',
          credentials: 'include',
        },
      )

      if (!res.ok) {
        const data = await safeJson(res)
        const msg = data?.error || t('deleteFailed', { status: res.status })
        throw new Error(String(msg))
      }

      const deletedId = String(memory.id)

      window.dispatchEvent(
        new CustomEvent('memories:changed', {
          detail: {
            action: 'deleted',
            id: deletedId,
          },
        }),
      )

      showToast({ tone: 'success', message: t('deleted') })

      if (onDeleted) {
        onDeleted()
      } else {
        onClose()
      }
    } catch (e: any) {
      showToast({ tone: 'error', message: e?.message ? String(e.message) : t('deleteGeneric') })
    } finally {
      setDeleting(false)
    }
  }

  const actionBar = (
    <div
      className={
        mode === 'modal'
          ? 'sticky bottom-0 z-20 -mx-3 mt-4 flex flex-col gap-2 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-18px_45px_rgba(15,23,42,0.08)] backdrop-blur sm:-mx-4 sm:flex-row sm:flex-wrap sm:justify-between'
          : 'mt-4 flex flex-col gap-2 rounded-2xl corner-shape-squircle border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:flex-wrap sm:justify-between'
      }
    >
      {isEditing ? (
        <DeleteButton
          onClick={handleDelete}
          disabled={saving || deleting}
          className="w-full sm:w-auto"
        >
          {deleting ? t('deleting') : t('deleteMemory')}
        </DeleteButton>
      ) : null}

      <div className="flex flex-col gap-2 sm:ml-auto sm:flex-row">
        <SecondaryButton
          onClick={onClose}
          disabled={saving || deleting}
          className="w-full sm:w-auto"
        >
          {t('cancel')}
        </SecondaryButton>

        <PrimaryButton
          onClick={save}
          disabled={!canSubmit || saving || deleting}
          className="w-full sm:w-auto"
        >
          {saving ? t('saving') : isEditing ? t('saveChanges') : t('saveMemory')}
        </PrimaryButton>
      </div>
    </div>
  )

  const content = (
    <>
      {mode !== 'modal' ? (
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {isEditing ? t('editTitle') : t('newTitle')}
          </h1>
          <p className="mt-1 text-sm text-slate-600">{isEditing ? t('editBody') : t('newBody')}</p>
        </div>
      ) : null}

      <div
        className={
          mode === 'modal'
            ? 'grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_280px]'
            : 'mt-5 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_280px]'
        }
      >
        <div className="grid gap-4">
          <section className="rounded-2xl corner-shape-squircle border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <h2 className="text-base font-bold text-slate-950">{t('detailsTitle')}</h2>
              <p className="mt-1 text-sm text-slate-500">{t('detailsBody')}</p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold text-slate-700">{t('title')}</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-11 w-full rounded-xl corner-shape-squircle border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                  placeholder={t('titlePlaceholder')}
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-xs font-semibold text-slate-700">{t('memoryDate')}</span>
                <input
                  type="date"
                  value={memoryDate}
                  onChange={(e) => setMemoryDate(e.target.value)}
                  className="h-11 w-full rounded-xl corner-shape-squircle border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl corner-shape-squircle border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-950">{t('contentTitle')}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {t('contentBody', {
                    imageLimit: IMAGE_UPLOAD_MAX_LABEL,
                    videoLimit: VIDEO_UPLOAD_MAX_LABEL,
                  })}
                </p>
              </div>
              <span className="rounded-full corner-shape-squircle border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                {memoryContentItemLimit === null
                  ? t('itemsCountUnlimited', { count: blocks.length })
                  : t('itemsCount', { count: blocks.length, max: memoryContentItemLimit })}
              </span>
            </div>

            <div className="mt-4 grid gap-3">
              {showMemoryLimitUpgradeCta ? (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">
                  <span>{t('memoryLimitUpgrade')}</span>
                  <UpgradeToProLink />
                </div>
              ) : null}

              {blocks.map((block, index) => (
                <div
                  key={block.id}
                  data-content-block-id={block.id}
                  className="rounded-2xl corner-shape-squircle border border-slate-200 bg-slate-50/60 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <ContentBlockTitle
                        type={block.type}
                        label={
                          block.type === 'image'
                            ? t('image')
                            : block.type === 'video'
                              ? t('video')
                              : t('note')
                        }
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {blocks.length > 1 ? (
                        <>
                          <SecondaryButton
                            onClick={() => moveBlock(block.id, 'up')}
                            disabled={index === 0}
                            className="h-9 w-9 p-0!"
                          >
                            <ArrowRightIcon className="h-4 w-4 -rotate-90" aria-hidden="true" />
                            <span className="sr-only">{t('moveUp')}</span>
                          </SecondaryButton>
                          <SecondaryButton
                            onClick={() => moveBlock(block.id, 'down')}
                            disabled={index === blocks.length - 1}
                            className="h-9 w-9 p-0!"
                          >
                            <ArrowRightIcon className="h-4 w-4 rotate-90" aria-hidden="true" />
                            <span className="sr-only">{t('moveDown')}</span>
                          </SecondaryButton>
                        </>
                      ) : null}
                      <SecondaryButton
                        onClick={() => removeBlock(block.id)}
                        className="h-9 border-red-200 px-3 text-sm text-red-700 hover:bg-red-50"
                      >
                        {t('remove')}
                      </SecondaryButton>
                    </div>
                  </div>

                  {block.type === 'note' ? (
                    <textarea
                      value={block.note}
                      onChange={(e) => updateNote(block.id, e.target.value)}
                      className="mt-3 min-h-[180px] w-full resize-y rounded-xl corner-shape-squircle border border-slate-200 bg-white p-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                      placeholder={t('notePlaceholder')}
                    />
                  ) : (
                    <div className="mt-3 grid gap-3">
                      <input
                        type="file"
                        accept={block.type === 'image' ? 'image/*' : 'video/*'}
                        onChange={(e) => {
                          const file =
                            e.target.files && e.target.files[0] ? e.target.files[0] : null
                          if (file) {
                            const validationError = getFileValidationError(file, block.type)

                            if (validationError) {
                              showToast({ tone: 'error', message: validationError })
                              e.currentTarget.value = ''
                              return
                            }
                          }
                          setFileForBlock(block.id, file)
                        }}
                        className="w-full cursor-pointer rounded-xl corner-shape-squircle border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:border-slate-300"
                      />
                      <p className="text-xs font-medium text-slate-500">
                        {block.type === 'image'
                          ? t('imageUploadHelp', { limit: IMAGE_UPLOAD_MAX_LABEL })
                          : t('videoUploadHelp', { limit: VIDEO_UPLOAD_MAX_LABEL })}
                      </p>

                      {block.previewUrl && block.type === 'image' ? (
                        <img
                          src={block.previewUrl}
                          alt={t('previewAlt')}
                          className="max-h-[260px] w-full rounded-xl corner-shape-squircle border border-slate-200 bg-white object-cover"
                        />
                      ) : null}

                      {block.previewUrl && block.type === 'video' ? (
                        <video
                          src={block.previewUrl}
                          controls
                          className="max-h-[260px] w-full rounded-xl corner-shape-squircle border border-slate-200 bg-white object-cover"
                        />
                      ) : null}
                    </div>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={() => setIsAddContentModalOpen(true)}
                disabled={hasReachedContentLimit}
                className="group flex min-h-[150px] w-full cursor-pointer flex-col items-center justify-center rounded-2xl corner-shape-squircle border-2 border-dashed border-slate-300 bg-slate-50/70 text-slate-500 transition hover:border-purple-300 hover:bg-purple-50/60 hover:text-purple-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:hover:border-slate-200 disabled:hover:bg-slate-50 disabled:hover:text-slate-400"
                aria-label={t('addContentAria')}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl corner-shape-squircle border border-slate-200 bg-white text-slate-700 shadow-sm transition group-hover:border-purple-200 group-hover:text-purple-700">
                  <PlusIcon className="h-5 w-5" />
                </span>
                <span className="mt-3 text-sm font-semibold">
                  {hasReachedContentLimit
                    ? t('maxContentItems', { max: memoryContentItemLimitLabel })
                    : t('addContent')}
                </span>
              </button>
            </div>
          </section>

          {mode !== 'modal' ? actionBar : null}
        </div>

        <aside className="h-fit rounded-2xl corner-shape-squircle border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-950">{t('recipientsTitle')}</h2>
              <p className="mt-1 text-sm text-slate-500">{t('recipientsBody')}</p>
            </div>
            <span className="rounded-full corner-shape-squircle border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
              {t('selectedCount', { count: groupIds.length + lovedOneIds.length })}
            </span>
          </div>

          <label className="mt-4 grid gap-2">
            <span className="text-xs font-semibold text-slate-700">{t('groups')}</span>

            <div ref={groupsListRef} className="flex flex-wrap gap-2.5">
              {recipientsLoading ? (
                <GroupSkeletons />
              ) : groups.length > 0 ? (
                groups.map((group) => {
                  const label = getDefaultGroupLabel(group.defaultKey, group.name, (key) =>
                    tGroups(key),
                  )
                  const meta = getEffectiveGroupUiMeta(group)
                  const IconComponent = meta.icon.Icon
                  const active = groupIds.includes(normalizeId(group.id))

                  return (
                    <GroupButton
                      key={group.id}
                      label={label}
                      active={active}
                      colorValue={meta.color.value}
                      onClick={() => setGroupIds((prev) => toggleId(prev, group.id))}
                      icon={<IconComponent className="h-4 w-4 shrink-0" />}
                    />
                  )
                })
              ) : (
                <div className="text-xs text-slate-600">{t('noGroupsFound')}</div>
              )}
            </div>
          </label>

          <div className="mt-5 grid gap-2">
            <span className="text-xs font-semibold text-slate-700">{t('lovedOnes')}</span>

            <div
              ref={lovedOnesListRef}
              className="grid max-h-[300px] gap-2 overflow-y-auto rounded-xl corner-shape-squircle border border-slate-200 bg-slate-50/70 p-2"
            >
              {recipientsLoading ? (
                <LovedOneSkeletons />
              ) : lovedOnes.length > 0 ? (
                lovedOnes.map((lovedOne) => {
                  const selected = lovedOneIds.includes(normalizeId(lovedOne.id))

                  return (
                    <button
                      key={lovedOne.id}
                      type="button"
                      role="checkbox"
                      aria-checked={selected}
                      onClick={() => setLovedOneIds((prev) => toggleId(prev, lovedOne.id))}
                      className={`flex w-full cursor-pointer items-center gap-2 rounded-xl corner-shape-squircle border px-3 py-2 text-left text-sm font-semibold transition ${
                        selected
                          ? 'border-green-200 bg-green-50 text-slate-950 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                          selected
                            ? 'border-green-600 bg-green-600 text-white'
                            : 'border-slate-300 bg-white text-transparent'
                        }`}
                        aria-hidden="true"
                      >
                        <CheckIcon className="h-3.5 w-3.5" />
                      </span>
                      <span>{lovedOne.label}</span>
                    </button>
                  )
                })
              ) : (
                <div className="px-1 py-2 text-xs text-slate-600">{t('noLovedOnesFound')}</div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {mode === 'modal' ? actionBar : null}

      {isAddContentModalOpen ? (
        <div
          ref={addContentBackdropRef}
          role="dialog"
          aria-modal="true"
          aria-label={t('addContentAria')}
          className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/35 p-0 sm:items-center sm:p-4"
          onMouseDown={closeAddContentModal}
        >
          <input
            ref={imagePickerRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null
              addMediaBlockFromFile('image', file)
              event.currentTarget.value = ''
            }}
          />
          <input
            ref={videoPickerRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null
              addMediaBlockFromFile('video', file)
              event.currentTarget.value = ''
            }}
          />
          <div
            ref={addContentPanelRef}
            className="w-full max-w-[560px] overflow-y-auto rounded-t-2xl corner-shape-squircle border border-slate-200 bg-white p-4 shadow-[0_20px_70px_rgba(0,0,0,0.18)] sm:max-h-[88dvh] sm:rounded-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-bold text-slate-950">{t('chooseContentTitle')}</div>
                <div className="mt-1 text-sm text-slate-600">{t('chooseContentBody')}</div>
              </div>

              <SecondaryButton
                onClick={closeAddContentModal}
                className="h-9 w-9 rounded-lg px-0 text-lg leading-none"
              >
                &times;
              </SecondaryButton>
            </div>

            <div className="mt-4 grid gap-2.5 sm:grid-cols-3 sm:gap-3">
              <ContentTypeOption
                type="note"
                label={t('note')}
                disabled={hasNoteBlock || hasReachedContentLimit}
                helperText={
                  hasReachedContentLimit
                    ? t('maxContentItems', { max: memoryContentItemLimitLabel })
                    : hasNoteBlock
                      ? t('alreadyAdded')
                      : undefined
                }
                onSelect={chooseContentType}
              />
              <ContentTypeOption
                type="image"
                label={t('image')}
                disabled={hasReachedContentLimit}
                helperText={
                  hasReachedContentLimit
                    ? t('maxContentItems', { max: memoryContentItemLimitLabel })
                    : undefined
                }
                onSelect={chooseContentType}
              />
              <ContentTypeOption
                type="video"
                label={t('video')}
                disabled={hasReachedContentLimit}
                helperText={
                  hasReachedContentLimit
                    ? t('maxContentItems', { max: memoryContentItemLimitLabel })
                    : !canUseVideo
                      ? t('proOnly')
                      : undefined
                }
                onSelect={chooseContentType}
              />
            </div>
            {!canUseVideo ? (
              <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[13px] font-medium text-amber-800">
                <span>{t('upgradeForVideo')}</span>
                <UpgradeToProLink />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  )

  if (mode === 'modal') {
    return content
  }

  return (
    <div className="max-h-[min(86vh,900px)] w-[min(980px,100%)] overflow-auto rounded-2xl corner-shape-squircle border border-slate-200 bg-white p-4 shadow-[0_30px_90px_rgba(0,0,0,0.12)]">
      {content}
    </div>
  )
}

function ContentBlockTitle({ type, label }: { type: ContentType; label: string }) {
  const IconComponent = type === 'image' ? PhotoIcon : type === 'video' ? VideoIcon : NotesIcon

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-black uppercase tracking-[0.08em] text-slate-800">
      <IconComponent className="h-3.5 w-3.5" />
      <span>{label}</span>
    </span>
  )
}

function GroupSkeletons() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, index) => (
        <span
          key={index}
          className="h-10 animate-pulse rounded-2xl corner-shape-squircle border border-slate-200 bg-slate-100 px-4"
          style={{ width: `${72 + (index % 3) * 18}px` }}
        >
          <span className="sr-only">Loading</span>
        </span>
      ))}
    </>
  )
}

function LovedOneSkeletons() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="flex animate-pulse items-center gap-2 rounded-xl corner-shape-squircle border border-slate-200 bg-white px-3 py-2"
        >
          <span className="h-5 w-5 shrink-0 rounded-md bg-slate-200" />
          <span
            className="h-3.5 rounded-full bg-slate-200"
            style={{ width: `${120 - index * 16}px` }}
          />
        </div>
      ))}
    </>
  )
}

function ContentTypeOption({
  type,
  label,
  disabled,
  helperText,
  onSelect,
}: {
  type: ContentType
  label: string
  disabled: boolean
  helperText?: string
  onSelect: (type: ContentType) => void
}) {
  const IconComponent = type === 'image' ? PhotoIcon : type === 'video' ? VideoIcon : NotesIcon

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(type)}
      className="flex min-h-[76px] items-center gap-3 rounded-2xl corner-shape-squircle border border-slate-200 bg-white p-3 text-left transition hover:border-purple-200 hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-50 sm:aspect-square sm:min-h-[136px] sm:flex-col sm:justify-center sm:p-4 sm:text-center"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-900 sm:h-auto sm:w-auto sm:bg-transparent">
        <IconComponent className="h-6 w-6 sm:h-9 sm:w-9" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-slate-950">{label}</span>
        {helperText ? (
          <span className="mt-0.5 block text-xs font-medium text-slate-500 sm:mt-1">
            {helperText}
          </span>
        ) : null}
      </span>
    </button>
  )
}
