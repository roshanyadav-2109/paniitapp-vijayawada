# The V12 programme, transcribed from the summit's own agenda document.
# (day, start, end, title, track, session_type, venue_slug, featured, description)
import json, io, urllib.request

D1 = "2026-10-02"
D2 = "2026-10-03"

SESSIONS = [
 (D1,"19:00","22:00","Gala Dinner hosted by the Hon'ble Chief Minister","keynote","dinner","taj-vivanta",True,
  "Hosted by the Hon'ble Chief Minister of Andhra Pradesh for 70 to 80 key guests \u2014 IIT Directors, industry CEOs, startup founders, policy makers and investors. Venue: Taj Vivanta Ball Room."),

 (D2,"08:00","09:00","Registration & Networking","general","networking","entrance-lobby",False,
  "Panel 1 speakers report to the green room by 08:45."),
 (D2,"09:00","09:05","Welcome & Context Setting","keynote","address","main-hall",False,
  "Dr. Amitabh Ranjan, Vice Chair, PanIIT Alumni India."),
 (D2,"09:05","09:55","Panel 1 \u00b7 Energy in the Age of AI","climate","panel","main-hall",True,
  "Chaired by Sri G. Surya Sai Praveenchand, IAS, Joint Managing Director, AP-TRANSCO. Moderated by Sri Ankit Todi, Chief Sustainability Officer, Mahindra Group. With Sri Lalit Aggarwal (Managing Director \u2013 India, SLB), Ms Yolynd Lobo (Director & Head of Government Affairs & Public Policy, Google Cloud India), Sri Neeraj Agarwal (President \u2013 Nuclear Power, JSW Energy), Dr. Vibha Dhawan (Director General, TERI) and Sri Sachin Bhalla (Senior Vice President Sales, Schneider Electric India)."),

 (D2,"10:00","10:05","Lighting of the Lamp","keynote","ceremony","main-hall",True,
  "Slokas from the Rigveda chanted in the background."),
 (D2,"10:05","10:10","Welcome Address","keynote","address","main-hall",False,
  "Sri Swadeep Pillarisetti, Chair, PanIIT Andhra Pradesh Summit 2026."),
 (D2,"10:10","10:15","PanIIT & Amaravati: Shaping the Swarna Andhra Vision","keynote","address","main-hall",False,
  "Sri Prabhat Kumar, IRS, Chairman, PanIIT Alumni India."),
 (D2,"10:15","10:20","Address \u00b7 Secretary, ITE&C","keynote","address","main-hall",False,
  "Sri Bhaskar Katamneni, IAS, Secretary, Department of ITE&C, Government of Andhra Pradesh."),
 (D2,"10:20","10:25","Address \u00b7 Director, IIT Tirupati","keynote","address","main-hall",False,
  "Prof. K. N. Satyanarayana, Director, IIT Tirupati."),
 (D2,"10:25","10:30","Address \u00b7 Director, IIT Madras","keynote","address","main-hall",False,
  "Prof. V. Kamakoti, Director, IIT Madras."),
 (D2,"10:30","10:35","Address by Industry Leaders","keynote","address","main-hall",False,
  "Sri Anand Kumar, Managing Director, STMicroelectronics India."),
 (D2,"10:35","10:40","Address by Unicorn Founders","founders","address","main-hall",False,
  "Sri Arvind Bansal, Co-Founder & CEO, Continuum Energy."),
 (D2,"10:40","10:45","Address by Venture Capitalists","investor","address","main-hall",False,
  "Smt. Vani Kola, Managing Director, Kalaari Capital."),
 (D2,"10:45","11:00","Address by Guest of Honour \u00b7 Sri Nara Lokesh","keynote","address","main-hall",True,
  "Sri Nara Lokesh, Hon'ble Minister for ITE&C, HRD & RTGS, Government of Andhra Pradesh."),
 (D2,"11:00","11:05","Address by Guest of Honour \u00b7 Sri K. Ram Mohan Naidu","keynote","address","main-hall",True,
  "Sri Kinjarapu Ram Mohan Naidu, Hon'ble Union Minister of Civil Aviation, Government of India."),
 (D2,"11:05","11:08","Closing Remarks \u00b7 Inaugural Session","keynote","address","main-hall",False,
  "Dr. Amitabh Ranjan, Vice Chair, PanIIT Alumni India."),
 (D2,"11:08","11:10","Vote of Thanks \u00b7 Inaugural Session","keynote","address","main-hall",False,
  "Sri Rajesh Dasari, Co-Chair, PanIIT Andhra Pradesh Summit 2026."),

 (D2,"11:15","12:05","Panel 2 \u00b7 Deep Tech in All Walks of Life; Product Perfection","deeptech","panel","main-hall",True,
  "Chaired by Sri Bhaskar Katamneni, IAS, Secretary, ITE&C, GoAP. Co-chaired by Sri A. Babu, IAS, Chief Commissioner of State Taxes, GoAP. Moderated by Prof. Ganesh Ramakrishnan, Founding Director, BharatGen and Professor, IIT Bombay. With Dr. Amith Singhee (CTO, IBM India and South Asia; Director, IBM Research India), Prof. Balaraman Ravindran (Head, Wadhwani School of Data Science & AI, IIT Madras), Sri Hitesh Garg (Vice President & India Country Manager, NXP Semiconductors), Dr. Kamaljeet Singh (Director General, Semi-Conductor Laboratory) and Sri Vatsal Shah (Head of AI Specialist Solution Architects, AWS India & South Asia)."),
 (D2,"12:10","13:00","Panel 3 \u00b7 Space, Aerospace & Defence Manufacturing","deeptech","panel","main-hall",True,
  "Chaired by Dr. N. Yuvaraj, IAS, Secretary, Industries & Commerce, GoAP. Moderated by Sri Suyash Singh, Co-Founder & CEO, GalaxEye Space. With Sri Arun Ramchandani (SVP & Head, L&T Precision Engineering & Systems), Sri Yaram Vijay Kumar (Country Leader \u2013 India, Honeywell Aerospace), Dr. R. Balamurali Krishnan (Director General, Naval Science & Technological Laboratory) and Sri Naga Bharath Daka (Co-Founder & COO, Skyroot Aerospace)."),

 (D2,"13:00","13:50","Networking Lunch","general","meal","dining-hall",False,
  "The stage is reset for Panel 4 during lunch."),
 (D2,"13:00","14:00","Pavilions & Technology Exhibition","deeptech","expo","activity-south",True,
  "The 25 Technology Innovation Hubs of the national NMICPS network, and DeepTech and DST-awarded startups, with live demonstrations. The Hon'ble Chief Minister arrives at 01:00 PM and visits the stalls until 02:00 PM."),
 (D2,"13:50","14:40","Panel 4 \u00b7 BioValley \u2014 Health Access & Screening at Scale","general","panel","main-hall",True,
  "Chaired by Sri G. Veerapandian, IAS, Secretary, Health & Family Welfare, GoAP. Moderated by Dr. Ramesh Hariharan, Co-Founder & CEO, Strand Life Sciences. With Dr. Sunil Kumar Barnwal, IAS (CEO, National Health Authority), Dr. Taslimarif Saiyed (Director & CEO, C-CAMP), Sri Aditya Kandoi (Founder & CEO, Redcliffe Labs) and Dr. Mukesh Kumar Gupta (Director, ICMR-National Institute for Pre-Clinical Research)."),

 (D2,"14:00","15:30","Round Table 1 \u00b7 IIT Directors' Conclave","policy","roundtable","board-room-1",False,
  "First floor. The Hon'ble Chief Minister joins from 02:45 to 03:10 PM."),
 (D2,"14:15","15:45","Round Table 2 \u00b7 Venture Capitalists & Family Offices","investor","roundtable","board-room-2",False,
  "First floor. The Hon'ble Chief Minister joins from 03:10 to 03:35 PM."),
 (D2,"14:30","16:00","Round Table 3 \u00b7 Industry Leaders & Unicorn CXOs","founders","roundtable","activity-north",False,
  "First floor. The Hon'ble Chief Minister joins from 03:35 to 04:00 PM."),

 (D2,"14:45","15:35","Panel 5 \u00b7 Agri Tech \u2014 Farmers & Water Security","climate","panel","main-hall",True,
  "Chaired by Sri Budithi Rajsekhar, IAS, Special Chief Secretary, Agriculture & Cooperation, GoAP. Moderated by Prof. Arun Tangirala, Dean & CDO, IIT Tirupati. With Dr. Giridhar Parvatam (Director, CFTRI), Sri Kaustubh Dhonde (Co-Founder & CEO, AutoNxt), Sri Anil Kumar S.G. (Founder & Chairman, Samunnati) and Dr. Raman Babu (Global Research Director, Accelerated Crop Improvement, ICRISAT)."),
 (D2,"15:40","16:10","Talk 1 \u00b7 Fireside Chat \u2014 Skilling & Entrepreneurship","founders","talk","main-hall",False,
  "Moderated by Shradha Sharma, Founder & CEO, YourStory Media. With Dr. Narayana Bharath Gupta, IAS (Commissioner, Higher Education, GoAP) and Prof. Balamurali Shankar (Chief Knowledge Officer, Pravartak, IIT Madras)."),
 (D2,"16:05","17:10","Policy Paper Presentations","policy","presentation","activity-north",True,
  "First floor, combined hall, with the Hon'ble Chief Minister on stage. Seven papers: Energy in the Age of AI and Swachh Andhra; Deep Tech in All Walks of Life; Space, Aerospace & Defence Manufacturing; BioValley; Agri Tech; AI in Governance; Skilling & Entrepreneurship."),
 (D2,"16:10","16:40","Talk 2 \u00b7 Fireside Chat \u2014 AI in Governance","policy","talk","main-hall",False,
  "Includes a presentation on RTGS. Moderated by Sri Naman Paithankar, Co-Founder & CEO, Chitragupta. With Sri Bhaskar Katamneni, IAS (Secretary, ITE&C, GoAP) and Sri Shailesh Kumar (Chief Data Scientist, CoE AI/ML, Jio)."),
 (D2,"16:40","17:00","Talk 3 \u00b7 Amaravati Capital City","policy","presentation","main-hall",False,
  "Sri Vijay Ramaraju, IAS, Commissioner, Capital Region Development Authority, GoAP."),

 (D2,"17:15","17:25","Valedictory \u00b7 Announcements","keynote","address","main-hall",True,
  "Presented by PanIIT representatives: the PanIIT Amaravati Council, the PanIIT Venture Fund, 10 Industry Chairs, the 100-Mentor Startup Network, technology transfer from the IITs and the DeepTech policy package."),
 (D2,"17:25","17:35","Release of the Amaravati PanIIT Declaration","keynote","ceremony","main-hall",True,
  "Sri Prabhat Kumar, IRS, Chairman, and Dr. Amitabh Ranjan, Vice Chairman, PanIIT Alumni India, with a photo opportunity."),
 (D2,"17:35","17:45","Launch of Q Shiva \u00b7 5 Quantum Computers","deeptech","ceremony","main-hall",True,
  "Unveiled by the Hon'ble Chief Minister and demonstrated by the Qbit Force team, with the launch of the book Quantum Children by Sri Rajesh Dasari and Sri D. A. Raju."),
 (D2,"17:45","18:25","Keynote Address \u00b7 Hon'ble Chief Minister","keynote","keynote","main-hall",True,
  "Sri Nara Chandrababu Naidu, Hon'ble Chief Minister of Andhra Pradesh."),
 (D2,"18:25","18:30","Felicitation","keynote","ceremony","main-hall",False, None),
 (D2,"18:30","18:32","Vote of Thanks & Closing","keynote","address","main-hall",False,
  "Dr. Amitabh Ranjan, Vice Chairman, PanIIT Alumni India."),
 (D2,"18:32","18:45","Group Photo","general","ceremony","entrance-lobby",False,
  "At the main entrance."),
 (D2,"19:00","21:00","Networking Dinner","general","meal","dining-hall",False, None),
]


