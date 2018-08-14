import * as fs from "fs";
import { load as CheerioLoad } from "cheerio";
import { SpeakerSession, SpeakerImage } from "./types";

const file: string = fs.readFileSync("./data/edui2018.xml", "utf-8");
const xml: CheerioStatic = CheerioLoad(file);

export function getData(entities: any): SpeakerSession[] {
    if(entities != null) {
        let subject = entities["subject"];
        let location = entities["location"];
        let person = entities["person"];
        if(person != null) {
            return getSessionByPerson((person instanceof Array) ? person[0] : person);
        }
        if(subject != null) {
            return getSessionBySubject((subject instanceof Array) ? subject[0] : subject);
        }
        if(location != null) {
            return getSessionByLocation((location instanceof Array) ? location[0] : location);
        }
    }
    return [];
}

export function getExact(t: string): SpeakerSession {
    var e = writeEvent(getEventNodes("title", t));
    return (e.length > 0) ? e[0] : null;
}

function getSessionBySubject(subject: string): SpeakerSession[] {
    return writeEvent(getEventNodes("keywords", subject).concat(getEventNodes("title", subject)));
}

function getSessionByLocation(location: string, data?: SpeakerSession): SpeakerSession[] {
    return writeEvent(getEventNodes("location", location));
}

function getSessionByPerson(person: string, data?: SpeakerSession): SpeakerSession[] {
    return writeEvent(getEventNodes("speakers", person));
}

function getEventNodes(s: string, t: string): CheerioElement[] {
    var events: CheerioElement[] = [];
    xml(s).each((idx: number, elem: CheerioElement) => {
        if(xml(elem).text().toLowerCase().indexOf(t.toLowerCase()) > -1) {
            events.push(elem.parent);
        }
    });
    return events;
}

function writeEvent(events: Array<CheerioElement>): SpeakerSession[] {
    var results: SpeakerSession[] = [];
    for(let i = 0; i < events.length; i++) {
        let elem = xml(events[i]);
        let r: SpeakerSession = {
              date: elem.parent().attr("date")
            , startTime: elem.attr("start-time")
            , endTime: elem.attr("end-time")
            , title: elem.find("title").text()
            , speakers: elem.find("speakers").text()
            , location: elem.find("location").text()
            , keywords: elem.find("keywords").text()
            , link: elem.find("page").text()
            , type: elem.attr("type")
        };
        let img = elem.find("photo");
        if(img != null) {
            let imgs: SpeakerImage[] = [];
            img.each((idx: number, el: CheerioElement) => {
                imgs.push({
                      type: xml(el).attr("type")
                    , link: xml(el).text()
                });
            });
            r.images = imgs;
        }
        results.push(r);
    }
    return results;
}
