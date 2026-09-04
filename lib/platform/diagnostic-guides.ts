export interface DiagnosticGuideSection {
  heading: string;
  body: string[];
}

export interface DiagnosticGuideFaq {
  question: string;
  answer: string;
}

export interface DiagnosticGuide {
  slug: string;
  category: string;
  title: string;
  description: string;
  updatedAt: string;
  readMinutes: number;
  heroPoints: string[];
  sections: DiagnosticGuideSection[];
  checklist: string[];
  faqs: DiagnosticGuideFaq[];
}

export const diagnosticGuides: DiagnosticGuide[] = [
  {
    slug: "engine-cranks-no-start",
    category: "No start",
    title: "Engine cranks but will not start",
    description:
      "A practical order for separating battery speed, immobilizer, fuel delivery, ignition, compression, timing, and sensor causes before replacing parts.",
    updatedAt: "2026-09-04",
    readMinutes: 8,
    heroPoints: [
      "Confirm cranking speed before chasing fuel or spark.",
      "Scan for stored and pending codes even when the light is not obvious.",
      "Test spark, injector pulse, fuel pressure, and compression in an order that avoids guesswork.",
    ],
    sections: [
      {
        heading: "Start with what the engine is actually doing",
        body: [
          "A cranking no-start means the starter is rotating the engine, but combustion is not becoming self-sustaining. That usually leaves five large buckets: not enough air, not enough fuel, no usable spark or injection event, low compression, or timing/synchronization information the ECU cannot trust.",
          "Before parts are replaced, write down whether the engine cranks fast and evenly, cranks slowly, coughs once and dies, starts with throttle, starts with starting fluid, or never attempts to fire. That first observation often decides the next test.",
        ],
      },
      {
        heading: "Battery and cranking speed still matter",
        body: [
          "Modern ECUs can stop controlling fuel or spark if battery voltage drops too low while cranking. A battery that shows 12.4 volts at rest can still fall below a usable voltage under starter load. Watch voltage at the battery during cranking and listen for an even rhythm.",
          "If the engine sounds uneven, speeds up on one or two cylinders, or cranks unusually fast, do a compression or relative compression check early. A broken timing belt, washed cylinders, or valve-train issue can sound like an electrical fault from inside the cabin.",
        ],
      },
      {
        heading: "Use scan data before unplugging parts",
        body: [
          "Read codes and live data while cranking. Useful values include engine RPM, coolant temperature, throttle position, immobilizer status, fuel rail pressure on direct-injection engines, cam/crank sync status, and commanded injector pulse when available.",
          "If scan data shows zero RPM during cranking, the ECU may not see a crankshaft position signal. If temperature data reads an impossible value, fueling can be badly wrong. If immobilizer status is not authorized, the engine may crank normally but fuel or injection can be blocked.",
        ],
      },
      {
        heading: "Check fuel, spark, injection, and compression as separate proofs",
        body: [
          "A quick fuel smell is not a fuel-pressure test. A spark seen once at a plug wire is not proof that all cylinders have spark at the right time. Try to collect separate evidence: pressure or rail data for fuel, spark tester result for ignition systems, noid light or scan data for injector command, and compression or leakdown for mechanical health.",
          "On gasoline engines, a short, safe intake test with approved diagnostic fluid can help split fuel delivery from ignition/compression, but it should be used carefully and never around fuel leaks, backfire risk, or diesel engines. On diesel engines, focus on rail pressure, air metering, glow strategy, compression, and synchronization instead.",
        ],
      },
      {
        heading: "Avoid the common parts trap",
        body: [
          "Fuel pumps, crank sensors, ignition coils, and batteries are often replaced because they are common failure points, not because they were proven bad. A good diagnostic path proves what is missing first, then tests the circuit or mechanical cause of that missing input.",
          "For example, low fuel pressure can be caused by a weak pump, no pump power, a blocked filter, bad relay control, wiring voltage drop, a failed pressure regulator, or an empty tank with a bad level sender. Replacing the pump first can be expensive and still leave the real fault untouched.",
        ],
      },
    ],
    checklist: [
      "Record year, make, model, engine, fuel type, and mileage.",
      "Measure battery voltage at rest and while cranking.",
      "Scan for codes and live RPM during cranking.",
      "Check immobilizer/security status if available.",
      "Prove fuel pressure or rail pressure.",
      "Prove spark or injector command depending on engine type.",
      "Run compression/relative compression if cranking rhythm is uneven.",
    ],
    faqs: [
      {
        question: "Can a car have no codes and still not start?",
        answer:
          "Yes. A fuel-pressure fault, compression fault, weak battery under load, or mechanical timing issue may not set a useful code, especially if the engine never runs long enough for monitors to complete.",
      },
      {
        question: "Should I replace the crank sensor first?",
        answer:
          "Only if testing points there. Zero RPM on live data while cranking, related codes, missing reference signal, or heat-related signal dropout would make the crank sensor or its circuit a strong suspect.",
      },
    ],
  },
  {
    slug: "check-engine-light-rough-idle",
    category: "Warning light",
    title: "Check engine light with rough idle",
    description:
      "How to use codes, freeze-frame data, fuel trims, misfire counters, vacuum leaks, ignition checks, and injector clues to narrow a rough idle.",
    updatedAt: "2026-09-04",
    readMinutes: 7,
    heroPoints: [
      "Freeze-frame data matters because it records when the fault happened.",
      "Fuel trims help split air leaks, fueling faults, and sensor problems.",
      "Misfire diagnosis should compare cylinders before parts are swapped.",
    ],
    sections: [
      {
        heading: "A rough idle is a symptom, not a diagnosis",
        body: [
          "A rough idle with a check engine light can come from ignition, fuel delivery, vacuum leaks, compression imbalance, valve timing, exhaust restrictions, EGR faults, PCV faults, or inaccurate sensor data. The trouble code tells you where the ECU saw a problem, not always which part failed.",
          "Start by recording every stored, pending, and permanent code. Also record freeze-frame RPM, load, coolant temperature, vehicle speed, fuel trims, and whether the fault happened cold, hot, at idle, or under acceleration.",
        ],
      },
      {
        heading: "Read fuel trims before clearing codes",
        body: [
          "Short-term and long-term fuel trims show how much correction the ECU is applying. High positive trims at idle that improve with RPM often point toward an air leak. High positive trims under load can point toward fuel delivery, mass airflow measurement, or exhaust restriction issues.",
          "Negative trims mean the ECU is removing fuel. That can happen with leaking injectors, excessive fuel pressure, purge valve faults, biased sensors, or rich-running conditions. The trend is more useful than one snapshot.",
        ],
      },
      {
        heading: "Misfire codes need comparison testing",
        body: [
          "A single-cylinder misfire such as P0302 should be compared against that cylinder's plug, coil, injector, compression, and wiring. Swapping a coil or plug to another cylinder can be useful if the design allows it and the parts are accessible.",
          "Random or multi-cylinder misfires point more strongly toward shared causes: vacuum leaks, low fuel pressure, contaminated fuel, valve timing, EGR stuck open, intake leaks, or a sensor that affects all cylinders.",
        ],
      },
      {
        heading: "Vacuum leaks are common but should be proven",
        body: [
          "Listen for hissing, inspect cracked intake boots, check PCV hoses, brake booster hoses, purge lines, intake gaskets, and oil cap behavior. A smoke test is often the cleanest way to prove a leak without guessing.",
          "On turbocharged engines, leaks may appear under boost instead of idle vacuum. Look at smoke-test direction, charge pipes, diverter valves, intercooler joints, and crankcase ventilation paths.",
        ],
      },
      {
        heading: "Know when to stop driving",
        body: [
          "A flashing check engine light usually means active misfire that can overheat and damage the catalytic converter. Raw fuel smell, severe shaking, loud mechanical noise, oil pressure warning, or overheating should be treated as stop-driving signs.",
          "If the engine barely runs, focus on safety and towing rather than trying repeated long road tests. Diagnostics are useful only if the vehicle can be tested without creating a larger failure.",
        ],
      },
    ],
    checklist: [
      "Record all stored, pending, and permanent codes.",
      "Save freeze-frame data before clearing anything.",
      "Compare short-term and long-term fuel trims at idle and 2500 RPM.",
      "Identify whether misfires are single-cylinder or shared.",
      "Inspect intake boots, PCV hoses, purge lines, and vacuum hoses.",
      "Check plugs/coils/injector command only after reading the data pattern.",
    ],
    faqs: [
      {
        question: "Can bad fuel cause a rough idle and warning light?",
        answer:
          "Yes, but it should fit the timing. If the symptom began immediately after refueling and affects multiple cylinders, contaminated fuel becomes more plausible.",
      },
      {
        question: "Is it safe to drive with a flashing check engine light?",
        answer:
          "Usually no. A flashing light commonly indicates active misfire that can damage the catalytic converter, so the safer choice is to stop driving and diagnose or tow.",
      },
    ],
  },
  {
    slug: "overheating-temperature-climb",
    category: "Cooling",
    title: "Temperature climbs or overheating",
    description:
      "A safe diagnostic path for coolant loss, thermostat behavior, radiator airflow, fan control, water pump flow, pressure faults, and head-gasket warning signs.",
    updatedAt: "2026-09-04",
    readMinutes: 8,
    heroPoints: [
      "Never open a hot cooling system under pressure.",
      "Separate coolant loss, airflow, circulation, and combustion-gas faults.",
      "Fan operation and thermostat behavior should be tested under controlled conditions.",
    ],
    sections: [
      {
        heading: "Overheating diagnosis starts with safety",
        body: [
          "Hot coolant can cause severe burns. Do not remove a radiator cap or pressure cap when the system is hot. If the gauge climbs rapidly, a warning appears, steam is visible, or the engine loses power, stop driving and let the system cool before inspection.",
          "The first useful details are when the temperature rises: at idle, in traffic, highway speed, climbing hills, after coolant service, only with air conditioning, or only after a long drive. Each pattern points to a different part of the cooling system.",
        ],
      },
      {
        heading: "Separate coolant loss from poor cooling",
        body: [
          "If coolant is low, find where it went before topping up repeatedly. External leaks may appear at hoses, radiator seams, water pump weep holes, thermostat housings, heater cores, reservoir caps, or plastic fittings. Internal loss may show as white exhaust smoke, sweet smell, contaminated oil, or repeated pressure in the cooling system.",
          "If coolant level is correct, the problem may be airflow, circulation, thermostat control, fan control, pressure-cap behavior, sensor accuracy, or combustion gases entering the system.",
        ],
      },
      {
        heading: "Idle overheating often points to airflow",
        body: [
          "A vehicle that overheats mainly at idle or in slow traffic but cools down on the highway often has a fan, fan relay, fan module, fuse, temperature signal, shroud, condenser blockage, or airflow issue. With air conditioning on, many vehicles command fan operation, which can be a useful clue.",
          "Do not put hands, tools, or clothing near fans. Electric fans can start unexpectedly. Inspect visually and use scan-tool commands or wiring tests where appropriate.",
        ],
      },
      {
        heading: "Highway overheating points elsewhere",
        body: [
          "If temperature climbs at speed, look beyond the fans. Restrictions in the radiator, stuck thermostat, collapsed hose, weak water pump impeller, air trapped after service, lean running, dragging brakes, blocked condenser/radiator fins, or combustion-gas intrusion can overload the system.",
          "An infrared thermometer, pressure tester, block test, scan data, and careful hose-temperature comparison can help split circulation from sensor or pressure problems.",
        ],
      },
      {
        heading: "Head-gasket symptoms are patterns, not one clue",
        body: [
          "A failed head gasket can push combustion gas into coolant, consume coolant, overpressurize hoses quickly after a cold start, cause bubbles in the reservoir, misfire on startup, or produce white exhaust smoke. One bubble or one smell is not enough proof.",
          "Use a pressure test, chemical block test, leakdown test, borescope, and plug inspection when the pattern is suspicious. Driving an overheating engine can turn a repairable fault into a ruined engine.",
        ],
      },
    ],
    checklist: [
      "Let the system cool before opening any pressure cap.",
      "Record when the overheating happens: idle, speed, load, AC on, or after service.",
      "Check coolant level and look for external leaks.",
      "Verify fan command and fan operation safely.",
      "Compare thermostat opening behavior and hose temperatures.",
      "Pressure-test the system if coolant loss continues.",
      "Test for combustion gas when pressure builds too quickly or coolant disappears.",
    ],
    faqs: [
      {
        question: "Can I keep driving if the heater brings the temperature down?",
        answer:
          "The heater removing heat is only a temporary clue. It does not make continued driving safe if the gauge is still climbing or coolant is low.",
      },
      {
        question: "Does overheating always mean the thermostat is bad?",
        answer:
          "No. Thermostats fail, but airflow, coolant loss, pressure caps, trapped air, radiator restriction, water pump flow, and head-gasket issues can produce the same gauge behavior.",
      },
    ],
  },
  {
    slug: "brake-grinding-noise",
    category: "Brakes",
    title: "Grinding noise when braking",
    description:
      "How to separate worn pads, rotor damage, backing plates, stuck calipers, wheel bearings, debris, and safety-stop conditions.",
    updatedAt: "2026-09-04",
    readMinutes: 6,
    heroPoints: [
      "Grinding under braking can become a stopping-distance problem quickly.",
      "Metal-to-metal pad wear is only one possible cause.",
      "Inspect both sides of the axle because brake faults often compare left to right.",
    ],
    sections: [
      {
        heading: "Treat brake grinding as a safety complaint",
        body: [
          "A grinding sound when braking can mean the friction material is gone and the backing plate is contacting the rotor. It can also come from trapped debris, a bent dust shield, severe rotor corrosion, stuck caliper hardware, loose pads, or a wheel bearing that changes pitch when load shifts.",
          "If the pedal is soft, the vehicle pulls hard, brake fluid is low, the warning light is on, or stopping distance has changed, avoid driving until the braking system is inspected.",
        ],
      },
      {
        heading: "Look for side-to-side differences",
        body: [
          "Compare inner and outer pad thickness on both sides of the axle. A stuck slide pin can wear one pad much faster than the other. A seized caliper piston can overheat one rotor. A collapsed brake hose can keep one caliper applied after the pedal is released.",
          "Rotor color and smell matter. Blueing, heavy scoring, cracks, or a burnt smell point to heat. A wheel that is much hotter than the opposite side after a short drive points toward drag, but temperature checks should be done carefully and without touching hot parts.",
        ],
      },
      {
        heading: "Do not ignore the dust shield and debris",
        body: [
          "A small stone between the rotor and backing plate can sound dramatic but may not be a worn-pad failure. A dust shield bent into the rotor can scrape constantly and change when steering. These faults still need inspection, but the repair path is different from a pad-and-rotor job.",
          "If the noise appears after tire work, brake work, or off-road/gravel driving, debris and shield contact move higher on the list.",
        ],
      },
      {
        heading: "A proper brake inspection is more than pad thickness",
        body: [
          "A useful inspection records pad thickness, rotor thickness and condition, caliper slide movement, piston boot condition, brake hose damage, fluid leaks, parking brake release, hardware position, and whether ABS or stability-control warnings are present.",
          "Replacing pads on damaged rotors or stuck hardware can make the noise disappear briefly while leaving the cause in place. Brake work should follow service information and local inspection rules.",
        ],
      },
    ],
    checklist: [
      "Stop driving if the pedal feel, warning lights, pulling, or stopping distance changed.",
      "Compare inner and outer pad thickness on both sides.",
      "Inspect rotor faces for scoring, cracking, heavy rust, or heat discoloration.",
      "Check for bent shields or debris near the rotor.",
      "Inspect caliper slides, boots, and brake hoses.",
      "Verify parking brake release if rear brakes are noisy or hot.",
    ],
    faqs: [
      {
        question: "Can new brakes grind?",
        answer:
          "Yes. Incorrect hardware, debris, rust ridges, missing lubricant on contact points, wrong parts, or a bent shield can create noise after recent brake work.",
      },
      {
        question: "Is a squeal the same as grinding?",
        answer:
          "No. Squeal can be caused by vibration, wear indicators, or hardware issues. Grinding suggests harder contact or debris and deserves faster inspection.",
      },
    ],
  },
  {
    slug: "battery-alternator-starting",
    category: "Electrical",
    title: "Battery, alternator, or starter problem",
    description:
      "A structured way to read resting voltage, cranking voltage, charging voltage, voltage drop, parasitic draw clues, and starter circuit behavior.",
    updatedAt: "2026-09-04",
    readMinutes: 7,
    heroPoints: [
      "A resting battery voltage is only a snapshot, not a load test.",
      "Voltage drop finds bad cables and grounds that parts replacement misses.",
      "Charging faults and parasitic drain faults can look similar to the driver.",
    ],
    sections: [
      {
        heading: "Name the starting symptom precisely",
        body: [
          "A no-crank, slow crank, rapid clicking, single click, crank-and-die, or starts-with-jump complaint each points to a different branch. The battery, starter, alternator, cables, grounds, ignition switch, relays, immobilizer, and control modules can all be involved.",
          "Record whether lights dim heavily, the dash resets, the starter clicks once, the starter spins but the engine does not, or a jump start changes the symptom. That history matters as much as a voltage number.",
        ],
      },
      {
        heading: "Resting and cranking voltage tell different stories",
        body: [
          "A healthy fully charged 12-volt lead-acid battery is usually around 12.6 volts at rest, but temperature, surface charge, battery chemistry, and age affect readings. During cranking, voltage should not collapse severely. A load test or conductance test is better than resting voltage alone.",
          "If voltage falls hard during cranking, suspect the battery or excessive starter draw. If voltage stays high but the starter barely moves, suspect the starter circuit, starter motor, engine mechanical drag, or a poor high-current path.",
        ],
      },
      {
        heading: "Charging voltage is not the whole alternator test",
        body: [
          "Many vehicles charge around the mid-13 to mid-14 volt range, but smart charging systems vary voltage depending on battery state, temperature, electrical load, and ECU strategy. Check service information before condemning an alternator based on one reading.",
          "Useful charging checks include battery voltage with loads on, ripple voltage, belt condition, tensioner behavior, alternator command data, current output when available, and voltage drop between alternator, battery positive, engine ground, and chassis ground.",
        ],
      },
      {
        heading: "Voltage drop catches hidden cable faults",
        body: [
          "Corrosion inside a cable, loose grounds, damaged terminals, or paint under a ground point can pass a continuity test but fail under load. Voltage-drop testing measures loss while current is flowing, which is why it is so useful for starting and charging faults.",
          "Test the positive side and ground side separately during cranking or high electrical load. A high drop tells you where energy is being wasted as heat instead of reaching the starter or battery.",
        ],
      },
      {
        heading: "A dead battery after sitting may be a draw",
        body: [
          "If the battery tests good and charging is correct but the vehicle dies after sitting, check for parasitic draw after modules go to sleep. Common causes include lights staying on, stuck relays, aftermarket accessories, water-damaged modules, infotainment faults, or keyless-entry wakeups.",
          "Do not pull fuses randomly before the vehicle enters sleep mode. Opening doors, waking modules, or using the wrong meter setup can create misleading readings.",
        ],
      },
    ],
    checklist: [
      "Record no-crank, slow-crank, click, or crank-and-die behavior.",
      "Measure resting battery voltage after surface charge has settled.",
      "Measure voltage while cranking.",
      "Check charging voltage with relevant loads on.",
      "Perform positive and ground-side voltage-drop tests.",
      "Inspect terminals, grounds, belts, and starter connections.",
      "Check parasitic draw only after modules enter sleep mode.",
    ],
    faqs: [
      {
        question: "Can a bad alternator ruin a new battery?",
        answer:
          "Yes. Undercharging can leave the battery discharged, and overcharging can damage it. Always check charging behavior when a battery fails repeatedly.",
      },
      {
        question: "Why does a jump start help if the alternator is bad?",
        answer:
          "A jump can supply enough energy to start the engine, but the alternator still needs to maintain system voltage afterward. If it cannot, the vehicle may die again.",
      },
    ],
  },
  {
    slug: "diesel-dpf-warning",
    category: "Diesel",
    title: "Diesel DPF warning or limp mode",
    description:
      "Legal diagnostic checks for soot loading, differential pressure, exhaust temperature sensors, boost leaks, injector faults, and failed regeneration conditions.",
    updatedAt: "2026-09-04",
    readMinutes: 8,
    heroPoints: [
      "DPF diagnosis should look for why regeneration failed, not just the soot number.",
      "Differential pressure must be interpreted with RPM, load, and sensor plausibility.",
      "Emissions defeat or DPF removal is not a diagnostic repair path.",
    ],
    sections: [
      {
        heading: "A DPF warning is usually the end of a chain",
        body: [
          "A diesel particulate filter warning can be caused by short-trip use, failed regeneration, excessive soot production, ash loading, a pressure sensor fault, split pressure hoses, temperature sensor faults, boost leaks, EGR faults, injector problems, thermostat faults, or oil/fuel contamination.",
          "The goal is to understand why the filter loaded or why the ECU could not regenerate it. Simply forcing a regeneration without checking prerequisites can fail again or overheat damaged components.",
        ],
      },
      {
        heading: "Record soot, ash, pressure, and temperature data together",
        body: [
          "Useful scan data includes calculated soot mass, measured soot when available, ash load, differential pressure at idle and raised RPM, exhaust temperature sensors, regeneration status, distance since last regeneration, failed regeneration counters, boost request versus actual, and coolant temperature.",
          "A high differential pressure with low calculated soot can mean a blocked filter, incorrect calculation, sensor or hose issue, or ash loading. A low pressure reading that never changes can mean a sensor, hose, wiring, or ECU interpretation fault.",
        ],
      },
      {
        heading: "Check prerequisites before regeneration",
        body: [
          "Many vehicles will not regenerate if coolant temperature is too low, fuel level is low, certain fault codes are active, exhaust temperature sensors are implausible, glow systems have faults, boost control is poor, or the drive cycle is unsuitable.",
          "A thermostat stuck open can quietly prevent regeneration by keeping operating temperature too low. A boost leak or injector issue can create excess soot faster than normal regeneration can remove it.",
        ],
      },
      {
        heading: "Forced regeneration is not always safe",
        body: [
          "A service regeneration creates very high exhaust temperatures. It should be performed only when service information allows it, the oil level and fault state are safe, the vehicle is outside or properly ventilated, and there are no exhaust leaks or combustible materials nearby.",
          "If soot load is above the manufacturer's safe limit, forced regeneration may be refused or unsafe. The filter may need professional cleaning, replacement, or further fault repair first.",
        ],
      },
      {
        heading: "Stay legal: diagnose and restore, do not defeat",
        body: [
          "Removing a DPF, disabling EGR, deleting emissions monitors, or modifying software to hide faults can be illegal and unsafe depending on location. A legitimate diagnostic path repairs the cause, restores correct operation, and keeps factory emissions systems functional.",
          "It is reasonable to analyze codes, pressure readings, temperature readings, wiring, sensors, hoses, leaks, and service history. It is not reasonable to provide bypass or defeat instructions.",
        ],
      },
    ],
    checklist: [
      "Record every engine and emissions code before clearing.",
      "Capture soot load, ash load, differential pressure, temperature sensors, and regeneration history.",
      "Check pressure sensor hoses for cracks, blockage, melting, or incorrect routing.",
      "Verify coolant reaches operating temperature.",
      "Compare boost requested versus actual under safe test conditions.",
      "Check injector correction values and smoke symptoms if soot returns quickly.",
      "Do not perform forced regeneration above safe soot limits.",
    ],
    faqs: [
      {
        question: "Can I just clear the DPF code?",
        answer:
          "Clearing the code does not remove soot or fix the reason regeneration failed. The warning will usually return unless the underlying condition is corrected.",
      },
      {
        question: "Is DPF removal a repair?",
        answer:
          "No. It may be illegal and can create inspection, resale, environmental, and safety problems. Diagnostics should focus on restoring the system to proper operation.",
      },
    ],
  },
];

export function getDiagnosticGuide(slug: string): DiagnosticGuide | undefined {
  return diagnosticGuides.find((guide) => guide.slug === slug);
}
