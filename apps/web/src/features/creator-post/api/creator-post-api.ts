import { api } from '../../../shared/lib/api'
import { feedVideoSchema } from '../../feed/model/feed'
import { parseTags, type CreatorPostFormValues } from '../model/creator-post'

export async function createCreatorPost(values: CreatorPostFormValues) {
  const body = new FormData()
  body.set('video', values.video)
  body.set('caption', values.caption.trim())
  body.set('tags', JSON.stringify(parseTags(values.tagsText)))

  return feedVideoSchema.parse(
    await api.post<unknown>('creator/posts', undefined, { body }),
  )
}
