const multer = require("multer");
const fs = require("fs");
const OpenAI = require("openai");

const upload = multer({ dest: "/tmp" }).single("file");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
    }

  upload(req, res, async (err) => {
    if (err) return res.status(500).json({ error: "Upload error: " + err.message });
    if (!req.file) return res.status(400).json({ error: "No file received" });

    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // 1️⃣ Upload the file to OpenAI
      const uploadedFile = await client.files.create({
        purpose: "assistants",
        file: fs.createReadStream(req.file.path)
      });

      // 2️⃣ Ask GPT-5.1 to analyze the file
      const response = await client.responses.create({
        model: "gpt-5.1",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: "Analyze the uploaded file and give a human-friendly summary."
              },
              {
                type: "input_file",
                file_id: uploadedFile.id
              }
            ]
          }
        ]
      });

      // 3️⃣ GPT returns text inside `output_text`
      return res.status(200).json({
        status: "success",
        file_id: uploadedFile.id,
        analysis: response.output_text
      });

    } catch (error) {
      console.error("SERVER ERROR:", error);
      return res.status(500).json({ error: error.message });
    }
  });
};
