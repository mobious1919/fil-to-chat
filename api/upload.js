const multer = require("multer");
const OpenAI = require("openai");
const fs = require("fs");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const upload = multer({ dest: "/tmp/" }).single("file");

  upload(req, res, async function (err) {
    if (err) {
      return res.status(500).json({ error: "Upload error: " + err.message });
    }

    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const fileStream = fs.createReadStream(req.file.path);

      // 1️⃣ Upload to OpenAI Files API
      const uploaded = await client.files.create({
        file: fileStream,
        purpose: "assistants"
      });

      const fileId = uploaded.id;

      // 2️⃣ Send the file to GPT-5.1
      const response = await client.chat.completions.create({
        model: "gpt-5.1",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this file." },
              { type: "input_file", file_id: fileId }
            ]
          }
        ]
      });

      return res.status(200).json({
        message: "File processed successfully",
        file_id: fileId,
        analysis: response.choices[0].message.content
      });

    } catch (error) {
      console.error(error);
      return res.status(400).json({ error: error.toString() });
    }
  });
};
