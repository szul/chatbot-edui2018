import { ConversationReference, BotAdapter } from "botbuilder";
import { TableStorage } from "botbuilder-azure";
import { SpeakerSession } from "./types";
import { getExact } from "./parser";
import * as moment from "moment";

export async function saveRef(ref: Partial<ConversationReference>, tableStorage: TableStorage): Promise<string> {
    const changes = {};
    changes[`reference/${ref.activityId}`] = ref;
    await tableStorage.write(changes);
    return await ref.activityId;
}

export function subscribe(userId: string, tableStorage: TableStorage, adapter: BotAdapter, savedSessions: string[]): void {
    setInterval(async () => {
        const ref = await getRef(userId, tableStorage);
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
    }, 60000);
}

export async function getRef(userId: string, tableStorage: TableStorage, savedSessions?: string[]): Promise<any> {
    const key = `reference/${userId}`;
    var r = await tableStorage.read([key]);
    if(r[key]["speakersessions"] !== undefined && savedSessions != null && savedSessions.length === 0) {
        savedSessions = JSON.parse(r[key]["speakersessions"]);
    }
    return await r[key];
}
