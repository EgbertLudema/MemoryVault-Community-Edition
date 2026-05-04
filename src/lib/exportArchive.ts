import path from 'path'
import sharp from 'sharp'
import type { LegacyDeliveryData } from '@/lib/legacyDeliveryContent'

type ZipEntry = {
  name: string
  data: Buffer
}

type MemoryMediaNames = Record<string, string[]>

type PdfLine = {
  text: string
  font: 'F1' | 'F2'
  fontSize: number
  color: string
  x: number
  y: number
  leading?: number
}

type EmojiLineImage = {
  data: Buffer
  width: number
  height: number
}

const PAGE_WIDTH = 612
const PAGE_HEIGHT = 792
const PDF_RENDER_SCALE = 2.5
const MARGIN_X = 56
const MARGIN_TOP = 64
const MARGIN_BOTTOM = 56
const TITLE_COLOR = '6D28D9'
const DATE_COLOR = '7C3AED'
const BODY_COLOR = '1F2937'
const MUTED_COLOR = '6B7280'

const CP1252_EXTRA: Record<number, number> = {
  0x20ac: 0x80,
  0x201a: 0x82,
  0x0192: 0x83,
  0x201e: 0x84,
  0x2026: 0x85,
  0x2020: 0x86,
  0x2021: 0x87,
  0x02c6: 0x88,
  0x2030: 0x89,
  0x0160: 0x8a,
  0x2039: 0x8b,
  0x0152: 0x8c,
  0x017d: 0x8e,
  0x2018: 0x91,
  0x2019: 0x92,
  0x201c: 0x93,
  0x201d: 0x94,
  0x2022: 0x95,
  0x2013: 0x96,
  0x2014: 0x97,
  0x02dc: 0x98,
  0x2122: 0x99,
  0x0161: 0x9a,
  0x203a: 0x9b,
  0x0153: 0x9c,
  0x017e: 0x9e,
  0x0178: 0x9f,
}

