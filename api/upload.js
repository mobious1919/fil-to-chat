// Force redeploy
const multer = require("multer");
const OpenAI = require("openai");
const fs = require("fs");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  // Set up multer
  const upload = multer({ dest: "/tmp" }).single("file");

  upload(req, res, async function (err) {
    if (err) {
      return res.status(500).json({ error: "Upload error: " + err.message });
    }

    try {
      // Make sure file exists
      if (!req.file || !req.file.path) {
        return res.status(400).json({ error: "No file received" });
      }

      const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });

      const fileStream = fs.createReadStream(req.file.path);

      // 1️⃣ Upload file to OpenAI first
      const uploaded = await client.files.create({
        file: fileStream,
        purpose: "assistants"
      });

      // 2️⃣ Send file_id to Chat API
      const result = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this file." },
              {
                type: "file",
                file: { file_id: uploaded.id }
              }
            ]
          }
        ]
      });

      res.status(200).json({
        success: true,
        output: result.choices[0].message
      });

    } catch (error) {
      console.error("Processing error:", error);
      res.status(500).json({ error: error.toString() });
    }
  });
};
