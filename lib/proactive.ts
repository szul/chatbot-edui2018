import { ConversationReference, BotAdapter } from "botbuilder";
import { BlobStorage } from "botbuilder-azure";
import { SpeakerSession } from "./types";
import { getExact } from "./parser";
import * as moment from "moment";

export async function saveRef(ref: Partial<ConversationReference>, storage: BlobStorage): Promise<string> {
    const changes = {};
    changes[`reference/${ref.activityId}`] = ref;
    await storage.write(changes);
    return await ref.activityId;
}

export function subscribe(userId: string, storage: BlobStorage, adapter: BotAdapter, savedSessions: string[]): void {
    if(moment(moment.now()).isBetween(moment("2018-10-06").toDate(), moment("2018-10-12").toDate())) {
        setInterval(async () => {
            const ref = await getRef(userId, storage);
            if(ref) {
                await adapter.continueConversation(ref, async(context) => {
                    for(let i = 0; i < savedSessions.length; i++) {
                        if(savedSessions[i] !== undefined) {
                            let s: SpeakerSession = getExact(savedSessions[i]);
                            let d = moment(`${s.date} ${s.startTime}`);
                            let d15 = moment(`${s.date} ${s.startTime}`).subtract(15, "minutes");
                            if(moment(moment.now()).isBetween(d15.toDate(), d.toDate())) {
                                await context.sendActivity(`Reminder: The session ${s.title} from ${s.speakers} is about to start at ${s.startTime} in ${s.location}.`);
                                savedSessions[i] = undefined;
                            }
                        }
                    }
                    savedSessions = savedSessions.filter(v => v);
                });
            }
        }, 300000);
    }
}

export async function getRef(userId: string, storage: BlobStorage, savedSessions?: string[]): Promise<any> {
    const key = `reference/${userId}`;
    var r = await storage.read([key]);
    if(r[key]["speakersessions"] !== undefined && savedSessions != null && savedSessions.length === 0) {
        savedSessions = JSON.parse(r[key]["speakersessions"]);
    }
    return await r[key];
}
