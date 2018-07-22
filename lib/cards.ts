import { SpeakerSession, SpeakerImage } from "./types";
import { MessageFactory, Activity, CardFactory, Attachment } from "botbuilder";

export function createCarousel(data: SpeakerSession[]): Partial<Activity> {
    var heroCards = [];
    for(let i = 0; i < data.length; i ++) {
        heroCards.push(createHeroCard(data[i]));
    }
    return MessageFactory.carousel(heroCards);
}

export function createHeroCard(data: SpeakerSession): Attachment {
    return CardFactory.heroCard(
        "",
        CardFactory.images([""]),
        CardFactory.actions([
            {
                type: "openUrl",
                title: "Read more...",
                value: ""
            }
        ])
    );
}
