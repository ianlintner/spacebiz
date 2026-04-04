import type { AdviserMood, TutorialTrigger } from "../../data/types.ts";

export interface TutorialStep {
  id: string;
  trigger: TutorialTrigger;
  text: string;
  mood: AdviserMood;
  targetScene?: string;
  highlightHint?: string;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "tut_new_game",
    trigger: "newGame",
    text: "Welcome, Commander! I'm Rex, your K9-Corp Executive Adviser. I'll guide you through building a freight empire. First, name your company and choose a starting system.",
    mood: "success",
    targetScene: "GalaxySetupScene",
    highlightHint: "company name",
  },
  {
    id: "tut_first_route",
    trigger: "firstRoute",
    text: "Excellent — your first trade route! Routes define where your ships haul cargo. Make sure to assign a cargo type and attach ships to start earning revenue.",
    mood: "success",
    targetScene: "RoutesScene",
    highlightHint: "routes",
  },
  {
    id: "tut_first_ship",
    trigger: "firstShip",
    text: "New ship acquired! Each vessel class has different strengths — cargo capacity, speed, fuel efficiency. Match them to your routes for maximum profit.",
    mood: "success",
    targetScene: "FleetScene",
    highlightHint: "fleet",
  },
  {
    id: "tut_first_turn_end",
    trigger: "firstTurnEnd",
    text: "Initiating simulation. Your ships will now run their routes, and the galaxy will respond. Revenue, fuel costs, and random events will all play out. Watch closely!",
    mood: "analyzing",
    targetScene: "SimPlaybackScene",
    highlightHint: "end turn",
  },
  {
    id: "tut_first_simulation",
    trigger: "firstSimulation",
    text: "Simulation complete! You'll see a full turn report next — revenue breakdown, route performance, and news events. Use this data to plan your next moves.",
    mood: "analyzing",
    targetScene: "SimPlaybackScene",
  },
  {
    id: "tut_first_report",
    trigger: "firstReport",
    text: "This is your quarterly report. The grade reflects your profit margin. Check route performance to find inefficiencies, and scan the news digest for market shifts.",
    mood: "standby",
    targetScene: "TurnReportScene",
    highlightHint: "report",
  },
  {
    id: "tut_first_profit",
    trigger: "firstProfit",
    text: "First profitable quarter! Keep building on this. Consider expanding to new systems or adding ships to high-performing routes.",
    mood: "success",
  },
  {
    id: "tut_first_loss",
    trigger: "firstLoss",
    text: "We took a loss this quarter, but don't worry — it's common early on. Review your routes, cut unprofitable ones, and check if fuel costs are eating your margins.",
    mood: "alert",
  },
  {
    id: "tut_complete",
    trigger: "complete",
    text: "Tutorial complete! You've learned the fundamentals. I'll still be here with tips and market analysis. Good luck out there, Commander.",
    mood: "success",
  },
];
