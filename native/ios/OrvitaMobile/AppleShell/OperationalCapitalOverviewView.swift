import Charts
import SwiftUI

// MARK: - Vista nativa: capital operativo + Swift Charts

/// Dashboard compacto: presión visible de un vistazo + gráfico compuesto (patrón tipo Copilot Money: Charts nativo, menos custom drawing).
struct OperationalCapitalOverviewView: View {
    private let snapshot: OperationalCapitalSnapshot
    private let series: [OperationalDaySample]

    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    init(
        snapshot: OperationalCapitalSnapshot = OperationalCapitalSampleData.snapshot,
        series: [OperationalDaySample] = OperationalCapitalSampleData.predictive14d
    ) {
        self.snapshot = snapshot
        self.series = series
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                header
                pressureStrip
                compositeChart
                energySparkline
                financeCallout
                mockDisclaimer
            }
            .padding(.horizontal)
            .padding(.bottom, 24)
        }
        .navigationTitle("Capital operativo")
        .navigationBarTitleDisplayMode(.large)
    }

    // MARK: Header

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Tus 3 palancas")
                .font(.title2.weight(.semibold))
                .accessibilityAddTraits(.isHeader)
            Text("Tiempo, energía y dinero en un solo lugar. Menos scroll, más decisión.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(.top, 8)
    }

    // MARK: Franja de presión (jerarquía visual #1)

    private var pressureStrip: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Presión actual")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
                .textCase(.uppercase)
                .tracking(0.8)

            HStack(spacing: 12) {
                pressureTile(
                    title: "Tiempo",
                    value: timeUsedPercent,
                    caption: "\(formatHours(snapshot.timeAvailableHours)) disponibles",
                    tint: .cyan
                )
                pressureTile(
                    title: "Energía",
                    value: snapshot.energyLevelPct,
                    caption: "Riesgo burnout \(Int(snapshot.burnoutRiskPct))%",
                    tint: .orange
                )
                pressureTile(
                    title: "Dinero",
                    value: snapshot.financialPressurePct,
                    caption: formatCOP(snapshot.netMonthlyCOP),
                    tint: snapshot.netMonthlyCOP >= 0 ? .green : .pink
                )
            }
            .accessibilityElement(children: .contain)
        }
        .padding(16)
        .background {
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(.ultraThinMaterial)
                .shadow(color: .black.opacity(colorScheme == .dark ? 0.35 : 0.08), radius: 12, y: 4)
        }
    }

    private func pressureTile(title: String, value: Double, caption: String, tint: Color) -> some View {
        let clamped = min(100, max(0, value))
        return VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.caption2.weight(.semibold))
                .foregroundStyle(.secondary)
            Text("\(Int(clamped))%")
                .font(.headline.weight(.semibold))
                .foregroundStyle(tint)
                .accessibilityLabel("\(title), \(Int(clamped)) por ciento")
            ProgressView(value: clamped, total: 100)
                .tint(tint)

            Text(caption)
                .font(.caption2)
                .foregroundStyle(.secondary)
                .lineLimit(2)
                .minimumScaleFactor(0.85)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var timeUsedPercent: Double {
        let denom = max(1.0, snapshot.timeAvailableHours + snapshot.timeConsumedHours)
        return min(100, (snapshot.timeConsumedHours / denom) * 100)
    }

    /// Pares día/nivel para el sparkline (evita `let` dentro del builder del `VStack`).
    private var energyTrendPairs: [(i: Int, v: Double)] {
        snapshot.energyTrend7d.enumerated().map { idx, v in (i: idx, v: v) }
    }

    // MARK: Gráfico compuesto (Swift Charts)

    private var compositeChart: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Tendencia 14 días")
                .font(.headline)
            Text("Barras: presión financiera · Líneas: energía y flujo")
                .font(.caption)
                .foregroundStyle(.secondary)

            Chart(series) { row in
                BarMark(
                    x: .value("Día", row.dayLabel),
                    y: .value("Presión $", row.moneyPressure)
                )
                .foregroundStyle(Color.pink.opacity(0.35))

                LineMark(
                    x: .value("Día", row.dayLabel),
                    y: .value("Energía", row.energy)
                )
                .interpolationMethod(.catmullRom)
                .lineStyle(StrokeStyle(lineWidth: dynamicTypeSize.isAccessibilitySize ? 3 : 2))
                .foregroundStyle(.orange)

                LineMark(
                    x: .value("Día", row.dayLabel),
                    y: .value("Flujo", row.flowScore)
                )
                .interpolationMethod(.catmullRom)
                .lineStyle(StrokeStyle(lineWidth: dynamicTypeSize.isAccessibilitySize ? 3 : 2))
                .foregroundStyle(.teal)
            }
            .frame(height: dynamicTypeSize.isAccessibilitySize ? 280 : 220)
            .chartLegend(position: .bottom, alignment: .leading)
            .chartXAxis {
                AxisMarks(values: .automatic) { _ in
                    AxisGridLine()
                    AxisTick()
                    AxisValueLabel()
                        .font(.caption2)
                }
            }
            .chartYAxis {
                AxisMarks(position: .leading)
            }
            .accessibilityLabel("Tendencia de presión financiera, energía y flujo en catorce días")
        }
        .padding(16)
        .background {
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(.ultraThinMaterial)
        }
    }

    // MARK: Energía 7D (área suave)

    private var energySparkline: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Energía · 7 días")
                .font(.headline)

            Chart(energyTrendPairs, id: \.i) { item in
                AreaMark(
                    x: .value("Día", item.i),
                    y: .value("Nivel", item.v)
                )
                .foregroundStyle(
                    LinearGradient(
                        colors: [.orange.opacity(0.45), .orange.opacity(0.05)],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
                LineMark(
                    x: .value("Día", item.i),
                    y: .value("Nivel", item.v)
                )
                .foregroundStyle(.orange)
            }
            .frame(height: 120)
            .chartXAxis(.hidden)
            .chartYAxis {
                AxisMarks(position: .leading)
            }
            .accessibilityLabel("Tendencia de energía en siete días")
        }
        .padding(16)
        .background {
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(.ultraThinMaterial)
        }
    }

    // MARK: Finanzas

    private var financeCallout: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("Flujo y runway", systemImage: "banknote")
                .font(.headline)
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Neto mensual")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(formatCOP(snapshot.netMonthlyCOP))
                        .font(.title3.weight(.semibold))
                        .foregroundStyle(snapshot.netMonthlyCOP >= 0 ? Color.green : Color.pink)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 4) {
                    Text("Runway")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text("\(snapshot.runwayDays) días")
                        .font(.title3.weight(.semibold))
                }
            }
        }
        .padding(16)
        .background {
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .strokeBorder(.secondary.opacity(0.25))
        }
    }

    private var mockDisclaimer: some View {
        Text("Datos de demostración en la app nativa. La sesión y datos reales siguen en la vista web hasta conectar API o bridge.")
            .font(.footnote)
            .foregroundStyle(.secondary)
            .fixedSize(horizontal: false, vertical: true)
    }

    // MARK: Formato

    private func formatCOP(_ value: Double) -> String {
        let f = NumberFormatter()
        f.numberStyle = .currency
        f.currencyCode = "COP"
        f.maximumFractionDigits = 0
        f.locale = Locale(identifier: "es_CO")
        return f.string(from: NSNumber(value: value)) ?? "\(Int(value))"
    }

    private func formatHours(_ h: Double) -> String {
        String(format: "%.1f h", h)
    }
}

#Preview("Capital — claro") {
    NavigationStack {
        OperationalCapitalOverviewView()
    }
}

#Preview("Capital — oscuro") {
    NavigationStack {
        OperationalCapitalOverviewView()
    }
    .preferredColorScheme(.dark)
}
