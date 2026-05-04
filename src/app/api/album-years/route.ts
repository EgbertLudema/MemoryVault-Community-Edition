// /app/api/album-years/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import payloadConfig from '@/payload.config'

export const dynamic = 'force-dynamic'

type YearBucket = {
  year: number
  count: number
}

type YearsResponseDTO = {
  years: YearBucket[] // sorted desc (latest first)
  totalDocs: number
}

export async function GET(_req: NextRequest) {
  try {
    const payload = await getPayload({ config: payloadConfig })

    const limit = 500
    let page = 1
    let totalPages = 1
    let totalDocs = 0

    const counts = new Map<number, number>()

    do {
      const res = await payload.find({
        collection: 'memories',
        page,
        limit,
        depth: 0,
        select: {
          memoryDate: true,
        },
        sort: '-memoryDate',
      })

      totalPages = res.totalPages ?? 1
      totalDocs = res.totalDocs ?? 0

      for (const doc of res.docs) {
        const y = new Date(String(doc.memoryDate ?? '')).getFullYear()
        if (!Number.isFinite(y)) continue
        counts.set(y, (counts.get(y) ?? 0) + 1)
      }

      page += 1
    } while (page <= totalPages)

    const years = Array.from(counts.entries())
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => a.year - b.year)

    const out: YearsResponseDTO = { years, totalDocs }
    return NextResponse.json(out, { status: 200 })
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to list years', details: err?.message ?? String(err) },
      { status: 500 },
    )
  }
}
