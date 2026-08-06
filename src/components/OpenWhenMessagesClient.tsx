'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { EditIcon } from '@/components/icons/EditIcon'
import { HeartIcon } from '@/components/icons/HeartIcon'
import { PhotoIcon } from '@/components/icons/PhotoIcon'
import { PlusIcon } from '@/components/icons/PlusIcon'
import { TrashIcon } from '@/components/icons/TrashIcon'
import { Modal } from '@/components/Modal'
import { OpenWhenMessagesHelpTour } from '@/components/onboarding/OpenWhenMessagesHelpTour'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondairyButton'
import { useToast } from '@/components/ui/ToastProvider'
import { ICON_OPTIONS } from '@/components/LovedOneGroupsClient'
import { analytics } from '@/lib/analytics'
import { getColorOption, GROUP_COLOR_OPTIONS } from '@/lib/groupMeta'

type LovedOne = {
  id: string | number
  fullName?: string | null
  nickname?: string | null
  email?: string | null
}

type PhotoAttachment = {
  id: string
  name?: string | null
  url: string
}

type OpenWhenMessage = {
  id: string | number
  title?: string | null
  openWhenText?: string | null
  message?: string | null
  lovedOnes?: Array<string | number | LovedOne>
  attachments?: Array<string | number | { id?: string | number | null; filename?: string | null }>
  triggerDate?: string | null
  allowSendWhileActive?: boolean | null
  iconKey?: string | null
  colorKey?: string | null
  dateReached?: boolean
  createdAt?: string | null
}

type FormState = {
  title: string
  openWhenText: string
  message: string
  lovedOnes: string[]
  attachments: PhotoAttachment[]
  triggerDate: string
  allowSendWhileActive: boolean
  iconKey: string
  colorKey: string
}

const emptyForm: FormState = {
  title: '',
  openWhenText: '',
  message: '',
  lovedOnes: [],
  attachments: [],
  triggerDate: '',
  allowSendWhileActive: false,
  iconKey: 'mail',
  colorKey: 'purple',
}

const templates = [
  { key: 'missMe', iconKey: 'heart', colorKey: 'red' },
  { key: 'advice', iconKey: 'lightbulb', colorKey: 'yellow' },
  { key: 'birthday', iconKey: 'star', colorKey: 'purple' },
  { key: 'alone', iconKey: 'friends', colorKey: 'blue' },
  { key: 'parent', iconKey: 'grandchildren', colorKey: 'green' },
  { key: 'difficult', iconKey: 'open-book', colorKey: 'gray' },
  { key: 'laugh', iconKey: 'open-star', colorKey: 'orange' },
]

const maxPhotos = 4

