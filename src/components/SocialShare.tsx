import { SocialMedia } from "@/global"
import {
    FacebookIcon,
    FacebookMessengerIcon,
    FacebookMessengerShareButton,
    FacebookShareButton,
    LineIcon,
    LineShareButton,
    LinkedinIcon,
    LinkedinShareButton,
    PinterestIcon,
    PinterestShareButton,
    RedditIcon,
    RedditShareButton,
    TelegramIcon,
    TelegramShareButton,
    TwitterShareButton,
    WhatsappIcon,
    WhatsappShareButton,
    XIcon,
} from 'react-share';

export default function SocialShare({ title, url, hashtags, images }: SocialMedia) {
    const defaultTag = hashtags ? hashtags[0] : ''
    const defaultImage = images ? images[0] : ''
    return <div className="flex flex-row gap-2 mt-6">
        <FacebookShareButton url={url} hashtag={'#' +defaultTag}>
            <FacebookIcon size={32} round />
        </FacebookShareButton>

        <FacebookMessengerShareButton
            url={url}
            appId="521270401588372"
        >
            <FacebookMessengerIcon size={32} round />
        </FacebookMessengerShareButton>

        <TwitterShareButton
            url={url}
            title={title}
            hashtags={hashtags}
        >
            <XIcon size={32} round />
        </TwitterShareButton>

        <LinkedinShareButton url={url} title={title} source="doodledream">
            <LinkedinIcon size={32} round />
        </LinkedinShareButton>

        <WhatsappShareButton
            url={url}
            title={title}
            separator=" "
        >
            <WhatsappIcon size={32} round />
        </WhatsappShareButton>

        <TelegramShareButton
            url={url}
            title={title}
        >
            <TelegramIcon size={32} round />
        </TelegramShareButton>

        <RedditShareButton
            url={url}
            title={title}
        >
            <RedditIcon size={32} round />
        </RedditShareButton>

        <PinterestShareButton
            url={url}
            description={title}
            media={defaultImage}
        >
            <PinterestIcon size={32} round />
        </PinterestShareButton>

        <LineShareButton url={url} title={title}>
            <LineIcon size={32} round />
        </LineShareButton>
    </div>
}