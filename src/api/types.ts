/** Deliberately small UI-facing contracts; adapt API payloads in api/client.ts. */
export interface PersonSummary {
  id: string
  name: string
  imageUrl: string | null
  knownFor: string[]
}

export interface DailyChallenge {
  id: string
  date: string
  featuredPerson: PersonSummary
}

export interface ApiErrorPayload {
  detail?: string
  message?: string
}
