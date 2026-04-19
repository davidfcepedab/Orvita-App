import {
  buildSuperhabitStreakCelebration,
  highestNewlyReachedStreakMilestone,
  superhabitStreakRewardMessage,
} from "@/lib/habits/streakMilestones"

describe("highestNewlyReachedStreakMilestone", () => {
  it("returns null when no threshold crossed", () => {
    expect(highestNewlyReachedStreakMilestone(5, 6)).toBeNull()
    expect(highestNewlyReachedStreakMilestone(7, 8)).toBeNull()
  })

  it("returns 7 when crossing from 6 to 7", () => {
    expect(highestNewlyReachedStreakMilestone(6, 7)).toBe(7)
  })

  it("returns highest newly crossed when jumping several", () => {
    expect(highestNewlyReachedStreakMilestone(5, 32)).toBe(30)
  })
})

describe("buildSuperhabitStreakCelebration", () => {
  it("only fires when marking done today and superhábito", () => {
    expect(
      buildSuperhabitStreakCelebration({
        habitId: "1",
        habitName: "Test",
        isSuperhabit: true,
        wasCompletedToday: true,
        nowCompletedToday: true,
        prevStreak: 6,
        nextStreak: 7,
      }),
    ).toBeNull()
    expect(
      buildSuperhabitStreakCelebration({
        habitId: "1",
        habitName: "Test",
        isSuperhabit: false,
        wasCompletedToday: false,
        nowCompletedToday: true,
        prevStreak: 6,
        nextStreak: 7,
      }),
    ).toBeNull()
    const hit = buildSuperhabitStreakCelebration({
      habitId: "1",
      habitName: "Test",
      isSuperhabit: true,
      wasCompletedToday: false,
      nowCompletedToday: true,
      prevStreak: 6,
      nextStreak: 7,
    })
    expect(hit?.milestoneDays).toBe(7)
    expect(hit?.message).toBe(superhabitStreakRewardMessage(7))
  })
})
