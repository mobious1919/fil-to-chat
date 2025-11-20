const multer = require("multer");
const OpenAI = require("openai");
const fs = require("fs");

const upload = multer({ dest: "/tmp" });

module.exports = async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  upload.single("file")(req, res, async (err) => {
    if (err) return res.status(500).json({ error: "Multer: " + err.message });

    if (!req.file) {
      return res.status(400).json({ error: "No file received" });
    }

    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // Upload the file to OpenAI
      const uploaded = await client.files.create({
        file: fs.createReadStream(req.file.path),
        purpose: "assistants",
      });

      // Perform analysis using Assistants-compatible model
      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "user", content: `Analyze the uploaded file with id: ${uploaded.id}` }
        ]
      });

      return res.json({
        message: "File processed successfully",
        file_id: uploaded.id,
        analysis: response.choices[0].message.content
      });

    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  });
};
