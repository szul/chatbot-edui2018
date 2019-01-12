import { BotFrameworkAdapter, ConversationState } from "botbuilder";
import { QnAMaker, LuisRecognizer } from "botbuilder-ai";
import { DialogSet } from "botbuilder-dialogs";
import { BlobStorage } from "botbuilder-azure";
import * as restify from "restify";
import { BotConfiguration, ILuisService, IQnAService } from "botframework-config";
import { config } from "dotenv";
import { ConfBot } from "./bot";

config();

const botConfig = BotConfiguration.loadSync("./edui2018.bot", process.env.BOT_FILE_SECRET);
const SavedSessions: string[] = [];

const server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log(`${server.name} listening to ${server.url}`);
});

const adapter = new BotFrameworkAdapter({ 
    appId: (process.env.ENV == "PROD") ? process.env.MICROSOFT_APP_ID  : ""
    , appPassword: (process.env.ENV == "PROD") ? process.env.MICROSOFT_APP_PASSWORD : ""
});

const storage = new BlobStorage({ 
    containerName: process.env.CONTAINERNAME
    , storageAccessKey: process.env.STORAGEKEY
    , storageAccountOrConnectionString: process.env.STORAGENAME
});
const conversationState = new ConversationState(storage);

const qnaMaker = new QnAMaker({
    knowledgeBaseId: (<IQnAService>botConfig.findServiceByNameOrId("edui2018-qna")).kbId,
    endpointKey: (<IQnAService>botConfig.findServiceByNameOrId("edui2018-qna")).endpointKey,
    host: (<IQnAService>botConfig.findServiceByNameOrId("edui2018-qna")).hostname,
});

const luis = new LuisRecognizer({
    applicationId: (<ILuisService>botConfig.findServiceByNameOrId("edui2018-luis")).appId,
    endpointKey: (<ILuisService>botConfig.findServiceByNameOrId("edui2018-luis")).subscriptionKey,
    endpoint: (<ILuisService>botConfig.findServiceByNameOrId("edui2018-luis")).getEndpoint(),
});

const dialogs = new DialogSet(conversationState.createProperty("dialogState"));

const confBot: ConfBot = new ConfBot(
    SavedSessions,
    qnaMaker,
    luis,
    dialogs,
    conversationState,
    storage,
    adapter
);

server.post("/api/messages", (req, res) => {
    adapter.processActivity(req, res, async (context) => {
        await confBot.onTurn(context);
    });
});
