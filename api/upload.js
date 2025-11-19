// Force redeploy
const multer = require("multer");
const OpenAI = require("openai");
const fs = require("fs");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  // Multer to store file in /tmp (Vercel's temp directory)
  const upload = multer({ dest: "/tmp" }).single("file");

  upload(req, res, async function (err) {
    if (err) {
      return res.status(500).json({ error: "Upload error: " + err.message });
    }

    try {
      if (!req.file || !req.file.path) {
        return res.status(400).json({ error: "No file received" });
      }

      const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });

      const fileBytes = fs.readFileSync(req.file.path);

      // 1️⃣ Upload file to OpenAI using ACTUAL file metadata
      const uploaded = await client.files.create({
        file: {
          file_name: req.file.originalname || "uploaded_file",
          content: fileBytes,
          content_type: req.file.mimetype || "application/octet-stream"
        },
        purpose: "assistants"
      });

      // 2️⃣ Use file_id in Chat API
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