function sanitizeSegment(value: string, fallback: string) {
  const normalized = value
    .normalize('NFKD')
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return normalized || fallback
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function encodeCp1252(value: string) {
  const bytes: number[] = []

  for (const char of value) {
    const code = char.codePointAt(0) ?? 0x3f

    if (code <= 0x7f || (code >= 0xa0 && code <= 0xff)) {
      bytes.push(code)
      continue
    }

    bytes.push(CP1252_EXTRA[code] ?? 0x3f)
  }

  return Buffer.from(bytes)
}

function toPdfHexString(value: string) {
  return `<${encodeCp1252(value).toString('hex').toUpperCase()}>`
}

function colorToPdf(hex: string) {
  const raw = hex.replace('#', '')
  const r = parseInt(raw.slice(0, 2), 16) / 255
  const g = parseInt(raw.slice(2, 4), 16) / 255
  const b = parseInt(raw.slice(4, 6), 16) / 255
  return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)}`
}

function lineToPdfText(line: PdfLine) {
  return `BT /${line.font} ${line.fontSize} Tf ${colorToPdf(line.color)} rg 1 0 0 1 ${line.x} ${line.y} Tm ${toPdfHexString(line.text)} Tj ET`
}

function lineHasEmoji(text: string) {
  return /\p{Extended_Pictographic}/u.test(text)
}

function wrapText(value: string, maxChars: number) {
  const lines: string[] = []
  const paragraphs = value.replace(/\r\n/g, '\n').split('\n')

  for (const paragraph of paragraphs) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean)

    if (words.length === 0) {
      lines.push('')
      continue
    }

    let current = ''

    for (const word of words) {
      const next = current ? `${current} ${word}` : word

      if (next.length > maxChars && current) {
        lines.push(current)
        current = word
      } else {
        current = next
      }
    }

    if (current) {
      lines.push(current)
    }
  }

  return lines
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return 'Undated'
  }

  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) {
    return 'Undated'
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

function buildPdfPages(delivery: LegacyDeliveryData, memoryMediaNames: MemoryMediaNames) {
  const pages: PdfLine[][] = [[]]
  let pageIndex = 0
  let cursorY = PAGE_HEIGHT - MARGIN_TOP

  const pushLine = (
    text: string,
    font: 'F1' | 'F2',
    fontSize: number,
    lineColor: string,
    leading: number,
    gapAfter = 0,
  ) => {
    if (cursorY - leading < MARGIN_BOTTOM) {
      pages.push([])
      pageIndex += 1
      cursorY = PAGE_HEIGHT - MARGIN_TOP
    }

    pages[pageIndex].push({
      text,
      font,
      fontSize,
      color: lineColor,
      x: MARGIN_X,
      y: cursorY,
      leading,
    })

    cursorY -= leading + gapAfter
  }

  const pushWrappedBlock = (
    text: string,
    font: 'F1' | 'F2',
    fontSize: number,
    lineColor: string,
    maxChars: number,
    leading: number,
    gapAfter = 0,
  ) => {
    const lines = wrapText(text, maxChars)

    lines.forEach((line, index) => {
      pushLine(line, font, fontSize, lineColor, leading, index === lines.length - 1 ? gapAfter : 0)
    })
  }

  pushWrappedBlock(`Memories for ${delivery.recipientName}`, 'F2', 22, TITLE_COLOR, 34, 28, 8)
  pushWrappedBlock('Recipient note', 'F2', 13, TITLE_COLOR, 40, 18, 4)
  pushWrappedBlock(delivery.recipientNote || 'No recipient note.', 'F1', 11, BODY_COLOR, 88, 15, 14)

  delivery.memories.forEach((memory, memoryIndex) => {
    const memoryNotes = memory.content
      .filter((item): item is Extract<(typeof memory.content)[number], { type: 'note' }> => item.type === 'note')
      .map((item) => item.note.trim())
      .filter(Boolean)
    const mediaNames = memoryMediaNames[String(memory.id)] ?? []

    if (memoryNotes.length === 0 && mediaNames.length === 0) {
      return
    }

    pushWrappedBlock(memory.title || `Memory ${memoryIndex + 1}`, 'F2', 15, TITLE_COLOR, 42, 20, 1)
    pushWrappedBlock(formatDate(memory.memoryDate), 'F2', 10, DATE_COLOR, 60, 14, 5)

    memoryNotes.forEach((note, noteIndex) => {
      const text = memoryNotes.length > 1 ? `Note ${noteIndex + 1}: ${note}` : note
      pushWrappedBlock(text, 'F1', 11, BODY_COLOR, 88, 15, 6)
    })

    if (mediaNames.length > 0) {
      pushWrappedBlock('Media of this memory:', 'F2', 11, TITLE_COLOR, 88, 15, 3)

      mediaNames.forEach((name) => {
        pushWrappedBlock(name, 'F1', 11, BODY_COLOR, 88, 15, 2)
      })
    }

    cursorY -= 8
  })

  if (pages[0].length === 0) {
    pushWrappedBlock('No notes available.', 'F1', 11, MUTED_COLOR, 88, 15, 0)
  }

  return pages
}

export function buildRecipientExportFilename(recipientName: string) {
  const base = sanitizeSegment(recipientName.toLowerCase(), 'recipient')
  return `${base}-memory-vault-export.zip`
}

export async function createRecipientPdf(
  delivery: LegacyDeliveryData,
  memoryMediaNames: MemoryMediaNames = {},
) {
  const pages = buildPdfPages(delivery, memoryMediaNames)
  const emojiLineImages = new Map<string, EmojiLineImage>()

  await Promise.all(
    pages.flatMap((lines, pageIndex) =>
      lines.map(async (line, lineIndex) => {
        if (!lineHasEmoji(line.text)) {
          return
        }

        const lineHeight = Math.max((line.leading ?? 15) + 4, line.fontSize + 8)
        const svg = [
          `<svg xmlns="http://www.w3.org/2000/svg" width="${(PAGE_WIDTH - MARGIN_X * 2) * PDF_RENDER_SCALE}" height="${lineHeight * PDF_RENDER_SCALE}" viewBox="0 0 ${PAGE_WIDTH - MARGIN_X * 2} ${lineHeight}">`,
          `<rect width="100%" height="100%" fill="#ffffff" />`,
          `<text x="0" y="${line.fontSize + 1}" font-family="Segoe UI, Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, Arial, sans-serif" font-size="${line.fontSize}px" font-weight="${line.font === 'F2' ? 700 : 400}" fill="#${line.color}" xml:space="preserve">${escapeXml(line.text)}</text>`,
          '</svg>',
        ].join('')

        const rendered = await sharp(Buffer.from(svg))
          .removeAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true })

        emojiLineImages.set(`${pageIndex}:${lineIndex}`, {
          data: rendered.data,
          width: Number(rendered.info.width ?? (PAGE_WIDTH - MARGIN_X * 2) * PDF_RENDER_SCALE),
          height: Number(rendered.info.height ?? lineHeight * PDF_RENDER_SCALE),
        })
      }),
    ),
  )

  const objects: string[] = []
  const imageObjects: Buffer[] = []
  const pageRefs: string[] = []
  const imageRefs: number[] = []
  const pageImageRefs: number[][] = []

  objects.push('<< /Type /Catalog /Pages 2 0 R >>')
  objects.push('')
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>')

  pages.forEach((lines, pageIndex) => {
    pageImageRefs[pageIndex] = []
    lines.forEach((_, lineIndex) => {
      const image = emojiLineImages.get(`${pageIndex}:${lineIndex}`)
      if (!image) {
        return
      }

      const objectNumber = objects.length + imageObjects.length + 1
      imageRefs.push(objectNumber)
      pageImageRefs[pageIndex].push(objectNumber)
      imageObjects.push(
        Buffer.concat([
          Buffer.from(
            `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length ${image.data.length} >>\nstream\n`,
            'binary',
          ),
          image.data,
          Buffer.from('\nendstream', 'binary'),
        ]),
      )
    })
  })

  pages.forEach((lines, pageIndex) => {
    const pageObjectNumber = objects.length + imageObjects.length + 1
    const contentObjectNumber = objects.length + imageObjects.length + 2
    pageRefs.push(`${pageObjectNumber} 0 R`)
    const imageEntries: string[] = []
    const contentParts: string[] = []
    let imageCounter = 0

    lines.forEach((line, lineIndex) => {
      const image = emojiLineImages.get(`${pageIndex}:${lineIndex}`)

      if (!image) {
        contentParts.push(lineToPdfText(line))
        return
      }

      imageCounter += 1
      const imageName = `Im${imageCounter}`
      const objectRef = pageImageRefs[pageIndex][imageCounter - 1]
      const displayWidth = image.width / PDF_RENDER_SCALE
      const displayHeight = image.height / PDF_RENDER_SCALE
      const y = line.y - Math.max(displayHeight - (line.fontSize + 4), 0)

      imageEntries.push(`/${imageName} ${objectRef} 0 R`)
      contentParts.push(`q ${displayWidth} 0 0 ${displayHeight} ${line.x} ${y} cm /${imageName} Do Q`)
    })

    const content = contentParts.join('\n')
    const resources = imageEntries.length
      ? `<< /Font << /F1 3 0 R /F2 4 0 R >> /ProcSet [/PDF /Text /ImageC] /XObject << ${imageEntries.join(' ')} >> >>`
      : '<< /Font << /F1 3 0 R /F2 4 0 R >> >>'

    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources ${resources} /Contents ${contentObjectNumber} 0 R >>`,
    )
    objects.push(`<< /Length ${Buffer.byteLength(content, 'utf8')} >>\nstream\n${content}\nendstream`)
  })

  objects[1] = `<< /Type /Pages /Count ${pages.length} /Kids [${pageRefs.join(' ')}] >>`

  const objectBuffers = [
    ...objects.slice(0, 4).map((value) => Buffer.from(value, 'utf8')),
    ...imageObjects,
    ...objects.slice(4).map((value) => Buffer.from(value, 'utf8')),
  ]
  const chunks: Buffer[] = [Buffer.from('%PDF-1.4\n', 'binary')]
  const offsets: number[] = [0]
  let position = chunks[0].length

  objectBuffers.forEach((objectBuffer, index) => {
    offsets.push(position)
    const prefix = Buffer.from(`${index + 1} 0 obj\n`, 'binary')
    const suffix = Buffer.from('\nendobj\n', 'binary')
    chunks.push(prefix, objectBuffer, suffix)
    position += prefix.length + objectBuffer.length + suffix.length
  })

  const xrefOffset = position
  let xref = `xref\n0 ${objectBuffers.length + 1}\n`
  xref += '0000000000 65535 f \n'

  for (let index = 1; index < offsets.length; index += 1) {
    xref += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`
  }

  xref += `trailer\n<< /Size ${objectBuffers.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  chunks.push(Buffer.from(xref, 'binary'))

  return Buffer.concat(chunks)
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)

  for (let index = 0; index < 256; index += 1) {
    let value = index

    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
    }

    table[index] = value >>> 0
  }

  return table
})()

