// force redeploy

const multer = require("multer");
const OpenAI = require("openai");
const fs = require("fs");

// IMPORTANT: Vercel needs this to disable its default body parsing
module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  // Multer setup for handling multipart form-data
  const upload = multer({ dest: "/tmp" }).single("file");

  upload(req, res, async function (err) {
    if (err) {
      return res.status(500).json({ error: "Upload error: " + err.message });
    }

    try {
      // Create OpenAI client
      const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });

      // Make sure file exists
      if (!req.file || !req.file.path) {
        return res.status(400).json({ error: "No file received" });
      }

      const fileStream = fs.createReadStream(req.file.path);

      // Call OpenAI
      const result = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this file." },
              { type: "file", file: fileStream }
            ]
          }
        ]
      });

      // Return response to client
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
