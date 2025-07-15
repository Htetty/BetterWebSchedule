document.addEventListener('DOMContentLoaded', () => {
  // === UI ELEMENTS ===
  const settingsBtn = document.getElementById("settingsBtn");
  const modal = document.getElementById("settingsIcon");
  const closeBtn = document.getElementById("closeSettings");
  const toggle = document.getElementById("darkToggle");
  const colorToggle = document.getElementById("colorBlockToggle");
  const icsButton = document.getElementById("calendarBtn");
  const statusEl = document.getElementById("webschedule");
  const webScheduleBtn = document.getElementById("webschedule");
  const chatForm = document.getElementById("chatForm");
  const chatInput = document.getElementById("chatInput");
  const chatBox = document.getElementById("chatBox");
  const mapBtn = document.getElementById("mapBtn");
  const fullscreenMap = document.getElementById("fullscreenMap");
  const closeMapBtn = document.getElementById("closeMapBtn");
  const mapIframe = document.getElementById("map");
  const refreshButton = document.getElementById("refreshButton");

  let selectedMode = null;
  let articulationStep = null;

  // for major help mode
  let storedCurrentSchoolForMajorHelp = "";

  // for articulation mode
  let storedTransferSchool = "";
  let storedCurrentSchool = "";
  let storedMajor = "";

  //for schedule building mode
  let storedTransferSchoolForSchedule = "";
  let storedCurrentSchoolForSchedule = "";
  let storedMajorForSchedule = "";
  let storedStartSemester = "";
  let storedEndSemester = "";
  let parsedTranscript = null;
  let transcriptUploaded = false;
  let transcriptSkipped = false;

  const originalStatusText = statusEl?.textContent || 'Status';
  const originalStatusStyle = statusEl?.style.cssText || '';
  const ALLOWED_URL = "https://phx-ban-apps.smccd.edu/StudentRegistrationSsb/ssb/classRegistration/classRegistration";

  /*const greeting = document.createElement("div");
  greeting.className = "welcome-screen";
  greeting.id = "welcome-screen";
  greeting.innerHTML = `
    <h1>Hi! How can we help?</h1>
  `;

  chatBox.prepend(greeting);*/

  const starterMessage = document.createElement("div");
  starterMessage.className = "bot-message";

  starterMessage.innerHTML = `
    <div class="assistant-header">
      <img src="popupicon/logo.png" class="assistant-avatar" alt="Assistant Icon" />
      <span class="assistant-name">BetterWebSchedule AI</span>
    </div>
    <div class="assistant-text">
      Welcome to BetterWebSchedule's help assistant!
    </div>
  `;
  chatBox.appendChild(starterMessage);

  const buttonWrapper = document.createElement("div");
  buttonWrapper.className = "mode-button-wrapper";

  const starterButton = document.createElement("button");
  starterButton.className = "mode-btn";
  starterButton.textContent = "ASSIST Articulation Questions";
  starterButton.dataset.mode = "articulation";
  buttonWrapper.appendChild(starterButton);

  const starterButton2 = document.createElement("button");
  starterButton2.className = "mode-btn";
  starterButton2.textContent = "Professor Questions";
  starterButton2.dataset.mode = "professor";
  buttonWrapper.appendChild(starterButton2);

  const starterButton4 = document.createElement("button");
  starterButton4.className = "mode-btn";
  starterButton4.textContent = "Schedule Builder";
  starterButton4.dataset.mode = "schedule";
  buttonWrapper.appendChild(starterButton4);

  const starterButton3 = document.createElement("button");
  starterButton3.className = "mode-btn";
  starterButton3.textContent = "Major Help";
  starterButton3.dataset.mode = "major";
  buttonWrapper.appendChild(starterButton3);

  chatBox.appendChild(buttonWrapper);

  const modeButtons = document.querySelectorAll(".mode-btn");

  /*
    < class="chat-container" id="chatSection">
      <div class="chat-header">How can we help?</div>
      <div class="mode-buttons">
        <button class="mode-btn" data-mode="articulation">Articulation Questions</button>
        <button class="mode-btn" data-mode="professor">Professor Questions</button>
      </div>
  */

  // === SETTINGS MODAL ===
  settingsBtn?.addEventListener("click", () => modal?.classList.remove("hidden"));
  closeBtn?.addEventListener("click", () => modal?.classList.add("hidden"));

  // === MAP BUTTON ===
  mapBtn.addEventListener("click", () => {
    mapIframe.src = chrome.runtime.getURL("src/popup/mapbox/mapbox.html");
    fullscreenMap.classList.remove("hidden");
  });
  
  closeMapBtn.addEventListener("click", () => {
    fullscreenMap.classList.add("hidden");
    mapIframe.src = ""; 
  });
  

  // === DARK MODE TOGGLE ===
  chrome.storage.sync.get("darkMode", (data) => {
    if (toggle) toggle.checked = data.darkMode === true;
  });

  toggle?.addEventListener("change", () => {
    const enabled = toggle.checked;
    chrome.storage.sync.set({ darkMode: enabled });
    withCurrentTab((tab) => {
      chrome.tabs.sendMessage(tab.id, {
        action: enabled ? "enable-dark" : "disable-dark"
      });
    });
  });

  // === COLOR BLOCKS TOGGLE ===
  chrome.storage.sync.get("colorBlocks", (data) => {
    if (colorToggle) colorToggle.checked = data.colorBlocks === true;
  });

  colorToggle?.addEventListener("change", () => {
    const enabled = colorToggle.checked;
    chrome.storage.sync.set({ colorBlocks: enabled });
    withCurrentTab((tab) => {
      chrome.tabs.sendMessage(tab.id, {
        action: enabled ? "enable-color-blocks" : "disable-color-blocks"
      });
    });
  });

  // === ICS EXPORT ===
  if (icsButton) {
    icsButton.addEventListener('click', () => {
      icsButton.disabled = true;
      withCurrentTab((tab) => {
        runScriptIfAllowed([tab], () => {
          const detailsTab = document.querySelector('a#scheduleDetailsViewLink');
          if (detailsTab) detailsTab.click();

          setTimeout(() => {
            if (typeof downloadScheduleICS === 'function') {
              downloadScheduleICS();
              chrome.runtime.sendMessage({ action: 'icsExported' });
            } else {
              console.error('downloadScheduleICS not found on page');
            }
          }, 1000);
        });
      });

      setTimeout(() => {
        icsButton.disabled = false;
      }, 3000);
    });
  }

  // === OPEN WEB SCHEDULE ===

  if (webScheduleBtn) {
    webScheduleBtn.addEventListener("click", () => {
      window.open("https://phx-ban-apps.smccd.edu/StudentRegistrationSsb/ssb/registration", "_blank");
    });
  }

  document.getElementById('collapseToggle').addEventListener('click', function () {
    const section = document.getElementById('collapsibleSection');
    const isCollapsed = section.classList.toggle('collapsed');
    this.classList.toggle('rotate', isCollapsed);
    if (isCollapsed) {
      settingsBtn.disabled = true;
      settingsBtn.style.pointerEvents = 'none';
      mapBtn.disabled = true;
      mapBtn.style.pointerEvents = 'none';
      calendarBtn.disabled = true;
      calendarBtn.style.pointerEvents = 'none';
    } else {
      settingsBtn.disabled = false;
      settingsBtn.style.pointerEvents = 'auto';
      mapBtn.disabled = false;
      mapBtn.style.pointerEvents = 'auto';
      calendarBtn.disabled = false;
      calendarBtn.style.pointerEvents = 'auto';
    }
  });

  // === CONFIRM EXPORT MESSAGE ===
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'icsExported') {
      if (statusEl) {
        statusEl.textContent = 'Schedule Exported!';
        setTimeout(() => {
          statusEl.textContent = originalStatusText;
          statusEl.style.cssText = originalStatusStyle;
        }, 3000);
      }
    }
  });

  const selectStyle = {
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid #ccc",
    fontSize: "15px",
    margin: "0",
    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.05)",
    backgroundColor: "#fff",
    color: "#333",
    cursor: "pointer"
  };
  
  
  const scrollChatToBottom = () => {
    chatBox.scrollTop = chatBox.scrollHeight;
  };
  
  if (chatInput) {
    chatInput.addEventListener("input", () => {
      chatInput.style.height = "auto";
      chatInput.style.height = chatInput.scrollHeight + "px";
    });
  }

  let char = document.getElementById('char');

  chatInput.addEventListener('input', function () {

    let content = this.value;
    char.textContent = content.length;

    content.trim();
});

  const createMessage = (text, className) => {
    const msg = document.createElement("div");
    msg.className = className;

    if (className === "bot-message") {
      msg.innerHTML = `
        <div class="assistant-header">
          <img src="popupicon/logo.png" class="assistant-avatar" alt="Assistant Icon" />
          <span class="assistant-name">BetterWebSchedule AI</span>
        </div>
        <div class="assistant-text">${text}</div>
      `;
    } else {
      msg.textContent = text;
    }

    chatBox.appendChild(msg);
    scrollChatToBottom();
    return msg;
  };
  
  const createSelect = (optionsArray, defaultText, onChangeCallback) => {
    const select = document.createElement("select");
    Object.assign(select.style, selectStyle);
  
    const defaultOption = document.createElement("option");
    defaultOption.disabled = true;
    defaultOption.selected = true;
    defaultOption.textContent = defaultText;
    select.appendChild(defaultOption);
  
    optionsArray.forEach(optionText => {
      const option = document.createElement("option");
      option.value = optionText;
      option.textContent = optionText;
      select.appendChild(option);
    });
  
    chatBox.appendChild(select);
    scrollChatToBottom();
  
    select.addEventListener("change", () => {
      createMessage(select.value, "user-message");
      select.remove();
      onChangeCallback(select.value);
    });
  
    return select;
  };
  
  document.getElementById("chatInput").addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      document.getElementById("sendButton").click(); 
      chatInput.style.height = "60px";
    }
  });

  modeButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      modeButtons.forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      selectedMode = btn.dataset.mode;
  
      document.getElementById("welcome-screen")?.remove();
      starterButton?.remove();
      starterButton2?.remove();
      starterButton3?.remove();
      starterButton4?.remove();
  
      createMessage(btn.textContent, "user-message");
  
      if (selectedMode === "professor") {
        createMessage("Got it! I can help you with professor questions. What would you like to ask?", "bot-message");
        chatInput.readOnly = false;
        chatInput.placeholder = "Ask something like 'Who is the best for Math at Skyline?'";
      }

      if (selectedMode === "major") {
        createMessage("Got it! I can help you with picking your major. What school are you planning to attend?", "bot-message");
        chatInput.readOnly = false;
      
        createSelect(
          ["Skyline College", "College of San Mateo", "Canada College"],
          "Select your school",
          selectedSchoolForMajor => {
            storedCurrentSchoolForMajorHelp = selectedSchoolForMajor;
      
            createMessage("Great! How can I help?", "bot-message");
            chatInput.placeholder = "Ask something like 'Can you help me pick a major?'";
          }
        );
      }  
      
      function handleTranscriptUploadPrompt() {
        createMessage("Would you like to upload your transcript?", "bot-message");
      
        createSelect(["Yes", "No"], "Please pick a response", userChoice => {
          if (userChoice === "Yes") {
            createMessage("Please upload your transcript.", "bot-message");
            
            const fileInput = document.createElement("input");
            fileInput.type = "file";
            fileInput.accept = "application/pdf";
            fileInput.style.display = "none";
            fileInput.id = "transcriptUploadInput";
            document.body.appendChild(fileInput);

            const uploadBtn = document.createElement("button");
            uploadBtn.textContent = "Choose PDF File";
            uploadBtn.className = "upload-button";
            chatBox.appendChild(uploadBtn);
            scrollChatToBottom();
            
            uploadBtn.addEventListener("click", () => {
              fileInput.click();
            });

            fileInput.addEventListener("change", event => {
              const file = event.target.files[0];
              if (file && file.type === "application/pdf") {
                if (file.size > 1 * 1024 * 1024) {
                  alert("File is too large. Please upload a PDF under 1 MB.");
                  return;
                }
                createMessage(`Selected: ${file.name}`, "user-message");
                
                const formData = new FormData();
                formData.append("file", file);
            
                createMessage("Uploading transcript...", "bot-message");
                chatInput.readOnly = true;

                fetch("http://127.0.0.1:8080/upload-transcript", {
                  method: "POST",
                  body: formData,
                })
                  .then(res => res.json())
                  .then(data => {
                    if (data.success) {
                      transcriptUploaded = true;
                      createMessage("Transcript uploaded and parsed successfully.", "bot-message");
                      parsedTranscript = data.parsedTranscript;

                      //localStorage.setItem("parsedTranscript", JSON.stringify(data.parsedTranscript));

                      handleSemesterSelection();
                    } else {
                      createMessage("Upload failed: " + (data.error || "Unknown error"), "bot-message");
                    }
                  })
                  .catch(err => {
                    createMessage("Something went wrong while uploading.", "bot-message");
                    console.error(err);
                  });
            
              } else {
                alert("Please upload a valid PDF.");
              }
            });

          } else {
            transcriptSkipped = true;
            handleSemesterSelection();  
          }
        });
      }
      
      function handleSemesterSelection() {
        createMessage("What is your starting semester?", "bot-message");
      
        createSelect([
          "Fall 2023", "Spring 2024", "Summer 2024", "Fall 2024"
        ], "Select starting semester", selectedSemester => {
          storedStartSemester = selectedSemester;
      
          createMessage("What is your ending semester?", "bot-message");
      
          createSelect([
            "Fall 2024", "Spring 2025", "Summer 2025", "Fall 2025", "Spring 2026"
          ], "Select ending semester", selectedEndSemester => {
            storedEndSemester = selectedEndSemester;
            chatInput.readOnly = false;
            
            createMessage(
              `Here's what you've selected:<br>
              - Transfer school: ${storedTransferSchoolForSchedule || "Not specified"}<br>
              - Current school: ${storedCurrentSchoolForSchedule || "Not specified"}<br>
              - Major: ${storedMajorForSchedule?.replace(/_/g, " ") || "Undeclared"}<br>
              - Transcript uploaded: ${transcriptUploaded ? "Yes" : transcriptSkipped ? "No" : "Unknown"}<br>
              - Starting semester: ${storedStartSemester}<br>
              - Ending semester: ${storedEndSemester}`,
              "bot-message",
              true
            );
      
            createMessage("Awesome! You're ready to start asking questions about your schedule.", "bot-message")
            
            chatInput.placeholder = "Ask something like 'Create a schedule for me.'";
          });
        });
      }

      function handleSchoolAndMajorSelection() {
        createMessage("Great! What school are you trying to transfer to?", "bot-message");
      
        createSelect([
          "UC Berkeley", "UC Davis", "UC Irvine", "UC Los Angeles", 
          "UC San Diego", "UC Santa Barbara", "UC Santa Cruz"
        ], "Select target school", selectedUC => {
          storedTransferSchoolForSchedule = selectedUC;
      
          createMessage("What school are you from?", "bot-message");
      
          createSelect([
            "Skyline College", "College of San Mateo", "Canada College"
          ], "Select your school", selectedSchool => {
            storedCurrentSchoolForSchedule = selectedSchool;
      
            createMessage("What is your major of transfer?", "bot-message");
      
            const majorsJsonPath = chrome.runtime.getURL(
              `TransferData/${storedCurrentSchoolForSchedule}/${storedTransferSchoolForSchedule}/majors.json`
            );
      
            const majorSelect = document.createElement("select");
            Object.assign(majorSelect.style, selectStyle);
      
            const majorDefault = document.createElement("option");
            majorDefault.disabled = true;
            majorDefault.selected = true;
            majorDefault.textContent = "Select your major";
            majorSelect.appendChild(majorDefault);
            chatBox.appendChild(majorSelect);
            scrollChatToBottom();
      
            fetch(majorsJsonPath)
              .then(res => {
                if (!res.ok) throw new Error("Failed to load majors.json");
                return res.json();
              })
              .then(majors => {
                majors.forEach(major => {
                  const option = document.createElement("option");
                  option.value = major;
                  option.textContent = major
                    .replace(/_/g, " ")
                    .replace(/,/g, ", ")
                    .replace(/\s+/g, " ")
                    .replace(/\ba\.b\.\b/g, "A.B.")
                    .replace(/\bb\.a\.\b/g, "B.A.")
                    .replace(/\bb\.s\.\b/g, "B.S.")
                    .replace(/\bb\.e\.\b/g, "B.E.")
                    .replace(/\bb\.f\.a\.\b/g, "B.F.A.")
                    .replace(/\bb\.m\.\b/g, "B.M.");
      
                  majorSelect.appendChild(option);
                });
              })
              .catch(err => {
                console.error("Error loading majors:", err);
                const errorOption = document.createElement("option");
                errorOption.disabled = true;
                errorOption.textContent = "Error loading majors";
                majorSelect.appendChild(errorOption);
              });
      
            majorSelect.addEventListener("change", () => {
              storedMajorForSchedule = majorSelect.value;
              createMessage(majorSelect.options[majorSelect.selectedIndex].text, "user-message");
              majorSelect.remove();
      
              const articulationPath = chrome.runtime.getURL(
                `TransferData/${storedCurrentSchoolForSchedule}/${storedTransferSchoolForSchedule}/majors.json`
              );
      
              fetch(articulationPath)
                .then(res => {
                  if (!res.ok) throw new Error("Articulation file not found.");
                  return res.json();
                })
                .then(data => {
                  console.log("Articulation Data:", data);
                })
                .catch(err => {
                  console.error("Error loading articulation:", err);
                });

              handleTranscriptUploadPrompt();
            });
          });
        });
      }
    
      if (selectedMode === "schedule") {
        chatInput.placeholder = "Please answer the questions above!";
        chatInput.readOnly = true;
      
        createMessage("Are you planning to transfer to UC/CSU?", "bot-message");
      
        createSelect(["Yes", "No"], "Please pick a response", userChoice => {
          if (userChoice === "Yes") {
            handleSchoolAndMajorSelection();
          } else {
            handleTranscriptUploadPrompt();
          }
        });
      }


      if (selectedMode === "articulation") {
        chatInput.readOnly = true;
        chatInput.placeholder = "";
  
        createMessage("What school are you trying to transfer to?", "bot-message");
  
        createSelect([
          "UC Berkeley", "UC Davis", "UC Irvine", "UC Los Angeles", "UC San Diego", "UC Santa Barbara", "UC Santa Cruz"], 
          "Select target school", selectedUC => {
          storedTransferSchool = selectedUC;
  
          createMessage("What school are you from?", "bot-message");
  
          createSelect([
            "Skyline College", "College of San Mateo", "Canada College"
          ], "Select your school", selectedSchool => {
            storedCurrentSchool = selectedSchool;
  
            createMessage("What is your major of transfer?", "bot-message");
  
            const majorsJsonPath = chrome.runtime.getURL(
              `TransferData/${storedCurrentSchool}/${storedTransferSchool}/majors.json`
            );
  
            const majorSelect = document.createElement("select");
            Object.assign(majorSelect.style, selectStyle);
  
            const majorDefault = document.createElement("option");
            majorDefault.disabled = true;
            majorDefault.selected = true;
            majorDefault.textContent = "Select your major";
            majorSelect.appendChild(majorDefault);
            chatBox.appendChild(majorSelect);
            scrollChatToBottom();
  
            fetch(majorsJsonPath)
              .then(res => {
                if (!res.ok) throw new Error("Failed to load majors.json");
                return res.json();
              })
              .then(majors => {
                majors.forEach(major => {
                  const option = document.createElement("option");
                  option.value = major;
  
                  let formattedMajor = major
                    .replace(/_/g, " ")
                    .replace(/,/g, ", ")
                    .replace(/\s+/g, " ")
                    .replace(/\ba\.b\.\b/g, "A.B.")
                    .replace(/\bb\.a\.\b/g, "B.A.")
                    .replace(/\bb\.s\.\b/g, "B.S.")
                    .replace(/\bb\.e\.\b/g, "B.E.")
                    .replace(/\bb\.f\.a\.\b/g, "B.F.A.")
                    .replace(/\bb\.m\.\b/g, "B.M.");
  
                  option.textContent = formattedMajor;
                  majorSelect.appendChild(option);
                });
              })
              .catch(err => {
                console.error("Error loading majors:", err);
                const errorOption = document.createElement("option");
                errorOption.disabled = true;
                errorOption.textContent = "Error loading majors";
                majorSelect.appendChild(errorOption);
              });
  
            majorSelect.addEventListener("change", () => {
              storedMajor = majorSelect.value;
              createMessage(majorSelect.options[majorSelect.selectedIndex].text, "user-message");
              majorSelect.remove();
  
              const articulationPath = chrome.runtime.getURL(
                `TransferData/${storedCurrentSchool}/${storedTransferSchool}/majors.json`
              );
  
              fetch(articulationPath)
                .then(res => {
                  if (!res.ok) throw new Error("Articulation file not found.");
                  return res.json();
                })
                .then(data => {
                  console.log("Articulation Data:", data);
                })
                .catch(err => {
                  console.error("Error loading articulation:", err);
                });
  
              createMessage("Okay great! What is your question?", "bot-message");
              chatInput.placeholder = "Ask something like 'Which Skyline classes transfer to UCSD CS?'";
              chatInput.readOnly = false;
              chatInput.focus();
            });
          });
        });
      }
    });
  });  

  // === REFRESH BUTTON ===
  refreshButton?.addEventListener("click", () => {
    if (chatInput) chatInput.placeholder = "Select a mode first!";  
    if (chatInput) chatInput.value = "";
    if (chatBox) chatInput.style.height = "60px";
    if (chatBox) chatBox.innerHTML = "";

    const starterMessage = document.createElement("div");
    starterMessage.className = "bot-message";

    starterMessage.innerHTML = `
      <div class="assistant-header">
        <img src="popupicon/logo.png" class="assistant-avatar" alt="Assistant Icon" />
        <span class="assistant-name">BetterWebSchedule AI</span>
      </div>
      <div class="assistant-text">
        Welcome to BetterWebSchedule's help assistant!
      </div>
    `;
    chatBox.appendChild(starterMessage);

    const buttonWrapper = document.createElement("div");
    buttonWrapper.className = "mode-button-wrapper";

    const greetings = document.createElement("div");
    greetings.className = "welcome-screen";
    greetings.id = "welcome-screen";
    greetings.innerHTML = `
      <h1>Hi! How can we help?</h1>
    `;
    chatBox.prepend(greetings);
    
    const starterButton = document.createElement("button");
    starterButton.className = "mode-btn";
    starterButton.textContent = "ASSIST Articulation Questions";
    starterButton.dataset.mode = "articulation";
    buttonWrapper.appendChild(starterButton);

    const starterButton2 = document.createElement("button");
    starterButton2.className = "mode-btn";
    starterButton2.textContent = "Professor Questions";
    starterButton2.dataset.mode = "professor";
    buttonWrapper.appendChild(starterButton2);

    const starterButton4 = document.createElement("button");
    starterButton4.className = "mode-btn";
    starterButton4.textContent = "Schedule Builder";
    starterButton4.dataset.mode = "schedule";
    buttonWrapper.appendChild(starterButton4);

    const starterButton3 = document.createElement("button");
    starterButton3.className = "mode-btn";
    starterButton3.textContent = "Major Help";
    starterButton3.dataset.mode = "major";
    buttonWrapper.appendChild(starterButton3);

    chatBox.appendChild(buttonWrapper);

    chatInput.readOnly = true;

    const modeButtons = document.querySelectorAll(".mode-btn");
    modeButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      modeButtons.forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      selectedMode = btn.dataset.mode;
  
      document.getElementById("welcome-screen")?.remove();
      starterButton?.remove();
      starterButton2?.remove();
      starterButton3?.remove();
      starterButton4?.remove();
  
      createMessage(btn.textContent, "user-message");
  
      if (selectedMode === "professor") {
        createMessage("Got it! I can help you with professor questions. What would you like to ask?", "bot-message");
        chatInput.readOnly = false;
        chatInput.placeholder = "Ask something like 'Who is the best for Math at Skyline?'";
      }

      if (selectedMode === "major") {
        createMessage("Got it! I can help you with picking your major. What school are you planning to attend?", "bot-message");
        chatInput.readOnly = false;
      
        createSelect(
          ["Skyline College", "College of San Mateo", "Canada College"],
          "Select your school",
          selectedSchoolForMajor => {
            storedCurrentSchoolForMajorHelp = selectedSchoolForMajor;
      
            createMessage("Great! How can I help?", "bot-message");
            chatInput.placeholder = "Ask something like 'Can you help me pick a major?'";
          }
        );
      }  
      
      function handleTranscriptUploadPrompt() {
        createMessage("Would you like to upload your transcript?", "bot-message");
      
        createSelect(["Yes", "No"], "Please pick a response", userChoice => {
          if (userChoice === "Yes") {
            createMessage("Please upload your transcript.", "bot-message");
            
            const fileInput = document.createElement("input");
            fileInput.type = "file";
            fileInput.accept = "application/pdf";
            fileInput.style.display = "none";
            fileInput.id = "transcriptUploadInput";
            document.body.appendChild(fileInput);

            const uploadBtn = document.createElement("button");
            uploadBtn.textContent = "Choose PDF File";
            uploadBtn.className = "upload-button";
            chatBox.appendChild(uploadBtn);
            scrollChatToBottom();
            
            uploadBtn.addEventListener("click", () => {
              fileInput.click();
            });

            fileInput.addEventListener("change", event => {
              const file = event.target.files[0];
              if (file && file.type === "application/pdf") {
                createMessage(`Selected: ${file.name}`, "user-message");
                
                const formData = new FormData();
                formData.append("file", file);
            
                createMessage("Uploading transcript...", "bot-message");
                chatInput.readOnly = true;

                fetch("http://127.0.0.1:8080/upload-transcript", {
                  method: "POST",
                  body: formData,
                })
                  .then(res => res.json())
                  .then(data => {
                    if (data.success) {
                      transcriptUploaded = true;
                      createMessage("Transcript uploaded and parsed successfully.", "bot-message");
                      parsedTranscript = data.parsedTranscript;

                      //localStorage.setItem("parsedTranscript", JSON.stringify(data.parsedTranscript));

                      handleSemesterSelection();
                    } else {
                      createMessage("Upload failed: " + (data.error || "Unknown error"), "bot-message");
                    }
                  })
                  .catch(err => {
                    createMessage("Something went wrong while uploading.", "bot-message");
                    console.error(err);
                  });
            
              } else {
                alert("Please upload a valid PDF.");
              }
            });

          } else {
            transcriptSkipped = true;
            handleSemesterSelection();  
          }
        });
      }
      
      function handleSemesterSelection() {
        createMessage("What is your starting semester?", "bot-message");
      
        createSelect([
          "Fall 2023", "Spring 2024", "Summer 2024", "Fall 2024"
        ], "Select starting semester", selectedSemester => {
          storedStartSemester = selectedSemester;
      
          createMessage("What is your ending semester?", "bot-message");
      
          createSelect([
            "Fall 2024", "Spring 2025", "Summer 2025", "Fall 2025", "Spring 2026"
          ], "Select ending semester", selectedEndSemester => {
            storedEndSemester = selectedEndSemester;
            chatInput.readOnly = false;
            
            createMessage(
              `Here's what you've selected:<br>
              - Transfer school: ${storedTransferSchoolForSchedule || "Not specified"}<br>
              - Current school: ${storedCurrentSchoolForSchedule || "Not specified"}<br>
              - Major: ${storedMajorForSchedule?.replace(/_/g, " ") || "Undeclared"}<br>
              - Transcript uploaded: ${transcriptUploaded ? "Yes" : transcriptSkipped ? "No" : "Unknown"}<br>
              - Starting semester: ${storedStartSemester}<br>
              - Ending semester: ${storedEndSemester}`,
              "bot-message",
              true
            );
      
            createMessage("Awesome! You're ready to start asking questions about your schedule.", "bot-message")
            
            chatInput.placeholder = "Ask something like 'Create a schedule for me.'";
          });
        });
      }

      function handleSchoolAndMajorSelection() {
        createMessage("Great! What school are you trying to transfer to?", "bot-message");
      
        createSelect([
          "UC Berkeley", "UC Davis", "UC Irvine", "UC Los Angeles", 
          "UC San Diego", "UC Santa Barbara", "UC Santa Cruz"
        ], "Select target school", selectedUC => {
          storedTransferSchoolForSchedule = selectedUC;
      
          createMessage("What school are you from?", "bot-message");
      
          createSelect([
            "Skyline College", "College of San Mateo", "Canada College"
          ], "Select your school", selectedSchool => {
            storedCurrentSchoolForSchedule = selectedSchool;
      
            createMessage("What is your major of transfer?", "bot-message");
      
            const majorsJsonPath = chrome.runtime.getURL(
              `TransferData/${storedCurrentSchoolForSchedule}/${storedTransferSchoolForSchedule}/majors.json`
            );
      
            const majorSelect = document.createElement("select");
            Object.assign(majorSelect.style, selectStyle);
      
            const majorDefault = document.createElement("option");
            majorDefault.disabled = true;
            majorDefault.selected = true;
            majorDefault.textContent = "Select your major";
            majorSelect.appendChild(majorDefault);
            chatBox.appendChild(majorSelect);
            scrollChatToBottom();
      
            fetch(majorsJsonPath)
              .then(res => {
                if (!res.ok) throw new Error("Failed to load majors.json");
                return res.json();
              })
              .then(majors => {
                majors.forEach(major => {
                  const option = document.createElement("option");
                  option.value = major;
                  option.textContent = major
                    .replace(/_/g, " ")
                    .replace(/,/g, ", ")
                    .replace(/\s+/g, " ")
                    .replace(/\ba\.b\.\b/g, "A.B.")
                    .replace(/\bb\.a\.\b/g, "B.A.")
                    .replace(/\bb\.s\.\b/g, "B.S.")
                    .replace(/\bb\.e\.\b/g, "B.E.")
                    .replace(/\bb\.f\.a\.\b/g, "B.F.A.")
                    .replace(/\bb\.m\.\b/g, "B.M.");
      
                  majorSelect.appendChild(option);
                });
              })
              .catch(err => {
                console.error("Error loading majors:", err);
                const errorOption = document.createElement("option");
                errorOption.disabled = true;
                errorOption.textContent = "Error loading majors";
                majorSelect.appendChild(errorOption);
              });
      
            majorSelect.addEventListener("change", () => {
              storedMajorForSchedule = majorSelect.value;
              createMessage(majorSelect.options[majorSelect.selectedIndex].text, "user-message");
              majorSelect.remove();
      
              const articulationPath = chrome.runtime.getURL(
                `TransferData/${storedCurrentSchoolForSchedule}/${storedTransferSchoolForSchedule}/majors.json`
              );
      
              fetch(articulationPath)
                .then(res => {
                  if (!res.ok) throw new Error("Articulation file not found.");
                  return res.json();
                })
                .then(data => {
                  console.log("Articulation Data:", data);
                })
                .catch(err => {
                  console.error("Error loading articulation:", err);
                });

              handleTranscriptUploadPrompt();
            });
          });
        });
      }
    
      if (selectedMode === "schedule") {
        chatInput.placeholder = "Please answer the questions above!";
        chatInput.readOnly = true;
      
        createMessage("Are you planning to transfer to UC/CSU?", "bot-message");
      
        createSelect(["Yes", "No"], "Please pick a response", userChoice => {
          if (userChoice === "Yes") {
            handleSchoolAndMajorSelection();
          } else {
            handleTranscriptUploadPrompt();
          }
        });
      }


      if (selectedMode === "articulation") {
        chatInput.readOnly = true;
        chatInput.placeholder = "";
  
        createMessage("What school are you trying to transfer to?", "bot-message");
  
        createSelect([
          "UC Berkeley", "UC Davis", "UC Irvine", "UC Los Angeles", "UC San Diego", "UC Santa Barbara", "UC Santa Cruz"], 
          "Select target school", selectedUC => {
          storedTransferSchool = selectedUC;
  
          createMessage("What school are you from?", "bot-message");
  
          createSelect([
            "Skyline College", "College of San Mateo", "Canada College"
          ], "Select your school", selectedSchool => {
            storedCurrentSchool = selectedSchool;
  
            createMessage("What is your major of transfer?", "bot-message");
  
            const majorsJsonPath = chrome.runtime.getURL(
              `TransferData/${storedCurrentSchool}/${storedTransferSchool}/majors.json`
            );
  
            const majorSelect = document.createElement("select");
            Object.assign(majorSelect.style, selectStyle);
  
            const majorDefault = document.createElement("option");
            majorDefault.disabled = true;
            majorDefault.selected = true;
            majorDefault.textContent = "Select your major";
            majorSelect.appendChild(majorDefault);
            chatBox.appendChild(majorSelect);
            scrollChatToBottom();
  
            fetch(majorsJsonPath)
              .then(res => {
                if (!res.ok) throw new Error("Failed to load majors.json");
                return res.json();
              })
              .then(majors => {
                majors.forEach(major => {
                  const option = document.createElement("option");
                  option.value = major;
  
                  let formattedMajor = major
                    .replace(/_/g, " ")
                    .replace(/,/g, ", ")
                    .replace(/\s+/g, " ")
                    .replace(/\ba\.b\.\b/g, "A.B.")
                    .replace(/\bb\.a\.\b/g, "B.A.")
                    .replace(/\bb\.s\.\b/g, "B.S.")
                    .replace(/\bb\.e\.\b/g, "B.E.")
                    .replace(/\bb\.f\.a\.\b/g, "B.F.A.")
                    .replace(/\bb\.m\.\b/g, "B.M.");
  
                  option.textContent = formattedMajor;
                  majorSelect.appendChild(option);
                });
              })
              .catch(err => {
                console.error("Error loading majors:", err);
                const errorOption = document.createElement("option");
                errorOption.disabled = true;
                errorOption.textContent = "Error loading majors";
                majorSelect.appendChild(errorOption);
              });
  
            majorSelect.addEventListener("change", () => {
              storedMajor = majorSelect.value;
              createMessage(majorSelect.options[majorSelect.selectedIndex].text, "user-message");
              majorSelect.remove();
  
              const articulationPath = chrome.runtime.getURL(
                `TransferData/${storedCurrentSchool}/${storedTransferSchool}/majors.json`
              );
  
              fetch(articulationPath)
                .then(res => {
                  if (!res.ok) throw new Error("Articulation file not found.");
                  return res.json();
                })
                .then(data => {
                  console.log("Articulation Data:", data);
                })
                .catch(err => {
                  console.error("Error loading articulation:", err);
                });
  
              createMessage("Okay great! What is your question?", "bot-message");
              chatInput.placeholder = "Ask something like 'Which Skyline classes transfer to UCSD CS?'";
              chatInput.readOnly = false;
              chatInput.focus();
            });
          });
        });
      }
    });
    });

    chatInput.focus();
    scrollChatToBottom();
  });

  // === CHAT SUBMIT HANDLER ===
  chatForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const message = chatInput.value.trim();
    if (!message) return;

    if (!selectedMode) {
      return;
    }

    if (chatBox) chatInput.style.height = "60px";

    const placeholder = chatBox.querySelector(".placeholder-text");
    if (placeholder) placeholder.remove();

    const userMsg = document.createElement("div");
    userMsg.className = "user-message";
    userMsg.textContent = message;
    chatBox.appendChild(userMsg);

    chatInput.value = "";

    const loading = document.createElement("div");
    loading.className = "bot-message typing";
    loading.textContent = "Typing...";
    chatBox.appendChild(loading);
    chatBox.scrollTop = chatBox.scrollHeight;

    let bodyData;

    if (selectedMode === "articulation") {
      if (!storedCurrentSchool || !storedTransferSchool || !storedMajor) {
        createMessage("Missing required information for articulation. Please restart or pick your schools and major again.", "bot-message");
        return;
      }
      endpoint = "https://betterwebschedule-api-755120101240.us-west1.run.app/transfer-plan";
      bodyData = {
        currentSchool: storedCurrentSchool,
        transferSchool: storedTransferSchool,
        major: storedMajor,
        question: message
      };
    } else if (selectedMode === "professor") {
      endpoint = "https://betterwebschedule-api-755120101240.us-west1.run.app/professor-reccomendation";
      bodyData = {
        question: message
      };
    } else if (selectedMode === "major") {
      endpoint = "https://betterwebschedule-api-755120101240.us-west1.run.app/major-helper";
      bodyData = {
        storedCurrentSchoolForMajorHelp: storedCurrentSchoolForMajorHelp,
        question: message
      };
    } else if (selectedMode === "schedule") {
      endpoint = "http://127.0.0.1:8080/undeclared-schedule";
      bodyData = {
        question: message,
        currentSchool: storedCurrentSchoolForSchedule,
        transferSchool: storedTransferSchoolForSchedule,
        major: storedMajorForSchedule,
        //parsedTranscript: JSON.parse(localStorage.getItem("parsedTranscript") || "{}"),
        parsedTranscript: parsedTranscript,
        startSemester: storedStartSemester,
        endSemester: storedEndSemester
      };
    }

      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData)
      })
      .then(async res => {
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`HTTP ${res.status}: ${errorText}`);
        }
        return res.json();
      })
      .then(data => {
        loading.remove();
        const botMsg = document.createElement("div");
        botMsg.className = "bot-message";
      
        const raw = data.response || "Sorry, I didn't understand that.";
      
        const formatted = raw
          .replace(/â€¢/g, "•")                       // Fix encoding for bullets
          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // Bold markdown
          .replace(/(?:^|\n)(Year.*?|Summer|Unarticulated Courses:|Important Reminder:)/g, "<br><strong>$1</strong>")
          .replace(/\n•/g, "<br>&bull;")              // Use HTML bullet symbol
          .replace(/\n/g, "<br>");                    // Line breaks for everything else
      
        botMsg.innerHTML = formatted;
        chatBox.appendChild(botMsg);
        chatBox.scrollTop = chatBox.scrollHeight;
      })
      .catch(err => {
        loading.remove();
        const errorMsg = document.createElement("div");
        errorMsg.className = "bot-message";
        errorMsg.textContent = "Failed to connect to AI. Press the Refresh Button and try again!";
        chatBox.appendChild(errorMsg);
        console.error("API error:", err);
      });
    chatBox.scrollTop = chatBox.scrollHeight;
  }); 

  // === HELPERS ===
  function withCurrentTab(callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0 && tabs[0]) {
        callback(tabs[0]);
      }
    });
  }

  function runScriptIfAllowed(tabs, callback) {
    const currentUrl = tabs[0].url;
    if (currentUrl.startsWith(ALLOWED_URL)) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: callback
      });
    } else {
      if (statusEl) {
        statusEl.textContent = "Must be in 'Register for Classes'";
        setTimeout(() => {
          statusEl.textContent = originalStatusText;
          statusEl.style.cssText = originalStatusStyle;
        }, 3000);
      }
    }
  }
});