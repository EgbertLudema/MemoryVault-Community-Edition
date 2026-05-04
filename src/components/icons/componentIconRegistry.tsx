import * as React from 'react'
import { AccountCircleIcon } from '@/components/icons/AccountCircleIcon'
import { ArrowRightIcon } from '@/components/icons/ArrowRightIcon'
import { BabyIcon } from '@/components/icons/BabyIcon'
import { BulletListIcon } from '@/components/icons/BulletListIcon'
import { CheckIcon } from '@/components/icons/CheckIcon'
import { CommunityIcon } from '@/components/icons/CommunityIcon'
import { EditIcon } from '@/components/icons/EditIcon'
import { FamilyIcon } from '@/components/icons/FamilyIcon'
import { FriendsIcon } from '@/components/icons/FriendsIcon'
import { GithubCatIcon } from '@/components/icons/GithubCatIcon'
import { GithubIcon } from '@/components/icons/GithubIcon'
import { HeartIcon } from '@/components/icons/HeartIcon'
import { HouseIcon } from '@/components/icons/HouseIcon'
import { InfoRoundIcon } from '@/components/icons/InfoRoundIcon'
import { LanguagesIcon } from '@/components/icons/LanguagesIcon'
import { LightbulbIcon } from '@/components/icons/LightbulbIcon'
import { LockIcon } from '@/components/icons/LockIcon'
import { MailIcon } from '@/components/icons/MailIcon'
import { MemoryBookIcon } from '@/components/icons/MemoryBookIcon'
import { MinusIcon } from '@/components/icons/MinusIcon'
import { NotesIcon } from '@/components/icons/NotesIcon'
import { OpenStarIcon } from '@/components/icons/OpenStarIcon'
import { PhotoIcon } from '@/components/icons/PhotoIcon'
import { PlusIcon } from '@/components/icons/PlusIcon'
import { QuestionRoundIcon } from '@/components/icons/QuestionRoundIcon'
import { RedirectIcon } from '@/components/icons/RedirectIcon'
import { RotateLeftIcon } from '@/components/icons/RotateLeftIcon'
import { SearchIcon } from '@/components/icons/SearchIcon'
import { ShakeHandsIcon } from '@/components/icons/ShakeHandsIcon'
import { StarIcon } from '@/components/icons/StarIcon'
import { TrashIcon } from '@/components/icons/TrashIcon'
import { TwoPersonsIcon } from '@/components/icons/TwoPersonsIcon'
import { VideoIcon } from '@/components/icons/VideoIcon'
import { WorldIcon } from '@/components/icons/WorldIcon'
import type { ComponentIconKey } from '@/lib/iconOptions'

export const componentIconMap: Record<
  ComponentIconKey,
  React.ComponentType<React.SVGProps<SVGSVGElement>>
> = {
  'account-circle': AccountCircleIcon,
  'arrow-right': ArrowRightIcon,
  baby: BabyIcon,
  'bullet-list': BulletListIcon,
  check: CheckIcon,
  community: CommunityIcon,
  edit: EditIcon,
  family: FamilyIcon,
  friends: FriendsIcon,
  'github-cat': GithubCatIcon,
  github: GithubIcon,
  heart: HeartIcon,
  house: HouseIcon,
  'info-round': InfoRoundIcon,
  languages: LanguagesIcon,
  lightbulb: LightbulbIcon,
  lock: LockIcon,
  mail: MailIcon,
  'memory-book': MemoryBookIcon,
  minus: MinusIcon,
  notes: NotesIcon,
  'open-star': OpenStarIcon,
  photo: PhotoIcon,
  plus: PlusIcon,
  'question-round': QuestionRoundIcon,
  redirect: RedirectIcon,
  'rotate-left': RotateLeftIcon,
  search: SearchIcon,
  'shake-hands': ShakeHandsIcon,
  star: StarIcon,
  trash: TrashIcon,
  'two-persons': TwoPersonsIcon,
  video: VideoIcon,
  world: WorldIcon,
}

export function getComponentIcon(iconKey: string | null | undefined) {
  const key = String(iconKey ?? '').trim() as ComponentIconKey
  return componentIconMap[key] ?? null
}
