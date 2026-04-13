import Foundation

// MARK: - Modelos de dominio (espejo del API web /api/orbita/home)

/// Serie temporal de presión y energía para gráficos nativos (Swift Charts).
struct OperationalDaySample: Identifiable {
    let id: Int
    let dayLabel: String
    /// Carga de tiempo 0...100
    let timeLoad: Double
    /// Energía 0...100
    let energy: Double
    /// Presión financiera 0...100
    let moneyPressure: Double
    /// Flujo / “runway feeling” 0...100
    let flowScore: Double
}

/// Snapshot de las tres palancas; en producción vendría de API o bridge JS.
struct OperationalCapitalSnapshot: Sendable {
    var timeAvailableHours: Double
    var timeConsumedHours: Double
    var strategicFocusPct: Double
    var energyLevelPct: Double
    var energyTrend7d: [Double]
    var burnoutRiskPct: Double
    var netMonthlyCOP: Double
    var runwayDays: Int
    var financialPressurePct: Double
}

enum OperationalCapitalSampleData {
    /// Datos demo para UI nativa cuando aún no hay bridge con la web.
    static let snapshot = OperationalCapitalSnapshot(
        timeAvailableHours: 4.5,
        timeConsumedHours: 3.5,
        strategicFocusPct: 62,
        energyLevelPct: 58,
        energyTrend7d: [52, 54, 51, 49, 55, 57, 58],
        burnoutRiskPct: 34,
        netMonthlyCOP: -1_200_000,
        runwayDays: 45,
        financialPressurePct: 48
    )

    /// 14 días de ejemplo para tendencia compuesta (estilo Copilot: barras + líneas en un solo chart).
    static var predictive14d: [OperationalDaySample] {
        let labels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
        return labels.enumerated().map { i, day in
            let t = Double(i)
            return OperationalDaySample(
                id: i,
                dayLabel: day,
                timeLoad: min(100, 40 + sin(t / 2) * 18 + Double(i % 3) * 4),
                energy: min(100, 55 + cos(t / 2.5) * 15),
                moneyPressure: min(100, 35 + sin(t / 3 + 1) * 22),
                flowScore: min(100, 50 + cos(t / 2) * 20)
            )
        }
    }
}
