const multer = require("multer");
const fs = require("fs");
const OpenAI = require("openai");

const upload = multer({ dest: "/tmp" }).single("file");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "No file received" });

    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // 1️⃣ Upload file
      const uploaded = await client.files.create({
        purpose: "assistants",
        file: fs.createReadStream(req.file.path)
      });

      // 2️⃣ Use the Responses API (latest schema)
      const response = await client.responses.create({
        model: "gpt-5.1",
        input: [
          {
            type: "message",
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this file and summarize it."
              },
              {
                type: "item_reference",
                item_id: uploaded.id   // REQUIRED — this is where your errors came from
              }
            ]
          }
        ]
      });

      return res.status(200).json({
        status: "success",
        file_id: uploaded.id,
        output: response.output_text
      });

    } catch (error) {
      console.error("SERVER ERROR:", error);
      return res.status(500).json({ error: error.message });
    }
  });
};
