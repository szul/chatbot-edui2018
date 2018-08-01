import { SpeakerSession, LINGO } from "./types";

function getRandom(min, max): number {
    return Math.floor(Math.random() * (Math.floor(max) - Math.ceil(min) + 1)) + Math.ceil(min);
}

export function getTime(data: SpeakerSession[]): any[] {
    let messages: any = [];
    for(let i = 0; i < data.length; i++) {
        let message = "";
        if(i !== 0) {
            message += `${LINGO[getRandom(0, LINGO.length - 1)]}, `;
        }
        message += `${data[i].speakers} is speaking about ${data[i].title} at ${data[i].startTime} on ${data[i].date}.`;
        messages.push({ type: "message", text: message});
    }
    return messages;
}
