import { decryptSensitiveText, encryptSensitiveText } from '@/lib/encryptedFields'

export type DigitalLegacyCategoryKey =
  | 'access'
  | 'government'
  | 'money'
  | 'cloud'
  | 'memories'
  | 'social'
  | 'subscriptions'
  | 'business'
  | 'trusted'
  | 'accounts'
  | 'files'
  | 'wishes'
  | 'cleanup'
  | 'priority'
  | 'important'
  | 'later'
  | 'devices'
  | 'assets'

export type DigitalLegacyPriority = 'high' | 'normal' | 'low'

export type DigitalLegacyDefaultItem = {
  title: string
  enTitle: string
  priority: DigitalLegacyPriority
}

export type DigitalLegacyCategory = {
  key: DigitalLegacyCategoryKey
  title: string
  body: string
  defaults: DigitalLegacyDefaultItem[]
}

export type DigitalLegacyItemData = {
  id: number | string
  title: string
  category: DigitalLegacyCategoryKey
  notes: string
  priority: DigitalLegacyPriority
  checked: boolean
  isDefault: boolean
  sortOrder: number
  lovedOnes: Array<number | string>
}

export const digitalLegacyCategories: DigitalLegacyCategory[] = [
  {
    key: 'access',
    title: 'Je belangrijkste toegang',
    body: 'Wie je vertrouwt, hoe die persoon binnenkomt, en wat er verder moet gebeuren.',
    defaults: [
      {
        title: 'Wijs een vertrouwenspersoon aan die weet waar alles staat',
        enTitle: 'Choose a trusted person who knows where everything is',
        priority: 'high',
      },
      {
        title: 'Bespreek wat je vertrouwenspersoon wel en niet mag doen',
        enTitle: 'Discuss what your trusted person may and may not do',
        priority: 'high',
      },
      {
        title: 'Leg vast hoe toegang tot je telefoon, laptop en wachtwoordkluis geregeld is',
        enTitle: 'Record how access to your phone, laptop, and password manager is arranged',
        priority: 'high',
      },
      {
        title: 'Schrijf een korte eerste-hulp-instructie voor de eerste week',
        enTitle: 'Write a short first-week instruction',
        priority: 'high',
      },
      {
        title: 'Controleer of noodcontacten en herstelgegevens actueel zijn',
        enTitle: 'Check that emergency contacts and recovery details are current',
        priority: 'normal',
      },
      {
        title: 'Schrijf je wensen op voor uitvaart, herdenking of muziek',
        enTitle: 'Write down your wishes for the funeral, memorial, or music',
        priority: 'normal',
      },
      {
        title: 'Plan elk jaar een korte controle van deze checklist',
        enTitle: 'Schedule a short yearly review of this checklist',
        priority: 'low',
      },
    ],
  },
  {
    key: 'government',
    title: 'Overheid en administratie',
    body: 'DigiD, belastingen, verzekeringen en officiele documenten die nabestaanden nodig hebben.',
    defaults: [
      {
        title: 'Zet je DigiD-toegang en overheidszaken op de instructielijst',
        enTitle: 'Add your DigiD access and government matters to the instruction list',
        priority: 'high',
      },
      {
        title: 'Leg vast waar testament, wilsverklaring en belangrijke papieren liggen',
        enTitle: 'Record where your will, advance directive, and key papers are stored',
        priority: 'high',
      },
      {
        title: 'Noteer waar hypotheek, huur, pensioen en belastingzaken staan',
        enTitle: 'Note where mortgage, rent, pension, and tax documents are stored',
        priority: 'high',
      },
      {
        title: 'Leg vast welke verzekeringen er lopen en waar de polissen staan',
        enTitle: 'Record which insurance policies you have and where they are stored',
        priority: 'normal',
      },
      {
        title: 'Noteer de contactgegevens van je notaris, boekhouder of financieel adviseur',
        enTitle: 'Note the contact details of your notary, accountant, or financial advisor',
        priority: 'normal',
      },
    ],
  },
  {
    key: 'money',
    title: 'Geld en digitale bezittingen',
    body: 'Banken, beleggingen en andere bezittingen met waarde.',
    defaults: [
      {
        title: 'Leg vast welke bank-, betaal- en beleggingsaccounts je hebt',
        enTitle: 'Record which banking, payment, and investment accounts you have',
        priority: 'high',
      },
      {
        title: 'Noteer digitale bezittingen met waarde, zoals tegoedbonnen of spaarpunten',
        enTitle: 'Note valuable digital assets such as gift cards or loyalty points',
        priority: 'normal',
      },
      {
        title: 'Maak een overzicht van waardevolle spullen zoals sieraden of kunst',
        enTitle: 'List valuable belongings such as jewelry or art',
        priority: 'normal',
      },
    ],
  },
  {
    key: 'cloud',
    title: "E-mail, cloud en bestanden",
    body: 'Waar je mail, bestanden en back-ups staan, en wie daar later bij moet kunnen.',
    defaults: [
      {
        title: 'Noteer welke e-mailaccounts cruciaal zijn voor herstelcodes',
        enTitle: 'Note which email accounts are crucial for recovery codes',
        priority: 'high',
      },
      {
        title: 'Noteer waar cloudopslag zoals Google Drive, iCloud of Dropbox staat',
        enTitle: 'Note where cloud storage such as Google Drive, iCloud, or Dropbox is kept',
        priority: 'normal',
      },
      {
        title: 'Noteer waar familiedocumenten, scans en belangrijke bestanden staan',
        enTitle: 'Note where family documents, scans, and important files are stored',
        priority: 'normal',
      },
      {
        title: 'Leg uit welke privebestanden niet gedeeld mogen worden',
        enTitle: 'Explain which private files should not be shared',
        priority: 'normal',
      },
    ],
  },
  {
    key: 'memories',
    title: "Foto's, video's en herinneringen",
    body: 'De momenten die je wilt bewaren, en wie daar later bij mag.',
    defaults: [
      {
        title: "Bepaal wie toegang krijgt tot je foto's, video's en persoonlijke herinneringen",
        enTitle: 'Decide who gets access to your photos, videos, and personal memories',
        priority: 'high',
      },
      {
        title: "Maak duidelijk waar je foto's en video's staan",
        enTitle: 'Make clear where your photos and videos are stored',
        priority: 'normal',
      },
      {
        title: 'Schrijf persoonlijke boodschappen of Open Wanneer berichten',
        enTitle: 'Write personal messages or Open When messages',
        priority: 'low',
      },
    ],
  },
  {
    key: 'social',
    title: 'Sociale media en communicatie',
    body: 'Wat er met je profielen en gesprekken moet gebeuren.',
    defaults: [
      {
        title: 'Beschrijf wat er met je sociale media profielen moet gebeuren',
        enTitle: 'Describe what should happen to your social media profiles',
        priority: 'normal',
      },
      {
        title: 'Leg vast welke accounts gesloten of juist bewaard moeten blijven',
        enTitle: 'Record which accounts should be closed or kept',
        priority: 'normal',
      },
      {
        title: 'Noteer welke berichten-apps, zoals WhatsApp, belangrijke gesprekken bevatten',
        enTitle: 'Note which messaging apps, such as WhatsApp, hold important conversations',
        priority: 'low',
      },
    ],
  },
  {
    key: 'subscriptions',
    title: 'Abonnementen en lidmaatschappen',
    body: 'Terugkerende betalingen die stopgezet, overgezet of opgezegd moeten worden.',
    defaults: [
      {
        title: 'Maak een overzicht van abonnementen die automatisch worden betaald',
        enTitle: 'List subscriptions that are paid automatically',
        priority: 'high',
      },
      {
        title: 'Noteer lidmaatschappen zoals een sportschool of vereniging',
        enTitle: 'Note memberships such as a gym or club',
        priority: 'normal',
      },
    ],
  },
  {
    key: 'business',
    title: 'Bedrijfzaken',
    body: 'Zakelijke toegang, klanten, domeinen, hosting en administratie.',
    defaults: [
      {
        title: 'Maak een lijst van zakelijke accounts, websites, domeinnamen en hosting',
        enTitle: 'List business accounts, websites, domain names, and hosting',
        priority: 'normal',
      },
      {
        title: 'Beschrijf wie klanten, werkgever of samenwerkingspartners moet informeren',
        enTitle: 'Describe who should inform clients, employer, or partners',
        priority: 'normal',
      },
      {
        title: 'Noteer waar zakelijke administratie en contracten staan',
        enTitle: 'Note where business administration and contracts are stored',
        priority: 'normal',
      },
    ],
  },
]

