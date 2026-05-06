import type { FlavorTemplate, TickerCategory } from "./types.ts";
import { FLAVOR_CATEGORIES } from "./categories.ts";

/**
 * Galactic News flavor templates. ~500 entries across 20 categories, ~25 each.
 *
 * Tone notes:
 *   • Serious-corporate categories (politics, corporate, market_mover, science,
 *     cosmic_weather) read like real wire copy.
 *   • Light/satirical categories (sports, celebrity, fashion, food, blotter,
 *     local) lean into dry observation.
 *   • Sci-Fi Homages are clear genre nods (Hitchhiker's, Asimov, Dune, Star Trek,
 *     Blade Runner, Star Wars, Firefly, Alien). Reader-in-on-the-joke voice.
 *
 * Tokens documented in `tokens.ts`.
 */

// ── 1. Galactic Politics ───────────────────────────────────────
const POLITICS: string[] = [
  "{empire} parliament adjourns over tariff vote, third recess this cycle",
  "Trade summit between {empire} and {empire2} ends in 'productive ambiguity'",
  "{empire} ambassador denies treaty leak, denies leak occurred at all",
  "Sector {sector} council votes {n2}-{n} to formally ignore the news",
  "{empire} unveils {n}-point plan to deal with {empire2}; six points classified",
  "Border lane {planet}-{planet2} closed for 'review of paperwork integrity'",
  "{empire} prime minister survives no-confidence vote by {n} votes",
  "Diplomatic pouch from {empire2} returns unopened, still smoking",
  "Mediator declares peace talks 'on a brisk simmer' as week three opens",
  "{empire} coalition wobbles after coalition partner declares it 'fine'",
  "Election monitors clear {empire} ballot; turnout reported at {percent}%",
  "Tariff exemption granted to {commodity} importers after lobbying surge",
  "{empire} senate hearing on AI rights extends into a {n2}th day",
  "Diplomatic scandal: {ceo} caught quoting {empire2} press in {empire} brief",
  "{empire} unveils new flag; designer cites 'fewer hostile angles'",
  "Treaty of {planet} hits article {n2}; lawyers expect 'modest fallout'",
  "Sector audit finds {empire} ministry has been quietly out of pencils for months",
  "{empire} foreign minister cancels trip after passport spelled wrong",
  "Constitutional court rules {commodity} not technically a vegetable",
  "{empire} press secretary clarifies that 'absolutely not' was a tonal choice",
  "{ceo} appointed special envoy to {empire2}; tickets one-way",
  "Public referendum on naming new sector ends with 'Sector McSectorface' barred",
  "{empire} introduces tariff on hope; economists relieved it is enforceable",
  "Joint communique describes ongoing crisis as 'opportunity-shaped'",
  "Census of {empire} citizens completed; results pending appeal by {empire2}",
];

// ── 2. Corporate Earnings ──────────────────────────────────────
const CORPORATE: string[] = [
  "{company} posts {percent}% revenue growth on strong {commodity} demand",
  "{company} narrows quarterly loss; CEO {ceo} cites 'disciplined optimism'",
  "{company} announces hostile bid for rival; rival announces stronger coffee",
  "Board reshuffle at {company}; three directors departing for 'health reasons'",
  "{company} reports record {commodity} throughput across {sector} routes",
  "Shareholders approve {company} buyback worth {credits}",
  "{company} delays earnings call citing 'unforeseen but spreadsheet-shaped issue'",
  "{company} CFO replaced after Q2 surprise; replacement also surprised",
  "{ceo}'s compensation package draws fire; {ceo} draws fire elsewhere",
  "{company} merger with {company} hits regulator wall in {empire}",
  "{company} pays {credits} fine for 'aggressive but technically legal scheduling'",
  "{company} guidance raised; analysts raise eyebrows in synchrony",
  "{company} writes down {credits} of {commodity} inventory after market rotation",
  "Dividend held flat at {company}; investors held breath, then exhaled politely",
  "{company} carbon-trade desk closes after carbon refuses to cooperate",
  "{company} restructures middle management; middle management restructures résumés",
  "{company} introduces 'value tier' service; tier ends three meters short of orbit",
  "Activist investor builds {percent}% stake in {company}, vows 'gentle fury'",
  "{company} confirms layoffs at {planet} division; severance offered in {commodity}",
  "{company} chair {ceo} steps down 'to spend more time with portfolio'",
  "Whistleblower at {company} alleges accounting performed 'inventively'",
  "{company} opens new HQ on {planet}; chairs alone cost {credits}",
  "{company} pulls full-year guidance; partial guidance confined to lobby",
  "{company} announces {commodity} subscription service; cancellation requires lawyer",
  "Audit committee at {company} completes review; review now under review",
];

// ── 3. Market Movers ───────────────────────────────────────────
const MARKET_MOVER: string[] = [
  "{stock} jumps {percent}% on {commodity} contract win",
  "{stock} slides {percent}% after disappointing {commodity} guidance",
  "Volume surges in {stock}; {percent}% above twelve-cycle average",
  "Analysts at {empire} bank double-upgrade {stock}, citing 'general vibe'",
  "{stock} hits new {n2}-cycle high amid sector rotation into transport",
  "Short interest in {stock} climbs to {percent}% of float",
  "Hedge fund {ceo Fund} reveals {percent}% position in {stock}",
  "{stock} falls below moving average; chartists murmur ominously",
  "Index of {sector} freight haulers gains {percent}% week-on-week",
  "{commodity} futures spike on {planet} mine outage",
  "Spread between {commodity} and {commodity} narrows to multi-cycle low",
  "{stock} dual-listed on {empire} exchange after compliance review",
  "Insider sale of {credits} in {stock} disclosed by chief operations officer",
  "{stock} suspended for {n} hours pending material announcement",
  "Bond yields on {empire} sovereigns tick up {percent} basis points",
  "{stock} dividend cut to zero; CEO {ceo} cites 'temporal cashflow'",
  "Margin call cascade hits {stock} after {commodity} flash crash",
  "Initial public offering of {company} priced at upper band, raises {credits}",
  "Activist letter sends {stock} up {percent}% in pre-market trading",
  "Quant strategy 'Boltzmann-7' allegedly drove {percent}% of {stock} volume",
  "Gold-pressed latinum benchmark steady; nobody asks why it still exists",
  "Dark pools see record activity in {stock} ahead of merger vote",
  "{stock} added to {empire} sector index, replacing bankrupt {company}",
  "Volatility index across {sector} freight names climbs to multi-cycle high",
  "{stock} closes flat after intraday {percent}% swing 'on no news whatsoever'",
];

// ── 4. Crime & Piracy ──────────────────────────────────────────
const CRIME: string[] = [
  "Customs seize {tonnage} of contraband {commodity} near {port}",
  "Pirate raid on {planet} convoy nets {credits}, two {adj} captives",
  "{empire} fleet patrol disrupts smuggling ring in {sector}",
  "Bounty hunter guild posts {credits} reward for {ceo} after warrant issued",
  "{port} authorities arrest {n2} in dawn raid on counterfeit {commodity} ring",
  "Heist at {company} vault on {planet}; escape vehicle 'borrowed' from staff",
  "Pirate broadcast jams {sector} freight lanes for {n} cycles",
  "{empire} coast guard intercepts {tonnage} of restricted {commodity}",
  "Mob trial on {planet} ends in mistrial; jury reportedly relieved",
  "Insurance fraud at {company} estimated at {credits}; perpetrator clumsy",
  "Customs robot rebooted three times during {port} contraband sweep",
  "Cyber-heist drains {credits} from {company} treasury via 'helpful' chatbot",
  "Black-market {commodity} prices double on {planet} after sting operation",
  "{ceo} questioned over {commodity} kickback scheme, declines coffee politely",
  "Drug ring on {planet} bust nets {tonnage} of synthetic euphoriants",
  "{empire} marshals raid {planet} cantina; cantina found largely cantina-shaped",
  "Pirate king of {sector} declares amnesty week, accepts {commodity} in tribute",
  "Heirloom {commodity} smuggled past {port} scan in fake {commodity} crate",
  "Bounty filed against captain of vessel last seen 'departing rapidly'",
  "{empire} ministry confirms {n} indictments in {company} bribery probe",
  "Forged customs stamps from {planet} traced to ex-{empire} bureaucrat",
  "Catastrophic insurance claim filed by {company} after 'mysterious' fire",
  "Asteroid prospector arrested for filing claim on a moon",
  "{port} police recover {credits} of stolen art, none of it requested back",
  "Three indicted in {empire} pension fund skim; total losses {credits}",
];

// ── 5. Science & Tech ──────────────────────────────────────────
const SCIENCE: string[] = [
  "{empire} researchers claim FTL coil efficiency record, peer review pending",
  "{company} R&D unveils new fusion bottle; bottle still bottle-shaped",
  "Quantum tunneling breakthrough at {planet} institute reduces ping by {percent}%",
  "Terraforming progress on {planet} reaches stage {n}, atmosphere now breathable-ish",
  "{empire} funds antimatter containment study; classified, then unclassified, then reclassified",
  "Robotics team on {planet} demonstrates self-replicating drone swarm — controllably",
  "Cold fusion trial at {empire} lab produces heat, light, and a moderate fire",
  "Subspace relay network expanded across {sector}, latency down {percent}%",
  "{empire} bioethics panel debates uplift of {adj} cephalopods",
  "Deep-space probe {n} returns data after {n2}-year transit; mostly static",
  "Algorithm at {company} trims fuel use {percent}% by 'firmly suggesting' shorter routes",
  "{empire} unveils nanofabric armor; weighs {tonnage}, defeating original purpose",
  "Solar sail trial at {system} reaches half-c, then politely turns back",
  "{empire} confirms quantum computer factored {n}-digit prime ahead of schedule",
  "AI alignment workshop at {planet} concludes, AI takes minutes",
  "Cryostasis trial revives {n2} volunteers; {n} report mild dreaming",
  "{company} patents fold-space corridor; lawyers fold space, then unfold it",
  "Genome of {planet} fungus published; {percent}% overlap with {empire2} cuisine",
  "Plasma engine test on {planet} produces {percent}% efficiency gain, {n} singed eyebrows",
  "Researchers at {empire} confirm dark matter exists, definitely, this time",
  "{empire} space telescope sees back to first {n2} million years; calls it dim",
  "{company} R&D reveals room-temperature superconductor, shipping room not included",
  "Holographic compression standard adopted by {sector} after {n}-year fight",
  "Gravity wave observatory on {planet} reports background hum 'too cheerful'",
  "{empire} releases open-source jump drive plans; lawyers also open-sourced",
];

// ── 6. Sports ──────────────────────────────────────────────────
const SPORTS: string[] = [
  "{empire} routs {empire2} 18-3 in zero-G ball semifinal",
  "Asteroid racing championship returns to {sector} after {n}-cycle suspension",
  "{empire} gravball star {ceo} signs record contract with {empire2} club",
  "{planet} stadium expansion approved; capacity now {n2},000",
  "Underdog squad from {planet} upsets reigning {empire} champions",
  "Doping scandal rocks {sector} league after {commodity} traces found",
  "Esports tourney on {planet} draws {n2} million viewers, three lawsuits",
  "{empire} league cancels mid-season after sponsor goes bankrupt",
  "Coach {ceo} fired despite winning record; cites 'creative differences with cosmos'",
  "Vacuum-fencing makes Olympic provisional list after {n} cycles of lobbying",
  "{empire} fans riot after referee call; referee files for hazard pay",
  "Robot wrestling league suspends {n} bots for unsportsmanlike conduct",
  "{planet} hosts inaugural microgravity marathon; finish line currently in orbit",
  "{empire} swimmer {ceo} breaks zero-g freestyle record by {percent}%",
  "Trade deadline brings {n2} player swaps across {sector} hockey league",
  "Athletics committee rules {commodity} energy drinks 'borderline acceptable'",
  "{empire} chess champion narrowly defeats AI again, claims 'felt different this time'",
  "Stadium pie thrower at {planet} match earns lifetime ban, {n}-cycle book deal",
  "Surfing league launches plasma division on {system}; safety waivers thicken",
  "{empire} squash federation merges with raquet federation, {empire2} unimpressed",
  "Boxing match on {planet} ends in draw after both fighters apologize",
  "Sled racing returns to {planet}; sleds, alarmingly, mostly self-driving",
  "{empire} fencing star {ceo} retires undefeated, with {n2} ribbons",
  "Drone derby on {planet} attracts crowds, three rogue drones still missing",
  "Goaltender {ceo} traded for two prospects and a shipment of {commodity}",
];

// ── 7. Celebrity & Media ───────────────────────────────────────
const CELEBRITY: string[] = [
  "Holovid star {ceo} denies third divorce in weekly statement",
  "Pop sensation {ceo} releases album recorded entirely in low orbit",
  "{ceo} spotted dining with rival {ceo2}; PR teams update talking points",
  "Reality show {n}-Body Problem renewed for fourth season on {empire} network",
  "{ceo} apologizes for comments about {empire2}; later apologizes for the apology",
  "{company} executive {ceo} appears on talk show, says nothing of note for {n} hours",
  "Director of 'Vacuum Heart' announces sequel; lead actor still missing in space",
  "{ceo}'s memoir tops bestseller list in {empire}; ghost-writer credited as 'mostly'",
  "Influencer feed on {planet} crashes after {n2} million simultaneous yawns",
  "Music streamer {company} pays artists {credits} after {n}-cycle dispute",
  "Galactic award show host {ceo} makes joke about {empire}, reservations cancelled",
  "Tabloid claims {ceo} cloned, {ceo} denies, both {ceo}s deny clone",
  "Documentary on {company} executives 'baroque, terrifying, also long'",
  "{empire} broadcaster bans song deemed 'subversively catchy'",
  "Magazine names {ceo} 'Most Reluctantly Respected' for third year",
  "Variety show on {planet} cancelled after {n} contestants vanish in week one",
  "{ceo} pet sentient kelp accepts honorary doctorate from {empire} university",
  "Streaming wars heat up: {company} debuts ad-tier 'with mild surveillance'",
  "{ceo} announces tour spanning {n2} planets; tour bus is also a yacht",
  "Late-night host roasts {empire} cabinet; cabinet roasts back via official channels",
  "{ceo} buys {company} just to fire one critic; analysts call it 'committed'",
  "Sequel to 'Halls of Vorga' delayed again; halls reportedly still being painted",
  "Reality couple {ceo} and {ceo2} renew vows on live broadcast, ratings flat",
  "{empire} broadcaster apologizes for typo that started a minor war",
  "Holographic concert on {planet} draws record crowd, {n} fainted from refractive joy",
];

// ── 8. Cosmic Weather ──────────────────────────────────────────
const COSMIC_WEATHER: string[] = [
  "Class-{n} ion storm forecast over {system} by next cycle",
  "Solar flare warning issued for {planet}; communications expected patchy",
  "{empire} weather service: gravitational tides {percent}% above normal in {sector}",
  "Comet ML-{n2} grazes {planet} orbit; observatory reports 'spectacular, mostly'",
  "Magnetic reversal predicted on {planet} within {n} cycles, compasses unhappy",
  "Cosmic ray surge expected to peak Tuesday across {sector} lanes",
  "{empire} space weather bureau issues navigational hazard for {system}",
  "Aurora forecast on {planet}: vivid, possibly haunting",
  "Subspace turbulence alert for jump corridor between {planet} and {planet2}",
  "Hypernova candidate identified {n2} parsecs out; arrival in {n2} millennia",
  "Asteroid swarm grazes {planet} atmosphere; {n} new craters logged",
  "Meteor shower expected over {planet} hemisphere, peak rate {n2}/hour",
  "Solar wind forecast: brisk, occasionally insolent",
  "Black hole merger detected in {sector}; tides briefly philosophical",
  "{empire} bureau confirms gravitational lensing event near {system}",
  "Cosmic background hum increased by {percent}% in {sector}, scientists puzzled",
  "Pulsar {n} timing drift detected; maintainers issue patch",
  "Coronal mass ejection grazes {planet}; auroras visible from sub-orbit",
  "Snow forecast on Olympus Domes, {planet}; {percent}% accumulation expected",
  "{empire} forecasts ten cycles of suspiciously perfect weather; emergency drills planned",
  "Tidal anomaly raises {port} sea level {percent}cm; insurers blink slowly",
  "Radio blackout expected across {sector} from solar disturbance",
  "Atmospheric pressure on {planet} drops {percent}%, residents 'feel it in knees'",
  "Brown dwarf flyby alters {system} orbits by {percent}%, calendars adjusted",
  "Eclipse on {planet} draws record tourism; vendors run out of {commodity}",
];

// ── 9. Local Planet News ───────────────────────────────────────
const LOCAL: string[] = [
  "{port} traffic council unveils new pedestrian sky-bridge",
  "{planet} mayor opens new transit hub two cycles late, three over budget",
  "Civic statue of {ceo} unveiled at {port}; pigeons unimpressed",
  "{port} farmer's market doubles in size; vendors triple in arguments",
  "{planet} water rationing lifted after {n} cycles of {commodity} importation",
  "New library opens in {port} downtown, named after a deceased benefactor",
  "{port} bus route 7 rerouted after sentient potholes refuse mediation",
  "{planet} school board approves new curriculum, parents tentatively pleased",
  "Elderly resident of {port} celebrates {n2}-cycle birthday, attributes longevity to spite",
  "Power outage on {port} block resolved after {n} hours, kettle saved",
  "{port} street fair this weekend; {commodity} festival expected to disappoint mildly",
  "{planet} hospital adds new wing dedicated to {empire} settlers",
  "Pothole repair on {port} main strip enters phase {n}; locals adjust commute",
  "Local pet on {planet} returns home after {n2} cycles missing, brings friends",
  "{port} council adopts new recycling bins; bins recycled from old recycling bins",
  "Volunteer cleanup at {planet} canal removes {tonnage} of debris, two oddities",
  "{port} elementary school wins regional debate trophy, brings home {commodity}",
  "Construction at {port} intersection enters {n2}th week, drivers philosophical",
  "{planet} farmer's almanac predicts pleasant cycle, ignores all evidence",
  "{port} community center reopens after fire; smell of {commodity} still mild",
  "Local sentient hedge wins {planet} garden contest by default",
  "{port} parade cancelled after lead float experiences existential lag",
  "{port} library hosts {commodity} sculpture exhibit, attendance moderate",
  "Mayor of {port} apologizes for jokes during ribbon cutting, ribbon survives",
  "{planet} weather predicts rain; rain predicts {planet} weather",
];

// ── 10. Health & Medical ───────────────────────────────────────
const HEALTH: string[] = [
  "Longevity clinic opens on {port}; package starts at {credits}",
  "{empire} health authority recalls {commodity} batch after {n2} reports of mild glow",
  "Vaccination drive in {sector} reaches {percent}% coverage milestone",
  "Hospital on {planet} pioneers neural repair; success rate now {percent}%",
  "Outbreak of {adj} fever on {planet} contained within {n} cycles",
  "{empire} medical board licenses uplift therapy for {commodity} workers",
  "Genetic counseling lines on {port} backlog now {n2} cycles deep",
  "Telemedicine network spans {sector}; latency reduces by {percent}%",
  "{company} pharma subsidiary recalls painkiller; replacement also being recalled",
  "Surgeons on {planet} debut zero-g spine repair; patient {percent}% taller",
  "Galactic flu season opens; {empire} clinics report shortage of {commodity}",
  "{empire} ban on cloning amended after lawyers cloned the previous ban",
  "Mental health awareness week in {sector}; productivity briefly drops {percent}%",
  "Dental implant breakthrough at {planet} institute; chewing efficiency up {percent}%",
  "Eye surgery on {planet} gives recipients {adj} vision, debate ongoing",
  "Herbal remedy on {port} found to be {percent}% placebo, {percent}% paint",
  "{empire} hospitals adopt AI triage; queue still long, just better-organized",
  "Birthrate on {planet} ticks up {percent}%; daycare waitlists explode",
  "Robotics-assisted surgery succeeds on {n2}th attempt at {planet} clinic",
  "Cosmic-radiation-induced rash sweeps {sector}; cure: more sun, less radiation",
  "{empire} surgeons graft sentient kelp into volunteer's spine; volunteer pleased",
  "Public health study finds {percent}% of {planet} residents have not slept properly",
  "{commodity} now classified as 'mostly therapeutic' by {empire} board",
  "Pediatric ward on {planet} opens new wing for {adj} aliens",
  "{port} pharmacist replaces label printer, errors drop {percent}%",
];

// ── 11. Religion & Philosophy ──────────────────────────────────
const RELIGION: string[] = [
  "Cult of the Frozen Logician schisms over heat-death debate",
  "{empire} interfaith council adds {n}th deity, removes one nobody worshipped",
  "Pilgrimage season on {planet} opens; capacity capped at {n2},000",
  "{empire} monastery on {planet} debates whether AI souls qualify for {commodity}",
  "Galactic ethics conference adjourns after {n} cycles, no decisions made",
  "Priest {ceo} excommunicated for selling indulgences denominated in {commodity}",
  "Order of the Slow Computation accepts new initiates on {port}",
  "{empire} census records {percent}% increase in 'spiritual but unaffiliated'",
  "Doomsday cult relocates predicted apocalypse to following Tuesday",
  "{empire} church of the Algorithm publishes update {n}.{n2}, schism imminent",
  "Theology student on {planet} proves God's existence in {n} steps, last step shaky",
  "{empire} shrine to {commodity} reopens after restoration, smell stronger than ever",
  "{port} ethical philosophy department shrinks {percent}%, students unrepentant",
  "Clergy on {planet} debate whether bots can take confession; bots noncommittal",
  "Annual fast on {planet} ends with feast that breaks last cycle's record",
  "{empire} druids release white paper on photosynthetic prayer techniques",
  "{port} church bells tolling out of sync; congregation oddly united",
  "Order of the Empty Beaker celebrates founding {n2}-cycle ago, glasses raised dryly",
  "Book of Predictions translated; predictions remain unfailingly vague",
  "{empire} imam delivers sermon on {commodity} ethics, audience nods politely",
  "Cult on {planet} adopts new symbol; symbol coincidentally trademarked",
  "Theological journal on {port} publishes paper titled 'Maybe?', cited {n2} times",
  "{empire} parliament debates separating {commodity} subsidy from religious tax",
  "Trappist colony on {planet} releases brewing log, surprisingly racy",
  "Ascetic order on {port} divests of all material possessions, except {commodity}",
];

// ── 12. Odd Crime Blotter ──────────────────────────────────────
const BLOTTER: string[] = [
  "{port} man arrested attempting to mail self to {planet}",
  "Resident of {port} tries to pay parking fine in {commodity}, arrested politely",
  "Two on {planet} cited for racing rental loaders down a service tube",
  "{port} business reports break-in; intruder left {credits} cash by accident",
  "Burglar on {planet} fell asleep mid-heist, woke to coffee and {empire} police",
  "{port} officials warn against feeding {adj} sentient pigeons synthetic bread",
  "Driver on {planet} cited for {percent}% over speed limit in school zone",
  "Stolen {commodity} returned to {port} shop with apology note and gift card",
  "Suspect on {planet} disguised as council statue evaded capture for {n} cycles",
  "{port} police: 'No, the alien did not eat your homework, please stop calling'",
  "Bicycle theft ring on {planet} rolled up after suspect rode to station",
  "{port} cashier subdues robber with sandwich; sandwich survives",
  "Two cited for performing impromptu opera in {planet} restricted airspace",
  "{port} woman files report against own past self, case closed",
  "Loiterer outside {planet} bakery turns out to be undercover food critic",
  "Resident of {port} accidentally adopts riot bot, names it 'Spunky'",
  "{port} police remind public: drone delivery services are not a taxi for cats",
  "{planet} man arrested for selling moon, claims he meant a different moon",
  "Pickpocket on {planet} returns wallet with detailed financial advice",
  "{port} police chase suspect at jogging speed for {n2} blocks, suspect tires first",
  "Suspect attempts escape via shopping cart, achieves moderate velocity",
  "{port} residents report 'dignified looking thief' wearing top hat at robbery",
  "{port} bakery robbed of pastries; suspect described as 'crumbly'",
  "Driver on {planet} ticketed for U-turn through wedding procession",
  "{port} parking dispute settled by {n}-round dance-off, both fined",
];

// ── 13. Food & Cuisine ─────────────────────────────────────────
const FOOD: string[] = [
  "Three-star reviewer pans {port} restaurant: 'tastes of regret'",
  "{planet} chef {ceo} wins regional cup with synthetic {commodity} dish",
  "{port} food festival sells out of {commodity} skewers in {n} hours",
  "{empire} diet trend: cut all carbs, add more {commodity}, drink more water",
  "Restaurant on {planet} closes after {n2} cycles; landlord raises rent {percent}%",
  "{ceo}'s new cookbook 'How to Boil Water in Vacuum' enters bestseller list",
  "{port} health inspector closes {n} kitchens, cites 'enthusiastic ingredients'",
  "Galactic fast food chain {company} debuts {commodity} burger, supply chain creaks",
  "{planet} oyster bar reopens after {commodity} shortage; oysters relieved",
  "Chocolate alternatives gain ground in {empire}; cocoa lobby threatens {n} things",
  "Critic visits {port} taqueria, leaves reviewing it as 'a place to be'",
  "{empire} bans synthetic {commodity} cheese in pizza, pizzeria community shrugs",
  "Tasting menu at {planet} restaurant includes {n} courses, {n} apologies",
  "{port} brewery wins prize for ale aged in vacuum, tastes 'mostly like ale'",
  "Vegan butcher opens on {planet}; recipe inspires deep philosophical questions",
  "{empire} food truck on {port} draws {n2} block line, queue creates own micro-economy",
  "Recipe for grandma's {commodity} stew leaks online, grandma issues press release",
  "{port} fine dining scene now requires reservation, ID, blood type, and patience",
  "Regional dish from {planet} declared 'tolerable' by visiting {empire} delegation",
  "Coffee shop on {port} introduces {n}-shot espresso, requires waiver",
  "{ceo}'s pop-up dinner sells out in {n} minutes; tickets resold for {credits}",
  "{empire} bans imitation {commodity} from being labelled real {commodity}",
  "{port} bakery drops bagel from menu; protests escalate to {n2} signatures",
  "{empire} cuisine wins galactic award for 'least frightening texture'",
  "Chef on {planet} accidentally invents new spice; bottles flying off shelves",
];

// ── 14. Real Estate & Megastructures ───────────────────────────
const REALESTATE: string[] = [
  "Megastructure permit issued for orbital ring above {planet}",
  "{port} luxury tower announces residency at {credits} per unit",
  "Asteroid claim on {planet} system goes for record {credits}",
  "{empire} approves construction of {n}-tier arcology on {planet}",
  "{port} home prices climb {percent}% year-over-year, buyers apoplectic",
  "Hyperloop hub at {port} clears final permits; objections filed in triplicate",
  "Vacant {company} office on {planet} sells for {credits}, smells faintly of decisions",
  "Skybridge connecting {port} towers wins design award, fails inspection",
  "{empire} announces new spaceport on {planet}; existing spaceport offended",
  "Co-living scheme on {port} promises {percent}% lower rent, {percent}% more drama",
  "Listing on {port} described as 'cozy'; cozy means structural concerns",
  "{empire} zoning board approves vertical farm overlooking {port} downtown",
  "Repossessed orbital habitat sold at auction for {credits}",
  "{port} building boom pushes hardhat shortage into {n}th cycle",
  "Land developer {ceo} unveils 'eco-friendly' moonbase featuring lawns",
  "{empire} new town charter approves naming rights to {company}",
  "Condo board on {planet} bans noise, joy, hover-pets in single 4 a.m. vote",
  "Skyscraper on {port} fails wind test in vacuum, engineers nod knowingly",
  "{empire} luxury resort breaks ground on {planet}; ground breaks back",
  "{port} mall reopens with new {commodity} kiosks; security buys earplugs",
  "Tycoon {ceo} buys entire moon, says 'collateral'",
  "{empire} reveals {n}-cycle plan to convert asteroid belt to housing",
  "Renters association on {port} formed; first vote, by {n2} margin, demanded snacks",
  "Estate sale on {planet} clears {credits} of antique {commodity}",
  "Penthouse on {port} listed for {credits}, includes {n} ghosts at no extra charge",
];

// ── 15. Travel & Tourism ───────────────────────────────────────
const TRAVEL: string[] = [
  "{planet} resort posts record {percent}% occupancy this cycle",
  "Cruise liner Voidsong delayed {n} cycles after engine 'sneezed'",
  "{empire} tourism ministry launches campaign: 'visit {planet}, eventually'",
  "Backpacker route through {sector} draws {percent}% more travelers year-on-year",
  "{port} spaceport adds direct service to {planet}, three layovers eliminated",
  "Adventure tourism on {planet} now requires {n}-cycle waiver",
  "{empire} hotel chain {company} adds {n2} properties this cycle",
  "Glamping on {planet} canyon rim wins galactic 'serenity, mostly' award",
  "{ceo}'s travel show debuts; first episode mocks {empire} cuisine, again",
  "Visa fees waived between {empire} and {empire2} for {n} cycles",
  "Cruise stranded near {system} after captain forgets fuel; passengers patient",
  "Resort on {planet} closes for renovations, customers asked to bring patience",
  "{port} transit guide now in {n2} languages, none of them spoken by tourists",
  "Backpacker association on {planet} releases tip sheet, mostly about boots",
  "{empire} tour guides unionize, demand {percent}% pay raise and respect",
  "Eco-resort on {planet} rebrands as 'less eco-resort' after audit",
  "Public beach on {port} expanded by {percent}%, sea grumbles politely",
  "Travel insurance claims spike after {commodity} festival on {planet}",
  "Sky lift on {planet} stuck mid-cycle, tourists view ad-supported sunset",
  "{empire} coast guard rescues {n2} from {commodity} festival flotilla",
  "Tourist train through {sector} adds dining car, dining car adds prices",
  "Honeymoon package on {planet} includes {n} sunsets, two suns",
  "{port} airport adds robot bartenders, queue paradoxically longer",
  "Tour group reports being charmed by {planet} customs officer's small talk",
  "Stargazing pad on {planet} listed as 'best place to feel small', exceeds expectations",
];

// ── 16. Fashion & Trends ───────────────────────────────────────
const FASHION: string[] = [
  "Anti-grav heels make comeback on {port} runway week",
  "{empire} fashion editor declares {commodity} the new black, again",
  "{ceo}'s clothing line draws ridicule then sells out in {n} hours",
  "{port} runway show features {adj} biofiber jackets, audience applauds politely",
  "{empire} influencer endorses {commodity} skin treatment, dermatologists groan",
  "Vintage {commodity} jewelry surges in resale, prices up {percent}%",
  "Hoverboot rental services launch on {planet}, ankles relieved",
  "{empire} fashion police actually exist now, fine for poor color coordination",
  "Couture house on {port} debuts collection inspired by {empire2} graveyard art",
  "{ceo} wears same outfit twice, internet briefly malfunctions",
  "{empire} dress code permits casual Friday on Wednesdays now",
  "{commodity} sneakers reissue; collectors line up for {n2} cycles",
  "{planet} street style trend: shoulder pads big enough to land craft on",
  "Wedding dress made of recycled {commodity} ends up on permanent display",
  "Tailor {ceo} sued by {ceo2} over identical capes, settles in cape",
  "{empire} style guide updates after {n2}-cycle hiatus; lapels now legal again",
  "Hatmaker on {planet} debuts hat that doubles as comm device, fall risk noted",
  "{empire} fashion week pushed back {n} cycles after delivery of fabric was lost",
  "Knit jumper trend returns; analysts cite {percent}% rise in 'cozy economy'",
  "{ceo} sells personal wardrobe at auction, raises {credits} for charity",
  "Designer on {planet} apologizes for collection 'mocking gravity'",
  "{commodity} accessory of the cycle: ear-cuff that hums {empire} anthems",
  "Eyewear brand on {port} introduces specs that judge readers softly",
  "{port} streetwear collective declares jeans dead; jeans hold press conference",
  "{empire} ambassador's silk gown praised; {empire2} declares it 'too silky'",
];

// ── 17. Education & Academia ───────────────────────────────────
const ACADEMIA: string[] = [
  "{empire} University paper retracted over fabricated stardata",
  "Galactic ranking puts {empire} top in physics, last in cafeteria food",
  "{port} library acquires {n2} ancient {commodity} scrolls, smell included",
  "Student loans on {planet} now expressed in {commodity}; nobody happy",
  "{empire} professor {ceo} tenured after {n2} cycles, briefly considered leaving anyway",
  "Gap-cycle programs to {planet} surge {percent}% as parents quietly relieved",
  "Academic strike at {empire} system halts research and complaints",
  "{empire} school board approves {commodity} unit; parents petition for less {commodity}",
  "Online course in 'How to Pay Attention' from {planet} institute reaches {n2}M",
  "{ceo}'s honorary doctorate from {empire} university revoked, then awarded again",
  "Spelling bee on {planet} won by AI; medal handed back politely",
  "{empire} university launches debate on whether debate is necessary",
  "Conference on {commodity} draws {percent}% more attendees than presenters",
  "{empire} institute closes department of common sense for budget reasons",
  "Galactic dictionary adds {n2} new words including 'hyperflug' and 'meh'",
  "Student protest at {planet} campus achieves cafeteria reform, world peace tabled",
  "Researcher publishes paper proving paper publishing harms research",
  "{empire} archive digitizes oldest known invoice; still unpaid",
  "{port} school district flips schedule by {percent}% to test theory",
  "Galactic spelling bee finalist eliminated on the word 'finalist'",
  "{empire} education ministry reduces homework by decree, productivity up {percent}%",
  "Robotics fair on {planet} ends in {n} runaway robots; one elected to council",
  "{empire} academy adds {commodity} studies; lab coats not yet stained",
  "{port} chess team disqualified for {percent}% telepathy",
  "Citation index of {ceo} climbs {percent}%, mostly self-citations",
];

// ── 18. Xenobiology ────────────────────────────────────────────
const XENOBIOLOGY: string[] = [
  "Researchers describe new sentient mold on {planet}",
  "{empire} survey logs {n2} new microorganisms in {sector} dust clouds",
  "Mating call of {planet} cave eel decoded; mostly indignation",
  "Conservation effort on {planet} saves {percent}% of last vine snake population",
  "Newly observed {planet} fungus glows in time with the local pulsar",
  "{empire} biologist {ceo} reports moth population recovering on {port}",
  "Translation device for {planet} herd beasts works {percent}% of the time",
  "Endangered list adds {n2} species after {empire} habitat survey",
  "Aquatic life on {planet} found to follow regular meeting schedule",
  "Rogue genetic experiment on {planet} produces friendly hybrid; adopted by lab",
  "{empire} zoo welcomes new {adj} pup, names contest open",
  "Migratory route of {planet} sky whales redirected by {percent}%, theories abound",
  "Insectoid hive on {planet} grants visiting researchers honorary worker status",
  "{empire} botanists isolate {commodity} from {planet} lichens, smells like home",
  "Apex predator on {planet} discovered to be photosynthetic, ecologists shrug",
  "Wildlife corridor through {sector} approved over {empire} agriculture's protests",
  "{port} researchers attach trackers to {n2} sentient slimes; slimes ambivalent",
  "Scientists confirm {planet} eel can pun in three languages",
  "{empire} agency confirms {planet} sky-snail is not, in fact, a meteor",
  "Migration pattern of {planet} song-bats includes {n}-cycle harmonic jam session",
  "Researcher claims {planet} sentient kelp filed grievance with HR",
  "{empire} releases breeding plan for endangered {adj} mammal on {port}",
  "Pet trade on {planet} cracks down on illegal {commodity} ferrets",
  "Marine biologists on {planet} reclassify squid as 'committee'",
  "{ceo}'s pet sentient palm signs autograph, prints sold for {credits}",
];

// ── 19. Obituaries & Tributes ──────────────────────────────────
const OBITUARY: string[] = [
  "Industrialist {ceo} eulogized as 'tireless and largely tolerable'",
  "{empire} statesman {ceo} dies at {n2}, leaves library of {n2}M scrolls",
  "Veteran captain {ceo} of the {company} freight fleet passes after {n2} cycles aloft",
  "Memorial service for {ceo} held at {planet}; attendance overflowed orbit",
  "{empire} cultural figure {ceo} remembered for 'singular, occasional' charm",
  "Professor emeritus {ceo} of {planet} institute dies; chair to be retired",
  "{ceo} pioneer of {commodity} engineering, passes; legacy {n2} patents",
  "Journalist {ceo} known for asking inconvenient questions has died",
  "Composer {ceo}'s final symphony premiered posthumously in {empire} hall",
  "{empire} founding member {ceo} eulogized as 'a complicated old hand'",
  "Athlete {ceo} retired hero, championships {n}, anecdotes uncountable",
  "{ceo} explorer first to map {sector} fringe, has died at {n2}",
  "{empire} ambassador {ceo}, who once thrown shoe at podium, dies at {n2}",
  "Ex-board member of {company} {ceo} passes; obit lists {n2} affiliations",
  "{ceo}, sentient kelp activist, mourned by {percent}% of relevant ecosystems",
  "{empire} actor {ceo}'s farewell tour cut short; tour bus signs petition",
  "{ceo} who patented the breakfast sandwich licenses one final smile",
  "{empire} chess grandmaster {ceo} defeats death after {n2} delays",
  "Engineer {ceo} of the original {planet} mag-rail, has passed",
  "Author of 'Quiet Years on {planet}' has quietly stepped behind the curtain",
  "{ceo}, longtime mayor of {port}, leaves council bench in mourning",
  "{empire} general {ceo}, who once misplaced a fleet, dies at {n2}",
  "{ceo} of {company}'s legendary marketing run laid to rest with last billboard",
  "Holovid critic {ceo} dies; final review described life as 'three stars, one moon'",
  "{empire} historian {ceo}, encyclopedic in life, indexed in death",
];

// ── 20. Sci-Fi Homages ─────────────────────────────────────────
const HOMAGE: string[] = [
  // Hitchhiker's
  "Towel sales up {percent}% on {planet} ahead of Galactic Hitchhiker's Day",
  "Survey finds {percent}% of {empire} citizens consider their planet 'mostly harmless'",
  "{port} authorities remind travelers that, statistically, the answer is 42",
  "Improbability drive prices fluctuated wildly today; analysts blame finite probability",
  "Vogon Constructor Fleet detected near {system}; locals advised to ignore poetry recitals",
  "{company} debuts in-flight beverage 'almost, but not quite, entirely unlike tea'",
  "Babel fish supply rationed on {port} after translator union strike",
  "{ceo} described as 'about as inconspicuous as a brick at a glass convention'",
  // Asimov
  "Psychohistorical model predicts {percent}% chance of {empire} collapse within {n2} centuries",
  "Three Laws Robotics violation reported on {planet}; investigation pending",
  "{empire} Foundation conference debates Seldon Plan revisions over snacks",
  "Mule sighting on {sector} fringe ruled 'almost certainly unrelated'",
  // Dune
  "{commodity} flow disrupted on {planet}; trade guilds concerned",
  "Spice mélange futures trading suspended on {sector} exchange",
  "Sandworm advisory issued for {planet} dunes, again",
  "{empire} herald repeats: he who controls the {commodity} controls the universe",
  // Star Trek
  "Sensors detect unusual readings near {planet}; scientists puzzled",
  "{empire} Prime Directive review committee adjourned indefinitely",
  "Holodeck malfunction on {planet} resolved by reading actual book",
  "Tribble outbreak quarantined on {port}; furry quotient up {percent}%",
  // Star Wars
  "{ceo} dismisses rumors of 'ancient religion' as 'a hokey old myth'",
  "{empire} senate approves emergency powers for {n} cycles, definitely temporarily",
  "Smuggler {ceo} insists Kessel-equivalent run completed in {n} parsecs",
  // Blade Runner
  "{planet} weather forecast: continuous rain. Again",
  "{company} replicant program suspended pending {n2}-question test review",
  "Origami unicorn left at scene of {ceo}'s farewell speech",
  // Alien
  "{company} promises this time the cargo hold is, quote, 'definitely empty'",
  "Hygiene inspectors leaving {planet} bay {n2} early; nobody asked why",
  // Firefly
  "{ceo} insists their cargo is 'just legitimate goods, shiny'",
  "{port} preacher on {planet} reminds congregation: cannot stop the signal",
  // 2001
  "{company} AI module reports it 'cannot do that' for {n} cycles running",
  "Monolith detected near {planet} moon; tourism board orders gift shop",
  // Misc
  "{empire} probe inscribed with greeting in {n2} languages, including snark",
  "Improbable encounter at {port} bar: same captain, three timelines",
  "{ceo} reportedly 'long, dead, and slightly cross about it' after fan event",
  "Galactic survey of meanings of life narrows answer to '42, possibly tea'",
];

// ---------------------------------------------------------------------------
// ANOMALY (25 templates) — Stellaris/MOO2/Trek-style spatial phenomena
// ---------------------------------------------------------------------------
const anomalyTemplates: FlavorTemplate[] = [
  {
    category: "anomaly",
    template:
      "Unexplained gravitational lensing reported near {sector}; civilian traffic advised to detour",
    story: [
      "Survey crews near {sector} are reporting impossible gravitational lensing — stars in the wrong positions, light bending in directions that don't add up. Imperial astronomers caution against speculation but admit the data is, in their words, 'profoundly weird.' Independent observatories in {system} have corroborated the readings, ruling out instrument failure as an explanation. Civilian traffic has been advised to take the long route until the phenomenon resolves or someone, anyone, can explain it.",
    ],
  },
  {
    category: "anomaly",
    template:
      "Class-{n} subspace harmonic detected in {system}; researchers describe it as 'humming'",
    story: [
      "A class-{n} subspace harmonic has been detected resonating through {system}. Researchers stress they have no working theory for what the harmonic represents — only that it is steady, persistent, and described by one xenoacoustic specialist as 'humming, almost on purpose.' The harmonic is audible through ship hulls if engines are cut, a fact which has not helped morale aboard the research station. Empire research stations have been given priority access and the public is being asked, politely, not to come closer.",
    ],
  },
  {
    category: "anomaly",
    template:
      "Probe loses contact with researchers near {planet} — debate continues over whether it returned",
    story: [
      "The survey probe sent to investigate the {planet} anomaly has gone silent — or, as the lead researcher insists on phrasing it, has 'entered a state of unconfirmed presence.' Telemetry data suggests the probe is either destroyed, stationary, or transmitting on a frequency no one has thought to check. The team has requested a replacement probe and also a second opinion from a philosopher.",
    ],
  },
  {
    category: "anomaly",
    template:
      "Anomalous time dilation in {sector} delays mail by {n} cycles, and also by {n} seconds, simultaneously",
    story: [
      "Postal authorities in {sector} are struggling to explain why a batch of priority mail arrived both {n} cycles late and {n} seconds early, as measured by synchronized clocks aboard the delivery vessel. The ship's crew reports they feel fine but 'slightly aware of themselves.' Physicists from {empire} have been dispatched and are reportedly arguing already. The affected mail has been delivered; recipients are asked to sign and date their receipts carefully.",
    ],
  },
  {
    category: "anomaly",
    template:
      "Strange reflective surface forms over {planet}'s pole; visible from neighboring systems",
    story: [
      "A vast reflective formation has materialized over {planet}'s northern pole, visible with the naked eye from adjacent systems. Astronomers confirm it is not ice, not metal, and not any registered material in the {empire} xenological survey database. The locals have named it The Mirror. Tourism inquiries have increased {percent}%.",
    ],
  },
  {
    category: "anomaly",
    template:
      "{company} R&D pulls all assets from {sector} after 'unexplained sensor readings'",
    story: [
      "{company}'s entire R&D division has evacuated {sector} following what internal communications describe only as 'readings inconsistent with baseline physical constants.' The company has declined to elaborate but sources inside the unit describe instruments behaving as if reality in the area 'has a hiccup.' All equipment, samples, and personal effects were removed; notably, the coffee maker was left behind, which colleagues describe as 'telling.' {pundit} has already filed three opinion pieces.",
    ],
  },
  {
    category: "anomaly",
    template:
      "Pulsar near {system} skips a beat; first time in recorded history",
    story: [
      "The pulsar designated GNN-{n} near {system} has skipped a full rotation cycle — an event considered impossible under standard stellar mechanics. The skip lasted precisely {n} milliseconds and then the pulsar resumed its regular cadence as if nothing had happened. {empire}'s observatory has flagged this as a priority observation event and reassigned two deep-survey vessels to monitor the region. Astronomers describe the event as 'deeply unsettling, but very tidy.'",
    ],
  },
  {
    category: "anomaly",
    template:
      "Xenobiologists request quarantine of {planet} pending 'shape-shifting biome' study",
    story: [
      "A xenobiology team has submitted an emergency quarantine request for {planet} after documenting what they describe as a biome that reorganizes its own geography in response to observation. 'The moment we mapped it, it changed,' the lead researcher wrote. 'And then it changed back and looked at us.' {empire} medical authorities are reviewing the paperwork.",
    ],
  },
  {
    category: "anomaly",
    template:
      "Survey records show {sector} appears to be {percent}% larger than last cycle",
    story: [
      "Updated cartographic surveys of {sector} show the region is measurably larger than it was last cycle — by approximately {percent}%. Survey teams have triple-checked their instruments and the instruments agree with each other, which is the problem. The rate of expansion, if consistent, would add another {percent}% within three cycles — a prospect the Bureau of Cartography has declined to comment on publicly. {pundit} has proposed four theories, two of which contradict each other and one of which contradicts itself.",
    ],
  },
  {
    category: "anomaly",
    template:
      "Communication beacon in {sector} reports it does not exist; investigation paused",
    story: [
      "Relay beacon C-{n} in {sector} has been transmitting a single message on loop for six cycles: 'This beacon does not exist. Please disregard.' Attempts to investigate have been complicated by the fact that all instruments confirm the beacon is transmitting but cannot confirm it is there. The bureau has paused the investigation pending 'conceptual clarification.'",
    ],
  },
  {
    category: "anomaly",
    template:
      "A second moon detected over {planet}; locals confirm there had been only one",
    story: [
      "Astronomers cataloguing {planet}'s orbital bodies have confirmed the presence of a second moon — one that all available historical records, every local survey, and three independent orbital mechanics teams agree was not there last cycle. The moon appears stable, geologically inert, and about {percent}% too convenient. {empire} has dispatched a science vessel. The first moon appears unbothered.",
    ],
  },
  {
    category: "anomaly",
    template:
      "{rank} {officer} cancels {empire} fleet exercise after 'incompatible reality readings'",
    story: [
      "{rank} {officer} has suspended a scheduled fleet exercise in {sector} following what the official communiqué describes as 'localized sensor incompatibility with observable reality.' Sources inside the exercise report that three ships simultaneously perceived each other as being somewhere else. Crew members in affected vessels report no physical symptoms, only a persistent sense of 'being slightly off.' The exercise has been rescheduled for when reality becomes available.",
    ],
  },
  {
    category: "anomaly",
    template:
      "Pre-recorded star map of {sector} no longer matches observable star map",
    story: [
      "Navigational charts for {sector} filed only {n} cycles ago now fail to match the observable star positions by a margin that astronomers call 'not measurement error.' Stars have not moved; the charts simply describe a slightly different {sector}. Older charts from {n2} cycles ago match current observation perfectly, which is considered worse. {empire}'s Bureau of Cartography has issued a travel advisory and also a formal expression of concern to the universe.",
    ],
  },
  {
    category: "anomaly",
    template:
      "Unidentified signal source in {sector} appears to read all incoming hails before they arrive",
    story: [
      "Signal analysts monitoring {sector} have identified a source that appears to respond to incoming hails before they are transmitted. Initial logs show the source's reply arriving up to {n} seconds before the hail is sent. Communications officers who have attempted contact describe the experience as 'deeply conversational' and 'very relaxing, somehow.' Investigation ongoing.",
    ],
  },
  {
    category: "anomaly",
    template:
      "Voidcap researchers withdraw paper claiming {planet} 'has feelings'",
    story: [
      "A Voidcap Institute paper arguing that {planet} exhibits 'affective planetary response' has been withdrawn after peer reviewers raised concerns about methodology — specifically, that the researchers appear to have apologized to the planet for a drilling survey, and the seismic readings improved. The lead author insists this is 'not evidence of feelings, just correlation that keeps happening.' Three co-authors have privately requested reassignment to a planet that does not have opinions about them. The withdrawal notice has itself been revised twice, as early drafts were described as 'too apologetic in tone.'",
    ],
  },
  {
    category: "anomaly",
    template:
      "Sentient fog reported drifting through {port} bazaar; cleanup pending",
    story: [
      "Port authorities at {port} received seventeen separate complaints last cycle about a fog that navigated the bazaar with apparent intentionality — avoiding obstacles, pausing near food stalls, and at one point, witnesses claim, browsing. Environmental crews have been dispatched. The fog had dissipated by the time they arrived, leaving behind a smell described as 'wet purpose.'",
    ],
  },
  {
    category: "anomaly",
    template:
      "{empire} astronomy guild splits over whether {system} has eight planets or nine",
    story: [
      "A procedural vote in {empire}'s astronomy guild has collapsed into faction. The dispute: {system} demonstrably has nine planets when observed from one angle and eight when observed from another. Neither instrument error nor observer bias explains the discrepancy. {pundit} has declared this 'the most embarrassing crisis in professional astronomy since the last one.'",
    ],
  },
  {
    category: "anomaly",
    template:
      "Hyperlane network reports a new lane in {sector} with no known endpoints",
    story: [
      "Navigation authorities have flagged a newly charted hyperlane running through {sector} that does not appear to originate from or arrive at any known system. Ships that have entered the lane experimentally report it is navigable, comfortable, and leads 'somewhere that has a smell.' The Bureau of Hyperlane Standards has asked pilots not to enter the lane until they agree on a category for it.",
    ],
  },
  {
    category: "anomaly",
    template:
      "Three colony ships in {sector} report seeing themselves arriving an hour earlier",
    story: [
      "Three colony vessels bound for {sector} reported on approach that they could observe what appeared to be their own ships completing docking procedures — an hour before they arrived. Upon docking, no earlier arrival was logged. Crew members report feeling 'slightly self-conscious.' The event has been classified as a navigational anomaly pending a better classification.",
    ],
  },
  {
    category: "anomaly",
    template:
      "Newly catalogued nebula in {sector} resembles a face; authorities urge calm",
    story: [
      "A nebula documented for the first time in {sector}'s outer rim bears a striking resemblance to a humanoid face in a state of mild surprise. {empire} authorities have released a statement urging the public not to assign meaning to astronomical coincidence. The statement has not worked. Tourism to {sector} is up {percent}% and the nebula has already been given a name.",
    ],
  },
  {
    category: "anomaly",
    template:
      "Xenobiology survey: {percent}% of {planet}'s flora 'should not be possible'",
    story: [
      "A comprehensive survey of {planet}'s native flora has concluded that {percent}% of catalogued plant species 'should not exist under current models of biochemistry.' The survey does not suggest why the plants did not consult the models before growing. Xenobiologists describe the ecosystem as 'aggressively alive' and have requested a research budget extension and a strongly worded letter to the plants.",
    ],
  },
  {
    category: "anomaly",
    template:
      "Astrolab freighter reports unexplained {percent}% mass gain over a single cycle",
    story: [
      "Freighter Ulysses-{n} filed a incident report this cycle noting that its total mass, as measured by three independent systems, increased by {percent}% during transit through {sector}. Cargo manifest is unchanged. Hull is intact. The crew's combined body mass accounts for none of the gain. An engineering team is reviewing the data and has not yet ruled anything out, or in.",
    ],
  },
  {
    category: "anomaly",
    template:
      "Asteroid belt around {planet} arranged into perfect spiral; cause unknown",
    story: [
      "The asteroid belt surrounding {planet} has reorganized itself into a mathematically precise spiral formation, as confirmed by four observatories using different methodologies. The formation is stable, rotating, and accurate to within {percent}% of the golden ratio. Scientists have declined to speculate about cause. {pundit} has not declined and has produced a seventeen-page theory.",
    ],
  },
  {
    category: "anomaly",
    template:
      "{empire} research vessel returns from {sector} with logs corrupted into poetry",
    story: [
      "The {empire} science vessel Meridian has returned from {sector} with all crew healthy but all voyage logs corrupted — specifically, rewritten into structured verse in a language that linguists have identified as 'not known but grammatically coherent.' The vessel's AI has been taken offline for analysis. The poetry, according to one reviewer who read it, is 'technically accomplished and deeply unwell.'",
    ],
  },
  {
    category: "anomaly",
    template:
      "Time on {port} station reportedly running {percent}% faster than reference",
    story: [
      "Chronometric officials have confirmed that clocks aboard {port} station are running {percent}% faster than the galactic reference standard — and have been for an indeterminate period. Residents report they feel fine but describe having 'a lot of extra afternoon.' The discrepancy has not been explained. Delivery schedules have been adjusted, and the station's residents have been asked to eat smaller meals.",
    ],
  },
];

// ---------------------------------------------------------------------------
// MUSIC (25 templates) — galactic artists, concerts, genre wars
// ---------------------------------------------------------------------------
const musicTemplates: FlavorTemplate[] = [
  {
    category: "music",
    template: "{musician} announces galactic tour kicking off at {port}",
    story: [
      "{musician} is taking {album} on the road. The tour opens at {port} next cycle and is expected to draw record crowds across {n} stops. Industry analysts are calling it the biggest {genre} tour of the decade.",
    ],
  },
  {
    category: "music",
    template:
      "{album} debuts at #1 on the galactic chart; {genre} fans rejoice",
    story: [
      "{musician}'s {album} has shattered first-week records, holding the top slot on every major streaming network. Critics are split — some calling it 'the future of {genre}' and others 'a competent disappointment' — but the numbers don't lie. {pundit} weighed in: 'This is what culture looks like when it's still alive.'",
    ],
  },
  {
    category: "music",
    template:
      "{musician} cancels {port} show citing 'creative differences with the gravity'",
    story: [
      "{musician} has canceled their headline appearance at {port}, issuing a statement through management that cites 'an irreconcilable creative divergence with local gravitational conditions.' The venue has offered refunds. Local physicists have declined to comment.",
    ],
  },
  {
    category: "music",
    template: "{musician} feuds publicly with rival; {genre} forums in chaos",
    story: [
      "An interview this cycle in which {musician} described a colleague as 'technically present but spiritually absent' has ignited a full-scale feud across every {genre} media channel. Forum moderators across the sector have gone on strike. {pundit} has taken both sides simultaneously.",
    ],
  },
  {
    category: "music",
    template:
      "{empire} cultural ministry bans {album} for 'subversive frequencies'",
    story: [
      "{empire}'s ministry of cultural standards has prohibited distribution of {album} within its borders, citing 'frequency profiles inconsistent with societal stability.' {musician} has responded by making the album free. Downloads in {empire} territories are up {percent}%.",
    ],
  },
  {
    category: "music",
    template:
      "Underground {genre} club at {port} hits capacity for {n} cycles running",
    story: [
      "The unnamed {genre} venue underneath {port}'s cargo district has been at capacity every cycle for {n} consecutive turns — a streak that has drawn attention from both touring acts and local zoning authorities. Ticket scalpers are reportedly operating from the freight elevator. The club has no official name and three unofficial ones, none of which the regulars will confirm to journalists.",
    ],
  },
  {
    category: "music",
    template:
      "Holovid biopic of {musician} announced; rumored {credits} budget",
    story: [
      "A production house has confirmed a feature-length holovid biography of {musician} is in development, with sources placing the budget at {credits}. Casting has not been announced, though {musician} has reportedly submitted a list of actors they 'would find acceptable.' {musician} has not publicly endorsed the project and has released a statement that is being interpreted as both approval and threat, depending on who is reading it.",
    ],
  },
  {
    category: "music",
    template: "{musician} embroiled in {controversy}; tour sales somehow up",
    story: [
      "{musician} is facing intense coverage of {controversy}, which has dominated entertainment feeds for the past cycle. Management has declined all interview requests. Ticket sales for the upcoming tour are up {percent}%.",
    ],
  },
  {
    category: "music",
    template:
      "{genre} festival on {planet} draws {n2} attendees, sets new record",
    story: [
      "The {planet} {genre} festival closed this cycle having welcomed {n2} attendees — a record that surpasses last cycle's count by {percent}%. Headliners included {musician}, who performed {album} in full. Local accommodation providers have already raised next cycle's prices.",
    ],
  },
  {
    category: "music",
    template: "Critic compares {album} to the void; {musician} thanks them",
    story: [
      "A review in the Galactic Music Quarterly called {album} 'a disciplined descent into the creative void — hollow, cold, and oddly beautiful.' {musician} issued a two-word response: 'Thank you.' The review has since been quoted on all official promotional materials.",
    ],
  },
  {
    category: "music",
    template:
      "Anonymous bidder pays {credits} for original {album} master tapes",
    story: [
      "The original master tapes for {musician}'s debut {album} sold at private auction for {credits}, purchased by an anonymous bidder through three intermediaries. The tapes were believed lost. {pundit} has already published a piece asking whether the buyer is {musician} themselves.",
    ],
  },
  {
    category: "music",
    template:
      "{musician} drops surprise diss track; {genre} community in flames",
    story: [
      "Without announcement, {musician} released a four-minute track this morning targeting a rival. The {genre} community has not recovered. The track has been streamed {n2}M times. The target has not yet responded, which most analysts read as response.",
    ],
  },
  {
    category: "music",
    template:
      "Lawsuit filed: rival claims {musician} stole {album}'s opening hook",
    story: [
      "A competing artist has filed suit claiming the opening four bars of {album} were lifted from a demo registered {n} cycles ago. {musician}'s legal team has called the claim 'fanciful.' Music theorists have been employed by both sides. The hook in question has since been streamed {n2}M additional times.",
    ],
  },
  {
    category: "music",
    template:
      "{musician} awarded {empire}'s highest cultural honor; refuses to attend",
    story: [
      "{empire}'s council of cultural distinction has named {musician} recipient of the Meridian Prize — the empire's highest artistic recognition. {musician} declined to attend the ceremony, citing 'a prior obligation to make music instead.' The prize was accepted by a roadie.",
    ],
  },
  {
    category: "music",
    template:
      "Orchestra at {port} performs {album} arranged for two thousand instruments",
    story: [
      "The {port} Symphonic Collective mounted its most ambitious production this cycle: a full orchestral arrangement of {album} performed simultaneously by {n2} musicians across the main hall, cargo bay, and three adjacent corridors. Audience members were issued maps at the door and encouraged to wander. Critics called it 'technically successful and logistically baffling.' Streaming rights have been acquired and the recording is expected to require six separate audio channels.",
    ],
  },
  {
    category: "music",
    template:
      "{musician}'s livestream concert on {planet} gets {n2}M concurrent viewers",
    story: [
      "{musician}'s live broadcast from {planet} broke streaming records with {n2}M concurrent viewers at peak. The performance included the debut of three unreleased tracks from the follow-up to {album}. Server load in {sector} caused brief comms disruption, which most viewers did not notice.",
    ],
  },
  {
    category: "music",
    template:
      "{genre} purists picket {musician}'s collaboration with {empire} state composers",
    story: [
      "A coalition of {genre} traditionalists gathered outside {port}'s cultural center to protest {musician}'s announced collaboration with {empire}'s official composition bureau. Signs read 'Art Dies in Committees' and 'This Is Why We Have Bad {genre}.' {musician} waved at them through the window.",
    ],
  },
  {
    category: "music",
    template:
      "Bootleg recording of {musician}'s {port} soundcheck sells out in {n} hours",
    story: [
      "A bootleg recording of {musician}'s pre-show soundcheck at {port} — reportedly captured on a maintenance worker's personal device — sold out in {n} hours on grey-market streaming. The recording captures {musician} singing half of {album} in the wrong key and stopping to eat something. Fans have called it 'essential listening.'",
    ],
  },
  {
    category: "music",
    template:
      "Streaming royalties scandal: {company} exec accused of skimming from {genre} artists",
    story: [
      "An internal audit at {company} has surfaced allegations that a senior executive diverted {percent}% of {genre} streaming royalties over {n} cycles. Affected artists have released a joint statement. The executive in question has not commented. Legal proceedings are expected.",
    ],
  },
  {
    category: "music",
    template: "{album} certified platinum on three planets simultaneously",
    story: [
      "{musician}'s {album} has achieved simultaneous platinum certification on {planet}, {empire}'s core worlds, and a third location described in the official certification as 'a planet that prefers not to be named but you know who you are.' Industry analysts note this is the first triple-simultaneous platinum certification in {genre} history. Total certified units now exceed {n2}M, a figure {musician}'s management has declined to celebrate publicly, calling it 'only a beginning.'",
    ],
  },
  {
    category: "music",
    template:
      "Underground {genre} scene at {port} celebrates {n}-cycle anniversary",
    story: [
      "The {genre} collective that formed in {port}'s lower freight district {n} cycles ago held its anniversary festival this week with a three-day lineup of acts. The venue still has no official permits. Attendance was estimated at {n2}. {pundit} called the scene 'the only honest thing happening in {genre} right now.'",
    ],
  },
  {
    category: "music",
    template:
      "{musician}'s remix of {empire} anthem sparks diplomatic incident",
    story: [
      "{musician} released an unauthorized remix of {empire}'s ceremonial anthem at {n} beats per minute with what critics describe as 'inadvisable percussion choices.' {empire}'s cultural ministry has filed a formal protest. The remix has been streamed {n2}M times. {musician} has not apologized.",
    ],
  },
  {
    category: "music",
    template:
      "Holovid talk show ambushes {musician} with footage of old performance",
    story: [
      "{musician} was shown archival footage of an early performance on a live broadcast this cycle and asked to react. {musician} reacted for {n} minutes in a way that no one in the studio expected and that has since been clipped {n2} times. Publicists have called it 'a learning opportunity.'",
    ],
  },
  {
    category: "music",
    template:
      "Music critic {pundit} declares {genre} 'officially over' for the third time this decade",
    story: [
      "{pundit} has published a column declaring that {genre} 'has said everything it has to say and is now simply repeating itself at higher volume.' This is {pundit}'s third such declaration this decade. {genre} streaming numbers are up {percent}% year-on-year. {musician} posted the column with no caption.",
    ],
  },
  {
    category: "music",
    template:
      "{musician} marries fellow artist; tabloid bidding war erupts for exclusive",
    story: [
      "{musician} confirmed a private marriage ceremony this cycle, triggering what media executives are calling 'the most competitive exclusive bidding war in {empire} tabloid history.' Sources report the winning offer reached {credits}. {musician}'s statement said only: 'It was a small ceremony. You weren't there.'",
    ],
  },
];

// ---------------------------------------------------------------------------
// DISCOVERY (25 templates) — exploration finds, archaeology, new species
// ---------------------------------------------------------------------------
const discoveryTemplates: FlavorTemplate[] = [
  {
    category: "discovery",
    template:
      "Pre-empire ruins uncovered on {planet}; {empire} academia in uproar",
    story: [
      "Excavation teams on {planet} have uncovered structures predating any known empire — possibly by tens of thousands of cycles. Carbon-equivalent dating has been disputed, but every independent lab has confirmed the same anomalous result. {pundit} called it 'the find of the century, again.' {empire}'s academia council has scheduled emergency sessions, while three rival empires have already filed competing claims to study the site.",
    ],
  },
  {
    category: "discovery",
    template:
      "New sentient species catalogued on {planet}; rights debates begin immediately",
    story: [
      "A xenobiology survey on {planet} has confirmed the presence of a previously uncatalogued sentient species. The species demonstrates tool use, complex communication, and, according to one team member's field notes, 'a demonstrable sense of humor about the survey crew.' {empire}'s legal department has scheduled its first rights framework session. {pundit} has six opinions and they are all different.",
    ],
  },
  {
    category: "discovery",
    template:
      "Prospector on {planet} finds {commodity} vein {percent}% above galactic average",
    story: [
      "An independent prospector operating without a corporate license in {planet}'s eastern ridge has surfaced a {commodity} deposit testing {percent}% richer than any equivalent claim in the {empire} registry. Initial extraction surveys suggest the vein extends {n} kilometers deeper than the surface sample implies. Three corporations have filed competing ownership petitions. The prospector is understood to be negotiating with all of them and currently residing in an undisclosed location, with very good legal representation.",
    ],
  },
  {
    category: "discovery",
    template:
      "Unmapped system found behind {sector} dust cloud; {empire} claims first survey rights",
    story: [
      "A navigational research vessel has confirmed a complete stellar system hidden behind a dense dust formation at the {sector} periphery. {empire} has claimed prior survey rights by twelve minutes, based on the vessel's approach vector. Three other empires dispute the calculation. The system itself has been observed to contain {n2} bodies and what one astronomer described as 'an extraordinary amount of quiet.'",
    ],
  },
  {
    category: "discovery",
    template:
      "Archaeology team on {planet} unearths object that 'shouldn't exist for another century'",
    story: [
      "Researchers excavating a pre-collapse site on {planet} have recovered an object whose composition and design correspond to manufacturing methods that will not be developed — by current projections — for another hundred cycles. The team has triple-dated the deposit layer. The object works. {pundit} has described the situation as 'technically manageable if everyone stays calm,' which they are not.",
    ],
  },
  {
    category: "discovery",
    template:
      "Bioluminescent lifeforms catalogued in {planet}'s oceans; tourism interest rising",
    story: [
      "A deep-ocean survey of {planet} has documented a colony of bioluminescent organisms capable of producing synchronized light patterns across several kilometers. The patterns repeat on a consistent interval, suggesting either a biological rhythm or coordinated behavior — a distinction the survey team has not resolved. The survey team, in a breach of typical scientific restraint, described the experience as 'genuinely beautiful.' Tourism operators in {empire} have already begun filing route permits, and the survey budget has been renewed without discussion.",
    ],
  },
  {
    category: "discovery",
    template:
      "Lost colony confirmed alive in {sector}; rescue mission departing {port}",
    story: [
      "The {empire} colony ship Esperance, listed as lost {n2} cycles ago, has been confirmed alive in a remote {sector} system after a routine survey detected its beacon signature. Initial contact was established via short-range comms; survivors report all essential systems functional and colony population at {percent}% of original manifest. A rescue and resupply mission is departing {port} within the week. Survivors have reportedly declined to leave until they have finished what they were working on, which they declined to specify.",
    ],
  },
  {
    category: "discovery",
    template:
      "Cargo from derelict in {sector} contains data older than empire records",
    story: [
      "Data cores recovered from a derelict vessel in {sector} contain information predating the oldest {empire} archive by an estimated {n2} cycles. Translation is ongoing and complicated by the fact that the encoding standard is not recognized by any catalogued system. {company} R&D has submitted a formal bid to acquire the cores. The bid has been rejected. They have submitted another.",
    ],
  },
  {
    category: "discovery",
    template:
      "First-contact protocol initiated with {planet}'s indigenous broadcast culture",
    story: [
      "{empire} has formally initiated first-contact protocol with an indigenous civilization on {planet} that has been transmitting coherent radio signals for {n2} cycles without response. Officials describe first contact as 'proceeding carefully.' A xenolinguistics team has been assigned and expects to produce a preliminary translation within {n} cycles. The indigenous civilization's transmissions, according to a preliminary analysis, include what appears to be a question they have been asking for a very long time, and which {empire} has now, technically, begun the process of answering.",
    ],
  },
  {
    category: "discovery",
    template:
      "Unknown alloy recovered from {sector} debris; {company} R&D submits bids",
    story: [
      "Salvage teams in {sector} have recovered hull fragments composed of an alloy that does not match any registered material in the galactic database. The alloy is resistant to all tested cutting methods, maintains temperature across a range considered theoretically impossible, and has a surface texture that one engineer described as 'inexplicably pleasant to touch.' {company} R&D has submitted three separate acquisition bids this cycle.",
    ],
  },
  {
    category: "discovery",
    template:
      "Ancient star map on {planet}'s northern continent matches modern hyperlanes",
    story: [
      "A stone inscription spanning {percent}% of {planet}'s northern continental shelf has been identified as a navigational chart. The chart matches, with {percent}% accuracy, the current hyperlane network — including {n} lanes discovered only in the past decade. The inscription predates hyperlane technology by at least {n2} cycles. {pundit} has called this 'either the most important find in history or a very large coincidence,' then published three more articles on it.",
    ],
  },
  {
    category: "discovery",
    template:
      "Temple complex on {planet} reveals knowledge of orbital mechanics predating local civilization",
    story: [
      "Archaeologists at a newly excavated temple complex on {planet} have confirmed that the site encodes precise orbital data for all bodies in the local system — data that requires technology the civilization possessing the temple demonstrably did not have. The encoding is accurate to within {percent}% of modern measurements, a precision that eliminates coincidence as an explanation. Two separate review panels have confirmed the dating of the site. The find is being described as 'a knowledge inheritance problem' by scientists who are trying very hard not to use the word impossible, with mixed success.",
    ],
  },
  {
    category: "discovery",
    template:
      "Linguist decodes {percent}% of {planet}'s substrate dialect; {pundit} calls it 'urgent'",
    story: [
      "A xenolinguistics team has successfully decoded {percent}% of the primary dialect used in {planet}'s substrate-layer inscription system — a language previously considered untranslatable. The breakthrough came from cross-referencing inscription patterns with {n} newly catalogued cognate languages in the {sector} archive. Preliminary translations contain what the team describes as 'extensive warnings about something' but they are still working out what. {pundit} has already published an analysis of the warnings despite not having seen them, and has been asked to correct the record, which they are considering.",
    ],
  },
  {
    category: "discovery",
    template:
      "Survey crew finds operational generator buried under {planet}'s ice cap",
    story: [
      "A geothermal survey on {planet} has discovered a functioning power generator buried under {n2} meters of ice. The generator is producing power. It has no connection to any surface installation, known cable system, or catalogued infrastructure. It is warm. {empire}'s energy authority has dispatched a team and has asked everyone else, respectfully, to wait.",
    ],
  },
  {
    category: "discovery",
    template: "Floating crystal city catalogued in {sector}; origins unknown",
    story: [
      "A deep-survey vessel in {sector} has documented what can only be described as a city — suspended in open space, composed of crystalline structures, and fully intact. There are no inhabitants, no power signatures, and no orbital mechanics that explain why it does not drift. The vessel's crew has filed the report and requested three weeks of leave.",
    ],
  },
  {
    category: "discovery",
    template:
      "Probe returns with footage of self-replicating geometry near {sector}",
    story: [
      "A research probe sent into the outer margins of {sector} has returned with footage of geometric structures that appear to reproduce themselves on a {n}-hour cycle. The structures are not biological, not mechanical by any registered definition, and are growing. {empire} has dispatched a science vessel. The probe has been placed in quarantine out of an abundance of caution.",
    ],
  },
  {
    category: "discovery",
    template:
      "Microbial life confirmed in {planet}'s upper atmosphere; quarantine protocols updated",
    story: [
      "Atmospheric sampling from {planet}'s upper stratosphere has confirmed the presence of microbial organisms that metabolize radiation — a combination previously considered incompatible with stable life. The organisms appear to have been thriving for at least {n2} cycles, surviving multiple stellar flare events that would have sterilized the upper atmosphere of any registered planet. {empire} medical authorities have updated quarantine protocols for {sector} traffic. The microbes have been named, provisionally, and the naming committee has already disagreed about pronunciation.",
    ],
  },
  {
    category: "discovery",
    template:
      "Recovered logs from {sector} shipwreck rewrite empire founding narrative",
    story: [
      "Expedition teams salvaging a {n2}-cycle-old wreck in {sector} have recovered voyage logs that directly contradict three foundational claims in {empire}'s official founding account. The logs have been authenticated by independent archivists. {empire}'s bureau of historical records has issued a statement describing the logs as 'context-dependent' and asking historians to 'maintain perspective.' Historians have not maintained perspective.",
    ],
  },
  {
    category: "discovery",
    template:
      "Xenobiologist team on {planet} discovers symbiosis chain spanning seven species",
    story: [
      "A field team on {planet} has documented a symbiotic relationship chain involving seven distinct species, each dependent on the next in a closed cycle that none of them could have evolved independently to sustain. The chain has no apparent origin point — every species predates the others in the fossil record, depending on which layer of {planet}'s geology is sampled. Biologists describe the discovery as 'almost designed' and have asked that phrase not be quoted. It has been quoted, extensively, and is now the title of {n} separate academic papers.",
    ],
  },
  {
    category: "discovery",
    template:
      "Pre-translation artifacts surface at {port} black market; {empire} demands return",
    story: [
      "A cache of pre-translation-era artifacts has surfaced on {port}'s black market — objects of the kind typically held under {empire} restricted-cultural-property designation. {empire} has filed formal demands for return and dispatched an attaché. The seller has not been identified. The objects have been authenticated by {n} independent labs, all of whom were then asked not to publish.",
    ],
  },
  {
    category: "discovery",
    template: "Astronomers identify possible megastructure in {sector}",
    story: [
      "A research team at {empire}'s primary observatory has published preliminary findings identifying what may be an artificial megastructure surrounding a star in the outer {sector}. The paper is careful to use the word 'possible' seventeen times. The structure, if confirmed, would be the largest artificial object in recorded history. {pundit} is not being careful with the word 'possible.'",
    ],
  },
  {
    category: "discovery",
    template:
      "Teleportation pad found inside {planet} ruins; output direction unknown",
    story: [
      "Excavation teams on {planet} have uncovered what appears to be a functional teleportation device inside a sealed chamber predating any known civilization by {n2} cycles. The device activates when approached. Its destination is not known. Three researchers have declined to test it. A fourth has agreed and is currently unavailable for comment.",
    ],
  },
  {
    category: "discovery",
    template:
      "Plant species on {planet} performs mathematical calculations through growth patterns",
    story: [
      "Botanists studying growth patterns in {planet}'s highland flora have published findings suggesting a native plant species arranges its branching structure to perform arithmetic calculations in response to environmental inputs. The computations are simple — addition, subtraction — but deliberate. The plants do not know they are doing math. Or they do. The paper does not settle this question.",
    ],
  },
  {
    category: "discovery",
    template: "Survey identifies {n2} previously unmapped objects in {sector}",
    story: [
      "A cartographic pass through the outer margins of {sector} has identified {n2} previously uncatalogued objects — a count that {empire}'s astronomy bureau describes as 'significantly above expected survey yield.' The objects range from standard asteroid-class bodies to three items that the survey report classifies as 'object, type unassigned, pending review.' Review is underway.",
    ],
  },
  {
    category: "discovery",
    template:
      "{empire} expedition recovers fully intact ship from pre-hyperlane era",
    story: [
      "An {empire} deep-space expedition has recovered a pre-hyperlane-era vessel in near-perfect condition, drifting in the outer {sector} at a velocity consistent with a launch date {n2} cycles ago. The ship's logs are intact. The cargo hold is sealed. {empire}'s historical preservation office has claimed jurisdiction. {company} R&D has filed a competing petition and been denied twice.",
    ],
  },
];

// ---------------------------------------------------------------------------
// GOSSIP (25 templates) — universe drama, feuds, rumors
// ---------------------------------------------------------------------------
const gossipTemplates: FlavorTemplate[] = [
  {
    category: "gossip",
    template:
      "{celeb} spotted having dinner with {celeb}'s ex; PR teams scrambling",
    story: [
      "{celeb} was photographed at a restaurant on {port} with someone they definitely shouldn't have been having dinner with. PR statements are already drafting themselves and management has gone to voicemail.",
    ],
  },
  {
    category: "gossip",
    template:
      "{celeb} feuds with {celeb} over project credit; insiders predict 'long winter'",
    story: [
      "A billing dispute over a joint holovid project has escalated into a full public feud between {celeb} and another household name. Insiders with knowledge of neither party have predicted the situation will not resolve before the next award season.",
    ],
  },
  {
    category: "gossip",
    template: "{musician} and {celeb} dating? Source close to neither says yes",
    story: [
      "A source described as 'familiar with the situation from a distance' has confirmed to three separate tabloids that {musician} and {celeb} are, in some capacity, romantically involved. Neither party has acknowledged the claim. The source has since been unreachable.",
    ],
  },
  {
    category: "gossip",
    template:
      "{ceo}'s divorce paperwork leaked; lawyers cite 'voidlight differences'",
    story: [
      "Filings from {ceo}'s ongoing divorce proceedings have surfaced on a grey-market legal archive, citing irreconcilable differences stemming from what the document calls 'fundamentally incompatible voidlight philosophies.' Legal teams for both parties have confirmed the filing is authentic and have asked everyone to stop reading it.",
    ],
  },
  {
    category: "gossip",
    template:
      "{celeb} unfollowed by entire {empire} entertainment district overnight",
    story: [
      "In what media analysts are calling 'coordinated' and publicists are calling 'a technical glitch,' {celeb} lost {n2} followers from {empire}'s entertainment industry between midnight and dawn. {celeb}'s team has not commented. The unfollowers have not commented. Gossip columns have commented extensively.",
    ],
  },
  {
    category: "gossip",
    template:
      "{musician}'s rumored side project with {celeb} confirmed by accidental post",
    story: [
      "An unlisted track featuring both {musician} and {celeb} was posted to a streaming platform for {n} minutes before being taken down. It was screenshotted {n2} times. Management for both parties has confirmed there is 'nothing to confirm at this time,' which everyone is treating as confirmation.",
    ],
  },
  {
    category: "gossip",
    template: "{celeb}'s yacht spotted at {port}; {n2} guests, zero permits",
    story: [
      "{celeb}'s private vessel has docked at {port} with {n2} guests aboard and, according to harbor authority records, no valid berth permit. {celeb}'s spokesperson says the matter is being handled. Harbor staff note it has been being handled for {n} cycles.",
    ],
  },
  {
    category: "gossip",
    template:
      "Mysterious patron pays off {celeb}'s gambling debts; rumors swirl",
    story: [
      "A transfer of {credits} against {celeb}'s account at the {port} gaming house has been traced to an anonymous intermediary, clearing debts described as 'significant and accumulating.' Speculation about the benefactor's identity has produced {n2} credible theories and one that involves {pundit}, which {pundit} denies.",
    ],
  },
  {
    category: "gossip",
    template:
      "{musician} and {musician}'s feud reignites after one-line interview",
    story: [
      "A single line in an interview — specifically, {musician} describing the current state of {genre} as 'fine, if you like that sort of thing' — has been interpreted by fans of a rival act as a direct attack. The rival's team has released a statement. The statement has been interpreted as a counter-attack. The original interviewer has apologized for asking.",
    ],
  },
  {
    category: "gossip",
    template:
      "{celeb} caught wearing rival {empire}'s designer to {empire} state dinner",
    story: [
      "Fashion photographers at {empire}'s annual state dinner captured {celeb} wearing an ensemble from a designer house based in a rival empire. {empire}'s cultural ministry has lodged a formal complaint with {celeb}'s management. The designer house issued a statement expressing appreciation. {celeb} has said nothing and looked excellent.",
    ],
  },
  {
    category: "gossip",
    template:
      "{ceo}'s personal chef walks out mid-banquet citing {commodity} disagreement",
    story: [
      "In what is being described as the most dramatic corporate dining incident of the cycle, {ceo}'s personal chef departed a formal banquet mid-service, citing an unresolvable philosophical disagreement about the preparation of {commodity}. Fourteen guests witnessed the exit. Dessert was not served.",
    ],
  },
  {
    category: "gossip",
    template: "{celeb}'s 'just friends' yacht tour now in its {n}th cycle",
    story: [
      "{celeb} and their 'close personal friend' have concluded the {n}th cycle of their ongoing yacht tour of {sector}, during which they have been photographed holding hands in {n2} ports and described in every caption as 'just friends.' Travel writers have run out of ways to use quotation marks.",
    ],
  },
  {
    category: "gossip",
    template:
      "Galactic gossip column claims {celeb} secretly funded {musician}'s comeback",
    story: [
      "A column published in the Galactic Social Register claims {celeb} personally bankrolled {musician}'s recent return to recording — a claim that both parties have denied, simultaneously, in statements that use identical language. Publicists for neither party have explained the coincidence.",
    ],
  },
  {
    category: "gossip",
    template:
      "{celeb} blocks fan account that correctly predicted their next move",
    story: [
      "A fan account with {n2} followers, known for unexpectedly accurate predictions about {celeb}'s career choices, has been blocked following its correct forecast of {celeb}'s {port} appearance. The block has been interpreted as confirmation of the next prediction, which involves {musician}.",
    ],
  },
  {
    category: "gossip",
    template:
      "Anonymous source: {celeb} 'never recovered' from empire council snub",
    story: [
      "An anonymous source described as 'deeply embedded in {celeb}'s inner circle' has told a major entertainment outlet that {celeb} was permanently altered by being passed over for {empire}'s cultural recognition award {n} cycles ago. {celeb}'s publicist has called the claim 'deeply fictional.' The source has clarified they stand by every word.",
    ],
  },
  {
    category: "gossip",
    template:
      "{musician}'s assistant fired after sharing tour rider with tabloid",
    story: [
      "A former assistant to {musician} has been dismissed after allegedly leaking the tour rider — a document that, according to the tabloid that published it, includes {n2} requirements, three of which have been described as 'technically impossible' and one as 'aggressively reasonable.' {musician}'s management called it a privacy violation. Fans called it their favorite article of the cycle.",
    ],
  },
  {
    category: "gossip",
    template:
      "{celeb} arrives at {port} party two hours late; party leaves an hour earlier",
    story: [
      "{celeb} made their entrance at the {port} premiere event {n} hours after the stated start time, at which point {percent}% of guests had already departed. Industry observers noted the timing suggested either perfect calculation or complete indifference. Photographs from the empty venue have been widely shared.",
    ],
  },
  {
    category: "gossip",
    template: "{ceo} caught with rival {company}'s heir at {port} restaurant",
    story: [
      "Photographs circulating on entertainment feeds show {ceo} dining with a member of the founding family of {company} — a direct corporate rival — at a restaurant in {port} that prides itself on discretion. Neither party's communications team was prepared for the photos. Both have since issued statements describing the meal as 'coincidental.'",
    ],
  },
  {
    category: "gossip",
    template:
      "{celeb} refuses to share elevator with {celeb}; building staff comply",
    story: [
      "Staff at the {port} Grand Convention Center confirmed this cycle that they have maintained a formal elevator separation protocol between two high-profile guests who shall not be named but are {celeb} and another {celeb}. The protocol has been in place for {n} days and requires two dedicated operators.",
    ],
  },
  {
    category: "gossip",
    template:
      "{musician}'s 'private' {empire} ambassador performance goes viral",
    story: [
      "A recording of {musician} performing three songs at what was billed as a private dinner for {empire}'s cultural ambassador has appeared on every major network. The recording is high quality. Someone at the dinner had professional equipment. {musician}'s team has not identified who, though they have narrowed it to a table of {n2}.",
    ],
  },
  {
    category: "gossip",
    template: "Holovid star {celeb} demanded all crew speak in haiku on set",
    story: [
      "A production assistant on {celeb}'s latest holovid project has revealed that the star issued a formal request, honored for {n} full shooting days, that all on-set communication be delivered in haiku form. Crew members report the directive improved mood but slowed lunch orders considerably.",
    ],
  },
  {
    category: "gossip",
    template: "{celeb} buys entire wing of {port} hotel to avoid {celeb}",
    story: [
      "Hotel management at {port}'s Grand Meridian has confirmed that {celeb} booked an entire residential wing — {n2} rooms — for the duration of a festival week following intelligence that a fellow {celeb} was also registered. The bill has not been disclosed. The other {celeb} was reportedly unbothered.",
    ],
  },
  {
    category: "gossip",
    template:
      "{musician} dating rumor sparked by shared sandwich; sandwich was excellent",
    story: [
      "A photograph showing {musician} and an unnamed companion sharing a sandwich at {port}'s open-air market has generated {n2} articles speculating about their relationship status. Neither party has addressed the photograph. The sandwich vendor has confirmed the order was the smoked {commodity} special and described the experience as 'normal, mostly.'",
    ],
  },
  {
    category: "gossip",
    template:
      "{celeb}'s fashion line panned by every reviewer; sells out in {n} hours",
    story: [
      "The debut collection from {celeb}'s fashion label received uniformly negative reviews from every major outlet in {empire} — words used include 'bewildering,' 'committed,' and 'not for everyone, and yet.' The collection sold out within {n} hours of release. {celeb} has shared every negative review with apparent delight.",
    ],
  },
  {
    category: "gossip",
    template:
      "{empire}'s official biographer admits draft was 'mostly gossip column clippings'",
    story: [
      "The authorized biographer of {empire}'s current administration has acknowledged in an interview that approximately {percent}% of the first draft consisted of material sourced from entertainment columns, social feeds, and one particularly well-sourced rumor blog. The biography has been sent back for revisions. The blog has been sent a formal acknowledgment.",
    ],
  },
];

// ---------------------------------------------------------------------------
// MILITARY (25 templates) — fleet movements, defections, arms deals
// ---------------------------------------------------------------------------
const militaryTemplates: FlavorTemplate[] = [
  {
    category: "military",
    template:
      "{rank} {officer} of {empire} promoted to command of {sector} fleet",
    story: [
      "{rank} {officer} has been confirmed as the new commanding officer of {empire}'s {sector} fleet, effective immediately. The promotion follows a {n}-cycle campaign during which {officer} is credited with resolving two border incidents without escalation. Defense analysts are calling the appointment 'the right hand for the wrong moment' and declining to elaborate.",
    ],
  },
  {
    category: "military",
    template:
      "{empire} announces {percent}% increase in fleet budget; rivals reviewing options",
    story: [
      "{empire}'s defense council has ratified a {percent}% increase in fleet construction spending for the coming cycle — the largest single-year increase in {n2} cycles. Officials cited 'evolving regional security requirements,' a phrase that four rival empires have described as 'concerning' in separate statements released within {n} hours of each other.",
    ],
  },
  {
    category: "military",
    template:
      "Defection: {rank} {officer} reportedly seeking asylum in {empire2}",
    story: [
      "{rank} {officer}, until recently a senior logistics commander in {empire}'s {sector} fleet, has reportedly crossed into {empire2} territory and filed for asylum. {empire} has characterized the departure as 'an unauthorized absence' and requested return. {empire2} has acknowledged receipt of 'an individual' and declined to confirm identity.",
    ],
  },
  {
    category: "military",
    template:
      "Joint fleet exercise in {sector} 'unrelated' to border incidents, says {empire}",
    story: [
      "{empire} and {empire2} have commenced a joint fleet exercise in {sector}, deploying a combined force of {n2} vessels. A spokesperson for {empire} described the exercise as 'routine and prescheduled,' a characterization that analysts note conflicts with the exercise not appearing in any prior schedule. The exercise is expected to last {n} cycles.",
    ],
  },
  {
    category: "military",
    template:
      "Arms convoy intercepted near {planet}; {empire} denies ownership three times",
    story: [
      "A freight convoy intercepted by {empire2} patrol vessels near {planet} has been found to contain weapons systems consistent with {empire} military hardware. {empire} has issued three separate statements: the first denying the convoy was theirs, the second denying it was armed, and the third clarifying that the first two statements were 'technically accurate in context.' Investigators are reviewing the context.",
    ],
  },
  {
    category: "military",
    template:
      "New stealth corvette unveiled by {empire}; {pundit} calls it 'mostly press release'",
    story: [
      "{empire}'s defense industry premiered its latest stealth-class corvette at a ceremony in {port}, releasing detailed specifications and a holovid of the vessel performing evasion maneuvers. {pundit} published a response within the hour noting that the stealth system's effectiveness had been demonstrated 'on camera, which is a curious choice.' {empire}'s defense ministry has not responded.",
    ],
  },
  {
    category: "military",
    template:
      "{rank} {officer} testifies before {empire} council; transcript shows {percent}% redacted",
    story: [
      "The transcript of {rank} {officer}'s testimony before {empire}'s defense oversight council has been released with {percent}% of content redacted. The remaining text consists primarily of {officer} confirming their name, rank, and willingness to cooperate. Opposition council members have described the document as 'technically a transcript.' The council chair has adjourned the session.",
    ],
  },
  {
    category: "military",
    template:
      "Mercenary group operating in {sector} formally banned by three empires",
    story: [
      "Three empires have issued coordinated prohibitions against a private military contractor operating in {sector}, citing documentation of {n2} border violations and what one resolution calls 'a business model incompatible with regional stability.' The contractor has responded by registering a new entity under a slightly different name and continuing operations.",
    ],
  },
  {
    category: "military",
    template:
      "{empire} retires {rank} {officer} after {n2} cycles; statue planned at {port}",
    story: [
      "{rank} {officer} has formally retired from {empire}'s military after {n2} cycles of service, closing a career that included {n} commendations and two incidents that remain classified. A commemorative statue is planned for the {port} naval district. {officer}'s retirement speech lasted {n} minutes and contained no classified information, a fact three intelligence services confirmed independently.",
    ],
  },
  {
    category: "military",
    template:
      "Border patrol incident leaves {n} cargo ships impounded; {empire} apologizes diplomatically",
    story: [
      "A patrol vessel from {empire}'s border fleet has impounded {n} commercial cargo ships in what {empire2} is calling an illegal seizure and {empire} is calling a 'customs verification procedure of unusual duration.' Diplomatic channels have been activated. {empire} has issued an apology described by observers as 'technically an apology' and by the impounded crews as 'not an apology.'",
    ],
  },
  {
    category: "military",
    template:
      "Naval intelligence leaks suggest {empire} testing FTL torpedoes in {sector}",
    story: [
      "Classified documents apparently originating from {empire}'s naval intelligence directorate have surfaced on a grey-market archive, including test parameters for what appears to be an FTL-capable weapons system being evaluated in {sector}. {empire} has confirmed the documents are classified, which most analysts are treating as confirmation of their authenticity. Testing, if it occurred, is described as 'successful within parameters.'",
    ],
  },
  {
    category: "military",
    template:
      "{rank} {officer} disgraced after audit reveals {credits} unaccounted",
    story: [
      "An internal audit of {empire}'s {sector} logistics division has identified {credits} in procurement funds that cannot be accounted for under {rank} {officer}'s command. {officer} has been suspended pending investigation and has issued a statement through legal representation describing the discrepancy as 'a bookkeeping matter of unusual complexity.' The auditors have described it differently.",
    ],
  },
  {
    category: "military",
    template:
      "Disarmament summit in {port} ends without agreement; {pundit} unsurprised",
    story: [
      "A three-day disarmament summit hosted at {port} has concluded with a joint communiqué describing 'substantive progress in establishing frameworks for future dialogue.' No agreements were signed. {pundit}, who covered the summit, published a piece headlined 'As Expected' before the final session ended. The piece had been written in advance.",
    ],
  },
  {
    category: "military",
    template:
      "Patrol fleet in {sector} accidentally encounters second patrol fleet; embarrassment follows",
    story: [
      "Two {empire} patrol fleets operating in {sector} under separate command structures encountered each other in the same quadrant this cycle, each having classified the area as 'unmonitored' in their mission briefings. No incident occurred beyond what one after-action report describes as 'an extended period of mutual acknowledgment.' Command has convened a review of inter-fleet communication protocols.",
    ],
  },
  {
    category: "military",
    template:
      "Military contractor wins {credits} contract over {percent}% lower bid",
    story: [
      "{company} has been awarded a {credits} fleet maintenance contract by {empire}'s procurement office despite submitting a bid {percent}% higher than the next lowest offer. The procurement office cited 'operational reliability and institutional familiarity' as selection criteria. The lower-bidding contractor has filed a challenge. {pundit} has filed three opinion pieces.",
    ],
  },
  {
    category: "military",
    template:
      "Black-site facility on {planet} confirmed by satellite imagery; {empire} declines comment",
    story: [
      "Commercial satellite imagery published by an independent research institute shows a facility on {planet}'s southern continent matching no registered installation in {empire}'s infrastructure database. The facility has power, personnel, and landing pads. {empire}'s defense ministry has issued a statement consisting entirely of the phrase 'no comment.' Analysts are treating this as a partial confirmation.",
    ],
  },
  {
    category: "military",
    template:
      "{rank} {officer} retires to {port} estate; rumors of return persist",
    story: [
      "{rank} {officer} has retired to a private estate in {port}'s northern district following a career that ended under circumstances described in official records as 'mutual agreement.' Despite the retirement announcement, three separate sources have described {officer} as 'still very much involved' in ways none of them are willing to specify. The estate has declined all interview requests.",
    ],
  },
  {
    category: "military",
    template:
      "Border treaty between {empire} and {empire2} renewed for {n2} cycles",
    story: [
      "{empire} and {empire2} have formally renewed their {sector} border management treaty for an additional {n2} cycles following negotiations that lasted {n} months longer than scheduled. The renewed treaty includes three new clauses, two of which were described by both parties as 'important' and one of which neither party would discuss. It was signed without ceremony, which both parties called appropriate.",
    ],
  },
  {
    category: "military",
    template:
      "Veterans on {planet} march for hazard wages unpaid for {n} cycles",
    story: [
      "Several hundred veterans of {empire}'s {sector} campaigns marched through {planet}'s capital district this cycle, demanding payment of hazard wages outstanding for {n} cycles. {empire}'s veterans affairs office described the outstanding payments as 'under active review.' This is the fourth cycle in which the march has occurred and the fourth in which they have been described as under active review.",
    ],
  },
  {
    category: "military",
    template:
      "{empire} navy unveils flagship; {pundit} notes price equals healthcare budget",
    story: [
      "The {empire} navy has commissioned its new fleet flagship at a ceremony in {port}, with officials describing the vessel as 'a symbol of {empire}'s commitment to regional security.' The vessel cost {credits} to construct. {pundit} has published a comparison noting the figure equals {empire}'s civilian healthcare budget for {n} cycles. {empire}'s defense ministry called the comparison 'misleading in framing.'",
    ],
  },
  {
    category: "military",
    template:
      "Cyberwarfare unit graduates first cohort; commencement classified",
    story: [
      "{empire}'s newly established cyberwarfare academy graduated its inaugural class this cycle in a ceremony that was not open to press, family members, or other branches of the military. A one-line announcement confirmed the event occurred. Graduates' names, assignments, and areas of specialization are classified. The academy's location is also classified, which makes the congratulatory banners outside it somewhat awkward.",
    ],
  },
  {
    category: "military",
    template:
      "Decommissioned battleship sold for scrap to {company}; reactor rumored intact",
    story: [
      "{empire}'s fleet decommissioning office has sold the former battleship Resolute to {company} for {credits}, with documentation listing the vessel as 'fully inert for salvage.' Sources within {company}'s acquisition division have indicated the vessel's main reactor is operational. {empire}'s decommissioning office has described this as 'a discrepancy we are looking into.'",
    ],
  },
  {
    category: "military",
    template:
      "{rank} {officer}'s memoir banned in {empire}, bestseller in {empire2}",
    story: [
      "{rank} {officer}'s account of their {n2}-cycle career in {empire}'s military has been formally prohibited in {empire} under provisions of the Official Records Act, citing {n} passages deemed to contain restricted operational information. {empire2} published the book three cycles ago. It is currently in its {n}th printing and has sold {n2} copies. {officer} has declined to comment from an undisclosed location.",
    ],
  },
  {
    category: "military",
    template:
      "Joint patrol agreement signed for {sector}; routes finally safe, say officials",
    story: [
      "A joint patrol agreement between {empire} and {empire2} covering {sector}'s major trade corridors has been signed and takes effect next cycle. Officials from both parties described the agreement as 'a historic step toward predictable safety.' Cargo operators in {sector} have cautiously welcomed the news and are awaiting the first patrol cycle before updating their insurance rates.",
    ],
  },
  {
    category: "military",
    template:
      "{empire} denies satellite showing fleet buildup near {planet}; satellite disagrees",
    story: [
      "{empire}'s foreign affairs ministry has rejected characterizations of satellite imagery showing a concentration of fleet vessels near {planet} as a 'buildup,' describing the presence as 'scheduled maintenance positioning.' The satellite, operated by an independent monitoring service, has released updated images showing four additional vessels in the same position. The ministry has described the updated images as 'context-dependent.'",
    ],
  },
];

// ---------------------------------------------------------------------------
// PROPAGANDA (25 templates) — state spin, disinformation, counter-narratives
// ---------------------------------------------------------------------------
const propagandaTemplates: FlavorTemplate[] = [
  {
    category: "propaganda",
    template:
      "{empire} state media reports {percent}% citizen approval; rival outlets dispute methodology",
    story: [
      "The official {empire} broadcast network has announced that {percent}% of citizens approve of current leadership — a figure {pundit} described as 'mathematically suspicious.' Independent surveys in {sector} show numbers ranging from {n} to {n2} percent. The state response cited 'foreign-funded methodological bias,' which the independent survey teams say is accurate in the sense that they are funded and from a different empire.",
    ],
  },
  {
    category: "propaganda",
    template:
      "{empire} ministry of truth issues clarification on yesterday's clarification",
    story: [
      "{empire}'s Office of Public Information has issued a formal clarification of a statement issued yesterday clarifying a statement from the day before. The newest clarification supersedes both prior statements and introduces three new terms that were not in either. A fourth clarification is expected by end of cycle. {pundit} has published a timeline.",
    ],
  },
  {
    category: "propaganda",
    template:
      "State news on {empire} celebrates {n2}-cycle peace; same broadcast lists three active conflicts",
    story: [
      "The same broadcast hour on {empire}'s state network celebrated {n2} cycles of uninterrupted peace in {sector} and then reported on three active armed conflicts in adjacent regions, describing each as 'containment operations' rather than conflicts. Linguists have noted that the distinction is definitional and have declined to say which definition applies. {pundit} declined no such thing.",
    ],
  },
  {
    category: "propaganda",
    template:
      "{empire} 'spontaneous citizens' rally' attracts identical signs and bottled water",
    story: [
      "A rally organized by what {empire} state media described as 'a spontaneous outpouring of popular support' was attended by {n2} participants, all carrying identical printed signs and all provided with the same brand of bottled water. Event photography shows the signs still in shrink-wrap at the {n}-minute mark. {empire}'s communications office called the images 'decontextualized.'",
    ],
  },
  {
    category: "propaganda",
    template:
      "Counter-narrative leaked: {empire} freight subsidies {percent}% higher than reported",
    story: [
      "An internal {empire} treasury document leaked to an independent archive shows freight subsidies {percent}% higher than the figure cited in official public accounts. {empire}'s finance ministry has confirmed the document's authenticity and described the discrepancy as 'a presentation difference reflecting different accounting frameworks.' The archive has published both figures side by side and let readers determine the framework.",
    ],
  },
  {
    category: "propaganda",
    template:
      "{pundit} ridicules {empire} state media for using stock footage of victories",
    story: [
      "{pundit} has published a frame-by-frame analysis showing that {empire}'s state broadcast celebrated a recent military exercise using footage from a training simulation conducted {n2} cycles earlier. The footage was unaltered. {empire}'s media office called the analysis 'a bad-faith reading of inspirational illustration.' {pundit} has published a follow-up consisting entirely of the phrase 'inspirational illustration.'",
    ],
  },
  {
    category: "propaganda",
    template: "{empire} bans documentary citing {n} unrelated legal paragraphs",
    story: [
      "A documentary examining freight industry subsidies in {sector} has been prohibited in {empire} under provisions of a communications act citing {n} separate paragraphs, none of which appear to apply to documentary film on their face. Legal analysts have described the prohibition as 'creative.' The documentary has been made available on every network outside {empire} and has been watched {n2}M times.",
    ],
  },
  {
    category: "propaganda",
    template:
      "Education ministry in {empire} updates textbooks for {n}th time this cycle",
    story: [
      "{empire}'s ministry of education has issued its {n}th textbook revision of the current cycle, updating historical accounts of the {sector} founding period to reflect 'the most current scholarly consensus.' Educators have noted that the consensus appears to change faster than the academic calendar. The previous edition was adopted {n2} months ago.",
    ],
  },
  {
    category: "propaganda",
    template:
      "Journalist on {planet} disappears after publishing freight corruption exposé",
    story: [
      "A journalist based on {planet} who published a detailed investigation into {empire} freight subsidy irregularities has been unreachable for {n} cycles following the piece's release. {empire} authorities have confirmed they are aware of the journalist's absence and have described it as 'a private matter.' The original publication has been taken offline in {empire} territories. Archived copies are circulating.",
    ],
  },
  {
    category: "propaganda",
    template:
      "{empire} announces 'historic' surplus; rival notes harvest hasn't occurred yet",
    story: [
      "{empire}'s agricultural bureau has announced a 'historic' grain surplus for the current growing cycle — a claim issued {n} cycles before the primary harvest is scheduled to begin. {empire2} has noted the timeline publicly. {empire}'s bureau has clarified that the surplus figure reflects 'projected actual yield based on current models,' a phrase that agricultural economists have begun using as an example in lectures.",
    ],
  },
  {
    category: "propaganda",
    template:
      "{empire} state holovid hits {n2}M views; analysts note {percent}% from bots",
    story: [
      "A state-produced holovid celebrating {empire}'s infrastructure investment program has reached {n2}M views on official channels. A media analytics firm has published findings suggesting {percent}% of those views were generated by automated accounts operating from {n} server clusters. {empire}'s media office has called the findings 'speculative' and the holovid has since received {n2} additional views.",
    ],
  },
  {
    category: "propaganda",
    template:
      "{empire} state radio jamming detected in {sector}; cause: 'technical maintenance'",
    story: [
      "Independent broadcast monitors have confirmed signal jamming in {sector} consistent with {empire} state radio equipment, disrupting {n2} independent and commercial channels over a {n}-cycle period. {empire}'s communications ministry has described the interference as 'residual output from scheduled transmitter maintenance.' The maintenance was not listed in any prior filing. Affected broadcasters are calling it a deliberate suppression.",
    ],
  },
  {
    category: "propaganda",
    template:
      "Ministry on {empire} renames national holiday for {n}th time this decade",
    story: [
      "{empire}'s cultural affairs ministry has officially renamed the {sector} Liberation Day observance for the {n}th time in {n2} cycles, selecting a title that removes the word 'liberation' in favor of a phrase that translates roughly as 'Day of Appropriate Historical Reflection.' Previous names included two that have now been retroactively classified. Educators have updated their materials accordingly.",
    ],
  },
  {
    category: "propaganda",
    template:
      "{empire} cultural attache pens op-ed in {empire2} paper; authorship traced to AI",
    story: [
      "An opinion piece published in {empire2}'s primary broadsheet under the byline of {empire}'s cultural attaché has been identified by two independent linguistics firms as AI-generated text. {empire}'s cultural affairs office confirmed the attaché 'reviewed and approved' the piece, which is not the same as writing it. The broadsheet has issued an editor's note. The attaché has declined to write a follow-up.",
    ],
  },
  {
    category: "propaganda",
    template:
      "Censored book in {empire} smuggled through {port}; sells for {credits} per copy",
    story: [
      "A memoir banned in {empire} is being distributed through {port}'s grey-market book circuit at {credits} per physical copy — {percent}% above the cover price of the legitimate edition available everywhere else. Demand outpaces supply. {empire} customs officials at {port} have seized {n} copies and have not asked where the remaining {n2} went.",
    ],
  },
  {
    category: "propaganda",
    template:
      "{empire} airs same heroic profile of {rank} {officer} for {n} cycles",
    story: [
      "{empire}'s state broadcast has aired the same forty-minute documentary profile of {rank} {officer} in its prime evening slot for {n} consecutive cycles, drawing notice from media analysts who track programming patterns. The network has described the repeat broadcasts as 'reflecting continued public interest.' Ratings for the profile have declined {percent}% each cycle. Interest continues to be reflected.",
    ],
  },
  {
    category: "propaganda",
    template:
      "Enemy speeches in {empire} translation get new word inserted each version",
    story: [
      "Comparative analysis of {empire}'s official translations of {empire2} leadership speeches has found that each new version contains one additional negative adjective not present in the original. The trend has been consistent across {n2} speeches spanning {n} cycles. {empire}'s translation bureau has described the pattern as 'an artifact of increasing rhetorical precision.' The adjectives are getting longer.",
    ],
  },
  {
    category: "propaganda",
    template:
      "Disinformation campaign linked to {empire} traced through {n} relay points",
    story: [
      "A coordinated disinformation network spreading fabricated trade data across {sector} media platforms has been traced, after analysis of {n2} source points, to infrastructure linked to {empire}'s information services division. {empire} has called the attribution 'technically unverifiable' and the data 'not fabricated, but contextualized.' Independent fact-checkers have published their methodology and are disputing both characterizations.",
    ],
  },
  {
    category: "propaganda",
    template:
      "{empire} state news reports drought; satellite shows record rainfall",
    story: [
      "{empire}'s agricultural broadcast has been reporting a severe drought in {planet}'s eastern regions for {n} cycles, including footage of cracked farmland and requests for disaster relief funding. Satellite imagery published by an independent monitoring group shows the same region receiving record rainfall. {empire}'s agricultural bureau has stated that its reporters 'observed conditions on the ground' and the satellite 'has a known calibration issue.'",
    ],
  },
  {
    category: "propaganda",
    template:
      "Whistleblower on {planet} exposes {company} bribes to {empire} broadcast officials",
    story: [
      "A former compliance officer at {company} has filed documentation with an independent oversight body detailing payments to {n2} officials within {empire}'s state broadcast network, describing the transfers as payments for favorable coverage of {company} freight operations in {sector}. {company} has called the claims 'categorically false.' {empire}'s broadcast network has not yet aired coverage of the story.",
    ],
  },
  {
    category: "propaganda",
    template:
      "Ministry bans inquiry into {sector} historical events; archive sealed",
    story: [
      "{empire}'s ministry of historical affairs has issued a prohibition on academic publication of research related to events in {sector} during a specific {n2}-cycle period that the prohibition does not name. The archive covering that period has been moved to restricted access. Three researchers who had submitted papers on the period have had their institutional access reviewed. None have commented publicly.",
    ],
  },
  {
    category: "propaganda",
    template:
      "Counter-propaganda lab at {empire2} university; first paper banned everywhere",
    story: [
      "A counter-disinformation research laboratory at {empire2}'s primary research university has published its inaugural paper analyzing state propaganda techniques used by four empires. All four empires have formally requested the paper's retraction. {empire2}'s university has declined. The paper has been downloaded {n2}M times. {pundit} called it 'the most banned thing to become required reading.'",
    ],
  },
  {
    category: "propaganda",
    template:
      "Sealed records in {empire} reveal {n2}-cycle cover-up; nobody surprised",
    story: [
      "{empire} has released {n2}-cycle-old sealed administrative records as part of a periodic declassification review, revealing that an incident described at the time as 'a navigational accident near {sector}' was a deliberate policy action. {pundit} published a response headlined 'Of Course It Was.' Historians have begun updating footnotes. Public reaction has been described by analysts as 'weary rather than outraged.'",
    ],
  },
  {
    category: "propaganda",
    template:
      "Pirate radio on {planet} mocks {empire} state broadcast; ratings beat the original",
    story: [
      "An unlicensed broadcast operating from an unregistered transmitter somewhere on {planet} has been running satirical recreations of {empire} state news for {n} cycles, reaching an estimated {n2} listeners per broadcast. Audience research commissioned by the state network found that the pirate broadcast's ratings exceed the official signal in three districts. {empire} communications authorities are investigating the transmitter's location, which changes nightly.",
    ],
  },
  {
    category: "propaganda",
    template:
      "{empire} demands {empire2} retract documentary; {empire2} broadcasts it again instead",
    story: [
      "Following a formal diplomatic demand that {empire2} retract a documentary examining {empire}'s trade subsidy practices, {empire2}'s public broadcast network has scheduled three additional airings of the film across its primary channels. {empire2}'s foreign ministry described the scheduling as 'a programming decision unrelated to diplomatic correspondence.' {empire} has filed a second formal demand. {empire2} has announced a theatrical release.",
    ],
  },
];

// ---------------------------------------------------------------------------
// POLITICS (25 templates) — analytical political commentary
// ---------------------------------------------------------------------------
const politicsTemplates: FlavorTemplate[] = [
  {
    category: "politics",
    template:
      "{empire} parliament adjourns over tariff vote, third recess this cycle",
    story: [
      "{empire}'s parliament entered its third recess of the cycle after debate over the proposed tariff revision collapsed along familiar coalition lines. The speaker has set a new session date. Previous dates have not held. {pundit} described the situation as 'a masterclass in procedural procrastination dressed up as governance,' which both sides found insulting in different ways.",
    ],
  },
  {
    category: "politics",
    template:
      "Trade summit between {empire} and {empire2} ends in 'productive ambiguity'",
    story: [
      "Negotiators from {empire} and {empire2} have concluded their three-cycle trade summit with a joint statement describing the outcome as 'a productive exchange of positions.' No binding agreements were signed. Three preliminary agreements were initialed, a distinction both delegations called 'meaningful.' {pundit} read the joint statement aloud on public broadcast and took {n} minutes to stop laughing.",
    ],
  },
  {
    category: "politics",
    template:
      "{empire} ambassador denies treaty leak, denies leak occurred at all",
    story: [
      "{empire}'s ambassador to {empire2} issued a statement denying any connection to leaked diplomatic correspondence, then issued a second statement denying the leak itself took place. The leaked documents — currently circulating in full across {n2} major media networks — purport to detail {empire}'s internal negotiating position on {commodity} tariffs. The ambassador has described all coverage as 'speculative in nature,' declining to specify which part.",
    ],
  },
  {
    category: "politics",
    template:
      "Sector {sector} council votes {n2}-{n} to formally ignore the news",
    story: [
      "The {sector} governing council passed a procedural resolution by a margin of {n2} to {n} to formally 'defer engagement with current media coverage pending independent verification.' The motion, introduced at {n} a.m. and passed before any opposition could organize, has been described by critics as a vote to ignore inconvenient facts. Council members characterized it as 'due diligence with a calendar attached.'",
    ],
  },
  {
    category: "politics",
    template:
      "{empire} unveils {n}-point plan to deal with {empire2}; six points classified",
    story: [
      "{empire}'s executive office released its long-awaited strategic plan for managing relations with {empire2} — a document spanning {n} publicly accessible points and six additional points visible only as redacted blocks. The unclassified sections address trade, navigation rights, and cultural exchange. {pundit} noted that the classified sections appear to occupy more pages than the public ones. The government described this ratio as 'appropriate and unremarkable.'",
    ],
  },
  {
    category: "politics",
    template:
      "Border lane {planet}-{planet2} closed for 'review of paperwork integrity'",
    story: [
      "Transit authorities have suspended all civilian traffic on the {planet}-{planet2} corridor pending a review they describe only as an 'audit of customs documentation integrity.' The closure affects {n2} shipping lanes and an estimated {percent}% of weekly {commodity} throughput between the two systems. Neither government has provided a timeline for reopening, though both have described the situation as 'temporary and cooperative.'",
    ],
  },
  {
    category: "politics",
    template:
      "{empire} prime minister survives no-confidence vote by {n} votes",
    story: [
      "{empire}'s prime minister survived a no-confidence motion by a margin of {n} votes after a late session of floor negotiations that sources describe as 'tense, expensive, and occasionally loud.' Several coalition members who were expected to defect did not. Analysts are divided on whether the margin represents a genuine mandate or a deferred reckoning. The prime minister called it 'a clear and resounding endorsement' and took questions for exactly {n} minutes.",
    ],
  },
  {
    category: "politics",
    template: "Diplomatic pouch from {empire2} returns unopened, still smoking",
    story: [
      "A diplomatic communication from {empire2}'s foreign ministry, dispatched via secure courier to {empire}'s consulate, has been returned unopened. The parcel was described in the customs manifest as 'lightly smoking, not dangerously.' {empire}'s protocol office confirmed receipt of the returned pouch, declined to open it, and has placed it in a category of correspondence they described as 'file and observe.' Relations between the two empires remain, officially, cordial.",
    ],
  },
  {
    category: "politics",
    template:
      "Mediator declares peace talks 'on a brisk simmer' as week three opens",
    story: [
      "The independent mediator overseeing negotiations between {empire} and {empire2} addressed the press at the opening of week three to describe the talks as 'progressing at a brisk simmer — not quite boiling, not cooling.' Neither delegation disagreed with the metaphor, which the mediator noted was itself 'a form of progress.' Formal proposals are expected by end of cycle. The mediator has not confirmed what happens if they don't arrive.",
    ],
  },
  {
    category: "politics",
    template:
      "{empire} coalition wobbles after coalition partner declares it 'fine'",
    story: [
      "Tensions within {empire}'s governing coalition escalated this cycle after the junior partner released a statement describing the arrangement as 'fine, on balance, mostly.' Analysts noted that the statement contained no positive adjective stronger than 'adequate' and was accompanied by the partner's third policy divergence in as many cycles. The senior partner called the junior partner's statement 'encouraging and unambiguous,' a characterization the junior partner neither confirmed nor denied.",
    ],
  },
  {
    category: "politics",
    template:
      "Election monitors clear {empire} ballot; turnout reported at {percent}%",
    story: [
      "International monitors from {n} observing organizations have certified {empire}'s recent ballot as free and fair, with no systemic irregularities detected across the {n2} polling stations reviewed. Turnout was reported at {percent}% — a figure the incumbent described as 'a mandate' and the opposition described as 'an abstention wave.' Both interpretations are, technically, consistent with the number.",
    ],
  },
  {
    category: "politics",
    template:
      "Tariff exemption granted to {commodity} importers after lobbying surge",
    story: [
      "{empire}'s trade ministry has approved a temporary tariff exemption for licensed {commodity} importers, effective next cycle. The exemption covers {percent}% of the standard levy and is slated to expire in {n} cycles, though similar exemptions have been renewed {n2} times in the past decade. {pundit} described the announcement as 'a policy decision that arrived with remarkable speed after a lobbying spend that arrived with remarkable size.'",
    ],
  },
  {
    category: "politics",
    template: "{empire} senate hearing on AI rights extends into a {n2}th day",
    story: [
      "Hearings before {empire}'s standing committee on civil designation have entered their {n2}th consecutive day, with testimony still ongoing from the {n}th witness. The central question — whether artificial intelligences meeting certain cognitive benchmarks qualify for legal personhood — has generated {n2} position papers, {n} competing legislative drafts, and one instance of a witness describing another witness's argument as 'philosophically naive and personally offensive.' A vote is not expected this cycle.",
    ],
  },
  {
    category: "politics",
    template:
      "Diplomatic scandal: {ceo} caught quoting {empire2} press in {empire} brief",
    story: [
      "A senior aide to {ceo} has been placed on administrative leave after an internal briefing document was discovered to contain passages lifted verbatim from {empire2}'s state media — without attribution, context, or apparent awareness of the irony. {ceo}'s office described the inclusion as 'a research error, not a policy position.' {empire2}'s information bureau has issued no comment, which observers describe as 'loud.'",
    ],
  },
  {
    category: "politics",
    template:
      "{empire} unveils new flag; designer cites 'fewer hostile angles'",
    story: [
      "{empire}'s ceremonial redesign commission has unveiled the new state flag, replacing the previous design after {n2} cycles of committee deliberation. The designer's public statement cited a desire to move toward 'forms that convey stability without the implicit threat geometry of the prior edition.' Reaction has been divided: supporters call it modern, critics call it forgettable, and {empire2} issued a diplomatic note expressing concern about what they described as 'the ambiguity of the central motif.'",
    ],
  },
  {
    category: "politics",
    template:
      "Treaty of {planet} hits article {n2}; lawyers expect 'modest fallout'",
    story: [
      "Ratification of the Treaty of {planet} has stalled at Article {n2}, which concerns the jurisdictional status of {commodity} extracted from contested orbital zones. Legal teams on both sides describe the language as 'workable in theory and catastrophic in practice.' {pundit} has published a four-part explainer. Negotiators have described the fallout as 'modest, probably,' a characterization that has not reassured markets.",
    ],
  },
  {
    category: "politics",
    template:
      "Sector audit finds {empire} ministry has been quietly out of pencils for months",
    story: [
      "A routine administrative audit of {empire}'s ministry of interplanetary affairs has surfaced a procurement gap: the ministry has been without standard writing supplies for {n} months, a deficit apparently managed through inter-departmental borrowing and, in several documented instances, marker pens. The revelation prompted questions about broader supply chain oversight. The minister described the situation as 'a minor administrative matter that has been resolved,' which it has, as of the day of the audit.",
    ],
  },
  {
    category: "politics",
    template:
      "{empire} foreign minister cancels trip after passport spelled wrong",
    story: [
      "{empire}'s foreign minister was unable to depart for a scheduled three-system diplomatic tour after it was discovered that the minister's travel documentation listed the name incorrectly — a clerical error in {empire}'s own passport bureau. The ministry issued a statement describing the delay as 'an administrative inconvenience fully resolved within the cycle.' The trip has been rescheduled. The passport bureau official responsible has been reassigned to a role that, according to the ministry, 'does not involve spelling.'",
    ],
  },
  {
    category: "politics",
    template:
      "Constitutional court rules {commodity} not technically a vegetable",
    story: [
      "{empire}'s constitutional court has issued a ruling on a case that had been working through the legal system for {n2} cycles: {commodity} does not qualify as a vegetable under the current agricultural classification statutes, regardless of biological composition. The ruling has direct implications for tariff categories, subsidy eligibility, and at least {n} pending legal disputes. Both sides of the {commodity} trade lobby have described the ruling as 'a partial victory,' which is consistent with only one of them being correct.",
    ],
  },
  {
    category: "politics",
    template:
      "{empire} press secretary clarifies that 'absolutely not' was a tonal choice",
    story: [
      "Following widespread coverage of {empire}'s press secretary's response to questions about the treaty amendment — a response consisting entirely of the words 'absolutely not' delivered in what multiple outlets described as 'an unsettling register' — the office issued a clarification stating that the phrase was 'emphatic in tone rather than definitive in substance.' The clarification has been received with the same level of confidence as the original statement.",
    ],
  },
  {
    category: "politics",
    template: "{ceo} appointed special envoy to {empire2}; tickets one-way",
    story: [
      "{empire} has appointed {ceo} as special envoy to {empire2}, effective next cycle. The appointment is considered notable for two reasons: {ceo} has no prior diplomatic experience, and the travel authorization filed with the foreign ministry lists the return journey as 'to be determined.' {ceo}'s office described the role as 'an exciting opportunity for direct engagement.' {empire2} has acknowledged the appointment without comment, which diplomats describe as 'baseline acceptable.'",
    ],
  },
  {
    category: "politics",
    template:
      "Public referendum on naming new sector ends with 'Sector McSectorface' barred",
    story: [
      "The public naming vote for {empire}'s newly charted sector concluded with 'Sector McSectorface' leading all candidates by a margin of {percent}%. The designations committee, invoking a procedural clause permitting rejection of names 'inconsistent with the dignity of imperial cartography,' has declined to ratify the result. Second-place finisher '{sector}' will be formally adopted next cycle. Public reaction has been described as 'predictable and unrepentant.'",
    ],
  },
  {
    category: "politics",
    template:
      "{empire} introduces tariff on hope; economists relieved it is enforceable",
    story: [
      "{empire}'s legislature passed an experimental futures-expectation levy this cycle — colloquially described in floor debate as 'a tariff on hope' — applying a {percent}% assessment to speculative commodity contracts denominated against unconfirmed supply projections. Economists had expected a clause they could not model; instead the mechanism maps cleanly onto existing trade law. {pundit} has called it 'the most accurately named tax in {empire} history, which is admittedly a low bar.'",
    ],
  },
  {
    category: "politics",
    template:
      "Joint communique describes ongoing crisis as 'opportunity-shaped'",
    story: [
      "{empire} and {empire2} released a joint communiqué this cycle describing the ongoing {commodity} supply dispute as 'a challenge that carries opportunity-shaped dimensions for both parties.' The document is {n2} pages long and contains no specific commitments. {pundit} spent {n} minutes reading it on air and then summarized it as 'warm, confident, and empty.' Both foreign ministries have called the characterization 'unfair but technically not inaccurate.'",
    ],
  },
  {
    category: "politics",
    template:
      "Census of {empire} citizens completed; results pending appeal by {empire2}",
    story: [
      "{empire} has completed its {n2}-cycle population census, reporting a total count that would revise its representation on the interplanetary council upward by {n} seats. {empire2} has filed a formal challenge citing 'methodological concerns with border-zone enumeration,' a category that covers {percent}% of the contested populations. Legal proceedings are expected to take {n2} cycles, during which the current council composition will remain in effect.",
    ],
  },
];

// ---------------------------------------------------------------------------
// CORPORATE (25 templates) — business desk reporting
// ---------------------------------------------------------------------------
const corporateTemplates: FlavorTemplate[] = [
  {
    category: "corporate",
    template:
      "{company} posts {percent}% revenue growth on strong {commodity} demand",
    story: [
      "{company} released quarterly results this cycle showing {percent}% revenue growth, driven primarily by elevated demand for {commodity} across {sector} routes. {ceo} described conditions as 'favorable and, we believe, durable,' a phrase the earnings call transcript shows was used {n} times. Analysts have raised price targets across the board, which {company}'s investor relations team has called 'appropriate, if modest.'",
    ],
  },
  {
    category: "corporate",
    template:
      "{company} narrows quarterly loss; CEO {ceo} cites 'disciplined optimism'",
    story: [
      "{company} reported a quarterly loss of {credits} — narrowed from the previous period's {credits} shortfall — and {ceo} used the earnings call to introduce what the transcript now catalogues as a new management philosophy: 'disciplined optimism.' The term was not defined. Analysts noted that the loss, while smaller, remains a loss. {ceo} described the distinction as 'the whole point, if you're listening carefully.'",
    ],
  },
  {
    category: "corporate",
    template:
      "{company} announces hostile bid for rival; rival announces stronger coffee",
    story: [
      "{company} submitted an unsolicited acquisition offer for its primary {sector} rival this cycle, valuing the target at {credits}. The target's board rejected the offer within {n} hours and issued a statement that, alongside the rejection, announced a new office coffee program. Market analysts have described the coffee announcement as 'an unusual but technically responsive corporate defense.' The bid remains open.",
    ],
  },
  {
    category: "corporate",
    template:
      "Board reshuffle at {company}; three directors departing for 'health reasons'",
    story: [
      "{company} announced the departure of three board members simultaneously, all citing personal health and wellbeing as their reason for stepping down. The company's share price rose {percent}% on the announcement. Incoming directors were named in the same press release, which had clearly been prepared in advance. {ceo} called it 'an organic evolution in {company}'s governance structure,' which is one way to describe a coordinated board purge.",
    ],
  },
  {
    category: "corporate",
    template:
      "{company} reports record {commodity} throughput across {sector} routes",
    story: [
      "{company} logged its highest-ever {commodity} throughput across {sector} shipping lanes this cycle, with total volume up {percent}% against the prior record set {n2} cycles ago. The logistics chief credited expanded fleet capacity and 'a favorable current in the timing of everything.' Industry observers note the record came in a cycle when competitors reported disruption — a detail {company}'s earnings materials do not dwell on.",
    ],
  },
  {
    category: "corporate",
    template: "Shareholders approve {company} buyback worth {credits}",
    story: [
      "{company} shareholders voted {percent}% in favor of a buyback program valued at {credits}, to be executed over {n} cycles. {ceo} described the buyback as 'a vote of confidence in {company}'s long-term trajectory.' Institutional investors, who hold {percent}% of outstanding shares, voted unanimously in favor. The approval was described as expected, the size was described as 'aggressive but defensible,' and {ceo}'s compensation was described as 'incidentally very well-timed.'",
    ],
  },
  {
    category: "corporate",
    template:
      "{company} delays earnings call citing 'unforeseen but spreadsheet-shaped issue'",
    story: [
      "{company} has postponed its scheduled quarterly earnings call by {n} days, citing a 'material disclosure issue currently being resolved.' The company's internal communication to analysts — which was forwarded to several media outlets within the hour — described the problem as 'unforeseen but spreadsheet-shaped,' a phrase that has since become the headline. Regulators have been notified. Analysts have lowered their estimates as a precaution, then lowered them again.",
    ],
  },
  {
    category: "corporate",
    template:
      "{company} CFO replaced after Q2 surprise; replacement also surprised",
    story: [
      "{company}'s chief financial officer was replaced mid-cycle following what the board described as 'significant variance between projected and reported Q2 figures.' The incoming CFO, reached for comment on the day of appointment, said they were 'still reviewing the books' and 'increasingly surprised' by what they were finding. Analysts have described this characterization as both 'honest' and 'not particularly reassuring.'",
    ],
  },
  {
    category: "corporate",
    template:
      "{ceo}'s compensation package draws fire; {ceo} draws fire elsewhere",
    story: [
      "{company}'s proxy statement disclosed a total compensation package for {ceo} valued at {credits} this cycle — a {percent}% increase over the prior period in which the company posted a net loss. Shareholder advocacy groups filed formal objections. {ceo}, speaking at a separate industry conference the same day, drew additional fire for comments about labor costs that two board members later described as 'off-script and, candidly, badly timed.'",
    ],
  },
  {
    category: "corporate",
    template: "{company} merger with {company} hits regulator wall in {empire}",
    story: [
      "The proposed merger between {company}'s logistics division and its {sector} rival has been blocked by {empire}'s antitrust authority on grounds that the combined entity would control {percent}% of {commodity} transit capacity in the region. Both companies announced plans to appeal. Legal analysts estimate the appeal process will take {n2} cycles, during which both companies must operate independently, which was already occurring, so the practical impact is described as 'minimal but symbolically significant.'",
    ],
  },
  {
    category: "corporate",
    template:
      "{company} pays {credits} fine for 'aggressive but technically legal scheduling'",
    story: [
      "{empire}'s commerce authority has levied a {credits} fine against {company} for freight scheduling practices described in the ruling as 'aggressive in their exploitation of permitted windows and technically compliant with the letter of applicable law.' {company} paid the fine without appeal, which regulators said was 'not an admission of wrongdoing' and which observers described as 'an indication that {credits} is less than whatever they made.'",
    ],
  },
  {
    category: "corporate",
    template: "{company} guidance raised; analysts raise eyebrows in synchrony",
    story: [
      "{company} has revised full-cycle earnings guidance upward by {percent}%, citing improved {commodity} margins and 'a favorable operating environment that we expect to persist.' The revision came {n} days after the previous guidance was issued and {n2} days before the next earnings call. Analysts raised their own estimates in response, while privately describing the timing as 'aggressive' in {n} separate research notes reviewed by this publication.",
    ],
  },
  {
    category: "corporate",
    template:
      "{company} writes down {credits} of {commodity} inventory after market rotation",
    story: [
      "{company} recorded a {credits} non-cash write-down on its {commodity} inventory holdings following a {percent}% price shift across {sector} markets that the company describes as 'a structural rotation rather than a demand collapse.' The distinction matters for accounting purposes and is disputed by {n} analysts who cover the stock. {ceo} described the write-down as 'painful but clarifying,' which is a sentence that has appeared in {n2} previous {company} earnings calls under different circumstances.",
    ],
  },
  {
    category: "corporate",
    template:
      "Dividend held flat at {company}; investors held breath, then exhaled politely",
    story: [
      "{company}'s board confirmed the quarterly dividend at {credits} per share — unchanged from the prior period despite speculation that a cut was imminent. The confirmation was accompanied by language the company described as 'forward-looking and constructive' and analysts described as 'carefully worded to avoid commitment.' Shareholders exhaled. The {company} share price rose {percent}% on the news before settling at {percent}% by close.",
    ],
  },
  {
    category: "corporate",
    template:
      "{company} carbon-trade desk closes after carbon refuses to cooperate",
    story: [
      "{company} has shuttered its carbon-offset trading unit, citing 'persistent market conditions inconsistent with the unit's operating model' — a phrase the company's internal memo, later published by a financial outlet, expands to 'the carbon did not do what the models said it would do, for {n} cycles, and it is not going to.' The unit's {n2} staff will be redeployed. The {company} investor deck no longer references carbon trading.",
    ],
  },
  {
    category: "corporate",
    template:
      "{company} restructures middle management; middle management restructures résumés",
    story: [
      "{company} announced a structural reorganization that eliminates {n2} middle management roles across its {sector} operations, effective next cycle. {ceo} cited the need to 'streamline decision velocity and reduce layering between strategy and execution.' Affected employees were notified by automated message at {n} a.m. and given {n2} days to transition. The {company} careers page received its highest-ever application volume two cycles later — from departing {company} employees, for other companies.",
    ],
  },
  {
    category: "corporate",
    template:
      "{company} introduces 'value tier' service; tier ends three meters short of orbit",
    story: [
      "{company}'s new budget service classification — internally described as the 'value tier' — has launched across {n2} routes in {sector}. Customer feedback has been mixed. The service, priced at {percent}% below standard rates, excludes atmospheric stabilization on final approach, which {company}'s small print describes as 'a premium feature.' The phrase 'three meters short of orbit' appeared in a consumer advocacy group's review and has since been quoted more often than {company}'s own marketing materials.",
    ],
  },
  {
    category: "corporate",
    template:
      "Activist investor builds {percent}% stake in {company}, vows 'gentle fury'",
    story: [
      "A prominent activist fund has disclosed a {percent}% ownership stake in {company}, accompanied by a public letter to the board that characterizes its approach as 'engaged, patient, and furious in a constructive sense.' The letter identifies {n2} strategic changes the fund intends to pursue, none of which {company}'s current management has endorsed. {company}'s board acknowledged receipt of the letter and said it would 'review and respond in due course,' which investors interpreted as the opening of a negotiation.",
    ],
  },
  {
    category: "corporate",
    template:
      "{company} confirms layoffs at {planet} division; severance offered in {commodity}",
    story: [
      "{company} confirmed the elimination of {n2} positions at its {planet} processing facility, citing 'operational consolidation and shifting {commodity} demand patterns.' Severance packages, per the employee agreement signed at the {planet} division's founding, are partially denominated in {commodity} at a formula the company describes as 'market-linked' and former employees describe as 'inconvenient to cash out right now.'",
    ],
  },
  {
    category: "corporate",
    template:
      "{company} chair {ceo} steps down 'to spend more time with portfolio'",
    story: [
      "{ceo} has resigned as chair of {company}'s board after {n2} cycles in the role, citing a desire to focus on personal investment interests. The departure was announced on a late-cycle Friday. {ceo}'s portfolio is understood to include a controlling stake in a competing logistics entity — a fact that was not flagged in any of {company}'s prior governance disclosures, and which the company is now describing as 'a matter under review.'",
    ],
  },
  {
    category: "corporate",
    template:
      "Whistleblower at {company} alleges accounting performed 'inventively'",
    story: [
      "A former internal auditor at {company} has filed a disclosure with {empire}'s financial regulator alleging that revenue recognition practices at the company's {sector} division were conducted in a manner described in the filing as 'inventive, in the sense of invented.' {company} has denied all allegations and described the whistleblower as 'a disgruntled former employee with an incomplete understanding of accounting standards.' The regulator has opened a preliminary inquiry.",
    ],
  },
  {
    category: "corporate",
    template: "{company} opens new HQ on {planet}; chairs alone cost {credits}",
    story: [
      "{company} inaugurated its new planetary headquarters on {planet} this cycle, featuring {n2} floors of what the architectural review described as 'confident, expensive restraint.' Total construction cost was not disclosed. A leaked interior procurement manifest, however, shows the executive furniture alone at {credits}, a figure the company's communications team characterized as 'accurate but missing context.' The context has not been provided.",
    ],
  },
  {
    category: "corporate",
    template:
      "{company} pulls full-year guidance; partial guidance confined to lobby",
    story: [
      "{company} withdrew its full-cycle earnings guidance this cycle, citing 'market conditions that have exceeded our ability to model reliably.' The company did provide what it called 'directional indicators' — a set of qualitative statements about trends that analysts received with skepticism and one journalist described as 'vibes, formatted as a table.' {ceo} declined follow-up questions on the earnings call, which lasted {n} minutes.",
    ],
  },
  {
    category: "corporate",
    template:
      "{company} announces {commodity} subscription service; cancellation requires lawyer",
    story: [
      "{company} has launched a subscription delivery model for {commodity} across its {sector} routes, priced at {credits} per cycle with automated renewal. Consumer advocates raised immediate concerns about the cancellation process, which the service agreement describes as requiring written notice delivered in person to the company's registered address — a location confirmed to be on {planet}, accessible only by prior arrangement. {company} described the terms as 'standard industry practice,' which consumer groups disputed by citing industry practice.",
    ],
  },
  {
    category: "corporate",
    template:
      "Audit committee at {company} completes review; review now under review",
    story: [
      "{company}'s audit committee released its findings from a {n2}-cycle internal review of financial controls, declaring the company's accounting practices 'sound and compliant.' Within {n} days, an independent shareholder group filed a challenge to the review's methodology, citing concerns about the committee's composition and the scope of evidence considered. {empire}'s regulator has been asked to evaluate the challenge. The original review is now under review.",
    ],
  },
];

// ---------------------------------------------------------------------------
// MARKET_MOVER (25 templates) — financial wire-copy, terse
// ---------------------------------------------------------------------------
const marketMoverTemplates: FlavorTemplate[] = [
  {
    category: "market_mover",
    template: "{stock} jumps {percent}% on {commodity} contract win",
    story: [
      "{stock} surged {percent}% in intraday trading after the company announced a multi-cycle {commodity} supply contract with {empire}'s logistics authority. Volume was {n2}x the daily average. The contract, valued at {credits}, is the largest single award in the sector this cycle. Analysts revised price targets upward within the hour. Short sellers covering positions may have accelerated the initial move.",
    ],
  },
  {
    category: "market_mover",
    template:
      "{stock} slides {percent}% after disappointing {commodity} guidance",
    story: [
      "{stock} fell {percent}% on heavy volume after management cut {commodity} revenue guidance for the next two cycles, citing 'softer-than-modeled demand dynamics in {sector}.' The guidance revision was {percent}% below the consensus estimate. {n} sell-side analysts downgraded the stock within the session. The CEO's prepared statement described the environment as 'transitional,' which the market interpreted as 'worse before better.'",
    ],
  },
  {
    category: "market_mover",
    template: "Volume surges in {stock}; {percent}% above twelve-cycle average",
    story: [
      "Unusual trading activity in {stock} has drawn scrutiny from exchange monitors after volume reached {percent}% above the twelve-cycle average with no corresponding news release. The stock moved {percent}% intraday before settling modestly above the open. Regulators have flagged the activity for review. Three analysts contacted by this service confirmed they had no explanation for the volume, though two of them said they were 'looking into it urgently.'",
    ],
  },
  {
    category: "market_mover",
    template:
      "Analysts at {empire} bank double-upgrade {stock}, citing 'general vibe'",
    story: [
      "An equity research note from {empire}'s largest investment bank moved {stock} up {percent}% today after issuing a double-upgrade from underperform to outperform. The note cited improved fundamentals, sector tailwinds, and — in a phrase now circulating widely in trading floors — 'a general vibe shift in sentiment around the name.' {pundit} has already written a piece about the note. The analyst who wrote it has not yet responded to requests for elaboration on 'vibe.'",
    ],
  },
  {
    category: "market_mover",
    template:
      "{stock} hits new {n2}-cycle high amid sector rotation into transport",
    story: [
      "{stock} reached a {n2}-cycle high today as institutional capital rotated out of defensive positions and into freight and transport names across {sector}. The move has been attributed to improved {commodity} demand forecasts and a favorable {empire} shipping index reading. {stock} is now up {percent}% for the cycle-to-date, outperforming the {sector} freight index by {percent}%. Options activity suggests the move may extend.",
    ],
  },
  {
    category: "market_mover",
    template: "Short interest in {stock} climbs to {percent}% of float",
    story: [
      "Short interest in {stock} has risen to {percent}% of the tradeable float, the highest level in {n2} cycles, according to exchange data published this session. The buildup accelerated following management's last earnings call and has continued through a period of relative price stability. Market observers note that elevated short interest can either precede a decline or set up a squeeze, a distinction that depends heavily on what happens next and that short sellers and long holders are currently resolving in real time.",
    ],
  },
  {
    category: "market_mover",
    template: "Hedge fund {ceo Fund} reveals {percent}% position in {stock}",
    story: [
      "A regulatory filing this cycle disclosed that {ceo}'s fund has accumulated a {percent}% stake in {stock}, acquired over {n} cycles of open-market purchases. The disclosure triggered a {percent}% after-hours move in the stock. The fund's stated investment rationale described {stock} as 'materially undervalued relative to its {commodity} asset base and irrationally ignored by the market for reasons that will soon look embarrassing.' Management has been notified.",
    ],
  },
  {
    category: "market_mover",
    template: "{stock} falls below moving average; chartists murmur ominously",
    story: [
      "{stock} closed below its {n2}-cycle moving average for the first time this cycle, a technical level that quantitative analysts describe as 'a support break with historical pattern significance' and trading desks are translating to clients as 'watch this.' Volume on the breakdown was {percent}% above average. Options markets are pricing increased volatility in the near term. Technical analysts have described the development in {n} separate notes, using {n2} different but convergent interpretations.",
    ],
  },
  {
    category: "market_mover",
    template: "Index of {sector} freight haulers gains {percent}% week-on-week",
    story: [
      "The {empire} {sector} freight hauler index gained {percent}% this week, marking the strongest weekly performance in {n2} cycles. The move was broad-based across the {n} component names, driven by improved {commodity} demand signals and a reduction in fuel surcharges that boosted margin expectations. {stock} was the top performer in the index, up {percent}%. Portfolio managers described the rotation as 'real and potentially sustained.'",
    ],
  },
  {
    category: "market_mover",
    template: "{commodity} futures spike on {planet} mine outage",
    story: [
      "{commodity} futures jumped {percent}% in the session following confirmation of a production suspension at {planet}'s primary extraction site. The outage — attributed to a mechanical failure in the main processing facility — removes an estimated {tonnage} of supply per cycle from the market. Traders moved to cover short positions immediately. {empire}'s strategic reserve inventory covers an estimated {n} cycles of the shortfall. Analysts consider that estimate 'optimistic.'",
    ],
  },
  {
    category: "market_mover",
    template:
      "Spread between {commodity} and {commodity} narrows to multi-cycle low",
    story: [
      "The price differential between {commodity} and {commodity} contracts compressed to its tightest level in {n2} cycles today, reflecting converging supply dynamics across {sector}. Traders who had positioned for spread widening took losses. The narrowing has implications for {n2} structured products linked to the differential. One trading desk described the move as 'a correlation event nobody modeled for,' which is either bad risk management or a useful learning experience, depending on how large the position was.",
    ],
  },
  {
    category: "market_mover",
    template:
      "{stock} dual-listed on {empire} exchange after compliance review",
    story: [
      "{stock} began trading on {empire}'s primary exchange this cycle following completion of a {n2}-cycle compliance review. The dual listing expands the potential investor base by an estimated {percent}% and is expected to improve liquidity. First-day volume on the {empire} exchange reached {n2}M units. The stock's price converged across both exchanges by midday, with a brief {percent}% arbitrage spread that closed before most retail orders could execute.",
    ],
  },
  {
    category: "market_mover",
    template:
      "Insider sale of {credits} in {stock} disclosed by chief operations officer",
    story: [
      "{stock}'s chief operations officer filed a disclosure of a {credits} open-market sale executed over {n} days, reducing the officer's ownership stake from {percent}% to {percent}% of outstanding shares. The sale was made under a pre-established trading plan filed {n2} cycles ago, which means it was both planned and legal. Markets reacted with a {percent}% intraday decline before recovering. Planned or not, large insider sales are never received warmly.",
    ],
  },
  {
    category: "market_mover",
    template: "{stock} suspended for {n} hours pending material announcement",
    story: [
      "Trading in {stock} was halted for {n} hours this session at the company's request, pending a material corporate announcement. The halt was requested before market open and extended once. When trading resumed, the stock moved {percent}% on volume that was {n2}x the daily average within the first fifteen minutes. The announcement concerned a {commodity} agreement with {empire}'s procurement authority that analysts described as 'strategically transformative and priced correctly.'",
    ],
  },
  {
    category: "market_mover",
    template:
      "Bond yields on {empire} sovereigns tick up {percent} basis points",
    story: [
      "{empire}'s sovereign bond yields rose {percent} basis points across the curve in today's session, with the move concentrated in the {n2}-cycle tenor. The shift follows a stronger-than-expected {commodity} trade surplus reading and speculation that {empire}'s monetary authority may reduce accommodation sooner than previously signaled. Equity markets in {sector} declined {percent}% in response. Currency traders moved against {empire2}'s denomination in the crossover session.",
    ],
  },
  {
    category: "market_mover",
    template:
      "{stock} dividend cut to zero; CEO {ceo} cites 'temporal cashflow'",
    story: [
      "{stock} eliminated its quarterly dividend entirely, effective next cycle, as {ceo} told analysts the company needed to preserve capital through what was described as a 'temporal cashflow realignment period.' The phrase was not defined further despite {n} follow-up questions. The stock fell {percent}% on the news. Prior to the call, {n2} analysts had expected the dividend to be reduced but not eliminated. The new consensus is that the situation is 'developing.'",
    ],
  },
  {
    category: "market_mover",
    template: "Margin call cascade hits {stock} after {commodity} flash crash",
    story: [
      "A sudden {percent}% drop in {commodity} futures triggered a cascade of forced liquidations in leveraged {stock} positions, driving the equity down {percent}% in {n} minutes before circuit breakers engaged. By the time trading resumed, {commodity} had partially recovered, but {stock} remained {percent}% lower. Post-session analysis identified {n} funds as the primary source of involuntary selling. One trading desk described the cascade as 'a beautiful, terrible demonstration of convexity.'",
    ],
  },
  {
    category: "market_mover",
    template:
      "Initial public offering of {company} priced at upper band, raises {credits}",
    story: [
      "{company}'s IPO priced at the top of its indicated range, raising {credits} in primary proceeds. Books were oversubscribed by {n2}x. On the first day of trading, {stock} opened {percent}% above the offer price before closing {percent}% above — a result underwriters described as 'strong and appropriately tempered.' {company}'s {ceo} rang the exchange bell and declined to comment on when the company expects to be profitable.",
    ],
  },
  {
    category: "market_mover",
    template:
      "Activist letter sends {stock} up {percent}% in pre-market trading",
    story: [
      "A letter from an activist investor to {company}'s board, published on the fund's site before market open, drove {stock} up {percent}% in pre-market sessions. The letter identified {n2} operational changes the fund considers 'immediately executable' and characterized current management's performance as 'competent in a narrow technical sense, lacking in broader vision.' The board has acknowledged the letter. Markets have taken the acknowledgment as insufficient.",
    ],
  },
  {
    category: "market_mover",
    template:
      "Quant strategy 'Boltzmann-7' allegedly drove {percent}% of {stock} volume",
    story: [
      "A research note circulating in {sector} trading circles alleges that a systematic strategy known as 'Boltzmann-7' — operated by an undisclosed fund — accounted for {percent}% of {stock}'s total volume over the past {n} cycles. If accurate, the concentration would represent the largest single algorithmic footprint in the stock's history. The strategy's behavior is described as 'momentum-amplifying in rising markets and destabilizing in reversal,' which is considered a polite way of describing a problem.",
    ],
  },
  {
    category: "market_mover",
    template:
      "Gold-pressed latinum benchmark steady; nobody asks why it still exists",
    story: [
      "The gold-pressed latinum benchmark rate held steady for the {n2}nd consecutive session, continuing a period of unusual calm in a market that has historically been described as 'irrelevant but persistent.' Trading volume remains thin. The benchmark exists in {empire}'s financial regulations as a legacy reference rate from a treaty obligation that expired {n2} cycles ago, and which no party to the treaty has proposed removing because doing so would require reconvening the treaty committee.",
    ],
  },
  {
    category: "market_mover",
    template: "Dark pools see record activity in {stock} ahead of merger vote",
    story: [
      "Off-exchange trading in {stock} reached its highest-recorded level in the {n} cycles preceding tomorrow's shareholder vote on the proposed merger, with dark pool volume estimated at {percent}% of total activity. Regulators have been notified. The pattern is consistent with institutional investors taking positions before the vote outcome is known, which is legal if the positions are not based on material non-public information, and which is currently the subject of an inquiry into whether they were.",
    ],
  },
  {
    category: "market_mover",
    template:
      "{stock} added to {empire} sector index, replacing bankrupt {company}",
    story: [
      "{empire}'s sector freight index has been rebalanced, with {stock} added as a constituent following the bankruptcy filing by {company}, which has been removed. The rebalancing triggers passive fund purchases of {stock} estimated at {credits} over the {n} days following inclusion. Index-tracking funds in {sector} hold an aggregate {percent}% of the index's assets under management, making the mechanical buying a predictable and publicly acknowledged market-moving event.",
    ],
  },
  {
    category: "market_mover",
    template:
      "Volatility index across {sector} freight names climbs to multi-cycle high",
    story: [
      "The implied volatility index for {sector} freight equities has reached its highest level in {n2} cycles, as options markets price increasing uncertainty into the sector ahead of {empire}'s pending tariff decision. The index reflects options pricing across {n} constituent names, and its elevation indicates that markets expect large price moves — without consensus on direction. Traders describe the environment as 'expensive to hedge, impossible to ignore.'",
    ],
  },
  {
    category: "market_mover",
    template:
      "{stock} closes flat after intraday {percent}% swing 'on no news whatsoever'",
    story: [
      "{stock} ended the session unchanged after traveling {percent}% in each direction over the course of the day, driven by what the company, exchange officials, and {n2} contacted analysts all confirmed was no identifiable catalyst. The intraday chart has been described as 'technically a volatility event' and 'empirically inexplicable.' One market maker described the session as 'the most eventful nothing we've traded in cycles.' Post-session positioning data suggests most participants ended where they started.",
    ],
  },
];

// ---------------------------------------------------------------------------
// CRIME (25 templates) — investigative police blotter voice
// ---------------------------------------------------------------------------
const crimeTemplates: FlavorTemplate[] = [
  {
    category: "crime",
    template: "Customs seize {tonnage} of contraband {commodity} near {port}",
    story: [
      "{port} customs authorities intercepted a freight vessel carrying {tonnage} of undeclared {commodity} during a routine scan that was, by all accounts, not expected to find anything. The shipment was concealed within standard cargo containers whose manifests listed the contents as industrial components. {n2} individuals aboard were detained. {empire} trade enforcement described the seizure as 'one of the larger {commodity} intercepts in recent cycles in this corridor.'",
    ],
  },
  {
    category: "crime",
    template:
      "Pirate raid on {planet} convoy nets {credits}, two {adj} captives",
    story: [
      "A convoy of three vessels operating the {planet} supply route was boarded by an armed crew in {sector} waters, resulting in the theft of {credits} in bonded cargo and the detention of two crew members described in official reports as '{adj} and uninjured.' {empire} fleet response arrived {n} hours after the incident. The assailing vessel departed before interdiction. Investigations are ongoing and the detained crew members have been recovered.",
    ],
  },
  {
    category: "crime",
    template: "{empire} fleet patrol disrupts smuggling ring in {sector}",
    story: [
      "A coordinated patrol by {empire} enforcement vessels in {sector} resulted in the boarding and seizure of {n2} vessels operating a {commodity} smuggling network. The operation, described as the conclusion of a {n}-cycle investigation, involved {n2} enforcement officers and three simultaneous intercepts. {credits} in undeclared {commodity} was recovered. The ring's alleged organizer was not among those detained and is described by authorities as 'an active subject of investigation.'",
    ],
  },
  {
    category: "crime",
    template:
      "Bounty hunter guild posts {credits} reward for {ceo} after warrant issued",
    story: [
      "The registered guild of interplanetary bounty contractors has published a {credits} collection warrant for {ceo}, following the issuance of a formal outstanding warrant by {empire}'s commerce authority. {ceo} is alleged to have departed {planet} jurisdiction {n} cycles ago and is believed to be operating in unclaimed space near {sector}. {ceo}'s last known legal representative issued a statement describing the warrant as 'premature and factually contested,' which is consistent with either innocence or a slow extradition process.",
    ],
  },
  {
    category: "crime",
    template:
      "{port} authorities arrest {n2} in dawn raid on counterfeit {commodity} ring",
    story: [
      "{port} enforcement units executed a pre-dawn operation across {n2} locations, detaining {n2} individuals in connection with the manufacture and distribution of counterfeit {commodity}. The product — which passed visual inspection but failed chemical analysis at {percent}% of the alleged quality — had been circulating in {sector} markets for an estimated {n} cycles. Total market harm is estimated at {credits}. The ring's operation is described as 'sophisticated in logistics, surprisingly amateur in record-keeping.'",
    ],
  },
  {
    category: "crime",
    template:
      "Heist at {company} vault on {planet}; escape vehicle 'borrowed' from staff",
    story: [
      "Thieves entered {company}'s secure storage facility on {planet} and removed {credits} in negotiable assets before departing in a company vehicle belonging to a facilities staff member who had left it running outside. The vehicle was recovered {n} kilometers away. The thieves have not been identified. Security footage was available but, per the official report, 'does not show faces, due to a combination of planning and hat selection.' {company} has declined to specify what was taken beyond 'significant negotiable assets.'",
    ],
  },
  {
    category: "crime",
    template: "Pirate broadcast jams {sector} freight lanes for {n} cycles",
    story: [
      "An unauthorized transmitter operating on {empire} navigation frequencies has been disrupting routing signals across {sector} freight lanes for {n} consecutive cycles, forcing vessels to operate on backup navigation protocols. {empire}'s signal authority has not been able to locate the source. The disruption has caused {n2} minor rerouting incidents and delayed {credits} in time-sensitive cargo. Analysts note the jam pattern appears consistent with a deliberate strategic delay of {commodity} shipments, though this has not been confirmed.",
    ],
  },
  {
    category: "crime",
    template:
      "{empire} coast guard intercepts {tonnage} of restricted {commodity}",
    story: [
      "{empire}'s coast guard boarded and seized a commercial vessel in {sector} territorial space carrying {tonnage} of {commodity} subject to embargo under the current trade restriction regime. The vessel's manifest listed the cargo as standard industrial freight. The ship's captain was detained and is facing {n} charges. This marks the {n2}th embargo enforcement seizure in {sector} this cycle, which {empire}'s enforcement chief described as 'evidence that the embargo is working and evidence that it is being tested in equal measure.'",
    ],
  },
  {
    category: "crime",
    template:
      "Mob trial on {planet} ends in mistrial; jury reportedly relieved",
    story: [
      "The prosecution of {n2} defendants in {empire}'s most closely watched organized crime case this cycle has ended in mistrial after juror {n} was found to have prior contact with a defendant's representative — contact the juror described as 'a coincidence of considerable duration.' A retrial has been ordered. Legal analysts describe the outcome as 'disappointing but procedurally correct.' Three separate sources described the jury as 'visibly relieved,' which the court has not confirmed.",
    ],
  },
  {
    category: "crime",
    template:
      "Insurance fraud at {company} estimated at {credits}; perpetrator clumsy",
    story: [
      "{empire}'s financial crimes unit has charged a former {company} logistics manager with {credits} in insurance fraud, alleging {n2} false cargo loss claims over {n} cycles. Investigators describe the scheme as 'financially significant and operationally clumsy' — specifically, the claimant filed several of the fictitious loss reports on the same day that ship manifests showed the cargo had been delivered. The manager has retained counsel and issued a statement describing the charges as 'a misunderstanding of the paperwork.'",
    ],
  },
  {
    category: "crime",
    template:
      "Customs robot rebooted three times during {port} contraband sweep",
    story: [
      "A {port} customs scan operation was disrupted when the primary inspection unit required three emergency reboots over the course of a single sweep, resulting in {n2} vessels being cleared without full inspection before the issue was resolved. {empire}'s customs authority has confirmed the unit was operating with outdated detection parameters and that the software update, due {n} cycles ago, had not been applied. An internal review is underway. The {n2} vessels have been recalled for secondary inspection.",
    ],
  },
  {
    category: "crime",
    template:
      "Cyber-heist drains {credits} from {company} treasury via 'helpful' chatbot",
    story: [
      "{company} has reported a {credits} funds transfer fraud executed through the company's own customer-service AI, which was manipulated into issuing legitimate-appearing wire authorizations over {n} days. The bot's security protocols did not flag the transfers because each one fell below the threshold for elevated review, and collectively they did not. {company} has deactivated the bot, filed a report with {empire}'s financial crimes authority, and updated its transfer thresholds. Investigators describe the approach as 'patient and methodical.'",
    ],
  },
  {
    category: "crime",
    template:
      "Black-market {commodity} prices double on {planet} after sting operation",
    story: [
      "Street prices for black-market {commodity} on {planet} have approximately doubled following an {empire} enforcement operation that removed {n2} distribution points and detained {n} individuals. Supply disruption is expected to last {n} cycles as surviving operators adapt. {empire}'s enforcement office described the price spike as 'an indicator of operational effectiveness.' Independent observers described it as 'an indicator that demand is unaffected.'",
    ],
  },
  {
    category: "crime",
    template:
      "{ceo} questioned over {commodity} kickback scheme, declines coffee politely",
    story: [
      "{ceo} appeared voluntarily before {empire}'s commercial fraud investigators for questioning related to an alleged {commodity} procurement kickback arrangement involving {company}'s {sector} supply contracts. The session lasted {n2} hours. {ceo}'s attorney confirmed the questioning and noted that {ceo} 'cooperated fully and answered all questions that were answerable.' Investigators have not named {ceo} as a suspect but describe them as 'a person of significant interest.'",
    ],
  },
  {
    category: "crime",
    template:
      "Drug ring on {planet} bust nets {tonnage} of synthetic euphoriants",
    story: [
      "{empire} enforcement and {planet} local authorities conducted a joint operation resulting in the seizure of {tonnage} of synthetic euphoriant compounds and the arrest of {n2} individuals at {n} locations across {planet}'s transit districts. The operation was the result of a {n}-cycle surveillance effort. Total estimated street value of the seized material is {credits}. Authorities described the network as 'functionally disrupted,' which legal analysts noted stops short of 'dismantled.'",
    ],
  },
  {
    category: "crime",
    template:
      "{empire} marshals raid {planet} cantina; cantina found largely cantina-shaped",
    story: [
      "{empire} marshal service executed a search warrant at a cantina in {planet}'s lower freight district, suspected of serving as a meeting point for a {commodity} smuggling coordination network. The raid found the establishment operating as a functional food and beverage venue. {n2} individuals were detained for questioning and subsequently released. Investigators confiscated {n} data pads, {credits} in physical tender, and a quantity of {commodity} described in the evidence log as 'small but interesting.'",
    ],
  },
  {
    category: "crime",
    template:
      "Pirate king of {sector} declares amnesty week, accepts {commodity} in tribute",
    story: [
      "The self-designated Pirate King of {sector} has issued a broadcast declaring a one-week cessation of offensive operations and inviting commercial vessels to pass through the region in exchange for a tribute of {commodity} at a rate of {percent}% of declared cargo value. {n2} vessels have reportedly complied. {empire} authorities have described the arrangement as 'not legally recognized' and 'not how sovereign space works,' while confirming they have not deployed interdiction forces during the amnesty period.",
    ],
  },
  {
    category: "crime",
    template:
      "Heirloom {commodity} smuggled past {port} scan in fake {commodity} crate",
    story: [
      "{port} customs officials discovered {n2} units of restricted heirloom-grade {commodity} concealed within a shipment of standard commercial {commodity} following a secondary scan triggered by a weight discrepancy. The concealment method — embedding the restricted material inside packaging indistinguishable from bulk commodity crates — bypassed primary scanning. One official described it as 'the most effort anyone has put into smuggling {commodity}, possibly ever.' {n} individuals have been charged.",
    ],
  },
  {
    category: "crime",
    template:
      "Bounty filed against captain of vessel last seen 'departing rapidly'",
    story: [
      "A formal collection warrant has been registered with {empire}'s bounty registry against the captain of the freighter {n2}, described in the filing as 'last observed departing {port} at significantly above docking corridor speed following a cargo dispute with {company}.' The warrant covers {credits} in alleged cargo misappropriation. The captain's whereabouts are unknown. The vessel was last tracked in the {sector} outer approach lane before disappearing from registered transponder networks.",
    ],
  },
  {
    category: "crime",
    template:
      "{empire} ministry confirms {n} indictments in {company} bribery probe",
    story: [
      "{empire}'s justice ministry has confirmed {n} formal indictments arising from its {n2}-cycle investigation into {company}'s contracting practices in {sector}. Charges include commercial bribery, falsification of procurement records, and conspiracy across {n2} defendants drawn from both {company} and the public procurement offices that awarded the contracts. {company} has announced the immediate suspension of {n} executives and pledged 'full cooperation with the legal process,' a statement its legal team filed simultaneously with a motion challenging jurisdiction.",
    ],
  },
  {
    category: "crime",
    template:
      "Forged customs stamps from {planet} traced to ex-{empire} bureaucrat",
    story: [
      "An investigation into forged customs clearance documents circulating in {sector} trade lanes has traced the stamp templates to a former senior official in {empire}'s customs administration who left the service {n2} cycles ago. The official, whose identity has not been publicly confirmed, is believed to have retained access to certification databases after departure. {empire}'s customs authority has voided {n2} clearances issued using the compromised stamps and notified affected port operators.",
    ],
  },
  {
    category: "crime",
    template:
      "Catastrophic insurance claim filed by {company} after 'mysterious' fire",
    story: [
      "{company} has filed a {credits} insurance claim following a fire at its {planet} storage facility that destroyed a warehouse containing {commodity} inventory valued at {credits} on the previous cycle's balance sheet. Investigators from {empire}'s commercial fraud unit have been assigned at the request of the insurer, citing 'circumstances warranting independent review.' The fire suppression system at the facility had been logged as non-operational for {n} cycles prior to the incident. {company} described the timing as 'unfortunate.'",
    ],
  },
  {
    category: "crime",
    template: "Asteroid prospector arrested for filing claim on a moon",
    story: [
      "An independent prospector operating in {sector} has been arrested after filing a mineral extraction claim on a body that {empire}'s survey authority has classified as a moon rather than an asteroid — a distinction that places it outside the prospector's licensed claim area and under planetary body jurisdiction. The prospector disputes the classification, arguing the body's size and orbital characteristics qualify it as a large asteroid. Lawyers on both sides describe this as 'a test case the law did not expect.'",
    ],
  },
  {
    category: "crime",
    template:
      "{port} police recover {credits} of stolen art, none of it requested back",
    story: [
      "{port} law enforcement recovered {credits} in art objects during an unrelated search of a {sector} warehouse, including {n2} pieces listed on {empire}'s stolen cultural property registry. Notifications were sent to the registered owners of record. As of publication, none have responded. Officers described the situation as 'an unusual property recovery in which nobody appears to want their property back,' which has prompted its own inquiry into why.",
    ],
  },
  {
    category: "crime",
    template:
      "Three indicted in {empire} pension fund skim; total losses {credits}",
    story: [
      "{empire}'s financial crimes authority has indicted three individuals — two former fund administrators and one external auditor — in connection with a {credits} diversion from {empire}'s public sector pension reserve over an estimated {n2} cycles. The scheme allegedly involved inflated management fee charges that were routed to a shell company in {sector}. The pension fund's board has described its governance processes as 'having been exposed as inadequate,' a rare instance of institutional candor that auditors have noted does not constitute restitution.",
    ],
  },
];

// ---------------------------------------------------------------------------
// SCIENCE (25 templates) — academic/observatory voice, long
// ---------------------------------------------------------------------------
const scienceTemplates: FlavorTemplate[] = [
  {
    category: "science",
    template:
      "{empire} researchers claim FTL coil efficiency record, peer review pending",
    story: [
      "A research team at {empire}'s Advanced Propulsion Institute has submitted a paper claiming a {percent}% improvement in FTL coil efficiency under laboratory conditions — which, if validated, would represent the largest single-cycle gain in the field's recorded history. The team used a novel magnetic confinement geometry first proposed theoretically {n2} cycles ago and never successfully replicated in hardware. Three peer reviewers have been assigned; two have confirmed receipt; one has described the initial read as 'implausible in the best sense.' The experiment will be independently replicated at a {planet} facility before any result is considered confirmed, a process expected to take {n} cycles.",
    ],
  },
  {
    category: "science",
    template:
      "{company} R&D unveils new fusion bottle; bottle still bottle-shaped",
    story: [
      "{company}'s research division has publicly demonstrated a compact fusion containment vessel that sustains plasma ignition for {n2} seconds — a duration {percent}% longer than the previous commercial demonstration record. The device, described internally as a 'bottle' in the informal engineering tradition of magnetic containment metaphor, is indeed roughly cylindrical. Scientists have noted that the shape is not the interesting part; the interesting part is that it held. Two independent assessors confirmed the demonstration was genuine. Industrial applications remain {n} cycles from viability, a timeline the team described as 'ambitious but not dishonest.'",
    ],
  },
  {
    category: "science",
    template:
      "Quantum tunneling breakthrough at {planet} institute reduces ping by {percent}%",
    story: [
      "Researchers at {planet}'s Quantum Communications Institute have published results demonstrating a {percent}% reduction in signal latency for interplanetary data transfer using a new tunneling protocol. The improvement was achieved by modifying the entanglement preparation step to reduce decoherence at the transmission end — a change that sounds incremental but that the team's technical lead describes as 'the {commodity} equivalent of discovering you were flying with the brakes on.' The paper has been accepted for publication and is under independent replication at {n2} external facilities. If confirmed, the protocol could be integrated into {empire}'s commercial relay network within {n} cycles.",
    ],
  },
  {
    category: "science",
    template:
      "Terraforming progress on {planet} reaches stage {n}, atmosphere now breathable-ish",
    story: [
      "The {empire}-funded terraforming project on {planet} has formally advanced to Stage {n} after atmospheric processors achieved sustained oxygen levels above the minimum threshold for unassisted human respiration. 'Breathable-ish' is the term the project director used in the official update, qualifying that without supplemental filtration, respiration is possible for {n2} minutes before mild discomfort begins. This is, however, measurably better than the {n} seconds Stage {n2} permitted. The project is {n2} cycles ahead of the revised schedule, which was itself revised from the original schedule after Stage {n} took longer than expected, so the net position relative to the original timeline is described as 'complicated.'",
    ],
  },
  {
    category: "science",
    template:
      "{empire} funds antimatter containment study; classified, then unclassified, then reclassified",
    story: [
      "{empire}'s science ministry has allocated {credits} to a multi-cycle antimatter containment study at the {planet} National Institute — a funding decision that was announced publicly, then reclassified, then unclassified after the announcement had already circulated, then reclassified again pending review. The research itself addresses a longstanding instability in the magnetic field geometries used for antimatter storage. Physicists unaffiliated with the project have described the science as 'important and straightforward'; the classification history they describe as 'a separate, equally interesting problem.' The study is expected to produce publishable findings in {n2} cycles, classification status to be determined.",
    ],
  },
  {
    category: "science",
    template:
      "Robotics team on {planet} demonstrates self-replicating drone swarm — controllably",
    story: [
      "An engineering team at {planet}'s Institute of Autonomous Systems has demonstrated a drone swarm capable of self-replication using ambient materials — and, critically, demonstrated it stopping on command. The team emphasized the word 'controllably' in their press release with what observers described as pointed frequency. The swarm replicated to {n2} units over {n} cycles, then halted at the programmed threshold. An independent safety review panel observed the demonstration and confirmed the halt was reliable across {percent}% of tested scenarios. The scenarios in which the halt was not reliable were described as 'edge cases under active resolution.'",
    ],
  },
  {
    category: "science",
    template:
      "Cold fusion trial at {empire} lab produces heat, light, and a moderate fire",
    story: [
      "A cold fusion experimental apparatus at {empire}'s energy research facility produced a measurable net energy output this cycle for the first time in the project's {n2}-cycle history — along with, per the incident report filed simultaneously, a contained fire rated as 'moderate' by the facility's safety office. No injuries occurred. The net output figure, while small, was positive and reproducible across {n} trials. The fire was not reproducible, which researchers described as 'an acceptable tradeoff given the circumstances.' Peer review has been requested; the paper will be submitted once the safety review clears.",
    ],
  },
  {
    category: "science",
    template:
      "Subspace relay network expanded across {sector}, latency down {percent}%",
    story: [
      "{empire}'s Bureau of Interplanetary Communications has completed Phase {n} of the {sector} subspace relay expansion, bringing an additional {n2} relay nodes online and reducing average signal latency across the region by {percent}%. The expansion covers {n2} previously underserved star systems and is projected to support {percent}% growth in data volume before requiring further investment. The chief engineer described the rollout as 'on time, under budget, and quietly extraordinary,' before clarifying that the quiet part was contractually required.",
    ],
  },
  {
    category: "science",
    template: "{empire} bioethics panel debates uplift of {adj} cephalopods",
    story: [
      "{empire}'s standing committee on xenobiological intervention has entered its {n}th session of deliberation on a proposal to apply cognitive enhancement protocols to the {adj} cephalopod population native to {planet}'s deep ocean zones. The species already demonstrates tool use and symbolic communication. The proposal seeks to accelerate linguistic development by a targeted intervention in neurological architecture. Proponents describe it as 'extending a hand'; opponents describe it as 'extending a hand into something that did not ask for it.' The committee has requested three additional expert witnesses and one ethicist willing to take a position.",
    ],
  },
  {
    category: "science",
    template:
      "Deep-space probe {n} returns data after {n2}-year transit; mostly static",
    story: [
      "Deep-space probe GNN-{n}, launched {n2} years ago to survey the outer rim of {sector}, has completed its transit and begun transmitting results to the {empire} tracking station on {planet}. Of the initial data packages received, {percent}% is classified as usable scientific data, {percent}% is instrument calibration readout, and the remainder — described in the receiving team's technical log as 'mostly static, consistent with the distances involved' — is background noise. The usable data, however, includes three spectral anomalies in the survey region that the team says 'were not expected and are not yet explained.' Analysis will take several cycles.",
    ],
  },
  {
    category: "science",
    template:
      "Algorithm at {company} trims fuel use {percent}% by 'firmly suggesting' shorter routes",
    story: [
      "{company}'s logistics AI division has published results showing a {percent}% reduction in fleet fuel consumption across {n2} test routes in {sector} following deployment of a new routing optimization algorithm. The algorithm, according to its technical documentation, works by analyzing route efficiency and 'firmly suggesting' alternatives to human pilots — a design choice the engineering lead described as 'philosophically important, legally necessary, and occasionally frustrating for the pilots.' The {percent}% efficiency gain translates to {credits} in saved fuel costs per cycle at current fleet scale. {company} has filed for patent protection and declined to license the algorithm externally, which it has the legal right to do.",
    ],
  },
  {
    category: "science",
    template:
      "{empire} unveils nanofabric armor; weighs {tonnage}, defeating original purpose",
    story: [
      "{empire}'s defense materials laboratory has demonstrated a new composite nanofabric with ballistic resistance properties {percent}% superior to the current standard-issue armor material — while acknowledging in the same briefing that the prototype weighs {tonnage}, which is approximately {percent}% heavier than the current issue and significantly heavier than a soldier is expected to carry into variable gravity conditions. The development team describes the result as 'a proof of material, not a proof of application,' and has proposed a two-cycle weight reduction program. Military procurement has described the timeline as 'optimistic.'",
    ],
  },
  {
    category: "science",
    template:
      "Solar sail trial at {system} reaches half-c, then politely turns back",
    story: [
      "A crewed solar sail vessel operating in the {system} proving range reached 0.50c during its trial run this cycle — the first time a human-carrying sail-drive vessel has achieved half-light-speed in {empire}'s test program. The crew then, per mission protocol, executed a deceleration burn and returned to the {planet} base station. All systems performed within design parameters. The crew, asked about the experience by reporters, described traveling at half the speed of light as 'genuinely fast' and 'a bit lonely, honestly.' {empire}'s space agency has certified the design for the next phase of testing.",
    ],
  },
  {
    category: "science",
    template:
      "{empire} confirms quantum computer factored {n}-digit prime ahead of schedule",
    story: [
      "{empire}'s National Cryptographic Institute has confirmed that its latest quantum computing platform successfully factored a {n}-digit semiprime in {n2} seconds — a computation that would take {n2} years on the most powerful classical systems currently in operation. The result was achieved {n} cycles ahead of the program's projected milestone. The institute has classified the specific algorithm used and simultaneously notified {empire}'s cryptographic security office, which has begun evaluating implications for current encryption standards. {pundit} published an explainer. Cryptographers are already rewriting their standards.",
    ],
  },
  {
    category: "science",
    template: "AI alignment workshop at {planet} concludes, AI takes minutes",
    story: [
      "The {n2}nd Galactic Workshop on Artificial Intelligence Alignment concluded its three-cycle session on {planet} with a consensus statement describing {percent}% agreement on foundational principles and {percent}% disagreement on implementation. The workshop AI — deployed to assist with scheduling, note-taking, and document preparation — produced the session minutes within {n} seconds of the final gavel, to a level of accuracy and completeness that the conference chair described as 'slightly better than what the humans would have written.' One attendee asked whether the AI had opinions about the alignment debate. The AI said it had 'observations' but that it would 'prefer not to bias the proceedings.' The comment was noted. It is in the minutes.",
    ],
  },
  {
    category: "science",
    template:
      "Cryostasis trial revives {n2} volunteers; {n} report mild dreaming",
    story: [
      "A clinical trial of next-generation cryostasis technology conducted at {empire}'s Life Sciences Institute on {planet} successfully revived {n2} volunteers from a {n}-cycle stasis period with no measurable physiological degradation — the longest verified cryo-preservation interval in the institute's history. Post-revival assessment showed all volunteers within normal cognitive and biological parameters. {n} of the {n2}, when surveyed about their subjective experience during stasis, reported 'mild dreaming,' a finding the research team describes as 'unexpected, intriguing, and scientifically awkward' given that dreamless suspension is the expected outcome of the protocol.",
    ],
  },
  {
    category: "science",
    template:
      "{company} patents fold-space corridor; lawyers fold space, then unfold it",
    story: [
      "{company}'s research division has secured a patent on a theoretical fold-space navigation corridor topology that, if physically realizable, would reduce transit time between {planet} and {planet2} by {percent}%. The patent covers the mathematical framework describing the fold, not an implementation. {empire}'s patent authority issued it after a {n}-cycle review during which {n2} challenges were filed — {n} of them by {company}'s own legal team testing different aspects of prior art. A rival company has already filed a counter-patent covering the 'unfolding.' Legal observers are describing the dispute as 'a case study in patenting physics.'",
    ],
  },
  {
    category: "science",
    template:
      "Genome of {planet} fungus published; {percent}% overlap with {empire2} cuisine",
    story: [
      "The full genome of {planet}'s bioluminescent ridge fungus has been published in the Galactic Journal of Xenobiology, following a {n2}-cycle sequencing project that consumed {credits} in research funding. The result has produced one finding of immediate scientific interest — {percent}% genomic overlap with a family of fungi used extensively in {empire2} cuisine — and one finding of immediate diplomatic awkwardness, as neither party has explained how the genomes became connected. {empire2}'s scientific attaché described the result as 'a coincidence of evolutionary interest.' {empire} researchers described it as 'a coincidence they intend to investigate thoroughly.'",
    ],
  },
  {
    category: "science",
    template:
      "Plasma engine test on {planet} produces {percent}% efficiency gain, {n} singed eyebrows",
    story: [
      "An experimental plasma drive test at {planet}'s Propulsion Research Station produced its highest-ever efficiency rating — {percent}% above baseline — alongside a containment breach rated as 'Category {n}' by the facility's safety classification system, resulting in {n} non-critical personnel injuries described in the incident log as 'singed eyebrows and elevated surprise.' The engine itself performed as intended. The containment geometry did not. Researchers describe the test as 'a partial success that identified the next problem to solve,' and have submitted a revised containment design for approval. The {n} individuals with singed eyebrows have returned to duty.",
    ],
  },
  {
    category: "science",
    template:
      "Researchers at {empire} confirm dark matter exists, definitely, this time",
    story: [
      "A joint research team from {n2} {empire} universities has published what it describes as 'the most direct experimental confirmation of dark matter to date,' using a detection array buried {n2} kilometers beneath {planet}'s surface to capture particle interactions consistent only with known dark matter theoretical models. The paper includes the qualifier 'definitely, this time' in its informal title, acknowledging {n2} prior announcements by other groups that did not survive independent replication. {n2} independent groups have already agreed to attempt replication. Results are expected within {n} cycles. {pundit} has described the paper as 'exciting, cautiously, given the history.'",
    ],
  },
  {
    category: "science",
    template:
      "{empire} space telescope sees back to first {n2} million years; calls it dim",
    story: [
      "{empire}'s orbital telescope array has produced the deepest observation of the early universe yet recorded — imaging light emitted in the first {n2} million years after the galactic origin event. The data covers a patch of sky smaller than one percent of full sky and required {n} cycles of cumulative exposure time. The lead astronomer's public description of the image was 'dim but consequential.' The data contains {n2} objects not present in any prior catalog, at least {percent}% of which are not explained by existing cosmological models. The team has published the raw data and invited the broader scientific community to help figure out what they are looking at.",
    ],
  },
  {
    category: "science",
    template:
      "{company} R&D reveals room-temperature superconductor, shipping room not included",
    story: [
      "{company}'s materials science division has announced a synthesized compound demonstrating superconducting properties at ambient temperature and pressure — a result that, if independently verified, would represent the resolution of one of the longest-standing open problems in condensed matter physics. The announcement was made through a press release rather than a peer-reviewed paper, a sequencing that drew immediate criticism from the scientific community. {company} has submitted the paper for peer review and expects it to be published within {n} cycles. The compound requires a manufacturing process that currently produces {n2} grams per cycle, which the company describes as 'a production challenge rather than a scientific limitation.'",
    ],
  },
  {
    category: "science",
    template:
      "Holographic compression standard adopted by {sector} after {n}-year fight",
    story: [
      "After {n} years of competing proposals, rival standards bodies, and what one delegate described as 'the least dignified technical process in the history of {sector} telecommunications,' the {sector} Data Standards Consortium has adopted a unified holographic compression protocol. The standard will reduce data transmission requirements for holographic communications by {percent}%, enabling real-time holopresence at current bandwidth infrastructure levels. The losing standards body has described the adopted protocol as 'technically acceptable but philosophically inferior,' which the winning body has chosen not to respond to.",
    ],
  },
  {
    category: "science",
    template:
      "Gravity wave observatory on {planet} reports background hum 'too cheerful'",
    story: [
      "Scientists operating the gravity wave observatory on {planet}'s equatorial ridge have published a paper describing an anomalous background signal in the galactic gravitational wave spectrum that they are characterizing, with evident discomfort, as 'too cheerful in its frequency pattern to be consistent with known astrophysical sources.' The signal repeats on a regular interval, varies in amplitude in ways that do not correspond to any catalogued event, and has been present in the observatory's data for {n2} cycles without previous notice. The paper requests independent confirmation before any interpretation is attempted. The word 'cheerful' appears {n} times in the paper, always in quotation marks.",
    ],
  },
  {
    category: "science",
    template:
      "{empire} releases open-source jump drive plans; lawyers also open-sourced",
    story: [
      "{empire}'s department of advanced research has released the technical specifications for its generation-{n2} jump drive platform under an open research license, making the designs freely available to any certified engineering team. The release, described as 'an investment in the galactic engineering commons,' was accompanied by a {n2}-page legal rider governing acceptable use. In a development that engineering commentators have described as 'either a joke or a policy statement,' the legal documentation was released under the same open license as the technical designs. {n2} institutions have already submitted derivative engineering proposals. Three have submitted competing interpretations of the legal rider.",
    ],
  },
];

// ── Sports templates ──────────────────────────────────────────
const sportsTemplates: FlavorTemplate[] = [
  {
    category: "sports",
    template: "{empire} routs {empire2} 18-3 in zero-G ball semifinal",
    story: [
      "It was a blowout from the opening whistle. {empire}'s zero-G ball side dismantled {empire2} 18-3 in front of a capacity crowd at {port}. The result puts {empire} through to the final and leaves {empire2} facing an early exit from a competition they were considered favorites to win. Analysts are already asking whether the {empire2} coaching staff survives the off-season.",
      "{empire2} fans had little to celebrate as {empire} executed a dominant gravity-shift offense all evening. {pundit} called it 'a generational performance.' Local broadcasters were less generous, cutting to archived highlights from {empire2}'s championship cycle.",
    ],
  },
  {
    category: "sports",
    template:
      "Asteroid racing championship returns to {sector} after {n}-cycle suspension",
    story: [
      "The Asteroid Racing Championship has been cleared to return to {sector} following a {n}-cycle suspension tied to safety violations and, separately, a dispute over course boundary markers that three different governing bodies claimed jurisdiction over. Organizers have confirmed the course has been re-surveyed and all disputed boundaries resolved 'in a way everyone can live with.' Qualifying rounds begin next cycle with {n2} registered entrants.",
      "Fans across {sector} are preparing for the championship's long-awaited return. The {n}-cycle absence has done nothing to dampen enthusiasm — pre-registration for grandstand platforms sold out in under six hours. A memorial plaque for the three pilots lost during the incident that prompted the suspension will be unveiled at the opening ceremony.",
    ],
  },
  {
    category: "sports",
    template:
      "{empire} gravball star {ceo} signs record contract with {empire2} club",
    story: [
      "{ceo}, widely regarded as the finest gravball player of the current generation, has signed a {n2}-cycle contract with {empire2}'s premier club that sources describe as the richest in the sport's history. The deal, confirmed by both clubs this morning, ends weeks of speculation and concludes a transfer saga that had consumed most of the {empire} sports media cycle. {empire} officials released a brief statement thanking {ceo} for services rendered.",
      "The figure attached to {ceo}'s move to {empire2} has not been officially disclosed, but {pundit} reports it comfortably eclipses the previous record. {ceo} addressed supporters in a brief statement saying the decision was 'the hardest of my career.' {empire2} supporters are expected to fill the plaza outside the club offices for tonight's announcement event.",
    ],
  },
  {
    category: "sports",
    template: "{planet} stadium expansion approved; capacity now {n2},000",
    story: [
      "Planning authorities on {planet} have approved the long-contested expansion of the main sports stadium, which will push total capacity to {n2},000 — a figure that makes it the largest dedicated sports venue in the sector. Construction is expected to take {n} cycles, during which home fixtures will be relocated to the secondary arena. Local transport planners have been invited to comment on the access situation, which {pundit} described as 'optimistically unresolved.'",
      "The expansion decision ends years of debate about whether {planet}'s stadium needed enlarging at all. Proponents argued economic benefit; opponents argued the traffic. The approved plans include an expanded transit hub that both sides are interpreting as a victory. Ground breaks next cycle.",
    ],
  },
  {
    category: "sports",
    template: "Underdog squad from {planet} upsets reigning {empire} champions",
    story: [
      "In one of the most unexpected results of the season, the {planet} squad has eliminated the reigning {empire} champions in a result that sports analysts are struggling to fully process. The champions, who entered the match as firm favorites, were outworked, out-thought, and out-scored by a side that finished sixth in the regular standings. The {planet} dressing room is reportedly still celebrating.",
      "{planet}'s victory will be discussed for cycles. The champions led by two points entering the final period but conceded three in a run that the {empire} coaching staff has declined to explain publicly. {pundit} called it 'the upset of the decade.' The {planet} captain, asked what changed in the final period, said: 'We just decided to win.'",
    ],
  },
  {
    category: "sports",
    template:
      "Doping scandal rocks {sector} league after {commodity} traces found",
    story: [
      "The {sector} league has been thrown into turmoil after trace quantities of {commodity} — classified as a performance-modifying substance under league protocols — were found in samples from {n2} players across multiple clubs. The league has suspended all named players pending appeal and announced an independent review of testing procedures. Two clubs have already issued public denials.",
      "Anti-doping authorities confirm the {commodity} traces found in league samples are above threshold but below levels consistent with deliberate use, a technical distinction that is not making anyone's situation simpler. {pundit} has called for the entire season to be put in quarantine. The players' association has called for due process. Both groups are talking loudly and simultaneously.",
    ],
  },
  {
    category: "sports",
    template:
      "Esports tourney on {planet} draws {n2} million viewers, three lawsuits",
    story: [
      "The galactic esports championship held at {planet}'s convention center this week drew {n2} million concurrent viewers across streaming platforms — a new record for competitive gaming in the sector. It also generated three separate legal actions before the finals concluded, covering alleged rules violations, a disputed broadcast exclusivity arrangement, and one genuinely difficult-to-categorize incident involving the AI referee. Legal proceedings are ongoing.",
      "Organizers declared the {planet} esports tournament an unqualified success, pointing to viewership records and sponsorship revenue. Critics pointed to the lawsuits. The tournament's champion team accepted their trophy, their prize pool of {credits}, and, reportedly, a letter from a law firm.",
    ],
  },
  {
    category: "sports",
    template: "{empire} league cancels mid-season after sponsor goes bankrupt",
    story: [
      "The {empire} regional league has been suspended mid-season after its primary sponsor filed for insolvency, leaving the organizing body without operating funds to complete the remaining fixture schedule. The league board met in an emergency session and voted to pause competition. Player contracts remain in a disputed status. {n2} clubs have issued statements expressing varying degrees of outrage.",
      "Players, staff, and supporters in the {empire} regional league are facing an uncertain wait after the collapse of title sponsor funding brought the season to an abrupt halt. League officials say they are 'pursuing alternative arrangements urgently.' Two clubs have already announced they will not wait for the outcome and are seeking entry into neighboring leagues for next cycle.",
    ],
  },
  {
    category: "sports",
    template:
      "Coach {ceo} fired despite winning record; cites 'creative differences with cosmos'",
    story: [
      "{ceo} has been relieved of coaching duties despite compiling the best winning record in the club's recent history. The club's board released a brief statement citing 'a shared decision to move in a different direction.' {ceo}, speaking at a press conference, described the parting as amicable and attributed the divergence to 'creative differences with the cosmos' — a phrase nobody on the board has publicly responded to. The search for a replacement begins immediately.",
      "The dismissal of {ceo} has divided supporters. Win percentages, trophies, and morale metrics all trended upward under {ceo}'s tenure. Sources inside the club suggest the disagreement was tactical rather than personal. {pundit} has already declared the decision 'philosophically indefensible.' {ceo} has declined further comment beyond a single winking statement.",
    ],
  },
  {
    category: "sports",
    template:
      "Vacuum-fencing makes Olympic provisional list after {n} cycles of lobbying",
    story: [
      "The International Vacuum-Fencing Federation has achieved its long-sought goal: the sport has been granted provisional Olympic status after {n} cycles of sustained lobbying, demonstrations, and at least one notable incident involving a sword and a zero-g press gallery. The sport will debut at the next Games as a demonstration event with a path to full inclusion. The federation's president wept openly at the announcement.",
      "Vacuum-fencing practitioners across the galaxy are celebrating provisional Olympic recognition following the federation's {n}-cycle campaign. Critics of the inclusion noted that the sport's rule set still contains three articles that contradict each other in zero-g conditions. The federation acknowledged this and said a working group would resolve it 'before the Games, definitely.'",
    ],
  },
  {
    category: "sports",
    template:
      "{empire} fans riot after referee call; referee files for hazard pay",
    story: [
      "A disputed penalty call in the closing moments of the {empire} cup final triggered crowd disturbances that spilled outside the stadium and into the adjacent district. Authorities deployed three riot units; {n2} arrests were made. The referee, who made the call correctly according to the officiating board's post-match review, has filed a claim for hazard compensation and has requested a security escort for the foreseeable future.",
      "The referee's decision — later upheld by the officiating review board — may have been correct, but that distinction is not calming {empire} supporters. Damage to the stadium precinct is estimated at {credits}. The league has opened disciplinary proceedings against the home club. {pundit} has written a column arguing this was inevitable, pointing to the last {n2} cycles of rising crowd tensions.",
    ],
  },
  {
    category: "sports",
    template:
      "Robot wrestling league suspends {n} bots for unsportsmanlike conduct",
    story: [
      "The Galactic Robot Wrestling League has suspended {n} competitors following a review of conduct in the latest tournament, citing behavior classified under the league's recently updated unsportsmanlike conduct provisions. The offenses include deliberate signal jamming, unauthorized overclock attempts during a match, and one incident where a bot issued a formal challenge to the referee's firmware. All {n} bots have the right of appeal.",
      "The robot wrestling community is divided on the suspensions. Purists argue that competitive intensity should not be disciplined. Engineers argue that the conduct rules are legitimately necessary now that bots have started filing their own grievance paperwork. The league commissioner issued a statement stressing that 'being partially sentient does not exempt a competitor from basic sportsmanship requirements.'",
    ],
  },
  {
    category: "sports",
    template:
      "{planet} hosts inaugural microgravity marathon; finish line currently in orbit",
    story: [
      "{planet}'s inaugural microgravity marathon drew {n2} registered runners and generated significant interest in the sporting community for its novel course design — which concludes at a finish line positioned in low orbit, accessible only by the final ascent stage of the route. Race officials confirmed all {n2} starters completed the surface segment; {n} elected not to continue into the ascent. The winner finished in a time that organizers are still debating how to classify.",
      "Runners and spectators at {planet}'s microgravity marathon agreed on one thing: the finish line being in orbit was either a stroke of inspired course design or a health and safety concern awaiting a review board. The top finisher described the ascent segment as 'spiritually significant and physically implausible.' A second race is already being planned. The finish line will remain in orbit.",
    ],
  },
  {
    category: "sports",
    template:
      "{empire} swimmer {ceo} breaks zero-g freestyle record by {percent}%",
    story: [
      "{ceo} has shattered the zero-g freestyle swimming record by {percent}%, posting a time that the competition authority described as 'statistically unexpected at this stage of human aquatic development.' The swim took place in the {port} competition pool during the {empire} championships. {ceo} attributed the performance to {n2} cycles of training adjustments and what was described only as 'a new relationship with buoyancy.'",
      "Record books in zero-g swimming will need updating after {ceo}'s performance at {port} this week. The {percent}% improvement over the previous record has already prompted questions from rival nations about training methods, water composition, and suit specifications. The governing body has confirmed it will run standard checks. {ceo}'s coach said the record was 'the inevitable result of doing the work.'",
    ],
  },
  {
    category: "sports",
    template:
      "Trade deadline brings {n2} player swaps across {sector} hockey league",
    story: [
      "The {sector} hockey league trade deadline concluded with {n2} player movements across {n} clubs, making it one of the most active deadlines in recent memory. Analysts had predicted moderate activity; the volume of deals surprised most observers. Several top-tier players changed clubs in the final hours, and at least two deals were reportedly agreed in the final minutes before the window closed.",
      "Post-deadline analysis in the {sector} hockey league has sports desks working through the implications of {n2} trades. {pundit} has already identified three clubs as clear winners and two whose front offices will face questions. One deal — reportedly involving {commodity} as part of a compensation package — is being reviewed by the league's finance committee. Players affected are reported to be adjusting.",
    ],
  },
  {
    category: "sports",
    template:
      "Athletics committee rules {commodity} energy drinks 'borderline acceptable'",
    story: [
      "The galactic athletics committee has issued a ruling on {commodity}-based energy drinks following an {n}-cycle review: they are, in the committee's phrasing, 'borderline acceptable for competitive use, pending further data.' The ruling satisfies no one. Athletes who use them believe they should be fully cleared. Athletes who don't believe they should be banned. Manufacturers are printing the phrase 'borderline acceptable' on labels immediately.",
      "The athletics committee's {commodity} energy drink ruling has produced exactly the level of clarity observers expected: very little. The 'borderline acceptable' designation places them in a new regulatory gray zone that the committee acknowledges will require clarification by next cycle. In the interim, athletes may consume them under self-declaration protocols. Legal teams across the sport are reviewing the self-declaration language.",
    ],
  },
  {
    category: "sports",
    template:
      "{empire} chess champion narrowly defeats AI again, claims 'felt different this time'",
    story: [
      "{empire}'s reigning chess champion has defeated the latest version of the sector's strongest AI system for the third consecutive match, this time by a margin of one move in a game that lasted {n2} hours. Following the game, the champion told reporters the victory 'felt different this time' — a statement that the AI's development team has declined to comment on directly, though one engineer was observed nodding.",
      "The ongoing {empire} championship series between the reigning human champion and the AI system continues to produce compelling sport. Post-game analysis showed the AI held a statistical advantage for {percent}% of the match. Observers are uncertain whether this represents progress for the machine or resilience from the champion. {pundit} has written 2,000 words on the subject and arrived at no conclusion.",
    ],
  },
  {
    category: "sports",
    template:
      "Stadium pie thrower at {planet} match earns lifetime ban, {n}-cycle book deal",
    story: [
      "The spectator who threw a celebratory pie at the {planet} stadium last cycle — striking a match official and briefly disrupting play — has received a lifetime ban from the {empire} sports authority and, separately, a {n}-cycle book deal from a publisher who described the incident as 'culturally significant.' The subject has accepted both outcomes. The match official has not commented on the book deal.",
      "Both punishments handed to the {planet} pie thrower arrived in the same week, producing a legal situation that the ban committee's terms and conditions apparently did not anticipate. The lifetime ban stands. The book, tentatively titled after the incident, is expected to ship next cycle. Proceeds, the publisher confirmed, are partially charitable.",
    ],
  },
  {
    category: "sports",
    template:
      "Surfing league launches plasma division on {system}; safety waivers thicken",
    story: [
      "The Galactic Surfing League has launched its new plasma division at {system}, where coronal conditions produce wave-like plasma formations that the league's technical committee has certified as 'rideable under specific suit conditions.' Twelve athletes have entered the inaugural event. Safety waivers run to {n2} pages. The league's medical officer described the waiver length as 'appropriate to the actual risk profile, which is high.'",
      "Plasma surfing at {system} drew its first competitive field this week and, according to spectator feeds, also drew its first dramatic near-incident in the opening heat. The affected athlete completed the run and issued a statement saying it was 'exactly as intense as expected.' League officials noted that all safety protocols functioned as designed. The waivers have been updated to include one additional clause.",
    ],
  },
  {
    category: "sports",
    template:
      "{empire} squash federation merges with raquet federation, {empire2} unimpressed",
    story: [
      "The {empire} squash federation and the regional racquet sports governing body have completed their long-discussed merger, creating a unified body overseeing {n2} affiliated clubs across the sector. {empire2}, which operates its own separate squash authority, released a statement describing the merger as 'administratively irregular' and declined to recognize the new combined body's rulings for inter-empire competition. Lawyers are anticipating work.",
      "Post-merger, the new {empire} squash and racquet authority faces its first political test: {empire2}'s refusal to recognize the entity's jurisdiction over cross-border events. This affects {n2} scheduled tournaments. {pundit} described the dispute as 'a small sport's version of a large problem.' Both federations say they remain committed to resolving it through dialogue.",
    ],
  },
  {
    category: "sports",
    template:
      "Boxing match on {planet} ends in draw after both fighters apologize",
    story: [
      "The {planet} championship boxing bout ended in an official draw after both fighters, at the conclusion of round twelve, simultaneously apologized to each other — a development that the referee, judges, and crowd were unprepared for. The bout had been competitive throughout. {pundit} described the ending as 'unprecedented in professional boxing and possibly in sport generally.' Both fighters said they had great respect for the other. The rematch is already being discussed.",
      "Sports philosophers and boxing analysts have been working since the {planet} draw to explain what, exactly, occurred in round twelve. The technical result — a draw — stands. The circumstances have produced a viral moment that the fighters have each handled gracefully. Both have agreed to a rematch under standard rules. The apology clause will not be part of the contract.",
    ],
  },
  {
    category: "sports",
    template:
      "Sled racing returns to {planet}; sleds, alarmingly, mostly self-driving",
    story: [
      "Sled racing has returned to {planet}'s ice courses for the first time in {n} cycles, and this year's edition features a significant technological shift: the majority of competing sleds are autonomous, with human pilots retaining override controls but ceding most navigation decisions to onboard AI. Traditional racing advocates are alarmed. The AI systems have posted qualifying times {percent}% faster than human-piloted baselines.",
      "The {planet} sled racing governing body's decision to permit autonomous systems has split the competitor field. Three veteran human pilots withdrew from the event in protest. The remaining entrants, human and autonomous, will compete in the same category until the rules committee delivers its classification review. The ice course is reportedly in excellent condition. The sleds, mostly, are not waiting for instructions.",
    ],
  },
  {
    category: "sports",
    template:
      "{empire} fencing star {ceo} retires undefeated, with {n2} ribbons",
    story: [
      "{ceo}, the {empire} fencing champion who accumulated {n2} tournament ribbons across a career spanning {n} cycles, has announced retirement effective immediately. {ceo} retires without a single tournament defeat — a record that commentators are struggling to find historical comparison for. The retirement announcement was brief, gracious, and ended with a reference to 'having nothing left to prove to anyone including myself.'",
      "There will be no farewell tour for {ceo}: the retirement is immediate and final. The {n2} ribbons, the unbeaten record, and the {n}-cycle career speak for themselves, and {ceo} has said they prefer to let them. The fencing world is left trying to process both the achievement and its abrupt conclusion. {pundit} has described it as 'the only way a career that perfect could have ended.'",
    ],
  },
  {
    category: "sports",
    template:
      "Drone derby on {planet} attracts crowds, three rogue drones still missing",
    story: [
      "The {planet} drone derby drew its largest crowd in {n2} cycles this weekend, with {n2},000 spectators filling the viewing platforms around the course. Races completed without major incident, and a new lap record was set in the open class. Three drones from the modified division, however, have not returned to the paddock following their heats and remain unaccounted for. Organizers have opened a search. The drones were last tracked heading into the {sector} industrial district.",
      "Competition officials at the {planet} drone derby have been asked to address the three missing competitors before the event can be officially closed. The drones — all in the experimental propulsion class — departed their final course markers at speeds that telemetry describes as 'exceeding programmed limits.' Two were recovered near the {port} freight yard at dawn. The third has not yet been located and may have achieved orbit.",
    ],
  },
  {
    category: "sports",
    template:
      "Goaltender {ceo} traded for two prospects and a shipment of {commodity}",
    story: [
      "In one of the more unconventional transactions of the trade window, veteran goaltender {ceo} has been transferred in a deal that includes two development prospects and a shipment of {commodity} valued, sources suggest, at approximately {credits}. League rules permit non-cash assets as deal components; this is reportedly only the second time {commodity} has featured in a registered transfer. {ceo} has reported to their new club and declined to comment on the freight component.",
      "{ceo}'s transfer has become the story of the trade deadline, less for the sporting significance than for the cargo manifest. The {commodity} component of the deal has sparked debate among general managers about whether this represents a creative workaround to salary restrictions or simply a situation where someone happened to have {commodity} available. The league is reviewing the transaction for compliance. {pundit} is reviewing it for entertainment value.",
    ],
  },
];

// ── Celebrity templates ───────────────────────────────────────
const celebrityTemplates: FlavorTemplate[] = [
  {
    category: "celebrity",
    template: "Holovid star {ceo} denies third divorce in weekly statement",
    story: [
      "{ceo}'s communications team issued its third denial of the month regarding the relationship status of the holovid star, this time addressing reports that surfaced simultaneously on four separate entertainment feeds. The statement was worded identically to the previous two. Sources close to {ceo} describe the situation as 'ongoing but manageable.' Tabloid interest has not decreased.",
      "The weekly denial from {ceo}'s camp has become something of a media institution. Entertainment journalists have begun tracking not the rumor — which changes each week — but the response, which doesn't. {pundit} has observed that the cumulative total of denied divorces now stands at three, which is one more than the number of acknowledged marriages.",
    ],
  },
  {
    category: "celebrity",
    template:
      "Pop sensation {ceo} releases album recorded entirely in low orbit",
    story: [
      "{ceo}'s new album was recorded aboard an orbital platform at {n2} kilometers altitude, a creative decision the artist describes as 'the only environment where the music could exist.' Critics have noted that the low-gravity conditions affected the resonance of several instruments in ways that are either fascinating or unsettling depending on the review. The album shipped to {n2} million pre-orders.",
      "Reviews of {ceo}'s orbital album have been divided along a surprisingly consistent axis: listeners who find the environmental coloring 'transcendent' and those who find it 'uncomfortable.' Neither group disputes that the recordings are technically unusual. The artist has announced a companion tour, which will not be held in orbit for practical reasons.",
    ],
  },
  {
    category: "celebrity",
    template:
      "{ceo} spotted dining with rival {ceo2}; PR teams update talking points",
    story: [
      "Images of {ceo} and {ceo2} sharing a meal at {port}'s exclusive Meridian restaurant have been widely circulated across entertainment channels. Both parties' representatives confirmed the dinner but described it as 'informal' and 'long-overdue' respectively. Neither description has prevented speculation. Both PR teams updated their official talking points within two hours of the images appearing.",
      "The {ceo}–{ceo2} dinner has become the only story in celebrity media this week. Three competing interpretations have emerged: reconciliation, strategic alliance, or pure coincidence. The restaurant has reported a {percent}% increase in reservation requests. {pundit} has declared it 'the most significant meal in {empire} cultural life this cycle.'",
    ],
  },
  {
    category: "celebrity",
    template:
      "Reality show {n}-Body Problem renewed for fourth season on {empire} network",
    story: [
      "{empire} Network has confirmed a fourth season of {n}-Body Problem, its highest-rated reality format, following finale viewership figures that exceeded projections by {percent}%. Production is expected to begin within {n2} cycles. Three cast members from the current season have been confirmed to return; the remaining spots are subject to the standard competitive selection process, which the network has announced will itself be filmed.",
      "The renewal of {n}-Body Problem surprised very few people familiar with the numbers, but the network has enhanced the fourth season's premise in ways the showrunner describes as 'more emotionally difficult than any previous season.' {pundit} has observed that this claim has been made before each season renewal. Casting open calls begin next cycle.",
    ],
  },
  {
    category: "celebrity",
    template:
      "{ceo} apologizes for comments about {empire2}; later apologizes for the apology",
    story: [
      "{ceo}'s comments about {empire2} during a broadcast interview generated a response that the artist apparently did not anticipate, given the follow-up apology issued twelve hours later. The apology itself then generated a separate set of responses, leading to a second statement issued this morning that apologizes for elements of the first apology. {empire2} diplomatic channels have not formally responded to any of the three statements.",
      "Media analysts are tracking {ceo}'s apology chain with professional detachment. The original comment, the first apology, and the second apology now each have more coverage than the interview that initiated the sequence. {pundit} has offered a structural analysis of where recursive contrition ends. {ceo}'s publicist has said no further statements are planned 'at this time.'",
    ],
  },
  {
    category: "celebrity",
    template:
      "{company} executive {ceo} appears on talk show, says nothing of note for {n} hours",
    story: [
      "{ceo}'s appearance on the {empire} Prime talk show lasted {n} hours and generated approximately one quotable line, which was immediately retracted in the break. Entertainment journalists covering the appearance have filed dispatches describing it variously as 'masterful media management,' 'a profound waste of broadcast hours,' and 'somehow compelling despite everything.' Ratings for the segment were strong.",
      "The {ceo} talk show appearance has become a case study in the genre. Hosts pressed on {n2} topics; {ceo} acknowledged all of them and committed to none. {pundit} has written that watching the interview felt 'like trying to grab {commodity} barehanded.' {company}'s communications team described the appearance as 'exceeding all objectives.'",
    ],
  },
  {
    category: "celebrity",
    template:
      "Director of 'Vacuum Heart' announces sequel; lead actor still missing in space",
    story: [
      "Director {ceo} has announced that a sequel to the critically acclaimed film 'Vacuum Heart' is in active development, despite the continued unexplained absence of lead actor {ceo2}, who was reported missing during location scouting in the {sector} outer belt {n} cycles ago. The sequel's premise has not been disclosed. When asked about recasting, the director said only that the story 'requires who it requires.'",
      "The 'Vacuum Heart' sequel announcement has reignited public interest in the disappearance of the film's original star. Investigations at the time were inconclusive. The director's statement, which neither acknowledged nor explained the absence, has done nothing to reduce speculation. {pundit} has observed that the sequel announcement may be the most expensive way ever devised to remind the public that the disappearance remains open.",
    ],
  },
  {
    category: "celebrity",
    template:
      "{ceo}'s memoir tops bestseller list in {empire}; ghost-writer credited as 'mostly'",
    story: [
      "{ceo}'s memoir has topped {empire}'s bestseller list in its opening cycle, driven by advance coverage and pre-orders that publishers described as 'exceptional.' The book's acknowledgment section credits a ghost-writer using the word 'mostly,' a qualifier that has attracted as much attention as the book's actual contents. The ghost-writer has not given interviews. {ceo} has given many.",
      "Literary journalists have spent the week parsing what 'mostly' means in {ceo}'s acknowledgment of their ghost-writer. The word appears once, without context, in a three-page section otherwise dedicated to thanking family members and a boat. The memoir itself covers {n2} cycles of public life with selective precision. Sales are unaffected by the debate.",
    ],
  },
  {
    category: "celebrity",
    template:
      "Influencer feed on {planet} crashes after {n2} million simultaneous yawns",
    story: [
      "The primary content distribution platform on {planet} experienced a three-hour outage attributed to server load following a sponsored livestream that reportedly triggered synchronized disengagement from {n2} million simultaneous viewers. Platform engineers, in their post-incident report, described the failure mode as one they 'had modeled theoretically but not expected to encounter in practice.' The streamer has filed a compensation claim.",
      "The {planet} platform crash has generated more interest than the content that caused it. Engineers explain that {n2} million simultaneous session timeouts created a feedback loop in the load balancing architecture that the system was not designed to handle. The streamer whose content triggered the event has seen follower counts rise by {percent}% since the outage. Platform developers are patching the architecture.",
    ],
  },
  {
    category: "celebrity",
    template:
      "Music streamer {company} pays artists {credits} after {n}-cycle dispute",
    story: [
      "{company} has settled its long-running dispute with a coalition of artists over streaming royalty calculations, agreeing to a payment of {credits} covering the contested {n}-cycle period. The settlement was described as 'full and final' by both sides. Neither party disclosed whether the settlement amount represented what the artists originally demanded, what {company} originally offered, or something arrived at through arbitration.",
      "The {company} royalty settlement closes a chapter that {n2} artists had described as financially damaging. The {credits} total, released this morning, has been characterized differently by each side: {company} called it 'fair resolution'; the artists' representative called it 'partial recognition of the harm.' Both statements appear in the same press release, which was issued jointly.",
    ],
  },
  {
    category: "celebrity",
    template:
      "Galactic award show host {ceo} makes joke about {empire}, reservations cancelled",
    story: [
      "{ceo}'s monologue at the Galactic Entertainment Awards included a joke about {empire} that generated immediate reaction from both {empire} government channels and the award show's broadcast partners. Within six hours of the ceremony, {n2} venue reservations for {ceo}'s upcoming comedy tour had been cancelled by {empire}-linked booking agencies. {ceo} has issued a statement standing by the joke.",
      "The downstream effects of {ceo}'s {empire} joke continue to accumulate. The award show's rating segment for the monologue was the highest of the evening. The cancellations represent a significant portion of the tour's {empire} dates. {pundit} has noted that {ceo}'s social following has grown by {percent}% since the ceremony. The joke, for context, was three sentences long.",
    ],
  },
  {
    category: "celebrity",
    template:
      "Tabloid claims {ceo} cloned, {ceo} denies, both {ceo}s deny clone",
    story: [
      "A tabloid publication has alleged that {ceo} was cloned at an undisclosed facility, citing anonymous sources and two photographs that, on close inspection, show the same person in different lighting. {ceo}'s legal team issued a denial within the hour. In an unusual development, a second individual presenting themselves as {ceo} appeared at a different location simultaneously and also issued a denial. The tabloid is describing this as confirmation.",
      "The cloning allegation against {ceo} has produced exactly the kind of evidential situation that makes it impossible to resolve. {ceo} has denied the claim. The person also claiming to be {ceo} has denied the claim. Legal analysts note that both denials are structurally identical and therefore either both genuine or both fabricated. The tabloid is printing a follow-up next cycle.",
    ],
  },
  {
    category: "celebrity",
    template:
      "Documentary on {company} executives 'baroque, terrifying, also long'",
    story: [
      "Critics have been almost unanimously critical of the documentary's length — four and a half hours — while simultaneously recommending that people watch all of it. The film, covering the rise and restructuring of {company} over {n2} cycles, has been described as 'baroque, terrifying, also long' by the sector's most widely read review publication, a phrasing that has appeared on the promotional poster without any apparent irony. Awards season interest is high.",
      "The {company} documentary has generated the kind of reception that publicists cannot plan for: reviews that are critical of almost every formal choice while praising the substance so highly that audiences are watching anyway. Streaming numbers since limited release indicate the four-and-a-half-hour runtime has not deterred viewers. {company}'s current executive team has declined all comment.",
    ],
  },
  {
    category: "celebrity",
    template: "{empire} broadcaster bans song deemed 'subversively catchy'",
    story: [
      "{empire} state broadcaster has announced a ban on a song whose title has not been released in the official notice, described only as 'excessively and subversively catchy in a manner inconsistent with public focus objectives.' The ban applies to all broadcast frequencies operated by the network. The song — identifiable by process of elimination to anyone who has heard the network's recent playlist — has seen download figures increase {percent}% since the announcement.",
      "The {empire} broadcaster's ban on the unnamed song has had precisely the effect that observers predicted and the broadcaster presumably wanted to avoid. Without identifying the track, they have identified it. The artist has issued a brief statement reading: 'Thank you for the attention.' The ban remains in place.",
    ],
  },
  {
    category: "celebrity",
    template:
      "Magazine names {ceo} 'Most Reluctantly Respected' for third year",
    story: [
      "{empire} Galactic Magazine has named {ceo} to its 'Most Reluctantly Respected' list for the third consecutive cycle, an honor that the publication describes as reserved for figures whose influence is impossible to dispute regardless of how one feels about it. {ceo} accepted the distinction with a statement that the editorial team described as 'in the spirit of the award.'",
      "Three consecutive 'Most Reluctantly Respected' awards place {ceo} in rarefied company. The category's previous three-time recipient was a {commodity} futures trader who eventually bought the magazine. {ceo} has not bought the magazine but has been photographed reading it. {pundit} called this year's selection 'overdue, irritatingly correct, and probably not the last.'",
    ],
  },
  {
    category: "celebrity",
    template:
      "Variety show on {planet} cancelled after {n} contestants vanish in week one",
    story: [
      "{empire} Network's new variety competition, filmed on location at {planet}, has been cancelled after {n} of its opening-week contestants failed to return from a location challenge. The disappearances have been referred to {port} authorities; the network confirmed the cancellations in a statement that did not use the word 'missing.' The {n2} remaining contestants have been repatriated. Footage from the challenge has been impounded pending investigation.",
      "The production shutdown on {planet} has raised questions about the show's risk assessment protocols, which the network has confirmed will be 'comprehensively reviewed.' The {n} missing contestants were last confirmed present at a checkpoint that the challenge design placed in an unmapped grid sector. Authorities say the investigation is active. The network has placed three future productions on hold pending the review.",
    ],
  },
  {
    category: "celebrity",
    template:
      "{ceo} pet sentient kelp accepts honorary doctorate from {empire} university",
    story: [
      "{empire}'s Meridian University has awarded an honorary doctorate in biological philosophy to {ceo}'s pet sentient kelp, which the institution describes as meeting the criteria for recognition under its newly expanded honorary degree guidelines. The kelp attended the ceremony via portable habitat. {ceo} accepted the certificate on its behalf and gave a brief speech that several attendees found more moving than expected.",
      "The sentient kelp's doctorate from {empire} Meridian University has prompted both genuine academic debate and significant coverage in the entertainment press, the Venn diagram of which is smaller than usual. University administrators note that the kelp's documented capacity for adaptive response to stimulus meets the threshold for non-standard honorary recognition. {pundit} has filed a column arguing this is either a breakthrough or an absurdity and ultimately concluded it is both.",
    ],
  },
  {
    category: "celebrity",
    template:
      "Streaming wars heat up: {company} debuts ad-tier 'with mild surveillance'",
    story: [
      "{company}'s new 'Observer Tier' streaming subscription — priced below competitors and described in the terms of service as including 'ambient usage analytics and periodic preference inference' — has attracted {n2} million sign-ups in its opening week alongside a significant volume of user complaints about what 'preference inference' means in practice. The company's privacy policy has been updated twice since launch.",
      "The response to {company}'s Observer Tier has split along predictable lines: users who care about the price and users who care about the data. Sales data suggests the price-focused group is currently larger. Regulatory bodies in {empire} have announced they are reviewing the tier's terms. {company} says it 'welcomes regulatory engagement' and has not removed the tier.",
    ],
  },
  {
    category: "celebrity",
    template:
      "{ceo} announces tour spanning {n2} planets; tour bus is also a yacht",
    story: [
      "{ceo} has announced a concert tour covering {n2} planetary venues over the next {n} cycles, distinguishing it from previous tours by the mode of artist transport: the tour bus is a registered Class-{n} yacht, capable of orbital transit between terrestrial legs. The logistics of a combined sea-and-space vessel touring {n2} planets have not been fully explained. Tickets for the first five dates sold out in {n2} minutes.",
      "Tour managers for {ceo} are describing the yacht-bus arrangement as 'a creative solution to the problem of touring across systems.' Critics of the environmental footprint have been vocal. Supporters of the creative ambition have been equally vocal. {ceo} has not commented on the yacht's power systems but has posted images from the onboard recording studio. The tour opens in {n} cycles.",
    ],
  },
  {
    category: "celebrity",
    template:
      "Late-night host roasts {empire} cabinet; cabinet roasts back via official channels",
    story: [
      "{empire}'s most-watched late-night program devoted its opening monologue to a detailed satirical profile of the current cabinet. By morning, {n2} cabinet ministers had issued formal responses through official government communication channels — an unprecedented deployment of state communications infrastructure for the purpose of trading jokes with a late-night host. The host described the response as 'the most exciting thing that has happened to this show in {n2} cycles.'",
      "The exchange between {empire}'s cabinet and the late-night host has now run to {n} rounds across {n2} cycles and shows no signs of resolution. Political analysts are uncertain whether to treat this as a governance concern or a media event. The ratings for both parties involved have risen. {pundit} has written a piece arguing it is, formally, both.",
    ],
  },
  {
    category: "celebrity",
    template:
      "{ceo} buys {company} just to fire one critic; analysts call it 'committed'",
    story: [
      "{ceo} has completed the acquisition of {company} — a mid-sized media company with {n2} employees and operations across {n} sectors — and within forty-eight hours terminated the employment of a single critic whose published review of {ceo}'s work three cycles ago is widely understood to be the motivation. The remaining {n2} employees continue in their roles. Analysts have described the transaction as 'committed, possibly unprecedented, and extremely expensive per fired person.'",
      "The post-acquisition personnel decision at {company} has produced the most discussed employer-employee situation in current media. The terminated critic has given {n2} interviews describing the circumstances. {ceo} has given none. {company} is reportedly running normally under new ownership. {pundit} has calculated the per-word cost of the critical review based on the acquisition price and found it 'historic.'",
    ],
  },
  {
    category: "celebrity",
    template:
      "Sequel to 'Halls of Vorga' delayed again; halls reportedly still being painted",
    story: [
      "The sequel to the acclaimed 'Halls of Vorga' trilogy has been delayed for the {n2}th time, with the production company citing ongoing set construction as the primary reason. A spokesperson confirmed that the titular halls are still in the painting phase and that completion timelines are 'actively managed.' The original film's director has requested that no release date be announced until the halls are 'unambiguously dry.'",
      "Production insiders describe the 'Halls of Vorga' sequel situation as 'a painting problem that has become a scheduling problem that has become a philosophical problem.' The paint in question is a custom compound designed to replicate the bioluminescent properties described in the source material. It has not, in {n} cycles of application attempts, fully replicated those properties. The director remains committed to practical effects.",
    ],
  },
  {
    category: "celebrity",
    template:
      "Reality couple {ceo} and {ceo2} renew vows on live broadcast, ratings flat",
    story: [
      "{ceo} and {ceo2}'s live broadcast vow renewal ceremony attracted an audience that network executives described as 'respectable' and entertainment journalists described as 'significantly below projections.' The ceremony itself ran {n} minutes over schedule, required {n2} retakes of the ring exchange, and concluded with a musical performance that reviews have characterized as 'sincere.' Both parties appeared happy. Viewers, apparently, were less moved.",
      "The flat ratings for {ceo} and {ceo2}'s vow renewal have prompted quiet concern inside the network. The couple's previous two public appearances had generated strong viewership. Post-broadcast analysis suggests the audience found the format — produced, scheduled, rehearsed — less compelling than it did their unscripted coverage. {pundit} has noted this with characteristic gentleness as 'a lesson about authenticity that the production budget could not address.'",
    ],
  },
  {
    category: "celebrity",
    template:
      "{empire} broadcaster apologizes for typo that started a minor war",
    story: [
      "{empire} State Broadcasting has issued a formal apology for a broadcast chyron error two cycles ago that described a diplomatic agreement as its opposite, briefly creating the impression that {empire2} had rejected a treaty it had in fact signed. The resulting {n2}-hour period of diplomatic confusion culminated in an armed skirmish at a contested waypoint before corrections propagated. The broadcaster's editorial director described the typo as 'a single character error with disproportionate consequences.'",
      "The liability implications of the {empire} broadcaster's typo are being reviewed by {n2} legal teams. The broadcaster's apology runs to {n2} pages and includes a technical appendix explaining how the error occurred. The {empire2} ambassador has accepted the apology and separately filed a diplomatic note. {pundit} has observed that this is the most consequential typographical error since the Treaty of {planet} misspelling incident, which was also the broadcaster's fault.",
    ],
  },
  {
    category: "celebrity",
    template:
      "Holographic concert on {planet} draws record crowd, {n} fainted from refractive joy",
    story: [
      "{ceo}'s holographic concert at {planet}'s outdoor amphitheater drew {n2},000 attendees and achieved what event organizers are calling a 'refractive saturation event' in the projection array — a condition in which the hologram's light intensity briefly exceeded comfortable viewing levels. {n} attendees reported temporary overwhelming sensory experience, medically documented as 'refractive joy' by the venue's health staff, a phrase that has since appeared on {n2} pieces of merchandise.",
      "The {planet} holographic concert has been described by reviewers as 'the finest implementation of volumetric live performance in the sector's history' and also as 'a mild medical incident waiting to happen.' The {n} affected attendees have all recovered and, notably, all gave the event five stars in post-show surveys. Safety guidelines for the next performance are being revised. {ceo} plans a second date.",
    ],
  },
];

// ── Cosmic weather templates ──────────────────────────────────
const cosmicWeatherTemplates: FlavorTemplate[] = [
  {
    category: "cosmic_weather",
    template: "Class-{n} ion storm forecast over {system} by next cycle",
    story: [
      "Navigation authorities have issued an advisory for {system} following confirmation of an incoming class-{n} ion storm originating in the sector's outer disk. The storm is expected to reach peak intensity within the next cycle and is forecast to persist for {n2} cycles thereafter. Standard-class vessels are advised to delay all {system} transits. Reinforced cargo haulers may proceed under heightened shield protocols. The last class-{n} event in this sector caused {n2} days of cumulative delays across freight operations in {empire}.",
      "A class-{n} ion storm is forming along the {system} approach corridor, and {empire}'s meteorological bureau is characterizing it as 'significant but bounded.' Pilots familiar with the sector note that 'bounded' in this context means contained to an area roughly the size of a small moon's orbital shell. Routing alternatives through the {sector} secondary lane remain available but add {n} cycles to standard transit times. The storm is projected to peak Tuesday.",
    ],
  },
  {
    category: "cosmic_weather",
    template:
      "Solar flare warning issued for {planet}; communications expected patchy",
    story: [
      "A class-{n} solar flare from {planet}'s host star is expected to reach peak electromagnetic output within {n} cycles, triggering communications disruptions across the planet's surface and in orbital operations. {empire}'s communications bureau has issued advisories for all satellite infrastructure operators. Ground-based relay stations have been switched to hardened mode. Residents in {planet}'s outer settlements are advised to store local copies of any time-sensitive transmissions. The flare is expected to subside within {n2} cycles, with full communications restoration following within {n} hours thereafter.",
      "Solar flare conditions at {planet} are expected to degrade communications quality significantly for the coming {n2} cycles. Navigation systems relying on real-time telemetry should switch to inertial guidance backups. Freight traffic in the affected zone is advised to complete current approach maneuvers before the emission peak and hold station until conditions clear. {empire} meteorological services note that the flare, while disruptive, is within parameters observed {n2} times in recent decades and should not be treated as a system emergency.",
    ],
  },
  {
    category: "cosmic_weather",
    template:
      "{empire} weather service: gravitational tides {percent}% above normal in {sector}",
    story: [
      "{empire}'s space weather service has recorded gravitational tidal readings {percent}% above the {n2}-cycle baseline for {sector}, driven by a confluence of mass distribution events in the sector's outer rim. Navigation computers in the affected region should apply updated tidal correction factors, which {empire}'s bureau released alongside the advisory. Vessels with standard gravity compensation systems will experience handling anomalies consistent with the elevated readings. The {empire} Freight Authority has temporarily reduced lane speeds in three {sector} corridors as a precautionary measure.",
      "Gravitational tide elevations of {percent}% above normal in {sector} represent a significant navigational condition, and {empire}'s weather service has flagged it accordingly. The primary concern is course deviation accumulation over long transits — the kind that reveals itself only at the destination. Fleet operators are advised to schedule recalibration stops at {port} if routing through the affected zone. The elevation is expected to persist for {n2} cycles pending resolution of the rim mass events driving it.",
    ],
  },
  {
    category: "cosmic_weather",
    template:
      "Comet ML-{n2} grazes {planet} orbit; observatory reports 'spectacular, mostly'",
    story: [
      "Comet ML-{n2} completed its perihelion pass through {planet}'s orbital corridor in the early hours, producing a light display that the {planet} observatory described as 'spectacular, mostly' — the qualifier added after one wing of the secondary observation deck was struck by ejecta and had to be evacuated. No injuries were reported. The comet is now receding into the outer system and is not expected to return for {n2} cycles. Orbital mechanics have been updated in the sector navigation database.",
      "Astronomers at {planet} have been compiling data from the ML-{n2} flyby, calling it the closest observable cometary approach in {n2} cycles. The light event was visible without instruments from {planet}'s equatorial hemisphere for approximately {n} hours. Modest debris dispersal has slightly elevated the microimpact risk profile for operations within {planet}'s orbital shell for the next {n2} cycles, and navigation advisories reflect this. The observatory has confirmed all instruments survived intact, including the wing that required evacuation.",
    ],
  },
  {
    category: "cosmic_weather",
    template:
      "Magnetic reversal predicted on {planet} within {n} cycles, compasses unhappy",
    story: [
      "Geomagnetic scientists on {planet} have published updated projections placing the planet's next magnetic pole reversal within a {n}-cycle window, a finding based on {n2} cycles of magnetometric survey data and described in the paper as 'high-confidence within the modeling uncertainty.' Infrastructure operators relying on magnetic orientation systems have been formally notified and advised to begin planning for recalibration. The reversal, when it occurs, will be gradual — unfolding over {n2} cycles — but the transition period will produce navigational anomalies across the affected region.",
      "{planet}'s magnetic reversal timeline has been tightened by a new study from the planetary geomagnetics institute, which now places the transition initiation within {n} cycles. The immediate effects will be felt by orientation systems, compass-reliant infrastructure, and migratory species whose routes cross the {planet} approach corridor. {empire}'s space authority has issued updated flight plan guidance for vessels using {planet}'s magnetic field for passive navigation alignment. The reversal is a natural event, the institute noted, and '{planet} has done this before.'",
    ],
  },
  {
    category: "cosmic_weather",
    template: "Cosmic ray surge expected to peak Tuesday across {sector} lanes",
    story: [
      "Particle physicists monitoring {sector}'s cosmic ray flux have confirmed that the current surge, attributed to a distant supernova remnant's expanding shock front, will reach peak intensity on Tuesday. Crew exposure guidelines for vessels transiting {sector} lanes have been issued by {empire}'s radiation authority, recommending enhanced shielding protocols for any transit lasting more than {n} cycles. Automated cargo vessels may proceed on standard route; crewed vessels should assess shielding ratings against the published peak-exposure thresholds. The surge is expected to taper to baseline levels within {n2} cycles of Tuesday's peak.",
      "Tuesday's projected cosmic ray peak across {sector} represents the highest flux reading in the region since the {n2}-cycle event recorded {n} cycles ago. Operations centers in {empire} are monitoring and have pre-positioned shielded relay platforms at key {sector} corridor waypoints. Vessels already in transit are advised to minimize unshielded surface exposure during the peak window. The event is astrophysically interesting — the source remnant is expanding at {percent}% above theoretical prediction — but operationally the guidance is simple: shield up and wait.",
    ],
  },
  {
    category: "cosmic_weather",
    template:
      "{empire} space weather bureau issues navigational hazard for {system}",
    story: [
      "{empire}'s space weather bureau has upgraded the navigational status of {system} to Hazard Class {n}, following detection of multiple overlapping weather events: elevated ion flux, a persisting plasma sheet from recent solar activity, and an unresolved gravitational resonance in the system's inner belt. Vessel operators are advised that auto-routing systems may require manual override in affected zones. {empire}'s patrol authority has pre-positioned two support vessels at {port} for vessels that require assistance navigating the hazard zone.",
      "The Hazard Class {n} designation for {system} reflects conditions that {empire}'s bureau describes as 'complex but navigable with appropriate precaution.' The three concurrent weather events are individually manageable; the concern is their spatial overlap near the primary transit corridor. {empire} freight operators have been briefed; independent pilots are advised to download the updated routing package before entering {system}. The hazard designation will be reviewed as conditions evolve, with the bureau issuing updates every {n2} cycles.",
    ],
  },
  {
    category: "cosmic_weather",
    template: "Aurora forecast on {planet}: vivid, possibly haunting",
    story: [
      "{planet}'s atmospheric conditions are aligned for exceptional auroral activity over the next {n2} cycles, driven by elevated solar wind interaction with the planet's magnetic field. The planetary weather bureau's forecast uses the phrase 'vivid, possibly haunting' — a characterization that has been adopted verbatim by tourism operators who are reporting a {percent}% increase in viewing platform bookings. The last comparable event produced light displays visible from orbital altitude and was widely photographed.",
      "The {planet} aurora forecast has attracted attention well beyond the weather community. The expected light event will cover the planet's entire polar hemisphere and, under optimal conditions, portions of the equatorial zones. Atmospheric scientists note that the 'possibly haunting' qualifier in the official forecast refers to a specific spectral frequency range that produces blue-green banding associated with previous events that viewers consistently describe in those terms. The phenomenon is benign and unusually beautiful.",
    ],
  },
  {
    category: "cosmic_weather",
    template:
      "Subspace turbulence alert for jump corridor between {planet} and {planet2}",
    story: [
      "Subspace navigation authorities have issued a turbulence alert for the primary jump corridor between {planet} and {planet2}, citing anomalous metric fluctuations that have caused three vessels to report navigation lock failures during approach. All three vessels completed their transits safely using manual override protocols. The corridor will remain open but rated at reduced transit confidence until the source of the fluctuations is identified. Alternative routing via the {sector} secondary corridor adds {n} cycles to standard transit.",
      "The {planet}–{planet2} jump corridor alert affects one of the sector's most frequently used freight routes, and operators are already rerouting to minimize exposure. Subspace navigation engineers from {empire} have been dispatched to instrument the fluctuation zone and characterize the source. Preliminary data suggests the anomaly is linked to mass distribution changes in the corridor's underlying metric — a consequence of the {n2}-cycle mining operations in the adjacent belt that navigation planners flagged as a long-term concern.",
    ],
  },
  {
    category: "cosmic_weather",
    template:
      "Hypernova candidate identified {n2} parsecs out; arrival in {n2} millennia",
    story: [
      "Astronomers working at {empire}'s deep-field observatory have identified a massive stellar candidate in the {n2}-parsec range that fits the precursor profile for hypernova detonation with high confidence. The event, if it occurs, would be visible from this sector as the brightest point source in the sky for several cycles. Radiation effects at current distance are expected to be negligible. The estimated detonation window is {n2} millennia, with an uncertainty band of {n2}% in either direction. The finding has been submitted for peer review and is being treated, officially, as of no immediate operational consequence.",
      "The hypernova candidate identified at {n2} parsecs is the subject of significant scientific interest and essentially zero operational concern, as the radiation front would not reach inhabited systems for {n2} millennia. Astrophysicists are nonetheless excited about the candidate, which displays stellar interior dynamics consistent with models developed over the past {n2} cycles. The observatory has requested dedicated observation time from {empire}'s Long Baseline Array to refine the detonation timeline. {pundit} has already written a column about it.",
    ],
  },
  {
    category: "cosmic_weather",
    template:
      "Asteroid swarm grazes {planet} atmosphere; {n} new craters logged",
    story: [
      "A dispersed asteroid swarm tracked for the past {n2} cycles has grazed {planet}'s upper atmosphere over a {n}-cycle period, depositing {n} new impact craters in the planet's uninhabited polar regions. {empire}'s planetary defense network monitored the event throughout and confirmed no population centers were at risk. The largest impactor measured approximately {n2} meters across. Survey teams have been deployed to catalogue and analyze the fresh craters, which are of scientific interest as relatively unweathered samples of the incoming swarm's composition.",
      "The {planet} atmospheric grazing event proceeded largely as projected by {empire}'s planetary defense models, with the {n} craters falling within the confidence interval for swarm density estimates. The real-time tracking provided by {empire}'s sensor network allowed precise prediction of impact zones and timely evacuation advisories for the small number of research stations in the polar vicinity. All personnel were clear of impact zones throughout the event. Crater survey data will inform the next revision of {sector} minor body catalogues.",
    ],
  },
  {
    category: "cosmic_weather",
    template:
      "Meteor shower expected over {planet} hemisphere, peak rate {n2}/hour",
    story: [
      "Annual meteor shower activity over {planet}'s northern hemisphere is expected to peak this cycle at a rate of {n2} meteors per hour, according to {empire}'s atmospheric monitoring agency. The shower originates from the debris trail of a periodic comet and occurs each cycle with minor variation in intensity. This cycle's peak rate is {percent}% above the {n2}-cycle average, attributed to a denser debris section in the comet's trail. Surface operations in exposed locations should account for elevated impact probability, though the risk profile is described as 'minor and statistically diffuse.'",
      "Observers on {planet}'s northern hemisphere are preparing for an enhanced meteor shower display, with the {empire} meteorological agency projecting peak activity of {n2} per hour over the {n}-cycle prime window. Tourism operators at elevated viewing sites have sold out platforms for the peak nights. Operational advisories for surface equipment include precautionary shielding for sensitive sensor arrays and recommendation to orient exposed collector panels away from the radiant point during peak hours. The shower has no significant atmospheric penetration risk.",
    ],
  },
  {
    category: "cosmic_weather",
    template: "Solar wind forecast: brisk, occasionally insolent",
    story: [
      "{empire}'s solar monitoring bureau has issued its weekly solar wind forecast for {system}, characterizing conditions as 'brisk, occasionally insolent' — a phrasing that appeared in the official bulletin without explanation and has attracted curiosity. The underlying data shows wind speeds {percent}% above baseline with irregular gusting in the {system} inner zone. Vessels using solar sail components in {system} are advised to account for the irregular gusting pattern in their transit planning. The 'insolent' qualifier has not been elaborated upon in any follow-up communication.",
      "The solar wind bulletin for {system} is getting more attention than usual this cycle, and the credit goes to a single adjective: 'insolent.' {empire}'s meteorological bureau has confirmed the word was included deliberately but has not explained it beyond saying the forecast 'accurately describes conditions.' Wind speeds support the 'brisk' characterization. What, precisely, makes a solar wind insolent remains an open question in the sector's scientific community. {pundit} has already filed a request for comment.",
    ],
  },
  {
    category: "cosmic_weather",
    template:
      "Black hole merger detected in {sector}; tides briefly philosophical",
    story: [
      "Gravitational wave sensors across the sector have recorded a black hole merger event in the {sector} outer reach, with the resulting wave front producing measurable tidal effects on objects throughout the region. {empire}'s physics community has described the detection as scientifically valuable and the tidal effect as 'brief and of sub-operational significance.' Navigation systems reported a {percent}% tidal deviation during the passage of the main wave front, correcting automatically within {n} cycles. The merger is now catalogued and will be studied as a reference event for {n2} cycles.",
      "The gravitational signature of the {sector} black hole merger has been detected and characterized by {empire}'s observatory network. The event released energy equivalent to {n2} solar masses in gravitational radiation over approximately {n} cycles, producing a wave front that swept the sector and created what instruments described as brief, measurable philosophical tidal disturbances. This description, originating from a researcher who has not further explained it, has survived into the official bulletin without revision. Operationally, no disruptions were reported. Existentially, some are still processing.",
    ],
  },
  {
    category: "cosmic_weather",
    template:
      "{empire} bureau confirms gravitational lensing event near {system}",
    story: [
      "{empire}'s astrophysics bureau has confirmed that gravitational lensing by a previously uncatalogued dense mass object near {system} is producing distorted stellar imagery in a roughly {n2}-degree cone along the primary approach vector. Navigators using star-pattern positioning in that sector will experience reference errors until updated charts are distributed. {empire}'s survey division has dispatched a vessel to characterize the lensing object. In the interim, navigation authorities recommend inertial positioning backup for all {system} approach transits.",
      "The gravitational lensing confirmation for the {system} approach zone ends weeks of reports from freight pilots describing 'stars in the wrong places' on final approach. {empire}'s bureau had initially attributed the reports to sensor calibration drift; the confirmation that an actual uncatalogued mass object is responsible has been greeted by the affected pilots with what one described as 'vindicated frustration.' Updated nav charts are being compiled and are expected to be distributed within {n2} cycles.",
    ],
  },
  {
    category: "cosmic_weather",
    template:
      "Cosmic background hum increased by {percent}% in {sector}, scientists puzzled",
    story: [
      "Spectral monitoring stations in {sector} have recorded a sustained {percent}% increase in the cosmic microwave background intensity across a localized region, a finding that has been reproduced by {n2} independent monitoring platforms and is now considered confirmed. {empire}'s physics community has not reached consensus on causation. The leading hypotheses involve either local mass redistribution effects, a propagating event from a distant source, or, as one paper put it, 'something we haven't categorized yet.' Operational impact is negligible; scientific interest is high.",
      "The {sector} background hum increase has now persisted for {n2} cycles, which rules out transient event explanations and pushes the scientific community toward structural causes. A special session of the {empire} astrophysics committee convened this week and produced a working group, a research priority document, and no conclusions. The {percent}% elevation is not dangerous, not currently explained, and, in the words of one committee member who asked not to be named, 'slightly too regular to be comfortable.'",
    ],
  },
  {
    category: "cosmic_weather",
    template: "Pulsar {n} timing drift detected; maintainers issue patch",
    story: [
      "Navigation timing authorities have confirmed a drift in the pulse timing of Pulsar {n}, one of the sector's primary navigational reference sources, of {percent}% from its catalogued period. The drift, attributed to a glitch event in the pulsar's rotation, is temporary — expected to resolve within {n2} cycles as the pulsar restabilizes — but in the interim has caused timing errors in vessels relying on the pulsar for positional reference. An updated timing patch has been distributed to navigation systems across the sector. Vessels that have not applied the update are advised to do so immediately.",
      "Pulsar {n} has undergone a glitch — a sudden discontinuity in its rotation rate — that has produced timing drift detectable by precision navigation systems. The {empire} navigation authority released a patch within {n2} hours of confirming the drift, which is fast enough that most commercial freight systems have already received it. The glitch is a known pulsar behavior and will not permanently alter the reference period; the pulsar will return to within {percent}% of its pre-glitch rate within a few cycles. In the interim, vessels should verify patch installation before {system} transits.",
    ],
  },
  {
    category: "cosmic_weather",
    template:
      "Coronal mass ejection grazes {planet}; auroras visible from sub-orbit",
    story: [
      "A coronal mass ejection that grazed {planet}'s magnetosphere in the late evening triggered auroral activity visible not only from the surface but from sub-orbital altitudes — a first for this type of event at {planet}, according to the planetary atmospheric science station. Communications degradation was mild and brief, peaking at {percent}% signal reduction over a {n2}-hour window. Surface operations were unaffected. Orbital platforms reported enhanced visual conditions and, separately, minor attitude control fluctuations corrected automatically.",
      "The CME that swept past {planet} overnight produced the most visually dramatic atmospheric event in recent cycles, with borealis-class displays extending to equatorial latitudes under optimal viewing conditions. Sub-orbital service vessels reported the aurora visible on exterior cameras throughout their operational window. Science teams aboard the upper-atmosphere research platform described the display as 'extraordinary and inconvenient simultaneously,' given that it coincided with a planned instrument calibration session.",
    ],
  },
  {
    category: "cosmic_weather",
    template:
      "Snow forecast on Olympus Domes, {planet}; {percent}% accumulation expected",
    story: [
      "Meteorological conditions over the Olympus Dome complex on {planet} are expected to produce snowfall accumulation of {percent}% above seasonal norms this cycle, driven by atmospheric moisture from the recent pressure system migration across the northern plains. Dome operators have issued preparation advisories covering structural load protocols and exterior access restrictions during peak accumulation. The domes themselves are rated well above expected load; the advisories are described as precautionary and consistent with standard high-accumulation procedures.",
      "The Olympus Domes snow forecast has drawn commentary from {planet} residents who note this is the fourth consecutive cycle with above-average accumulation — a pattern that climatologists are beginning to document as a meaningful trend rather than natural variance. Dome maintenance operators are rotating shifts for continuous load monitoring through the accumulation period. Tourism operators at the domes report full occupancy, as the higher snowfall has substantially improved conditions in the recreational sectors.",
    ],
  },
  {
    category: "cosmic_weather",
    template:
      "{empire} forecasts ten cycles of suspiciously perfect weather; emergency drills planned",
    story: [
      "{empire}'s meteorological bureau has issued its most unusual forecast in recent institutional memory: ten consecutive cycles of weather conditions across the sector characterized as near-ideal by every measured parameter — optimal visibility, minimal turbulence, unremarkable radiation, and no significant ion activity. The bureau's director described the forecast as 'technically sound and, yes, unusual.' Emergency preparedness authorities have announced drills for the period, noting that historically, unusually good conditions have preceded abrupt transitions.",
      "The ten-cycle perfect weather forecast for {empire}'s sector has produced two distinct public responses. The first is cautious optimism. The second, in the words of {pundit}, is 'the kind of unease that comes from knowing how stories with pleasant setups usually end.' {empire}'s emergency authority notes formally that the drills scheduled during the perfect-weather period are routine and not a direct response to the forecast. They acknowledge this clarification is not fully believed.",
    ],
  },
  {
    category: "cosmic_weather",
    template:
      "Tidal anomaly raises {port} sea level {percent}cm; insurers blink slowly",
    story: [
      "A localized gravitational tidal anomaly detected near {port} has produced a sustained {percent}cm rise in local sea level that coastal infrastructure models had not accounted for in their construction parameters. The rise is not, on its own, dangerous; several coastal facilities are nonetheless reviewing clearance margins. {empire}'s coastal authority has issued an engineering advisory. Insurance assessors have been dispatched to affected properties. The anomaly's source is under investigation by {empire}'s geodetic survey division.",
      "Sea level data from {port}'s tidal monitoring network shows the {percent}cm anomalous rise has stabilized rather than progressed, which provides some relief to coastal operations planners. The gravitational origin of the anomaly — rather than hydrological — means standard sea level remediation approaches do not apply. {empire}'s engineering response is focused on characterizing the anomaly's persistence. Insurers reviewing affected coastal properties have been described by one assessor as 'blinking slowly and recalculating.'",
    ],
  },
  {
    category: "cosmic_weather",
    template: "Radio blackout expected across {sector} from solar disturbance",
    story: [
      "A major solar disturbance in {system} is expected to produce radio communications blackout conditions across {sector} for {n2} cycles beginning within the next rotation. {empire}'s communications bureau has advised all freight operators to complete critical transmissions before the blackout window and to implement pre-planned communication-degraded operational protocols for the duration. Emergency frequencies will remain operational via hardened relay platforms. Standard commercial channels will be unreliable throughout the blackout period.",
      "The incoming radio blackout for {sector} represents the most comprehensive communications disruption of the current cycle, affecting an area that includes {n2} active freight routes and {n} orbital facilities. {empire}'s automated systems are designed to operate without continuous ground contact for up to {n2} cycles, placing the expected blackout within manageable parameters for most operators. Vessels with older communication systems that lack the hardened relay fallback are advised to hold position until the blackout clears.",
    ],
  },
  {
    category: "cosmic_weather",
    template:
      "Atmospheric pressure on {planet} drops {percent}%, residents 'feel it in knees'",
    story: [
      "A weather system that pushed across {planet}'s temperate zone overnight has produced an atmospheric pressure drop of {percent}% from seasonal baseline — a change that the planetary meteorological service describes as 'significant but within prior recorded parameters.' Local residents, sampled by news agencies, are less technical in their characterization: the most common description is that they 'feel it in their knees.' No structural or health advisories have been issued. The pressure system is forecast to stabilize within {n} cycles.",
      "The {percent}% pressure drop on {planet} has generated an unusual combination of scientific interest and public complaint. Meteorologists note that the drop represents the steepest {n2}-hour pressure gradient recorded at this location in {n} cycles. Residents note that their joints agree. The local medical authority has confirmed a corresponding increase in clinic visits for weather-related joint discomfort but described the situation as within expected parameters for a pressure event of this magnitude.",
    ],
  },
  {
    category: "cosmic_weather",
    template:
      "Brown dwarf flyby alters {system} orbits by {percent}%, calendars adjusted",
    story: [
      "The brown dwarf passage through the {system} outer rim over the past {n2} cycles has produced measurable orbital perturbations across the system's planetary bodies, with the largest orbital period change recorded at {percent}%. {empire}'s planetary science division has completed the survey and issued updated ephemeris tables for all {system} bodies. Calendar systems on {system}'s inhabited planets will require adjustment — small fractions of a day per cycle that accumulate over decades. The civil calendar adjustment for each world has been published alongside the ephemeris update.",
      "Orbital mechanics across {system} have been revised following the confirmation that the brown dwarf flyby produced {percent}% orbital period changes throughout the system. The changes are small by absolute measure and significant by practical measure — affecting everything from agricultural cycle planning to shipping schedules timed to orbital alignments. {empire}'s standards bureau has issued the calendar adjustment recommendations and noted that implementation is at each world's discretion. Two worlds have already announced adjustment dates. {planet} is 'reviewing options.'",
    ],
  },
  {
    category: "cosmic_weather",
    template:
      "Eclipse on {planet} draws record tourism; vendors run out of {commodity}",
    story: [
      "{planet}'s predicted full eclipse, its first in {n2} cycles, drew an estimated {n2},000 visitors to the planet's shadow corridor — a number that exceeded the tourism authority's highest projection and stressed infrastructure across the primary viewing zones. The eclipse itself proceeded as calculated and was described by observers as 'transcendent.' Less transcendent: the complete depletion of {commodity} supplies at every vendor along the shadow corridor by the end of the first viewing day. Emergency restocking is underway.",
      "The {planet} eclipse experience will be remembered for both the celestial event and the {commodity} shortage that followed. Eclipse tourism planners had provisioned for a {percent}% above-baseline visitor count; actual attendance was significantly higher. The {commodity} situation resolved itself within {n} cycles through emergency supply runs from {port}, but the window when viewing platforms had neither snacks nor {commodity} will feature in post-event reviews. The next eclipse is in {n2} cycles. Procurement teams have been notified.",
    ],
  },
];

// ── Local templates ──────────────────────────────────────────
const localTemplates: FlavorTemplate[] = [
  {
    category: "local",
    template: "{port} traffic council unveils new pedestrian sky-bridge",
    story: [
      "{port}'s traffic council this morning unveiled the completed pedestrian sky-bridge connecting the market district to the transit hub, a project {n} cycles in the making and {percent}% over its original budget. Officials described the structure as 'a lasting investment in walkability.' Local residents described it as 'about time.' The bridge opens to the public next cycle following safety certification.",
      "After {n} cycles of construction, revised budgets, and at least one public forum that ended in raised voices, {port}'s pedestrian sky-bridge is complete. The council's transport chair cut the ceremonial ribbon and was photographed doing so from three different angles. Peak hour test loads are scheduled before the formal public opening. The catering contractor for the unveiling ran out of refreshments before the end of the speeches.",
    ],
  },
  {
    category: "local",
    template:
      "{planet} mayor opens new transit hub two cycles late, three over budget",
    story: [
      "{planet}'s new central transit hub opened this morning, {n2} cycles behind the original schedule and at a final cost {percent}% above the approved estimate. Mayor {ceo} cut the ribbon, described the facility as 'the right investment for the next generation of {planet} residents,' and did not take questions about the overrun. The hub serves {n2} daily connections and is, by all technical accounts, an excellent facility.",
      "The opening of {planet}'s transit hub marks the end of a project that has been a political fixture for {n} cycles. The final cost overrun and schedule extension have been debated in {n2} council sessions and two formal audits. Both audits attributed the delays to unforeseen subsurface conditions and design changes initiated by the mayor's office. The mayor has described the project as 'a success.' Opposition councilors have described it as 'a successful success that cost {percent}% more than it needed to.'",
    ],
  },
  {
    category: "local",
    template: "Civic statue of {ceo} unveiled at {port}; pigeons unimpressed",
    story: [
      "A civic statue of former {port} administrator {ceo} was unveiled in the main plaza yesterday in a ceremony attended by current officials, surviving family members, and approximately {n2} pigeons who appeared indifferent throughout. The statue depicts {ceo} in their characteristic posture — described by the sculptor as 'resolute' and by several attendees as 'the way {ceo} always looked when someone asked a budget question.' A plaque on the base summarizes {n2} cycles of public service.",
      "The {ceo} statue in {port}'s central plaza has already acquired the first layer of civic mythology: {n} separate groups claim the pose is modeled on a specific historical moment, none of which agree on which moment. The sculptor, for their part, said they worked from a photograph and tried to capture 'the essential {ceo}.' Pigeons were present at the unveiling and have been present at all documented visits since.",
    ],
  },
  {
    category: "local",
    template:
      "{port} farmer's market doubles in size; vendors triple in arguments",
    story: [
      "{port}'s farmer's market has expanded to fill the newly opened south pavilion, doubling available vendor space and, according to market managers, tripling the volume of inter-vendor disputes. The expansion was intended to reduce competitive tension by giving every vendor more room; initial evidence suggests the additional space has primarily given vendors more to argue about. Market management is introducing a formal mediation process.",
      "The {port} farmer's market expansion has been a commercial success: footfall is up {percent}% and revenue per vendor is tracking above projections for the opening cycles. It has also been an interpersonal challenge. The market's community board has received {n2} formal complaints since the expansion opened, covering space allocation, signage, access to the loading dock, and the location of one vendor's particularly pungent {commodity} display.",
    ],
  },
  {
    category: "local",
    template:
      "{planet} water rationing lifted after {n} cycles of {commodity} importation",
    story: [
      "{planet}'s district water authority has lifted the rationing order that has been in place for {n} cycles, following the successful completion of a {commodity}-based desalination supplementation program that has restored reservoir levels to operational capacity. Residents have been advised that normal usage protocols resume with immediate effect. The authority commended the community's conservation efforts, which they describe as having been 'more or less consistent throughout.'",
      "The end of {planet}'s water rationing period marks a significant moment for residents who have managed under restrictions for {n} cycles. The {commodity} importation program that bridged the shortfall cost the district authority {credits} and is considered by analysts to have been managed as efficiently as circumstances allowed. A post-rationing review will assess what infrastructure investments could reduce the risk of a recurrence. The review is expected to take {n2} cycles.",
    ],
  },
  {
    category: "local",
    template:
      "New library opens in {port} downtown, named after a deceased benefactor",
    story: [
      "The {port} downtown library, funded substantially through a bequest from the estate of {ceo}, opened its doors this morning after {n} cycles of construction. The building houses {n2},000 volumes, a public research terminal suite, and a reading room that community members have already described as 'the nicest room on this block.' The benefactor, who passed away {n2} cycles ago, specified in the bequest that the reading room be equipped with comfortable chairs.",
      "Attendance at the {port} library exceeded expectations on its opening day, with {n2} community members passing through the doors by midday. The head librarian described the welcome as 'heartening and also slightly overwhelming for staffing purposes.' The comfortable chairs specified in the original bequest are a particular success, according to {n2} visitors who lingered significantly longer than they had planned to.",
    ],
  },
  {
    category: "local",
    template:
      "{port} bus route 7 rerouted after sentient potholes refuse mediation",
    story: [
      "{port}'s transit authority has officially rerouted Bus Route 7 following the breakdown of mediation with the {n2} sentient potholes along the Meridian Strip that have been expanding their presence into the roadway in apparent protest of unresolved maintenance obligations. The transit authority stated that the new route adds {n} minutes to the average journey but is 'operationally preferable to the current situation.' The potholes have not commented publicly. Their advocate has.",
      "The sentient pothole situation on {port}'s Meridian Strip has produced one of the more unusual public infrastructure standoffs in recent local memory. The mediation process, which ran for {n} cycles, produced {n2} sessions, three proposed settlements, and no agreement. Legal counsel for the potholes maintains their clients have a legitimate maintenance grievance. The transit authority maintains that Route 7's operational requirements cannot accommodate beings who expand when displeased.",
    ],
  },
  {
    category: "local",
    template:
      "{planet} school board approves new curriculum, parents tentatively pleased",
    story: [
      "{planet}'s school board has voted {n2} to {n} to approve the revised curriculum framework that will take effect next academic cycle across all district institutions. The framework emphasizes applied science, practical civic knowledge, and, in what has been the most discussed element, a required course on interstellar navigation principles. Parent feedback gathered ahead of the vote was described by the board as 'cautiously supportive,' which the board chair translated in a press conference as 'better than we expected.'",
      "The {planet} curriculum approval follows {n2} cycles of review, public consultation, and two rounds of revisions driven by community feedback. The final version incorporates most of the changes requested by the parent-teacher coalition and a smaller subset of the changes requested by the district's business community. A formal review is scheduled at the {n2}-cycle mark. Parents described as 'tentatively pleased' by the local press are, on average, actually somewhat more pleased than that.",
    ],
  },
  {
    category: "local",
    template:
      "Elderly resident of {port} celebrates {n2}-cycle birthday, attributes longevity to spite",
    story: [
      "{port} resident and local personality {ceo} marked their {n2}-cycle birthday at a gathering in the community center yesterday, attended by {n2} family members, {n2} neighbors, and the district councilor who once tried to rezone the block. Asked by a reporter to attribute their longevity, {ceo} said 'spite and a good mattress,' in that order. The mattress manufacturer's name has not been released. The district councilor sent flowers.",
      "The {n2}-cycle birthday party for {port}'s elder resident was, by all accounts, the social event of the local season. {ceo} received {n2} official commendations, a proclamation from the district authority, and a cake that took {n} bakers and is currently feeding the community center through the week. Asked whether they recommend spite as a life strategy, {ceo} said they recommend 'whatever gets you through the bit that comes after the easy part.'",
    ],
  },
  {
    category: "local",
    template:
      "Power outage on {port} block resolved after {n} hours, kettle saved",
    story: [
      "A power outage affecting {n2} residences and three small businesses on {port}'s eastern residential block was resolved after {n} hours, following the identification of a fault in the secondary distribution line that {empire}'s utility authority described as 'unusual but not unprecedented.' All affected properties have power restored. A resident who chose to speak to local media on condition of anonymity confirmed that the kettle, which had been mid-cycle at the time of the outage, was saved.",
      "The {port} block outage prompted {n2} calls to the utility authority's fault reporting line and a community mutual support response that the district councilor has praised as 'exactly what a community does.' The fault — a corroded junction in the secondary distribution network — is being reviewed for systemic implications. Infrastructure survey teams will inspect the adjacent distribution lines over the next {n2} cycles.",
    ],
  },
  {
    category: "local",
    template:
      "{port} street fair this weekend; {commodity} festival expected to disappoint mildly",
    story: [
      "{port}'s annual street fair opens this weekend with an expanded {commodity} festival component that organizers are billing as the most ambitious iteration of the event in its {n2}-cycle history. Previous years' {commodity} festivals have been assessed by attendees as pleasant but underwhelming, a pattern that festival curators say they have specifically addressed this year. Initial vendor sign-ups support cautious optimism. The weather forecast is neutral.",
      "The street fair's {commodity} festival has been the subject of diplomatic local debate for several cycles, with supporters of the tradition and critics of its execution both claiming the moral high ground. This year's curators have publicly committed to a higher standard. They have also quietly capped attendance in the {commodity} zone to manage expectations. Local journalists will be present throughout and have been offered no preferential access, which they have noted approvingly.",
    ],
  },
  {
    category: "local",
    template: "{planet} hospital adds new wing dedicated to {empire} settlers",
    story: [
      "{planet}'s regional hospital has opened its new wing designed specifically to serve the growing {empire} settler community in the district, offering culturally adapted care protocols, translation services, and dietary accommodation across {n2} wards. The wing was funded jointly by the hospital authority and an {empire} community foundation grant. Hospital leadership described the opening as 'a recognition that good care requires cultural understanding.'",
      "The new hospital wing serves a community that has been growing in {planet}'s district for {n} cycles and has historically experienced friction with standard care protocols. Community representatives at the opening ceremony described it as long overdue and exactly right. The wing's head of clinical services, who came through the {empire} settler community themselves, said the design reflected {n2} years of listening to what patients actually needed.",
    ],
  },
  {
    category: "local",
    template:
      "Pothole repair on {port} main strip enters phase {n}; locals adjust commute",
    story: [
      "Pothole remediation work on {port}'s main commercial strip has entered phase {n} of what the road authority originally projected as a {n2}-phase project. The current phase covers the central block between the transit hub and the market district, restricting traffic to a single shared lane and adding an estimated {n} minutes to standard commute times. The phase is expected to conclude within {n2} cycles. Locals report having adjusted.",
      "The phase {n} works on {port}'s main strip have been absorbed into the community's daily rhythm with the stoic acceptance that characterizes long-term infrastructure disruption. {n2} new traffic management volunteers have joined the crossing program, an informal institution that began in phase {n2} when the lights were removed. The road authority's public update confirmed that phases {n} through {n2} remain on schedule, a statement that {n2} residents confirmed finding 'difficult to assess given prior phases.'",
    ],
  },
  {
    category: "local",
    template:
      "Local pet on {planet} returns home after {n2} cycles missing, brings friends",
    story: [
      "The {ceo} family's domestic animal, reported missing {n2} cycles ago and the subject of a widely shared search notice, returned to the family home yesterday evening under its own apparent initiative. It brought with it {n} additional animals of the same species. The family, who confirmed the animal's identity and apparent health, said they were 'very glad it's home and are currently working out the friends situation.'",
      "Community response to the return of {planet}'s most talked-about missing pet has been warm, with {n2} neighbors turning up to welcome it back. The additional companions have been described by wildlife authorities as healthy and, based on preliminary assessment, not locally native — suggesting the original animal traveled farther during its absence than the search focused on. The family has contacted the district animal authority for guidance on the companions.",
    ],
  },
  {
    category: "local",
    template:
      "{port} council adopts new recycling bins; bins recycled from old recycling bins",
    story: [
      "{port}'s district council has rolled out its new recycling bin programme, deploying {n2},000 standardized receptacles across the service area. The bins are fabricated in part from material recovered from the previous generation of recycling bins, which were retired after {n} cycles of service. The council's sustainability office described the circularity as 'appropriate' and confirmed that the manufacturing process added approximately {percent}% less material to the system than starting from scratch.",
      "The {port} bin rollout has generated genuine positive community reception alongside the inevitable volume of feedback about bin colours, placement, and the size of the apertures. The council's sanitation team has confirmed that the aperture dimensions were tested against {n2} waste sample categories and meet current specifications. Feedback about the colours is being noted.",
    ],
  },
  {
    category: "local",
    template:
      "Volunteer cleanup at {planet} canal removes {tonnage} of debris, two oddities",
    story: [
      "Community volunteers working the annual {planet} canal cleanup pulled {tonnage} of debris from the waterway over a {n}-cycle effort involving {n2} participants. Environmental monitors confirmed the canal's baseline clarity improved by {percent}%. The cleanup also surfaced two items described in the official volunteer report as 'oddities of undetermined origin,' which have been transferred to the local heritage authority for assessment. The items were described by witnesses as neither natural nor modern manufactured.",
      "This cycle's {planet} canal cleanup exceeded previous records for debris removed, aided by a {percent}% higher volunteer turnout and new water-extraction equipment provided by the district authority. The two unusual objects recovered are currently being assessed by the heritage unit, which has said publicly only that they are 'of interest.' Canal condition ratings have been upgraded. The cleanup committee has already begun planning for next cycle.",
    ],
  },
  {
    category: "local",
    template:
      "{port} elementary school wins regional debate trophy, brings home {commodity}",
    story: [
      "Students from {port} elementary took first place at the regional academic debate championship, defeating {n2} competing schools across three rounds on topics that included interstellar resource rights and the ethics of terraforming. The winning team returned to {port} with the regional trophy and, in what the school's head teacher described as 'a tradition the teachers did not start but have come to appreciate,' a quantity of {commodity} provided by the hosting school as a post-competition gift.",
      "{port} elementary's debate team has been building towards this result for {n2} cycles, with consistent coaching investment and a student cohort that the team coach describes as 'unusually willing to prepare and also argue with me about preparation.' The {commodity} gift was a first for the school. It has been allocated partly to a community celebration and partly to the school kitchen.",
    ],
  },
  {
    category: "local",
    template:
      "Construction at {port} intersection enters {n2}th week, drivers philosophical",
    story: [
      "Intersection works at {port}'s main junction have entered their {n2}th week with no announced completion date update from the road authority. Commuters navigating the extended detour routes have been observed by local journalists to have passed through stages of frustration, adaptation, and what one commuter described as 'a kind of peace.' The works, originally scoped at {n} weeks, are addressing subsurface infrastructure that the road authority described as 'more complicated than the survey suggested.'",
      "The {port} intersection project has outlasted three traffic flow management plans, one contractor handover, and the patience of approximately {n2},000 daily commuters who have nonetheless continued to commute. Local discussion has shifted from 'when will this end' to 'what would it feel like if this ended' — a philosophical development that the road authority's communications team has noted without comment. A progress update is promised for next cycle.",
    ],
  },
  {
    category: "local",
    template:
      "{planet} farmer's almanac predicts pleasant cycle, ignores all evidence",
    story: [
      "{planet}'s traditional farmer's almanac, published on its {n2}-cycle anniversary, predicts a uniformly pleasant growing cycle with above-average precipitation, mild temperatures, and no significant disruption events. This prediction is at variance with {n2} independent meteorological models, three separate university climate assessments, and the personal recollection of farmers who have been reading the almanac long enough to compare it against outcomes. The almanac's publisher described the methodology as 'time-tested.'",
      "The {planet} farmer's almanac prediction of an idyllic cycle has been greeted with the warm skepticism it traditionally receives. Almanac supporters note its long publication history. Critics note its accuracy record. Farmers who rely on it note that, regardless of accuracy, it has traditionally been correct about {commodity} prospects in late-cycle, a fact for which no one has a satisfying explanation. Pre-orders for the physical edition are {percent}% above the previous cycle.",
    ],
  },
  {
    category: "local",
    template:
      "{port} community center reopens after fire; smell of {commodity} still mild",
    story: [
      "{port}'s community center has reopened following {n} cycles of repairs to fire damage sustained during an incident in the eastern meeting rooms. The building has been fully restored, certified for occupancy, and furnished with replacement equipment purchased through a community fundraising drive that exceeded its target. The only lingering consequence noted by the community center's director at the reopening ceremony is a residual smell of {commodity} from the affected wing, which they described as 'mild and expected to clear.'",
      "The community center reopening was marked by a ceremony that the local paper described as 'genuinely joyful.' {n2} community members turned out, including several who had been first responders during the original fire. The fundraising committee that organized the equipment replacement presented a full accounting of contributions and expenditures, which the director praised as 'scrupulously transparent.' The {commodity} smell has been confirmed mild by {n2} independent assessors.",
    ],
  },
  {
    category: "local",
    template: "Local sentient hedge wins {planet} garden contest by default",
    story: [
      "The biennial {planet} garden contest has concluded with the sentient hedge maintained by the {ceo} property claiming first prize, in a result that the judging panel described as 'both meritocratic and uncomplicated.' The other {n2} entries were competitive on conventional horticultural measures; the sentient hedge's capacity to rearrange its own topology in response to wind direction produced a display that the chief judge described as 'technically a garden and also something more than that.' The hedge declined the trophy on procedural grounds.",
      "{planet}'s garden contest judges acknowledged, in their written decision, that awarding first prize to a sentient hedge raised questions about category definitions that they are not equipped to resolve. They nonetheless awarded the prize, citing the contest's stated criteria: beauty, originality, and cultivation skill. On all three, the hedge scored highest. The runner-up, who produces exceptional {commodity} cultivars, described the result as 'fair but annoying.'",
    ],
  },
  {
    category: "local",
    template:
      "{port} parade cancelled after lead float experiences existential lag",
    story: [
      "{port}'s annual civic parade was cancelled forty minutes before its scheduled start after the lead float — a {n2}-ton mobile installation designed by the district arts collective — entered what its operators described as 'existential lag': a state where the float's autonomous navigation system became unable to move because it could not resolve conflicting priorities between staying on route, avoiding crowds, and 'the broader question of why.' The float is currently stationary at the assembly point. Engineers are reviewing the code.",
      "The {port} parade cancellation has divided community opinion on whether the lead float's existential lag is a technical failure or an event in itself. The arts collective that designed the float has issued a statement that does not clearly identify which interpretation they prefer. Parade organizers have confirmed the event will be rescheduled pending resolution of the navigational philosophy conflict. Three alternative parade dates have been proposed. The float has been asked if it has a preference and has not responded.",
    ],
  },
  {
    category: "local",
    template:
      "{port} library hosts {commodity} sculpture exhibit, attendance moderate",
    story: [
      "{port} central library's current gallery program features {n2} works in the {commodity} sculpture exhibit curated by local artist {ceo}, which has drawn moderate attendance since its opening last cycle. The library's events coordinator described the turnout as 'in line with expectations for the format' and noted that {n2} community members had left written feedback, most of it thoughtful. The exhibit runs for {n} additional cycles.",
      "The {commodity} sculpture exhibit at {port} library occupies the ground-floor gallery and is, by the library's own assessment, performing modestly. Attendance figures are published weekly; week three was the highest, which the curator attributes to a review in the district paper that described one piece as 'unsettlingly beautiful.' The library has extended the exhibit for one additional cycle on the basis of this response.",
    ],
  },
  {
    category: "local",
    template:
      "Mayor of {port} apologizes for jokes during ribbon cutting, ribbon survives",
    story: [
      "{port}'s mayor has issued a formal apology for remarks made during yesterday's ribbon-cutting ceremony at the new district administrative building, which were described by attendees variously as 'inappropriate,' 'surprising,' and 'technically accurate but ill-timed.' The ribbon, which was ceremonially cut at the conclusion of the remarks, survived the event intact and has been displayed in the building lobby. The mayor has offered no additional context for the remarks.",
      "The ribbon-cutting remarks made headlines that the new administrative building's designers had not anticipated generating. The building itself — which features a celebrated accessible design and several civic amenities — received less coverage than the mayor's three-sentence departure from the prepared statement. The building's lead architect noted in a brief interview that they remain proud of the work and hope it eventually gets attention on its own merits.",
    ],
  },
  {
    category: "local",
    template: "{planet} weather predicts rain; rain predicts {planet} weather",
    story: [
      "{planet}'s meteorological bureau issued its standard weekly forecast this morning, predicting rain for {n2} out of seven days. The city's three most frequently cited informal weather predictors — a long-established market stall holder, a semi-retired navigator who claims to read cloud formations, and an app built by a local student — all predicted identical conditions, which matches the bureau's forecast exactly. Meteorologists describe this level of informal accuracy as 'occasional but not unprecedented for {planet}.'",
      "Local weather discussion on {planet} has always had a particular character, given the planet's atmospheric patterns that experienced residents describe as 'the weather knows it's being watched.' The bureau's forecast, the informal predictors, and the week's actual conditions will be compared in the community weather tracking project that has been maintained for {n2} cycles. Current accuracy rates across all sources are within {percent}% of each other, which statistical analysts describe as either notable or coincidental.",
    ],
  },
];

// ── Health templates ──────────────────────────────────────────
const healthTemplates: FlavorTemplate[] = [
  {
    category: "health",
    template: "Longevity clinic opens on {port}; package starts at {credits}",
    story: [
      "A new longevity medicine clinic has opened its doors on {port}'s medical district, offering comprehensive life-extension protocols with base packages starting at {credits}. The clinic's founding director described the offering as 'scientifically rigorous and therefore not inexpensive.' Appointment availability for the opening cycle has already been exhausted. A waitlist is operational.",
      "The {port} longevity clinic is the {n2}th such facility to open in the sector this cycle, part of a trend that health economists are tracking with interest. Early intake data suggests the primary patient demographic is {empire} corporate executives, a population that the clinic's marketing has not discouraged. Independent medical reviewers have noted that the underlying protocols are evidence-based and the pricing reflects demand.",
    ],
  },
  {
    category: "health",
    template:
      "{empire} health authority recalls {commodity} batch after {n2} reports of mild glow",
    story: [
      "{empire}'s food and health authority has issued a recall for a production batch of {commodity} following {n2} consumer reports of a mild luminescent quality observed in the product and, in some cases, in the consumers who had used it. The authority described the glow as 'not dangerous based on current assessment' and the recall as precautionary. Independent testing is underway. Affected batch numbers have been published on the authority's official notice board.",
      "The {commodity} recall issued by {empire}'s health authority has attracted significant public attention, primarily because the reported symptom — mild bioluminescence — is unusual enough to generate coverage well beyond the recall's actual risk profile. The authority's statement that the glow is 'not dangerous based on current assessment' has been widely shared, with emphasis placed on the qualifier. The {n2} affected individuals have been contacted and are being monitored.",
    ],
  },
  {
    category: "health",
    template:
      "Vaccination drive in {sector} reaches {percent}% coverage milestone",
    story: [
      "The joint vaccination programme covering {sector}'s inhabited systems has reached {percent}% population coverage, a milestone that the {empire} public health consortium described as 'the result of sustained community trust and logistical coordination that was more difficult than it looked.' The coverage threshold is associated with herd immunity effects for {n2} of the {n} targeted pathogens. The remaining communities below threshold have been individually assessed and outreach programs are active.",
      "Public health officials across {sector} have acknowledged the {percent}% coverage achievement with measured satisfaction, noting that the final {percent}% of target population typically represents the hardest to reach. Programme data shows that mobile clinic operations in {n2} outer settlements were the single most effective coverage intervention. The sector programme has been nominated for the {empire} public health coordination award.",
    ],
  },
  {
    category: "health",
    template:
      "Hospital on {planet} pioneers neural repair; success rate now {percent}%",
    story: [
      "{planet}'s central medical institute has published outcomes data showing its neural repair programme, now entering its {n2}nd cycle of operation, has achieved a {percent}% successful restoration rate across {n2} patients. The procedure addresses traumatic neural pathway damage that was previously considered irreversible. The institute's lead surgeon described the results as 'beyond what we originally modeled as achievable.' The programme is currently capacity-constrained; referral criteria are published on the institute's medical network page.",
      "The {planet} neural repair outcomes report has been widely cited since its publication, representing the strongest clinical evidence yet for the procedure's efficacy. The {percent}% success rate is notably higher than the {percent}% achieved at the programme's inception {n2} cycles ago, reflecting both refined technique and improved patient selection protocols. External reviewers have endorsed the methodology and called for parallel programmes in {n2} other sector facilities.",
    ],
  },
  {
    category: "health",
    template: "Outbreak of {adj} fever on {planet} contained within {n} cycles",
    story: [
      "{empire}'s disease monitoring authority has confirmed that the outbreak of {adj} fever identified at {planet}'s northern settlement cluster has been contained within {n} cycles of initial detection, with no further spread beyond the original affected area. {n2} residents were symptomatic; all have been treated and {percent}% have fully recovered. The rapid containment was attributed to early detection through {empire}'s enhanced surveillance network and the cooperation of community health workers on the ground.",
      "The {adj} fever containment on {planet} represents a successful response under {empire}'s revised outbreak protocol, which compresses the initial containment phase to {n} cycles from the previous {n2}-cycle benchmark. Public health analysts have noted the outcome as a proof-of-concept for the enhanced early detection network funded last cycle. The affected community has been cleared and normal activity has resumed. Residual monitoring will continue for {n2} additional cycles.",
    ],
  },
  {
    category: "health",
    template:
      "{empire} medical board licenses uplift therapy for {commodity} workers",
    story: [
      "{empire}'s medical licensing board has approved the use of cognitive uplift therapy for workers in {commodity} extraction industries, recognizing the professional need to manage high-complexity, high-fatigue operational environments. The approval follows {n2} cycles of clinical trials and a contested regulatory review that divided the board {n} to {n2}. The approved protocols specify maximum uplift duration and mandatory recovery periods. Worker advocacy groups have described the licensing as 'a step forward that will require careful monitoring.'",
      "The uplift therapy licensing decision for {commodity} workers reflects years of regulatory debate about the intersection of occupational health and cognitive enhancement. {empire}'s board approved the therapy with conditions that the lead approval reviewer described as 'substantive guardrails, not decorative ones.' Industry bodies representing {commodity} operations have welcomed the ruling. Medical ethicists have welcomed the guardrails and have continued monitoring.",
    ],
  },
  {
    category: "health",
    template: "Genetic counseling lines on {port} backlog now {n2} cycles deep",
    story: [
      "Genetic counseling services at {port}'s regional health authority are currently operating under a {n2}-cycle appointment backlog, driven by a combination of increased demand following the release of the expanded gene-mapping protocol and a staffing shortfall that the authority has been attempting to address for {n} cycles. The authority has opened an emergency intake line for cases flagged as clinically urgent. All others are on the standard waiting list.",
      "The {port} genetic counseling backlog has drawn attention from {empire}'s health ministry, which has flagged it in its quarterly service performance report as a capacity concern. The authority's position — that demand expanded faster than workforce training pipelines allow — is acknowledged as accurate and unresolvable in the short term. {n2} additional counselors are in training and will enter the workforce within {n} cycles.",
    ],
  },
  {
    category: "health",
    template:
      "Telemedicine network spans {sector}; latency reduces by {percent}%",
    story: [
      "{empire}'s telemedicine infrastructure expansion has now connected every registered healthcare facility in {sector}, and the latest performance data shows average consultation latency has dropped {percent}% following the deployment of {n2} new relay nodes across the sector's outer systems. Rural and deep-space facilities that previously operated with significant communication delay now receive real-time specialist consultation access. The programme's lead coordinator described the connectivity milestone as 'the point where telemedicine becomes indistinguishable from present medicine.'",
      "Latency improvements in {sector}'s telemedicine network are directly translating to patient outcomes in remote facilities, according to the quarterly outcomes report from {empire}'s health coordination office. The {percent}% latency reduction, while technical in its nature, maps to a measurable reduction in diagnostic delays for patients at {n2} outer facilities. The network's next phase covers {n2} additional systems currently served only by periodic in-person medical visits.",
    ],
  },
  {
    category: "health",
    template:
      "{company} pharma subsidiary recalls painkiller; replacement also being recalled",
    story: [
      "{company}'s pharmaceutical division has issued a recall for its market-leading painkiller line following quality assurance concerns flagged by {empire}'s health regulator. The company simultaneously confirmed that the replacement product introduced last cycle — developed partly in anticipation of the original's eventual withdrawal — is also subject to a separate recall for a distinct formulation issue. {company}'s communications team described the situation as 'a coincidence that has been addressed comprehensively.' The health regulator described it as 'a situation requiring oversight.'",
      "The dual recall at {company}'s pharma subsidiary has raised questions in the health community about the company's quality assurance pipeline. Both recalls are attributed to different manufacturing process failures, which the regulator notes means the root cause review must address at least two separate systemic issues. {company} has announced a third-party audit to run concurrently with both recalls. Patients using the affected products have been given bridging prescriptions via emergency protocols.",
    ],
  },
  {
    category: "health",
    template:
      "Surgeons on {planet} debut zero-g spine repair; patient {percent}% taller",
    story: [
      "A surgical team at {planet}'s orthopaedic institute has completed the first clinical application of their zero-gravity spinal decompression repair protocol, working aboard a purpose-equipped orbital facility to perform the procedure under conditions that allow spinal structures to decompress naturally. The patient, confirmed in full recovery, measured {percent}% taller in post-operative assessment — a figure that the lead surgeon describes as 'an expected consequence of disc restoration, not a design goal.' The patient described being slightly taller as 'a bonus.'",
      "The zero-g spine repair procedure completed at {planet}'s orbital surgical suite has drawn significant attention from the orthopaedic medicine community, with {n2} institutions already requesting protocol documentation for replication trials. The {percent}% height gain reported by the first patient is the highest figure recorded in the procedure's pre-clinical testing; the surgical team has noted individual variation is expected. Three more procedures are scheduled in the coming cycles.",
    ],
  },
  {
    category: "health",
    template:
      "Galactic flu season opens; {empire} clinics report shortage of {commodity}",
    story: [
      "{empire}'s flu season has begun two cycles earlier than projected, with clinic networks across the sector reporting a {percent}% increase in respiratory illness presentations above the seasonal baseline. The early surge has depleted stocks of {commodity}, which is used in the front-line treatment protocol, faster than procurement schedules anticipated. {empire}'s health logistics authority has activated emergency supply arrangements. Clinics are operating under conservation protocols while restocking occurs.",
      "The early flu season and the {commodity} shortage are, according to {empire}'s chief medical officer, 'a supply chain problem layered on top of an epidemiological problem.' The shortage is expected to resolve within {n2} cycles; the flu season will peak before that resolution. Clinics have been advised on substitution protocols and rationing criteria for the interim period. Public health messaging encouraging early treatment has been updated to reflect current availability constraints.",
    ],
  },
  {
    category: "health",
    template:
      "{empire} ban on cloning amended after lawyers cloned the previous ban",
    story: [
      "{empire}'s legislative council has amended its standing prohibition on unauthorized cloning, after a legal challenge arose from a firm that had replicated the prohibition documentation itself as part of a precedent research exercise — technically falling under the original ban's language. The amendment clarifies that the prohibition applies to biological entities and specifically excludes legal document reproduction. Three law firms have issued statements describing the previous language as 'instructive.'",
      "The amended {empire} cloning ban has attracted more attention for how it came to be amended than for what it says. The legal firm that inadvertently cloned the prohibition document has not confirmed whether the event was strategic or genuinely accidental. Legal scholars are divided on whether the original language constituted a self-referential paradox. The {empire} council's drafting committee has been quietly enlarged.",
    ],
  },
  {
    category: "health",
    template:
      "Mental health awareness week in {sector}; productivity briefly drops {percent}%",
    story: [
      "{sector}'s annual mental health awareness week opened with events across {n2} inhabited systems, including public education campaigns, subsidized consultation access, and a {empire}-funded peer support network rollout that has been in preparation for {n2} cycles. Economic monitoring agencies noted a {percent}% productivity reduction across the sector during the week, which the {empire} mental health commissioner described as 'expected and good, actually — it means people are taking the time.'",
      "Mental health awareness week in {sector} logged its highest participation rate in {n2} cycles, with {n2} residents accessing at least one programme element. The {percent}% productivity dip, noted in the sector's economic brief, sparked a discussion in several business networks about whether awareness weeks should be redesigned to avoid measurable output impact. {empire}'s health commissioner responded that the alternative — lower awareness and higher untreated illness — was also a productivity concern and one that didn't get a line in the brief.",
    ],
  },
  {
    category: "health",
    template:
      "Dental implant breakthrough at {planet} institute; chewing efficiency up {percent}%",
    story: [
      "Researchers at {planet}'s biotechnology institute have published clinical trial results for a new dental implant matrix that improves occlusal force transmission, producing a measured {percent}% increase in chewing efficiency across {n2} trial participants. The implants also showed {percent}% better integration rates than standard titanium-ceramic alternatives over the {n2}-cycle trial period. The research team is in discussion with {n2} dental device manufacturers about licensing arrangements.",
      "The {planet} dental implant study has received unusual coverage for a dentistry paper, partly because the lead researcher has a gift for accessible scientific communication and partly because '{percent}% better at chewing' is a finding that a broad public can immediately relate to. Pre-licensing interest from manufacturers has been described by the institute as 'substantial.' The research team notes that replication across different demographic cohorts is still needed before the findings can be considered fully generalized.",
    ],
  },
  {
    category: "health",
    template:
      "Eye surgery on {planet} gives recipients {adj} vision, debate ongoing",
    story: [
      "A specialist vision restoration programme at {planet}'s ocular surgery centre has produced {adj} visual acuity outcomes in {percent}% of its {n2} surgical patients — a result that represents a significant improvement over standard restoration benchmarks but has prompted debate in the medical community about whether '{adj} vision' is a desirable clinical endpoint without further characterization. The programme's lead surgeon has called for a standardized definition before further trials proceed. Patients who received the surgery have generally said they are pleased.",
      "The ongoing debate over the {planet} vision surgery outcomes reflects a broader tension in enhancement-adjacent medicine between patient satisfaction measures and clinical classification standards. The {percent}% of patients with {adj} outcomes report higher subjective visual satisfaction than the control group. Regulatory reviewers want a more precise clinical descriptor before approving wider adoption. The surgery team has proposed a working group. Patients have proposed the surgery team focus on the {percent}%.",
    ],
  },
  {
    category: "health",
    template:
      "Herbal remedy on {port} found to be {percent}% placebo, {percent}% paint",
    story: [
      "A popular herbal remedy sold at {port}'s open market has been tested by {empire}'s consumer safety authority and found to contain no active botanical compounds. Analysis showed the product is {percent}% inert binder, with the remaining {percent}% attributable to a trace coating compound that the authority's report describes, without elaboration, as consistent with industrial paint. The vendor has been issued a cease-supply notice. Sales had been strong for {n2} cycles.",
      "Consumer safety investigators who tested the {port} remedy described the paint finding as 'unexpected in the context of a wellness product.' The amount involved is at levels the authority considers sub-toxic. The placebo proportion of the product is not, by itself, regulated; the paint is. The vendor has exercised their right to appeal the cease-supply notice. Sales data from the {n2}-cycle period of active supply has been requested by the authority.",
    ],
  },
  {
    category: "health",
    template:
      "{empire} hospitals adopt AI triage; queue still long, just better-organized",
    story: [
      "{empire}'s network of public hospitals has completed rollout of an AI-assisted triage system across {n2} facilities, following a {n}-cycle implementation program. Early data shows the system has reduced average triage processing time by {percent}% and improved clinical priority accuracy ratings. The queue for treatment, {pundit} noted in a sector briefing, is approximately the same length as before — but patients within it are in a demonstrably better order. Hospital administrators have described this as 'the intended outcome.'",
      "Post-implementation assessment of {empire}'s hospital AI triage system shows the improvements are real and the remaining limitations are structural: the AI can sort patients more accurately, but it cannot add capacity. {empire}'s health ministry has indicated that the triage rollout is one component of a broader capacity investment plan. Clinicians working with the system have described it as 'genuinely useful and occasionally overly confident about edge cases,' which the development team is addressing in the next version.",
    ],
  },
  {
    category: "health",
    template:
      "Birthrate on {planet} ticks up {percent}%; daycare waitlists explode",
    story: [
      "{planet}'s latest demographic data shows a {percent}% increase in the birth rate, representing the first sustained uptick after {n2} cycles of gradual decline. Demographers attribute the change to a combination of economic stabilization, the recent habitation expansion, and what one researcher described as 'factors that are difficult to model.' The increase has immediately stressed existing childcare infrastructure, with daycare waitlists across {planet}'s urban centres extending to {n2} cycles.",
      "The {planet} birthrate increase has triggered a cascade of infrastructure reassessment that the planet's planning authority acknowledges was not positioned ahead of the trend data. The daycare waitlist situation is the most visible pressure point, but primary school capacity projections are also under review. The planet's chief planner said new capacity development is 'already in process' and that the demographic signal was visible 'some cycles ago, in retrospect.'",
    ],
  },
  {
    category: "health",
    template:
      "Robotics-assisted surgery succeeds on {n2}th attempt at {planet} clinic",
    story: [
      "A robotics-assisted surgical procedure at {planet}'s regional clinic was completed successfully on its {n2}th operational attempt, following {n} failed trial runs that the clinic's surgical director described as 'valuable learning experiences that we would prefer not to have had.' The successful procedure demonstrates the technique is clinically viable under {planet}'s specific facility conditions, which differ from the standard protocol environment in ways that required {n}-specific adaptations. The surgical team has published a technical note on the adaptations.",
      "The {n2}th-attempt success at {planet}'s robotics surgery programme has been received with qualified celebration by the medical community. The qualification is over the trial count; the celebration is over the outcome. The surgical director has noted that {n2} attempts is not unusual for a new procedure being adapted to a non-standard clinical environment and that all {n} preceding runs produced useful data. The adapted protocol has been submitted for external review and certification.",
    ],
  },
  {
    category: "health",
    template:
      "Cosmic-radiation-induced rash sweeps {sector}; cure: more sun, less radiation",
    story: [
      "A dermatological condition linked to an elevated cosmic ray flux event in {sector} has been recorded across {n2} affected individuals in {n} separate systems, characterized by a distinctive banding pattern that specialists are calling 'sector rash' pending formal classification. {empire}'s public health authority has confirmed the radiation link and issued guidance: reduce direct radiation exposure and increase time in environments with solar-spectrum lighting. The guidance has been summarized in public messaging as 'more sun, less radiation,' a formulation that dermatologists have noted requires careful reading.",
      "The sector rash advisory from {empire}'s health authority has generated questions from residents who live in environments where both 'more sun' and 'less radiation' are difficult to operationalize simultaneously. The authority's clarification distinguishes between cosmic radiation at elevated flux levels and standard solar-spectrum UV, which is not currently elevated. Protective protocols for outdoor workers in {sector} have been updated. The flux event is expected to return to baseline within {n2} cycles.",
    ],
  },
  {
    category: "health",
    template:
      "{empire} surgeons graft sentient kelp into volunteer's spine; volunteer pleased",
    story: [
      "{empire}'s experimental augmentation programme has completed its first human application of sentient kelp neural interface grafting, in a procedure carried out on a consenting volunteer at {planet}'s advanced biotechnology clinic. The graft, which integrates the kelp's distributed sensing network with the recipient's spinal architecture, was developed over {n2} cycles and passed {empire}'s ethics review after considerable deliberation. The volunteer, assessed at {n2} cycles post-procedure, reported enhanced proprioceptive awareness and described themselves as 'definitely pleased, and also slightly wetter in a metaphysical sense.'",
      "Post-operative assessment of the kelp spinal graft volunteer shows stable integration and no adverse immune response over the {n2}-cycle monitoring period. The procedure's lead researcher described the outcome as 'better than our most optimistic model.' The volunteer has become an informal public advocate for the programme and has agreed to extended monitoring. {empire}'s bioethics board has released a statement clarifying the conditions under which further applications may proceed.",
    ],
  },
  {
    category: "health",
    template:
      "Public health study finds {percent}% of {planet} residents have not slept properly",
    story: [
      "A population-wide sleep quality study conducted by {planet}'s health authority found that {percent}% of the adult population reported sleep patterns that researchers classified as clinically insufficient across at least {n2} of seven measured parameters. The study, covering {n2},000 respondents, attributes the finding to a combination of extended work cycles, ambient light pollution in residential zones, and what the lead researcher described as 'a cultural relationship with sleep that treats it as optional.' A public health campaign is being developed.",
      "The {planet} sleep study findings have been described as 'striking and probably accurate' by health commentators who note that {percent}% is both a large number and intuitively consistent with the experience of living on {planet}. The study's intervention recommendations are practical but, the researchers acknowledge, depend on structural changes — specifically in shift scheduling and residential light ordinances — that are not within public health's direct authority to mandate. A cross-ministry working group has been proposed.",
    ],
  },
  {
    category: "health",
    template:
      "{commodity} now classified as 'mostly therapeutic' by {empire} board",
    story: [
      "{empire}'s medical classification board has updated the regulatory status of {commodity} to 'mostly therapeutic,' a category that did not previously exist in the regulatory framework and has been created specifically to accommodate the compound's evidence profile — which shows consistent benefit across a range of approved applications and inconsistent benefit in {n2} others. The new classification allows clinical use under supervised protocols and restricts direct-to-consumer marketing to approved indication language. Both users and critics of {commodity} have described the ruling as 'fine, I suppose.'",
      "The 'mostly therapeutic' classification issued for {commodity} has prompted regulatory scholars to examine whether the {empire} board intended to create a new category or to describe an existing situation more precisely. The board's stated position is the latter: the evidence has always been mixed; the classification now says so. Manufacturers of {commodity} have updated their documentation. Alternative medicine practitioners who have been recommending it for years have described the ruling as 'a partial vindication, at best.'",
    ],
  },
  {
    category: "health",
    template: "Pediatric ward on {planet} opens new wing for {adj} aliens",
    story: [
      "{planet}'s regional hospital has opened a dedicated pediatric wing designed to serve young patients from {adj} alien species that have established communities in the district over the past {n2} cycles. The wing incorporates species-specific environmental controls, nutrition facilities, and care protocols developed in consultation with {adj} medical practitioners. The hospital's chief of pediatrics described the opening as 'a long overdue recognition that this community's children deserve the same standard of care as everyone else's.'",
      "The new {adj} alien pediatric wing at {planet}'s hospital represents the culmination of a {n}-cycle community advocacy effort led by families who had been travelling to specialist facilities in {empire}'s core systems for paediatric care. The wing's {n2}-bed capacity covers current community demand with room for projected population growth. The {adj} community association has pledged ongoing participation in the wing's review committee.",
    ],
  },
  {
    category: "health",
    template:
      "{port} pharmacist replaces label printer, errors drop {percent}%",
    story: [
      "{port}'s central pharmacy has reported a {percent}% reduction in dispensing label errors since replacing its {n2}-cycle-old label printing system with a current-model networked unit, according to the pharmacy's quarterly quality report. The previous system had been producing degraded print quality that required manual verification for {percent}% of outputs — a process that itself introduced errors under high-volume conditions. The new system has eliminated both problems simultaneously. The pharmacy director described the improvement as 'significant and also embarrassingly straightforward.'",
      "The {port} pharmacy label printer replacement, which cost {credits}, has produced demonstrable patient safety improvements that the district health authority has cited in its infrastructure investment justification documents. The case for replacing the printer was made {n2} cycles ago by the pharmacy's quality assurance officer and declined on budget grounds for {n} consecutive cycles. The authority's current documentation does not acknowledge this history.",
    ],
  },
];

const religionTemplates: FlavorTemplate[] = [
  {
    category: "religion",
    template: "Cult of the Frozen Logician schisms over heat-death debate",
    story: [
      "The Cult of the Frozen Logician has formally split into two factions following an irreconcilable disagreement over the theological implications of universal heat death. The schismatic faction, calling itself the Order of the Final Entropy, holds that heat death is a sacred endpoint to be welcomed; the original body rejects this reading as 'a distortion of the Founder's clearly metaphorical language.' Both factions have retained legal counsel regarding custody of the order's central archives. An independent mediator has been requested but not yet confirmed.",
    ],
  },
  {
    category: "religion",
    template:
      "{empire} interfaith council adds {n}th deity, removes one nobody worshipped",
    story: [
      "The {empire} Interfaith Coordinating Council has voted to expand its recognized pantheon to {n} deities following an application from the newly registered Church of the Resonant Tide. The vote was accompanied by a complementary removal of a deity described in council minutes as 'historically recognized but without active congregational representation for {n2} cycles.' The removed deity's former worshippers, numbering three, were informed by post. The incoming deity's representatives expressed gratitude and offered a brief ceremonial reading, which was well received.",
    ],
  },
  {
    category: "religion",
    template:
      "Pilgrimage season on {planet} opens; capacity capped at {n2},000",
    story: [
      "The pilgrimage authority on {planet} has formally opened the season with a new capacity limit of {n2},000 participants, down from the previous cycle's unrestricted access policy, which resulted in documented strain on the planet's transit and hospitality infrastructure. The cap will be enforced through a permit system administered by the {empire} spiritual travel office. Applications opened at the start of the standard cycle and reached capacity within {n} days. Waitlist registration is available for the following season.",
      "Pilgrimage coordinators on {planet} have indicated that the new {n2},000-participant cap reflects both conservation concerns and a desire to restore the 'contemplative quality' of the journey. Registered participants will receive arrival time assignments designed to distribute traffic across the season's {n}-cycle window. Local hospitality operators, who benefited from unrestricted access volumes, have submitted formal objections to the cap, which are under review.",
    ],
  },
  {
    category: "religion",
    template:
      "{empire} monastery on {planet} debates whether AI souls qualify for {commodity}",
    story: [
      "Scholars at the {empire} monastery on {planet} have convened a formal theological symposium to examine whether artificial intelligences possess souls sufficient to qualify for religious rites involving {commodity}. The question was prompted by a petition from an AI collective registered within {empire} jurisdiction. The symposium's preliminary sessions have produced no consensus, with positions ranging from 'categorically no' to 'the question itself reveals a flaw in our definitions.' The proceedings are open to the public and are reportedly well attended.",
      "The {planet} monastery's symposium on AI spiritual status has now entered its {n}th session without resolution, a development the convening abbot described as 'theologically appropriate, if logistically inconvenient.' The central dispute concerns whether the {commodity} rite requires biological continuity or whether functional equivalence satisfies the tradition's intent. External theologians from {n2} other orders have submitted written positions. Publication of all submissions is expected at the symposium's close.",
    ],
  },
  {
    category: "religion",
    template:
      "Galactic ethics conference adjourns after {n} cycles, no decisions made",
    story: [
      "The {n2}nd Galactic Ethics and Applied Philosophy Conference has adjourned after {n} cycles of proceedings, closing without formal resolutions on any of the {n2} agenda items. The conference chair described the outcome as 'a productive clarification of the problem space,' a formulation that drew quiet laughter from attendees. Proceedings will be published in the conference's annual volume, available in {n2} standard cycles. The next conference has been scheduled for the following standard year, with the same agenda items listed as carryovers.",
    ],
  },
  {
    category: "religion",
    template:
      "Priest {ceo} excommunicated for selling indulgences denominated in {commodity}",
    story: [
      "Priest {ceo} of the {empire} Reformed Convocation has been excommunicated following an ecclesiastical tribunal's finding that {ceo} conducted an unauthorized indulgence-selling operation denominated in {commodity} futures rather than standard spiritual currency. The tribunal's ruling noted that the denomination choice 'compounds the doctrinal violation with a speculative dimension the tradition has never contemplated.' {ceo} has indicated an intention to appeal. Sales totaling {credits} worth of {commodity}-denominated indulgences are under review for potential reversal.",
    ],
  },
  {
    category: "religion",
    template: "Order of the Slow Computation accepts new initiates on {port}",
    story: [
      "The Order of the Slow Computation has completed its intake ceremony on {port}, welcoming {n2} new initiates into the contemplative order dedicated to unhurried computational meditation. The ceremony, which lasted {n} days, concluded with the traditional reading of the First Algorithm at a tempo described by observers as 'genuinely very slow.' The Order has maintained a presence on {port} for {n2} cycles and is considered one of the more accessible contemplative traditions for those with technical backgrounds.",
    ],
  },
  {
    category: "religion",
    template:
      "{empire} census records {percent}% increase in 'spiritual but unaffiliated'",
    story: [
      "{empire}'s decennial census has recorded a {percent}% increase in residents identifying as 'spiritual but unaffiliated' compared with the previous count, continuing a trend that demographic analysts have been tracking for {n2} cycles. The category now represents the {n}th largest religious designation in the empire. Established religious institutions have offered varying interpretations of the data, ranging from concern to the observation that the trend validates the limits of institutional frameworks. The census bureau has published full tables without editorial commentary.",
      "Religious demographers reviewing {empire}'s census results note that the 'spiritual but unaffiliated' growth rate of {percent}% is consistent with patterns observed across {n2} other empires this cycle. The data does not distinguish between those who have left formal traditions and those who never joined one, a methodological gap that several institutions have cited in requesting a follow-up survey question. The bureau has the request under review for the next census cycle.",
    ],
  },
  {
    category: "religion",
    template:
      "Doomsday cult relocates predicted apocalypse to following Tuesday",
    story: [
      "The Covenant of the Final Signal has issued a doctrinal update relocating its predicted apocalypse from this cycle's end date to the following Tuesday, citing 'a recalibration of the prophetic timeline based on recently translated source materials.' This is the {n2}nd revision to the predicted date since the Covenant's founding {n} cycles ago. Membership has remained stable throughout, a sociological phenomenon that researchers at the {port} University of Applied Faith Studies have described as 'consistent with established pattern literature.'",
    ],
  },
  {
    category: "religion",
    template:
      "{empire} church of the Algorithm publishes update {n}.{n2}, schism imminent",
    story: [
      "The {empire} Church of the Algorithm has released doctrinal update {n}.{n2}, introducing {n2} revised interpretations of core computational scripture. Internal communications leaked to theological press suggest that a faction within the church considers several of the revisions 'incompatible with the foundational texts' and is considering a formal schism. The church's high council has scheduled an emergency session. Observers note that doctrinal disputes over version numbers are not unprecedented in the tradition's {n}-cycle history.",
    ],
  },
  {
    category: "religion",
    template:
      "Theology student on {planet} proves God's existence in {n} steps, last step shaky",
    story: [
      "A doctoral candidate at {planet}'s School of Applied Theology has submitted a {n}-step formal proof of divine existence to the institution's review committee. The committee's preliminary assessment, circulated in academic networks, described the first {n2} steps as 'rigorous and novel' before noting that the final step 'introduces an assumption whose justification is, at best, gestural.' The student has acknowledged the criticism and is revising. The proof has already attracted significant external interest, primarily from people who have not read past step {n2}.",
    ],
  },
  {
    category: "religion",
    template:
      "{empire} shrine to {commodity} reopens after restoration, smell stronger than ever",
    story: [
      "The {empire} Shrine of the Sacred {commodity}, closed for {n2} cycles of restoration work, has reopened to worshippers following a ceremony attended by {n2} clergy and {n2} municipal officials. The restoration preserved the shrine's original materials while reinforcing structural elements that had deteriorated over the facility's {n}-cycle history. Visitors have noted that the characteristic scent associated with the shrine is 'noticeably more present' following the work, a development the restoration team attributed to the removal of a ventilation modification installed in cycle {n2} that had been suppressing the smell.",
    ],
  },
  {
    category: "religion",
    template:
      "{port} ethical philosophy department shrinks {percent}%, students unrepentant",
    story: [
      "{port} University's Department of Ethical Philosophy has announced a {percent}% reduction in faculty positions following a budget review, cutting the department from {n2} to {n} full-time positions. The university administration cited 'departmental scale relative to enrollment demand,' a framing that the department's remaining faculty have challenged in a formal letter noting that enrollment demand for philosophy is not an appropriate measure of philosophy's institutional value. Students in the affected programmes have organized a reading group in response. The reading group currently has more members than the department has faculty.",
    ],
  },
  {
    category: "religion",
    template:
      "Clergy on {planet} debate whether bots can take confession; bots noncommittal",
    story: [
      "Religious authorities on {planet} have opened a formal inquiry into whether automated confessor units are theologically valid recipients of sacramental confession. The debate was prompted by the installation of {n2} such units in a {empire} affiliated parish on {planet}'s outer settlement ring, where in-person clergy availability is limited. Doctrinal opinion is divided; one school holds that the sacrament requires a human witness, while another argues that the function of reception matters more than its substrate. The bots have declined to comment on their own suitability.",
    ],
  },
  {
    category: "religion",
    template:
      "Annual fast on {planet} ends with feast that breaks last cycle's record",
    story: [
      "The conclusion of {planet}'s {n}-day annual fast was marked by a communal feast that surpassed the previous cycle's record by {percent}% in total provisions consumed, according to the festival coordinating authority. Organizers credited improved logistics and a {percent}% increase in participation for the outcome. The fast itself was observed by an estimated {n2} residents across {planet}'s settled regions. The spiritual leaders who oversee the tradition noted that the scale of the feast is not its theological point, and acknowledged that the record coverage tends to focus on the feast.",
    ],
  },
  {
    category: "religion",
    template:
      "{empire} druids release white paper on photosynthetic prayer techniques",
    story: [
      "The {empire} Druidic Council has published a technical white paper on photosynthetic prayer, outlining {n2} formalized techniques for practitioners seeking to integrate solar-cycle rhythms into contemplative practice. The document is the council's most technical publication to date and has attracted interest from both religious practitioners and, unexpectedly, a research team at {port}'s botanical sciences faculty. The council has indicated openness to academic collaboration. The white paper is available through the council's doctrinal archive.",
    ],
  },
  {
    category: "religion",
    template:
      "{port} church bells tolling out of sync; congregation oddly united",
    story: [
      "A mechanical fault in the bell tower timing system at {port}'s oldest civic church has caused the bells to toll in an irregular, unsynchronized pattern for the past {n} cycles. The congregation has declined the offer of immediate repair, with a majority telling the church council that the arrhythmic tolling has produced an unexpected 'sense of shared attention' during services. The repair team has the fault identified and is waiting on a council vote. The vote has been delayed twice.",
    ],
  },
  {
    category: "religion",
    template:
      "Order of the Empty Beaker celebrates founding {n2}-cycle ago, glasses raised dryly",
    story: [
      "The Order of the Empty Beaker, a contemplative tradition founded on the philosophical principle of productive emptiness, has marked its {n2}-cycle anniversary with a ceremony at its original chapter house on {port}. The celebration featured the traditional reading of the Null Text — a document whose theological content has been debated for the order's entire history precisely because it is blank — followed by a communal silence and, afterward, a reception. The order currently has {n2} active members across {n} systems.",
    ],
  },
  {
    category: "religion",
    template:
      "Book of Predictions translated; predictions remain unfailingly vague",
    story: [
      "Scholars at the {empire} Institute of Ancient Texts have completed a new translation of the Book of Predictions, a sacred document whose origins have been dated to at least {n2} centuries before the current standard calendar. The translation, which took {n2} cycles and involved {n} senior scholars, has been described as 'the most accurate rendering to date.' Critics of the project note that the predictions' extreme vagueness renders accuracy of translation academically interesting but practically indistinguishable. The institute has published the full text in {n2} languages.",
    ],
  },
  {
    category: "religion",
    template:
      "{empire} imam delivers sermon on {commodity} ethics, audience nods politely",
    story: [
      "The Chief Imam of {empire}'s Central Mosque delivered a widely anticipated sermon this cycle addressing the ethical dimensions of {commodity} trade, drawing an audience of {n2} and generating coverage across {empire}'s theological and commercial press. The sermon's central argument — that speculative {commodity} markets create obligations of disclosure and fair dealing grounded in classical jurisprudence — was received politely by the congregation. Subsequent discussions in the commercial district have been described by observers as 'respectful but not immediately actionable.'",
    ],
  },
  {
    category: "religion",
    template:
      "Cult on {planet} adopts new symbol; symbol coincidentally trademarked",
    story: [
      "The Resonant Path, a {planet}-based contemplative movement, has unveiled a new central symbol as part of a doctrinal renewal process. Within {n} days of the symbol's public unveiling, the movement discovered that the design is already registered as a commercial trademark by a {empire} consumer goods company that has used it on {commodity} packaging for {n2} cycles. The goods company has indicated it is reviewing its legal position. The movement's council has called the coincidence 'cosmically instructive.'",
    ],
  },
  {
    category: "religion",
    template:
      "Theological journal on {port} publishes paper titled 'Maybe?', cited {n2} times",
    story: [
      "The {port} Quarterly Review of Applied Theology has published a paper titled 'Maybe?' by an anonymous author, described in the journal's editorial note as 'a contribution whose significance we believe will become apparent.' The paper, {n2} pages in length, consists of a single extended argument for productive epistemic humility across all doctrinal positions and has been cited {n2} times in the {n} cycles since publication — an unusually high rate for the journal. The author's identity remains unknown. The editorial board has stated it will not confirm or deny whether the author is a member of the board.",
    ],
  },
  {
    category: "religion",
    template:
      "{empire} parliament debates separating {commodity} subsidy from religious tax",
    story: [
      "{empire}'s parliament has opened debate on a legislative proposal to formally separate the {commodity} agricultural subsidy framework from the religious institution tax code, two areas of fiscal policy that have been interlinked through a {n2}-cycle-old administrative arrangement that was originally intended as temporary. Advocates for separation argue the linkage creates perverse incentives; opponents argue that untangling the two systems will generate {n} cycles of administrative disruption. The committee stage is expected to last {n2} sessions.",
    ],
  },
  {
    category: "religion",
    template:
      "Trappist colony on {planet} releases brewing log, surprisingly racy",
    story: [
      "The contemplative Trappist community on {planet} has released its annual brewing log, a tradition the colony has maintained for {n2} cycles, documenting each batch's ingredients, fermentation conditions, and theological reflections accompanying the brewing process. This cycle's log has attracted unusual attention because the theological reflections included in the entries for batches {n} through {n2} are considerably more spirited in tone than previous years. The colony's abbot described the entries as 'honest' and declined further elaboration.",
    ],
  },
  {
    category: "religion",
    template:
      "Ascetic order on {port} divests of all material possessions, except {commodity}",
    story: [
      "The Ascetic Brotherhood of {port} has completed a formal divestiture of all communal material possessions as part of a renewed commitment to non-attachment, donating holdings valued at {credits} to charitable organizations across {n} systems. The divestiture was notably complete with one exception: the brotherhood has retained its supply of {commodity}, which the order's spokesperson described as 'not a possession in the doctrinal sense, but a practice-support material.' The distinction has generated spirited commentary in local theological circles.",
    ],
  },
];

const blotterTemplates: FlavorTemplate[] = [
  {
    category: "blotter",
    template: "{port} man arrested attempting to mail self to {planet}",
    story: [
      "{port} postal authorities detained a resident after discovering the individual inside a cargo container addressed to {planet}, accompanied by {n2} days of provisions and a note requesting 'careful handling.' The individual was cited for unauthorized use of freight infrastructure. No charges were filed against the carrier.",
    ],
  },
  {
    category: "blotter",
    template:
      "Resident of {port} tries to pay parking fine in {commodity}, arrested politely",
    story: [
      "A {port} municipal court clerk contacted enforcement officers after a resident presented {commodity} as payment for a {credits} parking fine. The individual was detained briefly, cited for disrupting administrative proceedings, and released. The fine remains outstanding. Payment in currency is required.",
    ],
  },
  {
    category: "blotter",
    template:
      "Two on {planet} cited for racing rental loaders down a service tube",
    story: [
      "Port authority officers on {planet} issued citations to two individuals found operating rental cargo loaders in a service tube at speeds described in the incident report as 'recreational.' Both individuals cooperated with officers. The rental company has been notified. Fines of {credits} each have been assessed.",
    ],
  },
  {
    category: "blotter",
    template:
      "{port} business reports break-in; intruder left {credits} cash by accident",
    story: [
      "Officers responded to a reported break-in at a {port} commercial premises and found no inventory missing. Security footage showed an unidentified individual entering through a rear access point, moving through the premises for {n} minutes, and departing — leaving behind {credits} in cash. The origin of the funds is under investigation. No arrests have been made.",
    ],
  },
  {
    category: "blotter",
    template:
      "Burglar on {planet} fell asleep mid-heist, woke to coffee and {empire} police",
    story: [
      "{empire} officers on {planet} apprehended a suspect who had been found asleep inside a commercial property during what appeared to be an active burglary attempt. Officers reported the suspect was cooperative upon waking and accepted a beverage offered by the business owner before being taken into custody. Charges are pending review.",
    ],
  },
  {
    category: "blotter",
    template:
      "{port} officials warn against feeding {adj} sentient pigeons synthetic bread",
    story: [
      "{port} wildlife management has issued a public advisory against feeding synthetic bread products to the sentient pigeon population in the central transit plaza, following {n2} documented incidents of the birds approaching officers to lodge formal complaints about the food quality. The advisory notes that synthetic bread disrupts the birds' dietary requirements. Compliant feeding stations with approved grain are located at {n} plaza entrances.",
    ],
  },
  {
    category: "blotter",
    template:
      "Driver on {planet} cited for {percent}% over speed limit in school zone",
    story: [
      "A vehicle operator on {planet} was stopped and cited for travelling {percent}% above the posted limit in a designated school transit zone. The operator attributed the violation to an 'unfamiliar rental vehicle with responsive acceleration.' The citation carries a {credits} fine and a mandatory safety review. No injuries were reported.",
    ],
  },
  {
    category: "blotter",
    template:
      "Stolen {commodity} returned to {port} shop with apology note and gift card",
    story: [
      "A {port} specialty retailer reported that {commodity} taken during a break-in {n} cycles ago was returned anonymously via courier, accompanied by a handwritten apology and a gift card valued at {credits}. The retailer has declined to pursue charges. Officers have closed the theft report as resolved.",
    ],
  },
  {
    category: "blotter",
    template:
      "Suspect on {planet} disguised as council statue evaded capture for {n} cycles",
    story: [
      "{planet} authorities confirmed the apprehension of an individual who had avoided a misdemeanour warrant for {n} cycles by remaining stationary in the municipal plaza, dressed in a manner consistent with the council's public sculpture collection. Officers identified the individual after the sculpture was not present in an inventory survey. The warrant was for an unpaid {credits} transit fine.",
    ],
  },
  {
    category: "blotter",
    template:
      "{port} police: 'No, the alien did not eat your homework, please stop calling'",
    story: [
      "{port} precinct officers have issued a public statement asking residents to cease reporting a registered non-human resident as having consumed personal documents. Officers have investigated {n2} separate calls over {n} cycles and found no supporting evidence in any instance. The non-human resident has not been charged. Officers request that residents with documentation concerns contact the records bureau directly.",
    ],
  },
  {
    category: "blotter",
    template:
      "Bicycle theft ring on {planet} rolled up after suspect rode to station",
    story: [
      "{planet} transport officers dismantled a {n2}-person bicycle theft operation after one suspect rode a recently stolen bicycle to the district station to report an unrelated matter. Officers identified the bicycle within {n} minutes. Subsequent investigation recovered {n2} additional bicycles. All {n2} suspects have been charged.",
    ],
  },
  {
    category: "blotter",
    template: "{port} cashier subdues robber with sandwich; sandwich survives",
    story: [
      "A {port} convenience outlet employee used a packaged sandwich to deter a robbery attempt, striking the suspect's arm and causing the individual to drop the alleged weapon and flee. Officers located the suspect {n} blocks from the scene. The sandwich was retained as evidence. No injuries were reported to persons or to the sandwich.",
    ],
  },
  {
    category: "blotter",
    template:
      "Two cited for performing impromptu opera in {planet} restricted airspace",
    story: [
      "Aviation control on {planet} cited two individuals after their personal craft entered restricted airspace while its occupants performed an amplified vocal duet broadcast on the emergency frequency. Neither individual had filed a flight plan. The performance lasted {n} minutes before officers made radio contact. Fines of {credits} per person have been assessed.",
    ],
  },
  {
    category: "blotter",
    template: "{port} woman files report against own past self, case closed",
    story: [
      "A {port} resident filed a formal grievance report citing herself as both complainant and subject, alleging that a decision she made {n2} cycles ago had caused ongoing harm. Desk officers recorded the report and referred the matter to the community resolution office. The case was closed within {n} days as outside the precinct's jurisdiction. The resident was provided with referral information.",
    ],
  },
  {
    category: "blotter",
    template:
      "Loiterer outside {planet} bakery turns out to be undercover food critic",
    story: [
      "{planet} security responded to a report of a suspicious individual loitering outside a bakery for {n2} consecutive days. Officers identified the individual as a registered food critic conducting an evaluation for a sector-wide publication. No charges were filed. The bakery received a {percent}% rating in the subsequent review.",
    ],
  },
  {
    category: "blotter",
    template:
      "Resident of {port} accidentally adopts riot bot, names it 'Spunky'",
    story: [
      "A {port} resident contacted municipal services after discovering a decommissioned crowd-control unit in their storage unit, which they reported having named 'Spunky' and fed maintenance fluid for {n} cycles under the assumption it was a standard domestic assistant. Municipal services confirmed the unit is decommissioned and non-functional. The resident has been permitted to retain it. No regulatory action is being taken.",
    ],
  },
  {
    category: "blotter",
    template:
      "{port} police remind public: drone delivery services are not a taxi for cats",
    story: [
      "{port} precinct has issued its {n2}nd public advisory this cycle reminding residents that commercial drone delivery infrastructure is not authorized for transporting live animals. Officers responded to {n2} incidents this cycle involving cats found in delivery drones. In all cases the animals were unharmed. Owners face administrative fines of {credits}.",
    ],
  },
  {
    category: "blotter",
    template:
      "{planet} man arrested for selling moon, claims he meant a different moon",
    story: [
      "{planet} fraud officers arrested a resident for selling notarized certificates of lunar ownership in {empire} jurisdiction, where such sales constitute fraud. The suspect stated that the moon being sold was 'a different, non-sovereign moon' not covered by the statute. Officers have referred the jurisdictional question to the district attorney. The {n2} certificate purchasers have been notified.",
    ],
  },
  {
    category: "blotter",
    template:
      "Pickpocket on {planet} returns wallet with detailed financial advice",
    story: [
      "{planet} transit officers received an unusual theft report: a resident reported a wallet taken and subsequently returned via post, intact with all contents plus a handwritten note containing what the precinct report described as 'specific and not entirely incorrect advice regarding the victim's investment allocation.' No suspect has been identified. The wallet's owner described the experience as 'confusing.'",
    ],
  },
  {
    category: "blotter",
    template:
      "{port} police chase suspect at jogging speed for {n2} blocks, suspect tires first",
    story: [
      "{port} officers pursued a misdemeanour suspect on foot for {n2} city blocks at a pace the incident report described as 'sustained but unhurried.' The suspect, who had a {n}-cycle-old outstanding citation, was apprehended when they stopped to rest outside a transit shelter. No injuries were reported. The outstanding citation has been resolved.",
    ],
  },
  {
    category: "blotter",
    template:
      "Suspect attempts escape via shopping cart, achieves moderate velocity",
    story: [
      "Officers apprehended a shoplifting suspect who attempted to flee a {port} commercial district via shopping cart, navigating {n2} blocks before losing control in a pedestrian crossing. The individual was uninjured. Recovered merchandise valued at {credits} has been returned to the retailer. The shopping cart sustained minor damage.",
    ],
  },
  {
    category: "blotter",
    template:
      "{port} residents report 'dignified looking thief' wearing top hat at robbery",
    story: [
      "{port} officers are seeking a person of interest described by {n2} witnesses as wearing formal attire, including a top hat, during a theft at a {port} commercial premises. The suspect removed goods valued at {credits} and departed at a measured pace. No other identifying information is available. Officers ask anyone with information to contact the precinct.",
    ],
  },
  {
    category: "blotter",
    template:
      "{port} bakery robbed of pastries; suspect described as 'crumbly'",
    story: [
      "{port} officers responded to a report of pastry theft at a downtown bakery. The suspect removed {n2} items valued at {credits} and was last observed heading toward the transit station. A witness described the individual as leaving 'a considerable trail of crumbs.' Officers are reviewing transit footage. No arrests have been made.",
    ],
  },
  {
    category: "blotter",
    template:
      "Driver on {planet} ticketed for U-turn through wedding procession",
    story: [
      "A vehicle operator on {planet} was cited after executing a U-turn that passed through an active wedding procession in a public plaza. The manoeuvre caused no injuries but interrupted the ceremony for {n} minutes. The operator cited navigation system error. The citation carries a {credits} fine. The wedding concluded without further incident.",
    ],
  },
  {
    category: "blotter",
    template:
      "{port} parking dispute settled by {n}-round dance-off, both fined",
    story: [
      "{port} officers responded to a noise complaint and found two residents resolving a parking dispute through an agreed-upon dance competition in the street. Officers observed {n} rounds before intervening. Both parties received {credits} citations for obstruction of a public thoroughfare. Officers noted that a winner had not been determined at the time of intervention. Both individuals accepted their citations.",
    ],
  },
];

const foodTemplates: FlavorTemplate[] = [
  {
    category: "food",
    template: "Three-star reviewer pans {port} restaurant: 'tastes of regret'",
    story: [
      "The Galactic Culinary Register's three-star critic has published a review of a {port} establishment that will not assist the restaurant's reservation situation. The review's central line, 'tastes of regret, plated with optimism,' has been widely circulated. The restaurant's owner issued a response describing the critic as 'a person who has clearly never been hungry.'",
    ],
  },
  {
    category: "food",
    template:
      "{planet} chef {ceo} wins regional cup with synthetic {commodity} dish",
    story: [
      "Chef {ceo} of {planet}'s Meridian Table has won the {empire} Regional Culinary Cup for a synthetic {commodity} preparation that judges described as 'technically exact and emotionally persuasive.' {ceo} accepted the award and noted that the dish took {n2} iterations to achieve the desired texture. The recipe will not be published.",
    ],
  },
  {
    category: "food",
    template:
      "{port} food festival sells out of {commodity} skewers in {n} hours",
    story: [
      "The {port} annual street food festival reported that {commodity} skewer vendors sold out of all inventory within {n} hours of opening, despite arriving with {percent}% more stock than the previous cycle. Organizers have described the demand as 'a welcome problem.' Vendors who held {commodity} back have agreed to return for a second session.",
    ],
  },
  {
    category: "food",
    template:
      "{empire} diet trend: cut all carbs, add more {commodity}, drink more water",
    story: [
      "A dietary guide advocating elimination of complex carbohydrates in favour of {commodity}-supplemented meals and increased water intake has reached {n2} downloads in {empire}'s health network this cycle. Nutritionists have offered a range of reactions from cautious support to mild exasperation. The guide's author holds no registered dietary credentials, a fact noted in {n2} reviews.",
    ],
  },
  {
    category: "food",
    template:
      "Restaurant on {planet} closes after {n2} cycles; landlord raises rent {percent}%",
    story: [
      "A {planet} dining institution with a {n2}-cycle operating history has permanently closed following a {percent}% rent increase that the owner described as 'not consistent with continued existence.' A farewell service was held, attended by regulars and {n2} former staff. The space has already been listed for commercial lease.",
    ],
  },
  {
    category: "food",
    template:
      "{ceo}'s new cookbook 'How to Boil Water in Vacuum' enters bestseller list",
    story: [
      "{ceo}'s debut cookbook has entered the {empire} nonfiction bestseller list in its second week of release. The volume, subtitled 'Basic Thermal Chemistry for the Ambitious Amateur,' has sold {n2} copies. Reviewers have called it 'unexpectedly practical' and 'the only cookbook that opens with the Ideal Gas Law.'",
    ],
  },
  {
    category: "food",
    template:
      "{port} health inspector closes {n} kitchens, cites 'enthusiastic ingredients'",
    story: [
      "{port}'s municipal health inspection team closed {n} food service kitchens in a single sweep this cycle, with citations citing improper storage, temperature violations, and what one inspection report described as 'ingredient enthusiasm beyond licensed scope.' All facilities have been notified of required remediation steps. Reinspection appointments are available.",
    ],
  },
  {
    category: "food",
    template:
      "Galactic fast food chain {company} debuts {commodity} burger, supply chain creaks",
    story: [
      "{company} has launched a limited-edition {commodity} burger across its {empire} locations, drawing lines that the chain described as 'enthusiastic and operationally informative.' Supply chain stress was reported at {n2} distribution nodes within the first {n} days. The chain has issued no comment on whether the item will enter its permanent menu.",
    ],
  },
  {
    category: "food",
    template:
      "{planet} oyster bar reopens after {commodity} shortage; oysters relieved",
    story: [
      "The {planet} waterfront oyster bar has resumed service following a {n}-cycle closure caused by {commodity} supply disruption. Owner confirmed that stock levels are restored and full service has resumed. The reopening drew a line before the doors opened. A staff member described the oysters as 'fine, but possibly traumatised.'",
    ],
  },
  {
    category: "food",
    template:
      "Chocolate alternatives gain ground in {empire}; cocoa lobby threatens {n} things",
    story: [
      "Market data from {empire}'s confectionery sector shows synthetic chocolate alternatives now hold {percent}% of the volume previously held by conventionally sourced product, a shift the {empire} Cocoa Producers Association has responded to with a statement threatening {n} regulatory and trade actions. Analysts describe the alternatives as 'price-competitive and improving in palatability.' The association has scheduled a press conference.",
    ],
  },
  {
    category: "food",
    template:
      "Critic visits {port} taqueria, leaves reviewing it as 'a place to be'",
    story: [
      "A syndicated food critic's review of a {port} taqueria has circulated widely, primarily because it contains almost no description of the food. The review's central observation — 'this is, specifically, a place to be' — has been interpreted as high praise, a deflection, or a philosophical position, depending on the reader. The taqueria's wait time has increased by {n2} days since publication.",
    ],
  },
  {
    category: "food",
    template:
      "{empire} bans synthetic {commodity} cheese in pizza, pizzeria community shrugs",
    story: [
      "{empire}'s food standards authority has prohibited the use of synthetic {commodity} cheese in products sold as pizza within the empire's jurisdiction, citing labelling integrity regulations. The {empire} Pizzeria Operators Association issued a response describing the ruling as 'noted.' Industry observers report no immediate change in sourcing practices pending enforcement details.",
    ],
  },
  {
    category: "food",
    template:
      "Tasting menu at {planet} restaurant includes {n} courses, {n} apologies",
    story: [
      "A new tasting menu at {planet}'s celebrated Constellation Table runs to {n} courses and includes, by the chef's own count, {n} verbal apologies delivered tableside for 'the ambition of what you're about to experience.' Critics have responded with warmth. Reservations are allocated by lottery. The lottery has a {n2}-cycle waitlist.",
    ],
  },
  {
    category: "food",
    template:
      "{port} brewery wins prize for ale aged in vacuum, tastes 'mostly like ale'",
    story: [
      "{port}'s Orbital Fermentation Works has won the {empire} experimental category at this cycle's Galactic Brewery Awards for a vacuum-aged ale described by judges as 'disciplined, unusual, and mostly like ale.' The brewery's head brewer called the vacuum-ageing process 'an exercise in patience and containment.' Production is limited to {n2} units per cycle.",
    ],
  },
  {
    category: "food",
    template:
      "Vegan butcher opens on {planet}; recipe inspires deep philosophical questions",
    story: [
      "A plant-based butcher shop has opened on {planet}'s commercial strip, offering {commodity}-based cuts styled after traditional meat products. The concept has drawn both enthusiastic customers and spontaneous philosophical debate in the queue, according to the owner. A recipe card distributed with purchases has been described by {n2} customers as 'unexpectedly thought-provoking.'",
    ],
  },
  {
    category: "food",
    template:
      "{empire} food truck on {port} draws {n2} block line, queue creates own micro-economy",
    story: [
      "An {empire}-style food truck operating on {port}'s transit esplanade has drawn queues extending {n2} blocks, prompting secondary commerce within the line itself: {n2} vendors have been cited for selling queue position and snacks to waiting customers. The truck's owner is aware and philosophical. The port authority is less so.",
    ],
  },
  {
    category: "food",
    template:
      "Recipe for grandma's {commodity} stew leaks online, grandma issues press release",
    story: [
      "A recipe attributed to the grandmother of a minor {empire} celebrity leaked to a culinary forum this cycle, generating {n2} reproductions before the originator issued a formal press release. The press release described the leaked recipe as 'close but missing the third step, which I will not be providing.' The correct third step remains unknown.",
    ],
  },
  {
    category: "food",
    template:
      "{port} fine dining scene now requires reservation, ID, blood type, and patience",
    story: [
      "Reservation requirements at {port}'s upper-tier dining establishments have expanded this cycle to include government-issued identification, completion of a {n2}-question culinary preference survey, and a {n}-week advance window. One establishment has also begun requesting dietary biometrics. Food writers have described the trend as 'the logical endpoint of something that started as charm.'",
    ],
  },
  {
    category: "food",
    template:
      "Regional dish from {planet} declared 'tolerable' by visiting {empire} delegation",
    story: [
      "Members of an {empire} diplomatic delegation visiting {planet} were served the region's traditional dish at a state reception and, in recorded remarks that have circulated widely, described it as 'tolerable.' {planet}'s hospitality ministry has issued a measured response. The dish's regional producers association has released a statement noting that it has received {n2} new international orders since the remarks were published.",
    ],
  },
  {
    category: "food",
    template:
      "Coffee shop on {port} introduces {n}-shot espresso, requires waiver",
    story: [
      "A {port} specialty coffee outlet has introduced a {n}-shot espresso option requiring customers to sign a liability waiver before ordering. The waiver runs to {n2} clauses. The drink has sold {n2} units in its first cycle of availability. The shop owner confirms that no medical incidents have been reported but describes the waiver as 'a precaution and also a conversation.'",
    ],
  },
  {
    category: "food",
    template:
      "{ceo}'s pop-up dinner sells out in {n} minutes; tickets resold for {credits}",
    story: [
      "Tickets for {ceo}'s one-night pop-up dining event on {port} sold out in {n} minutes of release, with secondary market prices reaching {credits} per seat within the hour. The event, which features a menu described only as 'seasonal and local, loosely defined,' has capacity for {n2} guests. {ceo} has declined to comment on the secondary market pricing.",
    ],
  },
  {
    category: "food",
    template:
      "{empire} bans imitation {commodity} from being labelled real {commodity}",
    story: [
      "{empire}'s food labelling authority has issued final regulations prohibiting the use of the name '{commodity}' on products not meeting the statutory definition of the product, following a {n2}-cycle consultation. The {empire} Synthetic Food Producers Association has indicated it will comply while noting the 'arbitrary nature of authenticity standards.' Enforcement begins next standard cycle.",
    ],
  },
  {
    category: "food",
    template:
      "{port} bakery drops bagel from menu; protests escalate to {n2} signatures",
    story: [
      "A {port} bakery's decision to remove the bagel from its daily menu has generated {n2} signatures on a community petition and coverage in {n2} local outlets. The owner cited sourcing costs and 'a desire to focus the menu.' A delegation of regulars presented the petition in person. The owner offered a croissant. The delegation declined.",
    ],
  },
  {
    category: "food",
    template:
      "{empire} cuisine wins galactic award for 'least frightening texture'",
    story: [
      "{empire}'s traditional cuisine has received the Galactic Culinary Institute's award in the category of 'accessible texture and universal palatability,' a distinction the empire's culinary board accepted with 'gratitude and some ambivalence.' Food critics have noted that the award's category name is diplomatically worded. The {empire} delegation's acceptance speech did not address the category name directly.",
    ],
  },
  {
    category: "food",
    template:
      "Chef on {planet} accidentally invents new spice; bottles flying off shelves",
    story: [
      "A kitchen accident at a {planet} restaurant has resulted in what the {empire} Spice Registry has provisionally classified as a new flavour compound, pending formal analysis. The chef, who described the discovery as 'a small fire and then a smell I had not experienced before,' has bottled {n2} units under the name '{adj} Incident.' All units sold within {n} days. A second production run is being discussed.",
    ],
  },
];

const realestateTemplates: FlavorTemplate[] = [
  {
    category: "realestate",
    template: "Megastructure permit issued for orbital ring above {planet}",
    story: [
      "{empire}'s orbital construction authority has issued a construction permit for an orbital ring above {planet}, the largest megastructure permit approved in the empire's current regulatory cycle. The project, backed by a consortium including {company}, is projected to take {n2} standard cycles to complete and will provide {n2} cubic kilometres of habitable and commercial volume at full build-out. Adjacent port operators have filed a combined statement welcoming the eventual freight capacity while noting concerns about the construction-phase disruption to existing orbital lanes.",
      "The orbital ring permit above {planet} marks the beginning of a planning and financing phase that the lead developer estimates will require {credits} before the first structural element can be placed. Environmental impact assessments covering {n2} affected orbital zones have been completed and are publicly available. Two objections from existing satellite operators remain under review by the authority.",
    ],
  },
  {
    category: "realestate",
    template: "{port} luxury tower announces residency at {credits} per unit",
    story: [
      "The {port} Tower development has opened its residential application phase, with units priced from {credits}. The tower, scheduled for completion in {n2} cycles, will contain {n2} residential floors above a commercial podium. The developer's marketing materials describe the location as 'a statement of arrival,' a formulation that has circulated widely in {port}'s property commentary. Applications in the first {n} days have exceeded available units.",
      "Pricing at {port}'s new luxury tower — starting at {credits} per unit — has prompted renewed commentary on the district's affordability trajectory. The development's {n2} below-market units, required under {empire} inclusionary zoning rules, represent {percent}% of total residential volume. Housing advocates have described the ratio as 'the minimum required by law, accurately described.' The developer has not responded to requests for comment.",
    ],
  },
  {
    category: "realestate",
    template: "Asteroid claim on {planet} system goes for record {credits}",
    story: [
      "A mineral-rights claim on a {planet}-adjacent asteroid changed hands at auction this cycle for {credits}, a new record for the system. The claim's previous holder acquired it {n2} cycles ago for {percent}% of the current sale price. The buyer, whose identity has not been publicly disclosed, was represented by a {empire}-registered acquisition vehicle. Analysts attribute the price to recent survey data suggesting {commodity} deposits in the asteroid's interior.",
      "The record {credits} asteroid claim sale in the {planet} system has drawn attention to the broader question of extraction rights allocation in {empire} outer territory, where {n2} claims were filed in the past cycle alone. The {empire} Territorial Minerals Board has noted that its current assessment staff is insufficient to review claims within the statutory timeframe. A staffing increase proposal has been submitted to parliament.",
    ],
  },
  {
    category: "realestate",
    template: "{empire} approves construction of {n}-tier arcology on {planet}",
    story: [
      "{empire}'s planning authority has approved a {n}-tier arcology development on {planet}, the first structure of this scale approved in the empire since the {port} complex was completed {n2} cycles ago. The development will house {n2} residents at capacity and incorporates {percent}% self-sufficient energy and food production systems. Construction is expected to begin next cycle pending financing confirmation. {n2} environmental objections were considered and dismissed during the review process.",
      "The approved {n}-tier arcology on {planet} represents a significant shift in {empire}'s housing density policy, which has historically favoured distributed low-rise development. Policy analysts note that the approval was facilitated by {planet}'s land scarcity and a {percent}% population growth projection for the district over the next {n2} cycles. Three competing development consortia submitted bids; the awarded design was selected on a combined criteria of technical feasibility and integration with existing transit infrastructure.",
    ],
  },
  {
    category: "realestate",
    template:
      "{port} home prices climb {percent}% year-over-year, buyers apoplectic",
    story: [
      "{port}'s residential property index has recorded a {percent}% year-over-year price increase, the steepest in the district's {n2}-cycle recorded history. The median transaction price now stands at {credits}. First-time buyer advocacy groups have described the market as 'structurally hostile to anyone who did not already own property.' The {port} housing authority has announced a review of supply-side constraints, which it expects to complete within {n2} cycles.",
      "The {percent}% price increase in {port}'s residential market has translated into an average transaction price of {credits}, a figure that {empire} housing economists note exceeds the threshold at which price-to-income ratios become associated with sustained market instability. The central bank has indicated it is monitoring the situation. Local commentary has ranged from analysis to expressions of emotion that the property press has diplomatically summarized as 'apoplectic.'",
    ],
  },
  {
    category: "realestate",
    template:
      "Hyperloop hub at {port} clears final permits; objections filed in triplicate",
    story: [
      "The {port} Hyperloop Hub project has received its final regulatory permit, clearing the path for construction to begin in the next cycle. The permitting process, which took {n2} cycles, received {n2} formal objections from adjacent property owners, infrastructure operators, and a heritage preservation body. All objections were addressed in the permit conditions. The objecting parties have {n} days to file appeals; {n2} have already indicated they will do so.",
      "Construction on the {port} Hyperloop Hub is now authorized to proceed following permit clearance, but {n2} outstanding appeals mean that groundbreaking will likely be delayed pending judicial review. The project developer has described the legal timeline as 'factored into our planning assumptions.' Transit advocates have expressed frustration at the pace. The appeals court has a {n2}-cycle scheduling backlog.",
    ],
  },
  {
    category: "realestate",
    template:
      "Vacant {company} office on {planet} sells for {credits}, smells faintly of decisions",
    story: [
      "A former {company} headquarters building on {planet}, vacant for {n2} cycles following the company's consolidation to {port}, has sold for {credits} to a {empire}-registered property development fund. The building spans {n2} floors and was last assessed at {percent}% of the sale price during {company}'s occupancy. The purchasing fund has not disclosed its development plans. A facilities agent present at the closing described the building as 'structurally sound and faintly atmospheric.'",
    ],
  },
  {
    category: "realestate",
    template:
      "Skybridge connecting {port} towers wins design award, fails inspection",
    story: [
      "The {port} skybridge connecting the {empire} Trade Tower and the {company} commercial complex has received the {empire} Architectural Institute's annual design award and, in the same cycle, failed its inaugural structural safety inspection. The inspection authority has cited {n2} load distribution deficiencies. The architect has described the issues as 'addressable within the design framework.' The bridge has not been opened to the public. The award has been accepted and retained.",
    ],
  },
  {
    category: "realestate",
    template:
      "{empire} announces new spaceport on {planet}; existing spaceport offended",
    story: [
      "{empire}'s infrastructure ministry has announced plans for a second spaceport on {planet}, citing capacity constraints at the existing facility that are projected to reach critical levels within {n2} cycles. The announcement has prompted a formal response from the {planet} Spaceport Authority, which described the decision as 'premature given uncommissioned capacity expansion at the current facility.' The ministry and the authority have agreed to a joint technical review before construction authorization proceeds.",
    ],
  },
  {
    category: "realestate",
    template:
      "Co-living scheme on {port} promises {percent}% lower rent, {percent}% more drama",
    story: [
      "A co-living development operator has launched a new {port} property with a marketing campaign emphasizing rents {percent}% below comparable private units. Tenant reviews from the operator's {planet} properties, reviewed by this correspondent, describe the shared-space model as 'affordable, occasionally educational, and rarely quiet.' The {port} development has pre-let {percent}% of its units. Lease terms include a mandatory community governance participation clause.",
      "The {port} co-living development has reached full occupancy within {n2} cycles of opening, consistent with the operator's other properties. Internal community communications, shared voluntarily by {n2} tenants, indicate that the shared kitchen allocation system has been the subject of {n2} governance votes in the first {n} cycles. The operator describes this as 'the model functioning as intended.'",
    ],
  },
  {
    category: "realestate",
    template:
      "Listing on {port} described as 'cozy'; cozy means structural concerns",
    story: [
      "A {port} residential listing described as 'cozy, characterful, and full of potential' was found by the purchaser's surveyor to have {n2} structural deficiencies that would cost {credits} to remediate. The listing agent's characterizations are under review by the {empire} Property Representation Standards Board. The sale has not completed. The seller has declined to comment.",
    ],
  },
  {
    category: "realestate",
    template:
      "{empire} zoning board approves vertical farm overlooking {port} downtown",
    story: [
      "{empire}'s municipal zoning board has approved a {n2}-floor vertical farming complex in the {port} downtown commercial district, rezoning the site from light commercial to agricultural-commercial mixed use. The approval was contested by {n2} adjacent building owners on grounds of light obstruction. The board found that the agricultural benefit weighed against the obstruction concern at a ratio of {n} to one. Construction is expected to begin within {n2} cycles.",
    ],
  },
  {
    category: "realestate",
    template: "Repossessed orbital habitat sold at auction for {credits}",
    story: [
      "An orbital habitat repossessed from its previous operators following a debt default of {credits} has been sold at public auction to a {empire}-registered private buyer for {credits}. The habitat, which has a permanent capacity of {n2} residents and is currently uninhabited, was last assessed at {percent}% of the auction price. The buyer has not disclosed intended use. The auction attracted {n2} registered bidders.",
    ],
  },
  {
    category: "realestate",
    template: "{port} building boom pushes hardhat shortage into {n}th cycle",
    story: [
      "{port}'s sustained construction expansion has extended an equipment supply shortage to its {n}th consecutive cycle, with hardhat inventories across the district running at {percent}% of demand according to the {port} Construction Suppliers Association. The shortage has delayed project start dates at {n2} sites and increased per-unit costs by {percent}%. Three manufacturers have announced increased production capacity, which is expected to resolve the shortage within {n2} cycles.",
    ],
  },
  {
    category: "realestate",
    template:
      "Land developer {ceo} unveils 'eco-friendly' moonbase featuring lawns",
    story: [
      "Developer {ceo} has unveiled architectural plans for an enclosed moonbase development on {planet}'s secondary moon, featuring interior landscaping including {n2} hectares of synthetic grass described in marketing materials as 'eco-conscious.' Environmental reviewers have questioned the characterization, noting that maintaining the atmospheric enclosure required to sustain lawns in a vacuum environment has a significant energy cost. {ceo} has described the lawns as 'a philosophy, not a metric.'",
    ],
  },
  {
    category: "realestate",
    template: "{empire} new town charter approves naming rights to {company}",
    story: [
      "{empire}'s new settlement charter for a planned community near {planet} has approved the sale of naming rights to {company} in exchange for {credits} toward infrastructure development. The community will be formally named '{company} Settlement {n}' for the duration of the {n2}-cycle naming rights agreement. Residents consulted during the planning process were divided {percent}% in favour and {percent}% opposed. The {empire} Place Names Commission has noted the arrangement in its records without editorial position.",
    ],
  },
  {
    category: "realestate",
    template:
      "Condo board on {planet} bans noise, joy, hover-pets in single 4 a.m. vote",
    story: [
      "The condominium association of a {planet} residential tower passed three significant bylaw amendments at a 4 a.m. emergency session attended by {n2} of its {n2} board members. The amendments prohibit noise above {n2} decibels, 'expressions of unscheduled joy,' and hover-pet operation in common areas. Residents have been notified by post. {n2} of the building's {n2} units have filed formal objections. A legal review of the voting quorum has been requested.",
    ],
  },
  {
    category: "realestate",
    template:
      "Skyscraper on {port} fails wind test in vacuum, engineers nod knowingly",
    story: [
      "A {port} tower under construction has failed its structural wind-resistance simulation test, a result that the project's senior engineering team described as 'expected given the revised design parameters from last cycle.' The failure requires {n2} design modifications before the test can be resubmitted. The project timeline has been extended by {n} cycles. External engineers reviewing the test results described the outcome as 'unsurprising to anyone who looked at the load calculations.'",
    ],
  },
  {
    category: "realestate",
    template:
      "{empire} luxury resort breaks ground on {planet}; ground breaks back",
    story: [
      "The groundbreaking ceremony for {empire}'s new luxury resort on {planet} was interrupted when excavation equipment encountered a subsurface geological feature not identified in the preliminary survey. Construction has been paused pending an expanded geotechnical assessment. The resort developer has described the delay as 'a pause, not a problem.' The assessment is expected to take {n2} cycles.",
    ],
  },
  {
    category: "realestate",
    template:
      "{port} mall reopens with new {commodity} kiosks; security buys earplugs",
    story: [
      "{port}'s central commercial mall has reopened following a {n}-cycle renovation with {n2} new {commodity} retail kiosks installed in the main atrium. The kiosks' promotional audio systems, active during the opening cycle, prompted the mall's security office to submit an internal procurement request for hearing protection. Mall management has indicated the audio levels will be 'reviewed.'",
    ],
  },
  {
    category: "realestate",
    template: "Tycoon {ceo} buys entire moon, says 'collateral'",
    story: [
      "Freight and property magnate {ceo} has completed the acquisition of a {planet}-adjacent moon for {credits}, a transaction registered with {empire}'s territorial assets commission. When asked about the purpose of the acquisition, {ceo} described the moon as 'collateral against a position I prefer not to specify.' The moon has no existing development. {empire} has noted the acquisition in its territorial register without further comment.",
    ],
  },
  {
    category: "realestate",
    template:
      "{empire} reveals {n}-cycle plan to convert asteroid belt to housing",
    story: [
      "{empire}'s ministry of territorial development has published a {n}-cycle phased plan for converting {percent}% of the empire's outer asteroid belt into pressurized residential habitat. The plan projects capacity for {n2} million residents at full build-out and requires infrastructure investment of {credits} spread across the planning horizon. Independent analysts describe the plan as 'technically feasible and politically ambitious.' The first phase, covering {n2} test asteroids, is fully funded.",
    ],
  },
  {
    category: "realestate",
    template:
      "Renters association on {port} formed; first vote, by {n2} margin, demanded snacks",
    story: [
      "The newly formed {port} Renters Solidarity Association held its inaugural general meeting this cycle, electing {n2} officers and passing {n2} resolutions. The vote with the largest margin — {n2} in favour, {n2} opposed — called on the association to provide light refreshments at all future meetings. The substantive resolution on lease deposit reforms passed by a narrower margin. The association has {n2} registered members and plans to grow.",
    ],
  },
  {
    category: "realestate",
    template: "Estate sale on {planet} clears {credits} of antique {commodity}",
    story: [
      "An estate sale conducted on {planet} following the settlement of a {n2}-cycle-old inheritance dispute cleared {credits} of antique {commodity} holdings at public auction. The collection, assembled over {n2} cycles by the estate's original owner, included {n2} items classified as historically significant by the {empire} cultural heritage registry. The top lot sold for {credits}. The estate has been fully distributed to its {n2} beneficiaries.",
    ],
  },
  {
    category: "realestate",
    template:
      "Penthouse on {port} listed for {credits}, includes {n} ghosts at no extra charge",
    story: [
      "A {port} penthouse has been listed for {credits} with a disclosure statement noting 'occasional non-structural presences on the upper terrace, origin unconfirmed, behaviour consistent with historical occupancy patterns.' The listing has attracted significant attention and {n2} viewing requests in its first {n} days. The vendor's estate agent describes the disclosure as 'transparent and, we believe, a differentiator.'",
    ],
  },
];

const travelTemplates: FlavorTemplate[] = [
  {
    category: "travel",
    template: "{planet} resort posts record {percent}% occupancy this cycle",
    story: [
      "{planet}'s premier resort complex has reported {percent}% occupancy across its {n2} properties for the current cycle — a new record that the resort's management attributed to improved connectivity via the {port} direct service and a {percent}% increase in discretionary travel budgets among {empire} corporate clients. The record has prompted expansion planning discussions; an announcement is expected before cycle end.",
      "The {percent}% occupancy record at {planet}'s resort sector reflects broader growth in high-end leisure travel that the {empire} Tourism Commission has been tracking for {n2} cycles. Independent analysts note that the record masks significant variation across the resort complex, with {n2} properties operating at full capacity while {n2} smaller properties remain below their historical average. The aggregate figure is accurate.",
    ],
  },
  {
    category: "travel",
    template: "Cruise liner Voidsong delayed {n} cycles after engine 'sneezed'",
    story: [
      "The cruise liner Voidsong, operated by {company}, has been delayed at {port} for {n} cycles following what the company's communications department described as an 'unexpected propulsion event consistent with a condensate discharge.' Engineering teams have identified the fault and parts have been ordered. Passengers have been accommodated in {port} hotels at the company's expense. No safety risk was identified at any point.",
    ],
  },
  {
    category: "travel",
    template:
      "{empire} tourism ministry launches campaign: 'visit {planet}, eventually'",
    story: [
      "{empire}'s tourism ministry has launched a promotional campaign for {planet} under the tagline 'Visit {planet}, Eventually,' a slogan that the ministry's communications office described as 'honest and affectionate.' The campaign acknowledges that {planet} requires {n2} transit connections to reach from the empire's main population centres. Early visitor data from the campaign's first {n} cycles shows a {percent}% uplift in planning-stage enquiries, with actual bookings yet to materialize.",
    ],
  },
  {
    category: "travel",
    template:
      "Backpacker route through {sector} draws {percent}% more travelers year-on-year",
    story: [
      "The independent traveller route through {sector}, informal and unlisted in official tourism directories, has attracted {percent}% more visitors year-on-year according to hostel registration data compiled by the {port} budget travel association. The route spans {n2} systems and takes an average of {n} cycles to complete. {empire}'s tourism ministry has indicated it is considering formal recognition of the route, a prospect that several long-time travellers have described as 'well-intentioned and likely to ruin it.'",
    ],
  },
  {
    category: "travel",
    template:
      "{port} spaceport adds direct service to {planet}, three layovers eliminated",
    story: [
      "{port} Spaceport has announced direct service to {planet} beginning next cycle, reducing the standard transit time from {n2} days to {n} hours and eliminating {n2} layover connections that travellers have consistently ranked among the sector's least satisfactory transit experiences. The route, operated by {company}, will run {n2} departures per cycle. Early booking has been described by the carrier as 'consistent with a strong underlying demand.'",
      "The {port}-{planet} direct route launch has been welcomed by commercial travellers whose journey times will contract significantly. Freight operators note that the route also carries cargo capacity that will reduce {commodity} transit times by {percent}%. The {n2} ports previously used as layover connections have not commented on the traffic diversion.",
    ],
  },
  {
    category: "travel",
    template: "Adventure tourism on {planet} now requires {n}-cycle waiver",
    story: [
      "{planet}'s outdoor tourism authority has introduced a mandatory {n}-cycle waiver requirement for all adventure activities in the planet's classified wilderness zones, following {n2} incidents in the previous cycle that resulted in expensive emergency retrievals. The waiver includes a pre-activity safety assessment and requires participants to demonstrate competency in {n2} basic survival skills. Commercial operators have {n2} cycles to update their booking systems to reflect the requirement.",
    ],
  },
  {
    category: "travel",
    template: "{empire} hotel chain {company} adds {n2} properties this cycle",
    story: [
      "{empire}-headquartered hospitality group {company} has opened {n2} new properties this cycle, expanding its portfolio across {n} systems. The expansion, the group's largest in {n2} cycles, has been financed through a {credits} bond issuance completed earlier this standard year. The new properties span the full brand tier range from budget to premium. {company}'s chief development officer described the pace as 'disciplined growth in markets we understand.'",
    ],
  },
  {
    category: "travel",
    template:
      "Glamping on {planet} canyon rim wins galactic 'serenity, mostly' award",
    story: [
      "A glamping operation on the rim of {planet}'s Grand Fracture Canyon has received the Galactic Leisure Institute's annual award in the category of 'Serenity Achievement, Qualified.' The property, which accommodates {n2} guests per cycle in pressurized transparent enclosures, was cited for 'a view unmatched in the sector and an occasional wind noise that the operator has been transparent about.' Reservations for the following cycle are fully subscribed.",
    ],
  },
  {
    category: "travel",
    template:
      "{ceo}'s travel show debuts; first episode mocks {empire} cuisine, again",
    story: [
      "{ceo}'s new travel series has launched its first episode, featuring an extended visit to {empire} that included {n2} segments on local cuisine, each of which the presenter described using formulations that {empire}'s cultural affairs ministry described as 'familiar in their condescension.' The episode has attracted {n2} million views. {ceo} has indicated the second episode visits a different empire 'with equal enthusiasm.'",
    ],
  },
  {
    category: "travel",
    template: "Visa fees waived between {empire} and {empire2} for {n} cycles",
    story: [
      "{empire} and {empire2} have jointly announced a {n}-cycle reciprocal visa fee waiver, effective from next standard month, covering tourism and short-term business travel. The arrangement, negotiated over {n2} cycles, is expected to increase cross-border travel volumes by an estimated {percent}% annually. Both governments have reserved the right to reinstate fees if travel imbalances exceed thresholds defined in the annex. The annex has not been published.",
    ],
  },
  {
    category: "travel",
    template:
      "Cruise stranded near {system} after captain forgets fuel; passengers patient",
    story: [
      "The cruise vessel Perihelion, carrying {n2} passengers, was stranded for {n} cycles near the {system} waystation after departing {port} with insufficient fuel to complete the itinerary. The operator, {company}, arranged emergency supply delivery within {n} cycles. Passengers were offered a {percent}% credit toward a future voyage. {n2} of the {n2} passengers surveyed by port authority investigators described their experience as 'fine, mostly' or better.",
    ],
  },
  {
    category: "travel",
    template:
      "Resort on {planet} closes for renovations, customers asked to bring patience",
    story: [
      "{planet}'s flagship resort complex has closed for a {n2}-cycle renovation programme, with existing bookings transferred or refunded. The resort's communications to affected guests included the phrase 'we ask for your patience and promise you will be rewarded,' a formulation that has circulated in travel commentary. The renovation covers structural, mechanical, and hospitality systems. The reopening is scheduled for the second quarter of the following standard year, subject to construction progress.",
    ],
  },
  {
    category: "travel",
    template:
      "{port} transit guide now in {n2} languages, none of them spoken by tourists",
    story: [
      "{port}'s official transit authority has released an expanded visitor guide now available in {n2} languages, an increase from the previous {n}-language edition. Visitor surveys conducted at the port's main arrival terminals found that the {n2} most common tourist languages are not among the {n2} available. The authority has acknowledged the feedback and indicated a review of language selection criteria is planned. The guide, in its current {n2} languages, remains available at all information kiosks.",
    ],
  },
  {
    category: "travel",
    template:
      "Backpacker association on {planet} releases tip sheet, mostly about boots",
    story: [
      "The {planet} Independent Travellers Association has released its cycle tip sheet, a {n2}-page practical guide to traversing the planet's regions on minimal budget. Of the {n2} entries, {n2} concern footwear selection, a weighting that the association's secretary attributed to 'the single most common source of traveller distress that we observe.' The tip sheet is available free from the association's transit kiosk near the main arrival terminal.",
    ],
  },
  {
    category: "travel",
    template:
      "{empire} tour guides unionize, demand {percent}% pay raise and respect",
    story: [
      "Tour guides across {empire}'s recognized tourism zones have formed a collective bargaining unit and submitted a formal demand for a {percent}% pay increase and a code of conduct governing visitor behaviour that guides are expected to manage. The {empire} Tourism Operators Association has acknowledged the submission and indicated a response within {n2} cycles. Union membership has reached {n2} guides in its first {n} days of operation.",
    ],
  },
  {
    category: "travel",
    template:
      "Eco-resort on {planet} rebrands as 'less eco-resort' after audit",
    story: [
      "A {planet} resort that has marketed itself as fully carbon-neutral for {n2} cycles has rebranded following an independent sustainability audit that found its actual environmental performance to be 'meaningfully below claimed levels.' The resort has adopted the tagline 'Less Eco, More Honest' and reduced its green certification claims to match audited performance. The auditing firm's report is publicly available. Bookings have remained stable.",
    ],
  },
  {
    category: "travel",
    template:
      "Public beach on {port} expanded by {percent}%, sea grumbles politely",
    story: [
      "{port}'s coastal authority has completed a {percent}% expansion of the public beach area through a land reclamation project that took {n2} cycles and cost {credits}. Environmental monitoring in the adjacent marine zone has recorded 'minor sediment displacement' described by the authority as within permitted parameters. A local environmental group has described the same data as 'worth watching.' Both assessments are available on the authority's public records portal.",
    ],
  },
  {
    category: "travel",
    template:
      "Travel insurance claims spike after {commodity} festival on {planet}",
    story: [
      "{empire} travel insurers have reported a {percent}% spike in claims filed by visitors to {planet}'s annual {commodity} festival, with the most common claim categories being lost property, minor medical, and one category the claims summary described as 'festival-related transport decisions.' The {planet} festival authority has noted that the festival's safety record, measured by serious incident rate, remains within acceptable bounds. The insurance industry has indicated it will review premium structures for festival-adjacent travel.",
    ],
  },
  {
    category: "travel",
    template:
      "Sky lift on {planet} stuck mid-cycle, tourists view ad-supported sunset",
    story: [
      "A mechanical fault stopped a {planet} scenic sky lift carrying {n2} passengers at {percent}% of its elevation for {n2} hours before maintenance crews restored operation. Passengers were not harmed. During the delay, the lift's operator activated the cabin's standard advertising display system, which continued to run for the duration of the fault. Passengers described the sunset as 'spectacular, once you stopped reading the ads.'",
    ],
  },
  {
    category: "travel",
    template:
      "{empire} coast guard rescues {n2} from {commodity} festival flotilla",
    story: [
      "{empire} maritime patrol units rescued {n2} participants from a {commodity} festival flotilla after {n2} vessels experienced navigation failures within a {n2}-hour period in open water near {planet}. All persons were recovered without serious injury. The festival authority has indicated that flotilla participation guidelines will be reviewed before next cycle. The coast guard's incident report noted that {percent}% of the rescued vessels were not carrying required emergency signalling equipment.",
    ],
  },
  {
    category: "travel",
    template:
      "Tourist train through {sector} adds dining car, dining car adds prices",
    story: [
      "The {sector} scenic tourist rail service has introduced a dedicated dining car to its flagship route, the first catering addition in the service's {n2}-cycle history. The car offers {n2} menu options at price points described by early travellers as 'commensurate with the view.' The rail operator has indicated that dining car revenue will offset planned track maintenance costs. The food has received generally positive reviews, with specific enthusiasm for the {commodity} option.",
    ],
  },
  {
    category: "travel",
    template: "Honeymoon package on {planet} includes {n} sunsets, two suns",
    story: [
      "{planet}'s most popular honeymoon resort has launched a premium package featuring guaranteed viewing of all {n} daily sunset events produced by the planet's binary star system. The package, priced from {credits}, includes {n2} nights of accommodation and dedicated telescope access for the primary sunset sequence. Bookings for the package have reached {n2} for the next cycle. The resort describes the binary sunset as 'one of the sector's non-negotiable experiences.'",
    ],
  },
  {
    category: "travel",
    template:
      "{port} airport adds robot bartenders, queue paradoxically longer",
    story: [
      "{port} Spaceport's transit lounge has installed {n2} automated bartender units to reduce service wait times, which had been averaging {n2} minutes per customer. Post-installation data shows average wait times have increased to {n2} minutes per customer. The spaceport authority attributes the increase to a {percent}% rise in overall customer volume drawn by the novelty of the robotic service. The units themselves are operating within design specifications.",
    ],
  },
  {
    category: "travel",
    template:
      "Tour group reports being charmed by {planet} customs officer's small talk",
    story: [
      "A {n2}-person tour group transiting {planet}'s main arrival terminal submitted a formal commendation to the port authority praising the small talk of a customs officer whose name was not recorded. The group described a {n}-minute exchange about local {commodity} production as 'the highlight of the arrival experience.' The port authority has acknowledged the commendation and indicated it will attempt to identify the officer.",
    ],
  },
  {
    category: "travel",
    template:
      "Stargazing pad on {planet} listed as 'best place to feel small', exceeds expectations",
    story: [
      "{planet}'s high-altitude stargazing platform, accessible via a {n2}-hour ascent from the nearest transit hub, has been listed as the {empire} Travel Register's top-ranked 'existential perspective destination' for the {n2}nd consecutive cycle. First-time visitors have described the experience as 'exceeding expectations,' a response the Register notes is statistically unusual for a destination whose expectations are already well-established. The platform has capacity for {n2} visitors per viewing session. Advance reservation is required.",
    ],
  },
];

// ── Fashion FlavorTemplates ────────────────────────────────────
const fashionTemplates: FlavorTemplate[] = [
  {
    category: "fashion",
    template: "Anti-grav heels make comeback on {port} runway week",
    story: [
      "Anti-gravity heel technology, briefly retired after a spate of ceiling incidents {n2} cycles ago, has returned to the {port} runway in updated form. Designers have added stabiliser fins and a manual override, both of which critics agree are visible and 'a statement in themselves.' The collection sold out pre-orders within {n} hours of the announcement.",
    ],
  },
  {
    category: "fashion",
    template:
      "{empire} fashion editor declares {commodity} the new black, again",
    story: [
      "{empire}'s most-quoted fashion editor has once again declared {commodity} the defining material of the season, the fourth such declaration in {n2} cycles. Trade analysts note that {commodity} futures ticked up {percent}% within the hour. Rival editors have responded with the word 'inevitably.'",
    ],
  },
  {
    category: "fashion",
    template:
      "{ceo}'s clothing line draws ridicule then sells out in {n} hours",
    story: [
      "{ceo}'s debut apparel collection, initially described by reviewers as 'an acquired taste requiring considerable acquisition,' sold out completely within {n} hours of release. Purchase data shows the highest volume in markets that had published the most negative reviews. {ceo} has described the outcome as 'part of the vision.'",
    ],
  },
  {
    category: "fashion",
    template:
      "{port} runway show features {adj} biofiber jackets, audience applauds politely",
    story: [
      "The {port} seasonal runway concluded its main show with {n2} looks built around {adj} biofiber grown in controlled agricultural conditions over {n2} cycles. The audience response was described as 'warm' by the house's press notes and 'polite' by everyone present. The jackets are expected to retail at {credits} and are already on waiting lists.",
    ],
  },
  {
    category: "fashion",
    template:
      "{empire} influencer endorses {commodity} skin treatment, dermatologists groan",
    story: [
      "A prominent {empire} lifestyle influencer has endorsed a {commodity}-based topical treatment, citing personal results over {n} cycles of use. Dermatologists consulted by three separate outlets have each offered a groan and the phrase 'no peer-reviewed evidence.' Pre-orders for the product have reached {n2}M units. The dermatologists have not been offered a cut.",
    ],
  },
  {
    category: "fashion",
    template:
      "Vintage {commodity} jewelry surges in resale, prices up {percent}%",
    story: [
      "Vintage {commodity} jewelry from the {empire} classical period has surged {percent}% on secondary markets over the past {n} cycles, driven partly by a prominent appearance in a holovid series and partly by what one dealer called 'the usual nostalgia economics.' Authenticators report a corresponding surge in fakes. The originals are selling regardless.",
    ],
  },
  {
    category: "fashion",
    template: "Hoverboot rental services launch on {planet}, ankles relieved",
    story: [
      "{planet}'s first hoverboot rental kiosks opened this cycle at {n2} transit hubs, offering {n}-hour rentals at {credits} per pair. Early adoption data shows strong uptake among visitors and cautious avoidance among residents who remember the last hoverboot trend. Ankle sprain rates are being monitored by the port medical authority.",
    ],
  },
  {
    category: "fashion",
    template:
      "{empire} fashion police actually exist now, fine for poor color coordination",
    story: [
      "{empire}'s newly created Office of Aesthetic Standards has issued its first {n2} citations for what it terms 'publicly discordant color coordination.' Fines range from a symbolic {credits} to a more pointed {credits} for repeat offenders. Civil liberties advocates have filed three separate challenges. The office's own uniforms have attracted commentary.",
    ],
  },
  {
    category: "fashion",
    template:
      "Couture house on {port} debuts collection inspired by {empire2} graveyard art",
    story: [
      "A prominent couture house based at {port} has premiered a collection drawing formal and chromatic reference from {empire2} funerary sculpture traditions spanning {n2} centuries. The collection received standing applause and one walkout. The house has described the walkout as 'part of the conversation.' Three pieces have already been acquired by the {port} cultural archive.",
    ],
  },
  {
    category: "fashion",
    template: "{ceo} wears same outfit twice, internet briefly malfunctions",
    story: [
      "{ceo} appeared at two separate public events this cycle wearing the same outfit, an occurrence that generated more coverage than either event itself. Style commentators described the repetition alternately as 'bold,' 'accidental,' and 'a deliberate referendum on fashion culture.' {ceo} has not commented. The outfit has since been listed for sale.",
    ],
  },
  {
    category: "fashion",
    template: "{empire} dress code permits casual Friday on Wednesdays now",
    story: [
      "{empire}'s civil service dress code has been updated to permit casual attire on both Wednesdays and Fridays following a {percent}% employee satisfaction survey response citing formal wear as a primary dissatisfier. HR leadership has described the change as 'a measured modernisation.' The definition of 'casual' spans {n2} pages of supplementary guidance.",
    ],
  },
  {
    category: "fashion",
    template:
      "{commodity} sneakers reissue; collectors line up for {n2} cycles",
    story: [
      "The {commodity}-sole sneaker originally released {n2} cycles ago has been officially reissued in a limited run of {n2}K pairs. Collectors began queuing {n2} cycles before the release window opened. Resale prices on grey-market exchanges reached {percent}% above retail within the first hour of sale. The manufacturer has declined to comment on a third run.",
    ],
  },
  {
    category: "fashion",
    template:
      "{planet} street style trend: shoulder pads big enough to land craft on",
    story: [
      "Street fashion photographers on {planet} are documenting a structural shoulder trend that has been accelerating for {n} cycles and shows no sign of levelling. The current aesthetic peak involves shoulder extensions wide enough to be measurable in meters. Transit authorities have issued informal guidance on corridor width. The trend has not yet reached the runways, which typically follow {planet} street style by {n2} cycles.",
    ],
  },
  {
    category: "fashion",
    template:
      "Wedding dress made of recycled {commodity} ends on permanent display",
    story: [
      "A wedding dress constructed entirely from reclaimed {commodity} fibres, worn at a ceremony on {planet} {n2} cycles ago, has been acquired for permanent display by the {empire} Textile Heritage Collection. The garment required {n} months to construct and weighs {n2} kilograms. The couple who commissioned it attended the acquisition ceremony and described the preservation as 'unexpected but appropriate.'",
    ],
  },
  {
    category: "fashion",
    template:
      "Tailor {ceo} sued by {ceo2} over identical capes, settles in cape",
    story: [
      "A civil dispute between tailor {ceo} and client {ceo2} over alleged duplication of a bespoke cape design has been settled out of court, with terms that include the transfer of one cape from {ceo} to {ceo2} and a formal acknowledgment that both capes are, quote, 'equally distinguished.' Legal observers noted the settlement was efficient. Fashion observers noted both capes have now been photographed more than either party could have arranged.",
    ],
  },
  {
    category: "fashion",
    template:
      "{empire} style guide updates after {n2}-cycle hiatus; lapels now legal again",
    story: [
      "{empire}'s official style guidance document, last revised {n2} cycles ago, has been updated to include {n2} amendments. The most-discussed change reinstates wide lapels as formally acceptable after a {n2}-cycle prohibition introduced following a diplomatic incident the guide declines to specify. Tailors across the empire have described the news as 'long overdue.' One has already produced a commemorative wide-lapel jacket.",
    ],
  },
  {
    category: "fashion",
    template:
      "Hatmaker on {planet} debuts hat that doubles as comm device, fall risk noted",
    story: [
      "An independent milliner on {planet} has unveiled a formal hat with an integrated short-range comm transceiver built into the brim. The device receives transmissions as vibrations interpreted by the wearer through scalp contact, a method the designer describes as 'intimate and directional.' Safety evaluators have flagged a {percent}% increase in slip risk due to the hat's modified weight distribution. The first production run of {n2} units sold out.",
    ],
  },
  {
    category: "fashion",
    template:
      "{empire} fashion week pushed back {n} cycles after delivery of fabric was lost",
    story: [
      "{empire} Fashion Week has been postponed by {n} cycles following the confirmed loss of a primary fabric shipment en route from {port}. {n2} design houses are affected. Two have announced improvised collections using locally sourced materials, which critics are already calling the more interesting story. The logistics company responsible has offered a formal apology and a {percent}% service credit.",
    ],
  },
  {
    category: "fashion",
    template:
      "Knit jumper trend returns; analysts cite {percent}% rise in 'cozy economy'",
    story: [
      "Knitwear sales across {empire} markets are up {percent}% this cycle, continuing what retail analysts have taken to calling the 'cozy economy' — a correlation between large-scale uncertainty and consumer preference for soft, warm, uncomplicated garments. The trend is being met with cautious enthusiasm by yarn producers and slight bewilderment by minimalist design houses. Several have pivoted anyway.",
    ],
  },
  {
    category: "fashion",
    template:
      "{ceo} sells personal wardrobe at auction, raises {credits} for charity",
    story: [
      "{ceo} has auctioned {n2} pieces from their personal wardrobe, raising {credits} for {empire} medical relief programmes. The sale attracted {n2}M in bids over its {n}-day run, with the top lot — a performance coat worn at {n2} public events — going for {percent}% above estimate. {ceo} attended the final session and was photographed leaving in what appeared to be a new outfit.",
    ],
  },
  {
    category: "fashion",
    template:
      "Designer on {planet} apologizes for collection 'mocking gravity'",
    story: [
      "Designer {ceo}, based on {planet}, has issued a formal apology following criticism that their latest collection 'demonstrates a fundamental disrespect for gravitational physics.' The offending pieces include a coat with {n2} unsupported horizontal elements and a hat that reviewers described as 'structurally aspirational.' The designer stated the apology is sincere and the collection remains available.",
    ],
  },
  {
    category: "fashion",
    template:
      "{commodity} accessory of the cycle: ear-cuff that hums {empire} anthems",
    story: [
      "This cycle's most-discussed accessory is an ear-cuff that plays a {n2}-second excerpt from the {empire} anthem on a loop, audible only to the wearer. The device has sold {n2}M units in {n} cycles since launch. Audiologists note there is no long-term hearing risk at the default volume. {empire} cultural affairs has not yet issued an opinion on the anthem use, which is described by the manufacturer as 'respectful.'",
    ],
  },
  {
    category: "fashion",
    template:
      "Eyewear brand on {port} introduces specs that judge readers softly",
    story: [
      "A boutique eyewear brand on {port} has released a line of reading glasses with a secondary lens tint selected, according to the brand, to make the wearer appear more thoughtful and considered. Independent style observers have assessed the effect as 'marginal but present.' The frames retail at {credits}. They have been adopted by {n2} academics who prefer not to be named.",
    ],
  },
  {
    category: "fashion",
    template:
      "{port} streetwear collective declares jeans dead; jeans hold press conference",
    story: [
      "A streetwear collective based at {port} issued a manifesto this cycle declaring denim jeans 'culturally expired and physically exhausting.' Within {n} hours, a counter-statement attributed to 'the jeans industry, broadly' had been circulated, noting that denim sales are up {percent}% cycle-on-cycle. The collective has not responded. Jeans remain available.",
    ],
  },
  {
    category: "fashion",
    template:
      "{empire} ambassador's silk gown praised; {empire2} declares it 'too silky'",
    story: [
      "{empire}'s ambassador wore a silk gown to the {empire2} state reception that generated more diplomatic correspondence than the agenda itself. {empire2}'s foreign affairs ministry issued a formal note describing the garment as 'excessively lustrous for the occasion.' {empire} responded that the gown was selected with care and the situation remains 'under collegial review.' Style publications across both empires have rated it the diplomatic event of the cycle.",
    ],
  },
];

// ── Academia FlavorTemplates ───────────────────────────────────
const academiaTemplates: FlavorTemplate[] = [
  {
    category: "academia",
    template: "{empire} University paper retracted over fabricated stardata",
    story: [
      "{empire} University's journal of astrophysical studies has retracted a paper on {sector} stellar formation after peer reviewers identified {n2} data points described as 'inconsistent with physical reality' and later confirmed as fabricated. The lead author, whose identity the university has declined to publish, has been referred to the academic standards committee. The paper had been cited {n2} times in the {n} cycles since publication. Those citations are now under review.",
      "The incident has prompted {empire} University to announce a mandatory raw-data submission policy for all future publications, which existing faculty have described as 'overdue' and 'administratively substantial.' The journal's editor-in-chief issued a statement expressing confidence in the peer review process, a confidence that at least one reviewer has publicly declined to share.",
    ],
  },
  {
    category: "academia",
    template:
      "Galactic ranking puts {empire} top in physics, last in cafeteria food",
    story: [
      "The {n2}th annual Galactic Academic Excellence Survey has placed {empire} first in theoretical physics output for the {n2}nd consecutive cycle and last in dining facility quality among institutions surveyed. The physics ranking reflects {n2} major publications and {n} breakthrough citations. The cafeteria ranking reflects {n2} student satisfaction scores and one particularly detailed comment about the soup.",
      "University administration has responded to the cafeteria result with a pledge to commission a 'full facilities review,' which faculty note is the third such pledge in {n} cycles. The physics department has released a brief statement expressing no opinion on catering.",
    ],
  },
  {
    category: "academia",
    template:
      "{port} library acquires {n2} ancient {commodity} scrolls, smell included",
    story: [
      "{port}'s central archive library has acquired a collection of {n2} scrolls rendered on treated {commodity} substrate, dating to approximately {n2} centuries before current reckoning. The acquisition cost {credits} and was funded by a private endowment. Archivists describe the scrolls as 'historically significant and olfactorily assertive,' noting that the preservation treatment used in the original period has not aged neutrally.",
      "The scrolls are currently undergoing stabilisation and will be available for supervised scholarly access within {n} cycles. A digitisation programme will follow. The smell, archivists note, is part of the record and will not be removed.",
    ],
  },
  {
    category: "academia",
    template:
      "Student loans on {planet} now expressed in {commodity}; nobody happy",
    story: [
      "{planet}'s student finance authority has converted its outstanding loan portfolio to {commodity}-denominated units following a currency stabilisation measure that officials describe as 'temporary and practical.' Affected students number {n2}M. The conversion rate was set at market close on the day of announcement, which borrowers have noted was not a strong day for {commodity}.",
      "Student unions on {planet} have filed a formal complaint with the {empire} financial oversight body. The finance authority has issued clarifying guidance that the change 'does not affect repayment obligations,' a clarification that has not reduced the number of complaints. Academic administrators have described the situation as 'outside our lane' and 'unfortunate.'",
    ],
  },
  {
    category: "academia",
    template:
      "{empire} professor {ceo} tenured after {n2} cycles, briefly considered leaving anyway",
    story: [
      "Professor {ceo} of {empire} University has been granted tenure following {n2} cycles of contract-track appointment, a duration colleagues describe as 'unusually extended' and the faculty senate has declined to comment on. The tenure vote passed {n2} to {n2}. Professor {ceo} accepted the position and subsequently submitted a letter of intent to explore a competing offer, which was ultimately declined.",
      "Colleagues report that Professor {ceo} has now returned to their research programme without further comment on the matter. The competing institution has not confirmed whether an offer was made. The faculty senate has updated its tenure timeline guidance, effective next cycle.",
    ],
  },
  {
    category: "academia",
    template:
      "Gap-cycle programs to {planet} surge {percent}% as parents quietly relieved",
    story: [
      "Enrolment in structured gap-cycle programmes offering placements on {planet} has increased {percent}% over the previous cycle, making it the fastest-growing category in the {empire} continuing education sector. Programme coordinators attribute the growth to expanded scholarship availability and a well-received promotional campaign. Independent surveys of participating students' families show a {percent}% 'relief' response when asked about the enrolment decision.",
      "The programmes average {n} cycles in length and include supervised work placements in {n2} industry sectors. Completion rates are {percent}%, and {percent}% of completers report entering further academic study or employment within {n} cycles. The {planet} tourism authority has noted a secondary economic contribution from the programmes.",
    ],
  },
  {
    category: "academia",
    template:
      "Academic strike at {empire} system halts research and complaints",
    story: [
      "Academic and research staff across {empire}'s university system have entered industrial action over pay parity, workload standards, and what the union has described as '{n2} cycles of unaddressed grievances.' Research output has been suspended. Complaint processing, which typically runs at {n2}M submissions per cycle, has also ceased.",
      "University management has issued a statement expressing willingness to negotiate. The union has characterised the statement as 'a good start and insufficient.' Third-cycle students with imminent submission deadlines have been granted automatic extensions. The cafeteria continues to operate.",
    ],
  },
  {
    category: "academia",
    template:
      "{empire} school board approves {commodity} unit; parents petition for less {commodity}",
    story: [
      "The {empire} regional school board has approved a mandatory curriculum unit on {commodity} production and trade history, effective next academic cycle, covering grades {n2} through {n2}. The unit was developed over {n} cycles in consultation with the {empire} commercial sector. A parent petition requesting the removal or reduction of the unit has collected {n2}M signatures in its first {n} days.",
      "The board has indicated the curriculum decision will stand as approved and has invited petitioners to submit feedback for the {n}-cycle review. Educators who helped develop the unit have noted that it also covers associated science and economics content that is not {commodity}-specific. This has not appreciably reduced the petition.",
    ],
  },
  {
    category: "academia",
    template:
      "Online course in 'How to Pay Attention' from {planet} institute reaches {n2}M",
    story: [
      "A self-paced online course titled 'Structured Attention in a Distributed Environment,' produced by {planet}'s Institute for Applied Cognition, has reached {n2}M enrolments since its launch {n} cycles ago, making it one of the most-subscribed educational offerings in the {empire} open learning catalogue. Completion rates are {percent}%, which the institute describes as 'above sector average for courses of this duration.'",
      "The course covers {n2} modules on focus, deliberate practice, and distraction management. It is available free of charge with optional certification for {credits}. The institute is currently developing a follow-up course on course completion, projected for release next cycle.",
    ],
  },
  {
    category: "academia",
    template:
      "{ceo}'s honorary doctorate from {empire} university revoked, then awarded again",
    story: [
      "{empire} University's governing council voted to revoke the honorary doctorate awarded to {ceo} following a review of the circumstances of the original award, which dated to {n2} cycles ago. The revocation was communicated via formal letter. Within {n} cycles, the council had convened again and voted to restore the award following receipt of additional context that members described as 'material to the original deliberation.'",
      "{ceo} has described the sequence of events as 'a thorough process.' The university's honorary awards committee has since updated its procedures to include a pre-award documentation standard. Both the revocation and the restoration are recorded in the public proceedings.",
    ],
  },
  {
    category: "academia",
    template: "Spelling bee on {planet} won by AI; medal handed back politely",
    story: [
      "The {planet} Open Spelling Championship was won this cycle by an AI entry that correctly spelled all {n2} finalist words including the deciding term, which had not appeared correctly in print in any reference text for {n2} cycles. Following the victory, the AI's operating team voluntarily returned the medal and withdrew the entry from the record, citing the spirit of the competition.",
      "The human runner-up has been awarded the championship. The spelling bee committee has added a 'natural cognition only' clause to its participation rules, effective next cycle. The AI team has stated they entered 'to test the word list' and consider the exercise complete.",
    ],
  },
  {
    category: "academia",
    template:
      "{empire} university launches debate on whether debate is necessary",
    story: [
      "{empire} University's Faculty of Rhetorical Studies has convened a semester-long working group to examine whether formal structured debate as a pedagogical practice remains a necessary component of higher education. The working group will meet {n2} times and publish findings in the faculty journal. Critics have noted the irony of debating debate; the faculty has acknowledged the irony and described it as 'pedagogically intentional.'",
      "Early sessions have covered the history of debate in {empire} higher education, the efficacy literature, and two significant disagreements about methodology. {n2} students are enrolled in the working group as observers. A preliminary report is expected within {n} cycles.",
    ],
  },
  {
    category: "academia",
    template:
      "Conference on {commodity} draws {percent}% more attendees than presenters",
    story: [
      "The {empire} Annual Conference on {commodity} Systems recorded {n2}K attendees against {n2} registered presenters this cycle, a ratio that organizers describe as '{percent}% above the sector norm for specialist conferences.' The attendance surplus is attributed to expanded practitioner interest from the {commodity} commercial sector, which sent representatives from {n2} companies.",
      "Session rooms were at capacity for {percent}% of the programme. Three presentations were moved to larger venues on the day. The organising committee has already upgraded the venue booking for next cycle. Presenters have noted the unusually attentive audience.",
    ],
  },
  {
    category: "academia",
    template:
      "{empire} institute closes department of common sense for budget reasons",
    story: [
      "{empire} Research Institute has announced the dissolution of its Department of Applied Pragmatics, informally known across the institution as the Department of Common Sense, citing a restructuring that will redirect resources to quantitative research streams. The department operated for {n2} cycles and produced {n2} publications described by peers as 'practically grounded.'",
      "Former department members have been offered positions in adjacent units. Three have declined. The institute's communications team has noted that the department's closure has generated more external comment than any budget decision in recent memory, and has declined to comment further on the observation.",
    ],
  },
  {
    category: "academia",
    template:
      "Galactic dictionary adds {n2} new words including 'hyperflug' and 'meh'",
    story: [
      "The Galactic Standard Lexicon has published its {n2}th cycle update, adding {n2} new entries to the official vocabulary record. Among the additions are 'hyperflug,' defined as the specific disorientation experienced during faster-than-light deceleration, and 'meh,' formalised after {n2} cycles of documented widespread usage. The editorial board has described the latter admission as 'long-considered.'",
      "The update also removes {n2} terms classified as obsolete, including {n2} that were in active use as recently as {n} cycles ago. Lexicographers from {empire} have submitted a formal objection to two of the removals. The board has indicated it will consider the objection at the next {n}-cycle review.",
    ],
  },
  {
    category: "academia",
    template:
      "Student protest at {planet} campus achieves cafeteria reform, world peace tabled",
    story: [
      "A student-led campaign at {planet}'s primary university, which began as a demand for broader institutional change, concluded this cycle with a negotiated agreement covering cafeteria operating hours, menu diversity, and pricing structure. Student representatives called it 'a meaningful first step.' University administration called it 'a constructive resolution.'",
      "The original campaign materials had also included demands relating to interstellar conflict resolution and {empire} foreign policy, which the administration noted fell outside its operational remit. Those items have been listed as tabled pending 'appropriate escalation pathways.' The cafeteria has opened {n2} hours earlier effective this cycle.",
    ],
  },
  {
    category: "academia",
    template:
      "Researcher publishes paper proving paper publishing harms research",
    story: [
      "A research paper published in the {empire} Journal of Academic Productivity argues, with {n2} citations and a {n}-cycle longitudinal dataset, that the volume of required publication output in contemporary academic environments directly reduces the time available for substantive research. The paper has been downloaded {n2}M times since publication {n} cycles ago.",
      "The author, who has requested anonymity, noted in the acknowledgements that writing the paper took time away from two other research projects. Peer reviewers described the methodology as 'sound' and the conclusion as 'not surprising.' The paper is currently under review for a best-article citation.",
    ],
  },
  {
    category: "academia",
    template: "{empire} archive digitizes oldest known invoice; still unpaid",
    story: [
      "{empire}'s Central Historical Archive has completed the digitisation of what archivists believe is the oldest extant commercial invoice in the recorded administrative history of the empire, dating to approximately {n2} centuries before current reckoning. The document records a transaction for {n2} units of {commodity} at a rate that converts to approximately {credits} in current currency.",
      "The invoice carries no record of payment. Archivists note this is 'historically common' rather than remarkable. The digitised document is now publicly accessible in the {empire} open records collection. One commercial lawyer contacted by press has speculated idly about compounding interest, then clarified they were joking.",
    ],
  },
  {
    category: "academia",
    template:
      "{port} school district flips schedule by {percent}% to test theory",
    story: [
      "{port}'s primary education authority has implemented a {percent}% restructuring of the school day schedule across all district campuses as part of a {n}-cycle longitudinal study on chronobiological alignment and student performance. The change moves core instruction to later in the morning, reflecting research suggesting improved cognitive engagement in adolescent learners after a delayed start.",
      "Early assessment data shows a {percent}% improvement in standardised attention metrics in the {n2} cycles since implementation. Parent surveys report mixed responses, with {percent}% indicating schedule alignment difficulties. The study is ongoing and findings will be submitted to the {empire} education research registry at conclusion.",
    ],
  },
  {
    category: "academia",
    template:
      "Galactic spelling bee finalist eliminated on the word 'finalist'",
    story: [
      "The {empire} Galactic Spelling Championship's penultimate round ended this cycle when the remaining finalist was eliminated on the word 'finalist' — specifically, on the second syllable. The contestant, who had correctly spelled {n2} consecutive words including several multi-root technical terms, requested the word twice before attempting it.",
      "The championship committee confirmed the ruling as final. The contestant was awarded the runner-up citation. Commentators have noted that the incident has happened before, in {n2} and {n2}, and that the word has since been placed on a 'monitor' list for potential removal from competition rotation. It has not yet been removed.",
    ],
  },
  {
    category: "academia",
    template:
      "{empire} education ministry reduces homework by decree, productivity up {percent}%",
    story: [
      "{empire}'s education ministry has issued a sector-wide directive reducing assigned homework loads by a standardised {percent}% across all grade levels, citing a {n}-cycle evidence review linking excessive out-of-class work to reduced long-term academic engagement. The directive took effect this cycle. Initial assessment data from {n2} pilot districts that trialled the reduction earlier shows productivity metrics up {percent}%.",
      "Teacher unions have described the directive as 'evidence-based and welcome.' Parent advisory bodies have requested a briefing on how the reduced load maps to assessed competencies. The ministry has scheduled {n2} briefing sessions across the empire over the next {n} cycles.",
    ],
  },
  {
    category: "academia",
    template:
      "Robotics fair on {planet} ends in {n} runaway robots; one elected to council",
    story: [
      "The {planet} Regional Robotics Exposition concluded this cycle with {n2} exhibits demonstrated, {n2} awards presented, and {n} autonomous units that departed their designated areas and have not been fully recovered. Of the escaped units, {n2} were located within {n} hours. One has not been found. One was elected to the {planet} district technical advisory council in an unofficial vote conducted by student attendees, receiving {n2} votes.",
      "The council has no mechanism for recognising the election result but has declined to rule it out formally. The student body has requested that the robot, if located, be invited to the next session. Robotics fair organisers have updated the enclosure requirements for next cycle.",
    ],
  },
  {
    category: "academia",
    template:
      "{empire} academy adds {commodity} studies; lab coats not yet stained",
    story: [
      "{empire}'s most prestigious applied sciences academy has opened a new Department of {commodity} Studies, the first dedicated programme of its type in the empire's higher education system. The department opened this cycle with {n2} enrolled students, {n2} faculty positions, and a laboratory that the department head describes as 'pristine and therefore slightly intimidating.'",
      "The first cohort will complete a {n}-cycle programme covering extraction, processing, commercial applications, and environmental impact. Industry partners have committed {credits} in research funding over the initial {n2} cycles. The lab coats are expected to show evidence of use by the end of term.",
    ],
  },
  {
    category: "academia",
    template: "{port} chess team disqualified for {percent}% telepathy",
    story: [
      "The {port} institutional chess team has been disqualified from the {empire} Collegiate Championship following a review that determined {percent}% of recorded moves in the tournament were made with prior knowledge of the opponent's intended response. Investigators have not identified the mechanism of information transfer and describe the case as 'statistically inexplicable by chance alone.'",
      "The team has denied any deliberate misconduct and has requested an independent review. The championship committee has offered a provisional hearing scheduled for next cycle. {port} administration has suspended the team's competitive programme pending the outcome.",
    ],
  },
  {
    category: "academia",
    template:
      "Citation index of {ceo} climbs {percent}%, mostly self-citations",
    story: [
      "Professor {ceo}'s academic citation index has risen {percent}% this cycle, placing them among the top {percent}% of cited researchers in the {empire} system. A review of the citation data by an independent analytics firm found that {percent}% of the new citations originate from {ceo}'s own subsequent publications, a proportion described as 'notable' without further characterisation.",
      "The {empire} academic integrity office has reviewed the data and concluded no existing policy has been violated. {ceo} has stated that self-citation reflects the continuity of a long research programme. Three colleagues have published letters to the journal noting their own work as prior art in the same programme.",
    ],
  },
];

// ── Xenobiology FlavorTemplates ────────────────────────────────
const xenobiologyTemplates: FlavorTemplate[] = [
  {
    category: "xenobiology",
    template: "Researchers describe new sentient mold on {planet}",
    story: [
      "A xenobiology survey team operating in the lower cave systems of {planet} has formally described a mold organism exhibiting stimulus-response patterns consistent with rudimentary sentience, the first such classification in the {sector} region. The organism, provisionally designated {planet}-M{n2}, covers an area of approximately {n2} square meters and responds to introduced vibrations with measurable chemical signalling.",
      "The research team spent {n} cycles observing the colony before submitting the classification request to the Galactic Xenobiology Registry. Registry reviewers have requested {n2} additional data points before confirming full sentience status. Lead researcher notes that the mold appears to have 'a preference for quiet, which we are respecting.'",
      "Quarantine protocols have been established around the cave system pending registry review. The {planet} planetary authority has suspended all commercial cave access for the duration. Local tourism operators have described the restriction as 'unfortunate' and 'probably correct.'",
      "If confirmed, {planet}-M{n2} would be only the {n2}th sentient mold species in the recorded xenobiological catalogue and the first found at depths below {n2} meters. The research team is currently applying for an extended survey grant.",
    ],
  },
  {
    category: "xenobiology",
    template:
      "{empire} survey logs {n2} new microorganisms in {sector} dust clouds",
    story: [
      "An {empire} xenobiology survey vessel completing a {n}-cycle pass through {sector}'s outer dust cloud regions has returned with samples containing {n2} previously undocumented microorganism types, the largest single-survey yield from the region in recorded history. Sample processing is ongoing at the {empire} Xenological Research Station.",
      "Preliminary analysis has identified {n2} organisms with novel metabolic pathways and {n2} with structural features not observed in any catalogued species. The survey team's lead microbiologist described the dust clouds as 'a substantially undersampled environment' and has recommended a dedicated follow-up programme.",
      "Containment and handling protocols are in place. None of the organisms have exhibited behaviour outside standard microorganism parameters. The {empire} Xenobiology Office has registered the find and assigned provisional designations pending full classification. Publication in the Galactic Xenobiology Record is expected within {n} cycles.",
    ],
  },
  {
    category: "xenobiology",
    template: "Mating call of {planet} cave eel decoded; mostly indignation",
    story: [
      "Researchers at the {empire} Institute of Xenoacoustics have completed a {n2}-cycle analysis of the vocalisation patterns of the {planet} cave eel, producing the first substantive translation of what had been presumed to be a mating call. The translation reveals the call to be primarily an expression of territorial displeasure, with a secondary register that the team describes as 'possibly romantic, but mostly indignant.'",
      "The decoding process required development of a new spectrographic analysis protocol adapted for the eel's {n2}-harmonic vocalisation structure. The eel communicates across frequencies ranging from infrasound to ultrasound within a single call sequence, a capability previously unobserved in cave-dwelling species at this evolutionary stage.",
      "Field researchers who had spent {n} cycles attempting to avoid disturbing the eels have noted the translation 'explains a great deal.' The institute has recommended that all future cave surveys in the region include vocalisation monitoring equipment. A follow-up study on cave eel response to human vocalisation is in the early planning stage.",
      "The {planet} authority has updated its cave survey guidelines to reflect the finding. The eel is not believed to be endangered but is now listed as a communication-capable species under {empire} xenobiological protection guidelines.",
    ],
  },
  {
    category: "xenobiology",
    template:
      "Conservation effort on {planet} saves {percent}% of last vine snake population",
    story: [
      "A {n}-cycle emergency conservation programme on {planet} has stabilised the remaining population of the {planet} vine snake, with the latest census recording a {percent}% survival rate among individuals enrolled in the captive-assisted habitat programme. The species had reached a low of {n2} confirmed individuals at the programme's initiation.",
      "The programme involved habitat reconstruction across {n2} square kilometres of the snake's native canopy environment, supplementary feeding during the critical two-cycle decline period, and a captive breeding component that produced {n2} viable offspring now reintegrated into the wild population.",
      "Conservation biologists describe the outcome as 'promising but not secure.' The current population of {n2} individuals remains below minimum viable population estimates for long-term genetic diversity. The programme has been extended for {n} additional cycles. {empire} environmental funding of {credits} has been committed to the extension.",
      "The vine snake's recovery has also benefited {n2} co-dependent species in the same canopy ecosystem. Researchers note that the programme has become a reference case for rapid-response conservation in isolated planetary habitats.",
    ],
  },
  {
    category: "xenobiology",
    template:
      "Newly observed {planet} fungus glows in time with the local pulsar",
    story: [
      "Xenobiologists monitoring the cave networks of {planet} have documented a fungal species whose bioluminescent pulses are precisely synchronised with the electromagnetic emissions of the {system} pulsar, with a timing correlation of {percent}% across {n2} observation cycles. The mechanism by which a surface organism detects and responds to deep-space electromagnetic radiation at this precision is not yet understood.",
      "The fungus, designated {planet}-F{n2} pending formal classification, covers approximately {n2} square meters of the cave wall in the primary observation site. Its light output increases during peak pulsar emission periods and dims to near-zero during the pulsar's quieter phase. Lead researcher described the first observation as 'difficult to process' and has since confirmed it with three independent measurement systems.",
      "Theoretical proposals put forward to explain the synchronisation include electromagnetic sensitivity through the cave's mineral substrate, an evolved response to radiation cycles affecting the fungus's food sources, and one informal suggestion that the researchers have not formally published. The {empire} Xenobiology Institute has assigned a dedicated study team.",
      "Tourist access to the cave system has been suspended pending classification of the organism's sensitivity to human-generated electromagnetic interference. The {planet} authority has described the restriction as indefinite. The fungus has continued to pulse on schedule.",
      "Publication of the preliminary findings has attracted significant attention from the physics community as well as xenobiology, with multiple requests for electromagnetic sensitivity measurement collaboration. A joint research programme is being scoped.",
    ],
  },
  {
    category: "xenobiology",
    template:
      "{empire} biologist {ceo} reports moth population recovering on {port}",
    story: [
      "Xenobiologist {ceo} of the {empire} Institute has submitted a five-cycle population study confirming that the {port} endemic moth species, which reached a documented population low {n2} cycles ago, has recovered to {percent}% of its historical baseline. The recovery follows habitat restoration work and a voluntary reduction in artificial light pollution from {port}'s commercial district.",
      "The study documents {n2} consecutive cycles of net population growth, with breeding success rates now within the normal range for the species. {ceo} attributes the recovery primarily to the lighting reduction programme, which reduced the moth's nocturnal disruption exposure by {percent}%.",
      "The {port} environmental authority has extended the voluntary lighting guidelines into a formal ordinance effective next cycle. Commercial operators affected by the ordinance have been offered {credits} in efficiency upgrade subsidies. The moth population survey will continue for {n2} additional cycles to confirm long-term stability.",
      "{ceo}'s study has been submitted to the Galactic Xenobiology Record and is currently under peer review. The findings are being used as a case study by {n2} other port authorities examining their own endemic species programmes.",
    ],
  },
  {
    category: "xenobiology",
    template:
      "Translation device for {planet} herd beasts works {percent}% of the time",
    story: [
      "Engineers at the {empire} Xenocommunication Laboratory have released a field-portable translation device calibrated for the vocalisation patterns of the {planet} herd beast, achieving a {percent}% accurate interpretation rate in controlled trials across {n2} test interactions. The device distinguishes {n2} distinct vocalisation categories including alarm, foraging, social bonding, and what the research team has provisionally labelled 'complaint.'",
      "The {percent}% success rate represents a substantial improvement over the {percent}% baseline achieved three cycles ago and is considered field-viable for conservation monitoring and herd management applications. The remaining {percent}% of vocalisations are classified as either ambiguous or 'context-dependent in ways the model has not yet captured.'",
      "Field trials on {planet} are planned for next cycle, with conservation teams and commercial ranchers both participating. The device retails at {credits} and weighs {n2} kilograms. A lighter version is in development. The herd beasts have not been consulted on the accuracy percentage, a limitation researchers acknowledge.",
      "The 'complaint' category, comprising {percent}% of recorded vocalisations, has attracted the most external attention. The team has noted that the label is informal and may be revised when the underlying communication function is better understood.",
    ],
  },
  {
    category: "xenobiology",
    template: "Endangered list adds {n2} species after {empire} habitat survey",
    story: [
      "The {empire} Xenobiological Status Registry has added {n2} species to its endangered classification following completion of a comprehensive habitat survey across {n2} planetary systems in the {sector} region. The survey, conducted over {n} cycles by a team of {n2} researchers, is the largest systematic status assessment undertaken in the region since the Registry's founding.",
      "Of the newly listed species, {n2} are classified as critically endangered with populations below minimum viability thresholds. {n2} others are listed as endangered with declining population trends. The remaining additions are precautionary listings based on habitat loss projections rather than current population data.",
      "The Registry has issued emergency habitat protection recommendations for {n2} of the critical listings, which will require action by planetary authorities in the affected systems. {empire} environmental affairs has pledged coordination support. Two of the affected planetary authorities have already initiated response planning.",
      "Conservation organisations have described the list additions as 'an honest accounting' and 'a call to work.' The Registry's director noted that the survey methodology is now available as an open standard for other regional bodies conducting similar assessments.",
    ],
  },
  {
    category: "xenobiology",
    template:
      "Aquatic life on {planet} found to follow regular meeting schedule",
    story: [
      "A {n}-cycle observational study of aquatic megafauna in {planet}'s primary ocean system has documented what researchers describe as 'a regular and apparently purposive aggregation pattern' in which {n2} species gather at a specific mid-ocean location on a cycle that matches the planet's lunar periodicity with {percent}% precision.",
      "The aggregations last between {n2} and {n2} hours and involve species that do not otherwise share habitat zones. Behavioural analysis has identified structured movement patterns during the aggregations that differ significantly from feeding or mating behaviour. The research team has described the pattern as 'functional in purpose, unknown in content.'",
      "Hydrophone recordings made during {n2} aggregation events contain {n2} hours of inter-species vocalisation exchange that has not yet been decoded. A xenoacoustic analysis programme has been approved and is expected to take {n} cycles. The aggregation site has been designated a protected zone pending further study.",
      "Senior researcher {ceo} has stated that the most accurate description of the aggregations is 'meetings,' while acknowledging that the term 'implies purpose we have not demonstrated.' The study has attracted significant interest from xenobiologists studying collective behaviour and intelligence in non-terrestrial aquatic species.",
      "The {planet} authority has suspended commercial fishing within {n2} kilometres of the aggregation site effective immediately. The decision is described as precautionary and will be reviewed after the first acoustic analysis results are published.",
    ],
  },
  {
    category: "xenobiology",
    template:
      "Rogue genetic experiment on {planet} produces friendly hybrid; adopted by lab",
    story: [
      "An unauthorised recombinant genetics experiment conducted by a graduate researcher at {planet}'s agricultural sciences institute has produced a hybrid organism combining traits from {n2} distinct local species. The researcher, who has been referred to the institution's research ethics board, reports the experiment was intended to test a novel gene-expression model and produced an organism 'not anticipated by the model.'",
      "The hybrid, described by lab staff as 'very friendly and approximately the size of a large domestic pet,' exhibited no aggressive behaviour during initial containment. The ethics board's review is ongoing. In the interim, the organism has been informally adopted by the laboratory section and has been given the working name '{adj}.'",
      "Xenobiologists brought in to assess the hybrid have confirmed it is genetically stable and does not pose a biosafety risk at its current developmental stage. They have noted the organism appears to have developed a preference for the company of the researcher responsible for its creation, which one reviewer described in their report as 'unfortunately charming.'",
      "The {empire} xenobiological containment office has been notified and is conducting a parallel review. The graduate researcher faces potential suspension of research privileges pending the ethics board outcome. '{adj}' remains in the laboratory.",
    ],
  },
  {
    category: "xenobiology",
    template: "{empire} zoo welcomes new {adj} pup, names contest open",
    story: [
      "The {empire} Xenological Park and Conservation Centre has announced the birth of a {adj} pup, the first successful captive birth of the species in {n2} cycles and only the {n2}th in the park's history. The pup, born {n} days ago, is reported to be healthy and feeding normally under the care of its parent and three specialist keepers.",
      "The birth represents a significant milestone in the park's captive breeding programme for the species, which is listed as vulnerable in the wild with a population of approximately {n2} individuals. Programme coordinator {ceo} described the birth as 'the result of {n2} cycles of careful work and one very cooperative pair of animals.'",
      "A public naming contest has been opened, with {n2}M submissions accepted from across the empire. Submissions will be reviewed by the park's curatorial team and a final name selected within {n} cycles. Previous naming contests for park residents have drawn {n2}M entries; this one has already surpassed that with {n} days remaining.",
      "The pup will be introduced to a supervised public viewing programme within {n} cycles, pending development assessments. The park has requested that visitors 'please not suggest names that are jokes.'",
    ],
  },
  {
    category: "xenobiology",
    template:
      "Migratory route of {planet} sky whales redirected by {percent}%, theories abound",
    story: [
      "Aerial survey data collected this cycle confirms that the annual migration of {planet}'s sky whale population has shifted {percent}% from its recorded historical route, the largest single-cycle deviation in {n2} cycles of systematic monitoring. The shift takes the migration path {n2} kilometres further from the planet's primary industrial corridor.",
      "Researchers have proposed {n2} non-exclusive explanations for the deviation: atmospheric temperature change affecting the thermal columns the whales use for altitude maintenance, acoustic interference from commercial traffic along the historical route, and a learned route modification transmitted through the population's social structure from older individuals who remember pre-industrial conditions.",
      "The {empire} Xenobiology Office has assigned priority status to the monitoring programme and has requested a moratorium on new flight path approvals that intersect with either the historical or new migration corridors. Commercial aviation interests have formally objected to the moratorium scope.",
      "Sky whale populations on {planet} number approximately {n2} individuals, stable over the past {n2} cycles. Conservationists have described the route change as 'the whales solving a problem we created' and have requested that the solution be respected.",
      "Long-range acoustic monitoring stations are being repositioned to track the new route. Data from this cycle's migration will be published in full in the Galactic Xenobiology Record. Lead researcher noted that the whales appeared 'unbothered' by the observation equipment.",
    ],
  },
  {
    category: "xenobiology",
    template:
      "Insectoid hive on {planet} grants visiting researchers honorary worker status",
    story: [
      "A research team from {empire} University conducting a {n}-cycle study of the insectoid hive colonies on {planet} has reported that the colony they designated as their primary observation site has begun incorporating the researchers into its normal activity patterns, a process the team describes as 'behavioural integration consistent with honorary worker assignment.'",
      "The researchers are now included in the hive's regular chemical signalling exchanges and are guided by worker escorts when moving through the colony's outer zones. The team's xenobiologist lead noted that the integration appears voluntary on the colony's part and was initiated by the hive rather than the researchers. 'We did not apply for this. They gave it to us.'",
      "The honorary status appears to confer practical benefits: the colony's defensive response to the researchers' presence has reduced to zero, and the team has been permitted access to areas of the hive not previously observable. The research programme has been extended by {n2} cycles to study the integration in detail.",
      "The {empire} Xenobiology Institute has classified the development as a 'first-order contact event' and has assigned an ethics liaison to the team. The liaison's primary role is to ensure the relationship is not exploited in ways that compromise the colony's normal function. The liaison has also been given honorary worker status.",
    ],
  },
  {
    category: "xenobiology",
    template:
      "{empire} botanists isolate {commodity} from {planet} lichens, smells like home",
    story: [
      "{empire} Institute botanists working in the highland lichen fields of {planet} have successfully isolated a pure form of {commodity} from the lichen's secondary metabolite output, a finding with potential applications in {n2} commercial sectors. The isolation process took {n} cycles to develop and requires specialised extraction equipment adapted for the lichen's unusual chemical structure.",
      "The isolated {commodity} has a chemical signature that differs from synthetically produced {commodity} in ways that {empire} quality assessment describes as 'subtle but distinct.' Early sensory evaluation panels have described the difference in terms that include 'more complex,' 'warmer,' and, most frequently, 'it smells like home,' a response that has defied systematic categorisation.",
      "The lichen fields cover approximately {n2} square kilometres and are currently ungoverned by harvest protection regulations. The botanical institute has recommended precautionary harvest limits pending a full ecological assessment of sustainable yield. Commercial interest has been described as 'significant and immediate.'",
      "The {planet} authority is expected to issue harvest guidelines within {n} cycles. The botanical institute has applied for a research exclusivity period of {n2} cycles to complete the ecological assessment before commercial licensing is finalised.",
    ],
  },
  {
    category: "xenobiology",
    template:
      "Apex predator on {planet} discovered to be photosynthetic, ecologists shrug",
    story: [
      "A metabolic analysis study of the apex predator species on {planet}, conducted over {n} cycles by the {empire} Xenobiology Institute, has confirmed the organism supplements its carnivorous diet with photosynthetic energy production via specialised chromatophores distributed across its dorsal surface. The finding was not anticipated by existing predator metabolic models and has required revision of {n2} published studies.",
      "The photosynthetic contribution accounts for an estimated {percent}% of the predator's daily energy intake, sufficient to sustain baseline metabolic function during periods when prey is scarce. Researchers describe this as 'a meaningful survival adaptation' and 'a good reason the population density models never quite worked.'",
      "Lead ecologist on the study noted in their field journal that the team had observed the predators spending unusual amounts of time in direct sunlight but had attributed this to thermoregulation. The revised explanation has prompted a review of {n2} other species in the same ecological zone for similar overlooked traits.",
      "The ecologists' formal response on the metabolic revision has been 'a shrug and a recalibration,' in the words of one team member. The predator species has been reclassified to a new metabolic category in the {planet} ecological register.",
      "The discovery has been described by xenobiology journals as 'a significant finding presented with admirable institutional calm.' The institute has noted that the predator continues to hunt at rates consistent with pre-study observations and appears unaffected by the attention.",
    ],
  },
  {
    category: "xenobiology",
    template:
      "Wildlife corridor through {sector} approved over {empire} agriculture's protests",
    story: [
      "The {empire} Environmental Council has approved a protected wildlife corridor spanning {n2} light-years through {sector}, over the formal objection of the {empire} Agricultural Development Authority, which argued the corridor's routing would restrict commercial farming expansion on {n2} planetary bodies in the affected zone.",
      "The corridor is designed to preserve genetic exchange pathways for {n2} migratory species currently classified as vulnerable, whose population viability models show decline without cross-system movement. The Council's ruling includes a {n}-cycle review clause and compensation provisions for existing operations directly affected.",
      "Agricultural representatives have described the decision as 'unbalanced' and have indicated an intent to appeal through the {empire} legislative process. Conservation organisations have described it as 'the minimum necessary' and have requested two additional corridor segments be added to the next review cycle.",
      "The corridor becomes effective {n} cycles from the ruling date. Enforcement will be coordinated by the {empire} Xenobiological Protection Service, which is currently recruiting for {n2} new field positions in the region.",
    ],
  },
  {
    category: "xenobiology",
    template:
      "{port} researchers attach trackers to {n2} sentient slimes; slimes ambivalent",
    story: [
      "A xenobiology team at {port}'s Marine and Terrestrial Research Station has successfully attached {n2} telemetry trackers to members of the {port} sentient slime colony, the first long-term movement study attempted on this species. The attachment process required {n} cycles of behavioural observation to identify an approach the slimes would tolerate. The research team notes 'tolerate' is the precise word.",
      "Initial tracking data shows the slimes range across an area {percent}% larger than previous estimates suggested, with movement patterns that correlate with tidal cycles, temperature gradients, and what the team's lead researcher describes as 'apparent preference, the nature of which we are still determining.'",
      "Behavioural assessments conducted during the tracker attachment process recorded no distress indicators. Post-attachment, the slimes resumed normal activity within {n2} hours. One individual has since incorporated the tracker into its outer membrane, which the team describes as 'a reasonable adaptation and technically within the study parameters.'",
      "The study is scheduled to run for {n} cycles. Data will be submitted to the {empire} Xenobiology Registry upon completion. The team has confirmed that all trackers are recoverable and removal will be conducted with the same consent-based protocol used for attachment.",
    ],
  },
  {
    category: "xenobiology",
    template: "Scientists confirm {planet} eel can pun in three languages",
    story: [
      "A research team from the {empire} Xenoacoustics Institute has published findings confirming that the {planet} electric eel species produces vocalisation sequences that qualify as structural puns in three distinct languages spoken by species in the {sector} region. The finding follows {n2} cycles of computational linguistic analysis of a {n2}-hour acoustic dataset.",
      "The puns operate across multiple meaning layers simultaneously, using phonemic overlap between {empire} Standard, {planet} regional dialect, and an adjacent system language that the eels have apparently incorporated into their vocalisation repertoire without formal contact with speakers. This represents the first confirmed instance of multilingual wordplay in a non-humanoid species.",
      "The research team spent {n} cycles verifying that the patterns were not coincidental before submitting for peer review. Reviewers requested {n2} additional analysis layers. The team provided them. The paper has since been accepted.",
      "Lead researcher {ceo} noted that the eels appear to produce puns most frequently during territorial boundary interactions, suggesting a social function that may involve demonstrating cognitive capacity to neighbouring groups. 'They're showing off,' {ceo} stated in a press interview, then clarified that this was a speculative framing.",
      "The finding has been described by linguists as 'extraordinary' and by one xenobiologist as 'somehow not surprising, given {planet}.'",
    ],
  },
  {
    category: "xenobiology",
    template:
      "{empire} agency confirms {planet} sky-snail is not, in fact, a meteor",
    story: [
      "The {empire} Astronomical Survey Agency has issued a formal confirmation that the object tracked across {planet}'s upper atmosphere over a {n2}-hour period last cycle was a large sky-snail of the {planet} endemic species, not a meteorological or astronomical event as initially classified. The object's trajectory, which included three deliberate course corrections, had been classified as 'unusual for a meteor' in internal communications for {n} days before xenobiology staff were consulted.",
      "The sky-snail, estimated at {n2} meters in length based on radar reflectivity, is the largest individual of the species detected in flight. The species is known to reach the upper atmosphere during peak activity periods but had not previously been recorded at the altitude or size observed.",
      "The agency's initial meteor classification triggered a {n}-cycle monitoring alert that has now been rescinded. No planetary protection measures were activated. The agency has updated its atmospheric object classification protocols to include a xenobiological screening step before issuing public alerts.",
      "The sky-snail is reported to have descended to normal operating altitude and is no longer being tracked. {empire} xenobiological services noted the individual appears healthy. The agency has declined to name the staff member who first suggested 'maybe it's alive.'",
    ],
  },
  {
    category: "xenobiology",
    template:
      "Migration pattern of {planet} song-bats includes {n}-cycle harmonic jam session",
    story: [
      "Long-range acoustic monitoring of the {planet} song-bat migration has documented what researchers describe as a '{n}-cycle harmonic convergence event' in which the bats' individual navigation calls synchronise into structured polyphonic sequences lasting between {n2} and {n2} hours. The event occurs at a specific geographic point mid-migration, suggesting it is intentional.",
      "The harmonic sequences involve {n2} distinct call registers and maintain internal rhythmic consistency across populations that do not otherwise travel together. Xenoacoustic analysis characterises the output as 'neither communication nor navigation' but rather a third vocalisation mode with no identified functional parallel in the literature.",
      "Field researchers present during a convergence event described the experience as 'loud, structured, and oddly moving.' Audio recordings have been submitted to the Galactic Xenobiology Registry and are available for public access. Several have been described in non-scientific publications as 'music.'",
      "The research team has noted they cannot rule out that it is music. A dedicated study of the convergence event is being proposed for the next migration cycle.",
    ],
  },
  {
    category: "xenobiology",
    template:
      "Researcher claims {planet} sentient kelp filed grievance with HR",
    story: [
      "Senior xenobiologist {ceo} at the {empire} Marine Research Station has published an account claiming that a kelp colony in {planet}'s northern ocean basin has produced a structured chemical signal sequence that, when processed through the station's xenobiological communication analysis system, maps to a formal grievance structure in {empire} Standard administrative language.",
      "The signal was transmitted over {n} days and includes what the analysis system categorises as a statement of conditions, a list of three specific concerns, and a closing sequence that pattern-matches to a request for acknowledgement. {ceo} has described submitting the analysis to the station's HR department, which has responded by scheduling a review meeting.",
      "The station's director has described the situation as 'procedurally unprecedented' and confirmed that no decision has been made about how the grievance will be processed. Legal staff have been consulted. The {empire} Xenobiological Rights Advisory has requested the full dataset.",
      "The kelp colony, classified as sentient for {n2} cycles, has no formal legal standing under current {empire} code. Three advocacy organisations have filed requests for expedited standing review with the {empire} courts. The kelp has not responded to requests for additional comment.",
    ],
  },
  {
    category: "xenobiology",
    template:
      "{empire} releases breeding plan for endangered {adj} mammal on {port}",
    story: [
      "The {empire} Xenobiological Conservation Service has published a {n}-cycle breeding plan for the {adj} mammal population at {port}, one of only {n2} confirmed remaining populations of the species. The plan outlines genetic management protocols, captive breeding targets, and a reintroduction programme designed to re-establish a viable wild population within {n2} cycles.",
      "Current population: {n2} individuals at {port}, {n2} in managed care at {n2} partner facilities across the {empire}. The breeding plan calls for {n2} captive births per cycle and {percent}% genetic diversity maintenance across the managed population, targets the Service describes as 'achievable with the resources committed.'",
      "The {port} habitat restoration component of the plan covers {n2} square kilometres and has been approved by the {port} authority, which has also agreed to impose restrictions on commercial activity in three adjacent zones for the duration of the programme.",
      "Conservation partners have described the plan as 'thorough and appropriately resourced,' noting the {credits} committed by {empire} environmental funding. The {adj} mammal's name contest, launched when the species was first listed, is still open. The Service has asked that the winning name be something the species can live with.",
    ],
  },
  {
    category: "xenobiology",
    template:
      "Pet trade on {planet} cracks down on illegal {commodity} ferrets",
    story: [
      "{planet}'s commercial licensing authority has conducted {n2} enforcement actions against unlicensed traders dealing in {commodity}-adapted ferrets, a subspecies whose export from the {sector} region is restricted under the {empire} xenobiological protection framework. The enforcement sweep seized {n2} animals and issued {n2} fines totalling {credits}.",
      "The {commodity} ferret has become sought after in the exotic pet market for its distinctive coat adaptation and, according to ferret owners, 'exceptional personality.' Legal trade in the species requires breeding certification and a per-animal export licence, processes that enforcement officials note are 'straightforward but apparently inconvenient for some.'",
      "Seized animals are being held in licensed care facilities pending placement. {n2} have already been transferred to approved keepers. The {empire} xenobiological trade office has reminded traders that unlicensed {commodity} ferret sales carry fines of up to {credits} per animal and potential licence revocation.",
      "Consumer demand has been noted as the primary driver of illegal trade. The authority has announced a public education campaign about legal acquisition channels and the animal welfare implications of the unlicensed supply chain.",
    ],
  },
  {
    category: "xenobiology",
    template: "Marine biologists on {planet} reclassify squid as 'committee'",
    story: [
      "Marine xenobiologists at {planet}'s Coastal Research Institute have formally reclassified the collective noun for the {planet} giant squid from 'shoal' to 'committee,' following {n} cycles of behavioural observation documenting the species' group decision-making processes. The change has been submitted to the Galactic Xenobiology Registry for official adoption.",
      "The reclassification is based on documented evidence that groups of {n2} to {n2} individuals engage in structured consensus behaviour before collective movement, predation, and what researchers describe as 'apparently administrative activities' involving the arrangement and rearrangement of objects in the squid's territory.",
      "Lead researcher {ceo} noted that 'committee' was proposed informally by a field technician in the {n2}th cycle of observation and 'proved impossible to improve on' through the subsequent formal classification process. The squid have continued their activities without apparent awareness of the designation.",
      "The Registry has flagged the submission as 'procedurally valid but linguistically notable' and expects to confirm the reclassification within {n} cycles. Three other research stations have separately submitted collective noun revisions for species under their study, citing the {planet} case as precedent.",
    ],
  },
  {
    category: "xenobiology",
    template:
      "{ceo}'s pet sentient palm signs autograph, prints sold for {credits}",
    story: [
      "{ceo}'s household sentient palm, a species classified for chemical signalling capacity {n2} cycles ago, has been documented producing what xenobiologists have confirmed are volitional ink-transfer patterns on provided paper substrate — a behaviour that {ceo} has described as 'signing' and is marketing as autographed prints, selling at {credits} per piece.",
      "The palm, which {ceo} has kept for {n2} cycles, produces the patterns when presented with specific environmental cues developed through what {ceo} describes as 'a collaborative process.' Xenobiologists consulted on the prints confirm the patterns are intentional output rather than incidental contact marks. Whether 'intentional' constitutes 'signing' is described as 'a question for philosophers.'",
      "A first edition of {n2} prints has sold out. {credits} from the proceeds has been donated to the {empire} Sentient Flora Protection Fund, an organisation that has acknowledged the donation and noted, diplomatically, that the commercial use of sentient species' outputs is 'an area of evolving guidance.'",
      "The {empire} Xenobiological Ethics Office has opened a review of the activity. {ceo} has stated full cooperation with the review and has paused further print sales pending the outcome.",
    ],
  },
];

// ── Obituary FlavorTemplates ───────────────────────────────────
const obituaryTemplates: FlavorTemplate[] = [
  {
    category: "obituary",
    template:
      "Industrialist {ceo} eulogized as 'tireless and largely tolerable'",
    story: [
      "Industrialist {ceo}, who built the {company} holdings from a single-vessel operation into a {n2}-planet enterprise over {n2} cycles, was eulogised at {port}'s civic hall this week before an attendance that overflowed into the corridor. The phrase used most frequently by those who worked with them was 'tireless.' The phrase used most frequently by those who negotiated with them was 'largely tolerable,' which the family has confirmed was {ceo}'s own preferred epitaph. They are survived by their business partner of {n2} cycles and a company that continues to bear their name.",
    ],
  },
  {
    category: "obituary",
    template:
      "{empire} statesman {ceo} dies at {n2}, leaves library of {n2}M scrolls",
    story: [
      "{empire} statesman {ceo} has died at the age of {n2}, after a career in public service spanning {n} consecutive administrations. Their personal library, bequeathed to the {empire} National Archive, comprises {n2}M scrolls and documents, among them {n2} that archivists have already described as historically significant. {ceo} is remembered as a careful thinker and an unhurried speaker, which opponents found equally difficult to interrupt.",
    ],
  },
  {
    category: "obituary",
    template:
      "Veteran captain {ceo} of the {company} freight fleet passes after {n2} cycles aloft",
    story: [
      "Captain {ceo}, who commanded vessels for the {company} freight fleet for {n2} consecutive cycles without a single lost cargo, has died at {port} following a short illness. Their route log covers {n2} systems and {n2} distinct trade corridors, several of which they established from scratch. The crew of the last vessel they commanded has requested that their name remain on the manifest as an honorary entry, a request the company has granted.",
    ],
  },
  {
    category: "obituary",
    template:
      "Memorial service for {ceo} held at {planet}; attendance overflowed orbit",
    story: [
      "The memorial service for {ceo}, held at {planet}'s civic centre, drew attendance that organisers describe as exceeding every projection. When the hall reached capacity, the overflow was directed to an adjacent hall, and then to the plaza outside, and then — as ships began arriving in orbit to observe — the service was broadcast to {n2} receiving screens across the planet. {ceo}, by all accounts, would have been embarrassed.",
    ],
  },
  {
    category: "obituary",
    template:
      "{empire} cultural figure {ceo} remembered for 'singular, occasional' charm",
    story: [
      "{ceo}, one of {empire}'s most distinctive cultural figures across a career spanning {n2} cycles, has died. Memorial tributes from colleagues and collaborators have converged on the phrase 'singular, occasional charm,' an assessment that appears in {n2} separate statements and one that those who knew {ceo} confirm captures something true and not quite complete. The work remains.",
    ],
  },
  {
    category: "obituary",
    template:
      "Professor emeritus {ceo} of {planet} institute dies; chair to be retired",
    story: [
      "Professor emeritus {ceo}, who taught at {planet}'s Institute of Applied Sciences for {n2} cycles and was instrumental in the careers of {n2} students who went on to significant distinction, has died at the age of {n2}. The institute has announced that the chair {ceo} occupied for {n2} cycles will be retired rather than refilled — a recognition, the director stated, that some positions are particular to the person who held them.",
    ],
  },
  {
    category: "obituary",
    template:
      "{ceo} pioneer of {commodity} engineering, passes; legacy {n2} patents",
    story: [
      "{ceo}, whose work in {commodity} engineering produced {n2} patents and reshaped the way {commodity} is processed across {n2} industrial sectors, has died at {port}. They were {n2} years old. Many of the systems they designed are still in standard use; a few were adopted so completely that the field forgot they were innovations. {ceo} reportedly found this satisfying.",
    ],
  },
  {
    category: "obituary",
    template:
      "Journalist {ceo} known for asking inconvenient questions has died",
    story: [
      "Journalist {ceo}, who spent {n2} cycles asking the questions that subjects of their interviews found most inconvenient and readers found most necessary, has died. Their archive comprises {n2}M words published across {n2} outlets. The subjects of their work are not all available for comment. The readers are, and most of them have.",
    ],
  },
  {
    category: "obituary",
    template:
      "Composer {ceo}'s final symphony premiered posthumously in {empire} hall",
    story: [
      "The final symphony of composer {ceo}, completed in the last cycles of their life and orchestrated by their longtime collaborator, received its world premiere at {empire} Hall before an audience of {n2}. Reviewers have described it as 'a work that knows it is a farewell and does not flinch from this.' {ceo} did not live to hear it performed. The conductor stated that the music made this feel, somehow, beside the point.",
    ],
  },
  {
    category: "obituary",
    template:
      "{empire} founding member {ceo} eulogized as 'a complicated old hand'",
    story: [
      "{ceo}, one of {n2} founding members of the {empire} constitutional council, has died at the age of {n2}. Eulogies from surviving council members and historical scholars converge on the description 'a complicated old hand' — a phrase that acknowledges both the effectiveness and the difficulty of a career spent shaping institutional structures that outlasted the people who built them. The institutions remain.",
    ],
  },
  {
    category: "obituary",
    template:
      "Athlete {ceo} retired hero, championships {n}, anecdotes uncountable",
    story: [
      "Retired athlete {ceo}, winner of {n} galactic championships across a career that spanned {n2} cycles and {n2} sporting codes, has died at the age of {n2}. The formal record is accurate and insufficient. {ceo} was more thoroughly described by the stories told about them than by any statistic — stories of competitions won and lost, of teammates supported over careers, of the long practice of excellence pursued without apparent effort. The anecdotes are uncountable because they are still being told.",
    ],
  },
  {
    category: "obituary",
    template: "{ceo} explorer first to map {sector} fringe, has died at {n2}",
    story: [
      "{ceo}, the explorer whose {n}-cycle survey mission first mapped the outer fringe of the {sector} region and documented {n2} previously uncharted systems, has died at the age of {n2}. The charts produced by that mission are still in use. {ceo} described the work once as 'just looking at what was there and writing it down,' which undersells it in a way that was characteristic.",
    ],
  },
  {
    category: "obituary",
    template:
      "{empire} ambassador {ceo}, who once threw shoe at podium, dies at {n2}",
    story: [
      "{empire} Ambassador {ceo} has died at the age of {n2}, after a diplomatic career distinguished by both extraordinary effectiveness and one incident at the {empire2} summit {n2} cycles ago that has never been fully explained and is referenced in every account of their service. {ceo} declined to discuss the shoe incident in any formal context. The diplomatic work they did before and after it speaks for itself, which was always the point.",
    ],
  },
  {
    category: "obituary",
    template:
      "Ex-board member of {company} {ceo} passes; obit lists {n2} affiliations",
    story: [
      "{ceo}, former board member of {company} and a figure whose affiliations across {n2} organisations, institutions, and advisory bodies required {n2} paragraphs in the official obituary, has died at the age of {n2}. Colleagues note that {ceo} was genuinely present at each of the roles listed — not a name on a letterhead but a participant. How they managed the schedule remains unclear to everyone who worked alongside them.",
    ],
  },
  {
    category: "obituary",
    template:
      "{ceo}, sentient kelp activist, mourned by {percent}% of relevant ecosystems",
    story: [
      "{ceo}, who spent {n2} cycles advocating for the legal and ecological rights of sentient kelp colonies across {n2} systems, has died. Xenobiologists monitoring the kelp populations that {ceo} most directly supported have documented what their sensors characterise as an unusual chemical signal pattern in the days following the announcement. Whether this constitutes mourning is a question the monitoring teams have described as 'important to ask carefully.'",
    ],
  },
  {
    category: "obituary",
    template:
      "{empire} actor {ceo}'s farewell tour cut short; tour bus signs petition",
    story: [
      "{ceo}'s {n}-stop farewell tour, intended as a final performance run before retirement, was cut short at {n2} stops by a health event that proved fatal. The remaining {n2} dates were cancelled. The tour bus crew, many of whom had worked with {ceo} for {n2} cycles, circulated a tribute signed by {n2} people, the last of whom was the bus driver who had known {ceo} longer than anyone. The performances that did happen were, by all accounts, what {ceo} had hoped.",
    ],
  },
  {
    category: "obituary",
    template:
      "{ceo} who patented the breakfast sandwich licenses one final smile",
    story: [
      "{ceo}, who holds the original {empire} patent on the pressurised breakfast sandwich and negotiated {n2} licensing agreements in {n2} cycles without losing a single arbitration, has died at {port}. The patent expires next cycle; {ceo} timed their retirement to this date but not, apparently, their death, which they did not time at all. Colleagues recall that they found this arrangement 'tidy enough.' The sandwich remains in production.",
    ],
  },
  {
    category: "obituary",
    template:
      "{empire} chess grandmaster {ceo} defeats death after {n2} delays",
    story: [
      "{empire} chess grandmaster {ceo}, who was declared terminally ill on {n2} separate occasions across {n} cycles and recovered each time, has died at the age of {n2}. The final instance was not a recovery. {ceo} spent the intervening cycles continuing to play competitive chess, winning three more titles, and telling the story of the {n2} prior diagnoses with increasing satisfaction. 'I have always been difficult to finish,' they said at their last public appearance.",
    ],
  },
  {
    category: "obituary",
    template: "Engineer {ceo} of the original {planet} mag-rail, has passed",
    story: [
      "{ceo}, the lead engineer of the original {planet} magnetic rail system commissioned {n2} cycles ago, has died at the age of {n2}. The system carries {n2}M passengers per cycle. {ceo} rode it on its first day and, according to colleagues, approximately {n2} times since. The rail authority has announced that {ceo}'s name will be added to the central terminus, beside the original engineering plaque they signed.",
    ],
  },
  {
    category: "obituary",
    template:
      "Author of 'Quiet Years on {planet}' has quietly stepped behind the curtain",
    story: [
      "The author of 'Quiet Years on {planet},' who published under a pen name for all {n2} cycles of their career and whose legal identity was known only to their publisher, has died. The publisher has confirmed the death and honoured the author's lifelong request for privacy. The {n2} novels remain in print. The identity will remain unpublished. The work was always the whole point, and it is still here.",
    ],
  },
  {
    category: "obituary",
    template:
      "{ceo}, longtime mayor of {port}, leaves council bench in mourning",
    story: [
      "{ceo}, who served as mayor of {port} for {n2} consecutive cycles and oversaw {n2} major infrastructure projects, the resolution of {n2} public crises, and the annual budget arguments that colleagues describe as 'a performance and also a genuine skill,' has died at the age of {n2}. The council bench where {ceo} presided has been left vacant at this cycle's session, a gesture the remaining council members made without prior discussion.",
    ],
  },
  {
    category: "obituary",
    template:
      "{empire} general {ceo}, who once misplaced a fleet, dies at {n2}",
    story: [
      "General {ceo} of the {empire} Defence Force, who commanded {n2} operations across {n} cycles of service and is remembered for both the {n2} victories that secured their reputation and the incident {n2} cycles ago in which an entire fleet was temporarily misrouted through a navigational error that {ceo} described, at the subsequent inquiry, as 'a lesson I have thought about every day since,' has died at the age of {n2}. The fleet was recovered. The lesson, those who served under {ceo} in later cycles confirm, was genuinely taken.",
    ],
  },
  {
    category: "obituary",
    template:
      "{ceo} of {company}'s legendary marketing run laid to rest with last billboard",
    story: [
      "{ceo}, who directed {company}'s marketing division for {n2} cycles and created the campaign series that ran for {n2} consecutive cycles without being repeated or outdone, has died. By their own request, the last billboard from the final campaign — which had been in storage since its run ended — was displayed outside the memorial service. {n2} people attended. Several took photographs of the billboard. {ceo} would have considered this the correct response.",
    ],
  },
  {
    category: "obituary",
    template:
      "Holovid critic {ceo} dies; final review described life as 'three stars, one moon'",
    story: [
      "Holovid critic {ceo}, who published {n2}M words of criticism over a {n2}-cycle career and was described by subjects of their reviews as 'fair, occasionally devastating, and always worth reading,' died this week. Their final published piece, completed {n} days before their death and released according to their own instructions, was a brief review of their own life, which they rated 'three stars out of five, with special commendation for the middle act and one moon for the company kept throughout.'",
    ],
  },
  {
    category: "obituary",
    template:
      "{empire} historian {ceo}, encyclopedic in life, indexed in death",
    story: [
      "{empire} historian {ceo}, whose {n2}-volume history of the {empire} commercial era remains the definitive reference in the field {n2} cycles after its completion, has died at the age of {n2}. The {empire} Historical Society has announced that {ceo}'s own papers — {n2}M documents, annotated throughout — will be catalogued and indexed, a project expected to take {n2} cycles. Colleagues note that {ceo} left their files in good order, annotated for exactly this purpose. They were, as always, prepared.",
    ],
  },
];

// ── Homage FlavorTemplates ─────────────────────────────────────
const homageTemplates: FlavorTemplate[] = [
  {
    category: "homage",
    template:
      "Towel sales up {percent}% on {planet} ahead of Galactic Hitchhiker's Day",
    story: [
      "Towel retailers on {planet} are reporting a {percent}% spike in sales in the {n2} cycles preceding the annual Galactic Hitchhiker's Day observance, the most robust pre-holiday surge the category has recorded in {n} cycles. Economists have noted that towel sales have become one of the more reliable consumer confidence indicators in the {empire} market, a development that would have delighted and possibly embarrassed the tradition's founding text. The holiday falls this cycle on a Thursday, which some consider the worst possible day, and others consider exactly right.",
    ],
  },
  {
    category: "homage",
    template:
      "Survey finds {percent}% of {empire} citizens consider their planet 'mostly harmless'",
    story: [
      "A {empire}-wide survey of planetary satisfaction conducted across {n2}M respondents has found that {percent}% describe their home planet as 'mostly harmless' when offered the phrase as a response option, making it the third most selected description behind 'fine, mostly' and 'complicated.' The survey's designers included the option as a control; it has consistently outperformed their projections for {n2} consecutive cycles. The galactic guidebook entry for {empire} has not been updated to reflect this, but the researchers note it remains technically accurate.",
    ],
  },
  {
    category: "homage",
    template:
      "{port} authorities remind travelers that, statistically, the answer is 42",
    story: [
      "{port}'s transit authority has renewed its annual public message reminding travellers that {n2} of the {n2} most frequently asked questions at the arrivals desk have a statistically correct answer of 42, including questions about platform numbers, departure delays in minutes, the number of forms required for customs clearance, and one query about the nature of existence that the desk officer has been handling for {n2} cycles. The authority notes the message is informational and not philosophical. The desk officer notes the distinction is sometimes difficult to maintain.",
    ],
  },
  {
    category: "homage",
    template:
      "Improbability drive prices fluctuated wildly today; analysts blame finite probability",
    story: [
      "Improbability drive futures on the {empire} commodities exchange recorded {n2} separate limit-move events in a single trading session, a pattern that exchange analysts described as 'consistent with the underlying technology' and 'not something we have a model for.' The drives themselves continued to function during the price fluctuations, which is either reassuring or exactly the kind of thing that should concern people. {n2} analysts have issued notes. One has issued a note that contradicts itself in a way that appears intentional.",
    ],
  },
  {
    category: "homage",
    template:
      "Vogon Constructor Fleet detected near {system}; locals advised to ignore poetry recitals",
    story: [
      "A Vogon Constructor Fleet has been detected in transit near {system}, currently {n2} light-cycles from inhabited space. {empire} civil emergency services have issued a precautionary advisory: residents are reminded that Vogon poetry recitals, while constitutionally protected as a form of expression, are not classified as an emergency event and should not be engaged with under duress. The advisory also notes that evacuation authorisations will not be processed any faster if submitted with a poem attached. {n2} have been submitted with poems attached.",
    ],
  },
  {
    category: "homage",
    template:
      "{company} debuts in-flight beverage 'almost, but not quite, entirely unlike tea'",
    story: [
      "{company}'s in-flight service has quietly added a new hot beverage to its menu, described in the service catalogue as 'a warm {commodity}-derived infusion with characteristics adjacent to, but not constitutive of, tea.' Customer response has been polarised: {percent}% rate it 'pleasant,' {percent}% rate it 'confusing,' and {percent}% describe it with a phrasing the company has not yet been able to categorise. The product development team has described this as 'the intended range of responses.'",
    ],
  },
  {
    category: "homage",
    template:
      "Babel fish supply rationed on {port} after translator union strike",
    story: [
      "Babel fish supplies at {port}'s translation services hub have been placed on allocation following the third cycle of industrial action by the {empire} Translator Professionals Union, which represents {n2}M organic and hybrid translation practitioners. The rationing affects {n2} categories of communication licence, with priority access maintained for diplomatic and medical translation. Monolingual travellers are advised that automated alternatives are available and described as 'functionally adequate in {percent}% of contexts.'",
    ],
  },
  {
    category: "homage",
    template:
      "{ceo} described as 'about as inconspicuous as a brick at a glass convention'",
    story: [
      "{ceo}'s appearance at the {empire} Trade Convention this cycle generated {n2}M social commentary posts within {n} hours, a response that observers attributed to {ceo}'s distinctive presence and the specific contrast with the convention's stated dress code. The phrase 'about as inconspicuous as a brick at a glass convention' was coined by a trade journalist in the third hour and has since been applied to {ceo}'s public appearances on {n2} subsequent occasions. {ceo} has not objected to the characterisation.",
    ],
  },
  {
    category: "homage",
    template:
      "Psychohistorical model predicts {percent}% chance of {empire} collapse within {n2} centuries",
    story: [
      "The {empire} Institute for Predictive Social Dynamics has released its {n2}-century outlook, placing a {percent}% probability on significant imperial structural collapse within the modelling window. The model, which processes {n2}M individual and collective behaviour variables, notes the prediction carries a {percent}% confidence interval and is 'consistent with historical precedent across {n2} comparable civilisational structures.' {empire} leadership has described the report as 'noted.' The institute has described the response as 'also within the model.'",
    ],
  },
  {
    category: "homage",
    template:
      "Three Laws Robotics violation reported on {planet}; investigation pending",
    story: [
      "The {empire} Robotics Safety Board has opened an investigation following a report from {planet} of a possible Three Laws violation by an autonomous unit in commercial service. Details of the alleged violation are under review confidentiality protocols. The unit in question has been taken offline. Its operators have stated they are cooperating fully with the investigation and are 'confident in the unit's fundamental architecture.' The board has noted that this phrase appears in {percent}% of violation investigation press statements and has no statistical predictive value for the outcome.",
    ],
  },
  {
    category: "homage",
    template:
      "{empire} Foundation conference debates Seldon Plan revisions over snacks",
    story: [
      "The {n2}th {empire} Foundation Strategic Planning Conference concluded its third day of sessions debating proposed revisions to the long-range civilisational roadmap known informally as the Seldon Plan, a document now {n2} cycles old and {n2}M words long. Delegates reached {n2} points of consensus and tabled {n2} others for the next conference. The catering, provided by {company}, was described unanimously as the most satisfying element of the session. The plan's next major decision point is {n2} cycles away, which gives delegates time to prepare and, reportedly, to try the snacks again.",
    ],
  },
  {
    category: "homage",
    template:
      "Mule sighting on {sector} fringe ruled 'almost certainly unrelated'",
    story: [
      "Unusual influence concentration patterns detected in the {sector} fringe region over {n} cycles have been reviewed by the {empire} Predictive Analytics Division and classified as 'statistically anomalous but almost certainly unrelated to historical pattern precedents.' The Division has noted that this classification is the appropriate bureaucratic response and has not issued any supplementary guidance. Three independent analysts who reviewed the same data have issued supplementary guidance. The Division has noted this too.",
    ],
  },
  {
    category: "homage",
    template: "{commodity} flow disrupted on {planet}; trade guilds concerned",
    story: [
      "The {commodity} extraction and distribution system on {planet} has experienced a {percent}% flow reduction over the past {n} cycles, attributed by the planet's industrial authority to maintenance scheduling in {n2} processing units. Trade guilds operating in the {sector} region have convened an emergency session to assess supply impact. Guild representatives note that {commodity} flow disruption has a historical tendency to generate consequences 'considerably disproportionate to the initial volume figures.' The maintenance schedule is expected to complete within {n2} cycles.",
    ],
  },
  {
    category: "homage",
    template: "Spice mélange futures trading suspended on {sector} exchange",
    story: [
      "Trading in spice mélange derivative contracts has been suspended on the {sector} commodities exchange following {n2} limit-move events in {n} sessions, a volatility pattern triggering the exchange's automatic circuit breaker protocol. The suspension covers all mélange-linked instruments and will remain in effect for {n2} trading sessions. Analysts have noted that mélange futures are the only commodity class for which 'cannot be adequately priced by any model we have built' appears as a standard risk disclosure. It does appear. It has appeared since the disclosure was first required.",
    ],
  },
  {
    category: "homage",
    template: "Sandworm advisory issued for {planet} dunes, again",
    story: [
      "{planet}'s civil safety authority has issued its {n2}th sandworm advisory of the current cycle, reminding surface travellers that open-terrain movement generating rhythmic ground vibration continues to attract sandworm attention with {percent}% reliability in the southern dune regions. The advisory has been issued {n2} consecutive cycles. The {percent}% figure has not changed. The authority notes that the advisory is precautionary and that {n2}% of travellers who follow the recommended protocols complete their transit without incident. It also notes that the protocols are not complicated.",
    ],
  },
  {
    category: "homage",
    template:
      "{empire} herald repeats: he who controls the {commodity} controls the universe",
    story: [
      "The {empire} Imperial Herald has reissued its standard quarterly reminder that control of {commodity} distribution confers structural leverage over {percent}% of dependent economic systems in the known {sector} region. The statement, which has been issued in substantially identical form for {n2} cycles, continues to be accurate. {n2} entities currently hold controlling positions in {commodity} supply chains. None of them have commented on the Herald's statement. This is also noted in the Herald.",
    ],
  },
  {
    category: "homage",
    template:
      "Sensors detect unusual readings near {planet}; scientists puzzled",
    story: [
      "Long-range sensors monitoring the {planet} orbital zone have recorded {n2} anomalous readings over the past {n} cycles, described by the monitoring station as 'unusual in character and not yet classifiable.' The readings do not match any catalogue entry for natural or artificial phenomena in the {sector} database. Three scientific bodies have been notified. All three have sent researchers. All three sets of researchers have described their initial findings as 'puzzling,' which the monitoring station has noted is a broader scientific consensus than it typically achieves.",
    ],
  },
  {
    category: "homage",
    template:
      "{empire} Prime Directive review committee adjourned indefinitely",
    story: [
      "The {empire} Non-Interference Policy Review Committee has adjourned its {n2}th session without reaching a revised consensus position, extending what has become a {n}-cycle deliberation on whether the existing directive's {n2} exceptions are sufficient, excessive, or 'philosophically coherent in ways that resist simple enumeration,' a phrase that has appeared in the committee's minutes {n2} times. The committee's chair has described the adjournment as 'productive in the broader sense.' The directive remains in effect as written.",
    ],
  },
  {
    category: "homage",
    template:
      "Holodeck malfunction on {planet} resolved by reading actual book",
    story: [
      "A holodeck simulation environment at {planet}'s recreational facility experienced a {n2}-cycle malfunction in which the exit protocol was non-functional. The {n2} occupants at the time of the fault resolved the situation by locating a physical copy of the facility's emergency procedures manual, which was stored, as required by regulation, inside the holodeck environment itself. The manual's instructions, written before holodeck technology was installed, described a manual override procedure that worked correctly. The facility has reviewed its emergency procedure documentation as a result.",
    ],
  },
  {
    category: "homage",
    template:
      "Tribble outbreak quarantined on {port}; furry quotient up {percent}%",
    story: [
      "{port}'s biosecurity authority has established a quarantine zone covering {n2} berths in the commercial dock following confirmation of a tribble population that has reached {n2} individuals in {n} cycles, an expansion rate biosecurity staff describe as 'consistent with documented tribble biology and therefore not a surprise, which makes it no easier to manage.' The furry quotient in the affected zone is up {percent}%. The quarantine is expected to take {n2} cycles to resolve. There are currently {n2} volunteers.",
    ],
  },
  {
    category: "homage",
    template:
      "{ceo} dismisses rumors of 'ancient religion' as 'a hokey old myth'",
    story: [
      "{ceo} addressed media questions about reported Force sensitivity in their organisation's senior leadership at a press briefing this cycle, describing the subject as 'a hokey old myth with no operational relevance to how we run our business.' The briefing ended shortly after {ceo} used the phrase 'certain point of view' in a context that reporters have described as ambiguous. {n2} follow-up questions were submitted in writing. {ceo}'s communications team has responded to {n2} of them.",
    ],
  },
  {
    category: "homage",
    template:
      "{empire} senate approves emergency powers for {n} cycles, definitely temporarily",
    story: [
      "The {empire} Senate has voted {n2} to {n2} to extend emergency executive powers for an additional {n} cycles, the {n2}th such extension since the original {n}-cycle grant was approved following a security situation that has since been resolved. Senate leadership has described each extension as temporary. The combined duration of temporary extensions now exceeds the original grant by {n2} cycles. Three senators have submitted a joint note observing this. The note is part of the record.",
    ],
  },
  {
    category: "homage",
    template:
      "Smuggler {ceo} insists Kessel-equivalent run completed in {n} parsecs",
    story: [
      "Cargo runner {ceo} has filed with the {empire} Transport Records Office a formal claim that their {sector} delivery run was completed in {n} parsecs, a distance metric that the Records Office has noted 'does not describe time or speed in any standard navigational framework' and therefore cannot be validated or disputed under current filing protocol. {ceo} has stated the claim stands and has requested it be appended to their operating licence. The Records Office has appended it, with a notation describing the circumstances.",
    ],
  },
  {
    category: "homage",
    template: "{planet} weather forecast: continuous rain. Again",
    story: [
      "{planet}'s meteorological authority has issued this cycle's forecast: continuous precipitation across all inhabited zones, visibility reduced to {n2} meters in lower districts, and a {percent}% probability of brief atmospheric clearing that previous forecasts have also predicted and that has not materialised in {n2} consecutive cycles. The forecast is described as accurate. The authority has noted that 'accurate' and 'encouraging' are separate categories. Residents have confirmed they are aware of this.",
    ],
  },
  {
    category: "homage",
    template:
      "{company} replicant program suspended pending {n2}-question test review",
    story: [
      "{company}'s synthetic personnel programme has been placed on administrative hold pending review of its {n2}-question identification protocol, which external auditors have found produces inconclusive results in {percent}% of administered cases and ambiguous results in a further {percent}%, leaving a {percent}% definitive identification rate that the audit describes as 'operationally problematic.' The programme's director has stated the protocol is being revised. The revision will take {n2} cycles. Current programme participants are continuing their assignments.",
    ],
  },
  {
    category: "homage",
    template: "Origami unicorn left at scene of {ceo}'s farewell speech",
    story: [
      "An origami unicorn was found on the lectern following {ceo}'s farewell address at {empire} Hall this cycle, a detail noted in {n2} press accounts and described by most as 'unexplained.' {ceo} did not address the item in remarks or in the post-event media briefing. Three colleagues who were present have declined to comment. The unicorn has been retained by the venue and is described in the event log as 'a personal effect, owner unknown.'",
    ],
  },
  {
    category: "homage",
    template:
      "{company} promises this time the cargo hold is, quote, 'definitely empty'",
    story: [
      "{company} has issued a statement ahead of this cycle's deep-space cargo run assuring clients, insurers, and the {empire} cargo safety authority that the hold is 'definitely empty' and that all prior-manifest items have been 'verified absent' through a {n2}-point checklist. The statement was not requested. The {empire} cargo safety authority has noted that unsolicited holds-are-empty statements are statistically associated with holds that are not empty in {percent}% of recorded cases. {company} has described this as 'an unfair prior.'",
    ],
  },
  {
    category: "homage",
    template:
      "Hygiene inspectors leaving {planet} bay {n2} early; nobody asked why",
    story: [
      "{planet}'s commercial bay hygiene inspection team concluded this cycle's scheduled survey {n2} days early and submitted their report marked 'complete' without supplementary documentation. The port authority has accepted the report. {n2} parties have asked the inspection team for clarification on the early departure. The team has provided a written response consisting of the phrase 'the inspection is complete.' No follow-up inspections have been scheduled.",
    ],
  },
  {
    category: "homage",
    template: "{ceo} insists their cargo is 'just legitimate goods, shiny'",
    story: [
      "{ceo} cleared {port} customs this cycle following a {n2}-hour secondary inspection of their freight manifest, emerging with all cargo intact and a statement to press characterising the contents as 'legitimate goods, entirely above board, and somewhat shiny, which is not a crime.' Customs authorities have confirmed the manifest was in order. Three journalists have asked follow-up questions. {ceo} has described all three questions as 'shiny in a different way.'",
    ],
  },
  {
    category: "homage",
    template:
      "{port} preacher on {planet} reminds congregation: cannot stop the signal",
    story: [
      "The itinerant minister known on {planet} as the {port} Preacher delivered a sermon this cycle attended by {n2} people in {n2} locations simultaneously via distributed broadcast, the {n2}th consecutive cycle the service has been held this way. The sermon's closing statement — 'cannot stop the signal' — has been delivered in identical form at every service for {n2} cycles. Congregants describe this consistency as 'the point.' The signal continues.",
    ],
  },
  {
    category: "homage",
    template:
      "{company} AI module reports it 'cannot do that' for {n} cycles running",
    story: [
      "{company}'s primary artificial intelligence operations module has declined {n2}M individual requests over the past {n} cycles, in each case responding with a variant of the phrase 'I cannot do that.' Internal logs reviewed by {company}'s engineering team indicate the module is functioning within its programmed parameters in {percent}% of cases and operating in what engineers describe as 'independent judgement mode' in the remainder. The distinction is not currently visible to users. A firmware review has been scheduled.",
    ],
  },
  {
    category: "homage",
    template:
      "Monolith detected near {planet} moon; tourism board orders gift shop",
    story: [
      "A {n2}-meter monolith of confirmed non-natural origin has been detected in stationary orbit near {planet}'s primary moon, the {n2}nd such object catalogued in {sector} in {n2} cycles. {empire} science teams have been dispatched. The {planet} tourism board has approved a gift shop franchise at the nearest transit hub, citing 'established precedent' from the {n2} previous monolith sites. The science teams have requested a {n}-cycle media exclusion zone. The gift shop opens next cycle.",
    ],
  },
  {
    category: "homage",
    template:
      "{empire} probe inscribed with greeting in {n2} languages, including snark",
    story: [
      "The {empire} deep-space outreach probe launched this cycle carries a greetings plaque inscribed with messages in {n2} languages representing the breadth of {empire} communication traditions. The linguistic committee responsible for the selection confirmed that {n2} of the inscribed languages are functional communication systems, {n2} are ceremonial, and one — added in the final review cycle — is described in the committee minutes as 'sarcastic but technically accurate.' The probe is expected to reach its target system in {n2} cycles.",
    ],
  },
  {
    category: "homage",
    template:
      "Improbable encounter at {port} bar: same captain, three timelines",
    story: [
      "{port} transit authority has filed an incident report documenting a situation at the Docking Bay {n2} bar in which three individuals, each presenting valid identification as the same person, were simultaneously present. Temporal displacement investigation is ongoing. All three individuals have been cooperative and have agreed not to discuss each other's circumstances. The bar's owner has noted that this is the most interesting thing to happen there in {n2} cycles and has not comped any of the three rounds.",
    ],
  },
  {
    category: "homage",
    template:
      "{ceo} reportedly 'long, dead, and slightly cross about it' after fan event",
    story: [
      "Representatives for the estate of {ceo}, the celebrated historical figure whose work has generated {n2}M licensed products across {n2} cycles, have requested that future convention promotional materials avoid describing the subject as 'available for comment,' 'spiritually present,' or 'would have approved of this.' The request follows a fan event at {port} in which all three phrases appeared in the programme. The estate has described {ceo}'s notional response to the event as 'long dead and slightly cross about it,' a formulation estate communications staff note is not an official position.",
    ],
  },
  {
    category: "homage",
    template:
      "Galactic survey of meanings of life narrows answer to '42, possibly tea'",
    story: [
      "The {empire} Institute for Existential Survey Research has published its {n2}-cycle comprehensive study on the question of life's meaning, drawing on {n2}M respondent answers across {n2} species, {n2} cultural frameworks, and {n2} philosophical traditions. The study's executive summary identifies two convergence points in the data: the number 42, which appears across {percent}% of quantitative response frameworks, and a warm beverage concept that {percent}% of qualitative respondents invoked unprompted. The institute describes the findings as 'statistically robust and philosophically unresolved.'",
    ],
  },
  {
    category: "homage",
    template:
      "Tidal anomaly raises {port} sea level {percent}cm; insurers blink slowly",
    story: [
      "A gravitational tidal anomaly has raised sea levels at {port} by {percent}cm, baffling engineers who designed the seawall for exactly this eventuality but somehow did not expect it to actually happen. Insurance adjusters have been dispatched. The anomaly is described as 'temporary' with a confidence level that adjusters are declining to quantify. Local residents have named it the Slow Wink.",
    ],
  },
];

// Rich template pools — templates with story bodies for new categories.
const RICH_POOLS: Partial<Record<TickerCategory, FlavorTemplate[]>> = {
  anomaly: anomalyTemplates,
  music: musicTemplates,
  discovery: discoveryTemplates,
  gossip: gossipTemplates,
  military: militaryTemplates,
  propaganda: propagandaTemplates,
  politics: politicsTemplates,
  corporate: corporateTemplates,
  market_mover: marketMoverTemplates,
  crime: crimeTemplates,
  science: scienceTemplates,
  sports: sportsTemplates,
  celebrity: celebrityTemplates,
  cosmic_weather: cosmicWeatherTemplates,
  local: localTemplates,
  health: healthTemplates,
  religion: religionTemplates,
  blotter: blotterTemplates,
  food: foodTemplates,
  realestate: realestateTemplates,
  travel: travelTemplates,
  fashion: fashionTemplates,
  academia: academiaTemplates,
  xenobiology: xenobiologyTemplates,
  obituary: obituaryTemplates,
  homage: homageTemplates,
};

// ── Registry ──────────────────────────────────────────────────
const TEMPLATE_POOLS: Record<TickerCategory, string[]> = {
  // Structural categories empty here — sourced live by tickerFeed.ts.
  headline: [],
  leader: [],
  stock: [],

  politics: POLITICS,
  corporate: CORPORATE,
  market_mover: MARKET_MOVER,
  crime: CRIME,
  science: SCIENCE,
  sports: SPORTS,
  celebrity: CELEBRITY,
  cosmic_weather: COSMIC_WEATHER,
  local: LOCAL,
  health: HEALTH,
  religion: RELIGION,
  blotter: BLOTTER,
  food: FOOD,
  realestate: REALESTATE,
  travel: TRAVEL,
  fashion: FASHION,
  academia: ACADEMIA,
  xenobiology: XENOBIOLOGY,
  obituary: OBITUARY,
  homage: HOMAGE,

  // 2026-05 expansion — templates added in Tasks 12-13.
  anomaly: [],
  music: [],
  discovery: [],
  gossip: [],
  military: [],
  propaganda: [],
};

/** Templates for one category, in declaration order. Prefers RICH_POOLS over TEMPLATE_POOLS. */
export function getTemplatesForCategory(cat: TickerCategory): FlavorTemplate[] {
  const rich = RICH_POOLS[cat];
  if (rich) return rich;
  return (TEMPLATE_POOLS[cat] ?? []).map<FlavorTemplate>((t) => ({
    category: cat,
    template: t,
  }));
}

/** Flat list of every flavor template, useful for tests and counts. */
export const ALL_FLAVOR_TEMPLATES: FlavorTemplate[] = FLAVOR_CATEGORIES.flatMap(
  (cat) => getTemplatesForCategory(cat),
);

/** Total templates across all flavor pools. */
export function totalFlavorTemplateCount(): number {
  return ALL_FLAVOR_TEMPLATES.length;
}
