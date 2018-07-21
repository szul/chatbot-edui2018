import * as fs from "fs";
import { load as CheerioLoad } from "cheerio";
import { SpeakerSession, SpeakerImage } from "./types";

const file: string = fs.readFileSync("./edui.xml", "utf-8");
const xml: CheerioStatic = CheerioLoad(file);

export function getData(e: any): SpeakerSession[] {
    if(e != null) {
        let subject = e.entities["subject"];
        let location = e.entities["location"];
        let person = e.entities["person"];
        if(person != null) {
            return getSessionByPerson(person);
        }
        if(subject != null) {
            return getSessionBySubject(subject);
        }
        if(location != null) {
            return getSessionByLocation(location);
        }
    }
    return [];
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
        if(elem.find("image").length > 0) {
            let imgs: SpeakerImage[] = [];
            elem.find("image").each((idx: number, el: CheerioElement) => {
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