function crc32(buffer: Buffer) {
  let crc = 0xffffffff

  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }

  return (crc ^ 0xffffffff) >>> 0
}

function getDosDateTime(date = new Date()) {
  const year = Math.max(date.getFullYear(), 1980)
  const dosTime =
    (date.getSeconds() >> 1) | (date.getMinutes() << 5) | (date.getHours() << 11)
  const dosDate = date.getDate() | ((date.getMonth() + 1) << 5) | ((year - 1980) << 9)

  return { dosDate, dosTime }
}

export function createZip(entries: ZipEntry[]) {
  const fileParts: Buffer[] = []
  const centralDirectory: Buffer[] = []
  let offset = 0
  const { dosDate, dosTime } = getDosDateTime()

  entries.forEach((entry) => {
    const nameBuffer = Buffer.from(entry.name, 'utf8')
    const data = entry.data
    const entryCrc = crc32(data)

    const localHeader = Buffer.alloc(30)
    localHeader.writeUInt32LE(0x04034b50, 0)
    localHeader.writeUInt16LE(20, 4)
    localHeader.writeUInt16LE(0x0800, 6)
    localHeader.writeUInt16LE(0, 8)
    localHeader.writeUInt16LE(dosTime, 10)
    localHeader.writeUInt16LE(dosDate, 12)
    localHeader.writeUInt32LE(entryCrc, 14)
    localHeader.writeUInt32LE(data.length, 18)
    localHeader.writeUInt32LE(data.length, 22)
    localHeader.writeUInt16LE(nameBuffer.length, 26)
    localHeader.writeUInt16LE(0, 28)

    fileParts.push(localHeader, nameBuffer, data)

    const centralHeader = Buffer.alloc(46)
    centralHeader.writeUInt32LE(0x02014b50, 0)
    centralHeader.writeUInt16LE(20, 4)
    centralHeader.writeUInt16LE(20, 6)
    centralHeader.writeUInt16LE(0x0800, 8)
    centralHeader.writeUInt16LE(0, 10)
    centralHeader.writeUInt16LE(dosTime, 12)
    centralHeader.writeUInt16LE(dosDate, 14)
    centralHeader.writeUInt32LE(entryCrc, 16)
    centralHeader.writeUInt32LE(data.length, 20)
    centralHeader.writeUInt32LE(data.length, 24)
    centralHeader.writeUInt16LE(nameBuffer.length, 28)
    centralHeader.writeUInt16LE(0, 30)
    centralHeader.writeUInt16LE(0, 32)
    centralHeader.writeUInt16LE(0, 34)
    centralHeader.writeUInt16LE(0, 36)
    centralHeader.writeUInt32LE(0, 38)
    centralHeader.writeUInt32LE(offset, 42)

    centralDirectory.push(centralHeader, nameBuffer)
    offset += localHeader.length + nameBuffer.length + data.length
  })

  const centralDirectoryBuffer = Buffer.concat(centralDirectory)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(0, 4)
  end.writeUInt16LE(0, 6)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(centralDirectoryBuffer.length, 12)
  end.writeUInt32LE(offset, 16)
  end.writeUInt16LE(0, 20)

  return Buffer.concat([...fileParts, centralDirectoryBuffer, end])
}

export function buildExportMediaPath(
  filename: string | null | undefined,
  fallbackStem: string,
  usedNames: Set<string>,
) {
  const originalName = String(filename ?? '').trim()
  const ext = path.extname(originalName) || ''
  const stem = sanitizeSegment(path.basename(originalName, ext), fallbackStem)
  const safeExt = sanitizeSegment(ext.replace(/^\./, '').toLowerCase(), '').replace(/\./g, '')
  const baseName = safeExt ? `${stem}.${safeExt}` : stem

  let candidate = `media/${baseName}`
  let suffix = 2

  while (usedNames.has(candidate)) {
    const nextName = safeExt ? `${stem}-${suffix}.${safeExt}` : `${stem}-${suffix}`
    candidate = `media/${nextName}`
    suffix += 1
  }

  usedNames.add(candidate)
  return candidate
}
