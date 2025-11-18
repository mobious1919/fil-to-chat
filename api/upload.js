const multer = require("multer");
const OpenAI = require("openai");
const fs = require("fs");

module.exports = async function handler(req, res) {
  // Disable body parsing
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
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this file." },
              { type: "input_file", input_file: fileStream }
            ]
          }
        ]
      });

      res.status(200).json({ output: result.choices[0].message });

    } catch (error) {
      console.log(error);
      res.status(500).json({ error: error.toString() });
    }
  });
};