function formatDate(value?: string | null) {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function toDateInputValue(value?: string | null) {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toISOString().slice(0, 10)
}

function getLovedOneId(value: string | number | LovedOne) {
  return typeof value === 'object' && value ? String(value.id) : String(value)
}

function getLovedOneLabel(value: LovedOne) {
  const name = String(value.fullName ?? '').trim()
  const nickname = String(value.nickname ?? '').trim()
  return nickname ? `${name || nickname} (${nickname})` : name || String(value.email ?? '').trim()
}

function getAttachmentFromValue(
  value: string | number | { id?: string | number | null; filename?: string | null },
): PhotoAttachment | null {
  const id = typeof value === 'object' && value ? String(value.id ?? '').trim() : String(value)

  if (!id) {
    return null
  }

  return {
    id,
    name: typeof value === 'object' && value ? value.filename : null,
    url: `/api/media/image/${id}`,
  } as PhotoAttachment
}

async function safeJson(res: Response) {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

async function uploadPhoto(
  file: File,
  labels: { failed: string; tooLarge: string; noMediaId: string },
) {
  const form = new FormData()
  form.append('file', file)

  const response = await fetch('/api/media', {
    method: 'POST',
    credentials: 'include',
    body: form,
  })

  if (!response.ok) {
    const data = await safeJson(response)
    throw new Error(
      String(
        data?.error ||
          data?.errors?.[0]?.message ||
          (response.status === 413 ? labels.tooLarge : labels.failed),
      ),
    )
  }

  const data = await response.json()
  const id = data?.doc?.id ?? data?.id

  if (!id) {
    throw new Error(labels.noMediaId)
  }

  return {
    id: String(id),
    name: file.name,
    url: `/api/media/image/${id}`,
  } satisfies PhotoAttachment
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

function getIconOption(iconKey: string | null | undefined) {
  const key = String(iconKey ?? '').trim()
  return ICON_OPTIONS.find((option) => option.key === key) ?? ICON_OPTIONS[0]
}

function shouldUseMobileFormModal() {
  return window.matchMedia('(max-width: 1023px)').matches
}

export function OpenWhenMessagesClient() {
  const t = useTranslations('OpenWhenMessagesPage')
  const { showToast } = useToast()
  const [messages, setMessages] = React.useState<OpenWhenMessage[]>([])
  const [lovedOnes, setLovedOnes] = React.useState<LovedOne[]>([])
  const [form, setForm] = React.useState<FormState>(emptyForm)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [formModalOpen, setFormModalOpen] = React.useState(false)
  const [canUseOpenWhenPhotos, setCanUseOpenWhenPhotos] = React.useState(true)
  const [openWhenMessageCountLimit, setOpenWhenMessageCountLimit] = React.useState<number | null>(
    null,
  )

  const lovedOnesById = React.useMemo(() => {
    return new Map(lovedOnes.map((person) => [String(person.id), person]))
  }, [lovedOnes])

  const resetForm = React.useCallback(() => {
    setForm(emptyForm)
    setEditingId(null)
    setFormModalOpen(false)
  }, [])

  React.useEffect(() => {
    let isMounted = true

    async function load() {
      try {
        const [messagesResponse, lovedOnesResponse] = await Promise.all([
          fetch('/api/open-when-messages', { credentials: 'include' }),
          fetch('/api/loved-ones?depth=1&sort=fullName&limit=200', { credentials: 'include' }),
        ])

        if (!messagesResponse.ok) {
          throw new Error(t('errors.loadMessages'))
        }

        if (!lovedOnesResponse.ok) {
          throw new Error(t('errors.loadLovedOnes'))
        }

        const [messagesData, lovedOnesData] = await Promise.all([
          messagesResponse.json(),
          lovedOnesResponse.json(),
        ])

        if (!isMounted) {
          return
        }

        setMessages(Array.isArray(messagesData?.docs) ? messagesData.docs : [])
        setCanUseOpenWhenPhotos(messagesData?.canUseOpenWhenPhotos !== false)
        setOpenWhenMessageCountLimit(
          typeof messagesData?.openWhenMessageCountLimit === 'number' ||
            messagesData?.openWhenMessageCountLimit === null
            ? messagesData.openWhenMessageCountLimit
            : null,
        )
        setLovedOnes(Array.isArray(lovedOnesData?.docs) ? lovedOnesData.docs : [])
      } catch (error) {
        console.error(error)
        if (isMounted) {
          showToast({ tone: 'error', message: t('errors.couldNotLoad') })
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      isMounted = false
    }
  }, [showToast, t])

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function toggleLovedOne(id: string) {
    setForm((current) => {
      const exists = current.lovedOnes.includes(id)
      return {
        ...current,
        lovedOnes: exists
          ? current.lovedOnes.filter((currentId) => currentId !== id)
          : [...current.lovedOnes, id],
      }
    })
  }

  function startEdit(message: OpenWhenMessage) {
    setEditingId(String(message.id))
    setFormModalOpen(shouldUseMobileFormModal())
    setForm({
      title: String(message.title ?? ''),
      openWhenText: String(message.openWhenText ?? ''),
      message: String(message.message ?? ''),
      lovedOnes: Array.isArray(message.lovedOnes) ? message.lovedOnes.map(getLovedOneId) : [],
      attachments: Array.isArray(message.attachments)
        ? message.attachments
            .map(getAttachmentFromValue)
            .filter((item): item is PhotoAttachment => Boolean(item))
        : [],
      triggerDate: toDateInputValue(message.triggerDate),
      allowSendWhileActive: Boolean(message.allowSendWhileActive),
      iconKey: String(message.iconKey ?? 'mail') || 'mail',
      colorKey: String(message.colorKey ?? 'purple') || 'purple',
    })
  }

  function startCreate() {
    setForm(emptyForm)
    setEditingId(null)
    setFormModalOpen(shouldUseMobileFormModal())
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (saving) {
      return
    }

    setSaving(true)

    try {
      if (
        !editingId &&
        openWhenMessageCountLimit !== null &&
        messages.length >= openWhenMessageCountLimit
      ) {
        throw new Error(t('errors.messageLimit', { max: openWhenMessageCountLimit }))
      }

      if (!canUseOpenWhenPhotos && form.attachments.length > 0) {
        throw new Error(t('errors.photosProOnly'))
      }

      const response = await fetch(
        editingId ? `/api/open-when-messages/${editingId}` : '/api/open-when-messages',
        {
          method: editingId ? 'PATCH' : 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...form,
            lovedOnes: form.lovedOnes,
            attachments: form.attachments.map((attachment) => attachment.id),
            triggerDate: form.triggerDate || null,
          }),
        },
      )

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(String(data?.error ?? t('errors.save')))
      }

      if (!editingId) {
        analytics.capture('open_when_message_created', {
          source: 'open_when_messages',
          has_loved_one: form.lovedOnes.length > 0,
          delivery_condition_type: form.triggerDate
            ? 'date'
            : form.allowSendWhileActive
              ? 'active_allowed'
              : 'manual',
        })
      }

      setMessages((current) => {
        if (!editingId) {
          return [data, ...current]
        }

        return current.map((message) => (String(message.id) === editingId ? data : message))
      })
      resetForm()
      showToast({
        tone: 'success',
        message: editingId ? t('toasts.updated') : t('toasts.created'),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : t('errors.save')
      showToast({ tone: 'error', message })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(message: OpenWhenMessage) {
    const title = String(message.title ?? '').trim() || t('fallback.thisMessage')
    if (!window.confirm(t('deleteConfirm', { title }))) {
      return
    }

    try {
      const response = await fetch(`/api/open-when-messages/${message.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(String(data?.error ?? t('errors.delete')))
      }

      setMessages((current) => current.filter((item) => String(item.id) !== String(message.id)))
      if (editingId === String(message.id)) {
        resetForm()
      }
      showToast({ tone: 'success', message: t('toasts.deleted') })
    } catch (error) {
      const text = error instanceof Error ? error.message : t('errors.delete')
      showToast({ tone: 'error', message: text })
    }
  }

  async function handlePhotoFiles(files: FileList | null) {
    if (!files || saving) {
      return
    }

    const selectedFiles = Array.from(files).filter((file) => file.type.startsWith('image/'))
    const availableSlots = Math.max(0, maxPhotos - form.attachments.length)

    if (!canUseOpenWhenPhotos) {
      showToast({ tone: 'warning', message: t('errors.photosProOnly') })
      return
    }

    if (selectedFiles.length === 0) {
      showToast({ tone: 'error', message: t('errors.photosOnly') })
      return
    }

    if (availableSlots === 0) {
      showToast({ tone: 'warning', message: t('errors.maxPhotos') })
      return
    }

    const filesToUpload = selectedFiles.slice(0, availableSlots)

    if (selectedFiles.length > availableSlots) {
      showToast({ tone: 'warning', message: t('errors.maxPhotos') })
    }

    setSaving(true)

    try {
      const uploaded: PhotoAttachment[] = []
      for (const file of filesToUpload) {
        uploaded.push(
          await uploadPhoto(file, {
            failed: t('errors.uploadFailed'),
            tooLarge: t('errors.uploadTooLarge'),
            noMediaId: t('errors.uploadNoMediaId'),
          }),
        )
      }

      setForm((current) => ({
        ...current,
        attachments: [...current.attachments, ...uploaded].slice(0, maxPhotos),
      }))
    } catch (error) {
      showToast({
        tone: 'error',
        message: error instanceof Error ? error.message : t('errors.uploadFailed'),
      })
    } finally {
      setSaving(false)
    }
  }

  function removePhoto(id: string) {
    setForm((current) => ({
      ...current,
      attachments: current.attachments.filter((attachment) => attachment.id !== id),
    }))
  }

  const reachedMessages = messages.filter((message) => message.dateReached)
  const hasReachedMessageLimit =
    !editingId && openWhenMessageCountLimit !== null && messages.length >= openWhenMessageCountLimit
  const photosDisabled = !canUseOpenWhenPhotos || form.attachments.length >= maxPhotos || saving
  const formTitle = editingId ? t('form.editTitle') : t('form.createTitle')
  const formPanelClassName = formModalOpen
    ? 'block'
    : 'hidden lg:sticky lg:top-6 lg:block lg:self-start'

  function renderFormShell(children: React.ReactNode) {
    if (!formModalOpen) {
      return children
    }

    return (
      <div className="lg:hidden">
        <Modal title={formTitle} size="wide" onClose={resetForm}>
          {children}
        </Modal>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-[linear-gradient(180deg,#fafafa_0%,#f8fafc_100%)]">
      <OpenWhenMessagesHelpTour />
      <div className="mx-auto grid w-full max-w-[1500px] grid-cols-1 gap-6 px-4 py-6 pb-40 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:pb-24">
        <main className="min-w-0 space-y-6">
          <section
            data-tour="open-when-hero"
            className="rounded-[30px] corner-shape-squircle border border-white/75 bg-[linear-gradient(135deg,rgba(255,255,255,0.97),rgba(250,245,255,0.9))] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:p-8"
          >
            <div className="max-w-3xl">
              <div className="inline-flex rounded-full bg-purple-600/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-purple-700">
                {t('hero.badge')}
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-stone-950 sm:text-4xl">
                {t('hero.title')}
              </h1>
              <p className="mt-3 text-sm leading-6 text-stone-600 sm:text-base">{t('hero.body')}</p>
              <div className="mt-5 lg:hidden" data-tour="open-when-create-button">
                <PrimaryButton
                  type="button"
                  onClick={startCreate}
                  disabled={hasReachedMessageLimit}
                  className="gap-2 rounded-full px-5 py-3"
                >
                  <PlusIcon className="h-4 w-4 shrink-0" />
                  {t('actions.create')}
                </PrimaryButton>
              </div>
            </div>
          </section>

          {reachedMessages.length > 0 ? (
            <section className="rounded-[24px] corner-shape-squircle border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950 shadow-[0_14px_34px_rgba(245,158,11,0.1)]">
              <div className="font-semibold">{t('dateReached.title')}</div>
              <p className="mt-1 leading-6">
                {reachedMessages.length === 1
                  ? t('dateReached.one')
                  : t('dateReached.many', { count: reachedMessages.length })}
              </p>
            </section>
          ) : null}

          <section data-tour="open-when-list" className="space-y-4">
            {loading ? (
              <div className="rounded-[24px] corner-shape-squircle border border-white/75 bg-white/80 p-5 text-sm text-stone-600 shadow-sm">
                {t('loading')}
              </div>
            ) : null}

            {!loading && messages.length === 0 ? (
              <div
                data-tour="open-when-list-item"
                className="rounded-[28px] corner-shape-squircle border border-dashed border-purple-200 bg-white/80 p-10 text-center shadow-sm"
              >
                <div className="mx-auto max-w-md">
                  <div className="text-lg font-semibold text-stone-950">{t('empty.title')}</div>
                  <p className="mt-2 text-sm leading-6 text-stone-600">{t('empty.body')}</p>
                </div>
              </div>
            ) : null}

            {messages.map((message) => {
              const color = getColorOption(message.colorKey)
              const icon = getIconOption(message.iconKey)
              const IconComponent = icon.Icon
              const linkedLovedOnes = Array.isArray(message.lovedOnes)
                ? message.lovedOnes
                    .map((value) =>
                      typeof value === 'object' && value
                        ? value
                        : (lovedOnesById.get(String(value)) ?? null),
                    )
                    .filter((value): value is LovedOne => Boolean(value))
                : []

              return (
                <article
                  key={String(message.id)}
                  data-tour="open-when-list-item"
                  className="rounded-[28px] corner-shape-squircle border border-white/75 bg-white/88 p-5 shadow-[0_16px_45px_rgba(15,23,42,0.06)] backdrop-blur-sm sm:p-6"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-2">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                          style={{
                            color: color.value,
                            backgroundColor: `color-mix(in srgb, ${color.value} 10%, transparent)`,
                          }}
                        >
                          <IconComponent className="h-3.5 w-3.5" />
                          {String(message.openWhenText ?? '').trim() || t('fallback.openWhen')}
                        </span>
                        {message.dateReached ? (
                          <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                            {t('badges.dateReached')}
                          </span>
                        ) : null}
                        {message.allowSendWhileActive ? (
                          <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                            {t('badges.canSendWhileActive')}
                          </span>
                        ) : null}
                      </div>

                      <h2 className="mt-4 text-xl font-bold tracking-tight text-stone-950">
                        {String(message.title ?? '').trim() || t('fallback.untitled')}
                      </h2>
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-stone-600">
                        {String(message.message ?? '').trim()}
                      </p>

                      {Array.isArray(message.attachments) && message.attachments.length > 0 ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {message.attachments
                            .map(getAttachmentFromValue)
                            .filter((item): item is PhotoAttachment => Boolean(item))
                            .slice(0, maxPhotos)
                            .map((attachment) => (
                              <img
                                key={attachment.id}
                                src={attachment.url}
                                alt=""
                                className="h-16 w-16 rounded-2xl border border-stone-200 bg-stone-50 object-cover"
                              />
                            ))}
                        </div>
                      ) : null}

                      <div className="mt-4 flex flex-wrap gap-2">
                        {linkedLovedOnes.map((person) => (
                          <span
                            key={String(person.id)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-rose-100 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700"
                          >
                            <HeartIcon className="h-3.5 w-3.5" />
                            {getLovedOneLabel(person)}
                          </span>
                        ))}
                        {message.triggerDate ? (
                          <span className="inline-flex rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-700">
                            {formatDate(message.triggerDate)}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(message)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl corner-shape-squircle border border-stone-200 bg-white text-stone-600 transition hover:border-purple-200 hover:text-purple-700"
                        aria-label={t('actions.editAria')}
                      >
                        <EditIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(message)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl corner-shape-squircle border border-stone-200 bg-white text-stone-600 transition hover:border-red-200 hover:text-red-700"
                        aria-label={t('actions.deleteAria')}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </section>
        </main>

        <div
          className="pointer-events-none fixed bottom-[calc(4.85rem+env(safe-area-inset-bottom))] left-4 z-40 lg:hidden"
          data-tour="open-when-floating-create-button"
        >
          <div className="pointer-events-auto rounded-2xl border border-white/80 bg-white/90 p-2 shadow-[0_18px_50px_rgba(15,23,42,0.14)] backdrop-blur-xl">
            <PrimaryButton
              type="button"
              onClick={startCreate}
              disabled={hasReachedMessageLimit}
              className="h-12 w-12 rounded-xl corner-shape-squircle p-0"
            >
              <PlusIcon className="h-5 w-5" />
              <span className="sr-only">{t('actions.create')}</span>
            </PrimaryButton>
          </div>
        </div>

        {renderFormShell(
          <aside className={formPanelClassName}>
            <form
              onSubmit={handleSubmit}
              data-tour="open-when-form"
              className={cn(
                'corner-shape-squircle',
                formModalOpen
                  ? ''
                  : 'rounded-[28px] border border-white/75 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-6',
              )}
            >
              <div data-tour="open-when-form-header">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  {t('form.kicker')}
                </div>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-stone-950">
                  {formTitle}
                </h2>
              </div>

              <div className="mt-5 space-y-4">
                <label className="block">
                  <span className="text-sm font-semibold text-stone-800">{t('form.template')}</span>
                  <span className="mt-1 block text-xs leading-5 text-stone-500">
                    {t('form.templateHelp')}
                  </span>
                  <select
                    value={
                      templates.find(
                        (template) =>
                          t(`templates.${template.key}`) === form.openWhenText &&
                          template.iconKey === form.iconKey &&
                          template.colorKey === form.colorKey,
                      )?.key ?? ''
                    }
                    onChange={(event) => {
                      const template = templates.find((item) => item.key === event.target.value)
                      if (!template) {
                        return
                      }
                      setForm((current) => ({
                        ...current,
                        openWhenText: t(`templates.${template.key}`),
                        iconKey: template.iconKey,
                        colorKey: template.colorKey,
                      }))
                    }}
                    className="mt-2 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-purple-300 focus:ring-4 focus:ring-purple-100"
                  >
                    <option value="">{t('form.chooseTemplate')}</option>
                    {templates.map((template) => (
                      <option key={template.key} value={template.key}>
                        {t(`templates.${template.key}`)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-stone-800">{t('form.openWhen')}</span>
                  <input
                    value={form.openWhenText}
                    onChange={(event) => updateForm('openWhenText', event.target.value)}
                    placeholder={t('form.openWhenPlaceholder')}
                    className="mt-2 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-purple-300 focus:ring-4 focus:ring-purple-100"
                    required
                  />
                </label>

                <div className="grid gap-4">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const previewColor = getColorOption(form.colorKey)
                      const previewIcon = getIconOption(form.iconKey)
                      const PreviewIcon = previewIcon.Icon

                      return (
                        <div
                          aria-hidden="true"
                          className="grid h-[42px] w-[42px] place-items-center rounded-xl border"
                          style={{
                            color: previewColor.value,
                            borderColor: `color-mix(in srgb, ${previewColor.value} 40%, transparent)`,
                            background: `color-mix(in srgb, ${previewColor.value} 10%, transparent)`,
                          }}
                        >
                          <PreviewIcon width={20} height={20} />
                        </div>
                      )
                    })()}
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-stone-800">
                        {t('form.colorIcon')}
                      </div>
                      <div className="text-xs text-stone-500">{t('form.colorIconHelp')}</div>
                    </div>
                  </div>

                  <div className="grid gap-2.5">
                    <div className="text-[13px] font-bold text-stone-800">{t('form.color')}</div>
                    <div className="flex flex-wrap gap-2.5">
                      {GROUP_COLOR_OPTIONS.map((option) => {
                        const active = option.key === form.colorKey

                        return (
                          <button
                            key={option.key}
                            type="button"
                            onClick={() => updateForm('colorKey', option.key)}
                            aria-pressed={active}
                            title={option.label}
                            aria-label={t(`colorLabels.${option.key}`)}
                            className={cn(
                              'relative cursor-pointer rounded-xl border px-3 py-2 text-xs font-medium outline-none transition duration-150 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2',
                            )}
                            style={{
                              color: option.value,
                              backgroundColor: `color-mix(in srgb, ${option.value} 10%, transparent)`,
                              borderColor: active
                                ? option.value
                                : `color-mix(in srgb, ${option.value} 40%, transparent)`,
                            }}
                          >
                            <span
                              aria-hidden="true"
                              className={cn(
                                'pointer-events-none absolute -inset-[4px] rounded-[15px] border-2 transition-opacity',
                                active ? 'opacity-100' : 'opacity-0',
                              )}
                              style={{ borderColor: option.value }}
                            />
                            <span className="block leading-none">
                              {t(`colorLabels.${option.key}`)}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="grid gap-2.5">
                    <div className="text-[13px] font-bold text-stone-800">{t('form.icon')}</div>
                    <div className="flex flex-wrap gap-2.5">
                      {ICON_OPTIONS.map((option) => {
                        const active = option.key === form.iconKey
                        const Icon = option.Icon
                        const color = getColorOption(form.colorKey)

                        return (
                          <button
                            key={option.key}
                            type="button"
                            onClick={() => updateForm('iconKey', option.key)}
                            aria-pressed={active}
                            title={option.label}
                            className={cn(
                              'relative grid h-[42px] w-[42px] cursor-pointer place-items-center rounded-xl border outline-none transition duration-150 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2',
                            )}
                            style={{
                              color: color.value,
                              backgroundColor: `color-mix(in srgb, ${color.value} 10%, transparent)`,
                              borderColor: active
                                ? color.value
                                : `color-mix(in srgb, ${color.value} 40%, transparent)`,
                            }}
                          >
                            <span
                              aria-hidden="true"
                              className={cn(
                                'pointer-events-none absolute -inset-[4px] rounded-[15px] border-2 transition-opacity',
                                active ? 'opacity-100' : 'opacity-0',
                              )}
                              style={{ borderColor: color.value }}
                            />
                            <Icon width={20} height={20} />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <label className="block">
                  <span className="text-sm font-semibold text-stone-800">{t('form.title')}</span>
                  <input
                    value={form.title}
                    onChange={(event) => updateForm('title', event.target.value)}
                    placeholder={t('form.titlePlaceholder')}
                    className="mt-2 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-purple-300 focus:ring-4 focus:ring-purple-100"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-stone-800">{t('form.message')}</span>
                  <textarea
                    value={form.message}
                    onChange={(event) => updateForm('message', event.target.value)}
                    rows={8}
                    placeholder={t('form.messagePlaceholder')}
                    className="mt-2 w-full resize-y rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm leading-6 text-stone-900 outline-none transition focus:border-purple-300 focus:ring-4 focus:ring-purple-100"
                    required
                  />
                </label>

                <div className="grid gap-2">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-stone-800">{t('form.photos')}</div>
                      <div className="mt-1 text-xs leading-5 text-stone-500">
                        {canUseOpenWhenPhotos
                          ? t('form.photosHelp', {
                              count: form.attachments.length,
                              max: maxPhotos,
                            })
                          : t('form.photosProOnly')}
                      </div>
                    </div>
                    <label
                      className={cn(
                        'inline-flex min-h-14 shrink-0 items-center gap-2 rounded-2xl border border-dashed border-purple-200 bg-purple-50/70 px-4 py-3 text-sm font-semibold text-purple-700 transition hover:bg-purple-100/70',
                        photosDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
                      )}
                    >
                      <PhotoIcon className="h-5 w-5 shrink-0" />
                      {t('actions.addPhotos')}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        disabled={photosDisabled}
                        onChange={(event) => {
                          void handlePhotoFiles(event.target.files)
                          event.target.value = ''
                        }}
                        className="sr-only"
                      />
                    </label>
                  </div>

                  {form.attachments.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2">
                      {form.attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="group relative aspect-square overflow-hidden rounded-2xl border border-stone-200 bg-stone-50"
                        >
                          <img src={attachment.url} alt="" className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removePhoto(attachment.id)}
                            className="absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-stone-700 shadow-sm transition hover:bg-red-50 hover:text-red-700"
                            aria-label={t('actions.removePhoto')}
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div>
                  <div className="text-sm font-semibold text-stone-800">{t('form.lovedOnes')}</div>
                  <div className="mt-2 grid gap-2">
                    {lovedOnes.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
                        {t('form.noLovedOnes')}
                      </div>
                    ) : null}
                    {lovedOnes.map((person) => {
                      const id = String(person.id)
                      return (
                        <label
                          key={id}
                          className="flex cursor-pointer items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 transition hover:border-rose-200 hover:bg-rose-50/40"
                        >
                          <input
                            type="checkbox"
                            checked={form.lovedOnes.includes(id)}
                            onChange={() => toggleLovedOne(id)}
                            className="h-4 w-4 rounded border-stone-300 text-purple-600 focus:ring-purple-500"
                          />
                          <span className="min-w-0 flex-1 truncate">
                            {getLovedOneLabel(person)}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                <label className="block">
                  <span className="text-sm font-semibold text-stone-800">
                    {t('form.optionalDate')}
                  </span>
                  <input
                    type="date"
                    value={form.triggerDate}
                    onChange={(event) => updateForm('triggerDate', event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-purple-300 focus:ring-4 focus:ring-purple-100"
                  />
                </label>

                <label className="flex items-start gap-3 rounded-2xl border border-purple-100 bg-purple-50/60 p-4">
                  <input
                    type="checkbox"
                    checked={form.allowSendWhileActive}
                    onChange={(event) => updateForm('allowSendWhileActive', event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-stone-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="min-w-0 text-sm leading-6 text-stone-700">
                    <span className="block font-semibold text-stone-900">
                      {t('form.allowSendTitle')}
                    </span>
                    {t('form.allowSendHelp')}
                  </span>
                </label>

              </div>

              <div
                className={cn(
                  formModalOpen
                    ? 'sticky bottom-0 z-20 -mx-3 mt-4 flex flex-col gap-2 border-t border-stone-200 bg-white/95 p-3 shadow-[0_-18px_45px_rgba(15,23,42,0.08)] backdrop-blur sm:-mx-4 sm:flex-row sm:flex-wrap sm:justify-between'
                    : 'mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-between',
                )}
              >
                {hasReachedMessageLimit ? (
                  <p className="w-full text-xs leading-5 text-amber-700">
                    {t('errors.messageLimit', { max: openWhenMessageCountLimit })}
                  </p>
                ) : null}

                <div className="flex flex-col gap-2 sm:ml-auto sm:flex-row">
                  <SecondaryButton
                    type="button"
                    onClick={resetForm}
                    disabled={saving}
                    className="w-full sm:w-auto"
                  >
                    {t('actions.cancel')}
                  </SecondaryButton>

                  <PrimaryButton
                    type="submit"
                    disabled={saving || lovedOnes.length === 0 || hasReachedMessageLimit}
                    className="w-full gap-2 sm:w-auto"
                  >
                    <PlusIcon className="h-4 w-4" />
                    {saving
                      ? t('actions.saving')
                      : editingId
                        ? t('actions.saveChanges')
                        : t('actions.create')}
                  </PrimaryButton>
                </div>
              </div>
            </form>
          </aside>,
        )}
      </div>
    </div>
  )
}
