import type { AlbumsResponse, YearsResponse } from './types'

export async function fetchYears(): Promise<YearsResponse | null> {
  try {
    const res = await fetch('/api/album-years', { cache: 'no-store' })
    if (!res.ok) return null
    return (await res.json()) as YearsResponse
  } catch {
    return null
  }
}

export async function fetchYearPage(
  year: number,
  page: number,
  limit = 400,
): Promise<AlbumsResponse | null> {
  try {
    const res = await fetch(`/api/albums?year=${year}&page=${page}&limit=${limit}`, {
      cache: 'no-store',
    })
    if (!res.ok) return null
    return (await res.json()) as AlbumsResponse
  } catch {
    return null
  }
}
