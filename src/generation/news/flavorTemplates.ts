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