def main():
    env = dict(l.split("=", 1) for l in io.open(
        r"C:\Users\singh\Downloads\paniitapp-vijayawada\.env.local", encoding="utf-8"
    ).read().splitlines() if "=" in l and not l.startswith("#"))
    URL = env["NEXT_PUBLIC_SUPABASE_URL"].strip()
    KEY = env["SUPABASE_SERVICE_ROLE_KEY"].strip()
    EV = env["NEXT_PUBLIC_EVENT_ID"].strip()
    H = {"apikey": KEY, "Authorization": "Bearer " + KEY, "Content-Type": "application/json"}

    def call(method, path, payload=None, extra=None):
        h = dict(H)
        h.update(extra or {})
        req = urllib.request.Request(
            URL + path, method=method,
            data=json.dumps(payload).encode("utf-8") if payload is not None else None,
            headers=h)
        return urllib.request.urlopen(req).read().decode()

    # The gala is in a different building, so it needs a venue of its own.
    try:
        call("POST", "/rest/v1/venues",
             {"event_id": EV, "name": "Taj Vivanta Ball Room", "slug": "taj-vivanta", "floor": None},
             {"Prefer": "resolution=ignore-duplicates,return=minimal"})
    except Exception as e:
        print("venue insert:", e)

    venues = {v["slug"]: v["id"] for v in json.loads(
        call("GET", "/rest/v1/venues?select=id,slug&event_id=eq." + EV + "&slug=not.is.null")) if v["slug"]}
    missing = sorted({s[6] for s in SESSIONS if s[6] and s[6] not in venues})
    print("venue slugs not found:", missing or "none")

    # The column only accepts a fixed set, so the descriptive kinds above
    # are folded into the nearest one it allows.
    ALLOWED = {
        "dinner": "meal", "meal": "meal", "networking": "networking",
        "address": "keynote", "ceremony": "keynote", "keynote": "keynote",
        "panel": "panel", "talk": "panel", "presentation": "panel",
        "roundtable": "workshop", "expo": "exhibit",
    }

    rows = []
    for day, t0, t1, title, track, stype, slug, feat, desc in SESSIONS:
        rows.append({
            "event_id": EV, "title": title, "description": desc, "track": track,
            "session_type": ALLOWED[stype], "venue_id": venues.get(slug),
            "start_at": day + "T" + t0 + ":00+05:30",
            "end_at": day + "T" + t1 + ":00+05:30",
            "is_featured": feat,
        })

    old = json.loads(call("GET", "/rest/v1/sessions?select=id&event_id=eq." + EV))
    call("DELETE", "/rest/v1/sessions?event_id=eq." + EV, None, {"Prefer": "return=minimal"})
    call("POST", "/rest/v1/sessions", rows, {"Prefer": "return=minimal"})
    print("replaced " + str(len(old)) + " sessions with " + str(len(rows)))

    check = json.loads(call("GET", "/rest/v1/sessions?select=title,start_at&event_id=eq." + EV + "&order=start_at"))
    print("day 1:", sum(1 for c in check if c["start_at"][:10] == "2026-10-02"),
          "| day 2:", sum(1 for c in check if c["start_at"][:10] == "2026-10-03"))


if __name__ == "__main__":
    main()
