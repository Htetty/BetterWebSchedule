console.log("Hello from content.js");

const DARK_STYLE_ID = "custom-darkmode-style";
const LIGHT_STYLE_ID = "custom-lightmode-style";
const DARK_CSS_PATH = chrome.runtime.getURL("darkmode.css");
const LIGHT_CSS_PATH = chrome.runtime.getURL("lightmode.css");

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
  }
});

Promise.all([
  fetch(chrome.runtime.getURL("all_professors_Skyline.json")).then(res => res.json()),
  fetch(chrome.runtime.getURL("all_professors_CSM.json")).then(res => res.json()),
  fetch(chrome.runtime.getURL("all_professors_Canada.json")).then(res => res.json())
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
      deptLine.style.cssText = `font-size: 12px; color: #666; margin-top: 4px;`;
      nameElem.insertAdjacentElement("afterend", deptLine);

      const ratingEmoji = prof.avgRating >= 3.0 ? "😁" : prof.avgRating >= 2.0 ? "😅" : "😰";
      const difficultyEmoji = prof.avgDifficulty >= 3.0 ? "🤕" : "😌";
      const wouldTakeColor = prof.wouldTakeAgainPercent >= 50 ? "green" : "red";

      card.innerHTML = `
        <div style="
          font-family: 'Segoe UI', sans-serif;
          font-size: 13px;
          padding: 10px 14px;
          margin-top: 8px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          color: #000000;
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
          <div style="margin-top: 4px;">
            <a href="${prof.profileUrl}" target="_blank" style="
              color: #0073e6;
              text-decoration: none;
              font-weight: bold;
            ">🔗 View on Rate My Professor</a>
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
          color: #000000;
        ">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 14px;">🧐</span>
            <span><strong>This professor was not found in existing data for this school.</strong></span>
          </div>
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