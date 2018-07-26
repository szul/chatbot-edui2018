import { SpeakerSession } from "./types";
import { MessageFactory, Activity, CardFactory, Attachment } from "botbuilder";

export function createCarousel(data: SpeakerSession[], topIntent: string): Partial<Activity> {
    var heroCards = [];
    for(let i = 0; i < data.length; i ++) {
        heroCards.push(createHeroCard(data[i], topIntent));
    }
    return MessageFactory.carousel(heroCards);
}

export function createHeroCard(data: SpeakerSession, topIntent: string): Attachment {
    let images: string[] = [];
    if(data.images != null && data.images.length > 0) {
        for(let i = 0; i < data.images.length; i++) {
            images.push(data.images[i].link);
        }
    }
    let title: string;
    let subtitle: string;
    switch(topIntent) {
        case "Speaker":
            title = data.speakers;
            subtitle = data.location;
        case "Location":
            title = data.location;
            subtitle = `${data.speakers}, ${data.title}`;
        case "Topic":
            title = data.title;
            subtitle = data.speakers;
        default:
            throw new Error(`No way to handle ${top}`);
    }
    return CardFactory.heroCard(
        title,
        subtitle,
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