export const digitalLegacyCategoryKeys = new Set(
  digitalLegacyCategories.map((category) => category.key),
)

export const ENCRYPTED_DIGITAL_LEGACY_TITLE_PLACEHOLDER = 'Encrypted digital checklist item'
export const ENCRYPTED_DIGITAL_LEGACY_NOTES_PLACEHOLDER = 'Encrypted digital checklist notes'

export function inferDigitalLegacyCategory(title: string, fallback?: unknown): DigitalLegacyCategoryKey {
  const value = title.toLowerCase()
  const key = String(fallback ?? '').trim() as DigitalLegacyCategoryKey

  if (
    key === 'access' ||
    key === 'government' ||
    key === 'money' ||
    key === 'cloud' ||
    key === 'memories' ||
    key === 'social' ||
    key === 'subscriptions' ||
    key === 'business'
  ) {
    return key
  }

  if (
    value.includes('vertrouwenspersoon') ||
    value.includes('testament') ||
    value.includes('wilsverklaring') ||
    value.includes('eerste-hulp') ||
    value.includes('noodcontact') ||
    value.includes('wachtwoordkluis') ||
    value.includes('wachtwoord') ||
    value.includes('toegang')
  ) {
    return 'access'
  }

  if (
    value.includes('digid') ||
    value.includes('overheid') ||
    value.includes('belasting') ||
    value.includes('pensioen') ||
    value.includes('hypotheek') ||
    value.includes('huur') ||
    value.includes('verzekering') ||
    value.includes('notaris') ||
    value.includes('boekhoud')
  ) {
    return 'government'
  }

  if (
    value.includes('bank') ||
    value.includes('beleg') ||
    value.includes('crypto') ||
    value.includes('tegoed') ||
    value.includes('betaal') ||
    value.includes('spaar') ||
    value.includes('sieraden') ||
    value.includes('kunst')
  ) {
    return 'money'
  }

  if (
    value.includes('e-mail') ||
    value.includes('email') ||
    value.includes('cloud') ||
    value.includes('drive') ||
    value.includes('dropbox') ||
    value.includes('icloud') ||
    value.includes('bestand') ||
    value.includes('document') ||
    value.includes('scan') ||
    value.includes('back-up') ||
    value.includes('backup') ||
    value.includes('usb') ||
    value.includes('schijf') ||
    value.includes('telefoon') ||
    value.includes('laptop') ||
    value.includes('tablet') ||
    value.includes('computer') ||
    value.includes('apparaat')
  ) {
    return 'cloud'
  }

  if (
    value.includes('foto') ||
    value.includes('video') ||
    value.includes('album') ||
    value.includes('herinnering') ||
    value.includes('boodschap') ||
    value.includes('open when') ||
    value.includes('open wanneer')
  ) {
    return 'memories'
  }

  if (
    value.includes('sociale media') ||
    value.includes('facebook') ||
    value.includes('instagram') ||
    value.includes('linkedin') ||
    value.includes('tiktok') ||
    value.includes('whatsapp') ||
    value.includes('profiel') ||
    value.includes('bericht')
  ) {
    return 'social'
  }

  if (
    value.includes('abonnement') ||
    value.includes('lidmaatschap') ||
    value.includes('sportschool') ||
    value.includes('vereniging') ||
    value.includes('nieuwsbrief') ||
    value.includes('entertainment')
  ) {
    return 'subscriptions'
  }

  if (
    value.includes('bedrijf') ||
    value.includes('zakelijk') ||
    value.includes('klant') ||
    value.includes('werkgever') ||
    value.includes('website') ||
    value.includes('hosting') ||
    value.includes('contract')
  ) {
    return 'business'
  }

  if (value.includes('opruim') || value.includes('oude') || value.includes('jaarlijk') || value.includes('controle')) {
    return 'access'
  }

  if (value.includes('wens') || value.includes('uitvaart') || value.includes('herdenking') || value.includes('muziek')) {
    return 'access'
  }

  return 'access'
}

