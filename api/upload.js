const multer = require("multer");
const OpenAI = require("openai");
const fs = require("fs");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const upload = multer({ dest: "/tmp" }).single("file");

  upload(req, res, async function (err) {
    if (err) {
      return res.status(500).json({ error: "Upload error: " + err.message });
    }

    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const fileStream = fs.createReadStream(req.file.path);

      const result = await client.chat.completions.create({
        model: "gpt-5.1",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this file and summarize the key insights." },
              { type: "file", file: fileStream }
            ]
          }
        ]
      });

      return res.json({
        message: "File processed successfully",
        analysis: result.choices[0].message.content
      });
    } catch (e) {
      return res.status(500).json({ error: e.toString() });
    }
  });
};
