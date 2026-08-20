import type { SearchVideo } from '../model/search'
import { VideoGridTile } from '../../../shared/ui/video-grid-tile'

export function SearchVideoTile({ video }: { video: SearchVideo }) {
  return <VideoGridTile item={video} />
}