export function normalizeDigitalLegacyCategory(value: unknown): DigitalLegacyCategoryKey {
  const key = String(value ?? '').trim() as DigitalLegacyCategoryKey
  if (digitalLegacyCategoryKeys.has(key)) {
    return key
  }

  if (key === 'trusted') return 'access'
  if (key === 'accounts') return 'access'
  if (key === 'files') return 'memories'
  if (key === 'wishes') return 'access'
  if (key === 'cleanup') return 'cloud'
  if (key === 'devices' || key === 'assets') return 'cloud'
  if (key === 'priority') return 'access'
  if (key === 'important') return 'access'
  if (key === 'later') return 'cloud'

  return 'access'
}

export function normalizeDigitalLegacyPriority(
  value: unknown,
  category?: unknown,
  title?: string,
): DigitalLegacyPriority {
  const priority = String(value ?? '').trim()
  const categoryKey = String(category ?? '').trim()
  const titleValue = String(title ?? '').toLowerCase()

  if (priority === 'high' || priority === 'normal' || priority === 'low') {
    return priority
  }

  if (categoryKey === 'priority') return 'high'
  if (categoryKey === 'later') return 'low'

  if (
    titleValue.includes('vertrouwenspersoon') ||
    titleValue.includes('testament') ||
    titleValue.includes('wilsverklaring') ||
    titleValue.includes('eerste-hulp') ||
    titleValue.includes('digid') ||
    titleValue.includes('bank') ||
    titleValue.includes('verzekering') ||
    titleValue.includes('wachtwoord') ||
    titleValue.includes('toegang')
  ) {
    return 'high'
  }

  if (
    titleValue.includes('opruim') ||
    titleValue.includes('oude') ||
    titleValue.includes('jaarlijk') ||
    titleValue.includes('controle') ||
    titleValue.includes('nieuwsbrief') ||
    titleValue.includes('entertainment')
  ) {
    return 'low'
  }

  return 'normal'
}

