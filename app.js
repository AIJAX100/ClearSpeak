const fillerPhrases = [
  "you know",
  "i mean",
  "sort of",
  "kind of",
  "you see",
  "at the end of the day",
  "to be honest",
  "um",
  "uh",
  "er",
  "ah",
  "eh",
  "like",
  "basically",
  "actually",
  "literally",
  "just",
  "right",
  "okay",
  "so",
  "maybe",
  "probably"
];

const sampleTranscript = `So I think today we should talk about the budget proposal. Um, the main point is that we need a clearer plan for the next quarter. Like, if we wait too long, we will lose time and probably lose trust. You know, the team has already done good work, but basically we need to explain the timeline in simpler language. I mean, the recommendation is not complicated: decide the priorities, assign the owners, and report progress every Friday.`;

const transcriptInput = document.querySelector("#transcriptInput");
const analyzeButton = document.querySelector("#analyzeButton");
const clearButton = document.querySelector("#clearButton");
const sampleButton = document.querySelector("#sampleButton");
const exportButton = document.querySelector("#exportButton");
const recordButton = document.querySelector("#recordButton");
const recordingStatus = document.querySelector("#recordingStatus");
const audioPlayback = document.querySelector("#audioPlayback");
const audioUpload = document.querySelector("#audioUpload");

let mediaRecorder;
let audioChunks = [];
let lastReport = null;
let recognition;
let recognitionBaseText = "";
let recognitionFinalText = "";

function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countOccurrences(text, phrase) {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  const matches = text.match(new RegExp(`\\b${escaped}\\b`, "gi"));
  return matches ? matches.length : 0;
}

function analyzeTranscript(text) {
  const normalized = normalizeText(text);
  const words = normalized ? normalized.split(" ").length : 0;
  const counts = fillerPhrases
    .map((phrase) => ({ phrase, count: countOccurrences(normalized, phrase) }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count || a.phrase.localeCompare(b.phrase));

  const totalFillers = counts.reduce((sum, item) => sum + item.count, 0);
  const density = words ? (totalFillers / words) * 100 : 0;
  const estimatedMinutes = Math.max(words / 145, 0.25);
  const pace = Math.round(words / estimatedMinutes);
  const score = Math.max(45, Math.min(100, Math.round(100 - density * 7 - totalFillers * 0.7)));

  return {
    text,
    words,
    counts,
    totalFillers,
    density,
    pace,
    score,
    topHabit: counts[0]?.phrase || "--"
  };
}

function buildTips(report) {
  if (!report.words) {
    return ["Add a transcript to generate coaching notes."];
  }

  const tips = [];
  if (report.topHabit !== "--") {
    tips.push(`Your most repeated habit is "${report.topHabit}". Try replacing it with a silent pause.`);
  }

  if (report.density > 6) {
    tips.push("Filler density is high. Slow down and finish one sentence before starting the next.");
  } else if (report.density > 2.5) {
    tips.push("Your filler use is moderate. Focus practice on the top two repeated words.");
  } else {
    tips.push("Filler density is low. Keep the natural pauses and tighten any repeated phrases.");
  }

  if (report.counts.some((item) => ["just", "maybe", "probably", "i mean"].includes(item.phrase))) {
    tips.push("Some phrases can weaken confidence. Use direct claims when the facts support them.");
  } else {
    tips.push("For a stronger delivery, pause before important points instead of adding verbal padding.");
  }

  return tips.slice(0, 3);
}

function highlightTranscript(text) {
  if (!text.trim()) {
    return "Your analyzed transcript will appear here with filler words highlighted.";
  }

  const escaped = fillerPhrases
    .sort((a, b) => b.length - a.length)
    .map((phrase) => phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+"))
    .join("|");

  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(new RegExp(`\\b(${escaped})\\b`, "gi"), "<mark>$1</mark>");
}

function renderReport(report) {
  lastReport = report;
  document.querySelector("#scoreValue").textContent = report.words ? report.score : "--";
  document.querySelector("#totalFillers").textContent = report.totalFillers;
  document.querySelector("#wordCount").textContent = report.words;
  document.querySelector("#paceValue").textContent = report.words ? `${report.pace} wpm` : "--";
  document.querySelector("#topHabit").textContent = report.topHabit;
  document.querySelector("#densityValue").textContent = `${report.density.toFixed(1)}% filler density`;

  const fillerList = document.querySelector("#fillerList");
  fillerList.classList.toggle("empty-state", report.counts.length === 0);
  if (report.counts.length === 0) {
    fillerList.textContent = report.words ? "No tracked filler words found." : "No transcript analyzed yet.";
  } else {
    const max = Math.max(...report.counts.map((item) => item.count));
    fillerList.innerHTML = report.counts
      .slice(0, 8)
      .map(
        (item) => `
          <div class="filler-row">
            <span>${item.phrase}</span>
            <div class="bar-track" aria-hidden="true">
              <div class="bar-fill" style="width:${(item.count / max) * 100}%"></div>
            </div>
            <strong>${item.count}</strong>
          </div>
        `
      )
      .join("");
  }

  document.querySelector("#tipsList").innerHTML = buildTips(report)
    .map((tip) => `<li>${tip}</li>`)
    .join("");
  document.querySelector("#highlightedTranscript").innerHTML = highlightTranscript(report.text);
}

function analyzeCurrentTranscript() {
  renderReport(analyzeTranscript(transcriptInput.value));
}

async function toggleRecording() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (SpeechRecognition) {
    toggleSpeechRecognition(SpeechRecognition);
    return;
  }

  if (mediaRecorder?.state === "recording") {
    mediaRecorder.stop();
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.addEventListener("dataavailable", (event) => {
      if (event.data.size) audioChunks.push(event.data);
    });
    mediaRecorder.addEventListener("stop", () => {
      const blob = new Blob(audioChunks, { type: "audio/webm" });
      audioPlayback.src = URL.createObjectURL(blob);
      audioPlayback.hidden = false;
      stream.getTracks().forEach((track) => track.stop());
      recordButton.classList.remove("recording");
      recordingStatus.textContent = "Recording saved";
      recordButton.setAttribute("aria-label", "Start recording");
    });
    mediaRecorder.start();
    recordButton.classList.add("recording");
    recordingStatus.textContent = "Recording...";
    recordButton.setAttribute("aria-label", "Stop recording");
  } catch (error) {
    recordingStatus.textContent = "Microphone unavailable";
  }
}

function toggleSpeechRecognition(SpeechRecognition) {
  if (recognition) {
    recognition.stop();
    return;
  }

  recognitionBaseText = transcriptInput.value.trim();
  recognitionFinalText = "";
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";

  recognition.addEventListener("start", () => {
    recordButton.classList.add("recording");
    recordingStatus.textContent = "Listening...";
    recordButton.setAttribute("aria-label", "Stop speech recognition");
  });

  recognition.addEventListener("result", (event) => {
    let interimText = "";

    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const transcript = event.results[index][0].transcript;
      if (event.results[index].isFinal) {
        recognitionFinalText += `${transcript} `;
      } else {
        interimText += transcript;
      }
    }

    transcriptInput.value = [recognitionBaseText, recognitionFinalText, interimText]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  });

  recognition.addEventListener("end", () => {
    recordButton.classList.remove("recording");
    recordingStatus.textContent = transcriptInput.value.trim()
      ? "Speech captured"
      : "No speech captured";
    recordButton.setAttribute("aria-label", "Start speech recognition");
    recognition = null;
    if (transcriptInput.value.trim()) {
      analyzeCurrentTranscript();
    }
  });

  recognition.addEventListener("error", (event) => {
    const message = event.error === "not-allowed"
      ? "Microphone permission blocked"
      : "Speech recognition unavailable";
    recordingStatus.textContent = message;
  });

  recognition.start();
}

