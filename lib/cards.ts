import { SpeakerSession } from "./types";
import { MessageFactory, Activity, CardFactory, Attachment } from "botbuilder";

export function createCarousel(data: SpeakerSession[]): Partial<Activity> {
    var heroCards = [];
    for(let i = 0; i < data.length; i ++) {
        heroCards.push(createHeroCard(data[i]));
    }
    return MessageFactory.carousel(heroCards);
}

export function createHeroCard(data: SpeakerSession): Attachment {
    let images: string[] = [];
    if(data.images != null && data.images.length > 0) {
        for(let i = 0; i < data.images.length; i++) {
            images.push(data.images[i].link);
        }
    }
    return CardFactory.heroCard(
        data.title,
        data.speakers,
        CardFactory.images(images),
        CardFactory.actions([
            {
                type: "openUrl",
                title: "Read more...",
                value: data.link
            }
        ])
    );
}
