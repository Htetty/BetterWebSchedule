import express from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
import { GoogleGenAI } from "@google/genai";
import { filterTransferData } from './filterTransferData.js';

dotenv.config();

const app = express();
app.use(express.json());

// const ai = new GoogleGenerativeAI(process.env.API_KEY);

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*'); // In production, replace * with your extension ID
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

app.options('/chat', (req, res) => {
    res.status(200).end();
});


const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// app.post('/chat', async (req, res) => {
//     const {prompt, filePath} = req.body;
//     console.log("FILE PATH AGAINNN: ", filePath);
//     const fileBuffer = fs.readFileSync(filePath);
//     console.log("FILE SIZE:", fileBuffer.length);
//     console.log("DATA BEING SENT: ",Buffer.from(fs.readFileSync(filePath)).toString("base64"))
//     const contents = [
//         { text: prompt},
//         {
//             inlineData: {
//                 mimeType: 'application/pdf',
//                 data: Buffer.from(fs.readFileSync(filePath)).toString("base64")
//             }
//         }
//     ];

//     const response = await ai.models.generateContent({
//         model: "gemini-1.5-pro",
//         contents: contents
//     });
//     const text = await response.text
//     // console.log(text);
//     res.json({response: text});
// });




app.post('/chat', async (req, res) => {
    try {
        // const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });
        
        const prompt = req.body.prompt;
        console.log('Sending prompt:', prompt);

        // const result = await model.generateContent(prompt);
        // const response = await result.response;
        const response = await ai.models.generateContent({
            model: "gemini-1.5-pro",
            contents: prompt,
          });
        const text = response.text;
        
        console.log('Received response:', text);
        res.json({ response: text });
    } catch (error) {
        console.error('Error details:', error);
        res.status(500).json({ 
            error: error.message,
            details: error.toString()
        });
    }
});

app.post('/transfer-plan', async(req, res) => {
    try{
        const {currentSchool, transferSchool, major} = req.body

        const reply = filterTransferData(currentSchool, transferSchool, major);
        res.json({reply});
    } catch(error){
        console.log(error);
        res.status(500);
    }
});

app.listen(3000, () => {
    console.log(`Server running on port 3000`);
});