function exportReport() {
  if (!lastReport) {
    analyzeCurrentTranscript();
  }

  const report = lastReport || analyzeTranscript("");
  const lines = [
    "ClearSpeak Report",
    "",
    `Score: ${report.words ? `${report.score}/100` : "No transcript"}`,
    `Words: ${report.words}`,
    `Total fillers: ${report.totalFillers}`,
    `Filler density: ${report.density.toFixed(1)}%`,
    `Estimated pace: ${report.words ? `${report.pace} wpm` : "--"}`,
    "",
    "Breakdown:",
    ...(report.counts.length ? report.counts.map((item) => `- ${item.phrase}: ${item.count}`) : ["- None"]),
    "",
    "Tips:",
    ...buildTips(report).map((tip) => `- ${tip}`),
    "",
    "Transcript:",
    report.text || ""
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "clearspeak-report.txt";
  link.click();
  URL.revokeObjectURL(url);
}

analyzeButton.addEventListener("click", analyzeCurrentTranscript);
clearButton.addEventListener("click", () => {
  transcriptInput.value = "";
  renderReport(analyzeTranscript(""));
});
sampleButton.addEventListener("click", () => {
  transcriptInput.value = sampleTranscript;
  recordingStatus.textContent = "Demo transcript loaded";
  analyzeCurrentTranscript();
});
exportButton.addEventListener("click", exportReport);
recordButton.addEventListener("click", toggleRecording);
audioUpload.addEventListener("change", () => {
  const file = audioUpload.files?.[0];
  if (!file) return;
  audioPlayback.src = URL.createObjectURL(file);
  audioPlayback.hidden = false;
  recordingStatus.textContent = "Audio uploaded";
});

renderReport(analyzeTranscript(""));
