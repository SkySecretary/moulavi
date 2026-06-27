# Sub-Agent Compliance Ranking & Audit System (NuSync)

This document provides a comprehensive guide to the sub-agent compliance monitoring system implemented in NuSync, split into **User Operations** and **Technical Implementation**.

---

## 📖 Part 1: User & Operational Guide

The Compliance Monitor watches sub-agents (B2B Parties) for logistical deviations and pilgrim visa violations. It ensures that sub-agents who continuously input dummy flights, mismatched arrival/departure details, or experience pilgrim overstays are flagged, rate-limited, or suspended.

### 1. Understanding compliance status levels
Each monitored sub-agent is assigned one of three compliance statuses:
*   🟢 **Green (Compliant)**: The agent's travel discrepancies are within normal tolerances. They have full access to visa bookings.
*   🟡 **Yellow (Throttled)**: Warning status. Logistical deviations have crossed the threshold (2%). The agent may experience rate-limits or warnings during booking.
*   🔴 **Red (Suspended)**: Critical status. Deviations have crossed the limit (5%) or at least one pilgrim has overstayed their program duration/absconded. **The agent is locked out of submitting new bookings.**

### 2. Monitoring the Dashboard
Go to **Settings (Gear Icon in Navbar)** $\rightarrow$ **Agent Compliance Audit** to access the compliance center.
*   **Compliance Summary**: Displays total monitored agents, counts of currently suspended/throttled agents, and the primary system-wide risk factor.
*   **Agent Registry**: A searchable table of all B2B agents showing:
    *   Total arrival/departure counts (rolling 30-day window).
    *   Detected mismatch counts.
    *   Overstay/Severe violation flags.
    *   Computed Weighted Index score.
*   **Agent Detail View**: Clicking on any agent displays their full audit log timeline and a list of active flight/port discrepancies.

### 3. Running Manual Recalculation
If the server's live integration with Nusuk fails (e.g. token expired) but you have manually synced or corrected data, you can recalculate metrics offline:
1.  Click the **Recalculate Compliance** button in the header of the Agent Compliance screen.
2.  The system will analyze all current passengers and discrepancy logs in the local database and update everyone's status.

### 4. Administrative Override (Status Override)
Administrators can override any calculated compliance status to lift or enforce suspensions:
1.  Select the agent from the registry.
2.  Click **Override Status** under their details.
3.  Choose the target status (`GREEN`, `YELLOW`, or `RED`) and enter a **reason**.
4.  Saving will apply the override, register an entry in the agent's historical audit timeline, and update booking permissions immediately.

---

## 🛠️ Part 2: Technical & Algorithmic Guide

The compliance engine runs rolling 30-day window calculations using SQLite database records.

### 1. Data Schema Design

The system relies on two main tables linked to the `Party` model (representing B2B agents) in `schema.prisma`:

#### `SubAgentMetric` (Sub-agent rolling metrics)
```prisma
model SubAgentMetric {
  subAgentId          String           @id @map("sub_agent_id")
  totalArrivals       Int              @map("total_arrivals")
  totalDepartures     Int              @map("total_departures")
  arrivalMismatches   Int              @map("arrival_mismatches")
  departureMismatches Int              @map("departure_mismatches")
  severeViolations    Int              @map("severe_violations")
  weightedScore       Decimal          @map("weighted_score")
  complianceStatus    ComplianceStatus @map("compliance_status")
  updatedAt           DateTime         @default(now()) @updatedAt @map("updated_at")
  subAgent            Party            @relation(fields: [subAgentId], references: [id], onDelete: Cascade)
}
```

#### `ComplianceAuditLog` (Historical audit log timeline)
```prisma
model ComplianceAuditLog {
  id             String           @id @default(uuid())
  subAgentId     String           @map("sub_agent_id")
  previousStatus ComplianceStatus @map("previous_status")
  newStatus      ComplianceStatus @map("new_status")
  reasonSummary  String           @map("reason_summary")
  createdAt      DateTime         @default(now()) @map("created_at")
  subAgent       Party            @relation(fields: [subAgentId], references: [id], onDelete: Cascade)
}
```

### 2. Scoring & Ranking Algorithm

Compliance statuses are updated whenever a **Nusuk Sync** occurs or when **Manual Recalculation** is triggered.

#### Step A: Filter rolling window
Only check arrivals (`entryDate`) and departures (`exitDate`) within a rolling **30-day window**:
Window Start = Current Date - 30 days

#### Step B: Math Formula
To calculate discrepancy rates, we apply smoothing weights to prevent agents with low volumes from being suspended due to a single administrative mismatch.

Let:
*   Arrival Mismatches = count of unresolved entry discrepancies in the 30-day window
*   Total Arrivals = count of all pilgrim arrivals in the 30-day window
*   Departure Mismatches = count of unresolved exit discrepancies in the 30-day window
*   Total Departures = count of all pilgrim departures in the 30-day window

Calculate smoothed rates:
*   Smoothed Arrival Mismatch Rate (R_A) = Arrival Mismatches / (Total Arrivals + 10)
*   Smoothed Departure Mismatch Rate (R_D) = Departure Mismatches / (Total Departures + 10)

*Note: The constant "+ 10" in the denominator is a smoothing factor. An agent with only 1 pilgrim mismatch out of 1 total arrival gets 1 / 11 = 9% discrepancy rate instead of a booking-blocking 100% flag.*

#### Step C: Weighted Index Calculation
Since departure flight mismatches represent a higher operational risk (e.g. overstays), departure deviations are weighted twice as heavily as arrival deviations:
Weighted Score = ((R_A * 1.0) + (R_D * 2.0)) / (1.0 + 2.0)
               = ((R_A * 1.0) + (R_D * 2.0)) / 3.0

#### Step D: Status Mapping Rules
1.  **Severe Overstays override all scores**: If `severeViolations` > 0, status is automatically set to **RED**.
    *   *Severe Violations* are triggered when pilgrim status matches `Program Duration Exceeded` or contains `runaway` / `overstay`.
2.  **RED Threshold**: If Weighted Score >= 0.05 (5%) -> status becomes **RED**.
3.  **YELLOW Threshold**: If Weighted Score >= 0.02 (2%) -> status becomes **YELLOW**.
4.  Otherwise -> status is **GREEN**.

---

### 3. Implementation Details

The recalculation and updates are transactional. Changes are written via `prisma.$transaction`. 

*   **Offline Recalculation Endpoint**: `POST /api/nusuk/compliance/recalculate` executes the identical scoring logic over the passenger data stored in `UmrahPassenger` and resolved/unresolved `NusukMismatch` lists without sending external HTTP requests.
*   **Automatic Audit Trail**: If the newly calculated status differs from the database `previousStatus`, a `ComplianceAuditLog` is automatically written detailing the exact violation count or threshold crossing.
