/* Official AAUB Avionics Batch 04, Semester 05 routine (Jul-Dec 2026).
   Coordinator contact details are intentionally excluded from this public app. */
window.ROUTINE_DATA = {
  semester: {
    title: "BSc in Avionics Engineering · Batch 04 · Semester 05",
    start: "2026-08-09",
    end: "2026-11-19",
    timezone: "Asia/Dhaka"
  },
  courses: {
    "AVE 4501": { name: "Signals and Systems", type: "theory", teacher: "Asst. Prof. Md. Samin Rahman", room: "CL-304", color: "#5b8cff" },
    "AVE 4502": { name: "Signals and Systems Sessional", type: "sessional", teacher: "Asst. Prof. Md. Samin Rahman / BAF 2", room: "Computer Lab", color: "#37d6a2" },
    "AVE 4503": { name: "Microprocessor and Microcontroller Systems", type: "theory", teacher: "Lecturer Parvaj Rana / Lecturer 2", room: "CL-304", color: "#a879ff" },
    "AVE 4504": { name: "Microprocessor and Microcontroller Systems Sessional", type: "sessional", teacher: "Lecturer Parvaj Rana / Lecturer 2", room: "Microprocessor Lab", color: "#ef73b5" },
    "AVE 4505": { name: "Electromagnetic Field Theory", type: "theory", teacher: "Asst. Prof. Md. Masud Parvez", room: "CL-304", color: "#ffb34d" },
    "AVE 4510": { name: "Modelling & Simulation Sessional", type: "sessional", teacher: "Asst. Prof. Md. Samin Rahman / Lecturer 2", room: "Computer Lab", color: "#28c8df" },
    "ASE 4513": { name: "Aerodynamics", type: "theory", teacher: "Flt Lt Anik", room: "CL-304", color: "#ff6878" },
    "ASE 4514": { name: "Aerodynamics Sessional", type: "sessional", teacher: "Flt Lt Anik / Lecturer Mushfiq", room: "Aerodynamics Lab", color: "#49c17f" },
    "MAT 4509": { name: "Probability & Statistics", type: "theory", teacher: "Assoc. Prof. Dr. Md. Siddikur Rahman", room: "CL-304", color: "#e8cf55" }
  },
  weekly: {
    0: [
      { code: "AVE 4501", start: "10:00", end: "11:55" },
      { code: "AVE 4502", start: "12:30", end: "15:25" }
    ],
    1: [
      { code: "AVE 4503", start: "10:00", end: "11:55" },
      { code: "AVE 4510", start: "12:30", end: "15:25" }
    ],
    2: [
      { code: "MAT 4509", start: "09:00", end: "10:55" },
      { code: "AVE 4505", start: "11:00", end: "11:55" },
      { code: "ASE 4513", start: "12:30", end: "14:25" }
    ],
    3: [
      { code: "AVE 4505", start: "09:00", end: "10:55" },
      { code: "AVE 4501", start: "11:00", end: "11:55" }
    ],
    4: [
      { code: "AVE 4503", start: "09:00", end: "09:55" },
      { code: "ASE 4513", start: "10:00", end: "10:55" },
      { code: "MAT 4509", start: "11:00", end: "11:55" },
      { code: "ASE 4514", start: "12:30", end: "15:25" }
    ]
  },
  wednesdayLabs: ["2026-08-19", "2026-09-02", "2026-09-16", "2026-10-07", "2026-10-21", "2026-11-04", "2026-11-18"],
  holidays: {
    "2026-08-12": "Akheri Chahar Somba",
    "2026-08-26": "Eid-e-Miladunnabi",
    "2026-09-24": "Fateha-e-Yazdaham",
    "2026-11-08": "Shyama Puja"
  },
  notes: {
    "2026-10-29": "NAGC 2026 - no afternoon sessional"
  },
  overrides: {
    "2026-09-27": [
      { code: "AVE 4505", start: "09:00", end: "10:55", note: "Adjustment class for 12 Aug" },
      { code: "AVE 4501", start: "11:00", end: "11:55", note: "Adjustment class for 12 Aug" }
    ],
    "2026-09-28": [
      { code: "AVE 4505", start: "09:00", end: "10:55", note: "Adjustment class for 26 Aug" },
      { code: "AVE 4501", start: "11:00", end: "11:55", note: "Adjustment class for 26 Aug" }
    ],
    "2026-09-29": [
      { code: "AVE 4503", start: "09:00", end: "09:55", note: "Adjustment class for 24 Sep" },
      { code: "ASE 4513", start: "10:00", end: "10:55", note: "Adjustment class for 24 Sep" },
      { code: "MAT 4509", start: "11:00", end: "11:55", note: "Adjustment class for 24 Sep" },
      { code: "ASE 4514", start: "12:30", end: "15:25", note: "Adjustment lab for 24 Sep" }
    ],
    "2026-09-30": [
      { code: "AVE 4501", start: "10:00", end: "11:55", note: "Adjustment class" },
      { code: "AVE 4502", start: "12:30", end: "15:25", note: "Adjustment sessional for 8 Nov" }
    ],
    "2026-10-01": [
      { code: "ASE 4514", start: "12:30", end: "15:25", note: "Adjustment sessional" }
    ],
    "2026-10-29": [
      { code: "AVE 4503", start: "09:00", end: "09:55" },
      { code: "ASE 4513", start: "10:00", end: "10:55" },
      { code: "MAT 4509", start: "11:00", end: "11:55" }
    ]
  },
  assessments: [
    { id: "ct1-4501", type: "CT-01", code: "AVE 4501", date: "2026-08-30", time: "10:00" },
    { id: "ct1-4509", type: "CT-01", code: "MAT 4509", date: "2026-09-01", time: "09:00" },
    { id: "ct1-4503", type: "CT-01", code: "AVE 4503", date: "2026-09-03", time: "09:00" },
    { id: "ct1-4513", type: "CT-01", code: "ASE 4513", date: "2026-09-07", time: "09:00" },
    { id: "ct1-4505", type: "CT-01", code: "AVE 4505", date: "2026-09-09", time: "09:00" },
    { id: "mid-4501", type: "MID", code: "AVE 4501", date: "2026-10-04", time: "10:00" },
    { id: "mid-4509", type: "MID", code: "MAT 4509", date: "2026-10-06", time: "09:00" },
    { id: "mid-4503", type: "MID", code: "AVE 4503", date: "2026-10-08", time: "09:00" },
    { id: "mid-4513", type: "MID", code: "ASE 4513", date: "2026-10-12", time: "09:00" },
    { id: "mid-4505", type: "MID", code: "AVE 4505", date: "2026-10-14", time: "09:00" },
    { id: "ct2-4501", type: "CT-02", code: "AVE 4501", date: "2026-10-25", time: "10:00" },
    { id: "ct2-4509", type: "CT-02", code: "MAT 4509", date: "2026-10-27", time: "09:00" },
    { id: "ct2-4503", type: "CT-02", code: "AVE 4503", date: "2026-10-29", time: "09:00" },
    { id: "ct2-4513", type: "CT-02", code: "ASE 4513", date: "2026-11-02", time: "09:00" },
    { id: "ct2-4505", type: "CT-02", code: "AVE 4505", date: "2026-11-04", time: "09:00" },
    { id: "ct3-4509", type: "CT-03", code: "MAT 4509", date: "2026-11-10", time: "09:00" },
    { id: "ct3-4503", type: "CT-03", code: "AVE 4503", date: "2026-11-12", time: "09:00" },
    { id: "ct3-4501", type: "CT-03", code: "AVE 4501", date: "2026-11-15", time: "10:00" },
    { id: "ct3-4513", type: "CT-03", code: "ASE 4513", date: "2026-11-16", time: "09:00" },
    { id: "ct3-4505", type: "CT-03", code: "AVE 4505", date: "2026-11-18", time: "09:00" }
  ]
};
