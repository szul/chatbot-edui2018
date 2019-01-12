import { TurnContext, ConversationState, BotFrameworkAdapter } from "botbuilder";
import { WaterfallDialog, ChoicePrompt, WaterfallStepContext, PromptOptions, DialogSet } from "botbuilder-dialogs";
import { SpeakerSession } from "./types";
import { getData } from "./parser";
import { getTime } from "./dialogs";
import { createCarousel, createHeroCard } from "./cards";
import { saveRef, subscribe, getRef } from "./proactive";
import { QnAMaker, LuisRecognizer } from "botbuilder-ai";
import { BlobStorage } from "botbuilder-azure";

export class ConfBot {
    private _savedSessions: string[];
    private _qnaMaker: QnAMaker;
    private _luis: LuisRecognizer;
    private _dialogs: DialogSet;
    private _conversationState: ConversationState;
    private _storage: BlobStorage;
    private _adapter: BotFrameworkAdapter;
    constructor(SavedSessions: string[], qnaMaker: QnAMaker, luis: LuisRecognizer, dialogs: DialogSet, conversationState: ConversationState, storage: BlobStorage, adapter: BotFrameworkAdapter) {
        this._savedSessions = SavedSessions;
        this._qnaMaker = qnaMaker;
        this._luis = luis;
        this._dialogs = dialogs;
        this._conversationState = conversationState;
        this._storage = storage;
        this._adapter = adapter
        this.addDialogs();
    }
    async onTurn(context: TurnContext) {
        const dc = await this._dialogs.createContext(context);
        await dc.continueDialog();
        if (context.activity.text != null && context.activity.text === "help") {
            await dc.beginDialog("help");
        }
        else if (context.activity.type === "message") {
            const userId = await saveRef(TurnContext.getConversationReference(context.activity), this._storage);
            subscribe(userId, this._storage, this._adapter, this._savedSessions);
            if(context.activity.text.indexOf("SAVE:") !== -1) {
                const title = context.activity.text.replace("SAVE:","");
                if(this._savedSessions.indexOf(title) === -1) {
                    this._savedSessions.push(title);
                }
                const ref = await getRef(userId, this._storage, this._savedSessions);
                ref["speakersessions"] = JSON.stringify(this._savedSessions);
                await saveRef(ref, this._storage);
                await context.sendActivity(`You've saved "${title}" to your speaker session list.`);
            }
            else {
                const qnaResults = await this._qnaMaker.generateAnswer(context.activity.text);
                if(qnaResults.length > 0) {
                    await context.sendActivity(qnaResults[0].answer);
                }
                else {
                    await this._luis.recognize(context).then(res => {
                        const top = LuisRecognizer.topIntent(res);
                        const data: SpeakerSession[] = getData(res.entities);
                        if(top === "Time") {
                        dc.beginDialog("time", data);
                        }
                        else if(data.length > 1) {
                            context.sendActivity(createCarousel(data, top));
                        }
                        else if (data.length === 1) {
                            context.sendActivity({ attachments: [createHeroCard(data[0], top)] });
                        }
                    });
                }
            }
        }
        await this._conversationState.saveChanges(context);
    }
    private addDialogs(): void {
        this._dialogs.add(new WaterfallDialog("help", [
            async (step: WaterfallStepContext) => {
                const choices = ["I want to know about a topic"
                    ,"I want to know about a speaker"
                    , "I want to know about a venue"];
                const options: PromptOptions = {
                    prompt: "What would you like to know?"
                    , choices: choices
                };
                return await step.prompt("choicePrompt", options);
            },
            async (step: WaterfallStepContext) => {
                switch(step.result.index) {
                    case 0:
                        await step.context.sendActivity(`You can ask:
                            * _Is there a chatbot presentation?_
                            * _What is Michael Szul speaking about?_
                            * _Are there any Xamarin talks?_`);
                        break;
                    case 1:
                        await step.context.sendActivity(`You can ask:
                            * _Who is speaking about bots?_
                            * _Where is giving the Bot Framework talk?_
                            * _Who is speaking Rehearsal A?_`);
                        break;
                    case 2:
                        await step.context.sendActivity(`You can ask:
                            * _Where is Michael Szul talking?_
                            * _Where is the Bot Framework talk?_
                            * _What time is the Bot Framework talk?_`);
                        break;
                    default:
                        break;
                }
                return await step.endDialog();
            }
        ]));
        
        this._dialogs.add(new ChoicePrompt("choicePrompt"));
        
        this._dialogs.add(new WaterfallDialog("time", [
            async (step: WaterfallStepContext) => {
                await step.context.sendActivities(getTime(step.activeDialog.state.options));
                return await step.endDialog();
            }
        ]));
    }
}
