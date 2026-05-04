export type FeatureGradientKey = 'notes' | 'photos' | 'videos' | 'groupSharing' | 'lovedOnes'

type FeatureGradient = {
  className: string
  backgroundImage: string
}

export const FEATURE_GRADIENTS: Record<FeatureGradientKey, FeatureGradient> = {
  notes: {
    className: 'bg-gradient-to-br from-blue-400 to-indigo-500',
    backgroundImage: 'linear-gradient(to bottom right, rgb(96 165 250), rgb(99 102 241))',
  },
  photos: {
    className: 'bg-gradient-to-br from-rose-400 to-pink-500',
    backgroundImage: 'linear-gradient(to bottom right, rgb(251 113 133), rgb(236 72 153))',
  },
  videos: {
    className: 'bg-gradient-to-br from-amber-400 to-orange-500',
    backgroundImage: 'linear-gradient(to bottom right, rgb(251 191 36), rgb(249 115 22))',
  },
  groupSharing: {
    className: 'bg-gradient-to-br from-teal-400 to-cyan-500',
    backgroundImage: 'linear-gradient(to bottom right, rgb(45 212 191), rgb(6 182 212))',
  },
  lovedOnes: {
    className: 'bg-gradient-to-br from-rose-400 to-red-500',
    backgroundImage: 'linear-gradient(to bottom right, rgb(251 113 133), rgb(239 68 68))',
  },
}
