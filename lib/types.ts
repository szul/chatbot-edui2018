export interface ConfState {
}

export interface SpeakerImage {
  type: string
, link: string
}

export interface SpeakerSession {
    date: string
  , startTime: string
  , endTime: string
  , title: string
  , speakers: string
  , location: string
  , keywords: string
  , link: string
  , type: string
  , images?: SpeakerImage[]
}
