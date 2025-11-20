const multer = require("multer");
const fs = require("fs");
const OpenAI = require("openai");

const upload = multer({ dest: "/tmp" }).single("file");

module.exports = (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  upload(req, res, async (err) => {
    if (err) {
      return res.status(500).json({ error: "Upload error: " + err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file received" });
    }

    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // 1️⃣ Upload file first
      const uploadedFile = await client.files.create({
        purpose: "assistants",
        file: fs.createReadStream(req.file.path),
      });

      // 2️⃣ Ask GPT-5.1 to analyze it using Responses API
      const response = await client.responses.create({
        model: "gpt-5.1",
        input: [
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this file and summarise it." },
              { type: "file", file_id: uploadedFile.id }
            ]
          }
        ]
      });

      return res.status(200).json({
        message: "File processed successfully",
        file_id: uploadedFile.id,
        analysis: response.output_text
      });

    } catch (e) {
      console.error("SERVER ERROR:", e);
      return res.status(500).json({ error: e.message });
    }
  });
};