export function encryptDigitalLegacyItemFields(args: { title: string; notes: string }) {
  const encryptedTitle = encryptSensitiveText(args.title)
  const encryptedNotes = encryptSensitiveText(args.notes)

  return {
    title: ENCRYPTED_DIGITAL_LEGACY_TITLE_PLACEHOLDER,
    titleCiphertext: encryptedTitle.ciphertext,
    titleEncryptionMetadata: encryptedTitle.metadata,
    notes: args.notes.trim() ? ENCRYPTED_DIGITAL_LEGACY_NOTES_PLACEHOLDER : '',
    notesCiphertext: encryptedNotes.ciphertext,
    notesEncryptionMetadata: encryptedNotes.metadata,
  }
}

export function serializeDigitalLegacyItem(item: any): DigitalLegacyItemData {
  const lovedOnes = Array.isArray(item?.lovedOnes) ? item.lovedOnes : []
  const title = decryptSensitiveText({
    ciphertext: item?.titleCiphertext,
    metadata: item?.titleEncryptionMetadata,
    fallback:
      String(item?.title ?? '').trim() === ENCRYPTED_DIGITAL_LEGACY_TITLE_PLACEHOLDER
        ? ''
        : item?.title,
  })

  return {
    id: item?.id,
    title,
    category: inferDigitalLegacyCategory(title, item?.category),
    notes: decryptSensitiveText({
      ciphertext: item?.notesCiphertext,
      metadata: item?.notesEncryptionMetadata,
      fallback:
        String(item?.notes ?? '').trim() === ENCRYPTED_DIGITAL_LEGACY_NOTES_PLACEHOLDER
          ? ''
          : item?.notes,
    }),
    priority: normalizeDigitalLegacyPriority(item?.priority, item?.category, title),
    checked: Boolean(item?.checked),
    isDefault: Boolean(item?.isDefault),
    sortOrder: Number(item?.sortOrder ?? 0),
    lovedOnes: lovedOnes
      .map((lovedOne: any) => (typeof lovedOne === 'object' && lovedOne ? lovedOne.id : lovedOne))
      .filter((value: unknown) => value != null),
  }
}
