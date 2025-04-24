import path from "path";
import { readFile } from "fs/promises";


async function getMajorBlock(filePath, major){
    const rawData = await readFile(filePath, "utf-8");
    console.log("RAW DATA: ", rawData);
    const data = JSON.parse(rawData);
    console.log("🧾 Parsed JSON data:", data);
    console.log("🔍 Looking for major:", major);

    return data.find(entry => entry.major === major)
}

async function filterTransferData(currentSchool, transferSchool, major){
    const schoolPath = `./FakeData/${currentSchool}/${transferSchool}/major_requirements.json`;

    const fileData = await getMajorBlock(schoolPath, major);

    console.log("LOADED DATA HELLO: ", JSON.stringify(fileData, null, 2));

    try {
        const response = await fetch('http://localhost:3000/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: `Analyze the transfer data I’ve provided. Your task is to create a suggested 4-semester course schedule that will help me plan my transfer journey.

            Only include course numbers from my current college.

            If a course at my current college satisfies a requirement at my transfer university, mention the transfer university's equivalent course only for clarification.

            Do not include any courses that are not articulated or transferable to the university — assume I cannot take them.

            Format the schedule clearly, divided into 4 semesters (Semester 1 to Semester 4).

            End with a reminder: Always consult with a counselor before making final decisions. These suggestions are only a planning tool.\n\n${JSON.stringify(fileData, null, 2)}`
          })
        });

        const data = await response.json();
        console.log(data.response)

        return data.response;

    } catch (error) {
        console.log(error)
        }
}

export {filterTransferData}
