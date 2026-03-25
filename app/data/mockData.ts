export const systemData = {
  currentDate: new Date("2026-03-24T09:30:00"),
  agenda: {
    todayHighImpact: [
      { id: 1, task: "Complete client proposal deck", priority: "critical", estimatedTime: 120, completed: false },
      { id: 2, task: "Review Q2 financial projections", priority: "high", estimatedTime: 45, completed: false },
      { id: 3, task: "Strategic 1:1 with key partner", priority: "high", estimatedTime: 60, completed: false },
    ],
    atomicHabits: [
      { id: 1, habit: "Morning bio-hacking stack", time: "06:30", completed: true, streak: 47 },
      { id: 2, habit: "Deep work block (focus mode)", time: "09:00", completed: true, streak: 34 },
      { id: 3, habit: "Mobility & recovery protocol", time: "14:00", completed: false, streak: 28 },
      { id: 4, habit: "Evening supplement protocol", time: "20:00", completed: false, streak: 52 },
      { id: 5, habit: "Next-day strategic planning", time: "21:30", completed: false, streak: 41 },
    ],
  },
  health: {
    bioTelemetry: {
      bodyBattery: 71,
    },
  },
  nextActions: [
    {
      id: 1,
      action: "Complete client proposal deck",
      module: "agenda",
      impact: 95,
      urgency: "critical",
      capitalEffect: "+$8,500",
      timeRequired: "120 min",
    },
  ],
}
