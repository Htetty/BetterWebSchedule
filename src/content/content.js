console.log("Hello from content.js");

const DARK_STYLE_ID = "custom-darkmode-style";
const LIGHT_STYLE_ID = "custom-lightmode-style";
const DARK_CSS_PATH = chrome.runtime.getURL("src/styles/darkmode.css");
const LIGHT_CSS_PATH = chrome.runtime.getURL("src/styles/lightmode.css");

function setDarkMode(enabled) {
  const darkStyle = document.getElementById(DARK_STYLE_ID);
  const lightStyle = document.getElementById(LIGHT_STYLE_ID);

  if (enabled) {
    if (!darkStyle) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = DARK_CSS_PATH;
      link.id = DARK_STYLE_ID;
      document.head.appendChild(link);
    }
    if (lightStyle) lightStyle.remove();
  } else {
    if (!lightStyle) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = LIGHT_CSS_PATH;
      link.id = LIGHT_STYLE_ID;
      document.head.appendChild(link);
    }
    if (darkStyle) darkStyle.remove();
  }
}

chrome.storage.sync.get("darkMode", (data) => {
  setDarkMode(data.darkMode === true);
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "enable-dark") {
    setDarkMode(true);
  } else if (message.action === "disable-dark") {
    setDarkMode(false);
  } else if (message.action === "enable-color-blocks") {
    setTimeout(colorDaysByTime, 100);
    scheduleObserver.observe(document.body, { childList: true, subtree: true });
  } else if (message.action === "disable-color-blocks") {
    scheduleObserver.disconnect();
    document.querySelectorAll("li.ui-state-default.ui-state-highlight").forEach(day => {
      day.style.backgroundColor = "";
      day.style.color = "";
    });
  }
});

Promise.all([
  fetch(chrome.runtime.getURL("ScrapedData/all_professors_Skyline.json")).then(res => res.json()),
  fetch(chrome.runtime.getURL("ScrapedData/all_professors_CSM.json")).then(res => res.json()),
  fetch(chrome.runtime.getURL("ScrapedData/all_professors_Canada.json")).then(res => res.json())
])
.then(([skyline, csm, canada]) => {
  const professors = [...skyline, ...csm, ...canada];
  console.log(`Loaded combined RMP data: ${professors.length} professors`);

  let lastNameSeen = "";

  const observer = new MutationObserver(() => {
    const profileCard = document.querySelector(".profileCard");
    if (!profileCard) return;

    const nameElem = profileCard.querySelector(".facultyName");
    if (!nameElem) return;

    const fullName = nameElem.textContent.trim();
    if (fullName === lastNameSeen) return;
    lastNameSeen = fullName;

    const oldCard = profileCard.querySelector(".rmpCard");
    if (oldCard) oldCard.remove();

    const nameParts = fullName.split(" ").filter(n => /^[A-Za-z]+$/.test(n));
    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1];
    const normalized = `${firstName} ${lastName}`;

    const prof = professors.find(p =>
      p.firstName.toLowerCase() === firstName.toLowerCase() &&
      p.lastName.toLowerCase() === lastName.toLowerCase()
    );

    const infoBox = profileCard.querySelector(".info");
    const card = document.createElement("div");
    card.className = "rmpCard";

    if (prof) {
      console.log(`Match found for ${normalized}`);

      const deptLine = document.createElement("div");
      deptLine.textContent = prof.department;
      deptLine.className = "injectedDept";
      deptLine.style.cssText = "font-size: 12px; color: #666; margin-top: 4px;";
      nameElem.insertAdjacentElement("afterend", deptLine);

      const ratingEmoji = prof.avgRating >= 3.0 ? "😁" : prof.avgRating >= 2.0 ? "😅" : "😰";
      const difficultyEmoji = prof.avgDifficulty >= 3.0 ? "🤕" : "😌";
      const wouldTakeColor = prof.wouldTakeAgainPercent >= 50 ? "green" : "red";
      
      const isDarkMode = document.getElementById(DARK_STYLE_ID) !== null;
      const borderColor = isDarkMode ? "#333" : "#ccc";

      card.innerHTML = `
      <div style="
        font-family: 'Segoe UI', sans-serif;
        font-size: 13px;
        padding: 10px 14px;
        margin-top: 8px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        border: 1px solid ${borderColor};
        color: #e0e0e0;
      ">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="font-size: 14px;">${ratingEmoji}</span>
          <span><strong>${prof.avgRating}</strong> / 5 (${prof.numRatings} ratings)</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="font-size: 14px;">${difficultyEmoji}</span>
          <span>Difficulty: <strong>${prof.avgDifficulty}</strong></span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="font-size: 14px;">👍</span>
          <span style="color: ${wouldTakeColor};">Would take again: <strong>${prof.wouldTakeAgainPercent}%</strong></span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="font-size: 14px;">🔗</span>
          <a href="${prof.profileUrl}" target="_blank" style="
            color: #0073e6;
            text-decoration: none;
            font-weight: bold;
          ">View on Rate My Professor</a>
        </div>
        <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #aaa;">
          <span style="font-size: 14px;">📅</span>
          <span>Data Last Updated: 04/01/2025</span>
        </div>
      </div>
    `;


    } else {
      console.log(`Match not found for ${normalized}`);
      card.innerHTML = `
        <div style="
          font-family: 'Segoe UI', sans-serif;
          font-size: 13px;
          padding: 10px 14px;
          border-top: 1px solid #ccc;
          margin-top: 8px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          color: #000;
        ">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 14px;">🧐</span>
            <span><strong>This professor was not found in existing data for this school.</strong></span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px; margin-top: 6px;">
            <span style="font-size: 14px;">🔍</span>
            <a href="https://www.google.com/search?q=${encodeURIComponent(fullName + ' rate my professor')}" 
              target="_blank" 
              style="color: #0073e6; text-decoration: none; font-weight: bold;">
            Search for ${fullName} on Rate My Professor
            </a>
        </div>
      `;
    }

    if (infoBox) infoBox.appendChild(card);
  });

  observer.observe(document.body, { childList: true, subtree: true });
})
.catch(err => {
  console.error("Failed to load RMP data:", err);
});

function parseTime(str) {
  const [time, period] = str.split(" ");
  let [hours, minutes] = time.split(":").map(Number);
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return hours + minutes / 60;
}

function colorDaysByTime() {
  const dayBlocks = document.querySelectorAll("li.ui-state-default.ui-state-highlight");

  dayBlocks.forEach(day => {
    const container = day.closest("tr, div");
    const text = container?.innerText || "";
    const timeMatches = text.match(/(\d{1,2}:\d{2} [AP]M)/g);
    if (!timeMatches || timeMatches.length < 2) return;

    const endTime = parseTime(timeMatches[1]);

    let color = "#f4ae61"; //morning
    if (endTime >= 12 && endTime < 17) {
      color = "#8ec8ea"; //afternoon
    } else if (endTime >= 17) {
      color = "#328ee9"; //evening
    }

    day.style.backgroundColor = color;
    day.style.color = "#000";
  });
}

chrome.storage.sync.get("colorBlocks", (data) => {
  if (data.colorBlocks) {
    setTimeout(colorDaysByTime, 1000);
    scheduleObserver.observe(document.body, { childList: true, subtree: true });
  }
});

const scheduleObserver = new MutationObserver(() => {
  colorDaysByTime();
});